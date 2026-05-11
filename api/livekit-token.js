import { AccessToken } from "livekit-server-sdk";

/* =========================
   RICH BIZNESS MOBILE
   LIVEKIT TOKEN API
   /api/livekit-token.js
========================= */

function cleanValue(value = "guest") {
  return String(value)
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .slice(0, 80) || "guest";
}

function readParam(value) {
  if (!value) return "";

  if (Array.isArray(value)) return value[0] || "";

  try {
    const parsed = JSON.parse(value);
    return parsed?.email || parsed?.username || parsed?.id || value;
  } catch {
    return value;
  }
}

export default async function handler(req, res) {
  try {
    if (req.method !== "GET" && req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const input = req.method === "POST" ? req.body || {} : req.query || {};

    const room = cleanValue(readParam(input.room || input.roomName || "richbiz-live"));
    const username = cleanValue(readParam(input.username || input.identity || "guest"));
    const role = cleanValue(readParam(input.role || "viewer"));

    const canPublish =
      role === "host" ||
      role === "cohost" ||
      input.canPublish === true ||
      input.canPublish === "true";

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;

    if (!apiKey || !apiSecret) {
      return res.status(500).json({
        error: "Missing LiveKit env vars"
      });
    }

    const token = new AccessToken(apiKey, apiSecret, {
      identity: username,
      name: username,
      ttl: "2h",
      metadata: JSON.stringify({
        app: "Rich Bizness Mobile",
        role
      })
    });

    token.addGrant({
      roomJoin: true,
      room,
      canPublish,
      canSubscribe: true,
      canPublishData: true,
      canUpdateOwnMetadata: true
    });

    const jwt = await token.toJwt();

    return res.status(200).json({
      token: jwt,
      room,
      identity: username,
      role,
      canPublish
    });
  } catch (error) {
    console.error("LiveKit token error:", error);

    return res.status(500).json({
      error: error.message || "Token generation failed"
    });
  }
}
