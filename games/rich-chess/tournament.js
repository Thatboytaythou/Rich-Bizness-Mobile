/* =========================
   RICH BIZNESS — RICH CHESS
   /games/rich-chess/tournaments.js
   Realtime Tournament Lobby
========================= */

import { supabase, getCurrentUserAndProfile } from "./multiplayer.js";

function safeTitle(value = "") {
  return String(value || "").trim() || "Rich Chess Tournament";
}

function makeTournamentSlug(title = "rich-chess") {
  return String(title)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || `rich-chess-${Date.now()}`;
}

async function ensureTournamentLobby() {
  const { data, error } = await supabase
    .from("chess_tournaments")
    .select("*")
    .in("status", ["open", "active"])
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    console.warn("Tournament lobby load skipped:", error.message);
    return [];
  }

  if (data?.length) return data;

  const title = "Rich Chess Grandmaster Open";

  const { data: created, error: createError } = await supabase
    .from("chess_tournaments")
    .insert({
      title,
      slug: makeTournamentSlug(title),
      status: "open",
      tournament_type: "single_elimination",
      entry_fee_cents: 0,
      prize_cents: 0,
      currency: "usd",
      max_players: 32,
      current_players: 0,
      starts_at: null,
      metadata: {
        source: "rich-chess",
        app: "Rich Bizness Mobile",
        created_by_system: true
      }
    })
    .select("*")
    .single();

  if (createError) {
    console.warn("Default tournament create skipped:", createError.message);
    return [];
  }

  return created ? [created] : [];
}

function renderTournamentOptions(selectEl, tournaments = []) {
  if (!selectEl) return;

  if (!tournaments.length) {
    selectEl.innerHTML = `<option value="">No tournament open</option>`;
    return;
  }

  selectEl.innerHTML = `
    <option value="">Choose tournament</option>
    ${tournaments.map((tournament) => {
      const players = Number(tournament.current_players || 0);
      const max = Number(tournament.max_players || 32);

      return `
        <option value="${tournament.id}">
          ${safeTitle(tournament.title)} — ${players}/${max}
        </option>
      `;
    }).join("")}
  `;
}

async function joinChessTournament(tournamentId) {
  if (!tournamentId) {
    throw new Error("Choose a tournament first");
  }

  const { user, profile } = await getCurrentUserAndProfile();

  if (!user) {
    window.location.href = "/auth.html";
    throw new Error("Sign in required to join tournament");
  }

  const { data: tournament, error: tournamentError } = await supabase
    .from("chess_tournaments")
    .select("*")
    .eq("id", tournamentId)
    .single();

  if (tournamentError) throw tournamentError;
  if (!tournament) throw new Error("Tournament not found");

  const { data: existing } = await supabase
    .from("chess_tournament_players")
    .select("*")
    .eq("tournament_id", tournamentId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) return existing;

  const { count } = await supabase
    .from("chess_tournament_players")
    .select("*", { count: "exact", head: true })
    .eq("tournament_id", tournamentId);

  const seed = Number(count || 0) + 1;

  const playerName =
    profile?.display_name ||
    profile?.username ||
    user.email?.split("@")[0] ||
    "Rich Player";

  const { data, error } = await supabase
    .from("chess_tournament_players")
    .insert({
      tournament_id: tournamentId,
      user_id: user.id,
      username: profile?.username || user.email?.split("@")[0] || null,
      display_name: playerName,
      seed,
      status: "registered",
      metadata: {
        avatar_url: profile?.avatar_url || null,
        joined_from: "rich-chess"
      }
    })
    .select("*")
    .single();

  if (error) throw error;

  await supabase
    .from("chess_tournaments")
    .update({
      current_players: seed,
      updated_at: new Date().toISOString()
    })
    .eq("id", tournamentId);

  return data;
}

async function loadTournamentPlayers(tournamentId) {
  if (!tournamentId) return [];

  const { data, error } = await supabase
    .from("chess_tournament_players")
    .select("*")
    .eq("tournament_id", tournamentId)
    .order("seed", { ascending: true });

  if (error) {
    console.warn("Tournament players skipped:", error.message);
    return [];
  }

  return data || [];
}

export {
  ensureTournamentLobby,
  joinChessTournament,
  renderTournamentOptions,
  loadTournamentPlayers
};
