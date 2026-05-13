/* =========================
   RICH BIZNESS — RICH CHESS
   /games/rich-chess/effects.js
   Realtime Visual FX Engine
========================= */

function getCenter(el) {
  if (!el) return { x: window.innerWidth / 2, y: window.innerHeight / 2 };

  const rect = el.getBoundingClientRect();

  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2
  };
}

function createFxLayer() {
  let layer = document.getElementById("richChessFxLayer");

  if (layer) return layer;

  layer = document.createElement("div");
  layer.id = "richChessFxLayer";
  layer.style.position = "fixed";
  layer.style.inset = "0";
  layer.style.pointerEvents = "none";
  layer.style.zIndex = "99999";
  layer.style.overflow = "hidden";

  document.body.appendChild(layer);
  return layer;
}

function createShockwave(x, y, strong = false) {
  const layer = createFxLayer();
  const wave = document.createElement("div");

  wave.className = "rich-chess-shockwave";
  wave.style.position = "absolute";
  wave.style.left = `${x}px`;
  wave.style.top = `${y}px`;
  wave.style.width = strong ? "22px" : "14px";
  wave.style.height = strong ? "22px" : "14px";
  wave.style.borderRadius = "50%";
  wave.style.transform = "translate(-50%,-50%) scale(.2)";
  wave.style.opacity = "1";
  wave.style.border = strong
    ? "4px solid rgba(255,229,138,.98)"
    : "3px solid rgba(157,255,103,.95)";
  wave.style.boxShadow = strong
    ? "0 0 25px rgba(255,229,138,.95), 0 0 60px rgba(157,255,103,.55)"
    : "0 0 18px rgba(157,255,103,.95), 0 0 45px rgba(157,255,103,.45)";

  layer.appendChild(wave);

  requestAnimationFrame(() => {
    wave.style.transition = "transform .72s cubic-bezier(.2,.9,.2,1), opacity .72s ease-out";
    wave.style.transform = `translate(-50%,-50%) scale(${strong ? 15 : 10})`;
    wave.style.opacity = "0";
  });

  setTimeout(() => wave.remove(), 780);
}

function explodeSquare(square, strong = true) {
  if (!square) return;

  const { x, y } = getCenter(square);

  createShockwave(x, y, strong);

  square.animate(
    [
      { filter: "brightness(1)", transform: "scale(1)" },
      { filter: "brightness(1.95) saturate(1.55)", transform: "scale(1.09)" },
      { filter: "brightness(1)", transform: "scale(1)" }
    ],
    {
      duration: 420,
      easing: "cubic-bezier(.2,.9,.2,1)"
    }
  );

  for (let i = 0; i < 14; i++) {
    spawnSpark(x, y, strong);
  }
}

function spawnSpark(x, y, gold = false) {
  const layer = createFxLayer();
  const spark = document.createElement("div");

  const size = 4 + Math.random() * 7;
  const angle = Math.random() * Math.PI * 2;
  const distance = 45 + Math.random() * 95;

  spark.style.position = "absolute";
  spark.style.left = `${x}px`;
  spark.style.top = `${y}px`;
  spark.style.width = `${size}px`;
  spark.style.height = `${size}px`;
  spark.style.borderRadius = "50%";
  spark.style.background = gold ? "#ffe58a" : "#9dff67";
  spark.style.boxShadow = gold
    ? "0 0 14px rgba(255,229,138,.95)"
    : "0 0 14px rgba(157,255,103,.95)";
  spark.style.transform = "translate(-50%,-50%) scale(1)";
  spark.style.opacity = "1";

  layer.appendChild(spark);

  const dx = Math.cos(angle) * distance;
  const dy = Math.sin(angle) * distance;

  spark.animate(
    [
      { transform: "translate(-50%,-50%) scale(1)", opacity: 1 },
      { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(.15)`, opacity: 0 }
    ],
    {
      duration: 560 + Math.random() * 300,
      easing: "ease-out"
    }
  );

  setTimeout(() => spark.remove(), 900);
}

function glowPiece(pieceEl) {
  if (!pieceEl) return;

  pieceEl.animate(
    [
      {
        filter:
          "drop-shadow(0 12px 5px rgba(0,0,0,.62)) drop-shadow(0 0 0 rgba(157,255,103,0))",
        transform: "translateY(-7px) scale(1)"
      },
      {
        filter:
          "drop-shadow(0 14px 6px rgba(0,0,0,.7)) drop-shadow(0 0 24px rgba(255,229,138,.95)) drop-shadow(0 0 48px rgba(157,255,103,.55))",
        transform: "translateY(-10px) scale(1.08)"
      },
      {
        filter:
          "drop-shadow(0 12px 5px rgba(0,0,0,.62)) drop-shadow(0 0 0 rgba(157,255,103,0))",
        transform: "translateY(-7px) scale(1)"
      }
    ],
    {
      duration: 520,
      easing: "cubic-bezier(.2,.9,.2,1)"
    }
  );
}

function showMoveTrail(fromSquare, toSquare) {
  if (!fromSquare || !toSquare) return;

  const layer = createFxLayer();
  const from = getCenter(fromSquare);
  const to = getCenter(toSquare);

  const length = Math.hypot(to.x - from.x, to.y - from.y);
  const angle = Math.atan2(to.y - from.y, to.x - from.x) * (180 / Math.PI);

  const trail = document.createElement("div");

  trail.style.position = "absolute";
  trail.style.left = `${from.x}px`;
  trail.style.top = `${from.y}px`;
  trail.style.width = `${length}px`;
  trail.style.height = "6px";
  trail.style.borderRadius = "999px";
  trail.style.transformOrigin = "left center";
  trail.style.transform = `rotate(${angle}deg) scaleX(0)`;
  trail.style.opacity = ".95";
  trail.style.background =
    "linear-gradient(90deg, rgba(255,229,138,.98), rgba(157,255,103,.95), rgba(157,255,103,0))";
  trail.style.boxShadow =
    "0 0 18px rgba(255,229,138,.85), 0 0 40px rgba(157,255,103,.55)";

  layer.appendChild(trail);

  requestAnimationFrame(() => {
    trail.style.transition = "transform .28s cubic-bezier(.2,.9,.2,1), opacity .48s ease-out";
    trail.style.transform = `rotate(${angle}deg) scaleX(1)`;
  });

  setTimeout(() => {
    trail.style.opacity = "0";
  }, 240);

  setTimeout(() => trail.remove(), 760);
}

function boardPowerPulse() {
  const frame = document.querySelector(".board-frame");
  const glow = document.querySelector(".board-glow");

  if (frame) {
    frame.animate(
      [
        { filter: "brightness(1) saturate(1)" },
        { filter: "brightness(1.28) saturate(1.35)" },
        { filter: "brightness(1) saturate(1)" }
      ],
      {
        duration: 740,
        easing: "ease-in-out"
      }
    );
  }

  if (glow) {
    glow.animate(
      [
        { opacity: .7, transform: "scale(1)" },
        { opacity: 1, transform: "scale(1.16)" },
        { opacity: .7, transform: "scale(1)" }
      ],
      {
        duration: 740,
        easing: "ease-in-out"
      }
    );
  }
}

function rainVictory() {
  const layer = createFxLayer();
  const symbols = ["♔", "♕", "♖", "♗", "♘", "♙", "◆", "✦"];

  for (let i = 0; i < 42; i++) {
    const item = document.createElement("div");

    item.textContent = symbols[Math.floor(Math.random() * symbols.length)];
    item.style.position = "absolute";
    item.style.left = `${Math.random() * window.innerWidth}px`;
    item.style.top = "-70px";
    item.style.fontSize = `${24 + Math.random() * 34}px`;
    item.style.color = Math.random() > .45 ? "#ffe58a" : "#9dff67";
    item.style.filter = "drop-shadow(0 0 16px rgba(255,229,138,.65))";
    item.style.opacity = "0";

    layer.appendChild(item);

    item.animate(
      [
        { transform: "translateY(0) rotate(0deg) scale(.8)", opacity: 0 },
        { opacity: 1 },
        {
          transform: `translateY(${window.innerHeight + 180}px) rotate(${260 + Math.random() * 420}deg) scale(1.1)`,
          opacity: 0
        }
      ],
      {
        duration: 2800 + Math.random() * 2600,
        easing: "linear"
      }
    );

    setTimeout(() => item.remove(), 5600);
  }
}

export {
  createShockwave,
  explodeSquare,
  glowPiece,
  showMoveTrail,
  rainVictory,
  boardPowerPulse
};
