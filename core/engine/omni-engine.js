/* =========================================================
   RICH BIZNESS LLC
   CINEMATIC UNIVERSAL OMNI ENGINE
   TOUCH-TURN PS5 LOCK DIAL / SNAP / PORTAL CONTROL
   /core/engine/omni-engine.js
========================================================= */

const dial = document.getElementById("dialUi");
const centerPortal = document.getElementById("centerPortal");

const ROUTES = {
  feed: "/feed.html",
  watch: "/watch.html",
  live: "/live.html",
  music: "/music.html",
  gaming: "/gaming.html",
  sports: "/sports.html",
  gallery: "/gallery.html",
  upload: "/upload.html",
  store: "/store.html",
  meta: "/meta.html"
};

const ORDER = [
  "feed",
  "watch",
  "live",
  "music",
  "gaming",
  "sports",
  "gallery",
  "upload",
  "store",
  "meta"
];

const STEP = (Math.PI * 2) / ORDER.length;

let rotation = 0;
let velocity = 0;
let dragging = false;
let moved = false;
let lastAngle = 0;
let activeKey = "live";
let locked = false;

function normalizeAngle(angle){
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}

function getDialCenter(){
  const rect = dial.getBoundingClientRect();

  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2
  };
}

function getPointerAngle(event){
  const center = getDialCenter();

  return Math.atan2(
    event.clientY - center.y,
    event.clientX - center.x
  );
}

function setDialVars(){
  document.documentElement.style.setProperty(
    "--rb-dial-rotation",
    `${rotation}rad`
  );

  document.documentElement.style.setProperty(
    "--rb-dial-counter-rotation",
    `${-rotation}rad`
  );
}

function getActiveFromRotation(){
  const normalized =
    ((-rotation + Math.PI / 2) % (Math.PI * 2) + Math.PI * 2) %
    (Math.PI * 2);

  const index = Math.round(normalized / STEP) % ORDER.length;

  return ORDER[index] || "live";
}

function setActive(key, fromEngine = true){
  if (!key || !ROUTES[key]) return;

  activeKey = key;

  window.RB_ACTIVE_KEY = key;
  window.RB_ACTIVE_ROUTE = ROUTES[key];

  document.querySelectorAll("[data-dial-card]").forEach((card) => {
    const isActive = card.dataset.dialCard === key;

    card.classList.toggle("is-active", isActive);

    if (card.dataset.dialCard === "live") {
      card.classList.toggle("is-live", isActive);
    }
  });

  const activeCard = document.querySelector(`[data-dial-card="${key}"]`);
  const title =
    activeCard?.querySelector(".dial-title")?.textContent ||
    key.toUpperCase();

  const activateSub = document.getElementById("activateSub");
  const portalStatus = document.getElementById("portalStatus");

  if (activateSub) activateSub.textContent = `ENTER ${title}`;
  if (portalStatus) portalStatus.textContent = title;
  if (centerPortal) centerPortal.dataset.activePortal = key;

  if (typeof window.setActiveDial === "function" && fromEngine) {
    window.setActiveDial(key, true);
  }
}

function rotationForKey(key){
  const index = ORDER.indexOf(key);
  if (index < 0) return rotation;

  return -(index * STEP) + Math.PI / 2;
}

function snapToKey(key){
  if (!key || !ROUTES[key]) return;

  rotation = rotationForKey(key);
  velocity = 0;

  setDialVars();
  setActive(key, true);
}

function updateActiveFromWheel(){
  const next = getActiveFromRotation();

  if (next !== activeKey) {
    setActive(next, true);
  }
}

function onPointerDown(event){
  if (!dial || locked) return;

  dragging = true;
  moved = false;
  velocity = 0;
  lastAngle = getPointerAngle(event);

  dial.classList.add("is-dragging");
  document.body.classList.add("dial-touching");
}

function onPointerMove(event){
  if (!dragging || locked) return;

  event.preventDefault();

  const angle = getPointerAngle(event);
  const delta = normalizeAngle(angle - lastAngle);

  if (Math.abs(delta) > 0.003) moved = true;

  rotation += delta;
  velocity = delta * 0.88;
  lastAngle = angle;

  setDialVars();
  updateActiveFromWheel();
}

function onPointerUp(){
  if (!dragging) return;

  dragging = false;

  dial.classList.remove("is-dragging");
  document.body.classList.remove("dial-touching");
}

function animate(){
  requestAnimationFrame(animate);

  if (!dragging && !locked) {
    rotation += velocity;
    velocity *= 0.885;

    const snapIndex = Math.round((rotation - Math.PI / 2) / STEP);
    const target = snapIndex * STEP + Math.PI / 2;
    const distance = target - rotation;

    if (Math.abs(velocity) < 0.0035) {
      rotation += distance * 0.115;
    }

    if (Math.abs(velocity) < 0.00018 && Math.abs(distance) < 0.0008) {
      velocity = 0;
      rotation = target;
    }

    setDialVars();
    updateActiveFromWheel();
  }
}

function armPortal(){
  if (locked) return;

  locked = true;

  document.body.classList.add("portal-arming");

  if (centerPortal) {
    centerPortal.classList.add("portal-opening");
  }

  setTimeout(() => {
    window.location.href = window.RB_ACTIVE_ROUTE || ROUTES[activeKey] || "/feed.html";
  }, 560);
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

    const key = card.dataset.dialCard;
    snapToKey(key);
  },
  true
);

window.RB_spinTo = function(key){
  snapToKey(key);
};

window.enterWorld = function(){
  armPortal();
};

window.enter = window.enterWorld;

if (dial) {
  window.addEventListener("pointerdown", onPointerDown, { passive:false });
  window.addEventListener("pointermove", onPointerMove, { passive:false });
  window.addEventListener("pointerup", onPointerUp);
  window.addEventListener("pointercancel", onPointerUp);

  snapToKey("live");
  animate();
}

console.log("RICH BIZNESS CINEMATIC OMNI ENGINE READY");
