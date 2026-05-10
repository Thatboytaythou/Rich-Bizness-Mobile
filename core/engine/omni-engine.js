import * as THREE from "https://unpkg.com/three@0.158.0/build/three.module.js";

const canvas = document.getElementById("engine");

/* =========================
   SCENE
========================= */
const scene = new THREE.Scene();

/* =========================
   CAMERA (🔥 FIXED CENTER)
========================= */
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);

/* 🔥 KEY FIXES */
camera.position.set(0, 0, 8.5);   // pull back = no crop
camera.lookAt(0, 0, 0);           // hard center lock

/* =========================
   RENDERER
========================= */
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: true
});

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);

/* =========================
   LIGHT
========================= */
scene.add(new THREE.AmbientLight(0xffffff, 1.2));

const light = new THREE.PointLight(0x00ffcc, 3);
light.position.set(5, 5, 5);
scene.add(light);

/* =========================
   🔥 CENTER GROUP (IMPORTANT)
========================= */
const centerGroup = new THREE.Group();
scene.add(centerGroup);

/* =========================
   🔥 METAL RING
========================= */
const ring = new THREE.Mesh(
  new THREE.TorusGeometry(2.6, 0.12, 40, 200),
  new THREE.MeshStandardMaterial({
    color: 0x1a1a1a,
    metalness: 1,
    roughness: 0.3,
    emissive: 0x00ffcc,
    emissiveIntensity: 0.15
  })
);
centerGroup.add(ring);

/* =========================
   PORTAL
========================= */
const portal = new THREE.Mesh(
  new THREE.SphereGeometry(1, 32, 32),
  new THREE.MeshStandardMaterial({
    color: 0x00ffcc,
    emissive: 0x00ffcc,
    emissiveIntensity: 2,
    transparent: true,
    opacity: 0.9
  })
);
centerGroup.add(portal);

/* =========================
   SEGMENTS
========================= */
const sections = 8;
const radius = 2.6;
const step = (Math.PI * 2) / sections;

const segments = [];

for (let i = 0; i < sections; i++) {
  const geo = new THREE.BoxGeometry(0.5, 0.8, 0.2);

  const mat = new THREE.MeshStandardMaterial({
    color: 0x111111,
    metalness: 1,
    roughness: 0.3,
    emissive: 0x00ffcc,
    emissiveIntensity: 0.2
  });

  const mesh = new THREE.Mesh(geo, mat);

  centerGroup.add(mesh);
  segments.push(mesh);
}

/* =========================
   PARTICLES
========================= */
const starGeo = new THREE.BufferGeometry();
const count = 600;
const pos = new Float32Array(count * 3);

for (let i = 0; i < count; i++) {
  pos[i * 3] = (Math.random() - 0.5) * 12;
  pos[i * 3 + 1] = (Math.random() - 0.5) * 12;
  pos[i * 3 + 2] = (Math.random() - 0.5) * 12;
}

starGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));

const stars = new THREE.Points(
  starGeo,
  new THREE.PointsMaterial({
    color: 0x00ffcc,
    size: 0.05
  })
);

scene.add(stars);

/* =========================
   MOTION
========================= */
let rotation = 0;
let velocity = 0;
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

  segments.forEach((m, i) => {
    const angle = i * step + rotation;

    m.position.x = Math.cos(angle) * radius;
    m.position.y = Math.sin(angle) * 0.3; // 🔥 reduced vertical stretch
    m.position.z = Math.sin(angle) * radius;

    m.lookAt(0, 0, 0);

    const depth = (m.position.z + radius) / (radius * 2);

    const scale = 0.7 + depth * 0.4;
    m.scale.set(scale, scale, scale);
  });

  /* 🔥 STABLE CENTER */
  centerGroup.position.y = 0;   // locks vertical center

  portal.scale.setScalar(1 + Math.sin(Date.now() * 0.002) * 0.05);

  stars.rotation.y += 0.0005;

  renderer.render(scene, camera);
}
animate();

/* =========================
   TOUCH
========================= */
let lastX = 0;

addEventListener("touchstart", e => {
  dragging = true;
  lastX = e.touches[0].clientX;
});

addEventListener("touchmove", e => {
  const dx = e.touches[0].clientX - lastX;
  velocity = dx * 0.004;
  lastX = e.touches[0].clientX;
});

addEventListener("touchend", () => {
  dragging = false;
});

/* =========================
   RESIZE (🔥 CRITICAL FIX)
========================= */
addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
});
