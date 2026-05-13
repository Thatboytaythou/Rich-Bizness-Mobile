import * as THREE from "https://unpkg.com/three@0.158.0/build/three.module.js";

/* =========================================================
   RICH BIZNESS OMNI ENGINE
   FULL MATCHING CINEMA ENGINE
   10 CORE REALISTIC APP ATMOSPHERE
   /core/engine/omni-engine.js
========================================================= */

const canvas = document.getElementById("engine");

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x020402);
scene.fog = new THREE.FogExp2(0x031003, 0.038);

const camera = new THREE.PerspectiveCamera(
  38,
  window.innerWidth / window.innerHeight,
  0.1,
  260
);

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: false,
  powerPreference: "high-performance"
});

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.46;

const clock = new THREE.Clock();

function isPhone(){
  return window.innerWidth < 700;
}

function isTablet(){
  return window.innerWidth >= 700 && window.innerWidth < 1100;
}

/* =========================================================
   10 CORE ROUTE STATE
========================================================= */

const labels = [
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

const routes = {
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

let activeIndex = labels.indexOf(window.RB_ACTIVE_KEY || "live");
if (activeIndex < 0) activeIndex = 2;

let activeName = labels[activeIndex] || "live";
let targetRotation = -activeIndex * ((Math.PI * 2) / labels.length);
let currentRotation = targetRotation;

window.RB_ACTIVE_KEY = activeName;
window.RB_ACTIVE_ROUTE = routes[activeName] || "/live.html";
window.RB_DIAL_ROTATION = currentRotation;

/* =========================================================
   LIGHTS
========================================================= */

scene.add(new THREE.AmbientLight(0xd8ffd0, 0.76));

const topGlow = new THREE.PointLight(0x9dff63, 22, 95);
topGlow.position.set(0, 6.5, 7.5);
scene.add(topGlow);

const portalLight = new THREE.PointLight(0x8dff5b, 26, 78);
portalLight.position.set(0, -0.35, 5.6);
scene.add(portalLight);

const leftWorldLight = new THREE.PointLight(0x39ffc1, 7, 72);
leftWorldLight.position.set(-7.5, 1.8, 6);
scene.add(leftWorldLight);

const rightGoldLight = new THREE.PointLight(0xffd76a, 7, 72);
rightGoldLight.position.set(7.5, 1.8, 6);
scene.add(rightGoldLight);

const bottomGlow = new THREE.PointLight(0x7fff45, 12, 58);
bottomGlow.position.set(0, -5.2, 6);
scene.add(bottomGlow);

/* =========================================================
   MATERIALS
========================================================= */

const deepMetal = new THREE.MeshStandardMaterial({
  color: 0x070a07,
  metalness: 1,
  roughness: 0.17,
  emissive: 0x071507,
  emissiveIntensity: 0.34
});

const ringMetal = new THREE.MeshStandardMaterial({
  color: 0x1b241a,
  metalness: 1,
  roughness: 0.13,
  emissive: 0x10230d,
  emissiveIntensity: 0.28
});

const glowMat = new THREE.MeshBasicMaterial({
  color: 0x8dff5b,
  transparent: true,
  opacity: 0.72,
  depthWrite: false
});

const softGlowMat = new THREE.MeshBasicMaterial({
  color: 0xd7ff9b,
  transparent: true,
  opacity: 0.18,
  depthWrite: false
});

const goldGlowMat = new THREE.MeshBasicMaterial({
  color: 0xffd76a,
  transparent: true,
  opacity: 0.22,
  depthWrite: false
});

/* =========================================================
   ATMOSPHERE PARTICLES
========================================================= */

function makePoints(count, spreadX, spreadY, zMin, zDepth, color, size, opacity){
  const geo = new THREE.BufferGeometry();
  const positions = [];

  for(let i = 0; i < count; i++){
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

const smoke = makePoints(1700, 36, 24, -7, 25, 0x73ff55, 0.052, 0.14);
scene.add(smoke);

const greenDust = makePoints(900, 19, 14, -2, 16, 0xafff7d, 0.025, 0.3);
scene.add(greenDust);

const goldDust = makePoints(520, 22, 14, -3, 18, 0xffd76a, 0.03, 0.18);
scene.add(goldDust);

/* =========================================================
   MAIN RIG
========================================================= */

const rig = new THREE.Group();
scene.add(rig);

const portalRig = new THREE.Group();
portalRig.position.z = 0.2;
rig.add(portalRig);

/* =========================================================
   BACK MACHINE RINGS
========================================================= */

function addRing(radius, tube, material, z){
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(radius, tube, 32, 240),
    material
  );

  ring.rotation.x = Math.PI / 2;
  ring.position.z = z;
  portalRig.add(ring);

  return ring;
}

const machineBack = new THREE.Mesh(
  new THREE.CylinderGeometry(2.62, 2.62, 0.22, 160),
  deepMetal
);
machineBack.rotation.x = Math.PI / 2;
machineBack.position.z = -0.18;
portalRig.add(machineBack);

const outerRing = addRing(2.78, 0.08, ringMetal, 0.03);
const outerGlow = addRing(2.42, 0.022, glowMat, 0.13);
const midRing = addRing(1.85, 0.055, ringMetal, 0.18);
const midGlow = addRing(1.5, 0.018, softGlowMat, 0.24);
const innerGlow = addRing(1.05, 0.032, glowMat, 0.32);

/* =========================================================
   10 CORE GHOST ORBIT — BEHIND HTML CARDS
========================================================= */

const ghostOrbit = new THREE.Group();
ghostOrbit.position.z = 0.18;
portalRig.add(ghostOrbit);

for(let i = 0; i < labels.length; i++){
  const angle = (Math.PI * 2 / labels.length) * i - Math.PI / 2;

  const node = new THREE.Mesh(
    new THREE.SphereGeometry(0.055, 18, 18),
    new THREE.MeshBasicMaterial({
      color: i === activeIndex ? 0xffd76a : 0x8dff5b,
      transparent: true,
      opacity: i === activeIndex ? 0.8 : 0.28,
      depthWrite: false
    })
  );

  node.position.set(
    Math.cos(angle) * 2.86,
    Math.sin(angle) * 2.86,
    0.28
  );

  node.userData.index = i;
  ghostOrbit.add(node);
}

/* =========================================================
   PORTAL CORE ENERGY
========================================================= */

const coreGroup = new THREE.Group();
coreGroup.position.z = 0.45;
portalRig.add(coreGroup);

const portalGlass = new THREE.Mesh(
  new THREE.SphereGeometry(0.92, 72, 72),
  new THREE.MeshStandardMaterial({
    color: 0x7fff4b,
    emissive: 0x7fff4b,
    emissiveIntensity: 3.7,
    transparent: true,
    opacity: 0.54,
    metalness: 0.18,
    roughness: 0.03
  })
);

portalGlass.scale.set(1, 1, 0.25);
portalGlass.position.z = 0.12;
coreGroup.add(portalGlass);

const portalAura = new THREE.Mesh(
  new THREE.SphereGeometry(1.3, 64, 64),
  new THREE.MeshBasicMaterial({
    color: 0x8dff5b,
    transparent: true,
    opacity: 0.12,
    depthWrite: false
  })
);

portalAura.scale.set(1, 1, 0.18);
portalAura.position.z = 0.02;
coreGroup.add(portalAura);

const portalRing = new THREE.Mesh(
  new THREE.TorusGeometry(1.15, 0.014, 12, 180),
  glowMat
);
portalRing.rotation.x = Math.PI / 2;
portalRing.position.z = 0.38;
coreGroup.add(portalRing);

const goldOrbit = new THREE.Mesh(
  new THREE.TorusGeometry(1.42, 0.008, 10, 180),
  goldGlowMat
);
goldOrbit.rotation.x = Math.PI / 2.18;
goldOrbit.rotation.y = 0.2;
goldOrbit.position.z = 0.32;
coreGroup.add(goldOrbit);

/* =========================================================
   ENERGY PARTICLES INSIDE CORE
========================================================= */

const energyGeo = new THREE.BufferGeometry();
const energyPositions = [];

for(let i = 0; i < 1200; i++){
  const r = Math.random() * 1.02;
  const a = Math.random() * Math.PI * 2;

  energyPositions.push(
    Math.cos(a) * r,
    Math.sin(a) * r,
    0.12 + (Math.random() - 0.5) * 0.32
  );
}

energyGeo.setAttribute("position", new THREE.Float32BufferAttribute(energyPositions, 3));

const energy = new THREE.Points(
  energyGeo,
  new THREE.PointsMaterial({
    color: 0xd9ffad,
    size: 0.025,
    transparent: true,
    opacity: 0.82,
    depthWrite: false
  })
);

coreGroup.add(energy);

/* =========================================================
   CINEMA HEX DEPTH LINES
========================================================= */

const hexGroup = new THREE.Group();
hexGroup.position.z = -0.05;
portalRig.add(hexGroup);

for(let i = 0; i < 10; i++){
  const angle = (Math.PI * 2 / 10) * i - Math.PI / 2;

  const bar = new THREE.Mesh(
    new THREE.BoxGeometry(1.1, 0.035, 0.035),
    new THREE.MeshBasicMaterial({
      color: 0x8dff5b,
      transparent: true,
      opacity: 0.18,
      depthWrite: false
    })
  );

  bar.position.set(
    Math.cos(angle) * 3.22,
    Math.sin(angle) * 3.22,
    0.1
  );

  bar.rotation.z = angle + Math.PI / 2;
  hexGroup.add(bar);
}

/* =========================================================
   MONEY FLOOR / DEPTH HINT
========================================================= */

const floorGroup = new THREE.Group();
floorGroup.position.set(0, -4.65, -2.2);
scene.add(floorGroup);

for(let i = 0; i < 22; i++){
  const bill = new THREE.Mesh(
    new THREE.BoxGeometry(1.1, 0.045, 0.48),
    new THREE.MeshStandardMaterial({
      color: 0x163911,
      metalness: 0.25,
      roughness: 0.58,
      emissive: 0x14380e,
      emissiveIntensity: 0.22
    })
  );

  bill.position.set(
    (Math.random() - 0.5) * 8.6,
    i * 0.015,
    (Math.random() - 0.5) * 1.75
  );

  bill.rotation.y = (Math.random() - 0.5) * 0.8;
  bill.rotation.z = (Math.random() - 0.5) * 0.25;

  floorGroup.add(bill);
}

/* =========================================================
   ACTIVE SYNC
========================================================= */

function updateGhostNodes(){
  ghostOrbit.children.forEach((node) => {
    const isActive = node.userData.index === activeIndex;
    node.material.opacity = isActive ? 0.82 : 0.28;
    node.material.color.setHex(isActive ? 0xffd76a : 0x8dff5b);
    node.scale.setScalar(isActive ? 1.45 : 1);
  });
}

function setActive(name){
  const index = labels.indexOf(name);
  if(index < 0) return;

  activeIndex = index;
  activeName = name;
  targetRotation = -index * ((Math.PI * 2) / labels.length);

  window.RB_ACTIVE_KEY = activeName;
  window.RB_ACTIVE_ROUTE = routes[activeName] || "/feed.html";

  updateGhostNodes();

  if(typeof window.setActiveDial === "function"){
    window.setActiveDial(activeName, true);
  }
}

window.RB_spinTo = function(key){
  setActive(key);
};

window.enterWorld = function(){
  window.location.href = window.RB_ACTIVE_ROUTE || "/feed.html";
};

window.enter = window.enterWorld;

/* =========================================================
   POINTER PARALLAX ONLY
========================================================= */

let targetTiltX = -0.08;
let targetTiltY = 0;
let smoothTiltX = -0.08;
let smoothTiltY = 0;

window.addEventListener("pointermove", (event) => {
  const nx = event.clientX / window.innerWidth - 0.5;
  const ny = event.clientY / window.innerHeight - 0.5;

  targetTiltY = nx * 0.08;
  targetTiltX = -0.08 + ny * 0.025;
});

/* =========================================================
   RESIZE
========================================================= */

function resize(){
  const w = window.innerWidth;
  const h = window.innerHeight;

  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);

  if(isPhone()){
    rig.scale.setScalar(0.78);
    rig.position.set(0, -0.42, 0);
    camera.position.set(0, 0.54, 9.8);
    camera.lookAt(0, -0.24, 0);
  }else if(isTablet()){
    rig.scale.setScalar(0.98);
    rig.position.set(0, -0.2, 0);
    camera.position.set(0, 0.6, 9.2);
    camera.lookAt(0, -0.08, 0);
  }else{
    rig.scale.setScalar(1.12);
    rig.position.set(0, -0.1, 0);
    camera.position.set(0, 0.55, 8.4);
    camera.lookAt(0, 0, 0);
  }
}

window.addEventListener("resize", resize);
resize();

/* =========================================================
   LOOP
========================================================= */

function animate(){
  requestAnimationFrame(animate);

  const t = clock.getElapsedTime();

  currentRotation += (targetRotation - currentRotation) * 0.08;

  window.RB_DIAL_ROTATION = currentRotation;
  document.documentElement.style.setProperty(
    "--rb-dial-rotation",
    `${currentRotation}rad`
  );

  smoothTiltX += (targetTiltX - smoothTiltX) * 0.06;
  smoothTiltY += (targetTiltY - smoothTiltY) * 0.06;

  rig.rotation.x = smoothTiltX;
  rig.rotation.y = smoothTiltY;

  portalRig.rotation.z = currentRotation * 0.12;

  outerRing.rotation.z = -currentRotation * 0.12;
  outerGlow.rotation.z = -currentRotation * 0.26;
  midRing.rotation.z = currentRotation * 0.18;
  midGlow.rotation.z = currentRotation * 0.32;
  innerGlow.rotation.z = -currentRotation * 0.42;
  ghostOrbit.rotation.z = currentRotation * 0.1;
  hexGroup.rotation.z = -currentRotation * 0.05;

  const pulse = Math.sin(t * 2.4);
  const fastPulse = Math.sin(t * 5.2);

  portalGlass.scale.set(
    1 + pulse * 0.035,
    1 + pulse * 0.035,
    0.25
  );

  portalGlass.material.emissiveIntensity = 3.55 + Math.abs(pulse) * 0.75;

  portalAura.scale.set(
    1.02 + Math.abs(pulse) * 0.08,
    1.02 + Math.abs(pulse) * 0.08,
    0.18
  );

  portalAura.material.opacity = 0.1 + Math.abs(pulse) * 0.08;

  portalRing.rotation.z += 0.01;
  goldOrbit.rotation.z -= 0.006;
  goldOrbit.rotation.y = 0.2 + Math.sin(t * 0.7) * 0.08;

  energy.rotation.z -= 0.013;
  energy.material.opacity = 0.68 + Math.abs(fastPulse) * 0.18;

  smoke.rotation.y += 0.0006;
  smoke.rotation.x = Math.sin(t * 0.16) * 0.03;
  smoke.material.opacity = 0.12 + Math.abs(Math.sin(t * 0.42)) * 0.05;

  greenDust.rotation.z += 0.0009;
  greenDust.material.opacity = 0.24 + Math.abs(fastPulse) * 0.1;

  goldDust.rotation.y -= 0.0007;

  floorGroup.rotation.y = Math.sin(t * 0.35) * 0.055;
  floorGroup.position.y = -4.65 + Math.sin(t * 0.7) * 0.025;

  topGlow.intensity = 20 + Math.sin(t * 1.4) * 2.5;
  portalLight.intensity = 24 + Math.sin(t * 2.6) * 4;
  bottomGlow.intensity = 11 + Math.sin(t * 2.1) * 2.2;

  renderer.render(scene, camera);
}

setActive(activeName || "live");
animate();
