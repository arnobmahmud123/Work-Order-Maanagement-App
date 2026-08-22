import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { evaluateRule } from "@/lib/automation/evaluator";
import { AutomationRuleDefinition, TriggerContext } from "@/lib/automation/types";

export async function POST(req: NextRequest, context: any) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = context?.params ? await context.params : null;
    const id = resolvedParams?.id || new URL(req.url).pathname.split("/").slice(-2)[0];

    const body = await req.json();
    const { workOrderId, mockContext } = body;

    // Fetch rule
    const ruleRecord = await prisma.automationRule.findUnique({ where: { id } });
    if (!ruleRecord) {
      return NextResponse.json({ error: "Rule not found" }, { status: 404 });
    }

    const rule: AutomationRuleDefinition = {
      name: ruleRecord.name,
      trigger: ruleRecord.trigger as any,
      isActive: ruleRecord.isActive,
      priority: ruleRecord.priority as any,
      conditions: typeof ruleRecord.conditions === "string" ? JSON.parse(ruleRecord.conditions) : ruleRecord.conditions,
      actions: typeof ruleRecord.actions === "string" ? JSON.parse(ruleRecord.actions) : ruleRecord.actions,
      escalationChain: typeof ruleRecord.escalationChain === "string" ? JSON.parse(ruleRecord.escalationChain || "[]") : ruleRecord.escalationChain,
      clientSpecific: ruleRecord.clientSpecific || undefined,
      serviceTypeSpecific: ruleRecord.serviceTypeSpecific || undefined,
    };

    // Fetch sample or specified work order
    let workOrder: any = null;
    if (workOrderId) {
      workOrder = await prisma.workOrder.findUnique({
        where: { id: workOrderId },
        include: {
          contractor: true,
          processor: true,
          coordinator: true,
          files: true,
        },
      });
    } else {
      workOrder = await prisma.workOrder.findFirst({
        include: {
          contractor: true,
          processor: true,
          coordinator: true,
          files: true,
        },
        orderBy: { createdAt: "desc" },
      });
    }

    const testContext: TriggerContext = {
      workOrder: workOrder || {
        id: "mock-wo-1",
        title: "Mock Work Order for Testing",
        address: "123 Test Street, Springfield, IL",
        status: "NEW",
        priority: 1,
        serviceType: "GRASS_CUT",
        dueDate: new Date(Date.now() + 24 * 3600 * 1000),
      },
      ...mockContext,
    };

    const evalResult = evaluateRule(rule, testContext);

    return NextResponse.json({
      rule: rule.name,
      workOrderTested: testContext.workOrder?.id,
      matched: evalResult.matched,
      failedCondition: evalResult.failedCondition,
      reasons: evalResult.reasons,
      actionsToExecuteCount: rule.actions.length,
      escalationTiersCount: rule.escalationChain?.length || 0,
    });
  } catch (error: any) {
    return NextResponse.json({ error: "Rule test evaluation failed", details: error.message }, { status: 500 });
  }
}
