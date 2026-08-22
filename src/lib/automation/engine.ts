import prisma from "@/lib/prisma";
import { INITIAL_AUTOMATION_RULES, DEFAULT_URGENCY_KEYWORDS } from "./seed-rules";
import { detectUrgency } from "./urgency";
import { evaluateRule } from "./evaluator";
import { dispatchAction } from "./dispatcher";
import { processPendingEscalations } from "./escalator";
import { generateDailyDigests } from "./digest";
import { AutomationAction, AutomationRuleDefinition, AutomationTrigger, EscalationTier, TriggerContext } from "./types";

/**
 * Ensures initial default automation rules and keywords exist in DB.
 */
export async function ensureDefaultRulesSeeded(companyId?: string) {
  try {
    const existingRulesCount = await prisma.automationRule.count({
      where: companyId ? { companyId } : {},
    });

    if (existingRulesCount === 0) {
      for (const rule of INITIAL_AUTOMATION_RULES) {
        await prisma.automationRule.create({
          data: {
            name: rule.name,
            description: rule.description,
            trigger: rule.trigger,
            isActive: rule.isActive,
            priority: rule.priority,
            conditions: JSON.stringify(rule.conditions || []),
            actions: JSON.stringify(rule.actions || []),
            escalationChain: JSON.stringify(rule.escalationChain || []),
            companyId: companyId || null,
          },
        });
      }
    }

    const existingKeywordsCount = await prisma.urgencyKeyword.count({
      where: companyId ? { companyId } : {},
    });

    if (existingKeywordsCount === 0) {
      for (const kw of DEFAULT_URGENCY_KEYWORDS) {
        await prisma.urgencyKeyword.upsert({
          where: { keyword: kw.keyword },
          update: {},
          create: {
            keyword: kw.keyword,
            targetPriority: kw.targetPriority,
            category: kw.category,
            isActive: true,
            companyId: companyId || null,
          },
        });
      }
    }
  } catch (err) {
    console.warn("Could not seed default automation rules:", err);
  }
}

/**
 * Central dispatcher triggered when any work order, message, contractor update, or QC event occurs.
 */
export async function triggerAutomationEvent(
  trigger: AutomationTrigger,
  context: TriggerContext,
  companyId?: string
) {
  try {
    await ensureDefaultRulesSeeded(companyId);

    // 1. Run automatic urgency detection on text/instructions/messages
    const textToScan = [
      context.workOrder?.title || "",
      context.workOrder?.description || "",
      context.workOrder?.specialInstructions || "",
      context.message?.body || context.message?.content || (typeof context.message === "string" ? context.message : ""),
      context.comment || "",
      context.rejectionReason || "",
    ].filter(Boolean).join(" ");

    const urgencyResult = await detectUrgency(textToScan, context.workOrder, companyId);
    if (urgencyResult.isUrgent) {
      context.meta = {
        ...context.meta,
        isUrgent: true,
        urgencyReason: urgencyResult.reason,
        matchedKeywords: urgencyResult.matchedKeywords,
      };

      // If work order priority is normal, auto-upgrade priority
      if (context.workOrder?.id && (context.workOrder.priority === 0 || !context.workOrder.priority)) {
        await prisma.workOrder.update({
          where: { id: context.workOrder.id },
          data: { priority: urgencyResult.targetPriority === "CRITICAL" ? 3 : 2 },
        }).catch(() => {});
      }
    }

    // 2. Fetch all active matching rules from DB
    const dbRules = await prisma.automationRule.findMany({
      where: {
        trigger,
        isActive: true,
        ...(companyId ? { companyId } : {}),
      },
    });

    // If no rules in DB, use seed rules in-memory fallback
    const candidateRules: AutomationRuleDefinition[] = dbRules.length > 0
      ? dbRules.map(r => ({
          id: r.id,
          name: r.name,
          description: r.description || undefined,
          trigger: r.trigger as AutomationTrigger,
          isActive: r.isActive,
          priority: r.priority as any,
          delayMinutes: r.delayMinutes,
          conditions: typeof r.conditions === "string" ? JSON.parse(r.conditions) : (r.conditions || []),
          actions: typeof r.actions === "string" ? JSON.parse(r.actions) : (r.actions || []),
          escalationChain: typeof r.escalationChain === "string" ? JSON.parse(r.escalationChain || "[]") : (r.escalationChain || []),
          clientSpecific: r.clientSpecific || undefined,
          serviceTypeSpecific: r.serviceTypeSpecific || undefined,
          companyId: r.companyId || undefined,
        }))
      : INITIAL_AUTOMATION_RULES.filter(r => r.trigger === trigger && r.isActive);

    for (const rule of candidateRules) {
      // Evaluate conditions
      const evalResult = evaluateRule(rule, context);
      if (!evalResult.matched) {
        continue;
      }

      // Check if there is an escalation chain or delay
      const escalationTiers: EscalationTier[] = (rule.escalationChain && rule.escalationChain.length > 0)
        ? rule.escalationChain
        : ((rule.actions?.find(a => a.escalationTiers?.length)?.escalationTiers) || []);

      let execution: any = null;

      if (escalationTiers.length > 0 && context.workOrder?.id) {
        const firstTier = escalationTiers[0];
        const nextDelayMs = (firstTier.delayMinutes || 60) * 60 * 1000;
        const nextRun = new Date(Date.now() + nextDelayMs);

        execution = await prisma.automationExecution.create({
          data: {
            ruleId: rule.id || "system-rule",
            workOrderId: context.workOrder.id,
            status: "RUNNING",
            currentStep: 0,
            nextRunAt: nextRun,
            contextData: JSON.stringify(context.meta || {}),
            companyId: companyId || context.workOrder?.companyId,
          },
        }).catch(() => null);
      }

      // Execute immediate actions
      for (const action of rule.actions) {
        if (action.type === "START_ESCALATION") {
          // If the action only starts an escalation timer, skip immediate duplicate dispatch
          continue;
        }

        await dispatchAction(
          action,
          context,
          execution?.id,
          rule.id,
          rule.name,
          companyId || context.workOrder?.companyId
        );
      }
    }
  } catch (err) {
    console.error(`Error in triggerAutomationEvent (${trigger}):`, err);
  }
}

/**
 * Periodic evaluator for deadline reminders, overdue escalations, unsubmitted field complete orders, and cron tasks.
 */
export async function evaluatePeriodicRules() {
  const now = new Date();

  // 1. Process all pending escalations
  const escalationResult = await processPendingEscalations();

  // 2. Check for Approaching Due Dates & Overdue Orders
  const unresolvedOrders = await prisma.workOrder.findMany({
    where: {
      status: { notIn: ["CLOSED", "CANCELLED", "COMPLETED"] },
      dueDate: { not: null },
    },
    include: {
      contractor: true,
      processor: true,
      coordinator: true,
    },
    take: 100,
  });

  for (const wo of unresolvedOrders) {
    if (!wo.dueDate) continue;

    const due = new Date(wo.dueDate).getTime();
    const diffHours = (due - now.getTime()) / (1000 * 60 * 60);

    // Overdue
    if (diffHours < 0 && Math.abs(diffHours) <= 48) {
      await triggerAutomationEvent("WO_OVERDUE", {
        workOrder: wo,
        hoursElapsed: Math.abs(diffHours),
        meta: { overdueHours: Math.abs(Math.round(diffHours)) },
      }, wo.companyId || undefined);
    }
    // Due Soon (< 24 hours)
    else if (diffHours > 0 && diffHours <= 24) {
      await triggerAutomationEvent("WO_DUE_SOON", {
        workOrder: wo,
        hoursElapsed: 24 - diffHours,
        meta: { hoursRemaining: Math.round(diffHours) },
      }, wo.companyId || undefined);
    }
  }

  return {
    success: true,
    escalationResult,
    checkedOrdersCount: unresolvedOrders.length,
  };
}
