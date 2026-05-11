import * as THREE from "https://unpkg.com/three@0.158.0/build/three.module.js";

/* =========================
   RICH BIZNESS OMNI ENGINE
   FINAL CLEAN MOBILE ALIGNMENT VERSION
   /core/engine/omni-engine.js
========================= */

const canvas = document.getElementById("engine");

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x020402);
scene.fog = new THREE.FogExp2(0x020402, 0.048);

const camera = new THREE.PerspectiveCamera(
  36,
  window.innerWidth / window.innerHeight,
  0.1,
  240
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
renderer.toneMappingExposure = 1.42;

const clock = new THREE.Clock();

scene.add(new THREE.AmbientLight(0xffffff, 0.76));

const keyLight = new THREE.PointLight(0xa5ff61, 25, 95);
keyLight.position.set(0, 6.4, 8.2);
scene.add(keyLight);

const leftLight = new THREE.PointLight(0x25ffb6, 8, 65);
leftLight.position.set(-7.2, 1.8, 7.8);
scene.add(leftLight);

const rightLight = new THREE.PointLight(0xffd47a, 7, 65);
rightLight.position.set(7.2, 1.8, 7.8);
scene.add(rightLight);

const portalLight = new THREE.PointLight(0x82ff45, 18, 55);
portalLight.position.set(0, -0.2, 4.6);
scene.add(portalLight);

const bottomGlow = new THREE.PointLight(0x7dff4d, 12, 45);
bottomGlow.position.set(0, -4.6, 5.6);
scene.add(bottomGlow);

function isPhone() {
  return window.innerWidth < 700;
}

/* MATERIALS */
const blackMetal = new THREE.MeshStandardMaterial({
  color: 0x070907,
  metalness: 1,
  roughness: 0.2,
  emissive: 0x071407,
  emissiveIntensity: 0.26
});

const gunMetal = new THREE.MeshStandardMaterial({
  color: 0x222820,
  metalness: 1,
  roughness: 0.15,
  emissive: 0x0a1608,
  emissiveIntensity: 0.18
});

const darkPanel = new THREE.MeshStandardMaterial({
  color: 0x071007,
  metalness: 0.82,
  roughness: 0.23,
  emissive: 0x153012,
  emissiveIntensity: 0.55
});

const glowMat = new THREE.MeshBasicMaterial({
  color: 0x94ff5f,
  transparent: true,
  opacity: 0.96
});

const portalGlassMat = new THREE.MeshStandardMaterial({
  color: 0x78ff4c,
  emissive: 0x78ff4c,
  emissiveIntensity: 3.35,
  transparent: true,
  opacity: 0.72,
  metalness: 0.2,
  roughness: 0.035
});

/* SMOKE */
const smokeGeo = new THREE.BufferGeometry();
const smokePositions = [];

for (let i = 0; i < 1450; i++) {
  smokePositions.push(
    (Math.random() - 0.5) * 35,
    (Math.random() - 0.5) * 21,
    -12 - Math.random() * 18
  );
}

smokeGeo.setAttribute(
  "position",
  new THREE.Float32BufferAttribute(smokePositions, 3)
);

const smoke = new THREE.Points(
  smokeGeo,
  new THREE.PointsMaterial({
    color: 0x70ff52,
    size: 0.052,
    transparent: true,
    opacity: 0.18,
    depthWrite: false
  })
);

scene.add(smoke);

/* DIAL ROOT */
const dialRig = new THREE.Group();
scene.add(dialRig);

const dial = new THREE.Group();
dial.rotation.x = -0.105;
dialRig.add(dial);

/* BACK DISC */
const backPlate = new THREE.Mesh(
  new THREE.CylinderGeometry(4.52, 4.52, 0.44, 180),
  blackMetal
);

backPlate.rotation.x = Math.PI / 2;
backPlate.position.z = -0.38;
dial.add(backPlate);

function torus(radius, tube, mat, z = 0) {
  const mesh = new THREE.Mesh(
    new THREE.TorusGeometry(radius, tube, 32, 260),
    mat
  );

  mesh.rotation.x = Math.PI / 2;
  mesh.position.z = z;
  dial.add(mesh);
  return mesh;
}

const outerArmor = torus(4.57, 0.25, gunMetal, 0.09);
const outerGlow = torus(4.18, 0.038, glowMat, 0.25);
const midArmor = torus(3.33, 0.13, gunMetal, 0.28);
const innerGlow = torus(1.74, 0.055, glowMat, 0.47);
const centerArmor = torus(1.31, 0.15, gunMetal, 0.58);

/* PORTAL CORE */
const portalGroup = new THREE.Group();
portalGroup.position.z = 0.7;
dial.add(portalGroup);

const portalBase = new THREE.Mesh(
  new THREE.CylinderGeometry(1.14, 1.14, 0.2, 120),
  new THREE.MeshStandardMaterial({
    color: 0x041004,
    metalness: 0.95,
    roughness: 0.1,
    emissive: 0x4cff36,
    emissiveIntensity: 1.25
  })
);

portalBase.rotation.x = Math.PI / 2;
portalGroup.add(portalBase);

const portalGlass = new THREE.Mesh(
  new THREE.SphereGeometry(0.98, 72, 72),
  portalGlassMat
);

portalGlass.scale.set(1, 1, 0.3);
portalGlass.position.z = 0.13;
portalGroup.add(portalGlass);

const portalRing1 = new THREE.Mesh(
  new THREE.TorusGeometry(1.13, 0.038, 18, 220),
  glowMat
);

portalRing1.rotation.x = Math.PI / 2;
portalRing1.position.z = 0.29;
portalGroup.add(portalRing1);

const portalRing2 = new THREE.Mesh(
  new THREE.TorusGeometry(0.78, 0.018, 14, 180),
  new THREE.MeshBasicMaterial({
    color: 0xc9ff9c,
    transparent: true,
    opacity: 0.84
  })
);

portalRing2.rotation.x = Math.PI / 2;
portalRing2.position.z = 0.34;
portalGroup.add(portalRing2);

/* PORTAL ENERGY */
const energyGeo = new THREE.BufferGeometry();
const energyPositions = [];

for (let i = 0; i < 1050; i++) {
  const r = Math.random() * 0.92;
  const a = Math.random() * Math.PI * 2;

  energyPositions.push(
    Math.cos(a) * r,
    Math.sin(a) * r,
    0.2 + (Math.random() - 0.5) * 0.34
  );
}

energyGeo.setAttribute(
  "position",
  new THREE.Float32BufferAttribute(energyPositions, 3)
);

const energy = new THREE.Points(
  energyGeo,
  new THREE.PointsMaterial({
    color: 0xd2ff9d,
    size: 0.027,
    transparent: true,
    opacity: 0.95,
    depthWrite: false
  })
);

portalGroup.add(energy);

/* LIGHTNING */
const lightningGroup = new THREE.Group();
lightningGroup.position.z = 0.38;
portalGroup.add(lightningGroup);

for (let i = 0; i < 18; i++) {
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3((Math.random() - 0.5) * 1.4, (Math.random() - 0.5) * 1.4, 0),
    new THREE.Vector3((Math.random() - 0.5) * 1.6, (Math.random() - 0.5) * 1.6, 0.02),
    new THREE.Vector3((Math.random() - 0.5) * 1.4, (Math.random() - 0.5) * 1.4, 0)
  ]);

  const tube = new THREE.Mesh(
    new THREE.TubeGeometry(curve, 8, 0.008, 6, false),
    new THREE.MeshBasicMaterial({
      color: 0xb9ff83,
      transparent: true,
      opacity: 0.42
    })
  );

  lightningGroup.add(tube);
}

/* SEGMENTS */
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
  const outerR = 3.98;
  const gap = step * 0.052;

  const a0 = i * step - step / 2 + gap + Math.PI / 2;
  const a1 = i * step + step / 2 - gap + Math.PI / 2;

  shape.moveTo(Math.cos(a0) * innerR, Math.sin(a0) * innerR);
  shape.absarc(0, 0, innerR, a0, a1, false);
  shape.lineTo(Math.cos(a1) * outerR, Math.sin(a1) * outerR);
  shape.absarc(0, 0, outerR, a1, a0, true);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.35,
    bevelEnabled: true,
    bevelSegments: 5,
    bevelSize: 0.038,
    bevelThickness: 0.045
  });

  const panel = new THREE.Mesh(geo, darkPanel.clone());
  panel.rotation.x = Math.PI / 2;
  panel.position.z = 0.17;
  panel.userData.name = labels[i];

  dial.add(panel);
  segments.push(panel);

  const dividerAngle = i * step + step / 2 + Math.PI / 2;

  const divider = new THREE.Mesh(
    new THREE.BoxGeometry(0.043, 2.56, 0.2),
    new THREE.MeshStandardMaterial({
      color: 0x1d211b,
      metalness: 1,
      roughness: 0.14,
      emissive: 0x74ff42,
      emissiveIntensity: 0.18
    })
  );

  divider.position.set(
    Math.cos(dividerAngle) * 2.78,
    Math.sin(dividerAngle) * 2.78,
    0.59
  );

  divider.rotation.z = dividerAngle;
  dial.add(divider);
}

/* BOLTS / LAMPS */
for (let i = 0; i < 16; i++) {
  const angle = (Math.PI * 2 / 16) * i;

  const bolt = new THREE.Mesh(
    new THREE.CylinderGeometry(0.11, 0.11, 0.19, 26),
    new THREE.MeshStandardMaterial({
      color: 0xa8a98f,
      metalness: 1,
      roughness: 0.15,
      emissive: 0x0b100b,
      emissiveIntensity: 0.22
    })
  );

  bolt.rotation.x = Math.PI / 2;
  bolt.position.set(
    Math.cos(angle) * 4.47,
    Math.sin(angle) * 4.47,
    0.47
  );

  dial.add(bolt);

  if (i % 2 === 1) {
    const lamp = new THREE.Mesh(
      new THREE.SphereGeometry(0.135, 26, 26),
      new THREE.MeshStandardMaterial({
        color: 0xa3ff68,
        emissive: 0xa3ff68,
        emissiveIntensity: 3.4,
        roughness: 0.06
      })
    );

    lamp.position.set(
      Math.cos(angle) * 4.6,
      Math.sin(angle) * 4.6,
      0.63
    );

    dial.add(lamp);
  }
}

/* SIDE ARMOR CAPS */
for (const side of [-1, 1]) {
  const armor = new THREE.Mesh(
    new THREE.BoxGeometry(0.55, 1.4, 0.38),
    gunMetal
  );

  armor.position.set(side * 4.62, 0, 0.25);
  armor.rotation.z = side * 0.12;
  dial.add(armor);

  const strip = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.95, 0.06),
    glowMat
  );

  strip.position.set(side * 4.72, 0, 0.55);
  strip.rotation.z = side * 0.12;
  dial.add(strip);
}

/* MONEY BASE */
const moneyGroup = new THREE.Group();
moneyGroup.position.set(0, -3.88, -2.85);
scene.add(moneyGroup);

for (let i = 0; i < 26; i++) {
  const bill = new THREE.Mesh(
    new THREE.BoxGeometry(1.16, 0.08, 0.52),
    new THREE.MeshStandardMaterial({
      color: 0x143811,
      metalness: 0.24,
      roughness: 0.6,
      emissive: 0x163b10,
      emissiveIntensity: 0.3
    })
  );

  bill.position.set(
    (Math.random() - 0.5) * 8.8,
    i * 0.023,
    (Math.random() - 0.5) * 1.95
  );

  bill.rotation.y = (Math.random() - 0.5) * 0.8;
  bill.rotation.z = (Math.random() - 0.5) * 0.25;
  moneyGroup.add(bill);
}

/* ROTATION */
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

/* POINTER */
window.addEventListener("pointerdown", (event) => {
  dragging = true;
  moved = false;
  lastX = event.clientX;
});

window.addEventListener("pointermove", (event) => {
  const nx = event.clientX / window.innerWidth - 0.5;
  const ny = event.clientY / window.innerHeight - 0.5;

  targetTiltY = nx * 0.13;
  targetTiltX = -0.105 + ny * 0.045;

  if (!dragging) return;

  const dx = event.clientX - lastX;
  lastX = event.clientX;

  if (Math.abs(dx) > 2) moved = true;
  velocity = dx * 0.0031;
});

window.addEventListener("pointerup", () => {
  dragging = false;
});

window.addEventListener("pointercancel", () => {
  dragging = false;
});

/* CLICK */
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

/* RESIZE — FIXED MOBILE ALIGNMENT */
function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const phone = isPhone();

  camera.aspect = w / h;
  camera.updateProjectionMatrix();

  renderer.setSize(w, h);

  if (phone) {
    dialRig.scale.setScalar(0.72);
    dialRig.position.set(0, -0.18, 0);
    camera.position.set(0, 0.9, 11.9);
    camera.lookAt(0, 0.08, 0);
  } else {
    dialRig.scale.setScalar(1.08);
    dialRig.position.set(0, -0.34, 0);
    camera.position.set(0, 0.62, 9.35);
    camera.lookAt(0, 0.06, 0);
  }
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
      rotation = THREE.MathUtils.lerp(rotation, snapped, 0.09);
    }
  }

  dial.rotation.z = rotation;

  window.RB_DIAL_ROTATION = rotation;
  document.documentElement.style.setProperty(
    "--rb-dial-rotation",
    `${rotation}rad`
  );

  outerArmor.rotation.z = -rotation * 0.15;
  outerGlow.rotation.z = -rotation * 0.32;
  midArmor.rotation.z = rotation * 0.1;
  innerGlow.rotation.z = rotation * 0.52;
  centerArmor.rotation.z = -rotation * 0.2;

  portalGlass.scale.set(
    1 + Math.sin(t * 2.6) * 0.04,
    1 + Math.sin(t * 2.6) * 0.04,
    0.3
  );

  portalGlass.material.emissiveIntensity =
    3.2 + Math.sin(t * 3.4) * 0.72;

  portalRing1.rotation.z += 0.008;
  portalRing2.rotation.z -= 0.014;
  energy.rotation.z -= 0.013;
  lightningGroup.rotation.z += 0.004;

  lightningGroup.children.forEach((line, index) => {
    line.material.opacity =
      0.18 + Math.abs(Math.sin(t * 2.2 + index)) * 0.38;
  });

  smoke.rotation.y += 0.0006;
  smoke.rotation.x = Math.sin(t * 0.15) * 0.03;

  moneyGroup.rotation.y = Math.sin(t * 0.35) * 0.06;

  const newActive = getActiveFromRotation();

  if (newActive !== activeName) {
    setActive(newActive);
  }

  segments.forEach((segment) => {
    const isActive = segment.userData.name === activeName;

    segment.material.emissiveIntensity = THREE.MathUtils.lerp(
      segment.material.emissiveIntensity,
      isActive ? 1.32 : 0.5,
      0.12
    );

    segment.position.z = THREE.MathUtils.lerp(
      segment.position.z,
      isActive ? 0.27 : 0.17,
      0.12
    );
  });

  portalLight.intensity = 16 + Math.sin(t * 2.8) * 3.4;
  bottomGlow.intensity = 10 + Math.sin(t * 2.2) * 2.2;

  renderer.render(scene, camera);
}

setActive("live");
animate();
