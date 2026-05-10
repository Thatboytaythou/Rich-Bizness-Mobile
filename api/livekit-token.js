import { AccessToken } from "livekit-server-sdk";

export default async function handler(req, res) {
  try {
    const { room, username } = req.query;

    if (!room || !username) {
      return res.status(400).json({
        error: "Missing room or username"
      });
    }

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;

    if (!apiKey || !apiSecret) {
      return res.status(500).json({
        error: "Missing LiveKit env vars"
      });
    }

    // 🔥 Create token
    const at = new AccessToken(apiKey, apiSecret, {
      identity: username,
      ttl: "10m", // expires in 10 minutes (important)
    });

    // 🔥 Permissions
    at.addGrant({
      roomJoin: true,
      room: room,
      canPublish: true,
      canSubscribe: true,
    });

    const token = await at.toJwt();

    return res.status(200).json({ token });

  } catch (err) {
    console.error("LiveKit Token Error:", err);

    return res.status(500).json({
      error: "Token generation failed"
    });
  }
}
