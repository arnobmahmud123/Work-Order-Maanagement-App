# Conversational AI Text Chat & SMS Integration

This is a unified integration package that connects your existing **ElevenLabs Conversational AI Agent** (originally configured for voice calls) to **Text Chat** channels:
1. **Web Chat Widget**: A sleek, glassmorphic floating chat widget for your website, communicating over WebSockets via secure Server-Signed URLs.
2. **Twilio SMS Webhook**: An API endpoint that receives SMS text messages sent to your Twilio Phone Number, routes them to your ElevenLabs Agent, and texts the agent's response back to the user.

---

## 📁 Project Structure

```text
text-chat-integration/
├── public/
│   ├── index.html     # Floating chat widget HTML markup
│   ├── style.css      # Rich glassmorphic design system & styles
│   └── chat.js        # Client-side WebSocket controller for ElevenLabs
├── server.js          # Node.js / Express backend with webhooks & signed URL generation
├── package.json       # Dependencies list and scripts
├── .env.example       # Example env variables file
└── README.md          # Setup & configuration guide (this file)
```

---

## 🛠️ Step 1: Installation & Setup

1. Navigate to the `text-chat-integration` directory:
   ```bash
   cd text-chat-integration
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create your `.env` configuration file by duplicating the example file:
   ```bash
   cp .env.example .env
   ```

4. Open `.env` and fill in your actual credentials:
   ```env
   PORT=5001

   # Twilio Credentials (found on your Twilio Console home page)
   TWILIO_ACCOUNT_SID=ACXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
   TWILIO_AUTH_TOKEN=your_twilio_auth_token_here
   TWILIO_PHONE_NUMBER=+12345678901

   # ElevenLabs Credentials (found in ElevenLabs Developer Console)
   ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
   ELEVENLABS_AGENT_ID=your_elevenlabs_agent_id_here
   ```

---

## 🚀 Step 2: Running the Server Locally

Start the integration server in development mode:
```bash
npm run dev
```

The console will indicate that the server is running:
- **Web Widget Demo Page**: [http://localhost:5001](http://localhost:5001)
- **Twilio SMS Webhook**: `http://localhost:5001/api/twilio-sms`

Open [http://localhost:5001](http://localhost:5001) in your browser and click the floating chat button in the bottom right corner to test the AI Agent conversation immediately!

---

## 📲 Step 3: Configuring the Twilio SMS Webhook

To route SMS messages sent to your Twilio phone number to this local server, you need to expose your local port (`5001`) to the internet and configure it in Twilio.

### 1. Expose Localhost to the Internet
Use a tunneling tool like **ngrok** to create a public URL:
```bash
ngrok http 5001
```

Copy the generated forwarding URL (e.g. `https://a1b2-34-56-78.ngrok-free.app`).

### 2. Configure Twilio Console
1. Log in to the [Twilio Console](https://console.twilio.com/).
2. Navigate to **Phone Numbers** > **Manage** > **Active Numbers**.
3. Click on the phone number you want to use for SMS interactions.
4. Scroll down to the **Messaging** section.
5. Under **Configure with**, select **Webhook, TwiML Bin, Function, Studio Flow, or Proxy**.
6. In the **A Message Comes In** field:
   - Select **Webhook**.
   - Paste your ngrok forwarding URL and append the webhook endpoint path:
     `https://your-ngrok-subdomain.ngrok-free.app/api/twilio-sms`
   - Select **HTTP POST** from the dropdown menu.
7. Click **Save Configuration** at the bottom of the page.

Send a text message from your mobile phone to your Twilio Phone Number, and your ElevenLabs agent will reply back to your phone via SMS!

---

## 🔒 Security Best Practice

This implementation uses **Signed URLs** for the Web Widget:
- **Why**: Exposing your master `ELEVENLABS_API_KEY` in the browser's frontend JavaScript is a massive security risk.
- **How**: The client-side code requests a temporary URL from your backend `/api/signed-url` endpoint. The backend server authenticates with ElevenLabs using the secret key and returns a short-lived URL containing a secure signature, which the browser uses to establish the WebSocket connection.
