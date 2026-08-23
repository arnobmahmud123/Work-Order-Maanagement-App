import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCloudflareContext } from "@opennextjs/cloudflare";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { env } = getCloudflareContext();
    const db = env?.DB;
    if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 500 });

    const connectors = await db
      .prepare(`SELECT id, name, connectorKey, status, enabled, lastSyncAt, lastSuccessAt, lastFailureAt, lastError FROM connectors`)
      .all<any>();

    const recentJobs = await db
      .prepare(
        `SELECT j.*, c.name as connectorName 
         FROM sync_jobs j 
         JOIN connectors c ON j.connectorId = c.id 
         ORDER BY j.startedAt DESC LIMIT 20`
      )
      .all<any>();

    const todayStats = await db
      .prepare(
        `SELECT 
          SUM(recordsCreated) as totalCreated, 
          SUM(recordsUpdated) as totalUpdated, 
          SUM(recordsFailed) as totalFailed 
         FROM sync_jobs 
         WHERE startedAt >= date('now', 'start of day')`
      )
      .first<any>();

    return NextResponse.json({
      connectors: connectors?.results || [],
      recentJobs: recentJobs?.results || [],
      todayStats: {
        totalCreated: todayStats?.totalCreated || 0,
        totalUpdated: todayStats?.totalUpdated || 0,
        totalFailed: todayStats?.totalFailed || 0,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
