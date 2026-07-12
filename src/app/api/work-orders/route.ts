import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

const STAFF_WORK_ORDER_ROLES = new Set([
  "ADMIN",
  "COORDINATOR",
  "INCHARGE_COORDINATOR",
  "PROCESSOR",
  "PROCESSOR_INCHARGE",
  "ACCOUNTANT",
  "CLIENT_MANAGER",
  "INCHARGE_CLIENT_MANAGER",
]);

const WORK_ORDER_CREATE_ROLES = new Set([
  "ADMIN",
  "COORDINATOR",
  "INCHARGE_COORDINATOR",
  "PROCESSOR",
  "PROCESSOR_INCHARGE",
  "CLIENT",
  "CLIENT_MANAGER",
  "INCHARGE_CLIENT_MANAGER",
]);

function normalizeRole(role: unknown) {
  return typeof role === "string" && role.trim()
    ? role.trim().toUpperCase()
    : null;
}

function cleanString(value?: string | null) {
  const cleaned = value?.trim();
  return cleaned || null;
}

async function getSessionUser(sessionUser: any) {
  const sessionId = typeof sessionUser?.id === "string" ? sessionUser.id : "";
  const sessionEmail =
    typeof sessionUser?.email === "string"
      ? sessionUser.email.trim().toLowerCase()
      : "";
  const sessionRole = normalizeRole(sessionUser?.role);

  const dbUser =
    sessionId || sessionEmail
      ? await prisma.user.findFirst({
          where: sessionId ? { id: sessionId } : { email: sessionEmail },
          select: { id: true, email: true, role: true, isActive: true },
        })
      : null;

  const isActive = (dbUser as any)?.isActive;
  if (isActive === false || isActive === 0) return null;

  return {
    id: dbUser?.id || sessionId,
    email: dbUser?.email || sessionEmail,
    role: normalizeRole(dbUser?.role) || sessionRole || "CLIENT",
  };
}

function applyWorkOrderVisibility(where: any, role: string, userId: string) {
  if (STAFF_WORK_ORDER_ROLES.has(role)) return;
  if (role === "CONTRACTOR") {
    where.contractorId = userId;
    return;
  }

  where.createdById = userId;
}

async function findOrCreateProperty({
  propertyId,
  address,
  city,
  state,
  zipCode,
}: {
  propertyId?: string | null;
  address: string;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
}) {
  if (propertyId) {
    const property = await prisma.property.findUnique({ where: { id: propertyId } }).catch(() => null);
    if (property) return property.id;
  }

  const normalizedAddress = address.trim();
  const normalizedCity = cleanString(city);
  const normalizedState = cleanString(state);
  const normalizedZip = cleanString(zipCode);

  // D1-compatible: use direct value comparison instead of { equals: ... } filter
  const where: any = { address: normalizedAddress };
  if (normalizedCity) where.city = normalizedCity;
  if (normalizedState) where.state = normalizedState;
  if (normalizedZip) where.zipCode = normalizedZip;

  const existing = await prisma.property.findFirst({ where }).catch(() => null);
  if (existing) return existing.id;

  // Fallback: match by address only
  const existingByAddress = await prisma.property
    .findFirst({ where: { address: normalizedAddress } })
    .catch(() => null);
  if (existingByAddress) return existingByAddress.id;

  const created = await prisma.property.create({
    data: {
      address: normalizedAddress,
      city: normalizedCity,
      state: normalizedState,
      zipCode: normalizedZip,
    },
  });

  return created.id;
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const statusParam = searchParams.get("status");
  const serviceType = searchParams.get("serviceType");
  const contractorId = searchParams.get("contractorId");
  const search = searchParams.get("search");
  const parsedPage = Number.parseInt(searchParams.get("page") || "1", 10);
  const parsedLimit = Number.parseInt(searchParams.get("limit") || "20", 10);
  const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const limit =
    Number.isFinite(parsedLimit) && parsedLimit > 0
      ? Math.min(parsedLimit, 100)
      : 20;

  const currentUser = await getSessionUser(session.user);
  if (!currentUser?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = currentUser.role;
  const userId = currentUser.id;

  console.log(`[GET WorkOrders] Email: ${session?.user?.email} | Role: ${role} | ID: ${userId}`);

  const where: any = {};

  applyWorkOrderVisibility(where, role, userId);

  // Support multiple statuses (comma-separated: "NEW,ASSIGNED,IN_PROGRESS")
  if (statusParam) {
    const statuses = statusParam.split(",").filter(Boolean);
    if (statuses.length === 1) {
      where.status = statuses[0];
    } else if (statuses.length > 1) {
      where.status = { in: statuses };
    }
  }
  if (serviceType) where.serviceType = serviceType;
  if (contractorId && role !== "CONTRACTOR") where.contractorId = contractorId;
  if (search) {
    where.OR = [
      { title: { contains: search } },
      { address: { contains: search } },
      { description: { contains: search } },
      { contractor: { name: { contains: search } } },
    ];
  }

  const [workOrders, total] = await Promise.all([
    prisma.workOrder.findMany({
      where,
      include: {
        contractor: { select: { id: true, name: true, email: true, image: true } },
        coordinator: { select: { id: true, name: true, email: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        property: { select: { id: true, address: true, city: true, state: true, zipCode: true, imageUrl: true } },
        _count: { select: { threads: true, files: true, invoices: true, history: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.workOrder.count({ where }),
  ]);

  return NextResponse.json({
    workOrders,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const currentUser = await getSessionUser(session.user);
  if (!currentUser?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = currentUser.role;
  if (!WORK_ORDER_CREATE_ROLES.has(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const {
    title,
    description,
    address,
    city,
    state,
    zipCode,
    serviceType,
    dueDate,
    priority,
    lockCode,
    lockboxLocation,
    gateCode,
    keyCode,
    keycodeLocation,
    lotSize,
    lawnSize,
    specialInstructions,
    contractorId,
    coordinatorId,
    processorId,
    propertyId,
    tasks,
  } = body;

  if (!title || !address || !serviceType) {
    return NextResponse.json(
      { error: "Title, address, and service type are required" },
      { status: 400 }
    );
  }

  const resolvedPropertyId = await findOrCreateProperty({
    propertyId,
    address,
    city,
    state,
    zipCode,
  });

  const workOrder = await prisma.workOrder.create({
    data: {
      title,
      description,
      address,
      city,
      state,
      zipCode,
      serviceType,
      dueDate: dueDate ? new Date(dueDate) : null,
      priority: priority || 0,
      lockCode,
      lockboxLocation,
      gateCode,
      keyCode,
      keycodeLocation,
      lotSize,
      lawnSize,
      specialInstructions,
      tasks,
      contractorId,
      coordinatorId,
      processorId,
      propertyId: resolvedPropertyId,
      createdById: currentUser.id,
      status: contractorId ? "ASSIGNED" : "NEW",
    },
    include: {
      contractor: { select: { id: true, name: true, email: true } },
      coordinator: { select: { id: true, name: true, email: true } },
      property: { select: { id: true, address: true, city: true, state: true, zipCode: true, imageUrl: true } },
    },
  });

  // Log activity
  await prisma.activityLog.create({
    data: {
      action: "WORK_ORDER_CREATED",
      details: `Work order "${title}" created`,
      userId: currentUser.id,
      workOrderId: workOrder.id,
    },
  });

  // Notify contractor if assigned
  if (contractorId) {
    try {
      await prisma.notification.create({
        data: {
          type: "WORK_ORDER",
          title: "New Work Order Assignment",
          message: `You have been assigned to "${title}" at ${address}`,
          userId: contractorId,
          workOrderId: workOrder.id,
        },
      });
    } catch {}
  }

  return NextResponse.json(workOrder, { status: 201 });
}
