import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import crypto from "crypto";

// This forces Vercel to let this specific API route run for up to 60 seconds
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("elevenlabs-signature");
    const secret = process.env.ELEVENLABS_WEBHOOK_SECRET;

    // Optional verification: only verify if ELEVENLABS_WEBHOOK_SECRET is set
    if (secret) {
      if (!signature) {
        return NextResponse.json({ error: "Missing signature" }, { status: 400 });
      }
      const hmac = crypto.createHmac("sha256", secret);
      const digest = hmac.update(rawBody).digest("hex");

      if (digest !== signature) {
        console.error("ElevenLabs Webhook signature verification failed");
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
      }
    }

    const payload = JSON.parse(rawBody);
    const { type, data } = payload;

    if (type !== "post_call_transcription") {
      return NextResponse.json({ received: true, ignored: true, type });
    }

    const { conversation_id, transcript, summary, audio_url, call_duration_secs } = data;

    if (!conversation_id) {
      return NextResponse.json({ error: "Missing conversation_id" }, { status: 400 });
    }

    // Format transcript into a readable string
    let transcriptionText = "";
    if (typeof transcript === "string") {
      transcriptionText = transcript;
    } else if (Array.isArray(transcript)) {
      transcriptionText = transcript
        .map((t: any) => `${t.role === "agent" ? "Agent" : "Caller"}: ${t.text}`)
        .join("\n");
    } else if (transcript) {
      transcriptionText = JSON.stringify(transcript);
    }

    const duration = call_duration_secs || null;

    // Check if CallLog already exists
    const existingCall = await prisma.callLog.findUnique({
      where: { id: conversation_id },
    });

    if (existingCall) {
      await prisma.callLog.update({
        where: { id: conversation_id },
        data: {
          status: "COMPLETED",
          transcription: transcriptionText || existingCall.transcription,
          summary: summary || existingCall.summary,
          recordingUrl: audio_url || existingCall.recordingUrl,
          duration: duration || existingCall.duration,
          endedAt: new Date(),
        },
      });
    } else {
      const fallbackAdmin = await prisma.user.findFirst({
        where: { role: "ADMIN" },
        select: { id: true },
      }) || await prisma.user.findFirst({
        select: { id: true },
      });

      if (fallbackAdmin) {
        // Create new CallLog for unexpected/direct inbound call
        await prisma.callLog.create({
          data: {
            id: conversation_id,
            initiatorId: fallbackAdmin.id,
            recipientPhone: "Inbound Caller",
            recipientName: "Unknown Contractor",
            status: "COMPLETED",
            transcription: transcriptionText,
            summary: summary || "Call finished.",
            recordingUrl: audio_url,
            startedAt: new Date(Date.now() - (duration || 0) * 1000),
            endedAt: new Date(),
            duration: duration,
            purpose: "Inbound AI agent call",
          },
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error in ElevenLabs Webhook:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
