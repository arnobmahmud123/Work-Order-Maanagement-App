import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

// ─── Auto-Import from Client Systems ────────────────────────────────────────
// Fetches work orders from external client APIs and imports them
// Supports: webhooks, REST API polling, email parsing

interface ExternalSource {
  id: string;
  name: string;
  type: "api" | "webhook" | "email";
  url?: string;
  apiKey?: string;
  headers?: Record<string, string>;
  mapping?: Record<string, string>;
  lastSyncAt?: string;
}

// POST /api/work-orders/import/auto
// Body: { source: ExternalSource, action: "sync" | "test" | "configure" }
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = (session.user as any).role;
  if (!["ADMIN", "COORDINATOR"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { source, action } = body as { source: ExternalSource; action: "sync" | "test" | "configure" };

  if (!source) {
    return NextResponse.json({ error: "Source configuration required" }, { status: 400 });
  }

  // Test connection
  if (action === "test") {
    try {
      const result = await testExternalSource(source);
      return NextResponse.json({ success: true, ...result });
    } catch (err: any) {
      return NextResponse.json({ success: false, error: err.message }, { status: 400 });
    }
  }

  // Sync (fetch and import)
  if (action === "sync") {
    try {
      const rows = await fetchFromExternalSource(source);

      if (!rows || rows.length === 0) {
        return NextResponse.json({
          success: true,
          message: "No new work orders found",
          imported: 0,
        });
      }

      // Import via the main import endpoint logic
      const userId = (session.user as any).id;
      let created = 0;
      let failed = 0;
      const errors: string[] = [];

      for (const row of rows) {
        try {
          const address = row.address || row.property_address || row.propertyAddress || row.location;
          if (!address) {
            failed++;
            errors.push(`Row missing address: ${JSON.stringify(row).slice(0, 100)}`);
            continue;
          }

          const title = row.title || row.name || row.subject || `Imported — ${address}`;
          const serviceType = normalizeServiceType(row.serviceType || row.service_type || row.type || row.category);
          const dueDate = parseDate(row.dueDate || row.due_date || row.deadline || row.scheduled_date);

          // Find or create property — D1-compatible: use direct value comparison
          let property = await prisma.property.findFirst({
            where: { address: address.trim() },
          }).catch(() => null);
          if (!property) {
            property = await prisma.property.create({
              data: {
                address: address.trim(),
                city: row.city || null,
                state: row.state || null,
                zipCode: row.zipCode || row.zip_code || row.zip || null,
              },
            });
          }

          // Resolve contractor
          let contractorId: string | null = null;
          const contractorName = row.contractor || row.contractorName || row.assigned_to || row.vendor;
          if (contractorName) {
            const contractor = await prisma.user.findFirst({
              where: {
                role: "CONTRACTOR",
                OR: [
                  { name: { contains: contractorName } },
                  { email: { contains: contractorName } },
                ],
              },
            });
            contractorId = contractor?.id || null;
          }

          // Check for duplicates — D1-compatible: use direct value comparison
          const existing = await prisma.workOrder.findFirst({
            where: {
              address: address.trim(),
              serviceType: serviceType as any,
              title: title.trim(),
            },
          }).catch(() => null);

          if (existing) {
            // Update if external data has newer info
            if (row.status || row.dueDate) {
              await prisma.workOrder.update({
                where: { id: existing.id },
                data: {
                  ...(row.status && { status: normalizeStatus(row.status) as any }),
                  ...(dueDate && { dueDate }),
                  ...(row.description && { description: row.description }),
                  ...(contractorId && { contractorId }),
                },
              });
            }
            continue;
          }

          await prisma.workOrder.create({
            data: {
              title: title.trim(),
              description: row.description || row.notes || row.comments || null,
              address: address.trim(),
              city: row.city || null,
              state: row.state || null,
              zipCode: row.zipCode || row.zip_code || row.zip || null,
              serviceType: serviceType as any,
              status: normalizeStatus(row.status || row.order_status) as any,
              dueDate,
              priority: row.priority ? Number(row.priority) || 0 : 0,
              lockCode: row.lockCode || row.lock_code || null,
              lockboxLocation: row.lockboxLocation || row.lockbox || null,
              gateCode: row.gateCode || row.gate_code || null,
              keyCode: row.keyCode || row.key_code || null,
              contractorId,
              propertyId: property.id,
              createdById: userId,
            },
          });
          created++;
        } catch (err: any) {
          failed++;
          errors.push(err.message);
        }
      }

      // Log activity
      try {
        await prisma.activityLog.create({
          data: {
            action: "AUTO_IMPORT",
            details: `Auto-imported ${created} work orders from ${source.name} (${failed} failed)`,
            userId,
          },
        });
      } catch {}

      return NextResponse.json({
        success: true,
        created,
        failed,
        total: rows.length,
        errors: errors.slice(0, 10),
      });
    } catch (err: any) {
      return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

// ─── Helper Functions ────────────────────────────────────────────────────────

async function testExternalSource(source: ExternalSource): Promise<{ message: string; sampleData?: any[] }> {
  if (!source.url) throw new Error("URL is required for API source");

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(source.headers || {}),
  };
  if (source.apiKey) {
    headers["Authorization"] = `Bearer ${source.apiKey}`;
  }

  const res = await fetch(source.url, {
    method: "GET",
    headers,
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    throw new Error(`API returned ${res.status}: ${res.statusText}`);
  }

  const data = await res.json();
  const rows = Array.isArray(data) ? data : data.data || data.rows || data.workOrders || data.orders || [];

  return {
    message: `Connected successfully. Found ${rows.length} records.`,
    sampleData: rows.slice(0, 3),
  };
}

async function fetchFromExternalSource(source: ExternalSource): Promise<Record<string, any>[]> {
  if (!source.url) throw new Error("URL is required");

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(source.headers || {}),
  };
  if (source.apiKey) {
    headers["Authorization"] = `Bearer ${source.apiKey}`;
  }

  const res = await fetch(source.url, {
    method: "GET",
    headers,
    signal: AbortSignal.timeout(30000),
  });

  if (!res.ok) {
    throw new Error(`API returned ${res.status}: ${res.statusText}`);
  }

  const data = await res.json();
  let rows = Array.isArray(data) ? data : data.data || data.rows || data.workOrders || data.orders || [];

  // Apply column mapping if provided
  if (source.mapping) {
    rows = rows.map((row: Record<string, any>) => {
      const mapped: Record<string, any> = {};
      for (const [externalKey, internalKey] of Object.entries(source.mapping!)) {
        if (row[externalKey] !== undefined) {
          mapped[internalKey] = row[externalKey];
        }
      }
      // Keep unmapped fields
      for (const [key, value] of Object.entries(row)) {
        if (!Object.keys(source.mapping!).includes(key)) {
          mapped[key] = value;
        }
      }
      return mapped;
    });
  }

  return rows;
}

function normalizeServiceType(input?: string): string {
  if (!input) return "OTHER";
  const map: Record<string, string> = {
    "grass cut": "GRASS_CUT", "grasscut": "GRASS_CUT", "lawn": "GRASS_CUT", "mowing": "GRASS_CUT",
    "debris removal": "DEBRIS_REMOVAL", "debris": "DEBRIS_REMOVAL", "cleanout": "DEBRIS_REMOVAL",
    "winterization": "WINTERIZATION", "winterize": "WINTERIZATION",
    "board up": "BOARD_UP", "board-up": "BOARD_UP", "securing": "BOARD_UP",
    "inspection": "INSPECTION", "inspect": "INSPECTION",
    "mold remediation": "MOLD_REMEDIATION", "mold": "MOLD_REMEDIATION",
  };
  const lower = input.trim().toLowerCase();
  if (map[lower]) return map[lower];
  for (const [key, val] of Object.entries(map)) {
    if (lower.includes(key)) return val;
  }
  return "OTHER";
}

function normalizeStatus(input?: string): string {
  if (!input) return "NEW";
  const map: Record<string, string> = {
    "new": "NEW", "pending": "PENDING", "assigned": "ASSIGNED",
    "in progress": "IN_PROGRESS", "active": "IN_PROGRESS",
    "field complete": "FIELD_COMPLETE", "complete": "FIELD_COMPLETE", "done": "FIELD_COMPLETE",
    "qc review": "QC_REVIEW", "closed": "CLOSED", "cancelled": "CANCELLED",
  };
  const lower = input.trim().toLowerCase();
  if (map[lower]) return map[lower];
  for (const [key, val] of Object.entries(map)) {
    if (lower.includes(key)) return val;
  }
  return "NEW";
}

function parseDate(input?: string): Date | null {
  if (!input) return null;
  const d = new Date(input.trim());
  return isNaN(d.getTime()) ? null : d;
}

// GET /api/work-orders/import/auto — List saved auto-import sources
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Return saved import sources from activity logs
  const recentImports = await prisma.activityLog.findMany({
    where: {
      action: { in: ["AUTO_IMPORT", "BULK_IMPORT"] },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return NextResponse.json({
    recentImports: recentImports.map((log) => ({
      id: log.id,
      action: log.action,
      details: log.details,
      createdAt: log.createdAt,
    })),
  });
}
