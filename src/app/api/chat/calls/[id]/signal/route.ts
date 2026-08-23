import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { addCallSignal, getCallSignalsForPeer } from "@/lib/chat-calls";

export async function GET(req: NextRequest, context: any) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ signals: [] });
    }

    const resolvedParams = context?.params ? await context.params : null;
    const id = resolvedParams?.id || new URL(req.url).pathname.split("/")[4];
    const userId = (session.user as any).id;

    const { searchParams } = new URL(req.url);
    const since = parseInt(searchParams.get("since") || "0", 10);

    const signals = await getCallSignalsForPeer(id, userId, since);
    return NextResponse.json({ signals });
  } catch (error: any) {
    return NextResponse.json({ signals: [] });
  }
}

export async function POST(req: NextRequest, context: any) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = context?.params ? await context.params : null;
    const id = resolvedParams?.id || new URL(req.url).pathname.split("/")[4];
    const userId = (session.user as any).id;

    const body = await req.json();
    const { type, data } = body;

    const success = await addCallSignal(id, userId, type, data);
    return NextResponse.json({ success });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to post signal" }, { status: 500 });
  }
}
