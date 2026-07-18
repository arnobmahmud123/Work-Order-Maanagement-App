import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getR2Url } from "@/lib/r2";

function cleanString(value?: string | null) {
  const cleaned = value?.trim();
  return cleaned || null;
}

type PropertyFrontPhoto = {
  id: string;
  propertyId: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  path: string;
  category: string;
  uploaderId: string | null;
  createdAt: Date;
};

async function findPropertyFrontPhotos(propertyId: string) {
  try {
    return await (prisma as any).propertyPhoto.findMany({
      where: { propertyId, category: "FRONT" },
      orderBy: { createdAt: "desc" },
      take: 1,
    });
  } catch (error: any) {
    if (error?.code === "P2021") return [];
    // D1/SQLite fallback — use backtick-quoted identifiers
    try {
      return await (prisma as any).$queryRawUnsafe(
        `SELECT * FROM PropertyPhoto WHERE propertyId = ? AND category = 'FRONT' ORDER BY createdAt DESC LIMIT 1`,
        propertyId
      );
    } catch {
      return [];
    }
  }
}

async function findOrCreatePropertyForWorkOrder(workOrder: {
  id: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
}) {
  const normalizedAddress = (workOrder.address || "").trim();
  const normalizedCity = cleanString(workOrder.city);
  const normalizedState = cleanString(workOrder.state);
  const normalizedZip = cleanString(workOrder.zipCode);

  // D1-compatible: use direct value comparison instead of { equals: ... } filter
  const where: any = { address: normalizedAddress };
  if (normalizedCity) where.city = normalizedCity;
  if (normalizedState) where.state = normalizedState;
  if (normalizedZip) where.zipCode = normalizedZip;

  const existing = await prisma.property.findFirst({ where }).catch(() => null);
  if (existing) return existing;

  // Fallback: match by address only
  const existingByAddress = await prisma.property
    .findFirst({ where: { address: normalizedAddress } })
    .catch(() => null);
  if (existingByAddress) return existingByAddress;

  return prisma.property.create({
    data: {
      address: normalizedAddress,
      city: normalizedCity,
      state: normalizedState,
      zipCode: normalizedZip,
    },
  });
}

export async function GET(
  req: NextRequest,
  context: any
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = context?.params ? await context.params : null;
    const id = resolvedParams?.id || new URL(req.url).pathname.split("/").pop();

    if (!id) {
      return NextResponse.json({ error: "Missing work order ID" }, { status: 400 });
    }

    // D1 can't handle deep nested includes — fetch base work order, then related data separately
    const workOrder = await prisma.workOrder.findUnique({
      where: { id },
      include: {
        contractor: { select: { id: true, name: true, email: true, image: true, phone: true } },
        coordinator: { select: { id: true, name: true, email: true, phone: true, image: true } },
        processor: { select: { id: true, name: true, email: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        property: true,
      },
    });

    if (!workOrder) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Fetch related data separately — each wrapped in try-catch for D1 resilience
    const [files, threads, invoices, history] = await Promise.all([
      prisma.fileUpload.findMany({
        where: { workOrderId: id },
        select: {
          id: true, filename: true, originalName: true, mimeType: true,
          size: true, category: true, createdAt: true,
          uploader: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 200,
      }).catch(() => []),
      prisma.thread.findMany({
        where: { workOrderId: id },
        include: {
          messages: {
            include: { author: { select: { id: true, name: true, image: true } } },
            orderBy: { createdAt: "desc" },
            take: 5,
          },
        },
        take: 10,
      }).catch(() => []),
      prisma.invoice.findMany({
        where: { workOrderId: id },
        include: { items: true },
        orderBy: { createdAt: "desc" },
        take: 20,
      }).catch(() => []),
      prisma.activityLog.findMany({
        where: { workOrderId: id },
        include: { user: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: 50,
      }).catch(() => []),
    ]);

    const fullWorkOrder = {
      ...workOrder,
      files,
      threads,
      invoices,
      history,
    };

    let property = fullWorkOrder.property;

    if (!property) {
      property = await findOrCreatePropertyForWorkOrder(fullWorkOrder);
      // Fire-and-forget — don't block the response
      prisma.workOrder.update({
        where: { id: fullWorkOrder.id },
        data: { propertyId: property.id },
      }).catch(() => {});
    }

    const propertyFrontPhotos = property ? await findPropertyFrontPhotos(property.id) : [];

    let parsedTasks: any[] = [];
    if (typeof fullWorkOrder.tasks === "string") {
      try { parsedTasks = JSON.parse(fullWorkOrder.tasks); } catch (e) {}
    } else if (Array.isArray(fullWorkOrder.tasks)) {
      parsedTasks = fullWorkOrder.tasks;
    }

    let parsedMetadata: any = {};
    if (typeof fullWorkOrder.metadata === "string") {
      try { parsedMetadata = JSON.parse(fullWorkOrder.metadata); } catch (e) {}
    } else if (fullWorkOrder.metadata && typeof fullWorkOrder.metadata === "object") {
      parsedMetadata = fullWorkOrder.metadata;
    }

    let resolvedFiles: any[] = fullWorkOrder.files || [];
    let resolvedFrontPhotos: any[] = propertyFrontPhotos;
    let resolvedTasks: any[] = parsedTasks;
    let resolvedBids: any[] = Array.isArray(parsedMetadata?.bids)
      ? parsedMetadata.bids
      : [];
    let resolvedInspectionItems: any[] = Array.isArray(parsedMetadata?.inspectionItems)
      ? parsedMetadata.inspectionItems
      : [];

    // Process all files to use our new endpoint to avoid huge base64 strings in the JSON payload
    const signedFiles = [];
    for (const f of resolvedFiles) {
      signedFiles.push({ ...f, url: `/api/work-orders/${id}/files/${f.id}/content`, path: `/api/work-orders/${id}/files/${f.id}/content` });
    }

    const signedFrontPhotos = [];
    for (const p of propertyFrontPhotos) {
      signedFrontPhotos.push({ ...p, url: `/api/properties/${property?.id || fullWorkOrder.propertyId}/front-photo/${p.id}/content`, path: `/api/properties/${property?.id || fullWorkOrder.propertyId}/front-photo/${p.id}/content` });
    }

    const signedTasks = [];
    for (const task of resolvedTasks) {
      const photos = Array.isArray(task?.photos) ? task.photos : [];
      const resolvedPhotos = [];
      for (const photo of photos) {
        resolvedPhotos.push({
          ...photo,
          url: `/api/work-orders/${id}/files/${photo.id}/content`,
          path: `/api/work-orders/${id}/files/${photo.id}/content`,
        });
      }
      signedTasks.push({ ...task, photos: resolvedPhotos });
    }

    const signedBids = [];
    for (const bid of resolvedBids) {
      const photos = Array.isArray(bid?.photos) ? bid.photos : [];
      const resolvedPhotos = [];
      for (const photo of photos) {
        resolvedPhotos.push({
          ...photo,
          url: `/api/work-orders/${id}/files/${photo.id}/content`,
          path: `/api/work-orders/${id}/files/${photo.id}/content`,
        });
      }
      signedBids.push({ ...bid, photos: resolvedPhotos });
    }

    const signedInspectionItems = [];
    for (const item of resolvedInspectionItems) {
      const photos = Array.isArray(item?.photos) ? item.photos : [];
      const resolvedPhotos = [];
      for (const photo of photos) {
        resolvedPhotos.push({
          ...photo,
          url: `/api/work-orders/${id}/files/${photo.id}/content`,
          path: `/api/work-orders/${id}/files/${photo.id}/content`,
        });
      }
      signedInspectionItems.push({ ...item, photos: resolvedPhotos });
    }

    resolvedFiles = signedFiles;
    resolvedFrontPhotos = signedFrontPhotos;
    resolvedTasks = signedTasks;
    resolvedBids = signedBids;
    resolvedInspectionItems = signedInspectionItems;

    // Build response — include count fields the client expects
    const response = {
      ...fullWorkOrder,
      files: resolvedFiles,
      tasks: resolvedTasks,
      metadata: {
        ...parsedMetadata,
        bids: resolvedBids,
        inspectionItems: resolvedInspectionItems,
      },
      propertyId: property?.id || fullWorkOrder.propertyId,
      property: property || fullWorkOrder.property,
      propertyFrontPhotos: resolvedFrontPhotos,
      _count: {
        threads: fullWorkOrder.threads?.length || 0,
        files: fullWorkOrder.files?.length || 0,
        invoices: fullWorkOrder.invoices?.length || 0,
        history: fullWorkOrder.history?.length || 0,
      },
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error("Failed to fetch work order", error);
    return NextResponse.json(
      {
        error: "Failed to fetch work order",
        details: error?.message || String(error) || error?.stack,
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  context: any
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = context?.params ? await context.params : null;
    const id = resolvedParams?.id || new URL(req.url).pathname.split("/").pop();

    if (!id) {
      return NextResponse.json({ error: "Missing work order ID" }, { status: 400 });
    }

    const body = await req.json();

    const existing = await prisma.workOrder.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const updates: any = {};
    const allowedFields = [
      "title", "description", "address", "city", "state", "zipCode",
      "serviceType", "status", "priority", "dueDate", "lockCode",
      "lockboxLocation", "gateCode", "keyCode", "keycodeLocation",
      "lotSize", "lawnSize", "specialInstructions", "contractorId",
      "coordinatorId", "processorId", "tasks", "metadata",
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    }

    if (updates.dueDate) updates.dueDate = new Date(updates.dueDate);
    if (updates.status === "CLOSED" || updates.status === "CANCELLED") {
      updates.completedAt = new Date();
    }

    // D1-safe: serialize JSON fields explicitly before update
    if (updates.tasks !== undefined && typeof updates.tasks !== "string") {
      updates.tasks = JSON.stringify(updates.tasks);
    }
    if (updates.metadata !== undefined && typeof updates.metadata !== "string") {
      updates.metadata = JSON.stringify(updates.metadata);
    }

    const workOrder = await prisma.workOrder.update({
      where: { id },
      data: updates,
      include: {
        contractor: { select: { id: true, name: true, email: true } },
        coordinator: { select: { id: true, name: true, email: true } },
      },
    });

    // Log activity — fire-and-forget to avoid blocking the response on D1
    const changedFields = Object.keys(updates).filter(
      (k) => k !== "tasks" && k !== "metadata" && (updates as any)[k] !== (existing as any)[k]
    );
    if (changedFields.length > 0) {
      prisma.activityLog.create({
        data: {
          action: "WORK_ORDER_UPDATED",
          details: `Updated: ${changedFields.join(", ")}`,
          userId: (session.user as any).id,
          workOrderId: id,
        },
      }).catch(() => {});

      // Create notifications for important changes — fire-and-forget
      if (changedFields.includes("status")) {
        const statusLabel = updates.status;
        if (workOrder.contractorId) {
          prisma.notification.create({
            data: {
              type: "WORK_ORDER",
              title: "Work Order Status Changed",
              message: `"${workOrder.title}" status changed to ${statusLabel}`,
              userId: workOrder.contractorId,
              workOrderId: id,
            },
          }).catch(() => {});
        }
        if (workOrder.coordinatorId && workOrder.coordinatorId !== workOrder.contractorId) {
          prisma.notification.create({
            data: {
              type: "WORK_ORDER",
              title: "Work Order Status Changed",
              message: `"${workOrder.title}" status changed to ${statusLabel}`,
              userId: workOrder.coordinatorId,
              workOrderId: id,
            },
          }).catch(() => {});
        }
      }

      if (changedFields.includes("contractorId") && workOrder.contractorId) {
        prisma.notification.create({
          data: {
            type: "WORK_ORDER",
            title: "New Work Order Assignment",
            message: `You have been assigned to "${workOrder.title}"`,
            userId: workOrder.contractorId,
            workOrderId: id,
          },
        }).catch(() => {});
      }
    }

    return NextResponse.json(workOrder);
  } catch (error: any) {
    console.error("PATCH work order failed", error);
    return NextResponse.json(
      { error: "Failed to update work order", details: error?.message || String(error) },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  context: any
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if ((session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const resolvedParams = context?.params ? await context.params : null;
    const id = resolvedParams?.id || new URL(req.url).pathname.split("/").pop();

    if (!id) {
      return NextResponse.json({ error: "Missing work order ID" }, { status: 400 });
    }

    await prisma.workOrder.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE work order failed", error);
    return NextResponse.json(
      { error: "Failed to delete work order", details: error?.message || String(error) },
      { status: 500 }
    );
  }
}
