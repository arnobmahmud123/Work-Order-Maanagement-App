import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

let isTableInitialized = false;

async function ensureEmailTableExists() {
  if (isTableInitialized) return;
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS email_messages (
        id TEXT PRIMARY KEY,
        sender_id TEXT,
        from_name TEXT NOT NULL,
        from_email TEXT NOT NULL,
        "to" TEXT NOT NULL,
        cc TEXT,
        bcc TEXT,
        subject TEXT NOT NULL,
        body TEXT NOT NULL,
        snippet TEXT,
        folder TEXT DEFAULT 'inbox',
        direction TEXT DEFAULT 'inbound',
        is_read INTEGER DEFAULT 0,
        is_starred INTEGER DEFAULT 0,
        is_archived INTEGER DEFAULT 0,
        is_trash INTEGER DEFAULT 0,
        labels TEXT,
        priority TEXT DEFAULT 'normal',
        work_order_id TEXT,
        thread_id TEXT,
        attachments TEXT,
        company_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_email_messages_company_id ON email_messages(company_id);`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_email_messages_folder ON email_messages(folder);`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_email_messages_thread_id ON email_messages(thread_id);`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_email_messages_created_at ON email_messages(created_at);`);
    isTableInitialized = true;
  } catch (e) {
    console.error("[Email] Error ensuring table exists:", e);
  }
}

function parseJsonSafe(str: any, fallback: any = []) {
  if (!str) return fallback;
  if (typeof str !== "string") return str;
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}

function formatEmailRecord(raw: any) {
  const toList = parseJsonSafe(raw.to, []);
  const ccList = parseJsonSafe(raw.cc, []);
  const bccList = parseJsonSafe(raw.bcc, []);
  const labelsList = parseJsonSafe(raw.labels, ["inbox"]);
  const attachmentsList = parseJsonSafe(raw.attachments, []);

  return {
    id: raw.id,
    from: {
      name: raw.fromName || raw.from_name || "Unknown",
      email: raw.fromEmail || raw.from_email || "",
    },
    to: Array.isArray(toList) ? toList : [{ name: String(toList), email: String(toList) }],
    cc: Array.isArray(ccList) ? ccList : [],
    bcc: Array.isArray(bccList) ? bccList : [],
    subject: raw.subject || "(No Subject)",
    body: raw.body || "",
    snippet: raw.snippet || (raw.body ? raw.body.substring(0, 100).replace(/\n/g, " ") : ""),
    date: raw.createdAt ? new Date(raw.createdAt).toISOString() : new Date().toISOString(),
    read: Boolean(raw.isRead ?? raw.is_read),
    starred: Boolean(raw.isStarred ?? raw.is_starred),
    archived: Boolean(raw.isArchived ?? raw.is_archived),
    trashed: Boolean(raw.isTrash ?? raw.is_trash),
    labels: Array.isArray(labelsList) ? labelsList : ["inbox"],
    priority: raw.priority || "normal",
    workOrderId: raw.workOrderId || raw.work_order_id || null,
    threadId: raw.threadId || raw.thread_id || raw.id,
    attachments: Array.isArray(attachmentsList) ? attachmentsList : [],
    direction: raw.direction || "inbound",
    folder: raw.folder || "inbox",
  };
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await ensureEmailTableExists();

    const user = session.user as any;
    const userId = user.id;
    const userEmail = (user.email || "").toLowerCase();
    const userName = user.name || "User";
    const companyId = user.companyId || null;

    const { searchParams } = new URL(req.url);
    const folder = searchParams.get("folder") || "inbox";
    const search = (searchParams.get("search") || "").toLowerCase().trim();
    const label = searchParams.get("label") || "";
    const workOrderId = searchParams.get("workOrderId") || "";

    // Build raw SQL query for strict company multi-tenant isolation
    let whereConditions: string[] = [];
    const params: any[] = [];

    if (companyId) {
      whereConditions.push(`company_id = ?`);
      params.push(companyId);
    }

    // Exclude trashed emails unless viewing trash
    if (folder === "trash") {
      whereConditions.push(`is_trash = 1`);
    } else {
      whereConditions.push(`is_trash = 0`);

      if (folder === "starred") {
        whereConditions.push(`is_starred = 1`);
      } else if (folder === "sent") {
        whereConditions.push(`folder = 'sent'`);
      } else if (folder === "drafts") {
        whereConditions.push(`folder = 'drafts'`);
      } else if (folder === "unread") {
        whereConditions.push(`is_read = 0 AND folder != 'sent' AND folder != 'drafts'`);
      } else if (folder === "archive") {
        whereConditions.push(`is_archived = 1`);
      } else {
        // Inbox default
        whereConditions.push(`folder = 'inbox' AND is_archived = 0`);
      }
    }

    if (workOrderId) {
      whereConditions.push(`work_order_id = ?`);
      params.push(workOrderId);
    }

    if (label) {
      whereConditions.push(`labels LIKE ?`);
      params.push(`%${label}%`);
    }

    if (search) {
      whereConditions.push(`(
        LOWER(subject) LIKE ? OR 
        LOWER(body) LIKE ? OR 
        LOWER(from_name) LIKE ? OR 
        LOWER(from_email) LIKE ? OR 
        LOWER("to") LIKE ?
      )`);
      const searchParam = `%${search}%`;
      params.push(searchParam, searchParam, searchParam, searchParam, searchParam);
    }

    const whereSql = whereConditions.length > 0 ? `WHERE ${whereConditions.join(" AND ")}` : "";
    const sql = `SELECT * FROM email_messages ${whereSql} ORDER BY created_at DESC LIMIT 200`;

    let rawEmails: any[] = [];
    try {
      rawEmails = (await prisma.$queryRawUnsafe(sql, ...params)) as any[];
    } catch (dbErr) {
      console.error("[Email API] Query error:", dbErr);
      rawEmails = [];
    }

    // If this company has 0 emails in total, seed an initial welcome email
    if (rawEmails.length === 0 && folder === "inbox" && !search && !label) {
      const countCheck = ((await prisma.$queryRawUnsafe(
        `SELECT COUNT(*) as cnt FROM email_messages WHERE company_id = ?`,
        companyId || "global"
      ).catch(() => [{ cnt: 0 }])) as any[]) || [];

      const totalCompanyEmails = Number(countCheck[0]?.cnt || 0);

      if (totalCompanyEmails === 0) {
        const welcomeId = `email-${Date.now()}`;
        const welcomeTo = JSON.stringify([{ name: userName, email: userEmail }]);
        const welcomeLabels = JSON.stringify(["inbox", "work-order"]);

        await prisma.$executeRawUnsafe(
          `INSERT INTO email_messages (
            id, sender_id, from_name, from_email, "to", subject, body, snippet, folder, direction, is_read, is_starred, is_archived, is_trash, labels, priority, company_id, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'inbox', 'inbound', 0, 1, 0, 0, ?, 'normal', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          welcomeId,
          userId,
          "System Notifications",
          "dispatch@proppreserve.com",
          welcomeTo,
          "Welcome to your Company Communication Center",
          `Hello ${userName},\n\nWelcome to your dedicated company communication center. All company communications, contractor dispatches, and client work order updates are unified here.\n\nYou can compose messages, attach work order documents, and maintain full communication trails for every property.\n\nBest regards,\nPlatform Operations Team`,
          "Welcome to your dedicated company communication center. All company communications...",
          welcomeLabels,
          companyId
        ).catch((err) => console.error("Seed welcome email failed:", err));

        // Re-fetch seeded email
        rawEmails = ((await prisma.$queryRawUnsafe(sql, ...params).catch(() => [])) as any[]) || [];
      }
    }

    const emails = rawEmails.map(formatEmailRecord);

    // Compute folder unread & total counts
    const unreadCount = emails.filter((e) => !e.read && e.folder === "inbox").length;

    return NextResponse.json({
      emails,
      unreadCount,
      total: emails.length,
      folder,
      companyId,
    });
  } catch (error: any) {
    console.error("[Email GET Error]:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch emails" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await ensureEmailTableExists();

    const user = session.user as any;
    const userId = user.id;
    const userEmail = (user.email || "").toLowerCase();
    const userName = user.name || "User";
    const companyId = user.companyId || null;

    const body = await req.json();
    const { to, cc, bcc, subject, body: content, workOrderId, priority, labels, attachments, threadId } = body;

    if (!to || (Array.isArray(to) && to.length === 0)) {
      return NextResponse.json({ error: "Recipient (to) is required" }, { status: 400 });
    }
    if (!subject || !subject.trim()) {
      return NextResponse.json({ error: "Subject is required" }, { status: 400 });
    }

    // Format recipients array: [{ name, email }]
    const formattedTo = (Array.isArray(to) ? to : [to]).map((item: any) => {
      if (typeof item === "string") {
        return { name: item.split("@")[0], email: item.trim() };
      }
      return { name: item.name || item.email?.split("@")[0] || "Recipient", email: item.email };
    });

    const formattedCc = cc ? (Array.isArray(cc) ? cc : [cc]).map((item: any) => {
      if (typeof item === "string") return { name: item.split("@")[0], email: item.trim() };
      return { name: item.name || item.email?.split("@")[0], email: item.email };
    }) : [];

    const formattedBcc = bcc ? (Array.isArray(bcc) ? bcc : [bcc]).map((item: any) => {
      if (typeof item === "string") return { name: item.split("@")[0], email: item.trim() };
      return { name: item.name || item.email?.split("@")[0], email: item.email };
    }) : [];

    const finalThreadId = threadId || `thread-${Date.now()}`;
    const sentEmailId = `email-sent-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const snippet = content ? content.substring(0, 100).replace(/\n/g, " ") : "";
    const priorityVal = priority || "normal";
    const labelsJson = JSON.stringify(labels || ["work-order"]);
    const attachmentsJson = JSON.stringify(attachments || []);
    const toJson = JSON.stringify(formattedTo);
    const ccJson = JSON.stringify(formattedCc);
    const bccJson = JSON.stringify(formattedBcc);

    // 1. Permanently insert into sender's "sent" folder
    await prisma.$executeRawUnsafe(
      `INSERT INTO email_messages (
        id, sender_id, from_name, from_email, "to", cc, bcc, subject, body, snippet, folder, direction, is_read, is_starred, is_archived, is_trash, labels, priority, work_order_id, thread_id, attachments, company_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'sent', 'outbound', 1, 0, 0, 0, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      sentEmailId,
      userId,
      userName,
      userEmail,
      toJson,
      ccJson,
      bccJson,
      subject,
      content,
      snippet,
      labelsJson,
      priorityVal,
      workOrderId || null,
      finalThreadId,
      attachmentsJson,
      companyId
    );

    // 2. Also create inbound inbox record for internal company recipients so recipient sees it in their inbox!
    for (const recipient of formattedTo) {
      if (recipient.email && recipient.email.toLowerCase() !== userEmail) {
        const inboxEmailId = `email-in-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        await prisma.$executeRawUnsafe(
          `INSERT INTO email_messages (
            id, sender_id, from_name, from_email, "to", cc, bcc, subject, body, snippet, folder, direction, is_read, is_starred, is_archived, is_trash, labels, priority, work_order_id, thread_id, attachments, company_id, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'inbox', 'inbound', 0, 0, 0, 0, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          inboxEmailId,
          userId,
          userName,
          userEmail,
          toJson,
          ccJson,
          bccJson,
          subject,
          content,
          snippet,
          labelsJson,
          priorityVal,
          workOrderId || null,
          finalThreadId,
          attachmentsJson,
          companyId
        );
      }
    }

    const createdRecord = {
      id: sentEmailId,
      from: { name: userName, email: userEmail },
      to: formattedTo,
      cc: formattedCc,
      bcc: formattedBcc,
      subject,
      body: content,
      snippet,
      date: new Date().toISOString(),
      read: true,
      starred: false,
      archived: false,
      trashed: false,
      labels: labels || ["work-order"],
      priority: priorityVal,
      workOrderId: workOrderId || null,
      threadId: finalThreadId,
      attachments: attachments || [],
      direction: "outbound",
      folder: "sent",
    };

    return NextResponse.json({
      success: true,
      email: createdRecord,
      message: "Email sent and saved permanently",
    });
  } catch (error: any) {
    console.error("[Email POST Error]:", error);
    return NextResponse.json({ error: error.message || "Failed to send email" }, { status: 500 });
  }
}
