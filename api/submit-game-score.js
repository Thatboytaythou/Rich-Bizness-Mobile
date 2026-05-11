export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const {
      gameSlug,
      score = 0,
      mode = "Arcade",
      result = "score submitted",
      userId,
      username,
      metadata = {}
    } = req.body || {};

    if (!gameSlug) {
      return res.status(400).json({ error: "Missing gameSlug" });
    }

    if (!userId) {
      return res.status(400).json({ error: "Missing userId" });
    }

    const cleanScore = Number(score);

    if (!Number.isFinite(cleanScore) || cleanScore <= 0) {
      return res.status(400).json({ error: "Score must be greater than 0" });
    }

    const supabaseUrl =
      process.env.SUPABASE_URL ||
      process.env.NEXT_PUBLIC_SUPABASE_URL;

    const serviceRoleKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return res.status(500).json({
        error: "Missing Supabase server environment variables"
      });
    }

    const { createClient } = await import("@supabase/supabase-js");

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });

    const { data: game, error: gameError } = await supabase
      .from("games")
      .select("*")
      .eq("slug", gameSlug)
      .maybeSingle();

    if (gameError) {
      return res.status(500).json({ error: gameError.message });
    }

    if (!game) {
      return res.status(404).json({ error: "Game not found" });
    }

    const playerName = username || "player";

    const { data: insertedScore, error: scoreError } = await supabase
      .from("game_scores")
      .insert({
        game_id: game.id,
        game_slug: game.slug,
        user_id: userId,
        username: playerName,
        score: cleanScore,
        mode,
        metadata: {
          ...metadata,
          result,
          source: "api/submit-game-score",
          app: "Rich Bizness Mobile"
        }
      })
      .select("*")
      .single();

    if (scoreError) {
      return res.status(500).json({ error: scoreError.message });
    }

    if (cleanScore > Number(game.high_score || 0)) {
      await supabase
        .from("games")
        .update({ high_score: cleanScore })
        .eq("id", game.id);
    }

    await supabase
      .from("game_sessions")
      .insert({
        game_id: game.id,
        game_slug: game.slug,
        user_id: userId,
        username: playerName,
        ended_at: new Date().toISOString(),
        result,
        score: cleanScore,
        metadata: {
          ...metadata,
          source: "api/submit-game-score",
          app: "Rich Bizness Mobile"
        }
      });

    return res.status(200).json({
      ok: true,
      score: insertedScore,
      gameSlug: game.slug
    });
  } catch (error) {
    console.error("submit-game-score error:", error);

    return res.status(500).json({
      error: error.message || "Internal server error"
    });
  }
}
