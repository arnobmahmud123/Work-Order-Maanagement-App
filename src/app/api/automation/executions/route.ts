import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const companyId = (session.user as any).companyId || undefined;
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const status = searchParams.get("status") || undefined;

    // Fetch active executions
    const executions = await prisma.automationExecution.findMany({
      where: {
        ...(companyId ? { companyId } : {}),
        ...(status ? { status } : {}),
      },
      include: {
        rule: { select: { id: true, name: true, trigger: true, priority: true } },
        workOrder: { select: { id: true, title: true, address: true, status: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    // Fetch recent audit logs
    const auditLogs = await prisma.automationAuditLog.findMany({
      where: companyId ? { companyId } : {},
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return NextResponse.json({
      executions,
      auditLogs,
      activeCount: executions.filter(e => e.status === "RUNNING" || e.status === "PENDING").length,
    });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to fetch executions", details: error.message }, { status: 500 });
  }
}
