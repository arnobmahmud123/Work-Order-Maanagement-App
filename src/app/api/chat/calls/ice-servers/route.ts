export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";

// Cache the TURN key ID in memory to avoid re-fetching on every call
let cachedTurnKeyId: string | null = null;

export async function GET() {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;

  const fallback = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
      { urls: "stun:stun.cloudflare.com:3478" },
    ],
  };

  if (!accountId || !apiToken) {
    console.warn("[ICE Servers] Missing Cloudflare credentials — using STUN only");
    return NextResponse.json(fallback);
  }

  try {
    // ── Step 1: Find or create a Cloudflare TURN key ────────────────────
    if (!cachedTurnKeyId) {
      const listRes = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/calls/turn_keys`,
        {
          headers: {
            Authorization: `Bearer ${apiToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (listRes.ok) {
        const listData = await listRes.json();
        if (listData.result?.length > 0) {
          cachedTurnKeyId = listData.result[0].id;
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
        }
      }
    }

    if (!cachedTurnKeyId) {
      console.warn("[ICE Servers] Could not obtain TURN key — using STUN only");
      return NextResponse.json(fallback);
    }

    // ── Step 2: Generate short-lived TURN credentials ────────────────────
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
      const errText = await credRes.text();
      console.error("[ICE Servers] TURN credential error:", errText);
      return NextResponse.json(fallback);
    }

    const credData = await credRes.json();
    const turnServers: any[] = credData.iceServers ?? [];

    return NextResponse.json({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        ...turnServers,
      ],
    });
  } catch (err) {
    console.error("[ICE Servers] Unexpected error:", err);
    return NextResponse.json(fallback);
  }
}
