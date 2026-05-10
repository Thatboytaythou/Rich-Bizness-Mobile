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
camera.position.set(0, 0, 7);

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
light.position.set(4, 4, 4);
scene.add(light);

/* =========================
   CORE HUB
========================= */
const hub = new THREE.Mesh(
  new THREE.CylinderGeometry(0.7, 0.7, 0.3, 64),
  new THREE.MeshStandardMaterial({
    color: 0x111111,
    metalness: 1,
    roughness: 0.25,
    emissive: 0x00ffcc,
    emissiveIntensity: 0.4
  })
);
scene.add(hub);

/* =========================
   WHEEL (THE ACTUAL DIAL)
========================= */
const wheel = new THREE.Group();
scene.add(wheel);

const segments = [];
const count = 8;
const radius = 2.6;
const step = (Math.PI * 2) / count;

/* BUILD SEGMENTS */
for (let i = 0; i < count; i++) {

  const geo = new THREE.BoxGeometry(0.8, 0.8, 0.3);

  const mat = new THREE.MeshStandardMaterial({
    color: 0x1a1a1a,
    metalness: 1,
    roughness: 0.3,
    emissive: 0x00ffcc,
    emissiveIntensity: 0.3
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

  seg.userData.index = i;

  wheel.add(seg);
  segments.push(seg);
}

/* =========================
   ROTATION (DIAL)
========================= */
let velocity = 0;
let rotation = 0;
let dragging = false;

function animate() {
  requestAnimationFrame(animate);

  rotation += velocity;

  if (!dragging) {
    velocity *= 0.92;

    if (Math.abs(velocity) < 0.001) {
      velocity = 0;
      rotation = Math.round(rotation / step) * step;
    }
  }

  /* 🔒 ONLY THIS ROTATES */
  wheel.rotation.y = rotation;

  /* FRONT HIGHLIGHT */
  let best = -Infinity;
  let active = 0;

  segments.forEach((s, i) => {
    const pos = new THREE.Vector3();
    s.getWorldPosition(pos);

    if (pos.z > best) {
      best = pos.z;
      active = i;
    }

    /* subtle glow */
    const depth = (pos.z + radius) / (radius * 2);
    s.material.emissiveIntensity = 0.3 + depth * 0.8;
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
  velocity = dx * 0.003;
  lastX = e.touches[0].clientX;
});

window.addEventListener("touchend", () => {
  dragging = false;
});

/* =========================
   CLICK NAV
========================= */
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

window.addEventListener("click", e => {
  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);

  const hit = raycaster.intersectObjects(segments);

  if (hit.length) {
    console.log("CLICKED:", hit[0].object.userData.index);
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
