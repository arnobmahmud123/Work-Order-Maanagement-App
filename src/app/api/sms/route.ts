import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// Helper to dynamically auto-discover or fetch Twilio phone number
async function getTwilioPhoneNumber(): Promise<string | null> {
  const envNumber = process.env.TWILIO_PHONE_NUMBER;
  if (envNumber) return envNumber;

  try {
    const lastInbound = await prisma.smsMessage.findFirst({
      where: { direction: "INBOUND" },
      orderBy: { createdAt: "desc" }
    });
    if (lastInbound?.to) {
      console.log("[SMS API] Auto-discovered Twilio number from DB:", lastInbound.to);
      return lastInbound.to;
    }
  } catch (err) {
    console.error("[SMS API] Failed to auto-discover Twilio number:", err);
  }

  return null;
}

// Helper to send outbound SMS via Twilio REST API (with optional MMS mediaUrl)
async function sendTwilioSms(to: string, body: string, fromNumber: string, mediaUrl?: string): Promise<boolean> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken || !fromNumber) {
    console.error("[SMS API] Missing Twilio credentials in environment");
    return false;
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const authHeader = "Basic " + btoa(`${accountSid}:${authToken}`);

  const params = new URLSearchParams();
  params.append("From", fromNumber);
  params.append("To", to);
  params.append("Body", body);

  if (mediaUrl && mediaUrl.startsWith("http")) {
    params.append("MediaUrl", mediaUrl);
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": authHeader,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: params.toString()
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error("[SMS API] Twilio SMS dispatch failed:", errorText);
      return false;
    }

    return true;
  } catch (err) {
    console.error("[SMS API] Error in Twilio fetch dispatch:", err);
    return false;
  }
}

// GET: Fetch all SMS conversation threads
export async function GET(req: NextRequest) {
  try {
    const twilioNumber = await getTwilioPhoneNumber() || "";

    // Fetch all SMS messages ordered by date descending
    const messages = await prisma.smsMessage.findMany({
      orderBy: {
        createdAt: "desc"
      }
    });

    // Group in memory by the contractor's external phone number
    const threadsMap = new Map<string, any>();

    for (const msg of messages) {
      // The external number is whichever number is NOT our Twilio number
      const contactPhone = msg.from === twilioNumber ? msg.to : msg.from;
      
      if (!threadsMap.has(contactPhone)) {
        threadsMap.set(contactPhone, {
          phone: contactPhone,
          lastMessage: msg.body,
          lastMessageAt: msg.createdAt,
          direction: msg.direction,
          contactName: null,
          contactRole: null
        });
      }
    }

    const threads = Array.from(threadsMap.values());

    // Look up matching users/contractors in the database for each thread
    for (const thread of threads) {
      // Find a user with this phone number (normalizing any formatting)
      const cleanedPhone = thread.phone.replace(/\D/g, "");
      
      const user = await prisma.user.findFirst({
        where: {
          phone: {
            contains: cleanedPhone !== "" ? cleanedPhone : undefined
          }
        }
      });

      if (user) {
        thread.contactName = user.name;
        thread.contactRole = user.role;
      }
    }

    return NextResponse.json({ threads });
  } catch (error: any) {
    console.error("[SMS API] Error fetching threads:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Send a manual outbound SMS message or create an internal note
export async function POST(req: NextRequest) {
  try {
    const { to, body, type, authorName, mediaUrl } = await req.json();

    if (!to || !body) {
      return NextResponse.json({ error: "Missing 'to' or 'body' field" }, { status: 400 });
    }

    // Handle Internal Staff Notes (bypass Twilio)
    if (type === "NOTE") {
      const note = await prisma.smsMessage.create({
        data: {
          from: "SYSTEM",
          to: to,
          body: body,
          direction: "INTERNAL",
          type: "NOTE",
          authorName: authorName || "Staff Member",
          mediaUrl: mediaUrl || null
        }
      });
      return NextResponse.json({ success: true, message: note });
    }

    const twilioNumber = await getTwilioPhoneNumber();
    if (!twilioNumber) {
      return NextResponse.json({ error: "Twilio phone number not configured on the server. Please add TWILIO_PHONE_NUMBER to Cloudflare environment variables." }, { status: 500 });
    }

    // 1. Dispatch SMS via Twilio
    const success = await sendTwilioSms(to, body, twilioNumber, mediaUrl);
    if (!success) {
      return NextResponse.json({ error: "Failed to dispatch SMS via Twilio" }, { status: 502 });
    }

    // 2. Save outbound message to the database
    const sms = await prisma.smsMessage.create({
      data: {
        from: twilioNumber,
        to: to,
        body: body,
        direction: "OUTBOUND",
        type: "SMS",
        mediaUrl: mediaUrl || null
      }
    });

    return NextResponse.json({ success: true, message: sms });
  } catch (error: any) {
    console.error("[SMS API] Error in SMS send:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
