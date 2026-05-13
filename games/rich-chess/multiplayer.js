/* =========================
   RICH BIZNESS — RICH CHESS
   /games/rich-chess/multiplayer.js
   Realtime Room + Match Sync
========================= */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { COLORS, boardToFenLite } from "./pieces.js";

const SUPABASE_URL = "https://zsancpcyhdidrlezggrl.supabase.co";
const SUPABASE_KEY = "sb_publishable_Hahozdb2FpB9cDsoWEEJzQ_WA_xdWV2";

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

let roomChannel = null;

export function createRoomCode() {
  return `RC-${Math.random().toString(36).slice(2, 6).toUpperCase()}-${Date.now()
    .toString(36)
    .slice(-4)
    .toUpperCase()}`;
}

export function getRoomCodeFromUrl() {
  return new URLSearchParams(window.location.search).get("room");
}

export function setRoomCodeInUrl(roomCode) {
  const url = new URL(window.location.href);
  url.searchParams.set("room", roomCode);
  window.history.replaceState({}, "", url.toString());
}

export function getRoomLink(roomCode) {
  const url = new URL(window.location.href);
  url.searchParams.set("room", roomCode);
  return url.toString();
}

export async function getCurrentUserAndProfile() {
  const { data } = await supabase.auth.getUser();
  const user = data?.user || null;

  if (!user) {
    return { user: null, profile: null };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  return {
    user,
    profile: profile || null
  };
}

export function getPlayerName(profile, user) {
  return (
    profile?.display_name ||
    profile?.username ||
    user?.email?.split("@")[0] ||
    "Rich Player"
  );
}

export async function createChessRoom({
  board,
  turn = COLORS.WHITE,
  matchType = "casual",
  tournamentId = null
}) {
  const { user, profile } = await getCurrentUserAndProfile();

  if (!user) {
    throw new Error("Sign in required to create a room.");
  }

  const roomCode = createRoomCode();

  const payload = {
    room_code: roomCode,
    creator_id: user.id,
    white_player_id: user.id,
    black_player_id: null,
    current_turn: turn,
    status: "waiting",
    match_type: matchType,
    tournament_id: tournamentId,
    board_state: {
      board,
      fen: boardToFenLite(board, turn),
      turn,
      move_number: 0
    },
    metadata: {
      app: "Rich Bizness Mobile",
      source: "rich-chess",
      white_player_name: getPlayerName(profile, user),
      created_at: new Date().toISOString()
    }
  };

  const { data, error } = await supabase
    .from("chess_matches")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  setRoomCodeInUrl(roomCode);
  return data;
}

export async function loadChessRoom(roomCode) {
  if (!roomCode) return null;

  const { data, error } = await supabase
    .from("chess_matches")
    .select("*")
    .eq("room_code", roomCode)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data || null;
}

export async function joinChessRoom(roomCode) {
  const { user, profile } = await getCurrentUserAndProfile();

  if (!user) {
    throw new Error("Sign in required to join multiplayer.");
  }

  const room = await loadChessRoom(roomCode);

  if (!room) {
    throw new Error("Room not found.");
  }

  if (room.black_player_id && room.white_player_id !== user.id && room.black_player_id !== user.id) {
    throw new Error("Room already has two players.");
  }

  const updates = {
    status: room.status === "waiting" ? "active" : room.status,
    updated_at: new Date().toISOString(),
    metadata: {
      ...(room.metadata || {}),
      black_player_name:
        room.black_player_id || room.white_player_id === user.id
          ? room.metadata?.black_player_name || "Black Player"
          : getPlayerName(profile, user)
    }
  };

  if (!room.black_player_id && room.white_player_id !== user.id) {
    updates.black_player_id = user.id;
  }

  const { data, error } = await supabase
    .from("chess_matches")
    .update(updates)
    .eq("id", room.id)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  setRoomCodeInUrl(roomCode);
  return data;
}

export async function saveMoveToRoom({
  roomId,
  board,
  turn,
  move,
  status = "active",
  winnerId = null
}) {
  const { user } = await getCurrentUserAndProfile();

  if (!user) {
    throw new Error("Sign in required to save move.");
  }

  const { data: room, error: readError } = await supabase
    .from("chess_matches")
    .select("*")
    .eq("id", roomId)
    .maybeSingle();

  if (readError) throw readError;
  if (!room) throw new Error("Room missing.");

  const moves = Array.isArray(room.moves) ? room.moves : [];

  const moveRecord = {
    ...move,
    player_id: user.id,
    move_number: moves.length + 1,
    created_at: new Date().toISOString()
  };

  const updatedMoves = [...moves, moveRecord];

  const { data, error } = await supabase
    .from("chess_matches")
    .update({
      board_state: {
        board,
        fen: boardToFenLite(board, turn),
        turn,
        move_number: updatedMoves.length
      },
      moves: updatedMoves,
      current_turn: turn,
      status,
      winner_id: winnerId,
      updated_at: new Date().toISOString()
    })
    .eq("id", roomId)
    .select("*")
    .single();

  if (error) throw error;

  return data;
}

export async function resignRoom(roomId) {
  const { user } = await getCurrentUserAndProfile();

  if (!user) {
    throw new Error("Sign in required.");
  }

  const { data: room, error: readError } = await supabase
    .from("chess_matches")
    .select("*")
    .eq("id", roomId)
    .maybeSingle();

  if (readError) throw readError;
  if (!room) throw new Error("Room missing.");

  const winnerId =
    room.white_player_id === user.id
      ? room.black_player_id
      : room.white_player_id;

  const { data, error } = await supabase
    .from("chess_matches")
    .update({
      status: "resigned",
      winner_id: winnerId || null,
      updated_at: new Date().toISOString(),
      metadata: {
        ...(room.metadata || {}),
        resigned_by: user.id,
        resigned_at: new Date().toISOString()
      }
    })
    .eq("id", roomId)
    .select("*")
    .single();

  if (error) throw error;

  return data;
}

export function subscribeToRoom(roomId, onChange) {
  if (roomChannel) {
    supabase.removeChannel(roomChannel);
  }

  roomChannel = supabase
    .channel(`rich-chess-room-${roomId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "chess_matches",
        filter: `id=eq.${roomId}`
      },
      (payload) => {
        if (payload.new) onChange(payload.new);
      }
    )
    .subscribe();

  return roomChannel;
}

export function unsubscribeRoom() {
  if (roomChannel) {
    supabase.removeChannel(roomChannel);
    roomChannel = null;
  }
}

export function getPlayerColor(room, userId) {
  if (!room || !userId) return null;
  if (room.white_player_id === userId) return COLORS.WHITE;
  if (room.black_player_id === userId) return COLORS.BLACK;
  return null;
}

export function canPlayerMove(room, userId) {
  const color = getPlayerColor(room, userId);
  if (!color) return false;

  return room.current_turn === color && ["active", "waiting"].includes(room.status);
}

export function roomToBoard(room) {
  return room?.board_state?.board || null;
}
