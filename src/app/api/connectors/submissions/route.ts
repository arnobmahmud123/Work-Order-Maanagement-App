import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { initializeConnectors } from "@/connectors";
import { SubmissionEngine } from "@/sync/submission-engine";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { env } = getCloudflareContext();
    const db = env?.DB;
    if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 500 });

    const submissions = await db
      .prepare(
        `SELECT s.*, w.title as workOrderTitle, w.address as workOrderAddress, c.name as connectorName, c.connectorKey
         FROM work_order_submissions s
         LEFT JOIN WorkOrder w ON s.workOrderId = w.id
         LEFT JOIN connectors c ON s.connectorId = c.id
         ORDER BY s.attemptedAt DESC LIMIT 50`
      )
      .all<any>();

    return NextResponse.json({
      submissions: submissions?.results || [],
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { action, workOrderId, connectorId, connectorKey, payload } = body;

    const { env } = getCloudflareContext();
    const db = env?.DB;
    if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 500 });

    initializeConnectors();
    const submissionEngine = new SubmissionEngine();

    // 1. Validate work order for client submission
    if (action === "validate") {
      const wo = await db
        .prepare(`SELECT * FROM WorkOrder WHERE id = ? LIMIT 1`)
        .bind(workOrderId)
        .first<any>();

      if (!wo) return NextResponse.json({ error: "Work order not found" }, { status: 404 });

      const validation = await submissionEngine.validateForSubmission(wo, connectorKey);
      return NextResponse.json(validation);
    }

    // 2. Submit to external client connector
    if (action === "submit") {
      const wo = await db
        .prepare(`SELECT * FROM WorkOrder WHERE id = ? LIMIT 1`)
        .bind(workOrderId)
        .first<any>();

      if (!wo) return NextResponse.json({ error: "Work order not found" }, { status: 404 });

      // Get external reference ID
      const ref = await db
        .prepare(`SELECT externalWorkOrderId FROM work_order_external_refs WHERE workOrderId = ? LIMIT 1`)
        .bind(workOrderId)
        .first<any>();

      const externalId = ref?.externalWorkOrderId || workOrderId;

      const result = await submissionEngine.submitWorkOrder({
        workOrderId,
        connectorId: connectorId || "conn_manual",
        connectorKey,
        externalWorkOrderId: externalId,
        payload: payload || {
          workOrderId,
          externalWorkOrderId: externalId,
          completionDate: new Date().toISOString(),
          lineItems: [],
          photos: [],
          documents: [],
        },
        db,
      });

      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
