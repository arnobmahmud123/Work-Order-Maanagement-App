import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCloudflareContext } from "@opennextjs/cloudflare";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const { env } = getCloudflareContext();
    const db = env?.DB;
    if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 500 });

    const jobs = await db
      .prepare(`SELECT * FROM sync_jobs WHERE connectorId = ? ORDER BY startedAt DESC LIMIT 50`)
      .bind(id)
      .all<any>();

    const rawRecords = await db
      .prepare(`SELECT id, externalRecordId, recordType, checksum, retrievedAt FROM connector_raw_records WHERE connectorId = ? ORDER BY retrievedAt DESC LIMIT 20`)
      .bind(id)
      .all<any>();

    return NextResponse.json({
      jobs: jobs?.results || [],
      rawRecords: rawRecords?.results || [],
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
