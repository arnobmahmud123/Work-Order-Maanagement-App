import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

// POST /api/network/upload - Upload media for posts
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const postId = formData.get("postId") as string | null;
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = [
      "image/jpeg", "image/png", "image/gif", "image/webp",
      "video/mp4", "video/webm",
      "application/pdf",
      "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: "File type not allowed" }, { status: 400 });
    }

    // 25MB limit
    if (file.size > 25 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large (max 25MB)" }, { status: 400 });
    }

    // Convert to base64 for persistent storage
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = `data:${file.type};base64,${buffer.toString("base64")}`;

    // Generate unique filename
    const ext = file.name.split(".").pop() || "bin";
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    // If postId provided, save directly to DB and return minimal response
    if (postId) {
      const attachment = await prisma.postAttachment.create({
        data: {
          filename,
          originalName: file.name,
          mimeType: file.type,
          size: file.size,
          path: base64,
          url: base64,
          uploaderId: userId,
          postId,
        },
      });

      return NextResponse.json({
        id: attachment.id,
        filename: attachment.filename,
        originalName: attachment.originalName,
        mimeType: attachment.mimeType,
        size: attachment.size,
      });
    }

    // No postId — return metadata only (for pre-upload before post creation)
    // Return a truncated preview URL to keep response small
    return NextResponse.json({
      filename,
      originalName: file.name,
      mimeType: file.type,
      size: file.size,
      // Return a small placeholder — actual data stored on post creation
      _pendingUpload: true,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
