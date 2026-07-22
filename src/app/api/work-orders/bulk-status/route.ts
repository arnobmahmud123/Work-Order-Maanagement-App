import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = (session.user as any).role;
  if (!["ADMIN", "COORDINATOR", "PROCESSOR"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const companyId = (session.user as any).companyId;
  const userRole = (session.user as any).role;

  if (userRole !== "SUPER_ADMIN" && !companyId) {
    return NextResponse.json({ error: "Forbidden: User has no assigned company tenant context" }, { status: 403 });
  }

  const body = await req.json();
  const { workOrderIds, status } = body;

  if (!Array.isArray(workOrderIds) || workOrderIds.length === 0 || !status) {
    return NextResponse.json({ error: "workOrderIds and status are required" }, { status: 400 });
  }

  const whereClause: any = { id: { in: workOrderIds } };
  if (userRole !== "SUPER_ADMIN") {
    whereClause.companyId = companyId;
  }

  const result = await prisma.workOrder.updateMany({
    where: whereClause,
    data: { status },
  });

  const targetCompanyId = userRole === "SUPER_ADMIN" ? (body.companyId || null) : companyId;

  await prisma.activityLog.createMany({
    data: workOrderIds.map((id: string) => ({
      action: "BULK_STATUS_UPDATE",
      details: `Status changed to ${status}`,
      userId: (session.user as any).id,
      workOrderId: id,
      companyId: targetCompanyId,
    })),
  });

  return NextResponse.json({ updated: result.count });
}
