/* =========================================================
   RICH BIZNESS LLC
   CINEMATIC TOUCH-TURN DECAGON ENGINE
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
let raf = null;

function normalize(angle) {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}

function centerOfDial() {
  const rect = dial.getBoundingClientRect();

  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2
  };
}

function pointerAngle(event) {
  const center = centerOfDial();

  return Math.atan2(
    event.clientY - center.y,
    event.clientX - center.x
  );
}

function setDialVars() {
  document.documentElement.style.setProperty("--rb-dial-rotation", `${rotation}rad`);
  document.documentElement.style.setProperty("--rb-dial-counter-rotation", `${-rotation}rad`);
}

function activeFromRotation() {
  const normalized =
    ((-rotation + Math.PI / 2) % (Math.PI * 2) + Math.PI * 2) %
    (Math.PI * 2);

  const index = Math.round(normalized / step) % ORDER.length;
  return ORDER[index] || "live";
}

function setActive(key) {
  if (!key || !ROUTES[key]) return;

  activeKey = key;

  window.RB_ACTIVE_KEY = key;
  window.RB_ACTIVE_ROUTE = ROUTES[key];

  document.querySelectorAll("[data-dial-card]").forEach((card) => {
    card.classList.toggle("is-active", card.dataset.dialCard === key);
  });

  const card = document.querySelector(`[data-dial-card="${key}"]`);
  const title = card?.querySelector(".dial-title")?.textContent || key.toUpperCase();

  const activateSub = document.getElementById("activateSub");
  const portalStatus = document.getElementById("portalStatus");

  if (activateSub) activateSub.textContent = `ENTER ${title}`;
  if (portalStatus) portalStatus.textContent = title;
}

function snapRotationToKey(key) {
  const index = ORDER.indexOf(key);
  if (index < 0) return;

  rotation = -(index * step) + Math.PI / 2;
  velocity = 0;

  setDialVars();
  setActive(key);
}

function updateActive() {
  const next = activeFromRotation();
  if (next !== activeKey) setActive(next);
}

function onPointerDown(event) {
  if (!dial) return;

  dragging = true;
  moved = false;
  velocity = 0;
  lastAngle = pointerAngle(event);

  dial.classList.add("is-dragging");
}

function onPointerMove(event) {
  if (!dragging) return;

  event.preventDefault();

  const angle = pointerAngle(event);
  const delta = normalize(angle - lastAngle);

  if (Math.abs(delta) > 0.003) moved = true;

  rotation += delta;
  velocity = delta * 0.82;
  lastAngle = angle;

  setDialVars();
  updateActive();
}

function onPointerUp() {
  if (!dragging) return;

  dragging = false;
  dial.classList.remove("is-dragging");
}

function animate() {
  raf = requestAnimationFrame(animate);

  if (!dragging) {
    rotation += velocity;
    velocity *= 0.88;

    const activeIndex = Math.round((rotation - Math.PI / 2) / step);
    const target = activeIndex * step + Math.PI / 2;

    if (Math.abs(velocity) < 0.0025) {
      rotation += (target - rotation) * 0.12;
    }

    if (Math.abs(velocity) < 0.0002 && Math.abs(target - rotation) < 0.0008) {
      velocity = 0;
      rotation = target;
    }

    setDialVars();
    updateActive();
  }
}

document.addEventListener(
  "click",
  (event) => {
    const card = event.target.closest("[data-dial-card]");

    if (!card) return;

    if (moved) {
      event.preventDefault();
      event.stopPropagation();
      moved = false;
      return;
    }

    event.preventDefault();
    snapRotationToKey(card.dataset.dialCard);
  },
  true
);

window.RB_spinTo = function (key) {
  snapRotationToKey(key);
};

window.enterWorld = function () {
  window.location.href = window.RB_ACTIVE_ROUTE || "/feed.html";
};

window.enter = window.enterWorld;

if (dial) {
  window.addEventListener("pointerdown", onPointerDown, { passive: false });
  window.addEventListener("pointermove", onPointerMove, { passive: false });
  window.addEventListener("pointerup", onPointerUp);
  window.addEventListener("pointercancel", onPointerUp);

  snapRotationToKey("live");
  animate();
}
