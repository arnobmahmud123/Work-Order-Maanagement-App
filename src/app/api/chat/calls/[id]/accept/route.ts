import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { acceptCallSession } from "@/lib/chat-calls";

export async function POST(req: NextRequest, context: any) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = context?.params ? await context.params : null;
    const id = resolvedParams?.id || new URL(req.url).pathname.split("/")[4];

    const userId = (session.user as any).id;
    const name = session.user.name || "User";
    const image = session.user.image || null;

    const call = await acceptCallSession(id, { id: userId, name, image });
    if (!call) {
      return NextResponse.json({ error: "Call not found or ended" }, { status: 404 });
    }

    return NextResponse.json({ success: true, call });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to accept call" }, { status: 500 });
  }
}
