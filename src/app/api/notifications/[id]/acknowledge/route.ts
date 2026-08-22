import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest, context: any) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = context?.params ? await context.params : null;
    const id = resolvedParams?.id || new URL(req.url).pathname.split("/").slice(-2)[0];

    const notification = await prisma.notification.findUnique({ where: { id } });
    if (!notification) {
      return NextResponse.json({ error: "Notification not found" }, { status: 404 });
    }

    const now = new Date();
    const updated = await prisma.notification.update({
      where: { id },
      data: {
        isRead: true,
        acknowledgedAt: now,
        acknowledgedBy: (session.user as any).name || (session.user as any).email || "User",
      },
    });

    // If associated with a work order, resolve running urgent executions
    if (notification.workOrderId) {
      await prisma.automationExecution.updateMany({
        where: {
          workOrderId: notification.workOrderId,
          status: "RUNNING",
        },
        data: {
          status: "COMPLETED",
          resolvedAt: now,
          nextRunAt: null,
        },
      }).catch(() => {});
    }

    return NextResponse.json({ success: true, notification: updated });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to acknowledge notification", details: error.message }, { status: 500 });
  }
}
