import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { ensureDefaultRulesSeeded } from "@/lib/automation/engine";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const companyId = (session.user as any).companyId || undefined;
    await ensureDefaultRulesSeeded(companyId);

    const rules = await prisma.automationRule.findMany({
      where: companyId ? { companyId } : {},
      orderBy: { createdAt: "desc" },
    });

    const parsedRules = rules.map((r) => ({
      ...r,
      conditions: typeof r.conditions === "string" ? JSON.parse(r.conditions) : r.conditions,
      actions: typeof r.actions === "string" ? JSON.parse(r.actions) : r.actions,
      escalationChain: typeof r.escalationChain === "string" ? JSON.parse(r.escalationChain || "[]") : r.escalationChain,
    }));

    return NextResponse.json({ rules: parsedRules });
  } catch (error: any) {
    console.error("GET /api/automation/rules error:", error);
    return NextResponse.json({ error: "Failed to fetch rules", details: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = (session.user as any).role;
    if (!["ADMIN", "SUPER_ADMIN", "MANAGER"].includes(role)) {
      return NextResponse.json({ error: "Forbidden: Admin privileges required" }, { status: 403 });
    }

    const body = await req.json();
    const {
      name,
      description,
      trigger,
      isActive,
      priority,
      conditions,
      actions,
      escalationChain,
      clientSpecific,
      serviceTypeSpecific,
    } = body;

    if (!name || !trigger) {
      return NextResponse.json({ error: "Name and Trigger are required" }, { status: 400 });
    }

    const rule = await prisma.automationRule.create({
      data: {
        name,
        description: description || null,
        trigger,
        isActive: isActive !== undefined ? isActive : true,
        priority: priority || "NORMAL",
        conditions: JSON.stringify(conditions || []),
        actions: JSON.stringify(actions || []),
        escalationChain: JSON.stringify(escalationChain || []),
        clientSpecific: clientSpecific || null,
        serviceTypeSpecific: serviceTypeSpecific || null,
        createdById: (session.user as any).id,
        companyId: (session.user as any).companyId || null,
      },
    });

    return NextResponse.json({
      rule: {
        ...rule,
        conditions: JSON.parse(rule.conditions),
        actions: JSON.parse(rule.actions),
        escalationChain: JSON.parse(rule.escalationChain || "[]"),
      },
    });
  } catch (error: any) {
    console.error("POST /api/automation/rules error:", error);
    return NextResponse.json({ error: "Failed to create rule", details: error.message }, { status: 500 });
  }
}
