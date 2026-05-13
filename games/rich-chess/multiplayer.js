/* =========================
   RICH BIZNESS — RICH CHESS
   /games/rich-chess/multiplayer.js
   Realtime Rooms + Supabase Sync
========================= */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import {
  COLORS,
  getStartingBoard,
  boardToJson,
  boardFromJson
} from "./pieces.js";

const SUPABASE_URL = "https://zsancpcyhdidrlezggrl.supabase.co";
const SUPABASE_KEY = "sb_publishable_Hahozdb2FpB9cDsoWEEJzQ_WA_xdWV2";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

let currentUserCache = null;
let currentProfileCache = null;
let roomChannel = null;

function cleanCode(value = "") {
  return String(value)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 12);
}

function makeRoomCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "RB";

  for (let i = 0; i < 6; i++) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }

  return code;
}

function getRoomCodeFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return cleanCode(params.get("room") || params.get("code") || "");
}

function getRoomLink(roomCode) {
  const url = new URL(window.location.href);
  url.searchParams.set("room", cleanCode(roomCode));
  return url.toString();
}

function getName(profile, user) {
  return (
    profile?.display_name ||
    profile?.username ||
    user?.email?.split("@")[0] ||
    "Rich Player"
  );
}

async function getCurrentUserAndProfile() {
  if (currentUserCache) {
    return {
      user: currentUserCache,
      profile: currentProfileCache
    };
  }

  const { data } = await supabase.auth.getUser();
  const user = data?.user || null;

  currentUserCache = user;

  if (!user) {
    currentProfileCache = null;
    return { user: null, profile: null };
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, rich_level, rank_title, rich_points")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    console.warn("Rich Chess profile skipped:", error.message);
  }

  currentProfileCache = profile || null;

  return {
    user,
    profile: currentProfileCache
  };
}

function roomToBoard(room) {
  if (!room) return getStartingBoard();

  if (room.board_state?.board) {
    return boardFromJson(room.board_state.board);
  }

  if (Array.isArray(room.board_state)) {
    return boardFromJson(room.board_state);
  }

  return getStartingBoard();
}

function buildBoardState(board, turn) {
  return {
    board: boardToJson(board),
    turn,
    synced_at: new Date().toISOString()
  };
}

function getPlayerColor(room, userId) {
  if (!room || !userId) return null;

  if (room.white_player_id === userId) return COLORS.WHITE;
  if (room.black_player_id === userId) return COLORS.BLACK;

  return null;
}

function canPlayerMove(room, userId) {
  if (!room || !userId) return false;
  if (room.status !== "active" && room.status !== "waiting") return false;

  const color = getPlayerColor(room, userId);
  if (!color) return false;

  return room.current_turn === color;
}

async function createChessRoom({
  board = getStartingBoard(),
  turn = COLORS.WHITE,
  matchType = "casual",
  tournamentId = null
} = {}) {
  const { user, profile } = await getCurrentUserAndProfile();

  if (!user) {
    window.location.href = "/auth.html";
    throw new Error("Sign in required to create a room");
  }

  const roomCode = makeRoomCode();
  const playerName = getName(profile, user);

  const payload = {
    room_code: roomCode,
    created_by: user.id,
    white_player_id: user.id,
    black_player_id: null,
    current_turn: turn,
    status: "waiting",
    match_type: matchType,
    tournament_id: tournamentId || null,
    winner_id: null,
    board_state: buildBoardState(board, turn),
    moves: [],
    metadata: {
      source: "rich-chess",
      app: "Rich Bizness Mobile",
      white_player_name: playerName,
      white_avatar_url: profile?.avatar_url || null,
      match_type: matchType,
      created_at: new Date().toISOString()
    }
  };

  const { data, error } = await supabase
    .from("chess_rooms")
    .insert(payload)
    .select("*")
    .single();

  if (error) throw error;

  await safeInsertRoomPlayer({
    roomId: data.id,
    userId: user.id,
    color: COLORS.WHITE,
    role: "host",
    status: "active"
  });

  return data;
}

async function loadChessRoom(roomCode) {
  const code = cleanCode(roomCode);

  if (!code) return null;

  const { data, error } = await supabase
    .from("chess_rooms")
    .select("*")
    .eq("room_code", code)
    .maybeSingle();

  if (error) throw error;

  return data || null;
}

async function joinChessRoom(roomCode) {
  const { user, profile } = await getCurrentUserAndProfile();

  if (!user) {
    window.location.href = "/auth.html";
    throw new Error("Sign in required to join a room");
  }

  const room = await loadChessRoom(roomCode);

  if (!room) throw new Error("Room not found");

  const playerName = getName(profile, user);
  const existingColor = getPlayerColor(room, user.id);

  if (existingColor) {
    await safeInsertRoomPlayer({
      roomId: room.id,
      userId: user.id,
      color: existingColor,
      role: "player",
      status: "active"
    });

    return room;
  }

  if (!room.black_player_id) {
    const metadata = {
      ...(room.metadata || {}),
      black_player_name: playerName,
      black_avatar_url: profile?.avatar_url || null,
      joined_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from("chess_rooms")
      .update({
        black_player_id: user.id,
        status: "active",
        metadata,
        updated_at: new Date().toISOString()
      })
      .eq("id", room.id)
      .select("*")
      .single();

    if (error) throw error;

    await safeInsertRoomPlayer({
      roomId: room.id,
      userId: user.id,
      color: COLORS.BLACK,
      role: "player",
      status: "active"
    });

    return data;
  }

  await safeInsertRoomPlayer({
    roomId: room.id,
    userId: user.id,
    color: null,
    role: "spectator",
    status: "watching"
  });

  return room;
}

async function safeInsertRoomPlayer({ roomId, userId, color, role, status }) {
  if (!roomId || !userId) return null;

  const { data: existing } = await supabase
    .from("chess_room_players")
    .select("*")
    .eq("room_id", roomId)
    .eq("user_id", userId)
    .maybeSingle();

  const payload = {
    room_id: roomId,
    user_id: userId,
    color,
    role,
    status,
    joined_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  if (existing?.id) {
    const { data } = await supabase
      .from("chess_room_players")
      .update(payload)
      .eq("id", existing.id)
      .select("*")
      .single();

    return data || existing;
  }

  const { data, error } = await supabase
    .from("chess_room_players")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    console.warn("Room player skipped:", error.message);
    return null;
  }

  return data;
}

async function saveMoveToRoom({
  roomId,
  board,
  turn,
  move,
  status = "active",
  winnerId = null
}) {
  const { user } = await getCurrentUserAndProfile();

  if (!user) throw new Error("Sign in required");

  const { data: room, error: roomError } = await supabase
    .from("chess_rooms")
    .select("*")
    .eq("id", roomId)
    .single();

  if (roomError) throw roomError;

  const moves = Array.isArray(room.moves) ? [...room.moves] : [];
  moves.push(move);

  const updatePayload = {
    board_state: buildBoardState(board, turn),
    current_turn: turn,
    moves,
    status,
    winner_id: winnerId,
    updated_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from("chess_rooms")
    .update(updatePayload)
    .eq("id", roomId)
    .select("*")
    .single();

  if (error) throw error;

  await safeInsertMove({
    roomId,
    userId: user.id,
    move,
    moveNumber: moves.length,
    board,
    turn
  });

  return data;
}

async function safeInsertMove({
  roomId,
  userId,
  move,
  moveNumber,
  board,
  turn
}) {
  const payload = {
    room_id: roomId,
    user_id: userId,
    move_number: moveNumber,
    color: move.color || null,
    from_square: move.from ? `${move.from.row},${move.from.col}` : null,
    to_square: move.to ? `${move.to.row},${move.to.col}` : null,
    notation: move.notation || move.label || null,
    captured: move.captured || null,
    board_state: buildBoardState(board, turn),
    metadata: {
      move,
      source: "rich-chess"
    }
  };

  const { error } = await supabase
    .from("chess_moves")
    .insert(payload);

  if (error) {
    console.warn("Chess move log skipped:", error.message);
  }
}

async function resignRoom(roomId) {
  const { user } = await getCurrentUserAndProfile();

  if (!user) throw new Error("Sign in required");

  const { data: room, error: roomError } = await supabase
    .from("chess_rooms")
    .select("*")
    .eq("id", roomId)
    .single();

  if (roomError) throw roomError;

  const playerColor = getPlayerColor(room, user.id);
  const winnerId =
    playerColor === COLORS.WHITE
      ? room.black_player_id
      : room.white_player_id;

  const { data, error } = await supabase
    .from("chess_rooms")
    .update({
      status: "resigned",
      winner_id: winnerId || null,
      metadata: {
        ...(room.metadata || {}),
        resigned_by: user.id,
        resigned_color: playerColor,
        resigned_at: new Date().toISOString()
      },
      updated_at: new Date().toISOString()
    })
    .eq("id", roomId)
    .select("*")
    .single();

  if (error) throw error;

  return data;
}

function subscribeToRoom(roomId, callback) {
  if (roomChannel) {
    supabase.removeChannel(roomChannel);
    roomChannel = null;
  }

  roomChannel = supabase
    .channel(`rich-chess-room-${roomId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "chess_rooms",
        filter: `id=eq.${roomId}`
      },
      (payload) => {
        if (payload.new && typeof callback === "function") {
          callback(payload.new);
        }
      }
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "chess_moves",
        filter: `room_id=eq.${roomId}`
      },
      async () => {
        const { data } = await supabase
          .from("chess_rooms")
          .select("*")
          .eq("id", roomId)
          .maybeSingle();

        if (data && typeof callback === "function") {
          callback(data);
        }
      }
    )
    .subscribe();

  return roomChannel;
}

function unsubscribeFromRoom() {
  if (roomChannel) {
    supabase.removeChannel(roomChannel);
    roomChannel = null;
  }
}

export {
  supabase,
  createChessRoom,
  joinChessRoom,
  loadChessRoom,
  saveMoveToRoom,
  resignRoom,
  subscribeToRoom,
  unsubscribeFromRoom,
  getRoomCodeFromUrl,
  getRoomLink,
  getCurrentUserAndProfile,
  getPlayerColor,
  canPlayerMove,
  roomToBoard
};
