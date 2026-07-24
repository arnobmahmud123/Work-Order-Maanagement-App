import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import twilio from "twilio";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const companyId = (session?.user as any)?.companyId;
    let accountSid = process.env.TWILIO_ACCOUNT_SID;
    let apiKey = process.env.TWILIO_API_KEY;
    let apiSecret = process.env.TWILIO_API_SECRET;
    let twimlAppSid = process.env.TWILIO_TWIML_APP_SID;
    let callerId = process.env.TWILIO_PHONE_NUMBER;

    if (companyId) {
      const company = await prisma.company.findUnique({
        where: { id: companyId },
        select: { twilioPhone: true, twilioSid: true, twilioToken: true }
      });
      if (company?.twilioPhone) {
        callerId = company.twilioPhone;
      }
      if (company?.twilioSid) {
        accountSid = company.twilioSid;
      }
    }

    if (!accountSid || !apiKey || !apiSecret || !twimlAppSid) {
      return NextResponse.json({ error: "Twilio credentials not fully configured" }, { status: 500 });
    }

    const AccessToken = twilio.jwt.AccessToken;
    const VoiceGrant = AccessToken.VoiceGrant;

    const identity = session.user.id || "user_identity";

    const voiceGrant = new VoiceGrant({
      outgoingApplicationSid: twimlAppSid,
      incomingAllow: true,
    });

    const token = new AccessToken(accountSid, apiKey, apiSecret, {
      identity,
    });

    token.addGrant(voiceGrant);

    return NextResponse.json({
      token: token.toJwt(),
      identity: identity,
      callerId: callerId,
    });
  } catch (error: any) {
    console.error("Twilio token error:", error);
    return NextResponse.json({ error: error.message || "Failed to generate token" }, { status: 500 });
  }
}
