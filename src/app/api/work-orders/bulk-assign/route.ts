import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { notifyContractorAssigned } from "@/lib/contractor-assignment";

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
  const { workOrderIds, contractorId } = body;

  if (!Array.isArray(workOrderIds) || workOrderIds.length === 0 || !contractorId) {
    return NextResponse.json({ error: "workOrderIds and contractorId are required" }, { status: 400 });
  }

  const contractor = await prisma.user.findUnique({ where: { id: contractorId } });
  if (!contractor) {
    return NextResponse.json({ error: "Contractor not found" }, { status: 404 });
  }

  const result = await prisma.workOrder.updateMany({
    where: { id: { in: workOrderIds } },
    data: { contractorId, status: "ASSIGNED" },
  });

  // Log activity for each
  await prisma.activityLog.createMany({
    data: workOrderIds.map((id: string) => ({
      action: "BULK_ASSIGN",
      details: `Assigned to ${contractor.name}`,
      userId: (session.user as any).id,
      workOrderId: id,
    })),
  });

  // Notify contractor via Email & high-priority in-app notification
  try {
    const assignedWOs = await prisma.workOrder.findMany({
      where: { id: { in: workOrderIds } },
    });
    for (const wo of assignedWOs) {
      notifyContractorAssigned({
        workOrder: wo,
        assignedById: (session.user as any).id,
        contractorId,
      }).catch(() => {});
    }
  } catch {}

  return NextResponse.json({ updated: result.count });
}
