import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// Helper to escape special characters for XML compliance
function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case "<": return "&lt;";
      case ">": return "&gt;";
      case "&": return "&amp;";
      case "'": return "&apos;";
      case '"': return "&quot;";
      default: return c;
    }
  });
}

// Connects to ElevenLabs via WebSocket to exchange a single text message.
function askElevenLabs(userText: string, agentId: string, apiKey: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = `wss://api.elevenlabs.io/v1/convai/conversation?agent_id=${agentId}`;
    const ws = new WebSocket(url);

    let agentReply = "";
    let isFirstResponse = true;
    
    const timeout = setTimeout(() => {
      console.error("[ElevenLabs SMS] Response timeout exceeded.");
      try {
        ws.close();
      } catch {}
      reject(new Error("ElevenLabs response timeout"));
    }, 8000);

    ws.onopen = () => {
      const userMsg = {
        type: "user_message",
        text: userText,
      };
      ws.send(JSON.stringify(userMsg));
    };

    ws.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        if (parsed.type === "agent_response" && parsed.agent_response_event) {
          const reply = parsed.agent_response_event.agent_response;
          if (isFirstResponse) {
            isFirstResponse = false;
            return;
          }
          agentReply = reply;
          clearTimeout(timeout);
          try {
            ws.close();
          } catch {}
          resolve(agentReply);
        }
      } catch (err) {}
    };

    ws.onerror = (error) => {
      clearTimeout(timeout);
      reject(error);
    };

    ws.onclose = () => {
      clearTimeout(timeout);
      if (!agentReply) {
        reject(new Error("WebSocket closed without response"));
      }
    };
  });
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const userText = formData.get("Body") as string;
    const senderNumber = formData.get("From") as string;
    const twilioNumber = (formData.get("To") as string) || "";
    const mediaUrl = (formData.get("MediaUrl0") as string) || null;

    console.log(`[Twilio SMS Webhook] Incoming from ${senderNumber} to ${twilioNumber}`);

    if ((!userText || userText.trim() === "") && !mediaUrl) {
      const emptyXml = `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`;
      return new NextResponse(emptyXml, { headers: { "Content-Type": "text/xml" } });
    }

    // Resolve Company from the incoming twilioNumber
    const company = await prisma.company.findFirst({
      where: { twilioPhone: twilioNumber }
    });

    const companyId = company?.id || null;
    const agentId = company?.elevenlabsAgentId || process.env.ELEVENLABS_AGENT_ID || process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID;
    const apiKey = process.env.ELEVENLABS_API_KEY;

    // Save Inbound Message
    try {
      await prisma.smsMessage.create({
        data: {
          from: senderNumber,
          to: twilioNumber,
          body: userText || "[Attachment]",
          direction: "INBOUND",
          mediaUrl: mediaUrl,
          type: "SMS",
          companyId: companyId
        }
      });
    } catch (dbErr) {
      console.error("[Twilio SMS] DB Error saving inbound message:", dbErr);
    }

    if (!agentId || !apiKey) {
      console.error("[Twilio SMS] Missing ElevenLabs credentials");
      const errorXml = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>Service temporarily unavailable.</Message></Response>`;
      return new NextResponse(errorXml, { headers: { "Content-Type": "text/xml" } });
    }

    // Call ElevenLabs Conversational AI
    const replyText = await askElevenLabs(userText, agentId, apiKey);

    // Save Outbound Message
    try {
      await prisma.smsMessage.create({
        data: {
          from: twilioNumber,
          to: senderNumber,
          body: replyText,
          direction: "OUTBOUND",
          companyId: companyId
        }
      });
    } catch (dbErr) {
      console.error("[Twilio SMS] DB Error saving outbound message:", dbErr);
    }

    const twimlXml = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escapeXml(replyText)}</Message></Response>`;
    
    return new NextResponse(twimlXml, {
      headers: { "Content-Type": "text/xml" }
    });

  } catch (error: any) {
    console.error("[Twilio SMS] Webhook handler error:", error.message || error);
    const fallbackXml = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>Sorry, I'm having trouble processing your request right now.</Message></Response>`;
    return new NextResponse(fallbackXml, { headers: { "Content-Type": "text/xml" } });
  }
}
