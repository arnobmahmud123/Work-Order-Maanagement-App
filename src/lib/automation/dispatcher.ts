import prisma from "@/lib/prisma";
import { AutomationAction, EscalationTier, NotificationPriority, TriggerContext } from "./types";

function renderTemplate(template: string = "", context: TriggerContext, targetUser?: any): string {
  const { workOrder, message, comment, fileCount, rejectionReason, meta } = context;

  const woNum = workOrder?.id
    ? (workOrder.workOrderNumber || "WO-" + workOrder.id.replace(/[^a-zA-Z0-9]/g, "").slice(-6).toUpperCase())
    : "—";

  const fullAddress = [
    workOrder?.address || "",
    workOrder?.city || "",
    workOrder?.state || "",
    workOrder?.zipCode || "",
  ].filter(Boolean).join(", ") || "No address provided";

  const clientName = workOrder?.client || workOrder?.clientName || workOrder?.metadata?.clientName || "Client";
  const assignedName = targetUser?.name || workOrder?.processor?.name || workOrder?.contractor?.name || "Team Member";
  const contractorName = workOrder?.contractor?.name || workOrder?.metadata?.contractorName || "Unassigned";
  const statusStr = workOrder?.status || "NEW";
  const priorityStr = workOrder?.priority >= 2 ? "URGENT" : (workOrder?.priority === 1 ? "HIGH" : "NORMAL");
  const dueDateStr = workOrder?.dueDate ? new Date(workOrder.dueDate).toLocaleDateString() : "No deadline";
  const serviceTypeStr = workOrder?.serviceType ? workOrder.serviceType.replace(/_/g, " ") : "Property Preservation";
  const woLink = workOrder?.id ? `/dashboard/work-orders/${workOrder.id}` : "/dashboard/work-orders";
  const todayStr = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  let timeRemaining = "soon";
  if (workOrder?.dueDate) {
    const diff = (new Date(workOrder.dueDate).getTime() - Date.now()) / (1000 * 60 * 60);
    if (diff < 0) timeRemaining = `${Math.abs(Math.round(diff))}h overdue`;
    else if (diff < 1) timeRemaining = `${Math.round(diff * 60)} minutes`;
    else timeRemaining = `${Math.round(diff)} hours`;
  }

  const msgContent = message?.body || message?.content || (typeof message === "string" ? message : "");
  const msgSnippet = msgContent.length > 80 ? msgContent.slice(0, 80) + "..." : msgContent;

  const replacements: Record<string, string> = {
    "{{work_order_number}}": woNum,
    "{{property_address}}": fullAddress,
    "{{client_name}}": clientName,
    "{{assigned_user}}": assignedName,
    "{{contractor_name}}": contractorName,
    "{{status}}": statusStr,
    "{{priority}}": priorityStr,
    "{{due_date}}": dueDateStr,
    "{{time_remaining}}": timeRemaining,
    "{{service_type}}": serviceTypeStr,
    "{{urgency_reason}}": meta?.urgencyReason || "High Priority Event",
    "{{rejection_reason}}": rejectionReason || workOrder?.metadata?.rejectionReason || "Revisions required by client.",
    "{{message_content}}": msgContent || "No message content",
    "{{message_snippet}}": msgSnippet || "No message content",
    "{{file_count}}": String(fileCount || workOrder?.files?.length || 0),
    "{{qc_comment}}": comment || "Quality inspection revisions required.",
    "{{work_order_link}}": woLink,
    "{{today_date}}": todayStr,
    "{{digest_summary_table}}": meta?.digestSummary || "Summary details enclosed.",
  };

  let rendered = template;
  for (const [key, val] of Object.entries(replacements)) {
    rendered = rendered.split(key).join(val);
  }
  return rendered;
}

/**
 * Resolves target users from database based on recipient keys.
 */
export async function resolveRecipients(
  targetRoles: string[] = [],
  customEmails: string[] = [],
  context: TriggerContext,
  companyId?: string
): Promise<{ user: any; email: string }[]> {
  const { workOrder } = context;
  const list: { user: any; email: string }[] = [];
  const addedIds = new Set<string>();

  const addUser = (u: any) => {
    if (!u) return;
    if (addedIds.has(u.id)) return;
    addedIds.add(u.id);
    const email = u.email || `${(u.name || "user").toLowerCase().replace(/\s+/g, ".")}@proppreserve.com`;
    list.push({ user: u, email });
  };

  // 1. Fetch work order populated relations if needed
  let fullWO = workOrder;
  if (workOrder?.id && (!workOrder.contractor || !workOrder.processor)) {
    fullWO = await prisma.workOrder.findUnique({
      where: { id: workOrder.id },
      include: {
        contractor: true,
        processor: true,
        coordinator: true,
        createdBy: true,
      },
    }).catch(() => workOrder);
  }

  for (const role of targetRoles) {
    if (role === "CONTRACTOR" && fullWO?.contractor) {
      addUser(fullWO.contractor);
    } else if (role === "PROCESSOR" && fullWO?.processor) {
      addUser(fullWO.processor);
    } else if (role === "COORDINATOR" && fullWO?.coordinator) {
      addUser(fullWO.coordinator);
    } else if (role === "CREATOR" && fullWO?.createdBy) {
      addUser(fullWO.createdBy);
    } else if (role === "ASSIGNED_USER") {
      if (fullWO?.processor) addUser(fullWO.processor);
      else if (fullWO?.contractor) addUser(fullWO.contractor);
      else if (fullWO?.coordinator) addUser(fullWO.coordinator);
    } else if (role === "TEAM_LEAD" || role === "MANAGER" || role === "ADMIN" || role === "ALL_ADMINS") {
      const targetDbRoles = role === "TEAM_LEAD"
        ? ["TEAM_LEAD", "ADMIN", "SUPER_ADMIN"]
        : role === "MANAGER"
        ? ["MANAGER", "ADMIN", "SUPER_ADMIN"]
        : ["ADMIN", "SUPER_ADMIN"];

      try {
        const managers = await prisma.user.findMany({
          where: {
            role: { in: targetDbRoles },
            ...(companyId ? { companyId } : {}),
            isActive: true,
          },
        });
        managers.forEach(addUser);
      } catch (e) {
        console.error("Failed to query managers:", e);
      }
    }
  }

  // Custom email recipients
  for (const email of customEmails) {
    list.push({
      user: { id: `ext-${email}`, name: email.split("@")[0], email, role: "EXTERNAL" },
      email,
    });
  }

  // Fallback: If no recipients found, resolve to any active admin
  if (list.length === 0) {
    try {
      const defaultAdmin = await prisma.user.findFirst({
        where: { role: { in: ["ADMIN", "SUPER_ADMIN"] } },
      });
      if (defaultAdmin) addUser(defaultAdmin);
    } catch {}
  }

  return list;
}

/**
 * Dispatches an automated internal email into the global/in-memory internal email store.
 */
export async function sendInternalEmail(
  toEmail: string,
  toName: string,
  subject: string,
  body: string,
  workOrderId?: string,
  priority: NotificationPriority = "NORMAL"
) {
  const g = globalThis as any;
  if (!g.__emailStore) g.__emailStore = new Map();

  const emailId = `auto-email-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const emailItem = {
    id: emailId,
    from: { name: "Automated Workflow Engine", email: "automation@proppreserve.com" },
    to: [{ name: toName, email: toEmail }],
    cc: [],
    bcc: [],
    subject,
    body,
    date: new Date().toISOString(),
    read: false,
    starred: priority === "URGENT" || priority === "CRITICAL",
    labels: priority === "URGENT" || priority === "CRITICAL" ? ["urgent", "work-order"] : ["work-order"],
    priority: priority.toLowerCase(),
    workOrderId: workOrderId || null,
    attachments: [],
    direction: "inbound",
  };

  // Find user by email to store in their inbox
  try {
    const recipientUser = await prisma.user.findFirst({ where: { email: toEmail } });
    const targetKey = recipientUser?.id || toEmail;

    const userEmails = g.__emailStore.get(targetKey) || [];
    userEmails.unshift(emailItem);
    g.__emailStore.set(targetKey, userEmails);
  } catch {
    const userEmails = g.__emailStore.get(toEmail) || [];
    userEmails.unshift(emailItem);
    g.__emailStore.set(toEmail, userEmails);
  }

  return emailItem;
}

/**
 * Executes a matched action or escalation tier.
 */
export async function dispatchAction(
  action: AutomationAction | EscalationTier,
  context: TriggerContext,
  executionId?: string,
  ruleId?: string,
  ruleName: string = "Automation Rule",
  companyId?: string
) {
  const isEscalationTier = "level" in action;
  const priority = action.priority || (isEscalationTier ? "URGENT" : "NORMAL");

  // Determine target roles
  const targetRoles = isEscalationTier
    ? [action.targetRole]
    : ((action as AutomationAction).targetRecipients || ["ASSIGNED_USER"]);

  const customEmails = isEscalationTier
    ? (action.customRecipient ? [action.customRecipient] : [])
    : ((action as AutomationAction).customEmails || []);

  const recipients = await resolveRecipients(targetRoles, customEmails, context, companyId);
  const actionType = (isEscalationTier ? action.actionType : (action as AutomationAction).type) || "BOTH";

  const emailSubjectTpl = isEscalationTier
    ? action.emailSubjectTemplate
    : (action as AutomationAction).emailSubject;
  const emailBodyTpl = isEscalationTier
    ? action.emailBodyTemplate
    : (action as AutomationAction).emailBody;
  const notifTitleTpl = isEscalationTier
    ? action.notifTitleTemplate
    : (action as AutomationAction).notifTitle;
  const notifMsgTpl = isEscalationTier
    ? action.notifMessageTemplate
    : (action as AutomationAction).notifMessage;

  const sentRecipients: string[] = [];

  for (const { user, email } of recipients) {
    sentRecipients.push(email);

    const emailSubject = renderTemplate(emailSubjectTpl || `Automation Alert: Work Order Update`, context, user);
    const emailBody = renderTemplate(emailBodyTpl || `Automated update for your assigned work order.`, context, user);
    const notifTitle = renderTemplate(notifTitleTpl || `Work Order Alert`, context, user);
    const notifMessage = renderTemplate(notifMsgTpl || `You have a new work order update.`, context, user);

    // 1. Send Internal Email
    if (actionType === "SEND_INTERNAL_EMAIL" || actionType === "BOTH") {
      await sendInternalEmail(
        email,
        user.name || "User",
        emailSubject,
        emailBody,
        context.workOrder?.id,
        priority
      );
    }

    // 2. Create In-App Notification
    if (actionType === "CREATE_IN_APP_NOTIF" || actionType === "BOTH") {
      if (user.id && !user.id.startsWith("ext-")) {
        await prisma.notification.create({
          data: {
            title: notifTitle,
            message: notifMessage,
            type: priority === "CRITICAL" ? "OVERDUE" : (priority === "URGENT" ? "CANCELLED" : "WORK_ORDER"),
            priority,
            actionRequired: !!("actionRequired" in action && action.actionRequired),
            link: context.workOrder?.id ? `/dashboard/work-orders/${context.workOrder.id}` : undefined,
            userId: user.id,
            workOrderId: context.workOrder?.id,
            companyId: companyId || context.workOrder?.companyId,
          },
        }).catch(err => console.error("Failed to create notification:", err));
      }
    }
  }

  // 3. Perform Priority / Status Updates if specified
  if (!isEscalationTier) {
    const act = action as AutomationAction;
    if (context.workOrder?.id) {
      const updates: any = {};
      if (act.newPriority != null) updates.priority = act.newPriority;
      if (act.newStatus) updates.status = act.newStatus;

      if (Object.keys(updates).length > 0) {
        await prisma.workOrder.update({
          where: { id: context.workOrder.id },
          data: updates,
        }).catch(() => {});
      }
    }
  }

  // 4. Log to AutomationAuditLog
  const woNum = context.workOrder?.id
    ? (context.workOrder.workOrderNumber || "WO-" + context.workOrder.id.replace(/[^a-zA-Z0-9]/g, "").slice(-6).toUpperCase())
    : undefined;

  await prisma.automationAuditLog.create({
    data: {
      executionId: executionId || null,
      ruleId: ruleId || null,
      ruleName,
      workOrderId: context.workOrder?.id || null,
      workOrderNumber: woNum,
      triggerEvent: (context.meta?.triggerEvent as string) || "AUTOMATION_EVENT",
      actionType,
      recipients: JSON.stringify(sentRecipients),
      details: `Executed ${actionType} for ${sentRecipients.length} recipients. Priority: ${priority}`,
      escalationLevel: isEscalationTier ? action.level : 0,
      status: "SUCCESS",
      companyId: companyId || context.workOrder?.companyId,
    },
  }).catch(() => {});
}
