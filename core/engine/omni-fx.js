/* =========================================================
   RICH BIZNESS LLC
   CINEMATIC OMNI FX LAYER
   /core/engine/omni-fx.js
========================================================= */

const root = document.documentElement;
const dial = document.getElementById("dialUi");
const portal = document.querySelector(".portal-core");
const cards = [...document.querySelectorAll("[data-dial-card]")];

let mx = 0;
let my = 0;
let sx = 0;
let sy = 0;
let t = 0;

function setVar(name, value){
  root.style.setProperty(name, value);
}

window.addEventListener("pointermove", (e) => {
  mx = (e.clientX / window.innerWidth - 0.5) * 2;
  my = (e.clientY / window.innerHeight - 0.5) * 2;
}, { passive:true });

function activePulse(){
  const active = document.querySelector(".dial-card.is-active");
  if (!active) return;

  active.style.setProperty("--rb-card-glow", `${0.65 + Math.sin(t * 2.4) * 0.22}`);
}

function cinematicParallax(){
  sx += (mx - sx) * 0.045;
  sy += (my - sy) * 0.045;

  setVar("--rb-parallax-x", `${sx * 14}px`);
  setVar("--rb-parallax-y", `${sy * 10}px`);
  setVar("--rb-tilt-x", `${sy * -2.8}deg`);
  setVar("--rb-tilt-y", `${sx * 3.2}deg`);
}

function depthCards(){
  cards.forEach((card, i) => {
    const wave = Math.sin(t * 1.4 + i * 0.55);
    card.style.setProperty("--rb-card-depth", `${wave * 2}px`);
  });
}

function portalMotion(){
  if (!portal) return;
  const pulse = 1 + Math.sin(t * 2.1) * 0.018;
  portal.style.transform = `scale(${pulse})`;
}

function loop(){
  t += 0.016;

  cinematicParallax();
  activePulse();
  depthCards();
  portalMotion();

  requestAnimationFrame(loop);
}

loop();

console.log("RICH BIZNESS OMNI FX READY");
