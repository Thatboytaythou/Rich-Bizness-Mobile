/* =========================================================
   RICH BIZNESS LLC
   TOUCH-TURN DECAGON OMNI ENGINE
   /core/engine/omni-engine.js
========================================================= */

const dial = document.getElementById("dialUi");

const ROUTES = {
  feed: "/feed.html",
  watch: "/watch.html",
  live: "/live.html",
  music: "/music.html",
  gaming: "/gaming.html",
  meta: "/meta.html",
  sports: "/sports.html",
  gallery: "/gallery.html",
  upload: "/upload.html",
  store: "/store.html"
};

const ORDER = [
  "feed",
  "watch",
  "live",
  "music",
  "gaming",
  "meta",
  "sports",
  "gallery",
  "upload",
  "store"
];

const step = (Math.PI * 2) / ORDER.length;

let rotation = 0;
let velocity = 0;
let dragging = false;
let lastAngle = 0;
let moved = false;
let activeKey = "live";

function normalizeAngle(angle) {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}

function getCenter() {
  const rect = dial.getBoundingClientRect();

  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2
  };
}

function getPointerAngle(event) {
  const point = event.touches ? event.touches[0] : event;
  const center = getCenter();

  return Math.atan2(
    point.clientY - center.y,
    point.clientX - center.x
  );
}

function setVars() {
  document.documentElement.style.setProperty(
    "--rb-dial-rotation",
    `${rotation}rad`
  );

  document.documentElement.style.setProperty(
    "--rb-dial-counter-rotation",
    `${-rotation}rad`
  );
}

function getActiveFromRotation() {
  const normalized =
    ((-rotation + Math.PI / 2) % (Math.PI * 2) + Math.PI * 2) %
    (Math.PI * 2);

  const index = Math.round(normalized / step) % ORDER.length;

  return ORDER[index] || "live";
}

function setActive(key, fromEngine = true) {
  activeKey = key || "live";

  window.RB_ACTIVE_KEY = activeKey;
  window.RB_ACTIVE_ROUTE = ROUTES[activeKey] || "/feed.html";

  document.querySelectorAll("[data-dial-card]").forEach((card) => {
    card.classList.toggle("is-active", card.dataset.dialCard === activeKey);
  });

  const activeCard = document.querySelector(`[data-dial-card="${activeKey}"]`);
  const title =
    activeCard?.querySelector(".dial-title")?.textContent ||
    activeKey.toUpperCase();

  const activateSub = document.getElementById("activateSub");
  if (activateSub) activateSub.textContent = `ENTER ${title}`;

  const portalStatus = document.getElementById("portalStatus");
  if (portalStatus) portalStatus.textContent = title;

  if (!fromEngine && typeof window.RB_spinTo === "function") {
    window.RB_spinTo(activeKey);
  }
}

function snapToActive() {
  const index = ORDER.indexOf(activeKey);
  if (index < 0) return;

  const target = -(index * step) + Math.PI / 2;
  rotation = target;
  velocity = 0;

  setVars();
}

function updateActiveFromWheel() {
  const next = getActiveFromRotation();

  if (next !== activeKey) {
    setActive(next, true);
  }
}

function pointerDown(event) {
  if (!dial) return;

  dragging = true;
  moved = false;
  velocity = 0;
  lastAngle = getPointerAngle(event);

  dial.classList.add("is-dragging");
}

function pointerMove(event) {
  if (!dragging) return;

  event.preventDefault();

  const angle = getPointerAngle(event);
  const delta = normalizeAngle(angle - lastAngle);

  if (Math.abs(delta) > 0.002) moved = true;

  rotation += delta;
  velocity = delta;

  lastAngle = angle;

  setVars();
  updateActiveFromWheel();
}

function pointerUp() {
  if (!dragging) return;

  dragging = false;
  dial.classList.remove("is-dragging");
}

function animate() {
  requestAnimationFrame(animate);

  if (!dragging) {
    rotation += velocity;
    velocity *= 0.91;

    if (Math.abs(velocity) < 0.0009) {
      velocity = 0;

      const snapIndex = Math.round((rotation - Math.PI / 2) / step);
      const target = snapIndex * step + Math.PI / 2;

      rotation += (target - rotation) * 0.12;
    }

    setVars();
    updateActiveFromWheel();
  }
}

/* CLICK CARD = SNAP TO THAT CARD */
document.addEventListener("click", (event) => {
  const card = event.target.closest("[data-dial-card]");
  if (!card) return;

  if (moved) {
    event.preventDefault();
    event.stopPropagation();
    return;
  }

  const key = card.dataset.dialCard;
  const index = ORDER.indexOf(key);

  if (index >= 0) {
    rotation = -(index * step) + Math.PI / 2;
    velocity = 0;

    setVars();
    setActive(key, true);
  }
});

/* GLOBAL SPIN FUNCTION FOR HTML */
window.RB_spinTo = function (key) {
  const index = ORDER.indexOf(key);
  if (index < 0) return;

  rotation = -(index * step) + Math.PI / 2;
  velocity = 0;

  setVars();
  setActive(key, true);
};

window.enterWorld = function () {
  window.location.href = window.RB_ACTIVE_ROUTE || "/feed.html";
};

window.enter = window.enterWorld;

/* TOUCH + MOUSE CONTROL */
window.addEventListener("pointerdown", pointerDown, { passive: false });
window.addEventListener("pointermove", pointerMove, { passive: false });
window.addEventListener("pointerup", pointerUp);
window.addEventListener("pointercancel", pointerUp);

/* BOOT */
window.RB_ACTIVE_KEY = "live";
window.RB_ACTIVE_ROUTE = "/live.html";

setVars();
setActive("live", true);
snapToActive();
animate();

console.log("RICH BIZNESS TOUCH-TURN DECAGON ENGINE READY");
