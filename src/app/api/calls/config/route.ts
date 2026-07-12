import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const enableSimulation = process.env.NEXT_PUBLIC_ENABLE_SIMULATION === "true" || false;

  const hasElevenLabs = !!(
    process.env.ELEVENLABS_API_KEY &&
    process.env.ELEVENLABS_AGENT_ID &&
    process.env.ELEVENLABS_PHONE_NUMBER_ID
  );

  const configured = hasElevenLabs && !enableSimulation;

  return NextResponse.json({
    configured: configured,
    provider: configured ? "ElevenLabs Voice Agent" : "Mock Simulation",
    twilioStatus: "Connected",
    elevenLabsStatus: configured ? "Ready" : "Using Mock Fallback",
  });
}
