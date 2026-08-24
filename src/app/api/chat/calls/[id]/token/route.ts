import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
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

    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const apiToken = process.env.CLOUDFLARE_API_TOKEN;
    const appId = process.env.CLOUDFLARE_REALTIME_APP_ID;

    if (!accountId || !apiToken || !appId) {
      console.warn("Cloudflare RealtimeKit credentials are missing in environment variables.");
      return NextResponse.json(
        { error: "Cloudflare RealtimeKit is not configured" },
        { status: 500 }
      );
    }

    // Step 1: Add participant to meeting
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/realtime/kit/${appId}/meetings/${callId}/participants`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiToken}`
        },
        body: JSON.stringify({
          name: session.user.name || "User",
          custom_participant_id: userId
        })
      }
    );

    const result = await response.json();

    if (!response.ok || !result.success) {
      // If the meeting doesn't exist, we might need to create it first.
      // But Cloudflare RealtimeKit automatically creates meetings implicitly for some setups, 
      // or we must create it. Assuming the API might return 404 if meeting doesn't exist.
      if (response.status === 404) {
        // Attempt to create meeting first
        const createRes = await fetch(
          `https://api.cloudflare.com/client/v4/accounts/${accountId}/realtime/kit/${appId}/meetings`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${apiToken}`
            },
            body: JSON.stringify({
              name: `call-${callId}`,
            })
          }
        );
        
        // If creation is successful, retry participant creation
        if (createRes.ok) {
           const retryResponse = await fetch(
             `https://api.cloudflare.com/client/v4/accounts/${accountId}/realtime/kit/${appId}/meetings/${callId}/participants`,
             {
               method: "POST",
               headers: {
                 "Content-Type": "application/json",
                 "Authorization": `Bearer ${apiToken}`
               },
               body: JSON.stringify({
                 name: session.user.name || "User",
                 custom_participant_id: userId
               })
             }
           );
           const retryResult = await retryResponse.json();
           if (retryResponse.ok && retryResult.success) {
             return NextResponse.json({ token: retryResult.result.authToken });
           }
        }
      }

      console.error("[API Cloudflare Realtime] Error adding participant:", result);
      return NextResponse.json(
        { error: "Failed to connect to real-time service" },
        { status: 500 }
      );
    }

    return NextResponse.json({ token: result.result.authToken });
  } catch (error: any) {
    console.error("[API CF Realtime Token] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
