/* =========================
   RICH BIZNESS — RICH CHESS
   /games/rich-chess/ai.js
   Elite CPU Engine
========================= */

import { COLORS, PIECES, PIECE_VALUES } from "./pieces.js";
import {
  getAllLegalMoves,
  makeMove,
  getGameStatus,
  isKingInCheck,
  oppositeColor
} from "./engine.js";

const POSITION_BONUS = {
  pawn: [
    [0, 0, 0, 0, 0, 0, 0, 0],
    [5, 5, 5, 5, 5, 5, 5, 5],
    [1, 1, 2, 3, 3, 2, 1, 1],
    [0, 0, 1, 3, 3, 1, 0, 0],
    [0, 0, 0, 2, 2, 0, 0, 0],
    [1, -1, -2, 0, 0, -2, -1, 1],
    [1, 2, 2, -2, -2, 2, 2, 1],
    [0, 0, 0, 0, 0, 0, 0, 0]
  ],
  knight: [
    [-5, -4, -3, -3, -3, -3, -4, -5],
    [-4, -2, 0, 1, 1, 0, -2, -4],
    [-3, 1, 2, 3, 3, 2, 1, -3],
    [-3, 0, 3, 4, 4, 3, 0, -3],
    [-3, 1, 3, 4, 4, 3, 1, -3],
    [-3, 0, 2, 3, 3, 2, 0, -3],
    [-4, -2, 0, 0, 0, 0, -2, -4],
    [-5, -4, -3, -3, -3, -3, -4, -5]
  ],
  bishop: [
    [-2, -1, -1, -1, -1, -1, -1, -2],
    [-1, 1, 0, 0, 0, 0, 1, -1],
    [-1, 2, 2, 2, 2, 2, 2, -1],
    [-1, 0, 2, 2, 2, 2, 0, -1],
    [-1, 1, 1, 2, 2, 1, 1, -1],
    [-1, 0, 1, 2, 2, 1, 0, -1],
    [-1, 0, 0, 0, 0, 0, 0, -1],
    [-2, -1, -1, -1, -1, -1, -1, -2]
  ],
  rook: [
    [0, 0, 1, 2, 2, 1, 0, 0],
    [-1, 0, 0, 0, 0, 0, 0, -1],
    [-1, 0, 0, 0, 0, 0, 0, -1],
    [-1, 0, 0, 0, 0, 0, 0, -1],
    [-1, 0, 0, 0, 0, 0, 0, -1],
    [-1, 0, 0, 0, 0, 0, 0, -1],
    [1, 2, 2, 2, 2, 2, 2, 1],
    [0, 0, 0, 2, 2, 0, 0, 0]
  ],
  queen: [
    [-2, -1, -1, 0, 0, -1, -1, -2],
    [-1, 0, 1, 0, 0, 0, 0, -1],
    [-1, 1, 1, 1, 1, 1, 0, -1],
    [0, 0, 1, 1, 1, 1, 0, -1],
    [-1, 0, 1, 1, 1, 1, 0, -1],
    [-1, 0, 1, 1, 1, 1, 0, -1],
    [-1, 0, 0, 0, 0, 0, 0, -1],
    [-2, -1, -1, 0, 0, -1, -1, -2]
  ],
  king: [
    [-3, -4, -4, -5, -5, -4, -4, -3],
    [-3, -4, -4, -5, -5, -4, -4, -3],
    [-3, -4, -4, -5, -5, -4, -4, -3],
    [-3, -4, -4, -5, -5, -4, -4, -3],
    [-2, -3, -3, -4, -4, -3, -3, -2],
    [-1, -2, -2, -2, -2, -2, -2, -1],
    [2, 2, 0, 0, 0, 0, 2, 2],
    [2, 3, 1, 0, 0, 1, 3, 2]
  ]
};

function positionBonus(piece, row, col) {
  const table = POSITION_BONUS[piece.type];
  if (!table) return 0;

  const lookupRow = piece.color === COLORS.WHITE ? row : 7 - row;
  return table[lookupRow]?.[col] || 0;
}

export function evaluateBoard(board, aiColor = COLORS.BLACK) {
  let score = 0;

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (!piece) continue;

      const base = (PIECE_VALUES[piece.type] || 0) * 100;
      const positional = positionBonus(piece, row, col) * 4;
      const value = base + positional;

      score += piece.color === aiColor ? value : -value;
    }
  }

  const aiMoves = getAllLegalMoves(board, aiColor).length;
  const enemyMoves = getAllLegalMoves(board, oppositeColor(aiColor)).length;

  score += (aiMoves - enemyMoves) * 3;

  if (isKingInCheck(board, oppositeColor(aiColor))) score += 35;
  if (isKingInCheck(board, aiColor)) score -= 35;

  const status = getGameStatus(board, aiColor);
  if (status.status === "checkmate") score -= 999999;

  const enemyStatus = getGameStatus(board, oppositeColor(aiColor));
  if (enemyStatus.status === "checkmate") score += 999999;

  return score;
}

function moveScore(board, move, aiColor) {
  let score = 0;

  if (move.captured) {
    score += (PIECE_VALUES[move.captured.type] || 0) * 120;
    score -= (PIECE_VALUES[move.piece.type] || 0) * 8;
  }

  if (move.promotion) score += 850;
  if (move.castle) score += 70;

  const result = makeMove(board, move);
  if (isKingInCheck(result.board, oppositeColor(aiColor))) score += 55;

  return score;
}

function orderedMoves(board, color, aiColor) {
  return getAllLegalMoves(board, color)
    .map((move) => ({
      move,
      score: moveScore(board, move, aiColor)
    }))
    .sort((a, b) => b.score - a.score)
    .map((item) => item.move);
}

function minimax(board, depth, alpha, beta, maximizing, turn, aiColor) {
  const status = getGameStatus(board, turn);

  if (depth === 0 || status.status === "checkmate" || status.status === "stalemate") {
    return {
      score: evaluateBoard(board, aiColor),
      move: null
    };
  }

  const moves = orderedMoves(board, turn, aiColor);

  if (!moves.length) {
    return {
      score: evaluateBoard(board, aiColor),
      move: null
    };
  }

  let bestMove = moves[0];

  if (maximizing) {
    let bestScore = -Infinity;

    for (const move of moves) {
      const result = makeMove(board, move);
      const next = minimax(
        result.board,
        depth - 1,
        alpha,
        beta,
        false,
        oppositeColor(turn),
        aiColor
      );

      if (next.score > bestScore) {
        bestScore = next.score;
        bestMove = move;
      }

      alpha = Math.max(alpha, bestScore);
      if (beta <= alpha) break;
    }

    return { score: bestScore, move: bestMove };
  }

  let bestScore = Infinity;

  for (const move of moves) {
    const result = makeMove(board, move);
    const next = minimax(
      result.board,
      depth - 1,
      alpha,
      beta,
      true,
      oppositeColor(turn),
      aiColor
    );

    if (next.score < bestScore) {
      bestScore = next.score;
      bestMove = move;
    }

    beta = Math.min(beta, bestScore);
    if (beta <= alpha) break;
  }

  return { score: bestScore, move: bestMove };
}

export function getCpuMove(board, color = COLORS.BLACK, level = "elite") {
  const depthMap = {
    easy: 1,
    normal: 2,
    hard: 3,
    elite: 3
  };

  const depth = depthMap[level] || 3;
  const moves = getAllLegalMoves(board, color);

  if (!moves.length) return null;

  if (level === "easy") {
    const captures = moves.filter((move) => move.captured);
    const pool = captures.length ? captures : moves;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  const result = minimax(
    board,
    depth,
    -Infinity,
    Infinity,
    true,
    color,
    color
  );

  return result.move || moves[0];
}

export function getCpuMoveLabel(level = "elite") {
  const labels = {
    easy: "CPU EASY",
    normal: "CPU NORMAL",
    hard: "CPU HARD",
    elite: "ELITE CPU"
  };

  return labels[level] || "ELITE CPU";
}

export function explainCpuMove(move) {
  if (!move) return "CPU has no legal move.";

  const piece = move.piece?.label || "Piece";
  const from = `${"abcdefgh"[move.from.col]}${8 - move.from.row}`;
  const to = `${"abcdefgh"[move.to.col]}${8 - move.to.row}`;

  if (move.captured) {
    return `${piece} captures on ${to}.`;
  }

  if (move.castle) {
    return `King castles ${move.castle} side.`;
  }

  if (move.promotion) {
    return `${piece} promotes on ${to}.`;
  }

  return `${piece} moves ${from} to ${to}.`;
}
