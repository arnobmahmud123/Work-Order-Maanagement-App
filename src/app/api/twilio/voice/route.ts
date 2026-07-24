import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import twilio from "twilio";

export async function POST(req: NextRequest) {
  try {
    const data = await req.formData();
    const to = data.get("To")?.toString() || "";
    const from = data.get("From")?.toString() || "";

    // 1. Inbound Phone Number Lookup: check if the dialed number 'To' belongs to a registered company
    const company = await prisma.company.findFirst({
      where: {
        twilioPhone: to,
        isActive: true,
      },
    });

    const VoiceResponse = twilio.twiml.VoiceResponse;
    const response = new VoiceResponse();

    if (company) {
      console.log(`[Twilio Inbound] Resolved tenant company: ${company.name} (ID: ${company.id}) for dialed number ${to}`);

      const agentId = company.elevenlabsAgentId || process.env.ELEVENLABS_AGENT_ID;
      const apiKey = process.env.ELEVENLABS_API_KEY;

      if (agentId && apiKey) {
        try {
          console.log(`[Twilio Inbound] Registering call with ElevenLabs. Agent ID: ${agentId}`);
          const elResponse = await fetch("https://api.elevenlabs.io/v1/convai/twilio/register-call", {
            method: "POST",
            headers: {
              "xi-api-key": apiKey,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              agent_id: agentId,
              from_number: from,
              to_number: to,
              direction: "inbound",
              conversation_initiation_client_data: {
                dynamic_variables: {
                  company_id: company.id,
                  company_name: company.name,
                },
              },
            }),
          });

          if (elResponse.ok) {
            const text = await elResponse.text();
            let twiml = "";
            try {
              const parsed = JSON.parse(text);
              twiml = parsed.twiml || parsed.response || "";
            } catch {
              twiml = text;
            }

            if (twiml && twiml.includes("<Response>")) {
              console.log("[Twilio Inbound] Successfully generated ElevenLabs TwiML payload");
              return new NextResponse(twiml, {
                headers: { "Content-Type": "text/xml" },
              });
            }
          } else {
            const errText = await elResponse.text();
            console.error("[Twilio Inbound] ElevenLabs register-call endpoint returned error:", errText);
          }
        } catch (err) {
          console.error("[Twilio Inbound] Failed calling ElevenLabs register-call endpoint:", err);
        }
      }

      // Fallback: If ElevenLabs API fails or is not configured, stream with custom media parameters
      const fallbackAgentId = agentId || process.env.ELEVENLABS_AGENT_ID || "";
      if (fallbackAgentId) {
        console.log(`[Twilio Inbound] Falling back to custom media stream TwiML. Agent ID: ${fallbackAgentId}`);
        const stream = response.connect().stream({
          url: `wss://api.elevenlabs.io/v1/convai/twilio/streams?agent_id=${fallbackAgentId}`,
        });
        stream.parameter({ name: "company_id", value: company.id });
        stream.parameter({ name: "company_name", value: company.name });

        return new NextResponse(response.toString(), {
          headers: { "Content-Type": "text/xml" },
        });
      }

      response.say("Thank you for calling. We are connecting you to our automated agent.");
    } else {
      // Outbound call routing or fallback behavior
      const callerId = process.env.TWILIO_PHONE_NUMBER || "+16592137866";
      if (to) {
        const dial = response.dial({ callerId });
        if (/^[\d\+\-\(\) ]+$/.test(to)) {
          dial.number(to);
        } else {
          dial.client(to);
        }
      } else {
        response.say("Thank you for calling. No destination was specified.");
      }
    }

    const twiml = response.toString();
    return new NextResponse(twiml, {
      headers: {
        "Content-Type": "text/xml",
      },
    });
  } catch (error: any) {
    console.error("Twilio voice error:", error);
    
    const VoiceResponse = twilio.twiml.VoiceResponse;
    const fallback = new VoiceResponse();
    fallback.say("We encountered a server error while connecting the call. Please check your setup.");
    
    return new NextResponse(fallback.toString(), { 
      status: 200, 
      headers: { "Content-Type": "text/xml" } 
    });
  }
}
