import * as THREE from "https://unpkg.com/three@0.158.0/build/three.module.js";

/* =========================
   RICH BIZNESS OMNI ENGINE
   REAL DIAL REPAIR VERSION
   /core/engine/omni-engine.js
========================= */

const canvas = document.getElementById("engine");

/* =========================
   SCENE
========================= */
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x020402);
scene.fog = new THREE.FogExp2(0x020402, 0.055);

/* =========================
   CAMERA
========================= */
const camera = new THREE.PerspectiveCamera(
  38,
  window.innerWidth / window.innerHeight,
  0.1,
  200
);

camera.position.set(0, 0.65, 10.6);
camera.lookAt(0, 0.15, 0);

/* =========================
   RENDERER
========================= */
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
renderer.toneMappingExposure = 1.25;

/* =========================
   CLOCK
========================= */
const clock = new THREE.Clock();

/* =========================
   LIGHTS
========================= */
scene.add(new THREE.AmbientLight(0xffffff, 0.78));

const keyLight = new THREE.PointLight(0x9eff65, 18, 80);
keyLight.position.set(0, 6, 8);
scene.add(keyLight);

const leftLight = new THREE.PointLight(0x25ffb6, 7, 55);
leftLight.position.set(-7, 1.5, 7);
scene.add(leftLight);

const rightLight = new THREE.PointLight(0xffd37a, 5, 55);
rightLight.position.set(7, 1.5, 7);
scene.add(rightLight);

const bottomGlow = new THREE.PointLight(0x7dff4d, 9, 35);
bottomGlow.position.set(0, -4, 5);
scene.add(bottomGlow);

/* =========================
   RESPONSIVE SCALE
========================= */
const isPhone = window.innerWidth < 700;
const dialScale = isPhone ? 0.78 : 0.92;

/* =========================
   WORLD BACKGROUND
========================= */
const backGroup = new THREE.Group();
scene.add(backGroup);

const smokeGeo = new THREE.BufferGeometry();
const smokeCount = 900;
const smokePositions = [];

for (let i = 0; i < smokeCount; i++) {
  smokePositions.push(
    (Math.random() - 0.5) * 30,
    (Math.random() - 0.5) * 18,
    -12 - Math.random() * 12
  );
}

smokeGeo.setAttribute(
  "position",
  new THREE.Float32BufferAttribute(smokePositions, 3)
);

const smoke = new THREE.Points(
  smokeGeo,
  new THREE.PointsMaterial({
    color: 0x6aff57,
    size: 0.045,
    transparent: true,
    opacity: 0.18,
    depthWrite: false
  })
);

backGroup.add(smoke);

/* =========================
   MAIN DIAL ROOT
   This is the real Apple Watch / old phone dial angle
========================= */
const dialRig = new THREE.Group();
dialRig.position.set(0, isPhone ? -0.62 : -0.42, 0);
dialRig.scale.setScalar(dialScale);
scene.add(dialRig);

const dial = new THREE.Group();
dial.rotation.x = -0.12;
dialRig.add(dial);

/* =========================
   MATERIALS
========================= */
const blackMetal = new THREE.MeshStandardMaterial({
  color: 0x070907,
  metalness: 1,
  roughness: 0.22,
  emissive: 0x081508,
  emissiveIntensity: 0.2
});

const gunMetal = new THREE.MeshStandardMaterial({
  color: 0x202520,
  metalness: 1,
  roughness: 0.18,
  emissive: 0x091408,
  emissiveIntensity: 0.12
});

const deepPanel = new THREE.MeshStandardMaterial({
  color: 0x071007,
  metalness: 0.72,
  roughness: 0.28,
  emissive: 0x132510,
  emissiveIntensity: 0.55
});

const activePanel = new THREE.MeshStandardMaterial({
  color: 0x102010,
  metalness: 0.82,
  roughness: 0.2,
  emissive: 0x7cff55,
  emissiveIntensity: 1.15
});

const greenGlow = new THREE.MeshBasicMaterial({
  color: 0x90ff5e,
  transparent: true,
  opacity: 0.95
});

const glassGreen = new THREE.MeshStandardMaterial({
  color: 0x78ff4c,
  emissive: 0x78ff4c,
  emissiveIntensity: 2.8,
  transparent: true,
  opacity: 0.78,
  metalness: 0.25,
  roughness: 0.05
});

/* =========================
   BACK PLATE — FLAT DISC, NOT CRAZY FLOOR
========================= */
const backPlate = new THREE.Mesh(
  new THREE.CylinderGeometry(4.38, 4.38, 0.42, 160),
  blackMetal
);

backPlate.rotation.x = Math.PI / 2;
backPlate.position.z = -0.34;
dial.add(backPlate);

/* =========================
   RING HELPERS
========================= */
function torus(radius, tube, mat, z = 0) {
  const mesh = new THREE.Mesh(
    new THREE.TorusGeometry(radius, tube, 32, 240),
    mat
  );

  mesh.rotation.x = Math.PI / 2;
  mesh.position.z = z;
  dial.add(mesh);
  return mesh;
}

const outerArmor = torus(4.47, 0.23, gunMetal, 0.08);
const outerGlow = torus(4.14, 0.035, greenGlow, 0.22);
const midArmor = torus(3.28, 0.12, gunMetal, 0.25);
const innerGlow = torus(1.72, 0.05, greenGlow, 0.42);
const centerArmor = torus(1.28, 0.14, gunMetal, 0.52);

/* =========================
   CENTER PORTAL
========================= */
const portalGroup = new THREE.Group();
portalGroup.position.z = 0.62;
dial.add(portalGroup);

const portalDisc = new THREE.Mesh(
  new THREE.CylinderGeometry(1.12, 1.12, 0.18, 100),
  new THREE.MeshStandardMaterial({
    color: 0x061106,
    metalness: 0.9,
    roughness: 0.15,
    emissive: 0x4cff36,
    emissiveIntensity: 1.1
  })
);

portalDisc.rotation.x = Math.PI / 2;
portalGroup.add(portalDisc);

const portalGlass = new THREE.Mesh(
  new THREE.SphereGeometry(0.92, 64, 64),
  glassGreen
);

portalGlass.scale.set(1, 1, 0.28);
portalGlass.position.z = 0.1;
portalGroup.add(portalGlass);

const portalRing = new THREE.Mesh(
  new THREE.TorusGeometry(1.08, 0.035, 16, 180),
  greenGlow
);

portalRing.rotation.x = Math.PI / 2;
portalRing.position.z = 0.22;
portalGroup.add(portalRing);

const energyGeo = new THREE.BufferGeometry();
const energyPositions = [];

for (let i = 0; i < 700; i++) {
  const r = Math.random() * 0.85;
  const a = Math.random() * Math.PI * 2;
  energyPositions.push(
    Math.cos(a) * r,
    Math.sin(a) * r,
    0.18 + (Math.random() - 0.5) * 0.28
  );
}

energyGeo.setAttribute(
  "position",
  new THREE.Float32BufferAttribute(energyPositions, 3)
);

const energy = new THREE.Points(
  energyGeo,
  new THREE.PointsMaterial({
    color: 0xc8ff9a,
    size: 0.025,
    transparent: true,
    opacity: 0.9,
    depthWrite: false
  })
);

portalGroup.add(energy);

/* =========================
   WEDGE PANELS
========================= */
const segments = [];

const labels = [
  "gallery",
  "live",
  "music",
  "gaming",
  "store",
  "meta",
  "sports",
  "upload"
];

const routes = {
  gallery: "/gallery.html",
  live: "/live.html",
  music: "/music.html",
  gaming: "/gaming.html",
  store: "/store.html",
  meta: "/metaverse.html",
  sports: "/sports.html",
  upload: "/upload.html"
};

const count = 8;
const step = (Math.PI * 2) / count;

for (let i = 0; i < count; i++) {
  const shape = new THREE.Shape();

  const innerR = 1.48;
  const outerR = 3.92;
  const gap = step * 0.055;

  const a0 = i * step - step / 2 + gap;
  const a1 = i * step + step / 2 - gap;

  shape.moveTo(Math.cos(a0) * innerR, Math.sin(a0) * innerR);
  shape.absarc(0, 0, innerR, a0, a1, false);
  shape.lineTo(Math.cos(a1) * outerR, Math.sin(a1) * outerR);
  shape.absarc(0, 0, outerR, a1, a0, true);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.34,
    bevelEnabled: true,
    bevelSegments: 5,
    bevelSize: 0.035,
    bevelThickness: 0.04
  });

  const panel = new THREE.Mesh(geo, deepPanel.clone());
  panel.rotation.x = Math.PI / 2;
  panel.position.z = 0.16;
  panel.userData.index = i;
  panel.userData.name = labels[i];

  dial.add(panel);
  segments.push(panel);

  const dividerAngle = i * step + step / 2;
  const divider = new THREE.Mesh(
    new THREE.BoxGeometry(0.035, 2.45, 0.18),
    new THREE.MeshStandardMaterial({
      color: 0x1a1a16,
      metalness: 1,
      roughness: 0.18,
      emissive: 0x6dff42,
      emissiveIntensity: 0.18
    })
  );

  divider.position.set(
    Math.cos(dividerAngle) * 2.72,
    Math.sin(dividerAngle) * 2.72,
    0.55
  );

  divider.rotation.z = dividerAngle;
  dial.add(divider);

  const rimLight = new THREE.Mesh(
    new THREE.TorusGeometry(3.72, 0.012, 8, 28, step * 0.82),
    new THREE.MeshBasicMaterial({
      color: 0x8cff5c,
      transparent: true,
      opacity: 0.55
    })
  );

  rimLight.rotation.x = Math.PI / 2;
  rimLight.rotation.z = i * step - step * 0.41;
  rimLight.position.z = 0.58;
  dial.add(rimLight);
}

/* =========================
   ARMOR BOLTS + SIDE LIGHTS
========================= */
for (let i = 0; i < 16; i++) {
  const angle = (Math.PI * 2 / 16) * i;

  const bolt = new THREE.Mesh(
    new THREE.CylinderGeometry(0.105, 0.105, 0.18, 24),
    new THREE.MeshStandardMaterial({
      color: 0x9c9c8d,
      metalness: 1,
      roughness: 0.18,
      emissive: 0x0b100b,
      emissiveIntensity: 0.2
    })
  );

  bolt.rotation.x = Math.PI / 2;
  bolt.position.set(
    Math.cos(angle) * 4.42,
    Math.sin(angle) * 4.42,
    0.42
  );

  dial.add(bolt);

  if (i % 4 === 1) {
    const lamp = new THREE.Mesh(
      new THREE.SphereGeometry(0.13, 24, 24),
      new THREE.MeshStandardMaterial({
        color: 0x9dff64,
        emissive: 0x9dff64,
        emissiveIntensity: 3,
        roughness: 0.08
      })
    );

    lamp.position.set(
      Math.cos(angle) * 4.55,
      Math.sin(angle) * 4.55,
      0.58
    );

    dial.add(lamp);
  }
}

/* =========================
   BOTTOM MONEY STACK FEEL
========================= */
const moneyGroup = new THREE.Group();
moneyGroup.position.set(0, -3.72, -2.8);
scene.add(moneyGroup);

for (let i = 0; i < 18; i++) {
  const bill = new THREE.Mesh(
    new THREE.BoxGeometry(1.1, 0.08, 0.5),
    new THREE.MeshStandardMaterial({
      color: 0x133611,
      metalness: 0.2,
      roughness: 0.65,
      emissive: 0x163b10,
      emissiveIntensity: 0.25
    })
  );

  bill.position.set(
    (Math.random() - 0.5) * 8,
    i * 0.025,
    (Math.random() - 0.5) * 1.8
  );

  bill.rotation.y = (Math.random() - 0.5) * 0.8;
  bill.rotation.z = (Math.random() - 0.5) * 0.25;

  moneyGroup.add(bill);
}

/* =========================
   ROTATION SYSTEM
========================= */
let rotation = 0;
let velocity = 0;
let dragging = false;
let lastX = 0;
let moved = false;

let targetTiltX = -0.12;
let targetTiltY = 0;
let smoothTiltX = -0.12;
let smoothTiltY = 0;

let activeName = "live";
window.RB_ACTIVE_ROUTE = routes[activeName];

/* =========================
   POINTER TILT
========================= */
window.addEventListener("pointermove", (event) => {
  const nx = event.clientX / window.innerWidth - 0.5;
  const ny = event.clientY / window.innerHeight - 0.5;

  targetTiltY = nx * 0.16;
  targetTiltX = -0.12 + ny * 0.06;

  if (!dragging) return;

  const dx = event.clientX - lastX;
  lastX = event.clientX;

  if (Math.abs(dx) > 1) moved = true;

  velocity = dx * 0.0032;
});

window.addEventListener("pointerdown", (event) => {
  dragging = true;
  moved = false;
  lastX = event.clientX;
});

window.addEventListener("pointerup", () => {
  dragging = false;
});

window.addEventListener("pointercancel", () => {
  dragging = false;
});

/* =========================
   RAYCAST ACTION
========================= */
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

window.addEventListener("click", (event) => {
  if (moved) return;

  pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(pointer, camera);

  const hits = raycaster.intersectObjects(segments);

  if (!hits.length) return;

  const name = hits[0].object.userData.name;
  const route = routes[name];

  if (route) window.location.href = route;
});

/* =========================
   ACTIVE DETECTION
========================= */
function getActiveSegment() {
  let highestY = -Infinity;
  let active = segments[0];

  for (const segment of segments) {
    const world = new THREE.Vector3();
    segment.getWorldPosition(world);

    if (world.y > highestY) {
      highestY = world.y;
      active = segment;
    }
  }

  return active;
}

/* =========================
   CSS LABEL SYNC
========================= */
function syncHtmlLabels() {
  const active = getActiveSegment();
  activeName = active?.userData?.name || "live";
  window.RB_ACTIVE_ROUTE = routes[activeName] || "/feed.html";

  document.querySelectorAll(".dial-card").forEach((card) => {
    card.classList.remove("is-active");
  });

  const map = {
    gallery: ".top-left-card",
    live: ".top-card",
    music: ".top-right-card",
    upload: ".left-card",
    gaming: ".right-card",
    sports: ".bottom-left-card",
    meta: ".bottom-card",
    store: ".bottom-right-card"
  };

  const activeCard = document.querySelector(map[activeName]);
  activeCard?.classList.add("is-active");
}

/* =========================
   ACTIVATE BUTTON
========================= */
window.enterWorld = function () {
  const route = window.RB_ACTIVE_ROUTE || "/feed.html";
  window.location.href = route;
};

window.enter = window.enterWorld;

/* =========================
   CAMERA RESIZE
========================= */
function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;

  camera.aspect = w / h;
  camera.updateProjectionMatrix();

  renderer.setSize(w, h);

  const phone = w < 700;

  dialRig.scale.setScalar(phone ? 0.78 : 0.92);
  dialRig.position.set(0, phone ? -0.62 : -0.42, 0);

  camera.position.set(0, phone ? 0.72 : 0.62, phone ? 10.7 : 10.1);
  camera.lookAt(0, 0.08, 0);
}

window.addEventListener("resize", resize);
resize();

/* =========================
   ANIMATION LOOP
========================= */
function animate() {
  requestAnimationFrame(animate);

  const t = clock.getElapsedTime();

  smoothTiltX += (targetTiltX - smoothTiltX) * 0.07;
  smoothTiltY += (targetTiltY - smoothTiltY) * 0.07;

  dialRig.rotation.x = smoothTiltX;
  dialRig.rotation.y = smoothTiltY;

  rotation += velocity;

  if (!dragging) {
    velocity *= 0.91;

    if (Math.abs(velocity) < 0.0006) {
      velocity = 0;
      const snapped = Math.round(rotation / step) * step;
      rotation = THREE.MathUtils.lerp(rotation, snapped, 0.08);
    }
  }

  dial.rotation.z = rotation;

  outerArmor.rotation.z = -rotation * 0.15;
  outerGlow.rotation.z = -rotation * 0.3;
  innerGlow.rotation.z = rotation * 0.5;

  portalGlass.scale.set(
    1 + Math.sin(t * 2.4) * 0.035,
    1 + Math.sin(t * 2.4) * 0.035,
    0.28
  );

  portalGlass.material.emissiveIntensity = 2.6 + Math.sin(t * 3.2) * 0.55;

  portalRing.rotation.z += 0.006;
  energy.rotation.z -= 0.012;

  smoke.rotation.y += 0.0006;
  moneyGroup.rotation.y = Math.sin(t * 0.35) * 0.06;

  segments.forEach((segment) => {
    const world = new THREE.Vector3();
    segment.getWorldPosition(world);

    const frontDepth = (world.z + 4) / 8;
    const topDepth = (world.y + 4) / 8;

    const glow = Math.max(frontDepth, topDepth);

    segment.material.emissiveIntensity = 0.32 + glow * 0.72;
    segment.position.z = 0.16 + Math.max(glow, 0) * 0.05;
  });

  syncHtmlLabels();

  renderer.render(scene, camera);
}

animate();
