import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const agentId = process.env.ELEVENLABS_AGENT_ID || process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID;
  const apiKey = process.env.ELEVENLABS_API_KEY;

  if (!agentId) {
    console.error("Missing ELEVENLABS_AGENT_ID env variable");
    return NextResponse.json(
      { error: "ElevenLabs credentials not configured on the server" },
      { status: 500 }
    );
  }

  try {
    // If no API Key is set, tell the client to connect directly to public agent
    if (!apiKey) {
      return NextResponse.json({ signedUrl: null, agentId });
    }

    const response = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${agentId}`,
      {
        method: "GET",
        headers: {
          "xi-api-key": apiKey,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.warn("ElevenLabs get-signed-url failed, returning agentId for client fallback:", errorText);
      return NextResponse.json({
        signedUrl: null,
        agentId,
        error: `ElevenLabs API returned ${response.status}: ${errorText}`
      });
    }

    const data = await response.json();
    return NextResponse.json({ signedUrl: data.signed_url, agentId });
  } catch (error: any) {
    console.error("Error in signed-url endpoint:", error);
    return NextResponse.json({
      signedUrl: null,
      agentId,
      error: error.message
    });
  }
}
