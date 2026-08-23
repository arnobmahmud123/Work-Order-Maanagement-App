import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { CsvExcelConnector } from "@/connectors/csv/csv-excel.connector";
import { SyncEngine } from "@/sync/sync-engine";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { action, rows, headers, mapping, clientId, clientName } = body;

    const fileConnector = new CsvExcelConnector();

    // 1. Column detection action
    if (action === "detect_columns") {
      if (!Array.isArray(headers)) {
        return NextResponse.json({ error: "headers array required" }, { status: 400 });
      }
      const suggestedMapping = fileConnector.autoDetectColumns(headers);
      return NextResponse.json({ suggestedMapping });
    }

    // 2. Validate & Preview action
    if (action === "validate_preview") {
      if (!Array.isArray(rows) || !mapping) {
        return NextResponse.json({ error: "rows and mapping required" }, { status: 400 });
      }
      const validation = fileConnector.validateRows(rows, mapping, clientId, clientName);
      return NextResponse.json(validation);
    }

    // 3. Execute Batch Import
    if (action === "execute_import") {
      if (!Array.isArray(rows) || !mapping) {
        return NextResponse.json({ error: "rows and mapping required" }, { status: 400 });
      }

      const { env } = getCloudflareContext();
      const db = env?.DB;
      if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 500 });

      // Run full normalization
      const validation = fileConnector.validateRows(rows, mapping, clientId, clientName);
      const validOrders = validation.samplePreview
        .filter((p) => p.normalized && p.errors.length === 0)
        .map((p) => p.normalized!);

      // Also process remaining rows if rows > 50
      const remainingOrders = rows.slice(50).map((r) => {
        const rawWo = String(r[mapping.externalWorkOrderId] || "").trim();
        const rawAddr = String(r[mapping.address1] || "").trim();
        if (!rawWo || !rawAddr) return null;
        return fileConnector.validateRows([r], mapping, clientId, clientName).samplePreview[0]?.normalized;
      }).filter(Boolean) as any[];

      const allOrders = [...validOrders, ...remainingOrders];

      const user = session?.user as any;
      const companyId = user?.companyId || "cmrwl4vwd0001oocwyt5b5v0a";
      const createdById = user?.id || null;

      const syncEngine = new SyncEngine();
      const result = await syncEngine.runSync({
        connectorId: "conn_file_universal",
        connectorKey: "csv_excel",
        clientId: clientId || "cli_custom_file",
        companyId,
        createdById,
        syncType: "MANUAL_BATCH",
        customOrders: allOrders,
        db,
      });

      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("[API File Import] Error:", error);
    return NextResponse.json({ error: error.message || "File import processing failed" }, { status: 500 });
  }
}
