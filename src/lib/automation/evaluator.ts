import { AutomationCondition, AutomationRuleDefinition, TriggerContext } from "./types";

export function evaluateRule(
  rule: AutomationRuleDefinition,
  context: TriggerContext
): { matched: boolean; failedCondition?: AutomationCondition; reasons: string[] } {
  const { workOrder } = context;
  const reasons: string[] = [];

  // Check clientSpecific filter
  if (rule.clientSpecific && workOrder) {
    const woClient = (workOrder.client || workOrder.clientName || workOrder.metadata?.clientName || "").toLowerCase();
    if (woClient && !woClient.includes(rule.clientSpecific.toLowerCase())) {
      return { matched: false, reasons: [`Client mismatch: expected ${rule.clientSpecific}, got ${woClient}`] };
    }
  }

  // Check serviceTypeSpecific filter
  if (rule.serviceTypeSpecific && workOrder) {
    const woService = (workOrder.serviceType || "").toLowerCase();
    if (woService !== rule.serviceTypeSpecific.toLowerCase()) {
      return { matched: false, reasons: [`Service type mismatch: expected ${rule.serviceTypeSpecific}, got ${woService}`] };
    }
  }

  // If no conditions, matches by default
  if (!rule.conditions || rule.conditions.length === 0) {
    return { matched: true, reasons: ["No conditions specified (match all)"] };
  }

  for (const cond of rule.conditions) {
    const passed = evaluateSingleCondition(cond, context);
    if (!passed) {
      return {
        matched: false,
        failedCondition: cond,
        reasons: [`Failed condition: ${cond.field} ${cond.operator} ${JSON.stringify(cond.value)}`],
      };
    }
    reasons.push(`Passed: ${cond.field} ${cond.operator} ${JSON.stringify(cond.value)}`);
  }

  return { matched: true, reasons };
}

function evaluateSingleCondition(cond: AutomationCondition, context: TriggerContext): boolean {
  const { workOrder, message, comment, fileCount, rejectionReason, keywordMatched } = context;

  let actualValue: any = null;

  switch (cond.field) {
    case "status":
      actualValue = workOrder?.status;
      break;
    case "priority":
      actualValue = workOrder?.priority;
      break;
    case "client":
      actualValue = workOrder?.client || workOrder?.clientName || workOrder?.metadata?.clientName;
      break;
    case "serviceType":
      actualValue = workOrder?.serviceType;
      break;
    case "hasPhotos":
      actualValue = (fileCount != null ? fileCount : (workOrder?.files?.length || 0)) > 0;
      break;
    case "hasContractor":
      actualValue = Boolean(workOrder?.contractorId || workOrder?.contractor);
      break;
    case "isUnresolved":
      actualValue = !["CLOSED", "COMPLETED", "CANCELLED"].includes(workOrder?.status || "");
      break;
    case "unsubmittedHours":
      if (workOrder?.status === "FIELD_COMPLETE" && workOrder?.completedAt) {
        const completed = new Date(workOrder.completedAt).getTime();
        actualValue = (Date.now() - completed) / (1000 * 60 * 60);
      } else {
        actualValue = 0;
      }
      break;
    case "overdueHours":
      if (workOrder?.dueDate) {
        const due = new Date(workOrder.dueDate).getTime();
        const diff = (Date.now() - due) / (1000 * 60 * 60);
        actualValue = diff > 0 ? diff : 0;
      } else {
        actualValue = 0;
      }
      break;
    case "hoursBeforeDue":
      if (workOrder?.dueDate) {
        const due = new Date(workOrder.dueDate).getTime();
        actualValue = (due - Date.now()) / (1000 * 60 * 60);
      } else {
        actualValue = 999;
      }
      break;
    case "keywordMatch":
      actualValue = keywordMatched || "";
      break;
    default:
      actualValue = workOrder?.[cond.field];
      break;
  }

  // Operator evaluation
  switch (cond.operator) {
    case "equals":
      return String(actualValue ?? "").toLowerCase() === String(cond.value ?? "").toLowerCase();
    case "not_equals":
      return String(actualValue ?? "").toLowerCase() !== String(cond.value ?? "").toLowerCase();
    case "contains":
      return String(actualValue ?? "").toLowerCase().includes(String(cond.value ?? "").toLowerCase());
    case "in":
      if (Array.isArray(cond.value)) {
        return cond.value.map(v => String(v).toLowerCase()).includes(String(actualValue ?? "").toLowerCase());
      }
      return false;
    case "greater_than":
      return Number(actualValue || 0) > Number(cond.value || 0);
    case "less_than":
      return Number(actualValue || 0) < Number(cond.value || 0);
    case "is_true":
      return Boolean(actualValue) === true;
    case "is_false":
      return Boolean(actualValue) === false;
    case "matches_keyword":
      return Boolean(keywordMatched);
    default:
      return false;
  }
}
