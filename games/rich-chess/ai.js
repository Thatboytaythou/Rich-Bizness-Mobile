/* =========================
   RICH BIZNESS — RICH CHESS
   /games/rich-chess/ai.js
   Elite CPU Engine
========================= */

import {
  COLORS,
  PIECES,
  MATERIAL_VALUE
} from "./pieces.js";

import {
  getAllLegalMoves,
  makeMove,
  getGameStatus,
  oppositeColor,
  isInCheck,
  algebraic
} from "./engine.js";

const CPU_LEVELS = {
  rookie: {
    label: "CPU Rookie",
    depth: 1,
    mistakeRate: 0.45
  },
  hustler: {
    label: "CPU Hustler",
    depth: 2,
    mistakeRate: 0.22
  },
  boss: {
    label: "CPU Boss",
    depth: 3,
    mistakeRate: 0.08
  },
  elite: {
    label: "CPU Grandmaster",
    depth: 3,
    mistakeRate: 0.01
  }
};

const PIECE_SQUARE_TABLES = {
  pawn: [
    [0, 0, 0, 0, 0, 0, 0, 0],
    [50, 50, 50, 50, 50, 50, 50, 50],
    [10, 10, 20, 30, 30, 20, 10, 10],
    [5, 5, 10, 25, 25, 10, 5, 5],
    [0, 0, 0, 20, 20, 0, 0, 0],
    [5, -5, -10, 0, 0, -10, -5, 5],
    [5, 10, 10, -20, -20, 10, 10, 5],
    [0, 0, 0, 0, 0, 0, 0, 0]
  ],

  knight: [
    [-50, -40, -30, -30, -30, -30, -40, -50],
    [-40, -20, 0, 5, 5, 0, -20, -40],
    [-30, 5, 10, 15, 15, 10, 5, -30],
    [-30, 0, 15, 20, 20, 15, 0, -30],
    [-30, 5, 15, 20, 20, 15, 5, -30],
    [-30, 0, 10, 15, 15, 10, 0, -30],
    [-40, -20, 0, 0, 0, 0, -20, -40],
    [-50, -40, -30, -30, -30, -30, -40, -50]
  ],

  bishop: [
    [-20, -10, -10, -10, -10, -10, -10, -20],
    [-10, 5, 0, 0, 0, 0, 5, -10],
    [-10, 10, 10, 10, 10, 10, 10, -10],
    [-10, 0, 10, 10, 10, 10, 0, -10],
    [-10, 5, 5, 10, 10, 5, 5, -10],
    [-10, 0, 5, 10, 10, 5, 0, -10],
    [-10, 0, 0, 0, 0, 0, 0, -10],
    [-20, -10, -10, -10, -10, -10, -10, -20]
  ],

  rook: [
    [0, 0, 0, 5, 5, 0, 0, 0],
    [-5, 0, 0, 0, 0, 0, 0, -5],
    [-5, 0, 0, 0, 0, 0, 0, -5],
    [-5, 0, 0, 0, 0, 0, 0, -5],
    [-5, 0, 0, 0, 0, 0, 0, -5],
    [-5, 0, 0, 0, 0, 0, 0, -5],
    [5, 10, 10, 10, 10, 10, 10, 5],
    [0, 0, 0, 10, 10, 5, 0, 0]
  ],

  queen: [
    [-20, -10, -10, -5, -5, -10, -10, -20],
    [-10, 0, 5, 0, 0, 0, 0, -10],
    [-10, 5, 5, 5, 5, 5, 0, -10],
    [0, 0, 5, 5, 5, 5, 0, -5],
    [-5, 0, 5, 5, 5, 5, 0, -5],
    [-10, 0, 5, 5, 5, 5, 0, -10],
    [-10, 0, 0, 0, 0, 0, 0, -10],
    [-20, -10, -10, -5, -5, -10, -10, -20]
  ],

  king: [
    [20, 30, 10, 0, 0, 10, 30, 20],
    [20, 20, 0, 0, 0, 0, 20, 20],
    [-10, -20, -20, -20, -20, -20, -20, -10],
    [-20, -30, -30, -40, -40, -30, -30, -20],
    [-30, -40, -40, -50, -50, -40, -40, -30],
    [-30, -40, -40, -50, -50, -40, -40, -30],
    [-30, -40, -40, -50, -50, -40, -40, -30],
    [-30, -40, -40, -50, -50, -40, -40, -30]
  ]
};

function getCpuMoveLabel(level = "elite") {
  return CPU_LEVELS[level]?.label || CPU_LEVELS.elite.label;
}

function getPieceSquareValue(piece, row, col) {
  const table = PIECE_SQUARE_TABLES[piece.type];
  if (!table) return 0;

  const tableRow = piece.color === COLORS.WHITE ? row : 7 - row;
  return table[tableRow]?.[col] || 0;
}

function evaluateBoard(board, cpuColor = COLORS.BLACK) {
  const opponent = oppositeColor(cpuColor);
  let score = 0;

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (!piece) continue;

      const material = MATERIAL_VALUE[piece.type] || 0;
      const position = getPieceSquareValue(piece, row, col);
      const value = material + position;

      score += piece.color === cpuColor ? value : -value;
    }
  }

  const cpuMoves = getAllLegalMoves(board, cpuColor).length;
  const enemyMoves = getAllLegalMoves(board, opponent).length;

  score += (cpuMoves - enemyMoves) * 4;

  if (isInCheck(board, opponent)) score += 35;
  if (isInCheck(board, cpuColor)) score -= 45;

  return score;
}

function scoreMove(board, move, cpuColor) {
  let score = 0;

  if (move.captured) {
    const capturedValue = MATERIAL_VALUE[move.captured.type] || 0;
    const attackerValue = MATERIAL_VALUE[move.piece.type] || 0;
    score += capturedValue * 10 - attackerValue;
  }

  if (move.promotion) score += 850;
  if (move.castle) score += 70;

  const result = makeMove(board, move);
  const nextStatus = getGameStatus(result.board, oppositeColor(move.piece.color));

  if (nextStatus.status === "checkmate") score += 100000;
  if (nextStatus.status === "check") score += 80;

  score += evaluateBoard(result.board, cpuColor);

  return score;
}

function minimax(board, depth, turn, cpuColor, alpha = -Infinity, beta = Infinity) {
  const status = getGameStatus(board, turn);

  if (depth <= 0 || status.gameOver) {
    if (status.status === "checkmate") {
      return status.winner === cpuColor ? 100000 : -100000;
    }

    if (status.status === "stalemate") return 0;

    return evaluateBoard(board, cpuColor);
  }

  const moves = getAllLegalMoves(board, turn);

  if (!moves.length) return evaluateBoard(board, cpuColor);

  const maximizing = turn === cpuColor;

  if (maximizing) {
    let best = -Infinity;

    for (const move of moves) {
      const result = makeMove(board, move);
      const value = minimax(
        result.board,
        depth - 1,
        oppositeColor(turn),
        cpuColor,
        alpha,
        beta
      );

      best = Math.max(best, value);
      alpha = Math.max(alpha, value);

      if (beta <= alpha) break;
    }

    return best;
  }

  let best = Infinity;

  for (const move of moves) {
    const result = makeMove(board, move);
    const value = minimax(
      result.board,
      depth - 1,
      oppositeColor(turn),
      cpuColor,
      alpha,
      beta
    );

    best = Math.min(best, value);
    beta = Math.min(beta, value);

    if (beta <= alpha) break;
  }

  return best;
}

function sortMoves(board, moves, cpuColor) {
  return [...moves].sort((a, b) => {
    return scoreMove(board, b, cpuColor) - scoreMove(board, a, cpuColor);
  });
}

function pickMistakeMove(board, moves, cpuColor) {
  const scored = moves
    .map((move) => ({
      move,
      score: scoreMove(board, move, cpuColor)
    }))
    .sort((a, b) => b.score - a.score);

  const pool = scored.slice(0, Math.min(scored.length, 5));
  return pool[Math.floor(Math.random() * pool.length)]?.move || scored[0]?.move || null;
}

function getCpuMove(board, cpuColor = COLORS.BLACK, level = "elite") {
  const config = CPU_LEVELS[level] || CPU_LEVELS.elite;
  const moves = getAllLegalMoves(board, cpuColor);

  if (!moves.length) return null;

  if (Math.random() < config.mistakeRate) {
    return pickMistakeMove(board, moves, cpuColor);
  }

  const ordered = sortMoves(board, moves, cpuColor);

  let bestMove = ordered[0];
  let bestScore = -Infinity;

  for (const move of ordered) {
    const result = makeMove(board, move);

    const value = minimax(
      result.board,
      Math.max(0, config.depth - 1),
      oppositeColor(cpuColor),
      cpuColor
    );

    const moveBonus = scoreMove(board, move, cpuColor) * 0.05;
    const total = value + moveBonus + Math.random() * 0.001;

    if (total > bestScore) {
      bestScore = total;
      bestMove = move;
    }
  }

  return bestMove;
}

function explainCpuMove(move) {
  if (!move) return "CPU HAS NO MOVE";

  const piece = move.piece?.label || "Piece";
  const from = algebraic(move.from.row, move.from.col).toUpperCase();
  const to = algebraic(move.to.row, move.to.col).toUpperCase();

  if (move.captured) {
    return `CPU ${piece.toUpperCase()} CAPTURES ON ${to}`;
  }

  if (move.castle) {
    return `CPU CASTLES ${move.castle.toUpperCase()} SIDE`;
  }

  if (move.promotion) {
    return `CPU ${piece.toUpperCase()} PROMOTES ON ${to}`;
  }

  return `CPU ${piece.toUpperCase()} MOVES ${from} → ${to}`;
}

export {
  CPU_LEVELS,
  getCpuMove,
  getCpuMoveLabel,
  explainCpuMove,
  evaluateBoard,
  scoreMove
};
