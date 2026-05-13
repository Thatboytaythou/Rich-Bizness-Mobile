/* =========================
   RICH CHESS CAMERA ENGINE
   /games/rich-chess/camera.js
========================= */

const board = document.getElementById("chessBoard");

let tiltX = 4;
let tiltY = 0;

function applyCamera() {
  if (!board) return;

  board.style.transform = `
    perspective(1400px)
    rotateX(${tiltX}deg)
    rotateY(${tiltY}deg)
    scale(1)
  `;
}

function resetCamera() {
  tiltX = 4;
  tiltY = 0;
  applyCamera();
}

function pulseBoard() {
  if (!board) return;

  board.animate(
    [
      {
        transform: `
          perspective(1400px)
          rotateX(${tiltX}deg)
          rotateY(${tiltY}deg)
          scale(1)
        `
      },
      {
        transform: `
          perspective(1400px)
          rotateX(${tiltX + 1.2}deg)
          rotateY(${tiltY}deg)
          scale(1.015)
        `
      },
      {
        transform: `
          perspective(1400px)
          rotateX(${tiltX}deg)
          rotateY(${tiltY}deg)
          scale(1)
        `
      }
    ],
    {
      duration: 420,
      easing: "ease-out"
    }
  );
}

function cinematicMove(fromSquare, toSquare) {
  if (!board) return;

  const from = fromSquare?.getBoundingClientRect?.();
  const to = toSquare?.getBoundingClientRect?.();

  if (!from || !to) {
    pulseBoard();
    return;
  }

  const deltaX = to.left - from.left;

  tiltY = Math.max(-7, Math.min(7, deltaX / 18));

  board.animate(
    [
      {
        transform: `
          perspective(1400px)
          rotateX(4deg)
          rotateY(0deg)
          scale(1)
        `
      },
      {
        transform: `
          perspective(1400px)
          rotateX(8deg)
          rotateY(${tiltY}deg)
          scale(1.02)
        `
      },
      {
        transform: `
          perspective(1400px)
          rotateX(4deg)
          rotateY(0deg)
          scale(1)
        `
      }
    ],
    {
      duration: 520,
      easing: "ease-out"
    }
  );

  setTimeout(() => {
    resetCamera();
  }, 520);
}

function enableBoardTracking() {
  if (!board) return;

  board.addEventListener("pointermove", (event) => {
    const rect = board.getBoundingClientRect();

    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;

    tiltY = (x - 0.5) * 8;
    tiltX = 6 - (y * 4);

    applyCamera();
  });

  board.addEventListener("pointerleave", () => {
    resetCamera();
  });
}

function flashVictory() {
  if (!board) return;

  board.animate(
    [
      {
        filter: "brightness(1)"
      },
      {
        filter: "brightness(1.45)"
      },
      {
        filter: "brightness(1)"
      }
    ],
    {
      duration: 1200,
      easing: "ease-in-out"
    }
  );
}

applyCamera();
enableBoardTracking();

export {
  applyCamera,
  resetCamera,
  pulseBoard,
  cinematicMove,
  flashVictory
};
