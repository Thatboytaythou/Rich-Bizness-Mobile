/* =========================
   RICH CHESS FX ENGINE
   /games/rich-chess/effects.js
========================= */

const board = document.getElementById("chessBoard");

function createShockwave(x, y) {
  const wave = document.createElement("div");

  wave.style.position = "fixed";
  wave.style.left = `${x}px`;
  wave.style.top = `${y}px`;
  wave.style.width = "14px";
  wave.style.height = "14px";
  wave.style.borderRadius = "50%";
  wave.style.pointerEvents = "none";
  wave.style.zIndex = "99999";
  wave.style.border = "3px solid rgba(190,255,120,.95)";
  wave.style.boxShadow = `
    0 0 18px rgba(190,255,120,.95),
    0 0 45px rgba(190,255,120,.55)
  `;
  wave.style.transform = "translate(-50%,-50%) scale(.2)";
  wave.style.opacity = "1";

  document.body.appendChild(wave);

  requestAnimationFrame(() => {
    wave.style.transition = `
      transform .6s ease-out,
      opacity .6s ease-out
    `;

    wave.style.transform = "translate(-50%,-50%) scale(10)";
    wave.style.opacity = "0";
  });

  setTimeout(() => wave.remove(), 650);
}

function explodeSquare(square) {
  if (!square) return;

  const rect = square.getBoundingClientRect();

  createShockwave(
    rect.left + rect.width / 2,
    rect.top + rect.height / 2
  );

  square.animate(
    [
      {
        filter: "brightness(1)",
        transform: "scale(1)"
      },
      {
        filter: "brightness(1.8)",
        transform: "scale(1.08)"
      },
      {
        filter: "brightness(1)",
        transform: "scale(1)"
      }
    ],
    {
      duration: 340,
      easing: "ease-out"
    }
  );
}

function glowPiece(pieceEl) {
  if (!pieceEl) return;

  pieceEl.animate(
    [
      {
        filter: `
          drop-shadow(0 0 0 rgba(190,255,120,0))
        `
      },
      {
        filter: `
          drop-shadow(0 0 18px rgba(190,255,120,.95))
          drop-shadow(0 0 40px rgba(190,255,120,.55))
        `
      },
      {
        filter: `
          drop-shadow(0 0 0 rgba(190,255,120,0))
        `
      }
    ],
    {
      duration: 500,
      easing: "ease-out"
    }
  );
}

function showMoveTrail(fromSquare, toSquare) {
  if (!fromSquare || !toSquare) return;

  const from = fromSquare.getBoundingClientRect();
  const to = toSquare.getBoundingClientRect();

  const trail = document.createElement("div");

  const length = Math.hypot(
    to.left - from.left,
    to.top - from.top
  );

  const angle = Math.atan2(
    to.top - from.top,
    to.left - from.left
  ) * (180 / Math.PI);

  trail.style.position = "fixed";
  trail.style.left = `${from.left + from.width / 2}px`;
  trail.style.top = `${from.top + from.height / 2}px`;
  trail.style.width = `${length}px`;
  trail.style.height = "5px";
  trail.style.transformOrigin = "left center";
  trail.style.transform = `
    rotate(${angle}deg)
    scaleX(0)
  `;
  trail.style.borderRadius = "999px";
  trail.style.pointerEvents = "none";
  trail.style.zIndex = "9999";
  trail.style.opacity = ".95";

  trail.style.background = `
    linear-gradient(
      90deg,
      rgba(190,255,120,.95),
      rgba(255,229,138,.95),
      rgba(190,255,120,0)
    )
  `;

  trail.style.boxShadow = `
    0 0 18px rgba(190,255,120,.95),
    0 0 40px rgba(255,229,138,.45)
  `;

  document.body.appendChild(trail);

  requestAnimationFrame(() => {
    trail.style.transition = `
      transform .28s ease-out,
      opacity .45s ease-out
    `;

    trail.style.transform = `
      rotate(${angle}deg)
      scaleX(1)
    `;
  });

  setTimeout(() => {
    trail.style.opacity = "0";
  }, 220);

  setTimeout(() => trail.remove(), 700);
}

function rainVictory() {
  for (let i = 0; i < 24; i++) {
    const spark = document.createElement("div");

    spark.textContent = ["♔","♕","♖","♗","♘","♙"][Math.floor(Math.random() * 6)];

    spark.style.position = "fixed";
    spark.style.left = `${Math.random() * window.innerWidth}px`;
    spark.style.top = "-40px";
    spark.style.fontSize = `${24 + Math.random() * 30}px`;
    spark.style.color = Math.random() > .5
      ? "#dfffbc"
      : "#ffe58a";

    spark.style.pointerEvents = "none";
    spark.style.zIndex = "99999";

    spark.style.filter = `
      drop-shadow(0 0 12px rgba(190,255,120,.95))
    `;

    document.body.appendChild(spark);

    spark.animate(
      [
        {
          transform: `
            translateY(0px)
            rotate(0deg)
          `,
          opacity: 0
        },
        {
          opacity: 1
        },
        {
          transform: `
            translateY(${window.innerHeight + 200}px)
            rotate(${220 + Math.random() * 240}deg)
          `,
          opacity: 0
        }
      ],
      {
        duration: 3000 + Math.random() * 2200,
        easing: "linear"
      }
    );

    setTimeout(() => spark.remove(), 5400);
  }
}

function boardPowerPulse() {
  if (!board) return;

  board.animate(
    [
      {
        boxShadow: `
          0 0 45px rgba(0,0,0,.85),
          0 0 32px rgba(128,255,80,.18)
        `
      },
      {
        boxShadow: `
          0 0 65px rgba(0,0,0,.95),
          0 0 70px rgba(190,255,120,.42)
        `
      },
      {
        boxShadow: `
          0 0 45px rgba(0,0,0,.85),
          0 0 32px rgba(128,255,80,.18)
        `
      }
    ],
    {
      duration: 720,
      easing: "ease-in-out"
    }
  );
}

export {
  createShockwave,
  explodeSquare,
  glowPiece,
  showMoveTrail,
  rainVictory,
  boardPowerPulse
};
