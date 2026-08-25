export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";

// In-memory cache for Cloudflare TURN key ID (worker process lifetime)
let cachedTurnKeyId: string | null = null;

// ── Cloudflare Calls TURN ────────────────────────────────────────────────────
async function getCloudflareIceServers(
  accountId: string,
  apiToken: string
): Promise<any[] | null> {
  try {
    // 1. Find or create the TURN key
    if (!cachedTurnKeyId) {
      const listRes = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/calls/turn_keys`,
        { headers: { Authorization: `Bearer ${apiToken}` } }
      );
      if (listRes.ok) {
        const listData = await listRes.json();
        if (listData.result?.length > 0) {
          cachedTurnKeyId = listData.result[0].id;
          console.log("[ICE] Found existing CF TURN key:", cachedTurnKeyId);
        }
      }

      if (!cachedTurnKeyId) {
        const createRes = await fetch(
          `https://api.cloudflare.com/client/v4/accounts/${accountId}/calls/turn_keys`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ name: "proppreserve-turn" }),
          }
        );
        if (createRes.ok) {
          const createData = await createRes.json();
          cachedTurnKeyId = createData.result?.id ?? null;
          console.log("[ICE] Created new CF TURN key:", cachedTurnKeyId);
        } else {
          const err = await createRes.text();
          console.error("[ICE] CF TURN key creation failed:", err);
        }
      }
    }

    if (!cachedTurnKeyId) return null;

    // 2. Generate short-lived credentials
    const credRes = await fetch(
      `https://rtc.live.cloudflare.com/v1/turn/keys/${cachedTurnKeyId}/credentials/generate`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ttl: 86400 }),
      }
    );

    if (!credRes.ok) {
      const err = await credRes.text();
      console.error("[ICE] CF TURN credentials failed:", credRes.status, err);
      return null;
    }

    const credData = await credRes.json();
    console.log("[ICE] CF TURN raw response keys:", Object.keys(credData));

    // Cloudflare returns either a single RTCIceServer object OR an array
    const raw = credData.iceServers;
    if (!raw) return null;
    const servers = Array.isArray(raw) ? raw : [raw];
    console.log("[ICE] CF TURN servers count:", servers.length);
    return servers;
  } catch (err) {
    console.error("[ICE] CF TURN unexpected error:", err);
    return null;
  }
}

// ── Twilio Network Traversal Service ─────────────────────────────────────────
async function getTwilioIceServers(
  accountSid: string,
  authToken: string
): Promise<any[] | null> {
  try {
    const credentials = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Tokens.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    if (!res.ok) {
      console.error("[ICE] Twilio NTS failed:", res.status);
      return null;
    }

    const data = await res.json();
    if (!data.ice_servers?.length) return null;

    // Normalize Twilio's format to RTCIceServer format
    const servers = data.ice_servers.map((s: any) => ({
      urls: s.urls || s.url,
      ...(s.username && { username: s.username }),
      ...(s.credential && { credential: s.credential }),
    }));
    console.log("[ICE] Twilio NTS servers count:", servers.length);
    return servers;
  } catch (err) {
    console.error("[ICE] Twilio NTS unexpected error:", err);
    return null;
  }
}

// ── Main handler ──────────────────────────────────────────────────────────────
export async function GET() {
  const stunOnly = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun.cloudflare.com:3478" },
  ];

  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;
  const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;

  // ── Try Cloudflare TURN ─────────────────────────────────────────────────
  if (accountId && apiToken) {
    const cfServers = await getCloudflareIceServers(accountId, apiToken);
    if (cfServers?.length) {
      const all = [...stunOnly, ...cfServers];
      console.log("[ICE] Returning CF TURN + STUN:", all.length, "servers");
      return NextResponse.json({ iceServers: all });
    }
  }

  // ── Fall back: Twilio NTS ───────────────────────────────────────────────
  if (twilioAccountSid && twilioAuthToken) {
    const twilioServers = await getTwilioIceServers(twilioAccountSid, twilioAuthToken);
    if (twilioServers?.length) {
      const all = [...stunOnly, ...twilioServers];
      console.log("[ICE] Returning Twilio TURN + STUN:", all.length, "servers");
      return NextResponse.json({ iceServers: all });
    }
  }

  // ── Final fallback: STUN only ───────────────────────────────────────────
  console.warn("[ICE] No TURN available, returning STUN only");
  return NextResponse.json({ iceServers: stunOnly });
}
