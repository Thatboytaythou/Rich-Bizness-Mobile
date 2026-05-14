/* =========================
   RICH BIZNESS — RICH CHESS
   /games/rich-chess/game.js
   Final Elite Controller + Camera + FX + Sound
========================= */

import {
  COLORS,
  getStartingBoard,
  getPieceSymbol,
  getPieceClass,
  getCapturedSummary,
  boardToFenLite
} from "/pieces.js";

import {
  getLegalMoves,
  makeMove,
  getGameStatus,
  oppositeColor,
  algebraic
} from "/engine.js";

import { getCpuMove, getCpuMoveLabel, explainCpuMove } from "./ai.js";

import {
  createChessRoom,
  joinChessRoom,
  loadChessRoom,
  saveMoveToRoom,
  resignRoom,
  subscribeToRoom,
  getRoomCodeFromUrl,
  getRoomLink,
  getCurrentUserAndProfile,
  getPlayerColor,
  canPlayerMove,
  roomToBoard
} from "/multiplayer.js";

import {
  ensureTournamentLobby,
  joinChessTournament,
  renderTournamentOptions
} from "/tournaments.js";

import {
  resetCamera,
  pulseBoard,
  cinematicMove,
  flashVictory
} from "/camera.js";

import {
  explodeSquare,
  glowPiece,
  showMoveTrail,
  rainVictory,
  boardPowerPulse
} from "/effects.js";

import {
  playMoveSound,
  playSelectSound,
  playCaptureSound,
  playCheckSound,
  playWinSound,
  playErrorSound,
  playRoomSound,
  playTournamentSound
} from "/sound.js";

const $ = (id) => document.getElementById(id);

const els = {
  board: $("chessBoard"),
  statMode: $("statMode"),
  statTurn: $("statTurn"),
  statMoves: $("statMoves"),
  statStatus: $("statStatus"),
  whiteName: $("whiteName"),
  blackName: $("blackName"),
  whiteClock: $("whiteClock"),
  blackClock: $("blackClock"),
  whiteAvatar: $("whiteAvatar"),
  blackAvatar: $("blackAvatar"),
  newGameBtn: $("newGameBtn"),
  createRoomBtn: $("createRoomBtn"),
  joinRoomBtn: $("joinRoomBtn"),
  resignBtn: $("resignBtn"),
  roomCodeInput: $("roomCodeInput"),
  matchTypeInput: $("matchTypeInput"),
  copyRoomBtn: $("copyRoomBtn"),
  tournamentSelect: $("tournamentSelect"),
  joinTournamentBtn: $("joinTournamentBtn"),
  moveList: $("moveList"),
  whiteCaptured: $("whiteCaptured"),
  blackCaptured: $("blackCaptured"),
  status: $("chessStatus")
};

let board = getStartingBoard();
let turn = COLORS.WHITE;
let selected = null;
let legalMoves = [];
let moveHistory = [];
let capturedWhite = [];
let capturedBlack = [];
let mode = "solo";
let cpuEnabled = true;
let cpuLevel = "elite";
let gameOver = false;
let currentUser = null;
let currentProfile = null;
let currentRoom = null;
let playerColor = null;
let tournaments = [];

function setStatus(message) {
  if (els.status) els.status.textContent = message || "";
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getName() {
  return currentProfile?.display_name || currentProfile?.username || currentUser?.email?.split("@")[0] || "Rich Player";
}

function getInitial(name = "R") {
  return String(name || "R").trim().slice(0, 1).toUpperCase();
}

function squareColor(row, col) {
  return (row + col) % 2 === 0 ? "light" : "dark";
}

function sameSquare(a, b) {
  return a && b && a.row === b.row && a.col === b.col;
}

function isLegalTarget(row, col) {
  return legalMoves.find((move) => move.to.row === row && move.to.col === col) || null;
}

function moveNotation(move) {
  const piece = move.piece?.label || "Piece";
  const from = algebraic(move.from.row, move.from.col);
  const to = algebraic(move.to.row, move.to.col);
  const cap = move.captured ? "x" : "→";
  const promo = move.promotion ? "=Q" : "";
  return `${piece} ${from} ${cap} ${to}${promo}`;
}

function hydrateRoomState(room) {
  currentRoom = room;
  const roomBoard = roomToBoard(room);

  if (roomBoard) board = roomBoard;

  turn = room.current_turn || room.board_state?.turn || COLORS.WHITE;
  moveHistory = Array.isArray(room.moves) ? room.moves : [];
  mode = "multiplayer";
  cpuEnabled = false;
  playerColor = getPlayerColor(room, currentUser?.id);

  els.roomCodeInput.value = room.room_code || "";

  const meta = room.metadata || {};
  els.whiteName.textContent = meta.white_player_name || "White Player";
  els.blackName.textContent = meta.black_player_name || (room.black_player_id ? "Black Player" : "Waiting...");

  gameOver = ["checkmate", "stalemate", "resigned", "completed"].includes(room.status);

  selected = null;
  legalMoves = [];

  renderAll();
  boardPowerPulse();
}

function renderBoard() {
  els.board.innerHTML = "";

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      const move = isLegalTarget(row, col);

      const square = document.createElement("button");
      square.className = [
        "square",
        squareColor(row, col),
        sameSquare(selected, { row, col }) ? "selected" : "",
        move ? (move.capture || move.captured ? "capture" : "legal") : ""
      ].filter(Boolean).join(" ");

      square.type = "button";
      square.dataset.row = String(row);
      square.dataset.col = String(col);
      square.setAttribute("aria-label", `${algebraic(row, col)} ${piece?.label || "empty"}`);

      if (piece) {
        const span = document.createElement("span");
        span.className = `piece ${getPieceClass(piece)} ${piece.color}`;
        span.textContent = getPieceSymbol(piece);
        square.appendChild(span);
      }

      els.board.appendChild(square);
    }
  }

  resetCamera();
}

function renderHud() {
  const status = getGameStatus(board, turn);

  els.statMode.textContent = mode === "multiplayer"
    ? "MULTI"
    : getCpuMoveLabel(cpuLevel).replace("CPU ", "");

  els.statTurn.textContent = turn.toUpperCase();
  els.statMoves.textContent = String(moveHistory.length);
  els.statStatus.textContent = gameOver ? status.label : status.label;

  if (mode === "solo") {
    els.whiteName.textContent = getName();
    els.blackName.textContent = getCpuMoveLabel(cpuLevel);
    els.whiteAvatar.textContent = getInitial(getName());
    els.blackAvatar.textContent = "C";
  }

  if (mode === "multiplayer") {
    els.statMode.textContent = playerColor ? `MULTI ${playerColor.toUpperCase()}` : "SPECTATE";
  }
}

function renderMoves() {
  if (!moveHistory.length) {
    els.moveList.innerHTML = `<div class="empty">No moves yet.</div>`;
    return;
  }

  els.moveList.innerHTML = moveHistory.map((move, index) => `
    <div class="move-item">
      <span>${index + 1}. ${escapeHtml(move.notation || move.label || "Move")}</span>
      <strong>${escapeHtml((move.color || "").toUpperCase())}</strong>
    </div>
  `).join("");
}

function renderCaptured() {
  els.whiteCaptured.textContent = getCapturedSummary(capturedWhite);
  els.blackCaptured.textContent = getCapturedSummary(capturedBlack);
}

function renderAll() {
  renderBoard();
  renderHud();
  renderMoves();
  renderCaptured();
}

function canTouchBoard() {
  if (gameOver) return false;

  if (mode === "solo") return turn === COLORS.WHITE;

  if (!currentRoom || !currentUser) return false;

  return canPlayerMove(currentRoom, currentUser.id);
}

function selectSquare(row, col) {
  const piece = board[row][col];

  if (!canTouchBoard()) {
    playErrorSound();
    setStatus(mode === "multiplayer" ? "WAITING ON YOUR TURN" : "CPU THINKING");
    return;
  }

  if (selected) {
    const move = isLegalTarget(row, col);

    if (move) {
      playMove(move);
      return;
    }
  }

  if (!piece || piece.color !== turn) {
    selected = null;
    legalMoves = [];
    playErrorSound();
    renderBoard();
    return;
  }

  selected = { row, col };
  legalMoves = getLegalMoves(board, selected);

  playSelectSound();

  setStatus(`${piece.label.toUpperCase()} SELECTED — ${legalMoves.length} MOVES`);
  renderBoard();

  const selectedSquare = els.board.querySelector(`[data-row="${row}"][data-col="${col}"]`);
  glowPiece(selectedSquare?.querySelector(".piece"));
}

async function playMove(move, saveRemote = true) {
  const beforeTurn = turn;
  const fromSquare = els.board.querySelector(`[data-row="${move.from.row}"][data-col="${move.from.col}"]`);
  const toSquare = els.board.querySelector(`[data-row="${move.to.row}"][data-col="${move.to.col}"]`);

  const result = makeMove(board, move);
  board = result.board;

  if (result.captured) {
    playCaptureSound();
    explodeSquare(toSquare);

    if (result.captured.color === COLORS.WHITE) capturedWhite.push(result.captured);
    if (result.captured.color === COLORS.BLACK) capturedBlack.push(result.captured);
  } else {
    playMoveSound();
  }

  showMoveTrail(fromSquare, toSquare);
  cinematicMove(fromSquare, toSquare);

  const record = {
    color: beforeTurn,
    notation: moveNotation(move),
    label: moveNotation(move),
    from: move.from,
    to: move.to,
    captured: move.captured ? {
      type: move.captured.type,
      color: move.captured.color,
      symbol: move.captured.symbol
    } : null,
    promotion: move.promotion || null,
    created_at: new Date().toISOString()
  };

  moveHistory.push(record);

  turn = oppositeColor(turn);
  selected = null;
  legalMoves = [];

  const status = getGameStatus(board, turn);

  if (status.status === "checkmate" || status.status === "stalemate") {
    gameOver = true;
    playWinSound();
    rainVictory();
    flashVictory();
    setStatus(status.label);
  } else if (status.status === "check") {
    playCheckSound();
    setStatus(`${turn.toUpperCase()} IN CHECK`);
  } else {
    setStatus(`${turn.toUpperCase()} TO MOVE`);
  }

  renderAll();

  if (mode === "multiplayer" && currentRoom?.id && saveRemote) {
    try {
      const winnerId =
        status.winner && currentRoom
          ? status.winner === COLORS.WHITE
            ? currentRoom.white_player_id
            : currentRoom.black_player_id
          : null;

      const updated = await saveMoveToRoom({
        roomId: currentRoom.id,
        board,
        turn,
        move: record,
        status: gameOver ? status.status : "active",
        winnerId
      });

      currentRoom = updated;
    } catch (error) {
      setStatus(`ROOM SAVE ERROR: ${error.message}`);
    }
  }

  if (mode === "solo" && cpuEnabled && !gameOver && turn === COLORS.BLACK) {
    window.setTimeout(cpuMove, 520);
  }
}

async function cpuMove() {
  if (gameOver || turn !== COLORS.BLACK) return;

  setStatus("ELITE CPU THINKING...");

  const move = getCpuMove(board, COLORS.BLACK, cpuLevel);

  if (!move) {
    const status = getGameStatus(board, turn);
    gameOver = true;
    setStatus(status.label);
    renderAll();
    return;
  }

  setStatus(explainCpuMove(move));
  await playMove(move, false);
}

function newGame() {
  board = getStartingBoard();
  turn = COLORS.WHITE;
  selected = null;
  legalMoves = [];
  moveHistory = [];
  capturedWhite = [];
  capturedBlack = [];
  gameOver = false;
  mode = "solo";
  cpuEnabled = true;
  currentRoom = null;
  playerColor = null;

  els.roomCodeInput.value = "";

  playRoomSound();
  pulseBoard();
  renderAll();
  setStatus("NEW ELITE SOLO GAME READY");
}

async function createRoom() {
  try {
    const matchType = els.matchTypeInput.value || "casual";
    const tournamentId = els.tournamentSelect.value || null;

    setStatus("CREATING MULTIPLAYER ROOM...");

    const room = await createChessRoom({ board, turn, matchType, tournamentId });

    hydrateRoomState(room);
    subscribeToRoom(room.id, hydrateRoomState);

    const link = getRoomLink(room.room_code);
    await navigator.clipboard?.writeText(link).catch(() => null);

    playRoomSound();
    setStatus(`ROOM CREATED: ${room.room_code}`);
  } catch (error) {
    playErrorSound();
    setStatus(`ROOM ERROR: ${error.message}`);
  }
}

async function joinRoom() {
  const roomCode = els.roomCodeInput.value.trim() || getRoomCodeFromUrl();

  if (!roomCode) {
    playErrorSound();
    setStatus("ROOM CODE REQUIRED");
    return;
  }

  try {
    setStatus("JOINING ROOM...");

    const room = await joinChessRoom(roomCode);
    hydrateRoomState(room);
    subscribeToRoom(room.id, hydrateRoomState);

    playRoomSound();
    setStatus(`JOINED ROOM: ${room.room_code}`);
  } catch (error) {
    playErrorSound();
    setStatus(`JOIN ERROR: ${error.message}`);
  }
}

async function copyRoom() {
  const roomCode = els.roomCodeInput.value.trim() || currentRoom?.room_code;

  if (!roomCode) {
    playErrorSound();
    setStatus("NO ROOM TO COPY");
    return;
  }

  const link = getRoomLink(roomCode);

  try {
    await navigator.clipboard.writeText(link);
    playRoomSound();
    setStatus("ROOM LINK COPIED");
  } catch {
    prompt("Copy room link:", link);
  }
}

async function resign() {
  if (mode === "multiplayer" && currentRoom?.id) {
    try {
      const room = await resignRoom(currentRoom.id);
      hydrateRoomState(room);
      gameOver = true;
      playErrorSound();
      setStatus("YOU RESIGNED");
    } catch (error) {
      setStatus(`RESIGN ERROR: ${error.message}`);
    }
    return;
  }

  gameOver = true;
  playErrorSound();
  setStatus("GAME RESIGNED");
  renderAll();
}

async function loadTournaments() {
  tournaments = await ensureTournamentLobby();
  renderTournamentOptions(els.tournamentSelect, tournaments);
}

async function joinTournament() {
  const tournamentId = els.tournamentSelect.value;

  try {
    const entry = await joinChessTournament(tournamentId);
    playTournamentSound();
    setStatus(`TOURNAMENT JOINED — SEED ${entry.seed || "READY"}`);
  } catch (error) {
    playErrorSound();
    setStatus(`TOURNAMENT ERROR: ${error.message}`);
  }
}

async function bootFromRoomIfPresent() {
  const roomCode = getRoomCodeFromUrl();

  if (!roomCode) return false;

  try {
    setStatus("LOADING ROOM FROM LINK...");

    const room = await loadChessRoom(roomCode);

    if (!room) {
      setStatus("ROOM LINK NOT FOUND");
      return false;
    }

    hydrateRoomState(room);

    if (currentUser) {
      playerColor = getPlayerColor(room, currentUser.id);
    }

    subscribeToRoom(room.id, hydrateRoomState);
    playRoomSound();
    setStatus(`ROOM LOADED: ${room.room_code}`);
    return true;
  } catch (error) {
    setStatus(`ROOM LOAD ERROR: ${error.message}`);
    return false;
  }
}

els.board.addEventListener("click", (event) => {
  const square = event.target.closest(".square");
  if (!square) return;

  selectSquare(Number(square.dataset.row), Number(square.dataset.col));
});

els.newGameBtn?.addEventListener("click", newGame);
els.createRoomBtn?.addEventListener("click", createRoom);
els.joinRoomBtn?.addEventListener("click", joinRoom);
els.copyRoomBtn?.addEventListener("click", copyRoom);
els.resignBtn?.addEventListener("click", resign);
els.joinTournamentBtn?.addEventListener("click", joinTournament);

async function bootGame() {
  setStatus("BOOTING RICH CHESS ENGINE...");

  const auth = await getCurrentUserAndProfile();
  currentUser = auth.user;
  currentProfile = auth.profile;

  await loadTournaments();

  renderAll();
  boardPowerPulse();

  const loadedRoom = await bootFromRoomIfPresent();

  if (!loadedRoom) {
    setStatus("RICH CHESS READY — ELITE CPU ACTIVE");
  }

  console.log("Rich Chess FEN:", boardToFenLite(board, turn));
}

bootGame();
