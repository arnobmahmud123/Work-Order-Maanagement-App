import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { declineCallSession } from "@/lib/chat-calls";

export async function POST(req: NextRequest, context: any) {
  try {
    const resolvedParams = context?.params ? await context.params : null;
    const id = resolvedParams?.id || new URL(req.url).pathname.split("/")[4];

    const call = await declineCallSession(id);
    return NextResponse.json({ success: true, call });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to decline call" }, { status: 500 });
  }
}
