import prisma from "@/lib/prisma";
import { triggerAutomationEvent } from "@/lib/automation/engine";

export async function notifyContractorAssigned(params: {
  workOrder: any;
  assignedById: string;
  contractorId: string;
}) {
  try {
    const { workOrder, assignedById, contractorId } = params;

    const contractor = await prisma.user.findUnique({
      where: { id: contractorId },
      select: { id: true, name: true, email: true },
    });

    if (!contractor) return;

    const assigner = await prisma.user.findUnique({
      where: { id: assignedById },
      select: { id: true, name: true, email: true },
    });

    const woNum = "WO-" + workOrder.id.replace(/[^a-zA-Z0-9]/g, "").slice(-6).toUpperCase();
    const dueDateStr = workOrder.dueDate
      ? new Date(workOrder.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
      : "ASAP";
    const addressStr = [workOrder.address, workOrder.city, workOrder.state, workOrder.zipCode].filter(Boolean).join(", ");

    // 1. Create In-App High-Priority Notification
    await prisma.notification.create({
      data: {
        userId: contractorId,
        title: `Job Assignment: ${workOrder.title} (${woNum})`,
        message: `You have been assigned to ${workOrder.title} at ${addressStr || "Property"}. Due: ${dueDateStr}.`,
        type: "JOB_ASSIGNMENT",
        link: `/dashboard/work-orders/${workOrder.id}`,
        workOrderId: workOrder.id,
        priority: "HIGH",
      },
    }).catch(() => {});

    // 2. Create Internal Email Thread & Confirmation Message
    const emailSubject = `Job Assignment Confirmation: ${workOrder.title} (${woNum})`;
    const emailContent = `Dear ${contractor.name || "Contractor"},

You have been assigned to the following property preservation work order:

══════════════════════════════════════════════════
WORK ORDER DETAILS
══════════════════════════════════════════════════
• Work Order #: ${woNum}
• Title: ${workOrder.title}
• Property Address: ${addressStr || "Not specified"}
• Service Type: ${workOrder.serviceType || "Standard Preservation"}
• Due Date: ${dueDateStr}
• Assigned By: ${assigner?.name || "Operations Team"} (${assigner?.email || "System"})

ACCESS INSTRUCTIONS:
• Lockbox / Key Code: ${workOrder.lockCode || workOrder.keyCode || "N/A"}
• Lockbox Location: ${workOrder.lockboxLocation || "Front door"}
• Gate Code: ${workOrder.gateCode || "N/A"}

SPECIAL INSTRUCTIONS:
${workOrder.specialInstructions || "Complete all inspection and service checklist items with required before/during/after GPS photos."}

══════════════════════════════════════════════════

Please review and confirm this work order in your contractor portal:
/dashboard/work-orders/${workOrder.id}

Thank you,
${assigner?.name || "Operations Management Team"}`;

    await prisma.thread.create({
      data: {
        title: emailSubject,
        workOrderId: workOrder.id,
        participants: {
          create: [
            { userId: assignedById },
            { userId: contractorId },
          ],
        },
        messages: {
          create: {
            authorId: assignedById,
            content: emailContent,
          },
        },
      },
    }).catch((err) => {
      console.warn("[notifyContractorAssigned] Thread create error:", err);
    });

    // 3. Trigger Automation Engine Event
    triggerAutomationEvent("WO_ASSIGNED", {
      workOrder,
      user: assigner,
      meta: { contractor, assigner },
    }, workOrder.companyId || undefined).catch(() => {});

  } catch (error) {
    console.error("[notifyContractorAssigned] Failed:", error);
  }
}

export async function notifyContractorUnassigned(params: {
  workOrder: any;
  unassignedById: string;
  previousContractorId: string;
  reason?: string;
}) {
  try {
    const { workOrder, unassignedById, previousContractorId, reason } = params;

    const contractor = await prisma.user.findUnique({
      where: { id: previousContractorId },
      select: { id: true, name: true, email: true },
    });

    if (!contractor) return;

    const unassigner = await prisma.user.findUnique({
      where: { id: unassignedById },
      select: { id: true, name: true, email: true },
    });

    const woNum = "WO-" + workOrder.id.replace(/[^a-zA-Z0-9]/g, "").slice(-6).toUpperCase();
    const dueDateStr = workOrder.dueDate
      ? new Date(workOrder.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
      : "ASAP";
    const addressStr = [workOrder.address, workOrder.city, workOrder.state, workOrder.zipCode].filter(Boolean).join(", ");

    // 1. Create In-App Notification
    await prisma.notification.create({
      data: {
        userId: previousContractorId,
        title: `Work Order Unassigned: ${workOrder.title} (${woNum})`,
        message: `You have been unassigned from ${workOrder.title} at ${addressStr || "Property"}. This job is no longer assigned to you.`,
        type: "JOB_UNASSIGNED",
        link: `/dashboard/work-orders/${workOrder.id}`,
        workOrderId: workOrder.id,
        priority: "IMPORTANT",
      },
    }).catch(() => {});

    // 2. Create Internal Email Thread & Cancellation Message
    const emailSubject = `Work Order Unassigned: ${workOrder.title} (${woNum})`;
    const emailContent = `Dear ${contractor.name || "Contractor"},

This is official notification that you have been UNASSIGNED from the following work order:

══════════════════════════════════════════════════
WORK ORDER DETAILS
══════════════════════════════════════════════════
• Work Order #: ${woNum}
• Title: ${workOrder.title}
• Property Address: ${addressStr || "Not specified"}
• Service Type: ${workOrder.serviceType || "Standard Preservation"}
• Due Date: ${dueDateStr}
• Unassigned By: ${unassigner?.name || "Operations Team"} (${unassigner?.email || "System"})
${reason ? `• Reason: ${reason}` : ""}

STATUS UPDATE:
You are no longer required to complete this work order. This assignment has been removed from your active schedule and queue.

If you have already performed work or incurred reimbursable expenses at the property, please submit an itemized invoice or reach out to operations support directly.

Thank you,
${unassigner?.name || "Operations Management Team"}`;

    await prisma.thread.create({
      data: {
        title: emailSubject,
        workOrderId: workOrder.id,
        participants: {
          create: [
            { userId: unassignedById },
            { userId: previousContractorId },
          ],
        },
        messages: {
          create: {
            authorId: unassignedById,
            content: emailContent,
          },
        },
      },
    }).catch((err) => {
      console.warn("[notifyContractorUnassigned] Thread create error:", err);
    });

    // 3. Trigger Automation Engine Event
    triggerAutomationEvent("WO_REASSIGNED", {
      workOrder,
      user: unassigner,
      meta: { previousContractor: contractor, unassigner, action: "UNASSIGNED" },
    }, workOrder.companyId || undefined).catch(() => {});

  } catch (error) {
    console.error("[notifyContractorUnassigned] Failed:", error);
  }
}
