import * as THREE from "https://unpkg.com/three@0.158.0/build/three.module.js";

const labels = ["LIVE","MUSIC","GAMING","STORE","META","SPORTS","UPLOAD","GALLERY"];
const ROUTES = [
  "/live.html","/music.html","/gaming.html","/store.html",
  "/meta.html","/sports.html","/upload.html","/gallery.html"
];

/* SCENE */
const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(75,innerWidth/innerHeight,0.1,1000);
camera.position.set(0,0,6.5);

const renderer = new THREE.WebGLRenderer({antialias:true});
renderer.setSize(innerWidth,innerHeight);
renderer.setPixelRatio(devicePixelRatio);
document.body.appendChild(renderer.domElement);

/* LIGHTING */
scene.add(new THREE.AmbientLight(0xffffff,1.2));

const light = new THREE.PointLight(0x00ffcc,3);
light.position.set(5,5,5);
scene.add(light);

/* CORE */
const core = new THREE.Mesh(
  new THREE.SphereGeometry(0.6,32,32),
  new THREE.MeshStandardMaterial({
    color:0x00ffcc,
    emissive:0x00ffcc,
    emissiveIntensity:2
  })
);
scene.add(core);

/* 🔥 METAL RING (THIS FIXES THE FLOATING LOOK) */
const ring = new THREE.Mesh(
  new THREE.TorusGeometry(2.4,0.08,32,100),
  new THREE.MeshStandardMaterial({
    color:0x222222,
    metalness:1,
    roughness:.3,
    emissive:0x00ffcc,
    emissiveIntensity:.15
  })
);
scene.add(ring);

/* PANELS */
const panels = [];
const radius = 2.4;
const step = (Math.PI*2)/labels.length;

function createPanel(){
  return new THREE.Mesh(
    new THREE.BoxGeometry(0.9,0.55,0.15),
    new THREE.MeshStandardMaterial({
      color:0x111111,
      metalness:1,
      roughness:.35,
      emissive:0x00ffcc,
      emissiveIntensity:.2
    })
  );
}

labels.forEach((l,i)=>{
  const p = createPanel();
  scene.add(p);
  panels.push(p);
});

/* MOTION */
let rotation = 0;
let velocity = 0;
let dragging = false;
let active = 0;

function animate(){
  requestAnimationFrame(animate);

  rotation += velocity;

  if(!dragging){
    velocity *= 0.9;

    if(Math.abs(velocity)<0.001){
      velocity = 0;

      /* 🔥 SNAP PERFECT */
      const target = Math.round(rotation/step)*step;
      rotation = target;

      navigator.vibrate?.(8);
    }
  }

  let bestZ = -Infinity;

  panels.forEach((p,i)=>{
    const angle = i*step + rotation;

    /* 🔥 TRUE CIRCLE */
    const x = Math.cos(angle)*radius;
    const z = Math.sin(angle)*radius;

    p.position.set(x, 0, z);

    /* 🔥 FACE CENTER */
    p.lookAt(0,0,0);

    /* 🔥 DEPTH SCALE */
    const depth = (z + radius) / (radius * 2);

    const scale = 0.7 + depth * 0.6;
    p.scale.set(scale,scale,scale);

    /* 🔥 ACTIVE DETECTION */
    if(z > bestZ){
      bestZ = z;
      active = i;
    }

    /* 🔥 GLOW */
    p.material.emissiveIntensity = (i === active) ? 1.6 : 0.2;
  });

  core.rotation.y += 0.015;
  ring.rotation.z += 0.002;

  renderer.render(scene,camera);
}
animate();

/* TOUCH */
let lastX = 0;

addEventListener("touchstart",e=>{
  dragging = true;
  lastX = e.touches[0].clientX;
});

addEventListener("touchmove",e=>{
  const dx = e.touches[0].clientX - lastX;
  velocity = dx * 0.0035; // 🔥 tighter control
  lastX = e.touches[0].clientX;
});

addEventListener("touchend",()=>{
  dragging = false;
});

/* CLICK */
addEventListener("click",()=>{
  location.href = ROUTES[active];
});

/* ENTER BUTTON */
window.enter = () => {
  location.href = ROUTES[active];
};

/* RESIZE */
addEventListener("resize",()=>{
  camera.aspect = innerWidth/innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth,innerHeight);
});
