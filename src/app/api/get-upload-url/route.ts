import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { auth } from "@/lib/auth";
import { r2Client } from "@/lib/r2";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!r2Client) {
      return NextResponse.json({ error: "Cloudflare R2 is not configured" }, { status: 500 });
    }

    const body = await req.json();
    const { workOrderId, fileName, fileType } = body;

    if (!workOrderId || !fileName || !fileType) {
      return NextResponse.json(
        { error: "workOrderId, fileName, and fileType are required" },
        { status: 400 }
      );
    }

    const bucketName = process.env.R2_BUCKET_NAME || "";
    if (!bucketName) {
      return NextResponse.json(
        { error: "R2_BUCKET_NAME environment variable is not configured" },
        { status: 500 }
      );
    }

    // Organize key: work-orders/${workOrderId}/${Date.now()}-${fileName}
    const key = `work-orders/${workOrderId}/${Date.now()}-${fileName}`;

    // Create S3 PUT command
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      ContentType: fileType,
    });

    // Generate pre-signed PUT URL expiring in 15 minutes (900 seconds)
    const uploadUrl = await getSignedUrl(r2Client, command, { expiresIn: 900 });

    // Determine the public URL path
    const publicUrlBase = process.env.R2_PUBLIC_URL || `${process.env.R2_ENDPOINT}/${bucketName}`;
    const publicUrl = `${publicUrlBase.replace(/\/$/, "")}/${key}`;

    return NextResponse.json({ uploadUrl, publicUrl, key });
  } catch (error: any) {
    console.error("Failed to generate pre-signed upload URL:", error);
    return NextResponse.json(
      { error: "Failed to generate upload ticket", details: error.message },
      { status: 500 }
    );
  }
}
