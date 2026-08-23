import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createCallSession } from "@/lib/chat-calls";

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

    const callSession = await createCallSession({
      channelId: channelId || "general",
      channelName: channelName || "Direct Call",
      callerId,
      callerName,
      callerEmail,
      callerImage,
      targetUserId,
      targetUserName,
      callType: callType || "audio",
    });

    return NextResponse.json({ success: true, call: callSession });
  } catch (error: any) {
    console.error("[API Chat Calls POST] Error:", error);
    return NextResponse.json({ error: "Failed to initiate call" }, { status: 500 });
  }
}
