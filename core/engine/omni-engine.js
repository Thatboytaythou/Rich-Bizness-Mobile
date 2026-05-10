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
camera.position.set(0, 1.25, 6.2); // tuned perspective

/* RENDERER */
const renderer = new THREE.WebGLRenderer({
  canvas: document.getElementById("engine"),
  antialias: true
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);

/* =========================
   LIGHT
========================= */
scene.add(new THREE.AmbientLight(0xffffff, 1.2));

const light = new THREE.PointLight(0x00ffcc, 2);
light.position.set(4, 5, 4);
scene.add(light);

/* =========================
   MAIN WHEEL GROUP
========================= */
const wheel = new THREE.Group();
scene.add(wheel);

/* 🔥 DIAL ANGLE (critical) */
wheel.rotation.x = -0.38;

/* =========================
   OUTER METAL RING
========================= */
const outerRing = new THREE.Mesh(
  new THREE.TorusGeometry(2.9, 0.14, 32, 200),
  new THREE.MeshStandardMaterial({
    color: 0x111111,
    metalness: 1,
    roughness: 0.3,
    emissive: 0x00ffcc,
    emissiveIntensity: 0.15
  })
);
outerRing.rotation.x = Math.PI / 2;
wheel.add(outerRing);

/* =========================
   INNER GLOW RING
========================= */
const innerGlow = new THREE.Mesh(
  new THREE.TorusGeometry(2.2, 0.05, 16, 200),
  new THREE.MeshBasicMaterial({
    color: 0x00ffcc
  })
);
innerGlow.rotation.x = Math.PI / 2;
wheel.add(innerGlow);

/* =========================
   CENTER PORTAL
========================= */
const portal = new THREE.Mesh(
  new THREE.SphereGeometry(0.85, 32, 32),
  new THREE.MeshStandardMaterial({
    color: 0x00ffcc,
    emissive: 0x00ffcc,
    emissiveIntensity: 1.6,
    transparent: true,
    opacity: 0.95
  })
);
scene.add(portal);

/* =========================
   SEGMENTS (WEDGE PANELS)
========================= */
const segments = [];
const count = 8;
const step = (Math.PI * 2) / count;

for (let i = 0; i < count; i++) {

  const shape = new THREE.Shape();

  const innerR = 1.4;
  const outerR = 2.6;

  const a0 = i * step - step * 0.45;
  const a1 = i * step + step * 0.45;

  shape.moveTo(Math.cos(a0)*innerR, Math.sin(a0)*innerR);
  shape.absarc(0,0,innerR,a0,a1,false);
  shape.lineTo(Math.cos(a1)*outerR, Math.sin(a1)*outerR);
  shape.absarc(0,0,outerR,a1,a0,true);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape,{
    depth:0.35,
    bevelEnabled:false
  });

  const mat = new THREE.MeshStandardMaterial({
    color:0x151515,
    metalness:1,
    roughness:0.25,
    emissive:0x00ffcc,
    emissiveIntensity:0.25
  });

  const seg = new THREE.Mesh(geo,mat);

  seg.rotation.x = Math.PI/2;
  seg.position.y = 0;

  seg.userData.index = i;

  wheel.add(seg);
  segments.push(seg);
}

/* =========================
   ROTATION SYSTEM
========================= */
let velocity = 0;
let rotation = 0;
let dragging = false;

function animate(){
  requestAnimationFrame(animate);

  rotation += velocity;

  if(!dragging){
    velocity *= 0.9;

    if(Math.abs(velocity) < 0.001){
      velocity = 0;
      rotation = Math.round(rotation / step) * step;
    }
  }

  wheel.rotation.y = rotation;

  /* FRONT HIGHLIGHT */
  let best = -Infinity;
  let active = 0;

  segments.forEach((s,i)=>{
    const pos = new THREE.Vector3();
    s.getWorldPosition(pos);

    if(pos.z > best){
      best = pos.z;
      active = i;
    }

    const depth = (pos.z + 2.6) / (2.6*2);
    s.material.emissiveIntensity = 0.2 + depth * 1.2;
  });

  window.activeIndex = active;

  /* PORTAL PULSE */
  const pulse = 1 + Math.sin(Date.now()*0.002)*0.06;
  portal.scale.set(pulse,pulse,pulse);

  renderer.render(scene,camera);
}
animate();

/* =========================
   TOUCH CONTROL
========================= */
let lastX = 0;

window.addEventListener("touchstart",e=>{
  dragging = true;
  lastX = e.touches[0].clientX;
});

window.addEventListener("touchmove",e=>{
  const dx = e.touches[0].clientX - lastX;
  velocity = dx * 0.004;
  lastX = e.touches[0].clientX;
});

window.addEventListener("touchend",()=>{
  dragging = false;
});

/* =========================
   CLICK
========================= */
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

window.addEventListener("click",e=>{
  mouse.x = (e.clientX / window.innerWidth)*2 - 1;
  mouse.y = -(e.clientY / window.innerHeight)*2 + 1;

  raycaster.setFromCamera(mouse,camera);

  const hit = raycaster.intersectObjects(segments);

  if(hit.length){
    console.log("CLICK:", hit[0].object.userData.index);
  }
});

/* =========================
   RESIZE
========================= */
window.addEventListener("resize",()=>{
  camera.aspect = window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
