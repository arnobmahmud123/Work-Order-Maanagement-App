import prisma from "@/lib/prisma";

export interface ActiveCallSession {
  id: string;
  channelId: string;
  channelName?: string;
  callerId: string;
  callerName: string;
  callerEmail?: string;
  callerImage?: string | null;
  targetUserId?: string;
  targetUserName?: string;
  callType: "audio" | "video";
  status: "ringing" | "connected" | "ended" | "declined";
  createdAt: number;
  acceptedAt?: number;
  endedAt?: number;
  participants: Array<{
    userId: string;
    name: string;
    image?: string | null;
    isMuted?: boolean;
    isVideoOff?: boolean;
    joinedAt: number;
  }>;
  signals?: Array<{
    senderId: string;
    type: "offer" | "answer" | "candidate";
    data: any;
    timestamp: number;
  }>;
}

export async function createCallSession(params: {
  channelId: string;
  channelName?: string;
  callerId: string;
  callerName: string;
  callerEmail?: string;
  callerImage?: string | null;
  targetUserId?: string;
  targetUserName?: string;
  callType: "audio" | "video";
}): Promise<ActiveCallSession> {
  const id = `call-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  const now = Date.now();

  const purposeData = {
    channelId: params.channelId,
    channelName: params.channelName || "Direct Call",
    callerId: params.callerId,
    callerName: params.callerName,
    callerEmail: params.callerEmail,
    callerImage: params.callerImage,
    targetUserId: params.targetUserId,
    targetUserName: params.targetUserName,
    callType: params.callType,
    participants: [
      {
        userId: params.callerId,
        name: params.callerName,
        image: params.callerImage,
        isMuted: false,
        isVideoOff: params.callType === "audio",
        joinedAt: now,
      },
    ],
    signals: [],
  };

  await prisma.callLog.create({
    data: {
      id,
      initiatorId: params.callerId,
      recipientId: params.targetUserId || null,
      recipientPhone: "0000000000",
      recipientName: params.targetUserName || null,
      status: "RINGING",
      purpose: JSON.stringify(purposeData),
      startedAt: new Date(now),
    },
  });

  return {
    id,
    ...params,
    status: "ringing",
    createdAt: now,
    participants: purposeData.participants,
    signals: [],
  };
}

export async function getCallSession(id: string): Promise<ActiveCallSession | null> {
  try {
    const log = await prisma.callLog.findUnique({
      where: { id },
    });
    if (!log) return null;

    let parsedPurpose: any = {};
    try {
      parsedPurpose = log.purpose ? JSON.parse(log.purpose) : {};
    } catch {}

    const statusMap: Record<string, "ringing" | "connected" | "ended" | "declined"> = {
      RINGING: "ringing",
      CONNECTED: "connected",
      DECLINED: "declined",
      ENDED: "ended",
      COMPLETED: "ended",
      MISSED: "ended",
    };

    return {
      id: log.id,
      channelId: parsedPurpose.channelId || "general",
      channelName: parsedPurpose.channelName || "Direct Call",
      callerId: log.initiatorId,
      callerName: parsedPurpose.callerName || "User",
      callerEmail: parsedPurpose.callerEmail,
      callerImage: parsedPurpose.callerImage || null,
      targetUserId: log.recipientId || parsedPurpose.targetUserId,
      targetUserName: log.recipientName || parsedPurpose.targetUserName,
      callType: parsedPurpose.callType || "audio",
      status: statusMap[log.status] || "ended",
      createdAt: log.createdAt ? new Date(log.createdAt).getTime() : Date.now(),
      acceptedAt: log.startedAt ? new Date(log.startedAt).getTime() : undefined,
      endedAt: log.endedAt ? new Date(log.endedAt).getTime() : undefined,
      participants: parsedPurpose.participants || [],
      signals: parsedPurpose.signals || [],
    };
  } catch (err) {
    console.error("[getCallSession] Error:", err);
    return null;
  }
}

/**
 * Check if a call is targeted at this user — by:
 * 1. Direct recipientId match
 * 2. Email match
 * 3. Channel membership — if caller is in a channel with this user
 * 4. Work order contractor/coordinator match via channel description
 */
async function isCallForUser(log: any, userId: string, email?: string): Promise<boolean> {
  // Direct match
  if (log.recipientId === userId) return true;
  if (email && log.recipientName === email) return true;
  if (email && log.recipientId === email) return true;

  // Parse purpose to get channelId
  let parsedPurpose: any = {};
  try { parsedPurpose = log.purpose ? JSON.parse(log.purpose) : {}; } catch {}
  
  const channelId = parsedPurpose.channelId;
  if (!channelId || channelId === "general") return false;

  // Check if user is a ChannelMember of the channel
  const membership = await prisma.channelMember.findFirst({
    where: { channelId, userId },
  }).catch(() => null);
  if (membership) return true;

  // Check if the channel is a WORK_ORDERS channel, and this user is the contractor/coordinator
  const channel = await prisma.channel.findUnique({
    where: { id: channelId },
    select: { type: true, name: true, description: true },
  }).catch(() => null);

  if (channel?.type === "WORK_ORDERS") {
    const cuidMatch =
      (channel.name || "").match(/(wo_[a-z0-9_]+)|([a-z0-9]{24,})/i) ||
      (channel.description || "").match(/(wo_[a-z0-9_]+)|([a-z0-9]{24,})/i);
    const workOrderId = cuidMatch ? cuidMatch[0] : null;
    if (workOrderId) {
      const workOrder = await prisma.workOrder.findUnique({
        where: { id: workOrderId },
        select: { contractorId: true, coordinatorId: true, createdById: true },
      }).catch(() => null);
      if (workOrder) {
        if (
          workOrder.contractorId === userId ||
          workOrder.coordinatorId === userId ||
          workOrder.createdById === userId
        ) {
          return true;
        }
      }
    }
  }

  return false;
}

export async function getIncomingCallForUser(userId: string, email?: string): Promise<ActiveCallSession | null> {
  try {
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);

    // First: find any RINGING call that directly names this user
    const log = await prisma.callLog.findFirst({
      where: {
        status: "RINGING",
        initiatorId: { not: userId },
        createdAt: { gte: oneMinuteAgo },
        OR: [
          { recipientId: userId },
          { recipientName: email },
          { recipientId: email },
        ],
      },
      orderBy: { createdAt: "desc" },
    });

    if (log) {
      return getCallSession(log.id);
    }

    // Second: scan recent RINGING calls and check membership/work order ownership
    const recentCalls = await prisma.callLog.findMany({
      where: {
        status: "RINGING",
        initiatorId: { not: userId },
        createdAt: { gte: oneMinuteAgo },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    for (const cl of recentCalls) {
      const forUser = await isCallForUser(cl, userId, email);
      if (forUser) {
        return getCallSession(cl.id);
      }
    }

    return null;
  } catch (err) {
    console.error("[getIncomingCallForUser] Error:", err);
    return null;
  }
}

export async function getActiveCallForUser(userId: string): Promise<ActiveCallSession | null> {
  try {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const log = await prisma.callLog.findFirst({
      where: {
        status: "CONNECTED",
        createdAt: { gte: tenMinutesAgo },
        OR: [
          { initiatorId: userId },
          { recipientId: userId },
        ],
      },
      orderBy: { createdAt: "desc" },
    });

    if (log) {
      return getCallSession(log.id);
    }
    return null;
  } catch (err) {
    return null;
  }
}

export async function acceptCallSession(callId: string, user: { id: string; name: string; image?: string | null }): Promise<ActiveCallSession | null> {
  try {
    const existing = await getCallSession(callId);
    if (!existing || existing.status === "ended" || existing.status === "declined") {
      return null;
    }

    const participants = existing.participants || [];
    if (!participants.some((p) => p.userId === user.id)) {
      participants.push({
        userId: user.id,
        name: user.name,
        image: user.image,
        isMuted: false,
        isVideoOff: existing.callType === "audio",
        joinedAt: Date.now(),
      });
    }

    let parsedPurpose: any = {};
    try {
      const dbRecord = await prisma.callLog.findUnique({ where: { id: callId } });
      if (dbRecord?.purpose) parsedPurpose = JSON.parse(dbRecord.purpose);
    } catch {}

    parsedPurpose.participants = participants;

    await prisma.callLog.update({
      where: { id: callId },
      data: {
        status: "CONNECTED",
        startedAt: new Date(),
        purpose: JSON.stringify(parsedPurpose),
      },
    });

    return {
      ...existing,
      status: "connected",
      acceptedAt: Date.now(),
      participants,
    };
  } catch (err) {
    console.error("[acceptCallSession] Error:", err);
    return null;
  }
}

export async function declineCallSession(callId: string): Promise<ActiveCallSession | null> {
  try {
    const existing = await getCallSession(callId);
    if (!existing) return null;

    await prisma.callLog.update({
      where: { id: callId },
      data: {
        status: "DECLINED",
        endedAt: new Date(),
      },
    });

    return { ...existing, status: "declined", endedAt: Date.now() };
  } catch (err) {
    return null;
  }
}

export async function endCallSession(callId: string): Promise<ActiveCallSession | null> {
  try {
    const existing = await getCallSession(callId);
    if (!existing) return null;

    await prisma.callLog.update({
      where: { id: callId },
      data: {
        status: "ENDED",
        endedAt: new Date(),
      },
    });

    return { ...existing, status: "ended", endedAt: Date.now() };
  } catch (err) {
    return null;
  }
}

export async function addCallSignal(callId: string, senderId: string, type: "offer" | "answer" | "candidate", data: any) {
  try {
    const dbRecord = await prisma.callLog.findUnique({ where: { id: callId } });
    if (!dbRecord) return false;

    let parsedPurpose: any = {};
    try {
      parsedPurpose = dbRecord.purpose ? JSON.parse(dbRecord.purpose) : {};
    } catch {}

    const signals = parsedPurpose.signals || [];
    signals.push({
      senderId,
      type,
      data,
      timestamp: Date.now(),
    });

    // Keep only last 20 signals
    if (signals.length > 20) signals.splice(0, signals.length - 20);

    parsedPurpose.signals = signals;

    await prisma.callLog.update({
      where: { id: callId },
      data: { purpose: JSON.stringify(parsedPurpose) },
    });
    return true;
  } catch {
    return false;
  }
}

export async function getCallSignalsForPeer(callId: string, currentUserId: string, sinceTimestamp = 0) {
  try {
    const dbRecord = await prisma.callLog.findUnique({ where: { id: callId } });
    if (!dbRecord || !dbRecord.purpose) return [];

    const parsed = JSON.parse(dbRecord.purpose);
    const signals = parsed.signals || [];

    return signals.filter((s: any) => s.senderId !== currentUserId && s.timestamp > sinceTimestamp);
  } catch {
    return [];
  }
}
