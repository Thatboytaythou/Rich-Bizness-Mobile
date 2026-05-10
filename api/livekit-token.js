import { AccessToken } from "livekit-server-sdk";

export default async function handler(req, res) {
  try {
    const { room, username } = req.query;

    // ✅ Validate input
    if (!room) {
      return res.status(400).json({
        error: "Missing room"
      });
    }

    // 🔥 Clean username (VERY IMPORTANT)
    let identity = "guest";

    if (username) {
      try {
        // If it's JSON (from localStorage), parse it
        const parsed = JSON.parse(username);
        identity = parsed.email || "guest";
      } catch {
        // If it's already a string, use it
        identity = username;
      }
    }

    // 🔥 Clean identity (no weird characters)
    identity = identity.toString().replace(/[^a-zA-Z0-9_-]/g, "");

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;

    if (!apiKey || !apiSecret) {
      console.error("❌ Missing ENV:", {
        apiKey: !!apiKey,
        apiSecret: !!apiSecret
      });

      return res.status(500).json({
        error: "Missing LiveKit env vars"
      });
    }

    // ✅ Create token
    const at = new AccessToken(apiKey, apiSecret, {
      identity,
      ttl: "10m",
    });

    // ✅ Permissions
    at.addGrant({
      roomJoin: true,
      room,
      canPublish: true,
      canSubscribe: true,
    });

    const token = await at.toJwt();

    // 🔥 Debug log (shows in Vercel logs)
    console.log("✅ Token created:", {
      room,
      identity
    });

    return res.status(200).json({ token });

  } catch (err) {
    console.error("❌ LiveKit Token Error:", err);

    return res.status(500).json({
      error: "Token generation failed"
    });
  }
}
