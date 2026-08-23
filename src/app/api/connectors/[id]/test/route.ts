import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { ConnectorRegistry, initializeConnectors } from "@/connectors";
import { decryptSecret } from "@/security/credential-vault";

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

    initializeConnectors();
    const instance = ConnectorRegistry.get(connector.connectorKey);
    if (!instance) {
      return NextResponse.json({ error: `Connector '${connector.connectorKey}' not registered.` }, { status: 400 });
    }

    // Retrieve and decrypt credentials if stored
    const credRow = await db
      .prepare(`SELECT encryptedValue FROM connector_credentials WHERE connectorId = ? LIMIT 1`)
      .bind(id)
      .first<any>();

    let credentials: any = {};
    if (credRow?.encryptedValue) {
      try {
        credentials = decryptSecret(credRow.encryptedValue);
      } catch {}
    }

    const testResult = await instance.testConnection(credentials);

    // Update connector status
    await db
      .prepare(
        `UPDATE connectors SET 
          status = ?, 
          lastError = ?,
          updatedAt = CURRENT_TIMESTAMP
         WHERE id = ?`
      )
      .bind(testResult.success ? "HEALTHY" : "FAILING", testResult.success ? null : testResult.message, id)
      .run();

    return NextResponse.json(testResult);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Test connection failed" }, { status: 500 });
  }
}
