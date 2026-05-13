import * as THREE from "https://unpkg.com/three@0.158.0/build/three.module.js";

/* =========================================================
   RICH BIZNESS OMNI ENGINE
   USER-CONTROLLED 10 CORE CINEMA DIAL
   /core/engine/omni-engine.js
========================================================= */

const canvas = document.getElementById("engine");

/* =========================================================
   ROUTES + 10 CORE ORDER
========================================================= */

const labels = [
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

const routes = {
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

const step = (Math.PI * 2) / labels.length;

let activeIndex = labels.indexOf(window.RB_ACTIVE_KEY || "live");
if (activeIndex < 0) activeIndex = 2;

let activeName = labels[activeIndex];
let rotation = -activeIndex * step;
let targetRotation = rotation;
let velocity = 0;

let dragging = false;
let moved = false;
let lastAngle = 0;
let lastTime = performance.now();

/* =========================================================
   THREE BACKGROUND ATMOSPHERE ONLY
========================================================= */

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x020402);
scene.fog = new THREE.FogExp2(0x031003, 0.045);

const camera = new THREE.PerspectiveCamera(
  38,
  window.innerWidth / window.innerHeight,
  0.1,
  260
);

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: true,
  powerPreference: "high-performance"
});

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.28;

const clock = new THREE.Clock();

/* =========================================================
   LIGHTS
========================================================= */

scene.add(new THREE.AmbientLight(0xd8ffd0, 0.62));

const topGlow = new THREE.PointLight(0x9dff63, 16, 95);
topGlow.position.set(0, 6.4, 7.5);
scene.add(topGlow);

const portalLight = new THREE.PointLight(0x8dff5b, 18, 76);
portalLight.position.set(0, -0.25, 5.8);
scene.add(portalLight);

const leftLight = new THREE.PointLight(0x39ffc1, 5, 72);
leftLight.position.set(-7.5, 1.8, 6);
scene.add(leftLight);

const rightLight = new THREE.PointLight(0xffd76a, 5, 72);
rightLight.position.set(7.5, 1.8, 6);
scene.add(rightLight);

const bottomGlow = new THREE.PointLight(0x7fff45, 8, 58);
bottomGlow.position.set(0, -5.2, 6);
scene.add(bottomGlow);

/* =========================================================
   MATERIALS
========================================================= */

const glowMat = new THREE.MeshBasicMaterial({
  color: 0x8dff5b,
  transparent: true,
  opacity: 0.34,
  depthWrite: false
});

const softGlowMat = new THREE.MeshBasicMaterial({
  color: 0xd7ff9b,
  transparent: true,
  opacity: 0.16,
  depthWrite: false
});

const goldGlowMat = new THREE.MeshBasicMaterial({
  color: 0xffd76a,
  transparent: true,
  opacity: 0.2,
  depthWrite: false
});

const deepMetal = new THREE.MeshStandardMaterial({
  color: 0x061006,
  metalness: 0.9,
  roughness: 0.18,
  emissive: 0x071507,
  emissiveIntensity: 0.24
});

/* =========================================================
   PARTICLES
========================================================= */

function makePoints(count, spreadX, spreadY, zMin, zDepth, color, size, opacity) {
  const geo = new THREE.BufferGeometry();
  const positions = [];

  for (let i = 0; i < count; i++) {
    positions.push(
      (Math.random() - 0.5) * spreadX,
      (Math.random() - 0.5) * spreadY,
      zMin - Math.random() * zDepth
    );
  }

  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));

  return new THREE.Points(
    geo,
    new THREE.PointsMaterial({
      color,
      size,
      transparent: true,
      opacity,
      depthWrite: false
    })
  );
}

const smoke = makePoints(1500, 36, 24, -7, 25, 0x73ff55, 0.052, 0.12);
scene.add(smoke);

const greenDust = makePoints(850, 19, 14, -2, 16, 0xafff7d, 0.026, 0.26);
scene.add(greenDust);

const goldDust = makePoints(480, 22, 14, -3, 18, 0xffd76a, 0.03, 0.16);
scene.add(goldDust);

/* =========================================================
   VISUAL RIG — MATCHES HTML/CSS DIAL
========================================================= */

const rig = new THREE.Group();
scene.add(rig);

const ringRig = new THREE.Group();
ringRig.position.z = 0.1;
rig.add(ringRig);

function addRing(radius, tube, mat, z = 0) {
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(radius, tube, 32, 240),
    mat
  );

  ring.rotation.x = Math.PI / 2;
  ring.position.z = z;
  ringRig.add(ring);

  return ring;
}

const backDisc = new THREE.Mesh(
  new THREE.CylinderGeometry(2.75, 2.75, 0.12, 160),
  deepMetal
);
backDisc.rotation.x = Math.PI / 2;
backDisc.position.z = -0.18;
ringRig.add(backDisc);

const outerRing = addRing(2.8, 0.025, glowMat, 0.02);
const middleRing = addRing(2.08, 0.018, softGlowMat, 0.08);
const innerRing = addRing(1.35, 0.022, glowMat, 0.16);
const goldRing = addRing(2.48, 0.008, goldGlowMat, 0.12);

/* =========================================================
   10 SOCKET LIGHTS
========================================================= */

const socketGroup = new THREE.Group();
socketGroup.position.z = 0.22;
ringRig.add(socketGroup);

const sockets = [];

for (let i = 0; i < labels.length; i++) {
  const angle = i * step - Math.PI / 2;

  const socket = new THREE.Mesh(
    new THREE.SphereGeometry(0.06, 24, 24),
    new THREE.MeshBasicMaterial({
      color: 0x8dff5b,
      transparent: true,
      opacity: 0.45,
      depthWrite: false
    })
  );

  socket.position.set(
    Math.cos(angle) * 2.66,
    Math.sin(angle) * 2.66,
    0.22
  );

  socket.userData.index = i;
  socketGroup.add(socket);
  sockets.push(socket);

  const line = new THREE.Mesh(
    new THREE.BoxGeometry(0.018, 0.78, 0.018),
    new THREE.MeshBasicMaterial({
      color: 0x8dff5b,
      transparent: true,
      opacity: 0.18,
      depthWrite: false
    })
  );

  line.position.set(
    Math.cos(angle) * 2.08,
    Math.sin(angle) * 2.08,
    0.12
  );

  line.rotation.z = angle;
  socketGroup.add(line);
}

/* =========================================================
   CENTER ENERGY
========================================================= */

const coreGroup = new THREE.Group();
coreGroup.position.z = 0.36;
ringRig.add(coreGroup);

const coreGlow = new THREE.Mesh(
  new THREE.SphereGeometry(0.92, 72, 72),
  new THREE.MeshBasicMaterial({
    color: 0x8dff5b,
    transparent: true,
    opacity: 0.1,
    depthWrite: false
  })
);

coreGlow.scale.set(1, 1, 0.18);
coreGroup.add(coreGlow);

const coreRing = new THREE.Mesh(
  new THREE.TorusGeometry(1.08, 0.014, 12, 180),
  glowMat
);
coreRing.rotation.x = Math.PI / 2;
coreRing.position.z = 0.24;
coreGroup.add(coreRing);

const coreEnergyGeo = new THREE.BufferGeometry();
const energyPositions = [];

for (let i = 0; i < 900; i++) {
  const r = Math.random() * 1.05;
  const a = Math.random() * Math.PI * 2;

  energyPositions.push(
    Math.cos(a) * r,
    Math.sin(a) * r,
    0.05 + (Math.random() - 0.5) * 0.28
  );
}

coreEnergyGeo.setAttribute(
  "position",
  new THREE.Float32BufferAttribute(energyPositions, 3)
);

const coreEnergy = new THREE.Points(
  coreEnergyGeo,
  new THREE.PointsMaterial({
    color: 0xd9ffad,
    size: 0.022,
    transparent: true,
    opacity: 0.56,
    depthWrite: false
  })
);

coreGroup.add(coreEnergy);

/* =========================================================
   STATE SYNC
========================================================= */

function normalizeAngle(value) {
  return ((value % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
}

function closestIndexFromRotation(value) {
  const normalized = normalizeAngle(-value);
  return Math.round(normalized / step) % labels.length;
}

function setCssRotation(value) {
  document.documentElement.style.setProperty(
    "--rb-dial-rotation",
    `${value}rad`
  );

  document.documentElement.style.setProperty(
    "--rb-dial-counter-rotation",
    `${-value}rad`
  );
}

function updateSockets() {
  sockets.forEach((socket) => {
    const isActive = socket.userData.index === activeIndex;

    socket.material.opacity = isActive ? 0.95 : 0.38;
    socket.material.color.setHex(isActive ? 0xffd76a : 0x8dff5b);
    socket.scale.setScalar(isActive ? 1.55 : 1);
  });
}

function setActive(name, fromSpin = false) {
  const index = labels.indexOf(name);
  if (index < 0) return;

  activeIndex = index;
  activeName = name;

  targetRotation = -activeIndex * step;

  window.RB_ACTIVE_KEY = activeName;
  window.RB_ACTIVE_ROUTE = routes[activeName] || "/feed.html";

  updateSockets();

  if (typeof window.setActiveDial === "function") {
    window.setActiveDial(activeName, true);
  }

  if (!fromSpin) {
    velocity = 0;
  }
}

window.RB_spinTo = function (key) {
  setActive(key, false);
};

window.enterWorld = function () {
  window.location.href = window.RB_ACTIVE_ROUTE || "/feed.html";
};

window.enter = window.enterWorld;

/* =========================================================
   USER ROTATION INPUT
========================================================= */

function dialCenter() {
  const rect = canvas.getBoundingClientRect();

  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height * 0.55
  };
}

function angleFromEvent(event) {
  const center = dialCenter();
  return Math.atan2(
    event.clientY - center.y,
    event.clientX - center.x
  );
}

function shouldIgnorePointer(event) {
  return Boolean(
    event.target.closest("button") ||
    event.target.closest("a") ||
    event.target.closest(".quick-menu")
  );
}

window.addEventListener("pointerdown", (event) => {
  if (shouldIgnorePointer(event)) return;

  dragging = true;
  moved = false;
  lastAngle = angleFromEvent(event);
  lastTime = performance.now();

  velocity = 0;
});

window.addEventListener("pointermove", (event) => {
  if (!dragging) return;

  const now = performance.now();
  const nextAngle = angleFromEvent(event);

  let delta = nextAngle - lastAngle;

  if (delta > Math.PI) delta -= Math.PI * 2;
  if (delta < -Math.PI) delta += Math.PI * 2;

  if (Math.abs(delta) > 0.002) moved = true;

  rotation += delta;
  targetRotation = rotation;

  const dt = Math.max(16, now - lastTime);
  velocity = delta / dt * 16;

  lastAngle = nextAngle;
  lastTime = now;

  const nextIndex = closestIndexFromRotation(rotation);

  if (nextIndex !== activeIndex) {
    activeIndex = nextIndex;
    activeName = labels[activeIndex];

    window.RB_ACTIVE_KEY = activeName;
    window.RB_ACTIVE_ROUTE = routes[activeName] || "/feed.html";

    updateSockets();

    if (typeof window.setActiveDial === "function") {
      window.setActiveDial(activeName, true);
    }
  }
});

window.addEventListener("pointerup", () => {
  if (!dragging) return;

  dragging = false;

  const snapIndex = closestIndexFromRotation(rotation);
  setActive(labels[snapIndex], true);
});

window.addEventListener("pointercancel", () => {
  dragging = false;

  const snapIndex = closestIndexFromRotation(rotation);
  setActive(labels[snapIndex], true);
});

/* =========================================================
   RESIZE
========================================================= */

function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;

  camera.aspect = w / h;
  camera.updateProjectionMatrix();

  renderer.setSize(w, h);

  if (w < 700) {
    rig.scale.setScalar(0.84);
    rig.position.set(0, -0.35, 0);
    camera.position.set(0, 0.38, 8.9);
    camera.lookAt(0, -0.24, 0);
  } else {
    rig.scale.setScalar(1.1);
    rig.position.set(0, -0.1, 0);
    camera.position.set(0, 0.48, 8.2);
    camera.lookAt(0, 0, 0);
  }
}

window.addEventListener("resize", resize);
resize();

/* =========================================================
   LOOP
========================================================= */

function animate() {
  requestAnimationFrame(animate);

  const t = clock.getElapsedTime();

  if (!dragging) {
    rotation += velocity;
    velocity *= 0.91;

    const snap = targetRotation;
    rotation += (snap - rotation) * 0.12;

    if (Math.abs(velocity) < 0.0008) velocity = 0;
  }

  setCssRotation(rotation);

  ringRig.rotation.z = rotation * 0.08;
  outerRing.rotation.z = -rotation * 0.18;
  middleRing.rotation.z = rotation * 0.24;
  innerRing.rotation.z = -rotation * 0.34;
  goldRing.rotation.z = rotation * 0.16;
  socketGroup.rotation.z = rotation * 0.02;

  const pulse = Math.sin(t * 2.4);
  const fastPulse = Math.sin(t * 5.1);

  coreGlow.scale.set(
    1 + pulse * 0.05,
    1 + pulse * 0.05,
    0.18
  );

  coreGlow.material.opacity = 0.08 + Math.abs(pulse) * 0.08;

  coreRing.rotation.z += 0.01;
  coreEnergy.rotation.z -= 0.012;
  coreEnergy.material.opacity = 0.48 + Math.abs(fastPulse) * 0.15;

  smoke.rotation.y += 0.0005;
  smoke.rotation.x = Math.sin(t * 0.16) * 0.025;

  greenDust.rotation.z += 0.0007;
  goldDust.rotation.y -= 0.0005;

  topGlow.intensity = 15 + Math.sin(t * 1.4) * 2;
  portalLight.intensity = 17 + Math.sin(t * 2.6) * 3.5;
  bottomGlow.intensity = 7 + Math.sin(t * 2.1) * 2;

  renderer.render(scene, camera);
}

setActive(activeName, true);
setCssRotation(rotation);
animate();
