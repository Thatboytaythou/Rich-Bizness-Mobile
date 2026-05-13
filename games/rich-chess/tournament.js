/* =========================
   RICH BIZNESS — RICH CHESS
   /games/rich-chess/tournaments.js
   Tournament Lobby + Entry Engine
========================= */

import { supabase, getCurrentUserAndProfile, getPlayerName } from "./multiplayer.js";

export async function loadChessTournaments() {
  const { data, error } = await supabase
    .from("chess_tournaments")
    .select("*")
    .in("status", ["open", "active"])
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) {
    console.warn("Tournament load error:", error.message);
    return [];
  }

  return data || [];
}

export async function createStarterTournament() {
  const { user, profile } = await getCurrentUserAndProfile();

  if (!user) {
    throw new Error("Sign in required to create tournament.");
  }

  const title = "Rich Chess Open Arena";

  const { data, error } = await supabase
    .from("chess_tournaments")
    .insert({
      creator_id: user.id,
      title,
      description: "Elite Rich Bizness chess bracket. Join, battle, rank up, and build your chess legacy.",
      status: "open",
      entry_fee_cents: 0,
      prize_cents: 0,
      currency: "usd",
      max_players: 16,
      current_players: 0,
      metadata: {
        source: "rich-chess",
        created_by_name: getPlayerName(profile, user),
        created_at: new Date().toISOString()
      }
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function ensureTournamentLobby() {
  const tournaments = await loadChessTournaments();

  if (tournaments.length) {
    return tournaments;
  }

  try {
    const starter = await createStarterTournament();
    return starter ? [starter] : [];
  } catch (error) {
    console.warn("Starter tournament skipped:", error.message);
    return [];
  }
}

export async function joinChessTournament(tournamentId) {
  const { user, profile } = await getCurrentUserAndProfile();

  if (!user) {
    throw new Error("Sign in required to join tournament.");
  }

  if (!tournamentId) {
    throw new Error("Choose a tournament first.");
  }

  const { data: existing, error: existingError } = await supabase
    .from("chess_tournament_entries")
    .select("*")
    .eq("tournament_id", tournamentId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existingError) throw existingError;

  if (existing) {
    return existing;
  }

  const { data: tournament, error: tournamentError } = await supabase
    .from("chess_tournaments")
    .select("*")
    .eq("id", tournamentId)
    .maybeSingle();

  if (tournamentError) throw tournamentError;
  if (!tournament) throw new Error("Tournament not found.");

  const maxPlayers = Number(tournament.max_players || 16);
  const currentPlayers = Number(tournament.current_players || 0);

  if (currentPlayers >= maxPlayers) {
    throw new Error("Tournament is full.");
  }

  const { data, error } = await supabase
    .from("chess_tournament_entries")
    .insert({
      tournament_id: tournamentId,
      user_id: user.id,
      username: profile?.username || user.email?.split("@")[0] || "player",
      display_name: getPlayerName(profile, user),
      status: "joined",
      seed: currentPlayers + 1,
      score: 0,
      metadata: {
        source: "rich-chess",
        joined_at: new Date().toISOString()
      }
    })
    .select("*")
    .single();

  if (error) throw error;

  await supabase
    .from("chess_tournaments")
    .update({
      current_players: currentPlayers + 1,
      updated_at: new Date().toISOString()
    })
    .eq("id", tournamentId);

  return data;
}

export async function loadTournamentEntries(tournamentId) {
  if (!tournamentId) return [];

  const { data, error } = await supabase
    .from("chess_tournament_entries")
    .select("*")
    .eq("tournament_id", tournamentId)
    .order("seed", { ascending: true });

  if (error) {
    console.warn("Tournament entries error:", error.message);
    return [];
  }

  return data || [];
}

export function renderTournamentOptions(selectEl, tournaments = []) {
  if (!selectEl) return;

  if (!tournaments.length) {
    selectEl.innerHTML = `<option value="">No tournaments open</option>`;
    return;
  }

  selectEl.innerHTML = tournaments
    .map((tournament) => {
      const players = `${Number(tournament.current_players || 0)}/${Number(tournament.max_players || 16)}`;
      return `
        <option value="${tournament.id}">
          ${escapeOption(tournament.title || "Rich Chess Tournament")} — ${players}
        </option>
      `;
    })
    .join("");
}

function escapeOption(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export async function recordTournamentResult({
  tournamentId,
  matchId,
  winnerId,
  loserId,
  result = "win"
}) {
  if (!tournamentId || !winnerId) return null;

  const { data: winnerEntry } = await supabase
    .from("chess_tournament_entries")
    .select("*")
    .eq("tournament_id", tournamentId)
    .eq("user_id", winnerId)
    .maybeSingle();

  if (winnerEntry?.id) {
    await supabase
      .from("chess_tournament_entries")
      .update({
        score: Number(winnerEntry.score || 0) + 1,
        status: "advanced",
        metadata: {
          ...(winnerEntry.metadata || {}),
          last_result: result,
          last_match_id: matchId || null,
          updated_at: new Date().toISOString()
        }
      })
      .eq("id", winnerEntry.id);
  }

  if (loserId) {
    const { data: loserEntry } = await supabase
      .from("chess_tournament_entries")
      .select("*")
      .eq("tournament_id", tournamentId)
      .eq("user_id", loserId)
      .maybeSingle();

    if (loserEntry?.id) {
      await supabase
        .from("chess_tournament_entries")
        .update({
          status: "eliminated",
          metadata: {
            ...(loserEntry.metadata || {}),
            last_result: "loss",
            last_match_id: matchId || null,
            updated_at: new Date().toISOString()
          }
        })
        .eq("id", loserEntry.id);
    }
  }

  return true;
}
