import * as THREE from "https://unpkg.com/three@0.158.0/build/three.module.js";

const canvas = document.getElementById("engine");

/* SCENE */
const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(75,innerWidth/innerHeight,0.1,1000);
camera.position.set(0,0,6.5);

/* RENDERER */
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias:true,
  alpha:true
});
renderer.setSize(innerWidth,innerHeight);
renderer.setPixelRatio(devicePixelRatio);

/* LIGHT */
scene.add(new THREE.AmbientLight(0xffffff,1.2));

const light = new THREE.PointLight(0x00ffcc,3);
light.position.set(5,5,5);
scene.add(light);

/* 🔥 RING (REAL STRUCTURE) */
const ring = new THREE.Mesh(
  new THREE.TorusGeometry(2.5,0.06,32,120),
  new THREE.MeshStandardMaterial({
    color:0x003f35,
    emissive:0x00ffcc,
    emissiveIntensity:0.2
  })
);
scene.add(ring);

/* PANELS */
const panels = [];
const count = 8;
const radius = 2.5;
const step = (Math.PI*2)/count;

for(let i=0;i<count;i++){
  const panel = new THREE.Mesh(
    new THREE.BoxGeometry(0.9,0.55,0.2),
    new THREE.MeshStandardMaterial({
      color:0x0a0a0a,
      metalness:1,
      roughness:0.3,
      emissive:0x00ffcc,
      emissiveIntensity:0.2
    })
  );

  scene.add(panel);
  panels.push(panel);
}

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

      /* SNAP */
      rotation = Math.round(rotation/step)*step;
    }
  }

  let best = -Infinity;

  panels.forEach((p,i)=>{
    const angle = i*step + rotation;

    const x = Math.cos(angle)*radius;
    const z = Math.sin(angle)*radius;

    p.position.set(x,0,z);
    p.lookAt(0,0,0);

    const depth = (z + radius)/(radius*2);

    const scale = 0.7 + depth*0.6;
    p.scale.set(scale,scale,scale);

    if(z > best){
      best = z;
      active = i;
    }

    p.material.emissiveIntensity = (i===active) ? 1.5 : 0.2;
  });

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
  velocity = dx * 0.0035;
  lastX = e.touches[0].clientX;
});

addEventListener("touchend",()=>{
  dragging = false;
});

/* RESIZE */
addEventListener("resize",()=>{
  camera.aspect = innerWidth/innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth,innerHeight);
});
