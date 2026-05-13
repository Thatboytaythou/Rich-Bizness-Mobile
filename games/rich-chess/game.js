import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/* =========================
   RICH BIZNESS RICH CHESS
   /games/rich-chess/game.js
   Elite Local Engine + Supabase Match/Tournament Sync
========================= */

const SUPABASE_URL = "https://zsancpcyhdidrlezggrl.supabase.co";
const SUPABASE_KEY = "sb_publishable_Hahozdb2FpB9cDsoWEEJzQ_WA_xdWV2";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

const $ = (id) => document.getElementById(id);

const els = {
  board: $("chessBoard"),
  status: $("gameStatus"),

  statMode: $("statMode"),
  statTurn: $("statTurn"),
  statMoves: $("statMoves"),
  statState: $("statState"),

  whiteName: $("whiteName"),
  blackName: $("blackName"),
  whiteMeta: $("whiteMeta"),
  blackMeta: $("blackMeta"),

  newGameBtn: $("newGameBtn"),
  flipBoardBtn: $("flipBoardBtn"),
  undoBtn: $("undoBtn"),
  resignBtn: $("resignBtn"),

  matchModeInput: $("matchModeInput"),
  matchNameInput: $("matchNameInput"),
  createMatchBtn: $("createMatchBtn"),
  joinMatchBtn: $("joinMatchBtn"),
  matchCodeInput: $("matchCodeInput"),

  tournamentNameInput: $("tournamentNameInput"),
  tournamentEntryInput: $("tournamentEntryInput"),
  createTournamentBtn: $("createTournamentBtn"),
  joinTournamentBtn: $("joinTournamentBtn"),

  moveList: $("moveList"),
  capturedWhite: $("capturedWhite"),
  capturedBlack: $("capturedBlack"),
  multiplayerStatus: $("multiplayerStatus"),
  tournamentStatus: $("tournamentStatus")
};

let currentUser = null;
let currentProfile = null;
let currentMatch = null;
let currentPlayer = null;
let realtimeChannel = null;

let selectedSquare = null;
let legalTargets = [];
let boardFlipped = false;
let gameOver = false;

const PIECES = {
  wK: "♔", wQ: "♕", wR: "♖", wB: "♗", wN: "♘", wP: "♙",
  bK: "♚", bQ: "♛", bR: "♜", bB: "♝", bN: "♞", bP: "♟"
};

const START_BOARD = [
  ["bR","bN","bB","bQ","bK","bB","bN","bR"],
  ["bP","bP","bP","bP","bP","bP","bP","bP"],
  [null,null,null,null,null,null,null,null],
  [null,null,null,null,null,null,null,null],
  [null,null,null,null,null,null,null,null],
  [null,null,null,null,null,null,null,null],
  ["wP","wP","wP","wP","wP","wP","wP","wP"],
  ["wR","wN","wB","wQ","wK","wB","wN","wR"]
];

const state = {
  board: cloneBoard(START_BOARD),
  turn: "w",
  moveNumber: 1,
  halfmove: 0,
  castling: { wK: true, wQ: true, bK: true, bQ: true },
  enPassant: null,
  history: [],
  captured: { w: [], b: [] },
  check: false,
  winner: null,
  result: "active"
};

function setStatus(message) {
  if (els.status) els.status.textContent = message || "";
}

function setMultiplayer(message) {
  if (els.multiplayerStatus) els.multiplayerStatus.textContent = message || "";
}

function setTournament(message) {
  if (els.tournamentStatus) els.tournamentStatus.textContent = message || "";
}

function cloneBoard(board) {
  return board.map((row) => [...row]);
}

function inBounds(r, c) {
  return r >= 0 && r < 8 && c >= 0 && c < 8;
}

function colorOf(piece) {
  return piece ? piece[0] : null;
}

function typeOf(piece) {
  return piece ? piece[1] : null;
}

function enemy(color) {
  return color === "w" ? "b" : "w";
}

function squareName(r, c) {
  return `${"abcdefgh"[c]}${8 - r}`;
}

function fromSquareName(square) {
  const file = square[0];
  const rank = Number(square[1]);
  return { r: 8 - rank, c: "abcdefgh".indexOf(file) };
}

function getPiece(r, c) {
  return inBounds(r, c) ? state.board[r][c] : null;
}

function sameSquare(a, b) {
  return a && b && a.r === b.r && a.c === b.c;
}

function isMyTurn() {
  if (!currentMatch || !currentPlayer) return true;
  return currentPlayer.color === state.turn;
}

function serializeState() {
  return {
    board: state.board,
    turn: state.turn,
    moveNumber: state.moveNumber,
    halfmove: state.halfmove,
    castling: state.castling,
    enPassant: state.enPassant,
    history: state.history,
    captured: state.captured,
    check: state.check,
    winner: state.winner,
    result: state.result,
    updated_at: new Date().toISOString()
  };
}

function hydrateState(payload = {}) {
  if (!payload.board) return;

  state.board = payload.board;
  state.turn = payload.turn || "w";
  state.moveNumber = payload.moveNumber || 1;
  state.halfmove = payload.halfmove || 0;
  state.castling = payload.castling || { wK: true, wQ: true, bK: true, bQ: true };
  state.enPassant = payload.enPassant || null;
  state.history = payload.history || [];
  state.captured = payload.captured || { w: [], b: [] };
  state.check = Boolean(payload.check);
  state.winner = payload.winner || null;
  state.result = payload.result || "active";
  gameOver = state.result !== "active";

  selectedSquare = null;
  legalTargets = [];
  render();
}

function resetGame() {
  state.board = cloneBoard(START_BOARD);
  state.turn = "w";
  state.moveNumber = 1;
  state.halfmove = 0;
  state.castling = { wK: true, wQ: true, bK: true, bQ: true };
  state.enPassant = null;
  state.history = [];
  state.captured = { w: [], b: [] };
  state.check = false;
  state.winner = null;
  state.result = "active";
  selectedSquare = null;
  legalTargets = [];
  gameOver = false;
  render();
  syncMatchState();
}

/* =========================
   MOVE ENGINE
========================= */

function findKing(color, board = state.board) {
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (board[r][c] === `${color}K`) return { r, c };
    }
  }
  return null;
}

function isSquareAttacked(r, c, byColor, board = state.board) {
  for (let rr = 0; rr < 8; rr++) {
    for (let cc = 0; cc < 8; cc++) {
      const piece = board[rr][cc];
      if (!piece || colorOf(piece) !== byColor) continue;

      const moves = pseudoMovesFor(rr, cc, board, true);
      if (moves.some((m) => m.to.r === r && m.to.c === c)) return true;
    }
  }
  return false;
}

function isInCheck(color, board = state.board) {
  const king = findKing(color, board);
  if (!king) return true;
  return isSquareAttacked(king.r, king.c, enemy(color), board);
}

function pushSlideMoves(moves, r, c, color, dirs, board) {
  for (const [dr, dc] of dirs) {
    let rr = r + dr;
    let cc = c + dc;

    while (inBounds(rr, cc)) {
      const target = board[rr][cc];

      if (!target) {
        moves.push({ from: { r, c }, to: { r: rr, c: cc } });
      } else {
        if (colorOf(target) !== color) {
          moves.push({ from: { r, c }, to: { r: rr, c: cc }, capture: target });
        }
        break;
      }

      rr += dr;
      cc += dc;
    }
  }
}

function pseudoMovesFor(r, c, board = state.board, attackOnly = false) {
  const piece = board[r][c];
  if (!piece) return [];

  const color = colorOf(piece);
  const type = typeOf(piece);
  const moves = [];

  if (type === "P") {
    const dir = color === "w" ? -1 : 1;
    const startRow = color === "w" ? 6 : 1;
    const promoteRow = color === "w" ? 0 : 7;

    for (const dc of [-1, 1]) {
      const rr = r + dir;
      const cc = c + dc;
      if (!inBounds(rr, cc)) continue;

      const target = board[rr][cc];

      if (attackOnly) {
        moves.push({ from: { r, c }, to: { r: rr, c: cc } });
      } else if (target && colorOf(target) !== color) {
        moves.push({
          from: { r, c },
          to: { r: rr, c: cc },
          capture: target,
          promotion: rr === promoteRow ? "Q" : null
        });
      }

      if (
        !attackOnly &&
        state.enPassant &&
        state.enPassant.r === rr &&
        state.enPassant.c === cc
      ) {
        moves.push({
          from: { r, c },
          to: { r: rr, c: cc },
          enPassant: true,
          capture: `${enemy(color)}P`
        });
      }
    }

    if (!attackOnly) {
      const one = r + dir;
      const two = r + dir * 2;

      if (inBounds(one, c) && !board[one][c]) {
        moves.push({
          from: { r, c },
          to: { r: one, c },
          promotion: one === promoteRow ? "Q" : null
        });

        if (r === startRow && inBounds(two, c) && !board[two][c]) {
          moves.push({ from: { r, c }, to: { r: two, c }, doublePawn: true });
        }
      }
    }
  }

  if (type === "N") {
    const jumps = [
      [-2,-1],[-2,1],[-1,-2],[-1,2],
      [1,-2],[1,2],[2,-1],[2,1]
    ];

    for (const [dr, dc] of jumps) {
      const rr = r + dr;
      const cc = c + dc;
      if (!inBounds(rr, cc)) continue;

      const target = board[rr][cc];
      if (!target || colorOf(target) !== color) {
        moves.push({
          from: { r, c },
          to: { r: rr, c: cc },
          capture: target || null
        });
      }
    }
  }

  if (type === "B") {
    pushSlideMoves(moves, r, c, color, [[1,1],[1,-1],[-1,1],[-1,-1]], board);
  }

  if (type === "R") {
    pushSlideMoves(moves, r, c, color, [[1,0],[-1,0],[0,1],[0,-1]], board);
  }

  if (type === "Q") {
    pushSlideMoves(moves, r, c, color, [[1,1],[1,-1],[-1,1],[-1,-1],[1,0],[-1,0],[0,1],[0,-1]], board);
  }

  if (type === "K") {
    for (const dr of [-1, 0, 1]) {
      for (const dc of [-1, 0, 1]) {
        if (dr === 0 && dc === 0) continue;

        const rr = r + dr;
        const cc = c + dc;
        if (!inBounds(rr, cc)) continue;

        const target = board[rr][cc];
        if (!target || colorOf(target) !== color) {
          moves.push({
            from: { r, c },
            to: { r: rr, c: cc },
            capture: target || null
          });
        }
      }
    }

    if (!attackOnly && !isInCheck(color, board)) {
      const row = color === "w" ? 7 : 0;

      if (
        state.castling[`${color}K`] &&
        !board[row][5] &&
        !board[row][6] &&
        !isSquareAttacked(row, 5, enemy(color), board) &&
        !isSquareAttacked(row, 6, enemy(color), board)
      ) {
        moves.push({ from: { r, c }, to: { r: row, c: 6 }, castle: "king" });
      }

      if (
        state.castling[`${color}Q`] &&
        !board[row][1] &&
        !board[row][2] &&
        !board[row][3] &&
        !isSquareAttacked(row, 3, enemy(color), board) &&
        !isSquareAttacked(row, 2, enemy(color), board)
      ) {
        moves.push({ from: { r, c }, to: { r: row, c: 2 }, castle: "queen" });
      }
    }
  }

  return moves;
}

function makeMoveOnBoard(board, move) {
  const next = cloneBoard(board);
  const piece = next[move.from.r][move.from.c];

  next[move.from.r][move.from.c] = null;

  if (move.enPassant) {
    const capRow = colorOf(piece) === "w" ? move.to.r + 1 : move.to.r - 1;
    next[capRow][move.to.c] = null;
  }

  if (move.castle === "king") {
    const row = move.to.r;
    next[row][5] = next[row][7];
    next[row][7] = null;
  }

  if (move.castle === "queen") {
    const row = move.to.r;
    next[row][3] = next[row][0];
    next[row][0] = null;
  }

  const promotionPiece = move.promotion ? `${colorOf(piece)}${move.promotion}` : piece;
  next[move.to.r][move.to.c] = promotionPiece;

  return next;
}

function legalMovesFor(r, c) {
  const piece = getPiece(r, c);
  if (!piece) return [];

  const color = colorOf(piece);
  if (color !== state.turn) return [];

  const pseudo = pseudoMovesFor(r, c);

  return pseudo.filter((move) => {
    const next = makeMoveOnBoard(state.board, move);
    return !isInCheck(color, next);
  });
}

function allLegalMoves(color = state.turn) {
  const out = [];

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = getPiece(r, c);
      if (piece && colorOf(piece) === color) {
        out.push(...legalMovesFor(r, c));
      }
    }
  }

  return out;
}

function applyMove(move) {
  if (gameOver) return false;

  const piece = getPiece(move.from.r, move.from.c);
  const captured = move.enPassant
    ? `${enemy(colorOf(piece))}P`
    : getPiece(move.to.r, move.to.c);

  const before = serializeState();

  state.board = makeMoveOnBoard(state.board, move);

  if (captured) {
    state.captured[colorOf(piece)].push(captured);
  }

  updateCastlingRights(piece, move);

  if (move.doublePawn) {
    state.enPassant = {
      r: (move.from.r + move.to.r) / 2,
      c: move.from.c
    };
  } else {
    state.enPassant = null;
  }

  const san = buildMoveNotation(piece, move, captured);
  state.history.push({
    moveNumber: state.moveNumber,
    color: state.turn,
    piece,
    from: squareName(move.from.r, move.from.c),
    to: squareName(move.to.r, move.to.c),
    capture: captured || null,
    notation: san,
    created_at: new Date().toISOString(),
    before
  });

  state.turn = enemy(state.turn);

  if (state.turn === "w") state.moveNumber += 1;

  state.check = isInCheck(state.turn);
  const legal = allLegalMoves(state.turn);

  if (!legal.length && state.check) {
    state.result = "checkmate";
    state.winner = enemy(state.turn);
    gameOver = true;
    setStatus(`${state.winner === "w" ? "WHITE" : "BLACK"} WINS BY CHECKMATE`);
  } else if (!legal.length) {
    state.result = "stalemate";
    state.winner = null;
    gameOver = true;
    setStatus("STALEMATE");
  } else if (state.check) {
    setStatus(`${state.turn === "w" ? "WHITE" : "BLACK"} IN CHECK`);
  } else {
    setStatus(`${state.turn === "w" ? "WHITE" : "BLACK"} TO MOVE`);
  }

  selectedSquare = null;
  legalTargets = [];
  render();
  syncMatchState();
  return true;
}

function updateCastlingRights(piece, move) {
  const color = colorOf(piece);
  const type = typeOf(piece);

  if (type === "K") {
    state.castling[`${color}K`] = false;
    state.castling[`${color}Q`] = false;
  }

  if (type === "R") {
    if (move.from.r === 7 && move.from.c === 0) state.castling.wQ = false;
    if (move.from.r === 7 && move.from.c === 7) state.castling.wK = false;
    if (move.from.r === 0 && move.from.c === 0) state.castling.bQ = false;
    if (move.from.r === 0 && move.from.c === 7) state.castling.bK = false;
  }

  if (move.to.r === 7 && move.to.c === 0) state.castling.wQ = false;
  if (move.to.r === 7 && move.to.c === 7) state.castling.wK = false;
  if (move.to.r === 0 && move.to.c === 0) state.castling.bQ = false;
  if (move.to.r === 0 && move.to.c === 7) state.castling.bK = false;
}

function buildMoveNotation(piece, move, captured) {
  const type = typeOf(piece);
  const to = squareName(move.to.r, move.to.c);

  if (move.castle === "king") return "O-O";
  if (move.castle === "queen") return "O-O-O";

  const pieceLetter = type === "P" ? "" : type;
  const captureMark = captured ? "x" : "";
  const fromFile = type === "P" && captured ? squareName(move.from.r, move.from.c)[0] : "";
  const promo = move.promotion ? `=${move.promotion}` : "";

  return `${pieceLetter}${fromFile}${captureMark}${to}${promo}`;
}

/* =========================
   RENDER
========================= */

function render() {
  renderBoard();
  renderHud();
  renderMoves();
  renderCaptured();
}

function renderBoard() {
  if (!els.board) return;

  els.board.innerHTML = "";

  const rows = boardFlipped ? [...Array(8).keys()].reverse() : [...Array(8).keys()];
  const cols = boardFlipped ? [...Array(8).keys()].reverse() : [...Array(8).keys()];

  for (const r of rows) {
    for (const c of cols) {
      const piece = getPiece(r, c);
      const square = document.createElement("button");

      square.className = `square ${(r + c) % 2 === 0 ? "light" : "dark"}`;
      square.dataset.r = r;
      square.dataset.c = c;
      square.type = "button";
      square.setAttribute("aria-label", squareName(r, c));

      if (selectedSquare?.r === r && selectedSquare?.c === c) {
        square.classList.add("selected");
      }

      const target = legalTargets.find((m) => m.to.r === r && m.to.c === c);
      if (target) {
        square.classList.add(target.capture || getPiece(r, c) ? "capture" : "legal");
      }

      if (piece) {
        square.innerHTML = `<span class="piece">${PIECES[piece]}</span>`;
      }

      square.addEventListener("click", () => handleSquareClick(r, c));
      els.board.appendChild(square);
    }
  }
}

function renderHud() {
  const mode = currentMatch ? "ONLINE" : "LOCAL";
  const turn = state.turn === "w" ? "WHITE" : "BLACK";
  const stateText = gameOver ? state.result.toUpperCase() : state.check ? "CHECK" : "ACTIVE";

  if (els.statMode) els.statMode.textContent = mode;
  if (els.statTurn) els.statTurn.textContent = turn;
  if (els.statMoves) els.statMoves.textContent = state.history.length.toLocaleString();
  if (els.statState) els.statState.textContent = stateText;

  if (els.whiteName) els.whiteName.textContent = currentMatch?.white_name || "White Player";
  if (els.blackName) els.blackName.textContent = currentMatch?.black_name || "Black Player";

  if (els.whiteMeta) els.whiteMeta.textContent = currentMatch ? "MULTIPLAYER SEAT" : "LOCAL SIDE";
  if (els.blackMeta) els.blackMeta.textContent = currentMatch ? "MULTIPLAYER SEAT" : "LOCAL SIDE";
}

function renderMoves() {
  if (!els.moveList) return;

  if (!state.history.length) {
    els.moveList.innerHTML = `<div class="empty">No moves yet. Make the first elite move.</div>`;
    return;
  }

  els.moveList.innerHTML = state.history.map((m) => `
    <div class="move-item">
      <span>${m.moveNumber}. ${m.color === "w" ? "White" : "Black"}</span>
      <strong>${m.notation}</strong>
    </div>
  `).join("");
}

function renderCaptured() {
  if (els.capturedWhite) {
    els.capturedWhite.textContent = state.captured.w.map((p) => PIECES[p]).join(" ");
  }

  if (els.capturedBlack) {
    els.capturedBlack.textContent = state.captured.b.map((p) => PIECES[p]).join(" ");
  }
}

function handleSquareClick(r, c) {
  if (gameOver) return;
  if (!isMyTurn()) {
    setStatus("WAIT FOR YOUR TURN");
    return;
  }

  const piece = getPiece(r, c);

  if (selectedSquare) {
    const move = legalTargets.find((m) => m.to.r === r && m.to.c === c);

    if (move) {
      applyMove(move);
      return;
    }
  }

  if (piece && colorOf(piece) === state.turn) {
    selectedSquare = { r, c };
    legalTargets = legalMovesFor(r, c);
    renderBoard();
    setStatus(`${PIECES[piece]} SELECTED • ${legalTargets.length} MOVES`);
    return;
  }

  selectedSquare = null;
  legalTargets = [];
  renderBoard();
}

/* =========================
   AUTH + PROFILE
========================= */

async function loadUser() {
  const { data } = await supabase.auth.getUser();
  currentUser = data?.user || null;

  if (!currentUser) {
    setMultiplayer("SIGN IN TO PLAY MULTIPLAYER");
    return;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url")
    .eq("id", currentUser.id)
    .maybeSingle();

  currentProfile = profile || {};
}

function playerName() {
  return (
    currentProfile?.display_name ||
    currentProfile?.username ||
    currentUser?.email?.split("@")[0] ||
    "Rich Player"
  );
}

/* =========================
   MULTIPLAYER
========================= */

function matchCodeFromId(id = "") {
  return String(id).slice(0, 8).toUpperCase();
}

async function createMatch() {
  if (!currentUser) {
    window.location.href = "/auth.html";
    return;
  }

  const mode = els.matchModeInput?.value || "ranked";
  const title = els.matchNameInput?.value?.trim() || "Rich Chess Match";

  const payload = {
    game_slug: "rich-chess",
    title,
    status: "waiting",
    mode,
    white_user_id: currentUser.id,
    white_name: playerName(),
    black_user_id: null,
    black_name: null,
    current_turn: "w",
    board_state: serializeState(),
    winner_id: null,
    result: null,
    metadata: {
      source: "rich-chess",
      app: "Rich Bizness Mobile"
    }
  };

  const { data, error } = await supabase
    .from("chess_matches")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    setMultiplayer(`CREATE MATCH ERROR: ${error.message}`);
    return;
  }

  currentMatch = data;
  currentPlayer = { color: "w", role: "white" };
  setMultiplayer(`MATCH CREATED • CODE ${matchCodeFromId(data.id)}`);
  startRealtime();
  render();
}

async function joinMatch() {
  if (!currentUser) {
    window.location.href = "/auth.html";
    return;
  }

  const rawCode = els.matchCodeInput?.value?.trim();
  if (!rawCode) {
    setMultiplayer("ENTER MATCH CODE");
    return;
  }

  const { data: matches, error } = await supabase
    .from("chess_matches")
    .select("*")
    .ilike("id", `${rawCode}%`)
    .limit(1);

  if (error || !matches?.length) {
    setMultiplayer("MATCH NOT FOUND");
    return;
  }

  const match = matches[0];

  if (match.white_user_id === currentUser.id) {
    currentPlayer = { color: "w", role: "white" };
  } else if (match.black_user_id === currentUser.id) {
    currentPlayer = { color: "b", role: "black" };
  } else if (!match.black_user_id) {
    const { data, error: updateError } = await supabase
      .from("chess_matches")
      .update({
        black_user_id: currentUser.id,
        black_name: playerName(),
        status: "active",
        updated_at: new Date().toISOString()
      })
      .eq("id", match.id)
      .select("*")
      .single();

    if (updateError) {
      setMultiplayer(`JOIN ERROR: ${updateError.message}`);
      return;
    }

    currentMatch = data;
    currentPlayer = { color: "b", role: "black" };
    hydrateState(data.board_state);
    setMultiplayer("JOINED MATCH AS BLACK");
    startRealtime();
    return;
  } else {
    setMultiplayer("MATCH FULL — SPECTATOR MODE COMING NEXT");
    return;
  }

  currentMatch = match;
  hydrateState(match.board_state);
  setMultiplayer(`JOINED MATCH AS ${currentPlayer.color === "w" ? "WHITE" : "BLACK"}`);
  startRealtime();
}

async function syncMatchState() {
  if (!currentMatch?.id || !currentUser) return;

  const update = {
    board_state: serializeState(),
    current_turn: state.turn,
    status: state.result === "active" ? "active" : "completed",
    result: state.result,
    winner_id:
      state.winner === "w" ? currentMatch.white_user_id :
      state.winner === "b" ? currentMatch.black_user_id :
      null,
    updated_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from("chess_matches")
    .update(update)
    .eq("id", currentMatch.id)
    .select("*")
    .single();

  if (!error && data) currentMatch = data;
}

function startRealtime() {
  if (!currentMatch?.id) return;

  if (realtimeChannel) supabase.removeChannel(realtimeChannel);

  realtimeChannel = supabase
    .channel(`rich-chess-${currentMatch.id}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "chess_matches",
        filter: `id=eq.${currentMatch.id}`
      },
      (payload) => {
        if (!payload.new) return;
        currentMatch = payload.new;
        hydrateState(payload.new.board_state);
        setMultiplayer("MATCH UPDATED LIVE");
      }
    )
    .subscribe((status) => {
      if (status === "SUBSCRIBED") {
        setMultiplayer(`MULTIPLAYER LIVE • CODE ${matchCodeFromId(currentMatch.id)}`);
      }
    });
}

/* =========================
   TOURNAMENTS
========================= */

async function createTournament() {
  if (!currentUser) {
    window.location.href = "/auth.html";
    return;
  }

  const title = els.tournamentNameInput?.value?.trim() || "Rich Chess Tournament";
  const entry = Number(els.tournamentEntryInput?.value || 0);

  const { data, error } = await supabase
    .from("chess_tournaments")
    .insert({
      title,
      game_slug: "rich-chess",
      created_by: currentUser.id,
      status: "open",
      entry_fee_cents: entry,
      prize_pool_cents: 0,
      max_players: 16,
      metadata: {
        source: "rich-chess",
        app: "Rich Bizness Mobile"
      }
    })
    .select("*")
    .single();

  if (error) {
    setTournament(`TOURNAMENT ERROR: ${error.message}`);
    return;
  }

  await joinTournament(data.id);
  setTournament(`TOURNAMENT CREATED • ${title}`);
}

async function joinTournament(tournamentId = null) {
  if (!currentUser) {
    window.location.href = "/auth.html";
    return;
  }

  let id = tournamentId;

  if (!id) {
    const { data } = await supabase
      .from("chess_tournaments")
      .select("*")
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    id = data?.id;
  }

  if (!id) {
    setTournament("NO OPEN TOURNAMENT FOUND");
    return;
  }

  const { error } = await supabase
    .from("chess_tournament_players")
    .upsert({
      tournament_id: id,
      user_id: currentUser.id,
      username: currentProfile?.username || playerName(),
      display_name: playerName(),
      status: "joined",
      score: 0,
      metadata: {
        source: "rich-chess"
      }
    }, { onConflict: "tournament_id,user_id" });

  if (error) {
    setTournament(`JOIN TOURNAMENT ERROR: ${error.message}`);
    return;
  }

  setTournament("JOINED TOURNAMENT");
}

/* =========================
   CONTROLS
========================= */

function undoMove() {
  if (currentMatch) {
    setStatus("UNDO DISABLED IN MULTIPLAYER");
    return;
  }

  const last = state.history.pop();
  if (!last?.before) return;

  hydrateState(last.before);
  setStatus("MOVE UNDONE");
}

async function resignGame() {
  if (gameOver) return;

  const loser = state.turn;
  state.result = "resigned";
  state.winner = enemy(loser);
  gameOver = true;

  setStatus(`${loser === "w" ? "WHITE" : "BLACK"} RESIGNED`);
  render();
  await syncMatchState();
}

function flipBoard() {
  boardFlipped = !boardFlipped;
  renderBoard();
}

/* =========================
   BOOT
========================= */

els.newGameBtn?.addEventListener("click", resetGame);
els.flipBoardBtn?.addEventListener("click", flipBoard);
els.undoBtn?.addEventListener("click", undoMove);
els.resignBtn?.addEventListener("click", resignGame);

els.createMatchBtn?.addEventListener("click", createMatch);
els.joinMatchBtn?.addEventListener("click", joinMatch);

els.createTournamentBtn?.addEventListener("click", createTournament);
els.joinTournamentBtn?.addEventListener("click", () => joinTournament());

async function bootChess() {
  setStatus("BOOTING RICH CHESS ENGINE...");
  await loadUser();
  render();
  setStatus("RICH CHESS ENGINE READY");
}

bootChess();
