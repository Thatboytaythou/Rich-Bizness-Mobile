import * as THREE from "https://unpkg.com/three@0.158.0/build/three.module.js";

/* =========================
   RICH BIZNESS OMNI ENGINE
   EXACT DIAL REPAIR / MOBILE APP VERSION
   /core/engine/omni-engine.js
========================= */

const canvas = document.getElementById("engine");

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x020402);
scene.fog = new THREE.FogExp2(0x031003, 0.052);

const camera = new THREE.PerspectiveCamera(
  38,
  window.innerWidth / window.innerHeight,
  0.1,
  220
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
renderer.toneMappingExposure = 1.35;

const clock = new THREE.Clock();

/* LIGHTS */
scene.add(new THREE.AmbientLight(0xffffff, 0.72));

const keyLight = new THREE.PointLight(0x9dff55, 22, 90);
keyLight.position.set(0, 6.4, 8.5);
scene.add(keyLight);

const leftLight = new THREE.PointLight(0x25ffb6, 8, 55);
leftLight.position.set(-7, 1.5, 7);
scene.add(leftLight);

const rightLight = new THREE.PointLight(0xffd47a, 7, 55);
rightLight.position.set(7, 1.5, 7);
scene.add(rightLight);

const bottomGlow = new THREE.PointLight(0x7dff4d, 12, 42);
bottomGlow.position.set(0, -4.3, 5.5);
scene.add(bottomGlow);

/* RESPONSIVE */
function isPhone() {
  return window.innerWidth < 700;
}

/* BACKGROUND SMOKE */
const smokeGeo = new THREE.BufferGeometry();
const smokePositions = [];
for (let i = 0; i < 1200; i++) {
  smokePositions.push(
    (Math.random() - 0.5) * 34,
    (Math.random() - 0.5) * 20,
    -12 - Math.random() * 16
  );
}
smokeGeo.setAttribute("position", new THREE.Float32BufferAttribute(smokePositions, 3));

const smoke = new THREE.Points(
  smokeGeo,
  new THREE.PointsMaterial({
    color: 0x72ff54,
    size: 0.05,
    transparent: true,
    opacity: 0.18,
    depthWrite: false
  })
);
scene.add(smoke);

/* MATERIALS */
const blackMetal = new THREE.MeshStandardMaterial({
  color: 0x070907,
  metalness: 1,
  roughness: 0.22,
  emissive: 0x071307,
  emissiveIntensity: 0.22
});

const gunMetal = new THREE.MeshStandardMaterial({
  color: 0x222820,
  metalness: 1,
  roughness: 0.16,
  emissive: 0x091408,
  emissiveIntensity: 0.16
});

const panelMat = new THREE.MeshStandardMaterial({
  color: 0x071007,
  metalness: 0.82,
  roughness: 0.24,
  emissive: 0x153012,
  emissiveIntensity: 0.54
});

const glowMat = new THREE.MeshBasicMaterial({
  color: 0x92ff5f,
  transparent: true,
  opacity: 0.95
});

const glassGreen = new THREE.MeshStandardMaterial({
  color: 0x78ff4c,
  emissive: 0x78ff4c,
  emissiveIntensity: 3,
  transparent: true,
  opacity: 0.76,
  metalness: 0.2,
  roughness: 0.04
});

/* DIAL ROOT */
const dialRig = new THREE.Group();
scene.add(dialRig);

const dial = new THREE.Group();
dial.rotation.x = -0.12;
dialRig.add(dial);

/* BACK DISC */
const backPlate = new THREE.Mesh(
  new THREE.CylinderGeometry(4.45, 4.45, 0.42, 180),
  blackMetal
);
backPlate.rotation.x = Math.PI / 2;
backPlate.position.z = -0.36;
dial.add(backPlate);

function torus(radius, tube, mat, z = 0) {
  const mesh = new THREE.Mesh(new THREE.TorusGeometry(radius, tube, 32, 240), mat);
  mesh.rotation.x = Math.PI / 2;
  mesh.position.z = z;
  dial.add(mesh);
  return mesh;
}

const outerArmor = torus(4.52, 0.23, gunMetal, 0.08);
const outerGlow = torus(4.14, 0.036, glowMat, 0.24);
const innerArmor = torus(3.28, 0.12, gunMetal, 0.25);
const innerGlow = torus(1.72, 0.052, glowMat, 0.43);
const centerArmor = torus(1.28, 0.14, gunMetal, 0.54);

/* PORTAL */
const portalGroup = new THREE.Group();
portalGroup.position.z = 0.63;
dial.add(portalGroup);

const portalDisc = new THREE.Mesh(
  new THREE.CylinderGeometry(1.12, 1.12, 0.18, 110),
  new THREE.MeshStandardMaterial({
    color: 0x061106,
    metalness: 0.9,
    roughness: 0.13,
    emissive: 0x4cff36,
    emissiveIntensity: 1.2
  })
);
portalDisc.rotation.x = Math.PI / 2;
portalGroup.add(portalDisc);

const portalGlass = new THREE.Mesh(new THREE.SphereGeometry(0.92, 64, 64), glassGreen);
portalGlass.scale.set(1, 1, 0.28);
portalGlass.position.z = 0.1;
portalGroup.add(portalGlass);

const portalRing = new THREE.Mesh(new THREE.TorusGeometry(1.08, 0.035, 16, 200), glowMat);
portalRing.rotation.x = Math.PI / 2;
portalRing.position.z = 0.22;
portalGroup.add(portalRing);

const energyGeo = new THREE.BufferGeometry();
const energyPositions = [];
for (let i = 0; i < 850; i++) {
  const r = Math.random() * 0.86;
  const a = Math.random() * Math.PI * 2;
  energyPositions.push(Math.cos(a) * r, Math.sin(a) * r, 0.18 + (Math.random() - 0.5) * 0.3);
}
energyGeo.setAttribute("position", new THREE.Float32BufferAttribute(energyPositions, 3));

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

/* SEGMENTS */
const labels = ["live", "music", "gaming", "store", "meta", "sports", "upload", "gallery"];

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

const segments = [];
const count = labels.length;
const step = (Math.PI * 2) / count;

for (let i = 0; i < count; i++) {
  const shape = new THREE.Shape();

  const innerR = 1.5;
  const outerR = 3.92;
  const gap = step * 0.055;
  const a0 = i * step - step / 2 + gap + Math.PI / 2;
  const a1 = i * step + step / 2 - gap + Math.PI / 2;

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

  const panel = new THREE.Mesh(geo, panelMat.clone());
  panel.rotation.x = Math.PI / 2;
  panel.position.z = 0.16;
  panel.userData.name = labels[i];
  dial.add(panel);
  segments.push(panel);

  const dividerAngle = i * step + step / 2 + Math.PI / 2;
  const divider = new THREE.Mesh(
    new THREE.BoxGeometry(0.04, 2.5, 0.18),
    new THREE.MeshStandardMaterial({
      color: 0x1d211b,
      metalness: 1,
      roughness: 0.15,
      emissive: 0x72ff42,
      emissiveIntensity: 0.16
    })
  );
  divider.position.set(Math.cos(dividerAngle) * 2.75, Math.sin(dividerAngle) * 2.75, 0.56);
  divider.rotation.z = dividerAngle;
  dial.add(divider);
}

/* BOLTS / LIGHTS */
for (let i = 0; i < 16; i++) {
  const angle = (Math.PI * 2 / 16) * i;

  const bolt = new THREE.Mesh(
    new THREE.CylinderGeometry(0.105, 0.105, 0.18, 24),
    new THREE.MeshStandardMaterial({
      color: 0xa8a98f,
      metalness: 1,
      roughness: 0.15,
      emissive: 0x0b100b,
      emissiveIntensity: 0.2
    })
  );

  bolt.rotation.x = Math.PI / 2;
  bolt.position.set(Math.cos(angle) * 4.42, Math.sin(angle) * 4.42, 0.45);
  dial.add(bolt);

  if (i % 2 === 1) {
    const lamp = new THREE.Mesh(
      new THREE.SphereGeometry(0.13, 24, 24),
      new THREE.MeshStandardMaterial({
        color: 0x9dff64,
        emissive: 0x9dff64,
        emissiveIntensity: 3.2,
        roughness: 0.08
      })
    );
    lamp.position.set(Math.cos(angle) * 4.55, Math.sin(angle) * 4.55, 0.6);
    dial.add(lamp);
  }
}

/* MONEY STACKS */
const moneyGroup = new THREE.Group();
moneyGroup.position.set(0, -3.72, -2.8);
scene.add(moneyGroup);

for (let i = 0; i < 24; i++) {
  const bill = new THREE.Mesh(
    new THREE.BoxGeometry(1.15, 0.08, 0.5),
    new THREE.MeshStandardMaterial({
      color: 0x143811,
      metalness: 0.25,
      roughness: 0.6,
      emissive: 0x163b10,
      emissiveIntensity: 0.28
    })
  );

  bill.position.set((Math.random() - 0.5) * 8.4, i * 0.022, (Math.random() - 0.5) * 1.8);
  bill.rotation.y = (Math.random() - 0.5) * 0.8;
  bill.rotation.z = (Math.random() - 0.5) * 0.25;
  moneyGroup.add(bill);
}

/* INTERACTION */
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
window.RB_ACTIVE_KEY = activeName;
window.RB_ACTIVE_ROUTE = routes[activeName];

function setActive(name) {
  activeName = name || "live";
  window.RB_ACTIVE_KEY = activeName;
  window.RB_ACTIVE_ROUTE = routes[activeName] || "/feed.html";

  if (typeof window.setActiveDial === "function") {
    window.setActiveDial(activeName, true);
  }

  document.querySelector("[data-active-label]")?.replaceChildren(document.createTextNode(activeName.toUpperCase()));
}

window.addEventListener("pointerdown", (event) => {
  dragging = true;
  moved = false;
  lastX = event.clientX;
});

window.addEventListener("pointermove", (event) => {
  const nx = event.clientX / window.innerWidth - 0.5;
  const ny = event.clientY / window.innerHeight - 0.5;

  targetTiltY = nx * 0.16;
  targetTiltX = -0.12 + ny * 0.06;

  if (!dragging) return;

  const dx = event.clientX - lastX;
  lastX = event.clientX;

  if (Math.abs(dx) > 2) moved = true;
  velocity = dx * 0.0032;
});

window.addEventListener("pointerup", () => {
  dragging = false;
});

window.addEventListener("pointercancel", () => {
  dragging = false;
});

/* CLICK RAYCAST */
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
  setActive(name);

  if (window.RB_DIAL_CLICK_TO_OPEN === true) {
    window.location.href = routes[name];
  }
});

function getActiveFromRotation() {
  const normalized = ((-rotation % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  const index = Math.round(normalized / step) % count;
  return labels[index] || "live";
}

window.RB_spinTo = function (key) {
  const index = labels.indexOf(key);
  if (index < 0) return;
  rotation = -index * step;
  velocity = 0;
  setActive(key);
};

window.enterWorld = function () {
  window.location.href = window.RB_ACTIVE_ROUTE || "/feed.html";
};
window.enter = window.enterWorld;

/* RESIZE */
function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const phone = isPhone();

  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);

  dialRig.scale.setScalar(phone ? 0.76 : 0.92);
  dialRig.position.set(0, phone ? -0.72 : -0.44, 0);

  camera.position.set(0, phone ? 0.72 : 0.62, phone ? 10.9 : 10.1);
  camera.lookAt(0, 0.08, 0);
}

window.addEventListener("resize", resize);
resize();

/* LOOP */
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
      rotation = THREE.MathUtils.lerp(rotation, snapped, 0.085);
    }
  }

  dial.rotation.z = rotation;

  outerArmor.rotation.z = -rotation * 0.15;
  outerGlow.rotation.z = -rotation * 0.3;
  innerArmor.rotation.z = rotation * 0.1;
  innerGlow.rotation.z = rotation * 0.5;
  centerArmor.rotation.z = -rotation * 0.2;

  portalGlass.scale.set(
    1 + Math.sin(t * 2.4) * 0.035,
    1 + Math.sin(t * 2.4) * 0.035,
    0.28
  );

  portalGlass.material.emissiveIntensity = 2.7 + Math.sin(t * 3.2) * 0.55;
  portalRing.rotation.z += 0.007;
  energy.rotation.z -= 0.012;

  smoke.rotation.y += 0.0006;
  smoke.rotation.x = Math.sin(t * 0.15) * 0.03;
  moneyGroup.rotation.y = Math.sin(t * 0.35) * 0.06;

  const newActive = getActiveFromRotation();
  if (newActive !== activeName) setActive(newActive);

  segments.forEach((segment) => {
    const isActive = segment.userData.name === activeName;
    segment.material.emissiveIntensity = isActive ? 1.2 : 0.46;
    segment.position.z = THREE.MathUtils.lerp(segment.position.z, isActive ? 0.25 : 0.16, 0.12);
  });

  renderer.render(scene, camera);
}

setActive("live");
animate();
