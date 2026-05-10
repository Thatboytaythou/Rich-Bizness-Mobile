import * as THREE from "https://unpkg.com/three@0.158.0/build/three.module.js";

/* =========================
   SCENE
========================= */
const scene = new THREE.Scene();

/* CAMERA */
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth/window.innerHeight,
  0.1,
  1000
);
camera.position.set(0, 1.2, 6); // 🔥 raised camera (important)

/* RENDERER */
const renderer = new THREE.WebGLRenderer({
  canvas: document.getElementById("engine"),
  antialias: true
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);

/* LIGHT */
scene.add(new THREE.AmbientLight(0xffffff, 1.2));

const light = new THREE.PointLight(0x00ffcc, 2);
light.position.set(4, 5, 4);
scene.add(light);

/* =========================
   HUB (CENTER PORTAL)
========================= */
const hub = new THREE.Mesh(
  new THREE.CylinderGeometry(0.8, 0.8, 0.4, 64),
  new THREE.MeshStandardMaterial({
    color: 0x000000,
    metalness: 1,
    roughness: 0.2,
    emissive: 0x00ffcc,
    emissiveIntensity: 0.6
  })
);
scene.add(hub);

/* =========================
   WHEEL GROUP
========================= */
const wheel = new THREE.Group();
scene.add(wheel);

/* 🔥 THIS IS THE REAL DIAL FIX */
wheel.rotation.x = -0.35; // tilt upward like phone dial

/* =========================
   OUTER METAL RING
========================= */
const ring = new THREE.Mesh(
  new THREE.TorusGeometry(2.8, 0.12, 32, 200),
  new THREE.MeshStandardMaterial({
    color: 0x111111,
    metalness: 1,
    roughness: 0.3,
    emissive: 0x00ffcc,
    emissiveIntensity: 0.15
  })
);
ring.rotation.x = Math.PI / 2;
wheel.add(ring);

/* =========================
   SEGMENTS (REAL PANELS)
========================= */
const segments = [];
const count = 8;
const radius = 2.4;
const step = (Math.PI * 2) / count;

for (let i = 0; i < count; i++) {

  const geo = new THREE.BoxGeometry(0.9, 0.9, 0.4);

  const mat = new THREE.MeshStandardMaterial({
    color: 0x1a1a1a,
    metalness: 1,
    roughness: 0.25,
    emissive: 0x00ffcc,
    emissiveIntensity: 0.25
  });

  const seg = new THREE.Mesh(geo, mat);

  const angle = i * step;

  seg.position.set(
    Math.cos(angle) * radius,
    0,
    Math.sin(angle) * radius
  );

  /* FACE CENTER */
  seg.lookAt(0, 0, 0);

  /* 🔥 LOCK PANEL ROTATION */
  seg.rotation.y += Math.PI;

  seg.userData.index = i;

  wheel.add(seg);
  segments.push(seg);
}

/* =========================
   ROTATION SYSTEM (SNAP DIAL)
========================= */
let velocity = 0;
let rotation = 0;
let dragging = false;

function animate() {
  requestAnimationFrame(animate);

  rotation += velocity;

  if (!dragging) {
    velocity *= 0.9;

    if (Math.abs(velocity) < 0.001) {
      velocity = 0;

      /* 🔥 HARD SNAP */
      rotation = Math.round(rotation / step) * step;
    }
  }

  wheel.rotation.y = rotation;

  /* FRONT PANEL GLOW */
  let best = -Infinity;
  let active = 0;

  segments.forEach((s, i) => {
    const pos = new THREE.Vector3();
    s.getWorldPosition(pos);

    if (pos.z > best) {
      best = pos.z;
      active = i;
    }

    const depth = (pos.z + radius) / (radius * 2);
    s.material.emissiveIntensity = 0.2 + depth * 1.2;
  });

  window.activeIndex = active;

  renderer.render(scene, camera);
}
animate();

/* =========================
   TOUCH CONTROL
========================= */
let lastX = 0;

window.addEventListener("touchstart", e => {
  dragging = true;
  lastX = e.touches[0].clientX;
});

window.addEventListener("touchmove", e => {
  const dx = e.touches[0].clientX - lastX;
  velocity = dx * 0.004;
  lastX = e.touches[0].clientX;
});

window.addEventListener("touchend", () => {
  dragging = false;
});

/* =========================
   CLICK
========================= */
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

window.addEventListener("click", e => {
  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);

  const hit = raycaster.intersectObjects(segments);

  if (hit.length) {
    console.log("CLICK:", hit[0].object.userData.index);
  }
});

/* =========================
   RESIZE
========================= */
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
