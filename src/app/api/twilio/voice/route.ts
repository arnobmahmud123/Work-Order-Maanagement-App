import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";

export async function POST(req: NextRequest) {
  try {
    const data = await req.formData();
    const to = data.get("To")?.toString();

    const VoiceResponse = twilio.twiml.VoiceResponse;
    const response = new VoiceResponse();
    // Fallback to the configured Twilio number if process.env misses it on edge
    const callerId = process.env.TWILIO_PHONE_NUMBER || "+16592137866";

    if (to) {
      // Outbound call
      const dial = response.dial({ callerId });
      // If the "To" looks like a phone number
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

    const twiml = response.toString();
    console.log("Generated TwiML:", twiml);

    return new NextResponse(twiml, {
      headers: {
        "Content-Type": "text/xml",
      },
    });
  } catch (error: any) {
    console.error("Twilio voice error:", error);
    
    // Return a valid TwiML even on error to avoid generic "Application Error" from Twilio
    const VoiceResponse = twilio.twiml.VoiceResponse;
    const fallback = new VoiceResponse();
    fallback.say("We encountered a server error while connecting the call. Please check your setup or trial limits.");
    
    return new NextResponse(fallback.toString(), { 
      status: 200, 
      headers: { "Content-Type": "text/xml" } 
    });
  }
}
