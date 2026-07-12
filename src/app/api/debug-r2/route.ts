import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { r2Client } from "@/lib/r2";
import { getR2Url } from "@/lib/r2";
import { HeadObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";

/**
 * Debug endpoint for R2 config and file existence checks.
 * GET /api/debug-r2               → show config
 * GET /api/debug-r2?path=<url>   → test URL resolution
 * GET /api/debug-r2?key=<key>    → check if object exists in R2 bucket
 * GET /api/debug-r2?list=1       → list first 20 objects in bucket
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const testPath = searchParams.get("path");
  const testKey  = searchParams.get("key");
  const listAll  = searchParams.get("list");

  const config = {
    R2_ENDPOINT:        process.env.R2_ENDPOINT        ? `✅ ${process.env.R2_ENDPOINT}` : "❌ missing",
    R2_BUCKET_NAME:     process.env.R2_BUCKET_NAME     || "❌ missing",
    R2_ACCESS_KEY_ID:   process.env.R2_ACCESS_KEY_ID   ? "✅ set" : "❌ missing",
    R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY ? "✅ set" : "❌ missing",
    R2_PUBLIC_URL:      process.env.R2_PUBLIC_URL      || "❌ NOT SET",
  };

  // List first 20 objects in bucket
  if (listAll && r2Client) {
    try {
      const cmd = new ListObjectsV2Command({
        Bucket: process.env.R2_BUCKET_NAME || "",
        MaxKeys: 20,
      });
      const res = await r2Client.send(cmd);
      return NextResponse.json({
        config,
        objects: (res.Contents || []).map((o: any) => ({ key: o.Key, size: o.Size, lastModified: o.LastModified })),
        truncated: res.IsTruncated,
      });
    } catch (err: any) {
      return NextResponse.json({ config, listError: err.message });
    }
  }

  // Check if a specific key exists
  if (testKey && r2Client) {
    try {
      const cmd = new HeadObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME || "",
        Key: testKey,
      });
      const res = await r2Client.send(cmd);
      return NextResponse.json({ config, key: testKey, exists: true, size: res.ContentLength, contentType: res.ContentType });
    } catch (err: any) {
      return NextResponse.json({ config, key: testKey, exists: false, error: err.message });
    }
  }

  // Resolve a URL
  if (testPath) {
    const resolved = await getR2Url(testPath);
    return NextResponse.json({ config, input: testPath, resolved });
  }

  return NextResponse.json({ config, message: "Pass ?path=<url>, ?key=<key>, or ?list=1" });
}
