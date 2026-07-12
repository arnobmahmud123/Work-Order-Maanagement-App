import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

// ─── Work Order Import API ──────────────────────────────────────────────────
// Accepts JSON, CSV, Excel (parsed client-side), and PDF (parsed client-side)
// Client sends already-parsed rows as JSON array

interface ImportedRow {
  title?: string;
  description?: string;
  address: string;
  city?: string;
  state?: string;
  zipCode?: string;
  serviceType?: string;
  dueDate?: string;
  priority?: string | number;
  lockCode?: string;
  lockboxLocation?: string;
  gateCode?: string;
  keyCode?: string;
  keycodeLocation?: string;
  lotSize?: string | number;
  lawnSize?: string | number;
  specialInstructions?: string;
  contractorName?: string;
  coordinatorName?: string;
  clientName?: string;
  tasks?: string;
  [key: string]: any;
}

const SERVICE_TYPE_MAP: Record<string, string> = {
  "grass cut": "GRASS_CUT",
  "grasscut": "GRASS_CUT",
  "lawn": "GRASS_CUT",
  "mowing": "GRASS_CUT",
  "debris removal": "DEBRIS_REMOVAL",
  "debris": "DEBRIS_REMOVAL",
  "cleanout": "DEBRIS_REMOVAL",
  "trash out": "DEBRIS_REMOVAL",
  "winterization": "WINTERIZATION",
  "winterize": "WINTERIZATION",
  "board up": "BOARD_UP",
  "board-up": "BOARD_UP",
  "boarding": "BOARD_UP",
  "securing": "BOARD_UP",
  "inspection": "INSPECTION",
  "inspect": "INSPECTION",
  "mold remediation": "MOLD_REMEDIATION",
  "mold": "MOLD_REMEDIATION",
  "other": "OTHER",
};

const STATUS_MAP: Record<string, string> = {
  "new": "NEW",
  "pending": "PENDING",
  "assigned": "ASSIGNED",
  "in progress": "IN_PROGRESS",
  "in-progress": "IN_PROGRESS",
  "active": "IN_PROGRESS",
  "field complete": "FIELD_COMPLETE",
  "field-complete": "FIELD_COMPLETE",
  "complete": "FIELD_COMPLETE",
  "completed": "FIELD_COMPLETE",
  "done": "FIELD_COMPLETE",
  "qc review": "QC_REVIEW",
  "qc": "QC_REVIEW",
  "pending review": "PENDING_REVIEW",
  "revisions needed": "REVISIONS_NEEDED",
  "revisions": "REVISIONS_NEEDED",
  "office complete": "OFFICE_COMPLETE",
  "closed": "CLOSED",
  "cancelled": "CANCELLED",
  "canceled": "CANCELLED",
};

function normalizeServiceType(input?: string): string {
  if (!input) return "OTHER";
  const lower = input.trim().toLowerCase();
  if (SERVICE_TYPE_MAP[lower]) return SERVICE_TYPE_MAP[lower];
  // Try partial match
  for (const [key, val] of Object.entries(SERVICE_TYPE_MAP)) {
    if (lower.includes(key)) return val;
  }
  return "OTHER";
}

function normalizeStatus(input?: string): string {
  if (!input) return "NEW";
  const lower = input.trim().toLowerCase();
  if (STATUS_MAP[lower]) return STATUS_MAP[lower];
  for (const [key, val] of Object.entries(STATUS_MAP)) {
    if (lower.includes(key)) return val;
  }
  return "NEW";
}

function parseDate(input?: string): Date | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Try standard date parsing
  const d = new Date(trimmed);
  if (!isNaN(d.getTime())) return d;

  // Try MM/DD/YYYY
  const parts = trimmed.split(/[\/\-\.]/);
  if (parts.length === 3) {
    const [a, b, c] = parts.map(Number);
    if (c > 100) return new Date(c, a - 1, b); // MM/DD/YYYY
    if (a > 100) return new Date(a, b - 1, c); // YYYY/MM/DD
  }

  return null;
}

async function resolveContractorId(name?: string): Promise<string | null> {
  if (!name) return null;
  const trimmed = name.trim();
  if (!trimmed) return null;

  const user = await prisma.user.findFirst({
    where: {
      role: "CONTRACTOR",
      OR: [
        { name: { contains: trimmed } },
        { email: { contains: trimmed } },
      ],
    },
    select: { id: true },
  });
  return user?.id || null;
}

async function resolveCoordinatorId(name?: string): Promise<string | null> {
  if (!name) return null;
  const trimmed = name.trim();
  if (!trimmed) return null;

  const user = await prisma.user.findFirst({
    where: {
      role: { in: ["COORDINATOR", "ADMIN"] },
      OR: [
        { name: { contains: trimmed } },
        { email: { contains: trimmed } },
      ],
    },
    select: { id: true },
  });
  return user?.id || null;
}

async function findOrCreateProperty(address: string, city?: string, state?: string, zipCode?: string): Promise<string> {
  const normalizedAddress = address.trim();

  // D1-compatible: use direct value comparison instead of { equals: ... } filter
  const where: any = { address: normalizedAddress };
  if (city?.trim()) where.city = city.trim();

  const existing = await prisma.property.findFirst({ where }).catch(() => null);
  if (existing) return existing.id;

  const created = await prisma.property.create({
    data: {
      address: normalizedAddress,
      city: city?.trim() || null,
      state: state?.trim() || null,
      zipCode: zipCode?.trim() || null,
    },
  });

  return created.id;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = (session.user as any).role;
  if (!["ADMIN", "COORDINATOR", "PROCESSOR"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { rows, mode } = body as { rows: ImportedRow[]; mode: "preview" | "import" };

  if (!rows || !Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: "No rows to import" }, { status: 400 });
  }

  // Preview mode: validate and return preview data
  if (mode === "preview") {
    const preview = rows.slice(0, 100).map((row, i) => {
      const errors: string[] = [];
      if (!row.address?.trim()) errors.push("Address is required");
      if (!row.title?.trim() && !row.address?.trim()) errors.push("Title or address required");

      return {
        row: i + 1,
        title: row.title?.trim() || (row.address ? `Work Order — ${row.address.trim()}` : ""),
        address: row.address?.trim() || "",
        serviceType: normalizeServiceType(row.serviceType),
        dueDate: parseDate(row.dueDate)?.toISOString() || null,
        status: normalizeStatus(row.status),
        contractorName: row.contractorName?.trim() || "",
        errors,
        valid: errors.length === 0,
        rawData: row,
      };
    });

    const validCount = preview.filter((p) => p.valid).length;
    const invalidCount = preview.filter((p) => !p.valid).length;

    return NextResponse.json({
      preview,
      total: rows.length,
      validCount,
      invalidCount,
      showing: Math.min(rows.length, 100),
    });
  }

  // Import mode: create work orders
  const userId = (session.user as any).id;
  const results: { success: boolean; row: number; id?: string; error?: string; title?: string }[] = [];
  let created = 0;
  let failed = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];

    try {
      if (!row.address?.trim()) {
        results.push({ success: false, row: i + 1, error: "Missing address" });
        failed++;
        continue;
      }

      const title = row.title?.trim() || `Work Order — ${row.address.trim()}`;
      const serviceType = normalizeServiceType(row.serviceType);
      const status = normalizeStatus(row.status);
      const dueDate = parseDate(row.dueDate);
      const priority = row.priority ? Number(row.priority) || 0 : 0;

      // Resolve contractor and coordinator
      const [contractorId, coordinatorId] = await Promise.all([
        resolveContractorId(row.contractorName),
        resolveCoordinatorId(row.coordinatorName),
      ]);

      // Find or create property
      const propertyId = await findOrCreateProperty(
        row.address,
        row.city,
        row.state,
        row.zipCode
      );

      const workOrder = await prisma.workOrder.create({
        data: {
          title,
          description: row.description?.trim() || row.specialInstructions?.trim() || null,
          address: row.address.trim(),
          city: row.city?.trim() || null,
          state: row.state?.trim() || null,
          zipCode: row.zipCode?.trim() || null,
          serviceType: serviceType as any,
          status: status as any,
          dueDate,
          priority,
          lockCode: row.lockCode?.trim() || null,
          lockboxLocation: row.lockboxLocation?.trim() || null,
          gateCode: row.gateCode?.trim() || null,
          keyCode: row.keyCode?.trim() || null,
          keycodeLocation: row.keycodeLocation?.trim() || null,
          lotSize: row.lotSize ? String(row.lotSize).trim() || null : null,
          lawnSize: row.lawnSize ? String(row.lawnSize).trim() || null : null,
          specialInstructions: row.specialInstructions?.trim() || null,
          contractorId,
          coordinatorId,
          propertyId,
          createdById: userId,
        },
      });

      // Parse and store tasks as JSON on the work order
      if (row.tasks?.trim()) {
        const taskLines = row.tasks.split(/[;,\n]/).filter((t) => t.trim());
        const tasksJson = taskLines.map((title: string, order: number) => ({
          title: title.trim(),
          order,
          completed: false,
        }));
        await prisma.workOrder.update({
          where: { id: workOrder.id },
          data: { tasks: JSON.stringify(tasksJson) },
        }).catch(() => {});
      }

      results.push({ success: true, row: i + 1, id: workOrder.id, title });
      created++;
    } catch (err: any) {
      results.push({ success: false, row: i + 1, error: err.message || "Unknown error" });
      failed++;
    }
  }

  // Log activity
  try {
    await prisma.activityLog.create({
      data: {
        action: "BULK_IMPORT",
        details: `Imported ${created} work orders (${failed} failed)`,
        userId,
      },
    });
  } catch {}

  return NextResponse.json({
    created,
    failed,
    total: rows.length,
    results: results.slice(0, 50), // Return first 50 results
  });
}
