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

    const serviceMappings = await db
      .prepare(`SELECT * FROM service_mappings WHERE connectorId = ? OR connectorId IS NULL ORDER BY externalName ASC`)
      .bind(id)
      .all<any>();

    const statusMappings = await db
      .prepare(`SELECT * FROM status_mappings WHERE connectorId = ? OR connectorId IS NULL ORDER BY externalStatus ASC`)
      .bind(id)
      .all<any>();

    return NextResponse.json({
      serviceMappings: serviceMappings?.results || [],
      statusMappings: statusMappings?.results || [],
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await request.json();
    const { type, externalName, externalCode, internalCode, externalStatus, internalStatus } = body;

    const { env } = getCloudflareContext();
    const db = env?.DB;
    if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 500 });

    if (type === "SERVICE") {
      const mapId = `sm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      await db
        .prepare(
          `INSERT INTO service_mappings (id, connectorId, externalCode, externalName, internalServiceCode, active) 
           VALUES (?, ?, ?, ?, ?, 1)`
        )
        .bind(mapId, id, externalCode || null, externalName, internalCode)
        .run();
      return NextResponse.json({ success: true, id: mapId });
    }

    if (type === "STATUS") {
      const mapId = `stm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      await db
        .prepare(
          `INSERT INTO status_mappings (id, connectorId, externalStatus, internalStatus, active) 
           VALUES (?, ?, ?, ?, 1)`
        )
        .bind(mapId, id, externalStatus, internalStatus)
        .run();
      return NextResponse.json({ success: true, id: mapId });
    }

    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
