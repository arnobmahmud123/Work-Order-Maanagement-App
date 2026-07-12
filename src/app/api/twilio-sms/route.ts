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
// Uses standard Edge/Worker global WebSocket constructor.
function askElevenLabs(userText: string, agentId: string, apiKey: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = `wss://api.elevenlabs.io/v1/convai/conversation?agent_id=${agentId}`;
    
    // Cloudflare Workers support native outbound WebSockets
    const ws = new WebSocket(url);

    let agentReply = "";
    let isFirstResponse = true;
    
    // Safety timeout: abort if no response within 8 seconds
    const timeout = setTimeout(() => {
      console.error("[ElevenLabs SMS] Response timeout exceeded.");
      try {
        ws.close();
      } catch {}
      reject(new Error("ElevenLabs response timeout"));
    }, 8000);

    ws.onopen = () => {
      console.log("[ElevenLabs SMS] WebSocket opened. Sending message...");
      
      // Send the user message (no overrides to avoid 1008 policy violation)
      const userMsg = {
        type: "user_message",
        text: userText,
      };
      ws.send(JSON.stringify(userMsg));
    };

    ws.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        
        // Listen for the agent response text event
        if (parsed.type === "agent_response" && parsed.agent_response_event) {
          const reply = parsed.agent_response_event.agent_response;
          
          if (isFirstResponse) {
            console.log(`[ElevenLabs SMS] Ignored initial greeting: "${reply}"`);
            isFirstResponse = false;
            return;
          }

          agentReply = reply;
          console.log(`[ElevenLabs SMS] Received reply: "${agentReply}"`);
          
          clearTimeout(timeout);
          try {
            ws.close();
          } catch {}
          resolve(agentReply);
        }
      } catch (err) {
        // Ignore parsing errors for voice/metadata binary frames
      }
    };

    ws.onerror = (error) => {
      console.error("[ElevenLabs SMS] WebSocket error:", error);
      clearTimeout(timeout);
      reject(error);
    };

    ws.onclose = () => {
      clearTimeout(timeout);
      if (!agentReply) {
        reject(new Error("WebSocket closed without response from ElevenLabs"));
      }
    };
  });
}

export async function POST(req: NextRequest) {
  const agentId = process.env.ELEVENLABS_AGENT_ID || process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID;
  const apiKey = process.env.ELEVENLABS_API_KEY;

  if (!agentId || !apiKey) {
    console.error("[Twilio SMS] Missing ElevenLabs env keys");
    const errorXml = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>Configuration Error: API keys missing.</Message></Response>`;
    return new NextResponse(errorXml, {
      headers: { "Content-Type": "text/xml" }
    });
  }

  try {
    // Twilio sends data as URL-encoded form POST
    const formData = await req.formData();
    const userText = formData.get("Body") as string;
    const senderNumber = formData.get("From") as string;
    const twilioNumber = (formData.get("To") as string) || "";
    const mediaUrl = (formData.get("MediaUrl0") as string) || null;

    console.log(`[Twilio SMS] Incoming from ${senderNumber}: "${userText}" (media: ${mediaUrl})`);

    if ((!userText || userText.trim() === "") && !mediaUrl) {
      const emptyXml = `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`;
      return new NextResponse(emptyXml, {
        headers: { "Content-Type": "text/xml" }
      });
    }

    // Save Inbound Message
    try {
      await prisma.smsMessage.create({
        data: {
          from: senderNumber,
          to: twilioNumber,
          body: userText || "[Attachment]",
          direction: "INBOUND",
          mediaUrl: mediaUrl,
          type: "SMS"
        }
      });
    } catch (dbErr) {
      console.error("[Twilio SMS] DB Error saving inbound message:", dbErr);
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
        }
      });
    } catch (dbErr) {
      console.error("[Twilio SMS] DB Error saving outbound message:", dbErr);
    }

    // Format raw TwiML response (lightweight, safe for edge runtime)
    const twimlXml = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escapeXml(replyText)}</Message></Response>`;
    
    return new NextResponse(twimlXml, {
      headers: { "Content-Type": "text/xml" }
    });

  } catch (error: any) {
    console.error("[Twilio SMS] Webhook handler error:", error.message || error);
    
    const fallbackXml = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>Sorry, I'm having trouble processing your request right now.</Message></Response>`;
    
    return new NextResponse(fallbackXml, {
      headers: { "Content-Type": "text/xml" }
    });
  }
}
