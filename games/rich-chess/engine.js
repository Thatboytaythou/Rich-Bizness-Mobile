/* =========================
   RICH BIZNESS — RICH CHESS
   /games/rich-chess/engine.js
   Legal Moves + Game Rules Engine
========================= */

import {
  COLORS,
  PIECES,
  cloneBoard,
  createPiece
} from "./pieces.js";

function inBounds(row, col) {
  return row >= 0 && row < 8 && col >= 0 && col < 8;
}

function oppositeColor(color) {
  return color === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE;
}

function algebraic(row, col) {
  const files = ["a", "b", "c", "d", "e", "f", "g", "h"];
  return `${files[col]}${8 - row}`;
}

function getPieceAt(board, row, col) {
  if (!inBounds(row, col)) return null;
  return board[row][col];
}

function isEnemy(piece, target) {
  return piece && target && piece.color !== target.color;
}

function isEmpty(board, row, col) {
  return inBounds(row, col) && !board[row][col];
}

function pushMove(moves, board, piece, from, to, options = {}) {
  if (!inBounds(to.row, to.col)) return;

  const target = board[to.row][to.col];

  if (target && target.color === piece.color) return;

  moves.push({
    piece,
    from,
    to,
    captured: target || null,
    capture: Boolean(target),
    promotion: options.promotion || null,
    castle: options.castle || null,
    enPassant: options.enPassant || false
  });
}

function addSlidingMoves(board, moves, piece, from, directions) {
  for (const [dr, dc] of directions) {
    let row = from.row + dr;
    let col = from.col + dc;

    while (inBounds(row, col)) {
      const target = board[row][col];

      if (!target) {
        pushMove(moves, board, piece, from, { row, col });
      } else {
        if (target.color !== piece.color) {
          pushMove(moves, board, piece, from, { row, col });
        }
        break;
      }

      row += dr;
      col += dc;
    }
  }
}

function getPseudoMoves(board, from) {
  const piece = getPieceAt(board, from.row, from.col);
  if (!piece) return [];

  const moves = [];

  if (piece.type === PIECES.PAWN) {
    const dir = piece.color === COLORS.WHITE ? -1 : 1;
    const startRow = piece.color === COLORS.WHITE ? 6 : 1;
    const promotionRow = piece.color === COLORS.WHITE ? 0 : 7;

    const oneRow = from.row + dir;

    if (isEmpty(board, oneRow, from.col)) {
      pushMove(moves, board, piece, from, {
        row: oneRow,
        col: from.col
      }, {
        promotion: oneRow === promotionRow ? PIECES.QUEEN : null
      });

      const twoRow = from.row + dir * 2;

      if (from.row === startRow && isEmpty(board, twoRow, from.col)) {
        pushMove(moves, board, piece, from, {
          row: twoRow,
          col: from.col
        });
      }
    }

    for (const dc of [-1, 1]) {
      const row = from.row + dir;
      const col = from.col + dc;
      const target = getPieceAt(board, row, col);

      if (target && target.color !== piece.color) {
        pushMove(moves, board, piece, from, {
          row,
          col
        }, {
          promotion: row === promotionRow ? PIECES.QUEEN : null
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
      pushMove(moves, board, piece, from, {
        row: from.row + dr,
        col: from.col + dc
      });
    }
  }

  if (piece.type === PIECES.BISHOP) {
    addSlidingMoves(board, moves, piece, from, [
      [-1, -1], [-1, 1],
      [1, -1], [1, 1]
    ]);
  }

  if (piece.type === PIECES.ROOK) {
    addSlidingMoves(board, moves, piece, from, [
      [-1, 0], [1, 0],
      [0, -1], [0, 1]
    ]);
  }

  if (piece.type === PIECES.QUEEN) {
    addSlidingMoves(board, moves, piece, from, [
      [-1, -1], [-1, 1],
      [1, -1], [1, 1],
      [-1, 0], [1, 0],
      [0, -1], [0, 1]
    ]);
  }

  if (piece.type === PIECES.KING) {
    const steps = [
      [-1, -1], [-1, 0], [-1, 1],
      [0, -1],           [0, 1],
      [1, -1],  [1, 0],  [1, 1]
    ];

    for (const [dr, dc] of steps) {
      pushMove(moves, board, piece, from, {
        row: from.row + dr,
        col: from.col + dc
      });
    }

    const homeRow = piece.color === COLORS.WHITE ? 7 : 0;

    if (!piece.hasMoved && from.row === homeRow && from.col === 4) {
      const kingSideRook = board[homeRow][7];

      if (
        kingSideRook &&
        kingSideRook.type === PIECES.ROOK &&
        kingSideRook.color === piece.color &&
        !kingSideRook.hasMoved &&
        !board[homeRow][5] &&
        !board[homeRow][6]
      ) {
        moves.push({
          piece,
          from,
          to: { row: homeRow, col: 6 },
          captured: null,
          capture: false,
          castle: "king"
        });
      }

      const queenSideRook = board[homeRow][0];

      if (
        queenSideRook &&
        queenSideRook.type === PIECES.ROOK &&
        queenSideRook.color === piece.color &&
        !queenSideRook.hasMoved &&
        !board[homeRow][1] &&
        !board[homeRow][2] &&
        !board[homeRow][3]
      ) {
        moves.push({
          piece,
          from,
          to: { row: homeRow, col: 2 },
          captured: null,
          capture: false,
          castle: "queen"
        });
      }
    }
  }

  return moves;
}

function findKing(board, color) {
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];

      if (piece?.type === PIECES.KING && piece.color === color) {
        return { row, col };
      }
    }
  }

  return null;
}

function isSquareAttacked(board, row, col, byColor) {
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];

      if (!piece || piece.color !== byColor) continue;

      if (piece.type === PIECES.PAWN) {
        const dir = piece.color === COLORS.WHITE ? -1 : 1;
        if (r + dir === row && (c - 1 === col || c + 1 === col)) {
          return true;
        }
        continue;
      }

      const pseudo = getPseudoMoves(board, { row: r, col: c });

      if (pseudo.some((move) => move.to.row === row && move.to.col === col)) {
        return true;
      }
    }
  }

  return false;
}

function isInCheck(board, color) {
  const king = findKing(board, color);
  if (!king) return true;

  return isSquareAttacked(
    board,
    king.row,
    king.col,
    oppositeColor(color)
  );
}

function makeMove(board, move) {
  const next = cloneBoard(board);

  const piece = next[move.from.row][move.from.col];
  const captured = next[move.to.row][move.to.col];

  next[move.from.row][move.from.col] = null;

  if (move.promotion) {
    next[move.to.row][move.to.col] = createPiece(move.promotion, piece.color);
    next[move.to.row][move.to.col].hasMoved = true;
  } else {
    next[move.to.row][move.to.col] = {
      ...piece,
      hasMoved: true
    };
  }

  if (move.castle === "king") {
    const row = move.from.row;
    const rook = next[row][7];

    next[row][7] = null;
    next[row][5] = {
      ...rook,
      hasMoved: true
    };
  }

  if (move.castle === "queen") {
    const row = move.from.row;
    const rook = next[row][0];

    next[row][0] = null;
    next[row][3] = {
      ...rook,
      hasMoved: true
    };
  }

  return {
    board: next,
    captured,
    move: {
      ...move,
      captured
    }
  };
}

function moveLeavesKingSafe(board, move) {
  const result = makeMove(board, move);
  return !isInCheck(result.board, move.piece.color);
}

function getLegalMoves(board, from) {
  const piece = getPieceAt(board, from.row, from.col);
  if (!piece) return [];

  const pseudo = getPseudoMoves(board, from);

  return pseudo.filter((move) => {
    if (!moveLeavesKingSafe(board, move)) return false;

    if (move.castle) {
      const enemy = oppositeColor(piece.color);
      const row = from.row;

      if (isSquareAttacked(board, row, 4, enemy)) return false;

      if (move.castle === "king") {
        if (isSquareAttacked(board, row, 5, enemy)) return false;
        if (isSquareAttacked(board, row, 6, enemy)) return false;
      }

      if (move.castle === "queen") {
        if (isSquareAttacked(board, row, 3, enemy)) return false;
        if (isSquareAttacked(board, row, 2, enemy)) return false;
      }
    }

    return true;
  });
}

function getAllLegalMoves(board, color) {
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

function getGameStatus(board, turn) {
  const check = isInCheck(board, turn);
  const legalMoves = getAllLegalMoves(board, turn);

  if (check && legalMoves.length === 0) {
    return {
      status: "checkmate",
      label: `${oppositeColor(turn).toUpperCase()} WINS BY CHECKMATE`,
      winner: oppositeColor(turn),
      check: true,
      gameOver: true
    };
  }

  if (!check && legalMoves.length === 0) {
    return {
      status: "stalemate",
      label: "STALEMATE",
      winner: null,
      check: false,
      gameOver: true
    };
  }

  if (check) {
    return {
      status: "check",
      label: "CHECK",
      winner: null,
      check: true,
      gameOver: false
    };
  }

  return {
    status: "active",
    label: "ACTIVE",
    winner: null,
    check: false,
    gameOver: false
  };
}

function isMoveEqual(a, b) {
  return (
    a?.from?.row === b?.from?.row &&
    a?.from?.col === b?.from?.col &&
    a?.to?.row === b?.to?.row &&
    a?.to?.col === b?.to?.col
  );
}

function validateMove(board, move, color) {
  const piece = getPieceAt(board, move.from.row, move.from.col);

  if (!piece) {
    return { ok: false, error: "No piece on selected square" };
  }

  if (piece.color !== color) {
    return { ok: false, error: "That is not your piece" };
  }

  const legalMoves = getLegalMoves(board, move.from);
  const matched = legalMoves.find((item) => isMoveEqual(item, move));

  if (!matched) {
    return { ok: false, error: "Illegal move" };
  }

  return { ok: true, move: matched };
}

export {
  inBounds,
  oppositeColor,
  algebraic,
  getPieceAt,
  isEnemy,
  isEmpty,
  getPseudoMoves,
  getLegalMoves,
  getAllLegalMoves,
  isInCheck,
  isSquareAttacked,
  findKing,
  makeMove,
  getGameStatus,
  isMoveEqual,
  validateMove
};
