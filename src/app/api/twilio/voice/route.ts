import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";

export async function POST(req: NextRequest) {
  try {
    const data = await req.formData();
    const to = data.get("To")?.toString();

    const VoiceResponse = twilio.twiml.VoiceResponse;
    const response = new VoiceResponse();
    const callerId = process.env.TWILIO_PHONE_NUMBER;

    if (to) {
      // Outbound call
      const dial = response.dial({ callerId });
      // If the "To" looks like a client identifier rather than a phone number
      if (/^[\d\+\-\(\) ]+$/.test(to)) {
        dial.number(to);
      } else {
        dial.client(to);
      }
    } else {
      // Inbound call
      response.say("Thank you for calling. We are connecting you to an agent.");
      // You can implement forwarding here
    }

    return new NextResponse(response.toString(), {
      headers: {
        "Content-Type": "text/xml",
      },
    });
  } catch (error: any) {
    console.error("Twilio voice error:", error);
    return new NextResponse("Error generating TwiML", { status: 500 });
  }
}
