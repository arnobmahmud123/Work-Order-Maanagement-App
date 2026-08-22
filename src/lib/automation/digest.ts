import prisma from "@/lib/prisma";
import { sendInternalEmail } from "./dispatcher";

export async function generateDailyDigests(): Promise<{ userDigestsSent: number }> {
  const todayStr = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

  // Fetch all active users with assigned roles
  const users = await prisma.user.findMany({
    where: { isActive: true },
    select: { id: true, name: true, email: true, role: true, companyId: true },
  });

  let sentCount = 0;

  for (const user of users) {
    const userEmail = user.email || `${(user.name || "user").toLowerCase().replace(/\s+/g, ".")}@proppreserve.com`;

    // Fetch user's active work orders
    const whereClause: any = {
      status: { notIn: ["CLOSED", "CANCELLED"] },
      OR: [
        { processorId: user.id },
        { contractorId: user.id },
        { coordinatorId: user.id },
      ],
    };

    // For admins, include overall counts
    const isAdmin = ["ADMIN", "SUPER_ADMIN", "MANAGER"].includes(user.role);
    const userOrders = await prisma.workOrder.findMany({
      where: isAdmin ? { status: { notIn: ["CLOSED", "CANCELLED"] } } : whereClause,
      select: {
        id: true,
        title: true,
        address: true,
        status: true,
        priority: true,
        dueDate: true,
        createdAt: true,
      },
    });

    if (userOrders.length === 0 && !isAdmin) continue;

    const urgentCount = userOrders.filter(w => w.priority >= 2 || w.priority === ("URGENT" as any)).length;
    const dueTodayCount = userOrders.filter(w => w.dueDate && new Date(w.dueDate) >= startOfDay && new Date(w.dueDate) <= endOfDay).length;
    const overdueCount = userOrders.filter(w => w.dueDate && new Date(w.dueDate) < now).length;
    const fieldCompleteUnsubmitted = userOrders.filter(w => w.status === "FIELD_COMPLETE").length;
    const rejectionsCount = userOrders.filter(w => w.status === "REJECTED" || w.status === "RETURNED").length;
    const newTodayCount = userOrders.filter(w => new Date(w.createdAt) >= startOfDay).length;

    const summaryTable = `
📊 SUMMARY OVERVIEW (${user.name || "Team Member"}):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Active Work Orders: ${userOrders.length}
• 🚨 Urgent / Critical: ${urgentCount}
• ⏰ Due Today: ${dueTodayCount}
• 🔴 Overdue: ${overdueCount}
• 📋 Field Complete (Awaiting Submission): ${fieldCompleteUnsubmitted}
• ❌ Rejections / Actions Required: ${rejectionsCount}
• 🆕 New Orders Today: ${newTodayCount}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`.trim();

    const emailSubject = `📊 Daily Work Order Summary — ${todayStr}`;
    const emailBody = `Good morning ${user.name || "there"},\n\nHere is your operational work order digest for ${todayStr}:\n\n${summaryTable}\n\nPlease review your active tasks and address any overdue or urgent items promptly.\n\nOpen Dashboard: /dashboard/work-orders\n\nBest regards,\nPropPreserve Automated Workflow Engine`;

    await sendInternalEmail(
      userEmail,
      user.name || "User",
      emailSubject,
      emailBody,
      undefined,
      urgentCount > 0 || overdueCount > 0 ? "IMPORTANT" : "NORMAL"
    );

    sentCount++;
  }

  return { userDigestsSent: sentCount };
}
