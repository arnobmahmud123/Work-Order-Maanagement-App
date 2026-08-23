import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { initializeConnectors } from "@/connectors";
import { SyncEngine } from "@/sync/sync-engine";

export async function POST(
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

    const connector = await db
      .prepare(`SELECT * FROM connectors WHERE id = ? LIMIT 1`)
      .bind(id)
      .first<any>();

    if (!connector) return NextResponse.json({ error: "Connector not found" }, { status: 404 });
    if (!connector.enabled) return NextResponse.json({ error: "Connector is disabled." }, { status: 400 });

    initializeConnectors();
    const syncEngine = new SyncEngine();

    const result = await syncEngine.runSync({
      connectorId: connector.id,
      connectorKey: connector.connectorKey,
      clientId: connector.clientId,
      syncType: "NEW_WORK_ORDERS",
      db,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Sync failed" }, { status: 500 });
  }
}
