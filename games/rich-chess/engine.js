/* =========================
   RICH BIZNESS — RICH CHESS
   /games/rich-chess/engine.js
   Legal Move Engine
========================= */

import {
  COLORS,
  PIECES,
  cloneBoard,
  findKing,
  isEnemy,
  isSameColor
} from "./pieces.js";

export function inBounds(row, col) {
  return row >= 0 && row < 8 && col >= 0 && col < 8;
}

export function algebraic(row, col) {
  return `${"abcdefgh"[col]}${8 - row}`;
}

export function oppositeColor(color) {
  return color === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE;
}

function pushMove(moves, board, from, to, options = {}) {
  if (!inBounds(to.row, to.col)) return;

  const piece = board[from.row][from.col];
  const target = board[to.row][to.col];

  if (!piece) return;
  if (target && isSameColor(piece, target)) return;

  moves.push({
    from,
    to,
    piece,
    captured: target || null,
    capture: Boolean(target),
    promotion: options.promotion || null,
    castle: options.castle || false,
    enPassant: options.enPassant || false,
    notation: `${algebraic(from.row, from.col)}-${algebraic(to.row, to.col)}`
  });
}

function slideMoves(board, from, directions) {
  const moves = [];
  const piece = board[from.row][from.col];
  if (!piece) return moves;

  for (const [dr, dc] of directions) {
    let row = from.row + dr;
    let col = from.col + dc;

    while (inBounds(row, col)) {
      const target = board[row][col];

      if (!target) {
        pushMove(moves, board, from, { row, col });
      } else {
        if (isEnemy(piece, target)) {
          pushMove(moves, board, from, { row, col });
        }
        break;
      }

      row += dr;
      col += dc;
    }
  }

  return moves;
}

export function getPseudoLegalMoves(board, from) {
  const piece = board[from.row]?.[from.col];
  if (!piece) return [];

  const moves = [];

  if (piece.type === PIECES.PAWN) {
    const dir = piece.color === COLORS.WHITE ? -1 : 1;
    const startRow = piece.color === COLORS.WHITE ? 6 : 1;
    const promotionRow = piece.color === COLORS.WHITE ? 0 : 7;

    const one = { row: from.row + dir, col: from.col };
    if (inBounds(one.row, one.col) && !board[one.row][one.col]) {
      pushMove(moves, board, from, one, {
        promotion: one.row === promotionRow ? PIECES.QUEEN : null
      });

      const two = { row: from.row + dir * 2, col: from.col };
      if (from.row === startRow && !board[two.row][two.col]) {
        pushMove(moves, board, from, two);
      }
    }

    for (const dc of [-1, 1]) {
      const cap = { row: from.row + dir, col: from.col + dc };
      if (!inBounds(cap.row, cap.col)) continue;

      const target = board[cap.row][cap.col];
      if (target && isEnemy(piece, target)) {
        pushMove(moves, board, from, cap, {
          promotion: cap.row === promotionRow ? PIECES.QUEEN : null
        });
      }
    }
  }

  if (piece.type === PIECES.KNIGHT) {
    const jumps = [
      [-2, -1], [-2, 1],
      [-1, -2], [-1, 2],
      [1, -2], [1, 2],
      [2, -1], [2, 1]
    ];

    for (const [dr, dc] of jumps) {
      pushMove(moves, board, from, {
        row: from.row + dr,
        col: from.col + dc
      });
    }
  }

  if (piece.type === PIECES.BISHOP) {
    moves.push(...slideMoves(board, from, [
      [-1, -1], [-1, 1],
      [1, -1], [1, 1]
    ]));
  }

  if (piece.type === PIECES.ROOK) {
    moves.push(...slideMoves(board, from, [
      [-1, 0], [1, 0],
      [0, -1], [0, 1]
    ]));
  }

  if (piece.type === PIECES.QUEEN) {
    moves.push(...slideMoves(board, from, [
      [-1, -1], [-1, 1],
      [1, -1], [1, 1],
      [-1, 0], [1, 0],
      [0, -1], [0, 1]
    ]));
  }

  if (piece.type === PIECES.KING) {
    const steps = [
      [-1, -1], [-1, 0], [-1, 1],
      [0, -1],           [0, 1],
      [1, -1],  [1, 0],  [1, 1]
    ];

    for (const [dr, dc] of steps) {
      pushMove(moves, board, from, {
        row: from.row + dr,
        col: from.col + dc
      });
    }

    if (!piece.hasMoved && !isKingInCheck(board, piece.color)) {
      const row = from.row;

      const kingSideRook = board[row][7];
      if (
        kingSideRook?.type === PIECES.ROOK &&
        !kingSideRook.hasMoved &&
        !board[row][5] &&
        !board[row][6] &&
        !isSquareAttacked(board, row, 5, oppositeColor(piece.color)) &&
        !isSquareAttacked(board, row, 6, oppositeColor(piece.color))
      ) {
        pushMove(moves, board, from, { row, col: 6 }, { castle: "king" });
      }

      const queenSideRook = board[row][0];
      if (
        queenSideRook?.type === PIECES.ROOK &&
        !queenSideRook.hasMoved &&
        !board[row][1] &&
        !board[row][2] &&
        !board[row][3] &&
        !isSquareAttacked(board, row, 2, oppositeColor(piece.color)) &&
        !isSquareAttacked(board, row, 3, oppositeColor(piece.color))
      ) {
        pushMove(moves, board, from, { row, col: 2 }, { castle: "queen" });
      }
    }
  }

  return moves;
}

export function makeMove(board, move) {
  const next = cloneBoard(board);

  const piece = next[move.from.row][move.from.col];
  const captured = next[move.to.row][move.to.col];

  next[move.from.row][move.from.col] = null;

  if (piece) {
    piece.hasMoved = true;

    if (move.promotion) {
      piece.type = move.promotion;
      piece.label = "Queen";
      piece.value = 9;
      piece.symbol = piece.color === COLORS.WHITE ? "♕" : "♛";
    }

    next[move.to.row][move.to.col] = piece;

    if (move.castle === "king") {
      const row = move.from.row;
      const rook = next[row][7];
      next[row][7] = null;
      if (rook) {
        rook.hasMoved = true;
        next[row][5] = rook;
      }
    }

    if (move.castle === "queen") {
      const row = move.from.row;
      const rook = next[row][0];
      next[row][0] = null;
      if (rook) {
        rook.hasMoved = true;
        next[row][3] = rook;
      }
    }
  }

  return {
    board: next,
    captured,
    movedPiece: piece
  };
}

export function isSquareAttacked(board, row, col, byColor) {
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (!piece || piece.color !== byColor) continue;

      if (piece.type === PIECES.PAWN) {
        const dir = byColor === COLORS.WHITE ? -1 : 1;
        if (r + dir === row && Math.abs(c - col) === 1) return true;
        continue;
      }

      const moves = getPseudoLegalMovesNoCastle(board, { row: r, col: c });
      if (moves.some((m) => m.to.row === row && m.to.col === col)) {
        return true;
      }
    }
  }

  return false;
}

function getPseudoLegalMovesNoCastle(board, from) {
  const piece = board[from.row]?.[from.col];
  if (!piece) return [];

  if (piece.type !== PIECES.KING) {
    return getPseudoLegalMoves(board, from);
  }

  const moves = [];
  const steps = [
    [-1, -1], [-1, 0], [-1, 1],
    [0, -1],           [0, 1],
    [1, -1],  [1, 0],  [1, 1]
  ];

  for (const [dr, dc] of steps) {
    pushMove(moves, board, from, {
      row: from.row + dr,
      col: from.col + dc
    });
  }

  return moves;
}

export function isKingInCheck(board, color) {
  const king = findKing(board, color);
  if (!king) return true;

  return isSquareAttacked(
    board,
    king.row,
    king.col,
    oppositeColor(color)
  );
}

export function getLegalMoves(board, from) {
  const piece = board[from.row]?.[from.col];
  if (!piece) return [];

  const pseudo = getPseudoLegalMoves(board, from);

  return pseudo.filter((move) => {
    const result = makeMove(board, move);
    return !isKingInCheck(result.board, piece.color);
  });
}

export function getAllLegalMoves(board, color) {
  const moves = [];

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];

      if (!piece || piece.color !== color) continue;

      moves.push(...getLegalMoves(board, { row, col }));
    }
  }

  return moves;
}

export function getGameStatus(board, turn) {
  const legalMoves = getAllLegalMoves(board, turn);
  const inCheck = isKingInCheck(board, turn);

  if (!legalMoves.length && inCheck) {
    return {
      status: "checkmate",
      winner: oppositeColor(turn),
      label: `${oppositeColor(turn).toUpperCase()} WINS`
    };
  }

  if (!legalMoves.length && !inCheck) {
    return {
      status: "stalemate",
      winner: null,
      label: "STALEMATE"
    };
  }

  if (inCheck) {
    return {
      status: "check",
      winner: null,
      label: "CHECK"
    };
  }

  return {
    status: "active",
    winner: null,
    label: "ACTIVE"
  };
}
