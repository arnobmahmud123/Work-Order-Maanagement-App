import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCloudflareContext } from "@opennextjs/cloudflare";
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
  const { env } = getCloudflareContext();

  try {
    const file = await env.DB.prepare(
      `SELECT public_url, mime_type FROM work_order_files WHERE id = ? AND work_order_id = ?`
    )
      .bind(fileId, id)
      .first<any>();

    if (!file || !file.public_url) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const { public_url, mime_type } = file;

    // Handle base64 strings directly
    if (public_url.startsWith("data:")) {
      const match = public_url.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        const contentType = match[1];
        const base64Data = match[2];
        const buffer = Buffer.from(base64Data, "base64");
        return new NextResponse(buffer, {
          headers: {
            "Content-Type": contentType || mime_type || "application/octet-stream",
            "Cache-Control": "public, max-age=31536000, immutable",
          },
        });
      }
    }

    // Handle R2 or other HTTP URLs
    let redirectUrl = public_url;
    try {
      redirectUrl = await getR2Url(public_url);
    } catch (e) {
      console.error("Failed to sign R2 URL:", e);
    }

    return NextResponse.redirect(redirectUrl);
  } catch (error: any) {
    console.error("D1 GET file content error:", error.message);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
