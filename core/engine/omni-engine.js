import * as THREE from "https://unpkg.com/three@0.158.0/build/three.module.js";

const canvas = document.getElementById("engine");

/* =========================
   SCENE
========================= */
const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(75,innerWidth/innerHeight,0.1,1000);
camera.position.set(0,0,7);

/* =========================
   RENDERER
========================= */
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias:true,
  alpha:true
});
renderer.setSize(innerWidth,innerHeight);
renderer.setPixelRatio(devicePixelRatio);

/* =========================
   LIGHT
========================= */
scene.add(new THREE.AmbientLight(0xffffff,1.2));

const light = new THREE.PointLight(0x00ffcc,3);
light.position.set(5,5,5);
scene.add(light);

/* =========================
   🔥 METAL RING BASE
========================= */
const ring = new THREE.Mesh(
  new THREE.TorusGeometry(2.6,0.12,40,200),
  new THREE.MeshStandardMaterial({
    color:0x1a1a1a,
    metalness:1,
    roughness:0.35,
    emissive:0x00ffcc,
    emissiveIntensity:0.15
  })
);
scene.add(ring);

/* =========================
   🔥 SEGMENTS
========================= */
const sections = [
  "LIVE","MUSIC","GAMING","STORE",
  "META","SPORTS","UPLOAD","GALLERY"
];

const ROUTES = [
  "/live.html","/music.html","/gaming.html","/store.html",
  "/meta.html","/sports.html","/upload.html","/gallery.html"
];

const segments = [];
const icons = [];

const radius = 2.6;
const step = (Math.PI*2)/sections.length;

/* SHAPE (wedge) */
function createSegment(){
  const shape = new THREE.Shape();
  shape.moveTo(0,0);
  shape.absarc(0,0,1,0,step,false);

  const geo = new THREE.ExtrudeGeometry(shape,{
    depth:0.25,
    bevelEnabled:false
  });

  const mat = new THREE.MeshStandardMaterial({
    color:0x111111,
    metalness:1,
    roughness:0.3,
    emissive:0x00ffcc,
    emissiveIntensity:0.2
  });

  return new THREE.Mesh(geo,mat);
}

/* ICON (simple glowing sphere placeholder) */
function createIcon(){
  return new THREE.Mesh(
    new THREE.SphereGeometry(0.12,16,16),
    new THREE.MeshStandardMaterial({
      color:0x00ffcc,
      emissive:0x00ffcc,
      emissiveIntensity:1.5
    })
  );
}

/* BUILD */
sections.forEach((name,i)=>{
  const seg = createSegment();
  const icon = createIcon();

  scene.add(seg);
  scene.add(icon);

  segments.push(seg);
  icons.push(icon);
});

/* =========================
   🔥 PORTAL CORE
========================= */
const portal = new THREE.Mesh(
  new THREE.SphereGeometry(0.9,32,32),
  new THREE.MeshStandardMaterial({
    color:0x00ffcc,
    emissive:0x00ffcc,
    emissiveIntensity:2,
    transparent:true,
    opacity:0.9
  })
);
scene.add(portal);

/* =========================
   PARTICLES (PORTAL ENERGY)
========================= */
const starGeo = new THREE.BufferGeometry();
const starCount = 600;

const pos = new Float32Array(starCount*3);

for(let i=0;i<starCount;i++){
  pos[i*3]=(Math.random()-0.5)*10;
  pos[i*3+1]=(Math.random()-0.5)*10;
  pos[i*3+2]=(Math.random()-0.5)*10;
}

starGeo.setAttribute("position", new THREE.BufferAttribute(pos,3));

const starMat = new THREE.PointsMaterial({
  color:0x00ffcc,
  size:0.05
});

const stars = new THREE.Points(starGeo,starMat);
scene.add(stars);

/* =========================
   MOTION
========================= */
let rotation = 0;
let velocity = 0;
let dragging = false;
let active = 0;

function animate(){
  requestAnimationFrame(animate);

  rotation += velocity;

  if(!dragging){
    velocity *= 0.92;

    if(Math.abs(velocity)<0.001){
      velocity = 0;
      rotation = Math.round(rotation/step)*step;

      navigator.vibrate?.(8);
    }
  }

  let best = -Infinity;

  segments.forEach((seg,i)=>{
    const angle = i*step + rotation;

    const x = Math.cos(angle)*radius;
    const z = Math.sin(angle)*radius;

    seg.position.set(x,0,z);
    seg.lookAt(0,0,0);

    const depth = (z + radius)/(radius*2);

    const scale = 1 + depth*0.3;
    seg.scale.set(scale,scale,scale);

    if(z > best){
      best = z;
      active = i;
    }

    seg.material.emissiveIntensity = (i===active)?1.2:0.2;

    /* ICON POSITION */
    icons[i].position.set(
      x*0.6,
      0,
      z*0.6
    );
  });

  /* PORTAL EFFECT */
  portal.scale.setScalar(1 + Math.sin(Date.now()*0.002)*0.05);
  portal.rotation.y += 0.01;

  stars.rotation.y += 0.0008;

  renderer.render(scene,camera);
}
animate();

/* =========================
   TOUCH CONTROL
========================= */
let lastX = 0;

addEventListener("touchstart",e=>{
  dragging = true;
  lastX = e.touches[0].clientX;
});

addEventListener("touchmove",e=>{
  const dx = e.touches[0].clientX - lastX;
  velocity = dx * 0.004;
  lastX = e.touches[0].clientX;
});

addEventListener("touchend",()=>{
  dragging = false;
});

/* =========================
   CLICK NAV
========================= */
addEventListener("click",()=>{
  location.href = ROUTES[active];
});

window.enter = () => {
  location.href = ROUTES[active];
};

/* =========================
   RESIZE
========================= */
addEventListener("resize",()=>{
  camera.aspect = innerWidth/innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth,innerHeight);
});
