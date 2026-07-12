import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// This forces Vercel to let this specific API route run for up to 60 seconds
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    let { work_order_id, notes, phone, conversation_id } = body;

    if (!work_order_id) {
      return NextResponse.json({ error: "Missing required parameter work_order_id" }, { status: 400 });
    }

    if (!notes) {
      return NextResponse.json({ error: "Missing required parameter notes" }, { status: 400 });
    }

    // Resolve short id (e.g. WO-5S2ETP) to actual CUID
    let targetWorkOrderId = work_order_id;
    if (targetWorkOrderId && targetWorkOrderId.toUpperCase().startsWith("WO-")) {
      const suffix = targetWorkOrderId.slice(3).toLowerCase();
      const match = await prisma.workOrder.findFirst({
        where: {
          id: {
            endsWith: suffix
          }
        },
        select: { id: true }
      });
      if (match) {
        targetWorkOrderId = match.id;
      }
    }

    // Reassign work_order_id so the rest of the queries receive the correct resolved CUID key
    work_order_id = targetWorkOrderId;

    // Retrieve the work order to verify existence and get participants
    const workOrder = await prisma.workOrder.findUnique({
      where: { id: work_order_id },
      include: {
        contractor: { select: { id: true, name: true } },
      },
    });

    if (!workOrder) {
      return NextResponse.json({ success: false, message: "Work order not found." }, { status: 404 });
    }

    const contractorId = workOrder.contractorId;
    const authorId = contractorId || workOrder.coordinatorId || workOrder.createdById;

    if (!authorId) {
      return NextResponse.json({ success: false, message: "No valid user found to author the message." }, { status: 400 });
    }

    // 1. Update Work Order status to FIELD_COMPLETE and record notes in specialInstructions or metadata
    const updatedWorkOrder = await prisma.workOrder.update({
      where: { id: work_order_id },
      data: {
        status: "FIELD_COMPLETE",
        completedAt: new Date(),
        // Also store the call note in metadata/specialInstructions for robustness
        specialInstructions: workOrder.specialInstructions 
          ? `${workOrder.specialInstructions}\n\n[Field Note via AI Call ${new Date().toLocaleDateString()}]: ${notes}`
          : `[Field Note via AI Call ${new Date().toLocaleDateString()}]: ${notes}`,
      },
    });

    // 2. Find or create a message Thread for this work order
    let thread = await prisma.thread.findFirst({
      where: { workOrderId: work_order_id },
    });

    if (!thread) {
      thread = await prisma.thread.create({
        data: {
          title: `Discussion - ${workOrder.title}`,
          workOrderId: work_order_id,
          isGeneral: true,
        },
      });
    }

    // 3. Create a Message inside the thread containing the contractor's notes
    const message = await prisma.message.create({
      data: {
        content: `[AI Voice Agent Call notes]: Contractor submitted status update. Notes: "${notes}"`,
        threadId: thread.id,
        authorId: authorId,
        type: "COMMENT",
        visibility: "INTERNAL",
      },
    });

    // 4. Log the activity in ActivityLog
    await prisma.activityLog.create({
      data: {
        action: "STATUS_CHANGED",
        details: `Status changed to FIELD_COMPLETE via ElevenLabs AI Voice Agent. Contractor notes: "${notes}"`,
        userId: authorId,
        workOrderId: work_order_id,
      },
    });

    // 5. Create notifications for the coordinator (and admin)
    if (workOrder.coordinatorId) {
      await prisma.notification.create({
        data: {
          type: "WORK_ORDER",
          title: "Work Order Completed via AI Agent",
          message: `"${workOrder.title}" status changed to FIELD_COMPLETE. Notes: ${notes}`,
          userId: workOrder.coordinatorId,
          workOrderId: work_order_id,
        },
      }).catch(() => {});
    }

    // 6. Update CallLog if conversation_id is provided
    if (conversation_id) {
      await prisma.callLog.updateMany({
        where: { id: conversation_id },
        data: {
          status: "IN_PROGRESS",
          purpose: `Completed work order: ${workOrder.title}`,
          summary: `Contractor called and updated status to FIELD_COMPLETE. Notes: ${notes}`,
        },
      }).catch((err) => {
        console.error("Failed to update CallLog in complete-order tool:", err);
      });
    }

    return NextResponse.json({
      success: true,
      message: "Work order status successfully updated to Field Complete, and contractor notes have been logged.",
      workOrderId: work_order_id,
    });
  } catch (error: any) {
    console.error("Error in complete_work_order webhook tool:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
