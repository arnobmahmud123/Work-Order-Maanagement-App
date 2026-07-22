import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getR2Url } from "@/lib/r2";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; fileId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, fileId } = await params;

  try {
    const file = await prisma.fileUpload.findFirst({
      where: {
        id: fileId,
        workOrderId: id,
      },
    });

    if (!file || !file.path) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const { path: publicUrl, mimeType } = file;

    // Handle base64 strings directly
    if (publicUrl.startsWith("data:")) {
      const match = publicUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        const contentType = match[1];
        const base64Data = match[2];
        const buffer = Buffer.from(base64Data, "base64");
        return new NextResponse(buffer, {
          headers: {
            "Content-Type": contentType || mimeType || "application/octet-stream",
            "Cache-Control": "public, max-age=31536000, immutable",
          },
        });
      }
    }

    // Handle R2 or other HTTP URLs
    let redirectUrl = publicUrl;
    try {
      redirectUrl = await getR2Url(publicUrl);
    } catch (e) {
      console.error("Failed to sign R2 URL:", e);
    }

    return NextResponse.redirect(redirectUrl);
  } catch (error: any) {
    console.error("Prisma GET file content error:", error.message);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
