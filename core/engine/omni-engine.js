import * as THREE from "https://unpkg.com/three@0.158.0/build/three.module.js";

/* =========================
   RICH BIZNESS OMNI ENGINE
   REALISTIC CINEMATIC UNIVERSE MASTERPIECE
   /core/engine/omni-engine.js
========================= */

const canvas = document.getElementById("engine");

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x020402);
scene.fog = new THREE.FogExp2(0x031003, 0.038);

const camera = new THREE.PerspectiveCamera(
  36,
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
renderer.toneMappingExposure = 1.72;

const clock = new THREE.Clock();

function isPhone() {
  return window.innerWidth < 700;
}

/* =========================
   LIGHTING — CINEMATIC
========================= */

scene.add(new THREE.AmbientLight(0xd8ffd0, 0.82));

const keyLight = new THREE.PointLight(0xa8ff63, 34, 115);
keyLight.position.set(0, 6.6, 8.6);
scene.add(keyLight);

const crownLight = new THREE.PointLight(0xffde82, 12, 85);
crownLight.position.set(0, 8.2, 4.8);
scene.add(crownLight);

const leftLight = new THREE.PointLight(0x29ffc0, 11, 80);
leftLight.position.set(-7.6, 2.1, 7.8);
scene.add(leftLight);

const rightLight = new THREE.PointLight(0xffd47a, 10, 80);
rightLight.position.set(7.6, 2.1, 7.8);
scene.add(rightLight);

const portalLight = new THREE.PointLight(0x8dff50, 26, 70);
portalLight.position.set(0, -0.18, 5.2);
scene.add(portalLight);

const bottomGlow = new THREE.PointLight(0x79ff43, 16, 60);
bottomGlow.position.set(0, -4.9, 5.7);
scene.add(bottomGlow);

/* =========================
   MATERIALS
========================= */

const blackMetal = new THREE.MeshStandardMaterial({
  color: 0x050705,
  metalness: 1,
  roughness: 0.18,
  emissive: 0x071607,
  emissiveIntensity: 0.38
});

const gunMetal = new THREE.MeshStandardMaterial({
  color: 0x252b23,
  metalness: 1,
  roughness: 0.13,
  emissive: 0x0d1909,
  emissiveIntensity: 0.28
});

const heavyEdgeMetal = new THREE.MeshStandardMaterial({
  color: 0x31372f,
  metalness: 1,
  roughness: 0.11,
  emissive: 0x11200b,
  emissiveIntensity: 0.34
});

const darkPanel = new THREE.MeshStandardMaterial({
  color: 0x071107,
  metalness: 0.88,
  roughness: 0.18,
  emissive: 0x183513,
  emissiveIntensity: 0.68
});

const activePanelMat = new THREE.MeshStandardMaterial({
  color: 0x0b1b08,
  metalness: 0.9,
  roughness: 0.12,
  emissive: 0x83ff43,
  emissiveIntensity: 1.55
});

const glowMat = new THREE.MeshBasicMaterial({
  color: 0x9cff63,
  transparent: true,
  opacity: 0.98,
  depthWrite: false
});

const softGlowMat = new THREE.MeshBasicMaterial({
  color: 0xc7ff9d,
  transparent: true,
  opacity: 0.36,
  depthWrite: false
});

const portalGlassMat = new THREE.MeshStandardMaterial({
  color: 0x7fff4b,
  emissive: 0x7fff4b,
  emissiveIntensity: 4.25,
  transparent: true,
  opacity: 0.72,
  metalness: 0.2,
  roughness: 0.025
});

/* =========================
   ATMOSPHERE / PARTICLES
========================= */

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

const smoke = makePoints(1800, 38, 24, -10, 24, 0x72ff53, 0.055, 0.16);
scene.add(smoke);

const goldDust = makePoints(600, 20, 15, -4, 15, 0xffdd7e, 0.035, 0.23);
scene.add(goldDust);

const greenSparks = makePoints(900, 17, 12, -2, 11, 0xb6ff82, 0.026, 0.34);
scene.add(greenSparks);

/* =========================
   DIAL ROOT
========================= */

const dialRig = new THREE.Group();
scene.add(dialRig);

const dial = new THREE.Group();
dial.rotation.x = -0.105;
dialRig.add(dial);

/* =========================
   BACK DISC / ARMOR
========================= */

const backPlate = new THREE.Mesh(
  new THREE.CylinderGeometry(4.68, 4.68, 0.52, 200),
  blackMetal
);
backPlate.rotation.x = Math.PI / 2;
backPlate.position.z = -0.42;
dial.add(backPlate);

function torus(radius, tube, mat, z = 0) {
  const mesh = new THREE.Mesh(
    new THREE.TorusGeometry(radius, tube, 36, 280),
    mat
  );
  mesh.rotation.x = Math.PI / 2;
  mesh.position.z = z;
  dial.add(mesh);
  return mesh;
}

const outerArmor = torus(4.62, 0.28, heavyEdgeMetal, 0.09);
const outerHalo = torus(4.43, 0.035, softGlowMat, 0.2);
const outerGlow = torus(4.18, 0.048, glowMat, 0.28);
const midArmor = torus(3.36, 0.15, gunMetal, 0.31);
const midHalo = torus(2.58, 0.028, softGlowMat, 0.4);
const innerGlow = torus(1.76, 0.065, glowMat, 0.51);
const centerArmor = torus(1.31, 0.17, heavyEdgeMetal, 0.61);

/* =========================
   HEX / MACHINE FRAME
========================= */

const frameGroup = new THREE.Group();
frameGroup.position.z = 0.02;
dial.add(frameGroup);

for (let i = 0; i < 8; i++) {
  const a = (Math.PI * 2 / 8) * i + Math.PI / 8;

  const bar = new THREE.Mesh(
    new THREE.BoxGeometry(1.28, 0.055, 0.075),
    new THREE.MeshBasicMaterial({
      color: 0x80ff45,
      transparent: true,
      opacity: 0.52,
      depthWrite: false
    })
  );

  bar.position.set(Math.cos(a) * 4.18, Math.sin(a) * 4.18, 0.78);
  bar.rotation.z = a + Math.PI / 2;
  frameGroup.add(bar);
}

/* =========================
   PORTAL CORE
========================= */

const portalGroup = new THREE.Group();
portalGroup.position.z = 0.75;
dial.add(portalGroup);

const portalBase = new THREE.Mesh(
  new THREE.CylinderGeometry(1.18, 1.18, 0.24, 140),
  new THREE.MeshStandardMaterial({
    color: 0x041004,
    metalness: 0.96,
    roughness: 0.08,
    emissive: 0x53ff38,
    emissiveIntensity: 1.55
  })
);
portalBase.rotation.x = Math.PI / 2;
portalGroup.add(portalBase);

const portalGlass = new THREE.Mesh(
  new THREE.SphereGeometry(1.02, 84, 84),
  portalGlassMat
);
portalGlass.scale.set(1, 1, 0.28);
portalGlass.position.z = 0.14;
portalGroup.add(portalGlass);

const portalAura = new THREE.Mesh(
  new THREE.SphereGeometry(1.34, 64, 64),
  new THREE.MeshBasicMaterial({
    color: 0x8fff57,
    transparent: true,
    opacity: 0.16,
    depthWrite: false
  })
);
portalAura.scale.set(1, 1, 0.16);
portalAura.position.z = 0.08;
portalGroup.add(portalAura);

const portalRing1 = new THREE.Mesh(
  new THREE.TorusGeometry(1.17, 0.042, 20, 240),
  glowMat
);
portalRing1.rotation.x = Math.PI / 2;
portalRing1.position.z = 0.31;
portalGroup.add(portalRing1);

const portalRing2 = new THREE.Mesh(
  new THREE.TorusGeometry(0.8, 0.02, 16, 190),
  new THREE.MeshBasicMaterial({
    color: 0xd5ffad,
    transparent: true,
    opacity: 0.9,
    depthWrite: false
  })
);
portalRing2.rotation.x = Math.PI / 2;
portalRing2.position.z = 0.37;
portalGroup.add(portalRing2);

const portalRing3 = new THREE.Mesh(
  new THREE.TorusGeometry(1.46, 0.018, 14, 210),
  new THREE.MeshBasicMaterial({
    color: 0xffe58a,
    transparent: true,
    opacity: 0.42,
    depthWrite: false
  })
);
portalRing3.rotation.x = Math.PI / 2;
portalRing3.position.z = 0.26;
portalGroup.add(portalRing3);

/* PORTAL ENERGY FIELD */
const energyGeo = new THREE.BufferGeometry();
const energyPositions = [];

for (let i = 0; i < 1400; i++) {
  const r = Math.random() * 0.96;
  const a = Math.random() * Math.PI * 2;

  energyPositions.push(
    Math.cos(a) * r,
    Math.sin(a) * r,
    0.2 + (Math.random() - 0.5) * 0.38
  );
}

energyGeo.setAttribute("position", new THREE.Float32BufferAttribute(energyPositions, 3));

const energy = new THREE.Points(
  energyGeo,
  new THREE.PointsMaterial({
    color: 0xd8ffab,
    size: 0.028,
    transparent: true,
    opacity: 0.98,
    depthWrite: false
  })
);

portalGroup.add(energy);

/* ORBITALS */
const orbitGroup = new THREE.Group();
orbitGroup.position.z = 0.45;
portalGroup.add(orbitGroup);

for (let i = 0; i < 4; i++) {
  const orbit = new THREE.Mesh(
    new THREE.TorusGeometry(1.45 + i * 0.12, 0.006, 8, 160),
    new THREE.MeshBasicMaterial({
      color: i % 2 ? 0xffe58a : 0xb6ff82,
      transparent: true,
      opacity: 0.38,
      depthWrite: false
    })
  );

  orbit.rotation.x = Math.PI / 2 + (i - 1.5) * 0.28;
  orbit.rotation.y = (i - 1.5) * 0.22;
  orbitGroup.add(orbit);
}

/* LIGHTNING */
const lightningGroup = new THREE.Group();
lightningGroup.position.z = 0.42;
portalGroup.add(lightningGroup);

for (let i = 0; i < 24; i++) {
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3((Math.random() - 0.5) * 1.48, (Math.random() - 0.5) * 1.48, 0),
    new THREE.Vector3((Math.random() - 0.5) * 1.72, (Math.random() - 0.5) * 1.72, 0.03),
    new THREE.Vector3((Math.random() - 0.5) * 1.48, (Math.random() - 0.5) * 1.48, 0)
  ]);

  const tube = new THREE.Mesh(
    new THREE.TubeGeometry(curve, 9, 0.008, 6, false),
    new THREE.MeshBasicMaterial({
      color: 0xc8ff92,
      transparent: true,
      opacity: 0.42,
      depthWrite: false
    })
  );

  lightningGroup.add(tube);
}

/* =========================
   SEGMENTS
========================= */

const labels = [
  "live",
  "music",
  "gaming",
  "store",
  "meta",
  "sports",
  "upload",
  "gallery"
];

const routes = {
  gallery: "/gallery.html",
  live: "/live.html",
  music: "/music.html",
  gaming: "/gaming.html",
  store: "/store.html",
  meta: "/meta.html",
  sports: "/sports.html",
  upload: "/upload.html"
};

const segments = [];
const count = labels.length;
const step = (Math.PI * 2) / count;

for (let i = 0; i < count; i++) {
  const shape = new THREE.Shape();

  const innerR = 1.5;
  const outerR = 4.02;
  const gap = step * 0.05;

  const a0 = i * step - step / 2 + gap + Math.PI / 2;
  const a1 = i * step + step / 2 - gap + Math.PI / 2;

  shape.moveTo(Math.cos(a0) * innerR, Math.sin(a0) * innerR);
  shape.absarc(0, 0, innerR, a0, a1, false);
  shape.lineTo(Math.cos(a1) * outerR, Math.sin(a1) * outerR);
  shape.absarc(0, 0, outerR, a1, a0, true);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.4,
    bevelEnabled: true,
    bevelSegments: 6,
    bevelSize: 0.045,
    bevelThickness: 0.055
  });

  const panel = new THREE.Mesh(geo, darkPanel.clone());
  panel.rotation.x = Math.PI / 2;
  panel.position.z = 0.18;
  panel.userData.name = labels[i];

  dial.add(panel);
  segments.push(panel);

  const dividerAngle = i * step + step / 2 + Math.PI / 2;

  const divider = new THREE.Mesh(
    new THREE.BoxGeometry(0.052, 2.66, 0.22),
    new THREE.MeshStandardMaterial({
      color: 0x22281f,
      metalness: 1,
      roughness: 0.12,
      emissive: 0x76ff43,
      emissiveIntensity: 0.24
    })
  );

  divider.position.set(
    Math.cos(dividerAngle) * 2.82,
    Math.sin(dividerAngle) * 2.82,
    0.62
  );

  divider.rotation.z = dividerAngle;
  dial.add(divider);
}

/* =========================
   BOLTS / LAMPS
========================= */

const lamps = [];

for (let i = 0; i < 16; i++) {
  const angle = (Math.PI * 2 / 16) * i;

  const bolt = new THREE.Mesh(
    new THREE.CylinderGeometry(0.115, 0.115, 0.21, 28),
    new THREE.MeshStandardMaterial({
      color: 0xb6b799,
      metalness: 1,
      roughness: 0.12,
      emissive: 0x0c110b,
      emissiveIntensity: 0.26
    })
  );

  bolt.rotation.x = Math.PI / 2;
  bolt.position.set(
    Math.cos(angle) * 4.5,
    Math.sin(angle) * 4.5,
    0.49
  );

  dial.add(bolt);

  if (i % 2 === 1) {
    const lamp = new THREE.Mesh(
      new THREE.SphereGeometry(0.142, 28, 28),
      new THREE.MeshStandardMaterial({
        color: 0xaaff72,
        emissive: 0xaaff72,
        emissiveIntensity: 4.1,
        roughness: 0.04
      })
    );

    lamp.position.set(
      Math.cos(angle) * 4.65,
      Math.sin(angle) * 4.65,
      0.66
    );

    dial.add(lamp);
    lamps.push(lamp);
  }
}

/* SIDE ARMOR CAPS */
for (const side of [-1, 1]) {
  const armor = new THREE.Mesh(
    new THREE.BoxGeometry(0.62, 1.48, 0.42),
    heavyEdgeMetal
  );

  armor.position.set(side * 4.68, 0, 0.25);
  armor.rotation.z = side * 0.12;
  dial.add(armor);

  const strip = new THREE.Mesh(
    new THREE.BoxGeometry(0.09, 1, 0.07),
    glowMat
  );

  strip.position.set(side * 4.8, 0, 0.58);
  strip.rotation.z = side * 0.12;
  dial.add(strip);
}

/* =========================
   MONEY BASE / DEPTH
========================= */

const moneyGroup = new THREE.Group();
moneyGroup.position.set(0, -4.02, -2.7);
scene.add(moneyGroup);

for (let i = 0; i < 34; i++) {
  const bill = new THREE.Mesh(
    new THREE.BoxGeometry(1.18, 0.08, 0.52),
    new THREE.MeshStandardMaterial({
      color: 0x173b11,
      metalness: 0.24,
      roughness: 0.58,
      emissive: 0x183f10,
      emissiveIntensity: 0.34
    })
  );

  bill.position.set(
    (Math.random() - 0.5) * 9.2,
    i * 0.022,
    (Math.random() - 0.5) * 2.05
  );

  bill.rotation.y = (Math.random() - 0.5) * 0.8;
  bill.rotation.z = (Math.random() - 0.5) * 0.25;
  moneyGroup.add(bill);
}

/* =========================
   ROTATION / STATE
========================= */

let rotation = 0;
let velocity = 0;
let dragging = false;
let lastX = 0;
let moved = false;

let targetTiltX = -0.105;
let targetTiltY = 0;
let smoothTiltX = -0.105;
let smoothTiltY = 0;

let activeName = "live";

window.RB_ACTIVE_KEY = activeName;
window.RB_ACTIVE_ROUTE = routes[activeName];
window.RB_DIAL_ROTATION = 0;

function setActive(name) {
  activeName = name || "live";

  window.RB_ACTIVE_KEY = activeName;
  window.RB_ACTIVE_ROUTE = routes[activeName] || "/feed.html";

  if (typeof window.setActiveDial === "function") {
    window.setActiveDial(activeName, true);
  }
}

function getActiveFromRotation() {
  const normalized =
    ((-rotation % (Math.PI * 2)) + Math.PI * 2) %
    (Math.PI * 2);

  const index = Math.round(normalized / step) % count;
  return labels[index] || "live";
}

/* =========================
   POINTER
========================= */

window.addEventListener("pointerdown", (event) => {
  dragging = true;
  moved = false;
  lastX = event.clientX;
});

window.addEventListener("pointermove", (event) => {
  const nx = event.clientX / window.innerWidth - 0.5;
  const ny = event.clientY / window.innerHeight - 0.5;

  targetTiltY = nx * 0.15;
  targetTiltX = -0.105 + ny * 0.055;

  if (!dragging) return;

  const dx = event.clientX - lastX;
  lastX = event.clientX;

  if (Math.abs(dx) > 2) moved = true;
  velocity = dx * 0.0034;
});

window.addEventListener("pointerup", () => {
  dragging = false;
});

window.addEventListener("pointercancel", () => {
  dragging = false;
});

/* =========================
   CLICK RAYCAST
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
  setActive(name);

  if (window.RB_DIAL_CLICK_TO_OPEN === true) {
    window.location.href = routes[name];
  }
});

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

/* =========================
   RESIZE — MOBILE LOCK
========================= */

function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const phone = isPhone();

  camera.aspect = w / h;
  camera.updateProjectionMatrix();

  renderer.setSize(w, h);

  if (phone) {
    dialRig.scale.setScalar(0.76);
    dialRig.position.set(0, -0.3, 0);
    camera.position.set(0, 0.92, 11.6);
    camera.lookAt(0, 0.02, 0);
  } else {
    dialRig.scale.setScalar(1.1);
    dialRig.position.set(0, -0.36, 0);
    camera.position.set(0, 0.62, 9.05);
    camera.lookAt(0, 0.03, 0);
  }
}

window.addEventListener("resize", resize);
resize();

/* =========================
   LOOP — REALISTIC CINEMA MOTION
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
      rotation = THREE.MathUtils.lerp(rotation, snapped, 0.09);
    }
  }

  dial.rotation.z = rotation;

  window.RB_DIAL_ROTATION = rotation;
  document.documentElement.style.setProperty(
    "--rb-dial-rotation",
    `${rotation}rad`
  );

  outerArmor.rotation.z = -rotation * 0.14;
  outerHalo.rotation.z = -rotation * 0.22;
  outerGlow.rotation.z = -rotation * 0.35;
  midArmor.rotation.z = rotation * 0.12;
  midHalo.rotation.z = rotation * 0.24;
  innerGlow.rotation.z = rotation * 0.55;
  centerArmor.rotation.z = -rotation * 0.22;
  frameGroup.rotation.z = -rotation * 0.08;

  const pulse = Math.sin(t * 2.65);
  const fastPulse = Math.sin(t * 5.3);

  portalGlass.scale.set(
    1 + pulse * 0.045,
    1 + pulse * 0.045,
    0.28
  );

  portalAura.scale.set(
    1.04 + pulse * 0.07,
    1.04 + pulse * 0.07,
    0.16
  );

  portalGlass.material.emissiveIntensity = 4.1 + Math.sin(t * 3.4) * 0.85;
  portalAura.material.opacity = 0.12 + Math.abs(pulse) * 0.08;

  portalRing1.rotation.z += 0.01;
  portalRing2.rotation.z -= 0.016;
  portalRing3.rotation.z += 0.006;
  orbitGroup.rotation.z += 0.006;
  orbitGroup.rotation.x = Math.sin(t * 0.7) * 0.12;

  energy.rotation.z -= 0.016;
  lightningGroup.rotation.z += 0.005;

  lightningGroup.children.forEach((line, index) => {
    line.material.opacity =
      0.12 + Math.abs(Math.sin(t * 2.7 + index * 0.8)) * 0.46;
  });

  smoke.rotation.y += 0.00065;
  smoke.rotation.x = Math.sin(t * 0.15) * 0.035;
  smoke.material.opacity = 0.13 + Math.abs(Math.sin(t * 0.42)) * 0.06;

  goldDust.rotation.y -= 0.00075;
  goldDust.rotation.x = Math.sin(t * 0.18) * 0.025;

  greenSparks.rotation.z += 0.0009;
  greenSparks.material.opacity = 0.25 + Math.abs(fastPulse) * 0.12;

  moneyGroup.rotation.y = Math.sin(t * 0.35) * 0.065;
  moneyGroup.position.y = -4.02 + Math.sin(t * 0.7) * 0.035;

  lamps.forEach((lamp, index) => {
    lamp.material.emissiveIntensity =
      3.4 + Math.abs(Math.sin(t * 2.4 + index)) * 1.5;
  });

  const newActive = getActiveFromRotation();

  if (newActive !== activeName) {
    setActive(newActive);
  }

  segments.forEach((segment) => {
    const isActive = segment.userData.name === activeName;

    segment.material.emissiveIntensity = THREE.MathUtils.lerp(
      segment.material.emissiveIntensity,
      isActive ? 1.65 : 0.62,
      0.12
    );

    segment.position.z = THREE.MathUtils.lerp(
      segment.position.z,
      isActive ? 0.32 : 0.18,
      0.12
    );

    segment.scale.z = THREE.MathUtils.lerp(
      segment.scale.z,
      isActive ? 1.08 : 1,
      0.08
    );
  });

  keyLight.intensity = 31 + Math.sin(t * 1.7) * 3.2;
  crownLight.intensity = 10 + Math.sin(t * 1.1) * 2.4;
  portalLight.intensity = 23 + Math.sin(t * 2.8) * 5;
  bottomGlow.intensity = 14 + Math.sin(t * 2.2) * 2.8;

  renderer.render(scene, camera);
}

setActive("live");
animate();
