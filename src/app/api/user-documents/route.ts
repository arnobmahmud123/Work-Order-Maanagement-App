import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getCloudflareContext } from "@opennextjs/cloudflare";

// Helper to ensure user_documents table exists in D1
async function ensureUserDocumentsTable() {
  try {
    const { env } = getCloudflareContext();
    if (env?.DB) {
      await env.DB.exec(`
        CREATE TABLE IF NOT EXISTS user_documents (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          type TEXT NOT NULL,
          title TEXT NOT NULL,
          document_number TEXT,
          issuing_authority TEXT,
          expires_at TEXT,
          status TEXT NOT NULL DEFAULT 'ACTIVE',
          file_url TEXT NOT NULL,
          file_name TEXT NOT NULL,
          file_size INTEGER,
          mime_type TEXT,
          notes TEXT,
          verified_at TEXT,
          verified_by_id TEXT,
          company_id TEXT,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_user_documents_user_id ON user_documents(user_id);
        CREATE INDEX IF NOT EXISTS idx_user_documents_type ON user_documents(type);
        CREATE INDEX IF NOT EXISTS idx_user_documents_status ON user_documents(status);
        CREATE INDEX IF NOT EXISTS idx_user_documents_company_id ON user_documents(company_id);
      `);
    }
  } catch (err) {
    // If running in node dev without D1, or already exists, ignore
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await ensureUserDocumentsTable();

    const url = new URL(req.url);
    const targetUserId = url.searchParams.get("userId") || (session.user as any).id;
    const callerRole = (session.user as any).role;
    const callerId = (session.user as any).id;

    // Permissions: Users can view their own; Admins, Super Admins, Coordinators, and Client Managers can view any
    const isStaff = ["SUPER_ADMIN", "ADMIN", "COORDINATOR", "INCHARGE_COORDINATOR", "CLIENT_MANAGER"].includes(callerRole);
    if (targetUserId !== callerId && !isStaff) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const documents = await prisma.userDocument.findMany({
      where: { userId: targetUserId },
      orderBy: { createdAt: "desc" },
    });

    const now = new Date();
    const enriched = documents.map((doc: any) => {
      let isExpired = false;
      let isExpiringSoon = false;
      let daysUntilExpiry: number | null = null;

      if (doc.expiresAt) {
        const expDate = new Date(doc.expiresAt);
        const diffMs = expDate.getTime() - now.getTime();
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        daysUntilExpiry = diffDays;

        if (diffDays < 0) {
          isExpired = true;
        } else if (diffDays <= 30) {
          isExpiringSoon = true;
        }
      }

      return {
        ...doc,
        isExpired,
        isExpiringSoon,
        daysUntilExpiry,
      };
    });

    return NextResponse.json({ documents: enriched });
  } catch (error: any) {
    console.error("[UserDocuments GET] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch documents" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await ensureUserDocumentsTable();

    const callerRole = (session.user as any).role;
    const callerId = (session.user as any).id;
    const companyId = (session.user as any).companyId || null;

    const body = await req.json();
    const targetUserId = body.userId || callerId;

    const isStaff = ["SUPER_ADMIN", "ADMIN", "COORDINATOR", "INCHARGE_COORDINATOR"].includes(callerRole);
    if (targetUserId !== callerId && !isStaff) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const {
      type,
      title,
      documentNumber,
      issuingAuthority,
      expiresAt,
      fileUrl,
      fileName,
      fileSize,
      mimeType,
      notes,
    } = body;

    if (!type || !title || !fileUrl || !fileName) {
      return NextResponse.json(
        { error: "Document type, title, file name, and file URL are required" },
        { status: 400 }
      );
    }

    // Auto calculate initial status
    let initialStatus = "ACTIVE";
    if (expiresAt) {
      const expDate = new Date(expiresAt);
      if (expDate.getTime() < Date.now()) {
        initialStatus = "EXPIRED";
      }
    }

    const document = await prisma.userDocument.create({
      data: {
        userId: targetUserId,
        type,
        title: title.trim(),
        documentNumber: documentNumber?.trim() || null,
        issuingAuthority: issuingAuthority?.trim() || null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        status: initialStatus,
        fileUrl,
        fileName: fileName.trim(),
        fileSize: fileSize || null,
        mimeType: mimeType || null,
        notes: notes?.trim() || null,
        companyId: companyId,
      },
    });

    return NextResponse.json({ success: true, document });
  } catch (error: any) {
    console.error("[UserDocuments POST] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to upload document" }, { status: 500 });
  }
}
