import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

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
    date: raw.createdAt ? new Date(raw.createdAt).toISOString() : (raw.created_at ? new Date(raw.created_at).toISOString() : new Date().toISOString()),
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

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const companyId = (session.user as any).companyId || null;

    let rows: any[] = [];
    if (companyId) {
      rows = (await prisma.$queryRawUnsafe(`SELECT * FROM email_messages WHERE id = ? AND company_id = ? LIMIT 1`, id, companyId)) as any[];
    } else {
      rows = (await prisma.$queryRawUnsafe(`SELECT * FROM email_messages WHERE id = ? LIMIT 1`, id)) as any[];
    }

    if (!rows || rows.length === 0) {
      return NextResponse.json({ error: "Email not found" }, { status: 404 });
    }

    // Auto mark as read in database
    await prisma.$executeRawUnsafe(`UPDATE email_messages SET is_read = 1 WHERE id = ?`, id);

    const email = formatEmailRecord({ ...rows[0], is_read: 1 });
    return NextResponse.json(email);
  } catch (error: any) {
    console.error("[Email [id] GET Error]:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch email" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const companyId = (session.user as any).companyId || null;

    const updates: string[] = [];
    const updateParams: any[] = [];

    if (body.read !== undefined) {
      updates.push(`is_read = ?`);
      updateParams.push(body.read ? 1 : 0);
    }
    if (body.starred !== undefined) {
      updates.push(`is_starred = ?`);
      updateParams.push(body.starred ? 1 : 0);
    }
    if (body.archived !== undefined) {
      updates.push(`is_archived = ?`);
      updateParams.push(body.archived ? 1 : 0);
    }
    if (body.trashed !== undefined) {
      updates.push(`is_trash = ?`);
      updateParams.push(body.trashed ? 1 : 0);
      if (body.trashed) {
        updates.push(`folder = 'trash'`);
      }
    }
    if (body.labels !== undefined) {
      updates.push(`labels = ?`);
      updateParams.push(JSON.stringify(body.labels));
    }
    if (body.folder !== undefined) {
      updates.push(`folder = ?`);
      updateParams.push(body.folder);
    }

    if (updates.length > 0) {
      updates.push(`updated_at = CURRENT_TIMESTAMP`);
      let whereClause = `WHERE id = ?`;
      updateParams.push(id);
      if (companyId) {
        whereClause += ` AND company_id = ?`;
        updateParams.push(companyId);
      }

      await prisma.$executeRawUnsafe(
        `UPDATE email_messages SET ${updates.join(", ")} ${whereClause}`,
        ...updateParams
      );
    }

    // Fetch updated record
    const rows: any[] = (await prisma.$queryRawUnsafe(`SELECT * FROM email_messages WHERE id = ? LIMIT 1`, id)) as any[];
    if (!rows || rows.length === 0) {
      return NextResponse.json({ error: "Email not found" }, { status: 404 });
    }

    return NextResponse.json(formatEmailRecord(rows[0]));
  } catch (error: any) {
    console.error("[Email [id] PATCH Error]:", error);
    return NextResponse.json({ error: error.message || "Failed to update email" }, { status: 500 });
  }
}
