import * as THREE from "https://unpkg.com/three@0.158.0/build/three.module.js";

const ROUTES = [
  "/live.html",
  "/music.html",
  "/gaming.html",
  "/store.html",
  "/meta.html",
  "/sports.html",
  "/upload.html",
  "/gallery.html"
];

const labels = ["LIVE","MUSIC","GAMING","STORE","META","SPORTS","UPLOAD","GALLERY"];

/* ENGINE */
const canvas = document.getElementById("engine");

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(75,innerWidth/innerHeight,0.1,1000);
camera.position.z = 7;

const renderer = new THREE.WebGLRenderer({canvas,antialias:true});
renderer.setSize(innerWidth,innerHeight);

/* LIGHT */
scene.add(new THREE.AmbientLight(0xffffff,1.2));

const light = new THREE.PointLight(0x00ffcc,3);
light.position.set(5,5,5);
scene.add(light);

/* CORE */
const core = new THREE.Mesh(
  new THREE.SphereGeometry(0.7,32,32),
  new THREE.MeshStandardMaterial({
    color:0x00ffcc,
    emissive:0x00ffcc,
    emissiveIntensity:2
  })
);
scene.add(core);

/* RING */
const panels = [];
const radius = 2.2;
const step = (Math.PI*2)/labels.length;

function createPanel(label){
  const geo = new THREE.BoxGeometry(1,0.6,0.2);

  const mat = new THREE.MeshStandardMaterial({
    color:0x111111,
    metalness:1,
    roughness:.3,
    emissive:0x00ffcc,
    emissiveIntensity:.2
  });

  const mesh = new THREE.Mesh(geo,mat);

  return mesh;
}

labels.forEach((l,i)=>{
  const p = createPanel(l);
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
      velocity=0;
      rotation=Math.round(rotation/step)*step;
      navigator.vibrate?.(10);
    }
  }

  let best=-Infinity;

  panels.forEach((p,i)=>{
    const angle=i*step+rotation;

    const x=Math.cos(angle)*radius;
    const y=Math.sin(angle)*radius*0.4;
    const z=Math.sin(angle)*radius;

    p.position.set(x,y,z);
    p.lookAt(0,0,0);

    const depth=(z+radius)/(radius*2);

    p.scale.setScalar(0.8+depth*0.4);

    if(z>best){
      best=z;
      active=i;
    }

    p.material.emissiveIntensity=(i===active)?1.5:0.2;
  });

  core.rotation.y += 0.01;

  renderer.render(scene,camera);
}
animate();

/* TOUCH */
let lastX=0;

addEventListener("touchstart",e=>{
  dragging=true;
  lastX=e.touches[0].clientX;
});

addEventListener("touchmove",e=>{
  const dx=e.touches[0].clientX-lastX;
  velocity=dx*0.003;
  lastX=e.touches[0].clientX;
});

addEventListener("touchend",()=>dragging=false);

/* NAV */
window.enter=()=>{
  location.href = ROUTES[active];
};

/* RESIZE */
addEventListener("resize",()=>{
  camera.aspect=innerWidth/innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth,innerHeight);
});
