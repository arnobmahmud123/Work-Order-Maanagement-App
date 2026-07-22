import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = (session.user as any).role;
  if (role !== "ADMIN") {
    return NextResponse.json({ error: "Only admins can bulk delete" }, { status: 403 });
  }

  const companyId = (session.user as any).companyId;
  const userRole = (session.user as any).role;

  if (userRole !== "SUPER_ADMIN" && !companyId) {
    return NextResponse.json({ error: "Forbidden: User has no assigned company tenant context" }, { status: 403 });
  }

  const body = await req.json();
  const { workOrderIds } = body;

  if (!Array.isArray(workOrderIds) || workOrderIds.length === 0) {
    return NextResponse.json({ error: "workOrderIds are required" }, { status: 400 });
  }

  const whereClause: any = { id: { in: workOrderIds } };
  if (userRole !== "SUPER_ADMIN") {
    whereClause.companyId = companyId;
  }

  // Find actual work orders that belong to this company
  const allowedWorkOrders = await prisma.workOrder.findMany({
    where: whereClause,
    select: { id: true },
  });
  const allowedIds = allowedWorkOrders.map((wo) => wo.id);

  if (allowedIds.length === 0) {
    return NextResponse.json({ deleted: 0 });
  }

  // Delete related records first
  await prisma.activityLog.deleteMany({ where: { workOrderId: { in: allowedIds } } });
  await prisma.notification.deleteMany({ where: { workOrderId: { in: allowedIds } } });

  const result = await prisma.workOrder.deleteMany({
    where: { id: { in: allowedIds } },
  });

  return NextResponse.json({ deleted: result.count });
}
