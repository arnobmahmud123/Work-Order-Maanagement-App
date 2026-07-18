import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getR2Url } from "@/lib/r2";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; photoId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, photoId } = await params;

  try {
    let photo;
    try {
      photo = await prisma.propertyPhoto.findUnique({
        where: { id: photoId },
      });
    } catch (e: any) {
      // Fallback for D1 issues
      if (e.code === "P2021") throw e;
      const results: any = await (prisma as any).$queryRawUnsafe(
        `SELECT * FROM PropertyPhoto WHERE id = ?`,
        photoId
      );
      photo = results?.[0];
    }

    if (!photo || photo.propertyId !== id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const { path, mimeType } = photo;

    // Handle base64 strings directly
    if (path.startsWith("data:")) {
      const match = path.match(/^data:([^;]+);base64,(.+)$/);
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
    let redirectUrl = path;
    try {
      redirectUrl = await getR2Url(path);
    } catch (e) {
      console.error("Failed to sign R2 URL:", e);
    }

    return NextResponse.redirect(redirectUrl);
  } catch (error: any) {
    console.error("GET property front photo content error:", error.message);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
