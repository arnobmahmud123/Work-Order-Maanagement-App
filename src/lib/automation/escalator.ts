import prisma from "@/lib/prisma";
import { dispatchAction } from "./dispatcher";
import { EscalationTier, TriggerContext } from "./types";

/**
 * Checks whether an active execution's target issue has been resolved.
 */
export function isExecutionResolved(trigger: string, workOrder: any): boolean {
  if (!workOrder) return true;

  const status = workOrder.status;

  switch (trigger) {
    case "WO_FIELD_COMPLETE":
      // Resolved if status is no longer FIELD_COMPLETE (e.g. submitted to client or closed)
      return status !== "FIELD_COMPLETE";
    case "WO_REJECTED":
    case "WO_RETURNED":
      // Resolved if status is no longer REJECTED / RETURNED
      return !["REJECTED", "RETURNED", "CORRECTION_REQUIRED"].includes(status);
    case "WO_OVERDUE":
    case "WO_DUE_SOON":
      // Resolved if work order is completed or closed
      return ["FIELD_COMPLETE", "READY_FOR_CLIENT", "CLOSED", "CANCELLED", "INVOICED"].includes(status);
    case "WO_URGENT_FLAGGED":
      // Resolved if acknowledged or completed
      return ["CLOSED", "CANCELLED"].includes(status);
    default:
      return false;
  }
}

/**
 * Evaluates all pending/running automation executions and processes due escalations.
 */
export async function processPendingEscalations(): Promise<{
  processed: number;
  escalated: number;
  resolved: number;
}> {
  const now = new Date();

  // Find all executions that are due for next step
  const activeExecutions = await prisma.automationExecution.findMany({
    where: {
      status: { in: ["PENDING", "RUNNING"] },
      nextRunAt: { lte: now },
    },
    include: {
      rule: true,
      workOrder: {
        include: {
          contractor: true,
          processor: true,
          coordinator: true,
        },
      },
    },
    take: 50,
  });

  let processed = 0;
  let escalated = 0;
  let resolved = 0;

  for (const execution of activeExecutions) {
    processed++;
    const rule = execution.rule;
    const workOrder = execution.workOrder;

    // Check if issue is already resolved
    if (isExecutionResolved(rule.trigger, workOrder)) {
      await prisma.automationExecution.update({
        where: { id: execution.id },
        data: {
          status: "COMPLETED",
          resolvedAt: now,
          nextRunAt: null,
        },
      });

      await prisma.automationAuditLog.create({
        data: {
          executionId: execution.id,
          ruleId: rule.id,
          ruleName: rule.name,
          workOrderId: workOrder?.id || null,
          triggerEvent: rule.trigger,
          actionType: "AUTO_RESOLVE",
          recipients: "[]",
          details: `Issue resolved automatically. Work order status is now ${workOrder?.status}. Escalation cancelled.`,
          status: "ACKNOWLEDGED",
          companyId: execution.companyId,
        },
      }).catch(() => {});

      resolved++;
      continue;
    }

    // Parse escalation chain
    let tiers: EscalationTier[] = [];
    try {
      if (rule.escalationChain) {
        tiers = JSON.parse(rule.escalationChain);
      }
    } catch {}

    // Fallback to action-level escalation tiers
    if (tiers.length === 0) {
      try {
        const actions = JSON.parse(rule.actions || "[]");
        for (const act of actions) {
          if (act.escalationTiers?.length > 0) {
            tiers = act.escalationTiers;
            break;
          }
        }
      } catch {}
    }

    const currentStep = execution.currentStep || 0;
    const currentTier = tiers[currentStep];

    if (!currentTier) {
      // No more tiers, mark completed
      await prisma.automationExecution.update({
        where: { id: execution.id },
        data: { status: "COMPLETED", nextRunAt: null },
      });
      continue;
    }

    // Execute current tier action
    let contextData: any = {};
    try {
      if (execution.contextData) contextData = JSON.parse(execution.contextData);
    } catch {}

    const context: TriggerContext = {
      workOrder,
      meta: {
        ...contextData,
        triggerEvent: rule.trigger,
        escalationLevel: currentTier.level,
      },
    };

    await dispatchAction(
      currentTier,
      context,
      execution.id,
      rule.id,
      `${rule.name} (Escalation Level ${currentTier.level})`,
      execution.companyId || undefined
    );

    escalated++;

    // Calculate next step
    const nextStep = currentStep + 1;
    const nextTier = tiers[nextStep];

    if (nextTier) {
      const nextDelayMs = (nextTier.delayMinutes || 60) * 60 * 1000;
      const nextRun = new Date(now.getTime() + nextDelayMs);

      await prisma.automationExecution.update({
        where: { id: execution.id },
        data: {
          currentStep: nextStep,
          status: "RUNNING",
          nextRunAt: nextRun,
        },
      });
    } else {
      // Reached final tier
      await prisma.automationExecution.update({
        where: { id: execution.id },
        data: {
          currentStep: nextStep,
          status: "ESCALATED",
          nextRunAt: null,
        },
      });
    }
  }

  return { processed, escalated, resolved };
}
