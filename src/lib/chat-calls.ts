// Active Call Signaling & State Management Engine for Real-Time Internal Calling

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
  signals: Array<{
    senderId: string;
    type: "offer" | "answer" | "candidate";
    data: any;
    timestamp: number;
  }>;
}

// Global in-memory call session map
const activeCalls = new Map<string, ActiveCallSession>();

// Cleanup stale calls older than 10 minutes
function cleanupOldCalls() {
  const now = Date.now();
  for (const [id, call] of activeCalls.entries()) {
    if (now - call.createdAt > 10 * 60 * 1000 || (call.status === "ended" && now - (call.endedAt || call.createdAt) > 60 * 1000)) {
      activeCalls.delete(id);
    }
  }
}

export function createCallSession(params: {
  channelId: string;
  channelName?: string;
  callerId: string;
  callerName: string;
  callerEmail?: string;
  callerImage?: string | null;
  targetUserId?: string;
  targetUserName?: string;
  callType: "audio" | "video";
}): ActiveCallSession {
  cleanupOldCalls();

  const id = `call-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  const session: ActiveCallSession = {
    id,
    channelId: params.channelId,
    channelName: params.channelName,
    callerId: params.callerId,
    callerName: params.callerName,
    callerEmail: params.callerEmail,
    callerImage: params.callerImage,
    targetUserId: params.targetUserId,
    targetUserName: params.targetUserName,
    callType: params.callType,
    status: "ringing",
    createdAt: Date.now(),
    participants: [
      {
        userId: params.callerId,
        name: params.callerName,
        image: params.callerImage,
        isMuted: false,
        isVideoOff: params.callType === "audio",
        joinedAt: Date.now(),
      },
    ],
    signals: [],
  };

  activeCalls.set(id, session);
  return session;
}

export function getCallSession(id: string): ActiveCallSession | undefined {
  return activeCalls.get(id);
}

export function getIncomingCallForUser(userId: string, email?: string): ActiveCallSession | undefined {
  cleanupOldCalls();
  const now = Date.now();

  for (const call of activeCalls.values()) {
    // Call must be ringing and created in the last 60 seconds
    if (call.status === "ringing" && now - call.createdAt < 60 * 1000) {
      if (call.callerId !== userId && (call.targetUserId === userId || call.targetUserId === email)) {
        return call;
      }
    }
  }
  return undefined;
}

export function getActiveCallForUser(userId: string): ActiveCallSession | undefined {
  cleanupOldCalls();
  for (const call of activeCalls.values()) {
    if (call.status === "connected" || call.status === "ringing") {
      const isParticipant = call.participants.some((p) => p.userId === userId) || call.callerId === userId || call.targetUserId === userId;
      if (isParticipant) return call;
    }
  }
  return undefined;
}

export function acceptCallSession(callId: string, user: { id: string; name: string; image?: string | null }): ActiveCallSession | null {
  const call = activeCalls.get(callId);
  if (!call || call.status === "ended") return null;

  call.status = "connected";
  call.acceptedAt = Date.now();

  if (!call.participants.some((p) => p.userId === user.id)) {
    call.participants.push({
      userId: user.id,
      name: user.name,
      image: user.image,
      isMuted: false,
      isVideoOff: call.callType === "audio",
      joinedAt: Date.now(),
    });
  }

  return call;
}

export function declineCallSession(callId: string): ActiveCallSession | null {
  const call = activeCalls.get(callId);
  if (!call) return null;

  call.status = "declined";
  call.endedAt = Date.now();
  return call;
}

export function endCallSession(callId: string): ActiveCallSession | null {
  const call = activeCalls.get(callId);
  if (!call) return null;

  call.status = "ended";
  call.endedAt = Date.now();
  return call;
}

export function addCallSignal(callId: string, senderId: string, type: "offer" | "answer" | "candidate", data: any) {
  const call = activeCalls.get(callId);
  if (!call) return false;

  call.signals.push({
    senderId,
    type,
    data,
    timestamp: Date.now(),
  });
  return true;
}

export function getCallSignalsForPeer(callId: string, currentUserId: string, sinceTimestamp = 0) {
  const call = activeCalls.get(callId);
  if (!call) return [];

  return call.signals.filter((s) => s.senderId !== currentUserId && s.timestamp > sinceTimestamp);
}
