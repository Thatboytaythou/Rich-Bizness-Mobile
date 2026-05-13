/* =========================
   RICH BIZNESS — RICH CHESS
   /games/rich-chess/camera.js
   Cinematic Board Camera + Depth Motion
========================= */

let board = null;
let boardFrame = null;
let boardStage = null;
let glow = null;

let tiltX = 7;
let tiltY = 0;
let scale = 1;
let trackingEnabled = true;

function getEls() {
  board = board || document.getElementById("chessBoard");
  boardFrame = boardFrame || document.querySelector(".board-frame");
  boardStage = boardStage || document.querySelector(".board-stage");
  glow = glow || document.querySelector(".board-glow");

  return { board, boardFrame, boardStage, glow };
}

function setBoardTransform({
  x = tiltX,
  y = tiltY,
  s = scale,
  duration = 0
} = {}) {
  const els = getEls();
  if (!els.boardFrame) return;

  tiltX = x;
  tiltY = y;
  scale = s;

  els.boardFrame.style.transition = duration
    ? `transform ${duration}ms cubic-bezier(.2,.9,.2,1)`
    : "none";

  els.boardFrame.style.transform = `
    perspective(1600px)
    rotateX(${tiltX}deg)
    rotateY(${tiltY}deg)
    scale(${scale})
  `;
}

function applyCamera() {
  setBoardTransform({ x: tiltX, y: tiltY, s: scale });
}

function resetCamera() {
  setBoardTransform({
    x: 7,
    y: 0,
    s: 1,
    duration: 420
  });

  const els = getEls();

  if (els.glow) {
    els.glow.style.transform = "translate3d(0,0,0) scale(1)";
  }
}

function pulseBoard() {
  const els = getEls();
  if (!els.boardFrame) return;

  els.boardFrame.animate(
    [
      {
        transform: `
          perspective(1600px)
          rotateX(7deg)
          rotateY(0deg)
          scale(1)
        `
      },
      {
        transform: `
          perspective(1600px)
          rotateX(10deg)
          rotateY(0deg)
          scale(1.025)
        `
      },
      {
        transform: `
          perspective(1600px)
          rotateX(7deg)
          rotateY(0deg)
          scale(1)
        `
      }
    ],
    {
      duration: 620,
      easing: "cubic-bezier(.2,.9,.2,1)"
    }
  );
}

function boardShake(power = 1) {
  const els = getEls();
  if (!els.boardFrame) return;

  const amount = Math.max(2, Math.min(12, power * 6));

  els.boardFrame.animate(
    [
      { transform: `perspective(1600px) rotateX(7deg) translate3d(0,0,0) scale(1)` },
      { transform: `perspective(1600px) rotateX(8deg) translate3d(${amount}px,-${amount / 2}px,0) scale(1.01)` },
      { transform: `perspective(1600px) rotateX(6deg) translate3d(-${amount}px,${amount / 2}px,0) scale(1.01)` },
      { transform: `perspective(1600px) rotateX(7deg) translate3d(0,0,0) scale(1)` }
    ],
    {
      duration: 360,
      easing: "ease-out"
    }
  );
}

function cinematicMove(fromSquare, toSquare) {
  const els = getEls();
  if (!els.boardFrame || !fromSquare || !toSquare) {
    pulseBoard();
    return;
  }

  const from = fromSquare.getBoundingClientRect();
  const to = toSquare.getBoundingClientRect();

  const dx = to.left - from.left;
  const dy = to.top - from.top;

  const moveTiltY = Math.max(-9, Math.min(9, dx / 26));
  const moveTiltX = Math.max(3, Math.min(12, 7 - dy / 38));

  els.boardFrame.animate(
    [
      {
        transform: `
          perspective(1600px)
          rotateX(7deg)
          rotateY(0deg)
          scale(1)
        `,
        filter: "brightness(1)"
      },
      {
        transform: `
          perspective(1600px)
          rotateX(${moveTiltX}deg)
          rotateY(${moveTiltY}deg)
          scale(1.025)
        `,
        filter: "brightness(1.16)"
      },
      {
        transform: `
          perspective(1600px)
          rotateX(7deg)
          rotateY(0deg)
          scale(1)
        `,
        filter: "brightness(1)"
      }
    ],
    {
      duration: 650,
      easing: "cubic-bezier(.2,.9,.2,1)"
    }
  );

  if (els.glow) {
    els.glow.animate(
      [
        { transform: "scale(1)", opacity: 0.75 },
        { transform: "scale(1.12)", opacity: 1 },
        { transform: "scale(1)", opacity: 0.75 }
      ],
      {
        duration: 650,
        easing: "ease-out"
      }
    );
  }
}

function focusSquare(square) {
  const els = getEls();
  if (!els.boardFrame || !square) return;

  const boardRect = els.boardFrame.getBoundingClientRect();
  const rect = square.getBoundingClientRect();

  const x = ((rect.left + rect.width / 2) - (boardRect.left + boardRect.width / 2)) / boardRect.width;
  const y = ((rect.top + rect.height / 2) - (boardRect.top + boardRect.height / 2)) / boardRect.height;

  setBoardTransform({
    x: 8 - y * 5,
    y: x * 10,
    s: 1.018,
    duration: 260
  });
}

function enableBoardTracking() {
  const els = getEls();
  if (!els.boardStage || !els.boardFrame) return;

  els.boardStage.addEventListener("pointermove", (event) => {
    if (!trackingEnabled) return;

    const rect = els.boardStage.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;

    setBoardTransform({
      x: 7 - y * 7,
      y: x * 12,
      s: 1.006
    });

    if (els.glow) {
      els.glow.style.transform = `
        translate3d(${x * 24}px, ${y * 24}px, 0)
        scale(1.03)
      `;
    }
  });

  els.boardStage.addEventListener("pointerleave", () => {
    if (!trackingEnabled) return;
    resetCamera();
  });
}

function setTracking(value) {
  trackingEnabled = Boolean(value);
}

function flashVictory() {
  const els = getEls();
  if (!els.boardFrame) return;

  els.boardFrame.animate(
    [
      {
        filter: "brightness(1) saturate(1)"
      },
      {
        filter: "brightness(1.6) saturate(1.5)"
      },
      {
        filter: "brightness(1) saturate(1)"
      }
    ],
    {
      duration: 1300,
      easing: "ease-in-out"
    }
  );

  pulseBoard();
}

function bootCamera() {
  getEls();
  resetCamera();
  enableBoardTracking();
}

bootCamera();

export {
  applyCamera,
  resetCamera,
  pulseBoard,
  boardShake,
  cinematicMove,
  focusSquare,
  flashVictory,
  setTracking
};
