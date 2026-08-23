import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { ConnectorRegistry, initializeConnectors } from "@/connectors";
import { encryptSecret, maskSecretString } from "@/security/credential-vault";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    initializeConnectors();
    const availableMetadata = ConnectorRegistry.list();

    const { env } = getCloudflareContext();
    const db = env?.DB;

    let configuredConnectors: any[] = [];
    let clients: any[] = [];

    if (db) {
      const connRows = await db
        .prepare(`SELECT * FROM connectors ORDER BY createdAt DESC`)
        .all<any>();
      configuredConnectors = connRows?.results || [];

      const clientRows = await db
        .prepare(`SELECT * FROM clients WHERE active = 1 ORDER BY name ASC`)
        .all<any>();
      clients = clientRows?.results || [];
    }

    // Merge registered catalog with active database configurations
    const catalog = availableMetadata.map((meta) => {
      const activeConfigs = configuredConnectors.filter(
        (c) => c.connectorKey.toLowerCase() === meta.key.toLowerCase()
      );
      return {
        ...meta,
        isConfigured: activeConfigs.length > 0,
        configuredInstances: activeConfigs,
      };
    });

    return NextResponse.json({
      catalog,
      configuredConnectors,
      clients,
    });
  } catch (error: any) {
    console.error("[API Connectors] GET error:", error);
    return NextResponse.json({ error: error.message || "Failed to list connectors" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { connectorKey, clientId, name, syncIntervalMinutes, credentials, config } = body;

    if (!connectorKey || !name) {
      return NextResponse.json({ error: "connectorKey and name are required." }, { status: 400 });
    }

    const { env } = getCloudflareContext();
    const db = env?.DB;
    if (!db) {
      return NextResponse.json({ error: "Database not available" }, { status: 500 });
    }

    const id = `conn_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    await db
      .prepare(
        `INSERT INTO connectors (id, clientId, connectorKey, name, enabled, status, syncIntervalMinutes, config, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, 1, 'HEALTHY', ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
      )
      .bind(
        id,
        clientId || null,
        connectorKey,
        name,
        syncIntervalMinutes || 10,
        config ? JSON.stringify(config) : null
      )
      .run();

    // Store encrypted credentials if provided
    if (credentials && Object.keys(credentials).length > 0) {
      const encrypted = encryptSecret(credentials);
      await db
        .prepare(
          `INSERT INTO connector_credentials (id, connectorId, credentialType, encryptedValue) VALUES (?, ?, 'api_secret', ?)`
        )
        .bind(`cred_${Date.now()}`, id, encrypted)
        .run();
    }

    return NextResponse.json({
      success: true,
      id,
      message: `Connector '${name}' configured successfully.`,
    });
  } catch (error: any) {
    console.error("[API Connectors] POST error:", error);
    return NextResponse.json({ error: error.message || "Failed to create connector" }, { status: 500 });
  }
}
