import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { AccessToken } from "livekit-server-sdk";
import { getCallSession } from "@/lib/chat-calls";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: callId } = await params;
    const callSession = await getCallSession(callId);
    if (!callSession) {
      return NextResponse.json({ error: "Call not found" }, { status: 404 });
    }

    const userId = (session.user as any).id;
    const isParticipant = callSession.participants?.some(
      (p: any) => p.userId === userId
    ) || callSession.callerId === userId || callSession.targetUserId === userId;

    if (!isParticipant) {
      return NextResponse.json({ error: "Unauthorized for this call" }, { status: 403 });
    }

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;

    if (!apiKey || !apiSecret) {
      console.warn("LiveKit API Key or Secret is missing in environment variables.");
      return NextResponse.json(
        { error: "LiveKit is not configured" },
        { status: 500 }
      );
    }

    const at = new AccessToken(apiKey, apiSecret, {
      identity: userId,
      name: session.user.name || "User",
    });

    at.addGrant({
      roomJoin: true,
      room: `call-${callId}`,
      canPublish: true,
      canSubscribe: true,
    });

    const token = await at.toJwt();
    
    return NextResponse.json({ token, serverUrl: process.env.NEXT_PUBLIC_LIVEKIT_URL });
  } catch (error: any) {
    console.error("[API LiveKit Token] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
