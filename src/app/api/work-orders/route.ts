import { triggerAutomationEvent } from "@/lib/automation/engine";
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
  "SUPER_ADMIN",
  "ADMIN",
  "COORDINATOR",
  "INCHARGE_COORDINATOR",
  "PROCESSOR",
  "PROCESSOR_INCHARGE",
  "CLIENT",
  "CLIENT_MANAGER",
  "INCHARGE_CLIENT_MANAGER",
  "CONTRACTOR",
  "STAFF",
  "MANAGER",
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
          select: { id: true, email: true, role: true, isActive: true, companyId: true },
        })
      : null;

  const isActive = (dbUser as any)?.isActive;
  if (isActive === false || isActive === 0) return null;

  return {
    id: dbUser?.id || sessionId,
    email: dbUser?.email || sessionEmail,
    role: normalizeRole(dbUser?.role) || sessionRole || "CLIENT",
    companyId: dbUser?.companyId || sessionUser?.companyId || null,
  };
}

function applyWorkOrderVisibility(where: any, role: string, userId: string) {
  if (STAFF_WORK_ORDER_ROLES.has(role)) return;
  if (role === "CONTRACTOR") {
    where.contractorId = userId;
    // Contractors only have access to work orders while actively working on them;
    // once submitted (FIELD_COMPLETE, READY_FOR_CLIENT, COMPLETED, CLOSED), they no longer have access.
    where.status = { notIn: ["FIELD_COMPLETE", "READY_FOR_CLIENT", "SENT_TO_CLIENT", "COMPLETED", "CLOSED"] };
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
  companyId,
}: {
  propertyId?: string | null;
  address: string;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  companyId?: string | null;
}) {
  if (propertyId) {
    const property = await prisma.property.findUnique({ where: { id: propertyId } }).catch(() => null);
    if (property) return property.id;
  }

  const normalizedAddress = address.trim();
  const normalizedCity = cleanString(city);
  const normalizedState = cleanString(state);
  const normalizedZip = cleanString(zipCode);

  const where: any = { address: normalizedAddress };
  if (normalizedCity) where.city = normalizedCity;
  if (normalizedState) where.state = normalizedState;
  if (normalizedZip) where.zipCode = normalizedZip;
  if (companyId) where.companyId = companyId;

  const existing = await prisma.property.findFirst({ where }).catch(() => null);
  if (existing) return existing.id;

  // Fallback: match by address and company only
  const existingByAddress = await prisma.property
    .findFirst({ where: { address: normalizedAddress, companyId: companyId || undefined } })
    .catch(() => null);
  if (existingByAddress) return existingByAddress.id;

  const created = await prisma.property.create({
    data: {
      address: normalizedAddress,
      city: normalizedCity,
      state: normalizedState,
      zipCode: normalizedZip,
      companyId: companyId || null,
    },
  });

  return created.id;
}

export async function GET(req: NextRequest) {
  try {
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
    const companyId = (session.user as any).companyId;

    const where: any = {};

    applyWorkOrderVisibility(where, role, userId);

    // Enforce company scoping
    if (role !== "SUPER_ADMIN") {
      if (companyId) {
        where.companyId = companyId;
      }
    } else {
      const filterCompanyId = searchParams.get("companyId");
      if (filterCompanyId) {
        where.companyId = filterCompanyId;
      }
    }

    // Support multiple statuses
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
  } catch (error: any) {
    console.error("[GET WorkOrders Error]:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch work orders" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
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
      return NextResponse.json({ error: "Forbidden: Your role does not permit creating work orders" }, { status: 403 });
    }

    // Determine target company context
    let companyId = currentUser.companyId || (session.user as any).companyId || null;
    if (!companyId && role !== "SUPER_ADMIN") {
      const defaultCompany = await prisma.company.findFirst({ select: { id: true } });
      if (defaultCompany) {
        companyId = defaultCompany.id;
        await prisma.user.update({
          where: { id: currentUser.id },
          data: { companyId: defaultCompany.id },
        }).catch(() => {});
      }
    }

    // Parse request body supporting both multipart/form-data and JSON
    let body: any = {};
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      body = {};
      for (const [key, value] of formData.entries()) {
        if (typeof value === "string") {
          body[key] = value;
        }
      }
    } else {
      body = await req.json().catch(() => ({}));
    }

    const title = cleanString(body.title);
    const description = cleanString(body.description);
    const address = cleanString(body.address);
    const city = cleanString(body.city);
    const state = cleanString(body.state);
    const zipCode = cleanString(body.zipCode);
    let serviceType = cleanString(body.serviceType) || "OTHER";
    if (serviceType === "OTHER" && cleanString(body.customServiceType)) {
      serviceType = cleanString(body.customServiceType)!;
    }

    if (!title || !address || !serviceType) {
      return NextResponse.json(
        { error: "Title, address, and service type are required" },
        { status: 400 }
      );
    }

    // Parse priority to integer safely
    const priority = body.priority !== undefined && body.priority !== null && body.priority !== ""
      ? parseInt(String(body.priority), 10) || 0
      : 0;

    // Parse dueDate safely
    let dueDate: Date | null = null;
    if (body.dueDate) {
      const parsedDate = new Date(body.dueDate);
      if (!isNaN(parsedDate.getTime())) {
        dueDate = parsedDate;
      }
    }

    // Parse tasks to string safely
    let tasksString: string | null = null;
    if (body.tasks) {
      if (typeof body.tasks === "string") {
        tasksString = body.tasks;
      } else {
        tasksString = JSON.stringify(body.tasks);
      }
    }

    // Verify Subscription Work Order limits
    if (role !== "SUPER_ADMIN" && companyId) {
      const activeCompany = await prisma.company.findUnique({
        where: { id: companyId },
      });
      if (activeCompany && activeCompany.maxWorkOrders > 0) {
        const activeWOCount = await prisma.workOrder.count({
          where: { companyId },
        });
        if (activeWOCount >= activeCompany.maxWorkOrders) {
          return NextResponse.json(
            { error: `Work order limit reached (${activeCompany.maxWorkOrders}). Please upgrade your subscription plan.` },
            { status: 403 }
          );
        }
      }
    }

    const targetCompanyId = role === "SUPER_ADMIN" ? (body.companyId || companyId) : companyId;

    const resolvedPropertyId = await findOrCreateProperty({
      propertyId: body.propertyId || null,
      address,
      city,
      state,
      zipCode,
      companyId: targetCompanyId,
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
        dueDate,
        priority,
        lockCode: cleanString(body.lockCode),
        lockboxLocation: cleanString(body.lockboxLocation),
        gateCode: cleanString(body.gateCode),
        keyCode: cleanString(body.keyCode),
        keycodeLocation: cleanString(body.keycodeLocation),
        lotSize: cleanString(body.lotSize),
        lawnSize: cleanString(body.lawnSize),
        specialInstructions: cleanString(body.specialInstructions),
        tasks: tasksString,
        contractorId: cleanString(body.contractorId),
        coordinatorId: cleanString(body.coordinatorId),
        processorId: cleanString(body.processorId),
        propertyId: resolvedPropertyId,
        createdById: currentUser.id,
        companyId: targetCompanyId,
        status: body.contractorId ? "ASSIGNED" : "NEW",
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
        companyId: targetCompanyId,
      },
    }).catch(() => {});

    // Trigger Automation Events (Fire-and-forget background execution)
    triggerAutomationEvent("WO_CREATED", {
      workOrder,
      user: currentUser,
    }, targetCompanyId).catch(() => {});

    if (body.contractorId || body.processorId) {
      triggerAutomationEvent("WO_ASSIGNED", {
        workOrder,
        user: currentUser,
      }, targetCompanyId).catch(() => {});
    }

    return NextResponse.json(workOrder, { status: 201 });
  } catch (error: any) {
    console.error("[POST WorkOrder Error]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create work order" },
      { status: 500 }
    );
  }
}
