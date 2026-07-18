import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getR2Url } from "@/lib/r2";
import { getCloudflareContext } from "@opennextjs/cloudflare";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { env } = getCloudflareContext();

  try {
    const { results } = await env.DB.prepare(
      `SELECT f.id, f.original_name as originalName, f.mime_type as mimeType, f.size, f.category, f.work_order_id as workOrderId, f.uploader_id as uploaderId, f.created_at as createdAt, u.name as uploaderName 
       FROM work_order_files f 
       LEFT JOIN users u ON f.uploader_id = u.id 
       WHERE f.work_order_id = ? 
       ORDER BY f.created_at DESC`
    )
      .bind(id)
      .all();

    const resolvedFiles = await Promise.all(
      (results || []).map(async (file: any) => {
        const pathUrl = `/api/work-orders/${id}/files/${file.id}/content`;
        return {
          id: file.id,
          filename: file.originalName,
          originalName: file.originalName,
          mimeType: file.mimeType,
          size: file.size,
          path: pathUrl,
          category: file.category,
          workOrderId: file.workOrderId,
          uploaderId: file.uploaderId,
          createdAt: file.createdAt,
          uploader: file.uploaderName ? { id: file.uploaderId, name: file.uploaderName } : null,
        };
      })
    );

    return NextResponse.json({ files: resolvedFiles });
  } catch (error: any) {
    console.error("D1 GET files error:", error.message);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: workOrderId } = await params;
  const { env } = getCloudflareContext();

  const isJson = req.headers.get("content-type")?.includes("application/json");
  let originalName: string;
  let mimeType: string;
  let size: number;
  let categoryInput: string;
  let pathUrl: string;

  if (isJson) {
    const body = await req.json();
    originalName = body.originalName;
    mimeType = body.mimeType;
    size = Number(body.size) || 0;
    categoryInput = body.category || "DOCS";
    pathUrl = body.publicUrl;

    if (!originalName || !mimeType || !pathUrl) {
      return NextResponse.json({ error: "originalName, mimeType, and publicUrl are required" }, { status: 400 });
    }
  } else {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    categoryInput = (formData.get("category") as string) || "DOCS";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 });
    }

    originalName = file.name;
    mimeType = file.type;
    size = file.size;

    const bytes = await file.arrayBuffer();
    let base64Str = "";
    try {
      const bytesArray = new Uint8Array(bytes);
      const len = bytesArray.byteLength;
      for (let i = 0; i < len; i++) {
        base64Str += String.fromCharCode(bytesArray[i]);
      }
      base64Str = btoa(base64Str);
    } catch (e: any) {
      return NextResponse.json({ error: "Failed to process image buffer: " + e.message }, { status: 500 });
    }
    const base64 = `data:${file.type};base64,${base64Str}`;
    pathUrl = base64;
  }

  // Validate category
  const validCategories = ["BEFORE", "DURING", "AFTER", "BID", "INSPECTION", "DOCS"];
  const fileCategory = validCategories.includes(categoryInput) ? categoryInput : "DOCS";

  const fileId = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  try {
    // Save to Cloudflare D1
    await env.DB.prepare(
      `INSERT INTO work_order_files (id, work_order_id, public_url, original_name, filename, category, mime_type, size, uploader_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(fileId, workOrderId, pathUrl, originalName, originalName, fileCategory, mimeType, size, (session.user as any).id, createdAt)
      .run();
    try {
      await env.DB.prepare(
        `INSERT INTO activity_logs (id, action, details, userId, workOrderId, createdAt)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
        .bind(crypto.randomUUID(), "FILE_UPLOADED", `Uploaded "${originalName}" (${fileCategory}) to Cloudflare R2`, (session.user as any).id, workOrderId, createdAt)
        .run();
    } catch (e) {
      // Ignore if activity table doesn't exist
      console.log("Activity logging skipped or failed:", e);
    }

    const signedPath = `/api/work-orders/${workOrderId}/files/${fileId}/content`;

    return NextResponse.json({
      id: fileId,
      filename: originalName,
      originalName,
      mimeType,
      size,
      path: signedPath,
      category: fileCategory,
      workOrderId,
      uploaderId: (session.user as any).id,
      createdAt,
      uploader: { id: (session.user as any).id, name: session.user.name || "" }
    }, { status: 201 });

  } catch (error: any) {
    console.error("D1 POST file error:", error.message);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: workOrderId } = await params;
  const { env } = getCloudflareContext();
  const { searchParams } = new URL(req.url);
  const fileId = searchParams.get("fileId");

  if (!fileId) {
    return NextResponse.json({ error: "fileId required" }, { status: 400 });
  }

  try {
    // Get file info first for logging
    const file = await env.DB.prepare(
      `SELECT original_name FROM work_order_files WHERE id = ? AND work_order_id = ?`
    )
      .bind(fileId, workOrderId)
      .first<any>();

    if (!file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    // Delete from D1
    await env.DB.prepare(
      `DELETE FROM work_order_files WHERE id = ? AND work_order_id = ?`
    )
      .bind(fileId, workOrderId)
      .run();

    // Safely attempt to log activity
    try {
      await env.DB.prepare(
        `INSERT INTO activity_logs (id, action, details, userId, workOrderId, createdAt)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
        .bind(crypto.randomUUID(), "FILE_DELETED", `Deleted "${file.original_name}"`, (session.user as any).id, workOrderId, new Date().toISOString())
        .run();
    } catch (e) {
      console.log("Activity logging skipped or failed:", e);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("D1 DELETE file error:", error.message);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
