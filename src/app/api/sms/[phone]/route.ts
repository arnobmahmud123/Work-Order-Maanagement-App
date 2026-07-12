import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

async function getTwilioPhoneNumber(): Promise<string | null> {
  const envNumber = process.env.TWILIO_PHONE_NUMBER;
  if (envNumber) return envNumber;

  try {
    const lastInbound = await prisma.smsMessage.findFirst({
      where: { direction: "INBOUND" },
      orderBy: { createdAt: "desc" }
    });
    if (lastInbound?.to) {
      console.log("[SMS History API] Auto-discovered Twilio number from DB:", lastInbound.to);
      return lastInbound.to;
    }
  } catch (err) {
    console.error("[SMS History API] Failed to auto-discover Twilio number:", err);
  }

  return null;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ phone: string }> }
) {
  try {
    const { phone } = await params;
    const twilioNumber = await getTwilioPhoneNumber() || "";

    if (!phone) {
      return NextResponse.json({ error: "Missing phone parameter" }, { status: 400 });
    }

    // Resolve matching User metadata (especially image avatar)
    const cleanedPhone = phone.replace(/\D/g, "");
    const user = await prisma.user.findFirst({
      where: {
        phone: {
          contains: cleanedPhone !== "" ? cleanedPhone : undefined
        }
      }
    });

    // Fetch conversation history between Twilio number and external phone
    const messages = await prisma.smsMessage.findMany({
      where: {
        OR: [
          { from: phone, to: twilioNumber },
          { from: twilioNumber, to: phone },
          { from: "SYSTEM", to: phone, type: "NOTE" }
        ]
      },
      orderBy: {
        createdAt: "asc"
      }
    });

    return NextResponse.json({
      messages,
      contact: user
        ? {
            name: user.name,
            role: user.role,
            image: user.image
          }
        : null
    });
  } catch (error: any) {
    console.error("[SMS History API] Error fetching history:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
