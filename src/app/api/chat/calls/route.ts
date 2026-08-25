import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createCallSession } from "@/lib/chat-calls";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { channelId, channelName, targetUserId, targetUserName, callType } = body;

    const callerId = (session.user as any).id;
    const callerName = session.user.name || "User";
    const callerEmail = session.user.email || undefined;
    const callerImage = session.user.image || null;

    let resolvedTargetUserId = targetUserId;
    let resolvedTargetUserName = targetUserName;

    if (!resolvedTargetUserId && channelId && channelId !== "general" && channelId !== "direct") {
      const channel = await prisma.channel.findUnique({
        where: { id: channelId },
        select: {
          type: true,
          name: true,
          description: true,
          members: {
            where: { userId: { not: callerId } },
            select: { userId: true, user: { select: { name: true } } },
            take: 1,
          },
        },
      });
      if (channel?.type === "WORK_ORDERS") {
        const cuidMatch = (channel.name || "").match(/(wo_[a-z0-9_]+)|([a-z0-9]{24,})/i) || (channel.description || "").match(/(wo_[a-z0-9_]+)|([a-z0-9]{24,})/i);
        const workOrderId = cuidMatch ? cuidMatch[0] : null;
        if (workOrderId) {
          const workOrder = await prisma.workOrder.findUnique({
            where: { id: workOrderId },
            select: { 
              contractorId: true, 
              coordinatorId: true, 
              createdById: true,
              contractor: { select: { name: true } }, 
              coordinator: { select: { name: true } },
              createdBy: { select: { name: true } }
            }
          });
          if (workOrder) {
            if (callerId === workOrder.contractorId) {
              resolvedTargetUserId = workOrder.coordinatorId || workOrder.createdById || undefined;
              resolvedTargetUserName = workOrder.coordinator?.name || workOrder.createdBy?.name || "Admin";
            } else {
              resolvedTargetUserId = workOrder.contractorId || undefined;
              resolvedTargetUserName = workOrder.contractor?.name || "Contractor";
            }
          }
        }
      }

      // If still not resolved (e.g. DIRECT_MESSAGE or general/custom channel with other members)
      if (!resolvedTargetUserId && channel?.members && channel.members.length > 0) {
        resolvedTargetUserId = channel.members[0].userId;
        resolvedTargetUserName = channel.members[0].user?.name || "User";
      }
    }

    const callSession = await createCallSession({
      channelId: channelId || "general",
      channelName: channelName || "Direct Call",
      callerId,
      callerName,
      callerEmail,
      callerImage,
      targetUserId: resolvedTargetUserId,
      targetUserName: resolvedTargetUserName,
      callType: callType || "audio",
    });

    return NextResponse.json({ success: true, call: callSession });
  } catch (error: any) {
    console.error("[API Chat Calls POST] Error:", error);
    return NextResponse.json({ error: "Failed to initiate call" }, { status: 500 });
  }
}
