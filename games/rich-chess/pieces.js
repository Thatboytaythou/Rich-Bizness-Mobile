/* =========================
   RICH BIZNESS — RICH CHESS
   /games/rich-chess/pieces.js
   Elite Pieces + Board State
========================= */

const COLORS = {
  WHITE: "white",
  BLACK: "black"
};

const PIECES = {
  KING: "king",
  QUEEN: "queen",
  ROOK: "rook",
  BISHOP: "bishop",
  KNIGHT: "knight",
  PAWN: "pawn"
};

const PIECE_LABELS = {
  king: "King",
  queen: "Queen",
  rook: "Rook",
  bishop: "Bishop",
  knight: "Knight",
  pawn: "Pawn"
};

const SYMBOLS = {
  white: {
    king: "♔",
    queen: "♕",
    rook: "♖",
    bishop: "♗",
    knight: "♘",
    pawn: "♙"
  },
  black: {
    king: "♚",
    queen: "♛",
    rook: "♜",
    bishop: "♝",
    knight: "♞",
    pawn: "♟"
  }
};

const MATERIAL_VALUE = {
  pawn: 100,
  knight: 320,
  bishop: 330,
  rook: 500,
  queen: 900,
  king: 20000
};

function createPiece(type, color) {
  return {
    type,
    color,
    label: PIECE_LABELS[type] || type,
    symbol: SYMBOLS[color]?.[type] || "?",
    hasMoved: false,
    id: `${color}-${type}-${crypto.randomUUID?.() || Math.random().toString(16).slice(2)}`
  };
}

function getStartingBoard() {
  const board = Array.from({ length: 8 }, () => Array(8).fill(null));

  board[0] = [
    createPiece(PIECES.ROOK, COLORS.BLACK),
    createPiece(PIECES.KNIGHT, COLORS.BLACK),
    createPiece(PIECES.BISHOP, COLORS.BLACK),
    createPiece(PIECES.QUEEN, COLORS.BLACK),
    createPiece(PIECES.KING, COLORS.BLACK),
    createPiece(PIECES.BISHOP, COLORS.BLACK),
    createPiece(PIECES.KNIGHT, COLORS.BLACK),
    createPiece(PIECES.ROOK, COLORS.BLACK)
  ];

  board[1] = Array.from({ length: 8 }, () => createPiece(PIECES.PAWN, COLORS.BLACK));
  board[6] = Array.from({ length: 8 }, () => createPiece(PIECES.PAWN, COLORS.WHITE));

  board[7] = [
    createPiece(PIECES.ROOK, COLORS.WHITE),
    createPiece(PIECES.KNIGHT, COLORS.WHITE),
    createPiece(PIECES.BISHOP, COLORS.WHITE),
    createPiece(PIECES.QUEEN, COLORS.WHITE),
    createPiece(PIECES.KING, COLORS.WHITE),
    createPiece(PIECES.BISHOP, COLORS.WHITE),
    createPiece(PIECES.KNIGHT, COLORS.WHITE),
    createPiece(PIECES.ROOK, COLORS.WHITE)
  ];

  return board;
}

function clonePiece(piece) {
  if (!piece) return null;

  return {
    ...piece
  };
}

function cloneBoard(board) {
  return board.map((row) => row.map(clonePiece));
}

function getPieceSymbol(piece) {
  if (!piece) return "";
  return piece.symbol || SYMBOLS[piece.color]?.[piece.type] || "";
}

function getPieceClass(piece) {
  if (!piece) return "";
  return `piece piece-${piece.type} ${piece.color}`;
}

function getCapturedSummary(captured = []) {
  if (!captured.length) return "—";
  return captured.map(getPieceSymbol).join(" ");
}

function boardToJson(board) {
  return board.map((row) =>
    row.map((piece) =>
      piece
        ? {
            type: piece.type,
            color: piece.color,
            label: piece.label,
            symbol: getPieceSymbol(piece),
            hasMoved: Boolean(piece.hasMoved)
          }
        : null
    )
  );
}

function boardFromJson(value) {
  if (!Array.isArray(value)) return getStartingBoard();

  return value.map((row) =>
    row.map((piece) =>
      piece
        ? {
            type: piece.type,
            color: piece.color,
            label: piece.label || PIECE_LABELS[piece.type] || piece.type,
            symbol: piece.symbol || SYMBOLS[piece.color]?.[piece.type] || "?",
            hasMoved: Boolean(piece.hasMoved),
            id: piece.id || `${piece.color}-${piece.type}-${Math.random().toString(16).slice(2)}`
          }
        : null
    )
  );
}

function boardToFenLite(board, turn = COLORS.WHITE) {
  const typeMap = {
    king: "k",
    queen: "q",
    rook: "r",
    bishop: "b",
    knight: "n",
    pawn: "p"
  };

  const rows = board.map((row) => {
    let empty = 0;
    let out = "";

    for (const piece of row) {
      if (!piece) {
        empty++;
        continue;
      }

      if (empty) {
        out += String(empty);
        empty = 0;
      }

      const letter = typeMap[piece.type] || "?";
      out += piece.color === COLORS.WHITE ? letter.toUpperCase() : letter;
    }

    if (empty) out += String(empty);
    return out;
  });

  return `${rows.join("/")} ${turn === COLORS.WHITE ? "w" : "b"}`;
}

function getMaterialScore(board, color) {
  let score = 0;

  for (const row of board) {
    for (const piece of row) {
      if (!piece || piece.color !== color) continue;
      score += MATERIAL_VALUE[piece.type] || 0;
    }
  }

  return score;
}

function getCapturedFromBoards(startBoard, currentBoard) {
  const startCounts = {};
  const currentCounts = {};

  for (const row of startBoard) {
    for (const piece of row) {
      if (!piece) continue;
      const key = `${piece.color}-${piece.type}`;
      startCounts[key] = (startCounts[key] || 0) + 1;
    }
  }

  for (const row of currentBoard) {
    for (const piece of row) {
      if (!piece) continue;
      const key = `${piece.color}-${piece.type}`;
      currentCounts[key] = (currentCounts[key] || 0) + 1;
    }
  }

  const capturedWhite = [];
  const capturedBlack = [];

  for (const key of Object.keys(startCounts)) {
    const missing = startCounts[key] - (currentCounts[key] || 0);
    if (missing <= 0) continue;

    const [color, type] = key.split("-");

    for (let i = 0; i < missing; i++) {
      const piece = createPiece(type, color);
      if (color === COLORS.WHITE) capturedWhite.push(piece);
      if (color === COLORS.BLACK) capturedBlack.push(piece);
    }
  }

  return { capturedWhite, capturedBlack };
}

export {
  COLORS,
  PIECES,
  PIECE_LABELS,
  SYMBOLS,
  MATERIAL_VALUE,
  createPiece,
  getStartingBoard,
  cloneBoard,
  clonePiece,
  getPieceSymbol,
  getPieceClass,
  getCapturedSummary,
  boardToJson,
  boardFromJson,
  boardToFenLite,
  getMaterialScore,
  getCapturedFromBoards
};
