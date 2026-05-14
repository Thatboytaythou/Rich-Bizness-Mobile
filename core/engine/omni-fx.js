/* =========================================================
   RICH BIZNESS LLC
   CINEMATIC UNIVERSAL OMNI FX ENGINE
   PARALLAX / DEPTH / PORTAL PULSE / HD4D ENERGY
   /core/engine/omni-fx.js
========================================================= */

const root = document.documentElement;
const body = document.body;

const dial = document.getElementById("dialUi");
const centerPortal = document.getElementById("centerPortal");
const portalCore = document.querySelector(".portal-core");
const portalFlare = document.querySelector(".portal-flare");
const cards = [...document.querySelectorAll("[data-dial-card]")];

let pointerX = 0;
let pointerY = 0;

let smoothX = 0;
let smoothY = 0;

let time = 0;
let lastFrame = performance.now();

function setVar(name, value){
  root.style.setProperty(name, value);
}

function clamp(value, min, max){
  return Math.max(min, Math.min(max, value));
}

function readActiveKey(){
  return window.RB_ACTIVE_KEY || "live";
}

function updatePointer(event){
  pointerX = clamp((event.clientX / window.innerWidth - 0.5) * 2, -1, 1);
  pointerY = clamp((event.clientY / window.innerHeight - 0.5) * 2, -1, 1);
}

function resetPointer(){
  pointerX = 0;
  pointerY = 0;
}

function updateParallax(){
  smoothX += (pointerX - smoothX) * 0.045;
  smoothY += (pointerY - smoothY) * 0.045;

  setVar("--rb-parallax-x", `${smoothX * 16}px`);
  setVar("--rb-parallax-y", `${smoothY * 12}px`);
  setVar("--rb-tilt-x", `${smoothY * -2.4}deg`);
  setVar("--rb-tilt-y", `${smoothX * 2.8}deg`);
}

function updateCardDepth(){
  cards.forEach((card, index) => {
    const wave = Math.sin(time * 1.35 + index * 0.62);
    const active = card.classList.contains("is-active");

    const depth = active
      ? -2.8 + wave * 1.2
      : wave * 1.7;

    card.style.setProperty("--rb-card-depth", `${depth}px`);
  });
}

function updateActiveGlow(){
  const activeCard = document.querySelector(".dial-card.is-active");
  if (!activeCard) return;

  const glow = 0.72 + Math.sin(time * 2.5) * 0.18;
  activeCard.style.setProperty("--rb-card-glow", String(glow));
}

function updatePortal(){
  if (!portalCore) return;

  const activeKey = readActiveKey();
  const pulse = 1 + Math.sin(time * 2.05) * 0.018;
  const breathingGlow = 1 + Math.sin(time * 2.35) * 0.06;

  if (!centerPortal?.classList.contains("portal-opening")) {
    portalCore.style.transform = `scale(${pulse})`;
    portalCore.style.filter = `brightness(${breathingGlow})`;
  }

  if (centerPortal) {
    centerPortal.dataset.activePortal = activeKey;
  }

  if (portalFlare) {
    const flare = 0.26 + Math.abs(Math.sin(time * 2.8)) * 0.18;
    portalFlare.style.opacity = String(flare);
  }
}

function updateRealtimeClasses(){
  const liveCard = document.querySelector('[data-dial-card="live"]');
  const liveText = document.getElementById("liveDialSub");

  if (!liveCard || !liveText) return;

  const isLive =
    liveText.textContent.toUpperCase().includes("LIVE") &&
    !liveText.textContent.toUpperCase().includes("STREAM");

  liveCard.classList.toggle("is-live", isLive);
}

function chargeOnActivate(){
  body.classList.add("portal-arming");

  setTimeout(() => {
    body.classList.remove("portal-arming");
  }, 900);
}

function hookActivateButton(){
  const activateBtn = document.getElementById("activateBtn");
  if (!activateBtn) return;

  activateBtn.addEventListener("pointerdown", () => {
    body.classList.add("portal-arming");
  });

  activateBtn.addEventListener("pointerup", chargeOnActivate);
  activateBtn.addEventListener("pointercancel", () => {
    body.classList.remove("portal-arming");
  });
}

function hookCardTouches(){
  cards.forEach((card) => {
    card.addEventListener("pointerdown", () => {
      card.classList.add("is-pressing");
    });

    card.addEventListener("pointerup", () => {
      card.classList.remove("is-pressing");
    });

    card.addEventListener("pointercancel", () => {
      card.classList.remove("is-pressing");
    });
  });
}

function animate(now){
  const delta = Math.min((now - lastFrame) / 1000, 0.04);
  lastFrame = now;
  time += delta;

  updateParallax();
  updateCardDepth();
  updateActiveGlow();
  updatePortal();
  updateRealtimeClasses();

  requestAnimationFrame(animate);
}

window.addEventListener("pointermove", updatePointer, { passive:true });
window.addEventListener("pointerleave", resetPointer);
window.addEventListener("blur", resetPointer);

hookActivateButton();
hookCardTouches();

requestAnimationFrame(animate);

console.log("RICH BIZNESS CINEMATIC OMNI FX ENGINE READY");
