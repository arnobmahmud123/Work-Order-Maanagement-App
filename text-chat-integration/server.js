require("dotenv").config();
const express = require("express");
const cors = require("cors");
const twilio = require("twilio");
const WebSocket = require("ws");

const app = express();
const PORT = process.env.PORT || 5001;

// Middlewares
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static("public"));

// Environment verification helper
const verifyConfig = () => {
  const missing = [];
  if (!process.env.ELEVENLABS_API_KEY) missing.push("ELEVENLABS_API_KEY");
  if (!process.env.ELEVENLABS_AGENT_ID) missing.push("ELEVENLABS_AGENT_ID");
  if (!process.env.TWILIO_ACCOUNT_SID) missing.push("TWILIO_ACCOUNT_SID");
  if (!process.env.TWILIO_AUTH_TOKEN) missing.push("TWILIO_AUTH_TOKEN");
  
  if (missing.length > 0) {
    console.warn(`[Config] WARNING: Missing variables in .env: ${missing.join(", ")}`);
  }
};
verifyConfig();

/**
 * Helper: Connects to ElevenLabs via WebSocket to exchange a single text message.
 * This is used for async channels like Twilio SMS where persistent WebSockets are not possible.
 */
function askElevenLabs(userText) {
  return new Promise((resolve, reject) => {
    const agentId = process.env.ELEVENLABS_AGENT_ID;
    const apiKey = process.env.ELEVENLABS_API_KEY;

    if (!agentId || !apiKey) {
      return reject(new Error("ElevenLabs credentials are not configured in .env"));
    }

    const url = `wss://api.elevenlabs.io/v1/convai/conversation?agent_id=${agentId}`;
    
    // Connect to ElevenLabs WebSocket server
    const ws = new WebSocket(url, {
      headers: {
        "xi-api-key": apiKey,
      },
    });

    let agentReply = "";
    
    // Safety timeout: abort after 10 seconds if no reply is received
    const timeout = setTimeout(() => {
      console.error("[ElevenLabs] Response timeout exceeded.");
      ws.close();
      reject(new Error("ElevenLabs response timeout"));
    }, 10000);

    ws.on("open", () => {
      console.log("[ElevenLabs] WebSocket opened. Sending user message...");
      
      // Initialize the conversation config as text-only override
      const initMsg = {
        type: "conversation_initiation_client_data",
        conversation_config_override: {
          agent: {
            first_message: "" // Suppress initial spoken greeting since this is SMS
          }
        }
      };
      ws.send(JSON.stringify(initMsg));

      // Send the actual text message from the user
      const userMsg = {
        type: "user_message",
        user_message: userText,
      };
      ws.send(JSON.stringify(userMsg));
    });

    ws.on("message", (data) => {
      try {
        const parsed = JSON.parse(data.toString());
        
        // Listen for the agent response text event
        if (parsed.type === "agent_response" && parsed.agent_response_event) {
          agentReply = parsed.agent_response_event.agent_response;
          console.log(`[ElevenLabs] Received agent response: "${agentReply}"`);
          
          clearTimeout(timeout);
          ws.close();
          resolve(agentReply);
        }
      } catch (err) {
        // Suppress parsing errors for other message types (e.g. status updates)
      }
    });

    ws.on("error", (err) => {
      console.error("[ElevenLabs] WebSocket error:", err.message);
      clearTimeout(timeout);
      reject(err);
    });

    ws.on("close", (code, reason) => {
      console.log(`[ElevenLabs] WebSocket closed. Code: ${code}, Reason: ${reason}`);
      clearTimeout(timeout);
      if (!agentReply) {
        reject(new Error("Connection closed without response from ElevenLabs"));
      }
    });
  });
}

/**
 * 1. Web Chat Endpoint: Fetches a temporary, signed WebSocket URL for the frontend.
 * This keeps the ElevenLabs API Key secure on the server side.
 */
app.get("/api/signed-url", async (req, res) => {
  const agentId = process.env.ELEVENLABS_AGENT_ID;
  const apiKey = process.env.ELEVENLABS_API_KEY;

  if (!agentId || !apiKey) {
    return res.status(500).json({ error: "ElevenLabs credentials not configured" });
  }

  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${agentId}`,
      {
        method: "GET",
        headers: {
          "xi-api-key": apiKey,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ElevenLabs API returned ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log("[API] Generated signed URL successfully");
    res.json({ signedUrl: data.signed_url });
  } catch (error) {
    console.error("[API] Failed to get signed URL:", error.message);
    res.status(500).json({ error: "Failed to generate session token", details: error.message });
  }
});

/**
 * 2. Twilio SMS Webhook Endpoint: Receives incoming SMS texts, routes them to
 * ElevenLabs, and replies to the sender with a TwiML response.
 */
app.post("/api/twilio-sms", async (req, res) => {
  const userText = req.body.Body;
  const senderNumber = req.body.From;

  console.log(`[Twilio SMS] Incoming from ${senderNumber}: "${userText}"`);

  if (!userText) {
    const twiml = new twilio.twiml.MessagingResponse();
    return res.type("text/xml").send(twiml.toString());
  }

  try {
    // Send message to ElevenLabs and get the text response
    const replyText = await askElevenLabs(userText);

    // Create a TwiML response to send back via SMS
    const twiml = new twilio.twiml.MessagingResponse();
    twiml.message(replyText);

    res.type("text/xml").send(twiml.toString());
  } catch (error) {
    console.error("[Twilio SMS] Error processing webhook:", error.message);
    
    // Fallback response in case of error
    const twiml = new twilio.twiml.MessagingResponse();
    twiml.message("Sorry, I'm having trouble processing your message right now.");
    res.type("text/xml").send(twiml.toString());
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`\n🚀 Server is running on port ${PORT}`);
  console.log(`👉 Web chat index page: http://localhost:${PORT}`);
  console.log(`👉 Twilio SMS Webhook POST endpoint: http://localhost:${PORT}/api/twilio-sms`);
});
