import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { ConnectorRegistry, initializeConnectors } from "@/connectors";
import { encryptSecret } from "@/security/credential-vault";

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

    const connector = await db
      .prepare(`SELECT * FROM connectors WHERE id = ? LIMIT 1`)
      .bind(id)
      .first<any>();

    if (!connector) {
      return NextResponse.json({ error: "Connector not found" }, { status: 404 });
    }

    initializeConnectors();
    const meta = ConnectorRegistry.get(connector.connectorKey)?.getMetadata();

    const recentJobs = await db
      .prepare(`SELECT * FROM sync_jobs WHERE connectorId = ? ORDER BY startedAt DESC LIMIT 10`)
      .bind(id)
      .all<any>();

    return NextResponse.json({
      connector,
      metadata: meta || null,
      recentJobs: recentJobs?.results || [],
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await request.json();
    const { enabled, name, syncIntervalMinutes, config, credentials } = body;

    const { env } = getCloudflareContext();
    const db = env?.DB;
    if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 500 });

    await db
      .prepare(
        `UPDATE connectors SET 
          enabled = COALESCE(?, enabled),
          name = COALESCE(?, name),
          syncIntervalMinutes = COALESCE(?, syncIntervalMinutes),
          config = COALESCE(?, config),
          updatedAt = CURRENT_TIMESTAMP
         WHERE id = ?`
      )
      .bind(
        enabled !== undefined ? (enabled ? 1 : 0) : null,
        name || null,
        syncIntervalMinutes || null,
        config ? JSON.stringify(config) : null,
        id
      )
      .run();

    if (credentials && Object.keys(credentials).length > 0) {
      const encrypted = encryptSecret(credentials);
      await db
        .prepare(`DELETE FROM connector_credentials WHERE connectorId = ?`)
        .bind(id)
        .run();

      await db
        .prepare(
          `INSERT INTO connector_credentials (id, connectorId, credentialType, encryptedValue) VALUES (?, ?, 'api_secret', ?)`
        )
        .bind(`cred_${Date.now()}`, id, encrypted)
        .run();
    }

    return NextResponse.json({ success: true, message: "Connector updated successfully." });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
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

    await db.prepare(`DELETE FROM connector_credentials WHERE connectorId = ?`).bind(id).run();
    await db.prepare(`DELETE FROM sync_jobs WHERE connectorId = ?`).bind(id).run();
    await db.prepare(`DELETE FROM connectors WHERE id = ?`).bind(id).run();

    return NextResponse.json({ success: true, message: "Connector deleted successfully." });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
