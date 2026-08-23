import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getIncomingCallForUser, getActiveCallForUser } from "@/lib/chat-calls";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ incomingCall: null, activeCall: null });
    }

    const userId = (session.user as any).id;
    const email = (session.user as any).email;

    const [incomingCall, activeCall] = await Promise.all([
      getIncomingCallForUser(userId, email),
      getActiveCallForUser(userId),
    ]);

    return NextResponse.json({
      incomingCall: incomingCall || null,
      activeCall: activeCall || null,
    });
  } catch (error: any) {
    return NextResponse.json({ incomingCall: null, activeCall: null });
  }
}
