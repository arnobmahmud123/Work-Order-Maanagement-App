import { NextRequest, NextResponse } from "next/server";
import { getCallSession } from "@/lib/chat-calls";

export async function GET(req: NextRequest, context: any) {
  try {
    const resolvedParams = context?.params ? await context.params : null;
    const id = resolvedParams?.id || new URL(req.url).pathname.split("/")[4];

    const call = await getCallSession(id);
    if (!call) {
      return NextResponse.json({ status: "ended", call: null });
    }
    return NextResponse.json({ status: call.status, call });
  } catch (error: any) {
    return NextResponse.json({ status: "ended", call: null });
  }
}
