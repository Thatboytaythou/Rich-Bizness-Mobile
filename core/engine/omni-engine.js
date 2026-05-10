import * as THREE from "https://unpkg.com/three@0.158.0/build/three.module.js";

/* =========================
   RICH BIZNESS OMNI ENGINE
   FINAL WORLD MODE
========================= */

const canvas = document.getElementById("engine");

/* =========================
   SCENE
========================= */
const scene = new THREE.Scene();

scene.fog = new THREE.FogExp2(0x020402, 0.08);

/* =========================
   CAMERA
========================= */
const camera = new THREE.PerspectiveCamera(
  48,
  window.innerWidth / window.innerHeight,
  0.1,
  200
);

camera.position.set(0, 1.2, 10);

/* =========================
   RENDERER
========================= */
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: false,
  powerPreference: "high-performance"
});

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

renderer.outputColorSpace = THREE.SRGBColorSpace;

renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.18;

/* =========================
   CLOCK
========================= */
const clock = new THREE.Clock();

/* =========================
   LIGHTING
========================= */
scene.add(
  new THREE.AmbientLight(0xffffff, 0.8)
);

const topLight = new THREE.PointLight(0x91ff66, 14, 100);
topLight.position.set(0, 8, 10);
scene.add(topLight);

const leftLight = new THREE.PointLight(0x00ffcc, 8, 60);
leftLight.position.set(-10, 2, 8);
scene.add(leftLight);

const rightLight = new THREE.PointLight(0xffd56e, 6, 60);
rightLight.position.set(10, 2, 8);
scene.add(rightLight);

/* =========================
   STAR FIELD
========================= */
const starsGeo = new THREE.BufferGeometry();

const starCount = 2200;
const starPositions = [];

for(let i = 0; i < starCount; i++){

  starPositions.push(
    (Math.random() - .5) * 180,
    (Math.random() - .5) * 180,
    (Math.random() - .5) * 180
  );
}

starsGeo.setAttribute(
  "position",
  new THREE.Float32BufferAttribute(starPositions, 3)
);

const stars = new THREE.Points(
  starsGeo,
  new THREE.PointsMaterial({
    color:0x91ff66,
    size:0.08,
    transparent:true,
    opacity:.75
  })
);

scene.add(stars);

/* =========================
   FLOOR
========================= */
const floor = new THREE.Mesh(
  new THREE.CircleGeometry(26, 120),
  new THREE.MeshStandardMaterial({
    color:0x030303,
    metalness:1,
    roughness:.25,
    emissive:0x0b1b0a,
    emissiveIntensity:.3
  })
);

floor.rotation.x = -Math.PI / 2;
floor.position.y = -3.2;

scene.add(floor);

/* =========================
   MAIN OMNI GROUP
========================= */
const omni = new THREE.Group();

omni.rotation.x = -0.48;

scene.add(omni);

/* =========================
   ROTATING ROOT
========================= */
const wheelRoot = new THREE.Group();
omni.add(wheelRoot);

/* =========================
   BACK DISC
========================= */
const backDisc = new THREE.Mesh(
  new THREE.CylinderGeometry(4.4,4.4,.7,100),
  new THREE.MeshStandardMaterial({
    color:0x090909,
    metalness:1,
    roughness:.28,
    emissive:0x081108,
    emissiveIntensity:.3
  })
);

backDisc.rotation.x = Math.PI / 2;

wheelRoot.add(backDisc);

/* =========================
   OUTER RINGS
========================= */
function buildRing(radius, tube, color, glow){

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(radius, tube, 40, 240),
    new THREE.MeshStandardMaterial({
      color,
      metalness:1,
      roughness:.22,
      emissive:glow,
      emissiveIntensity:.35
    })
  );

  ring.rotation.x = Math.PI / 2;

  return ring;
}

const outerRing = buildRing(
  4.6,
  .22,
  0x171717,
  0x7dff54
);

wheelRoot.add(outerRing);

const innerRing = buildRing(
  3.2,
  .12,
  0x151515,
  0x00ffcc
);

wheelRoot.add(innerRing);

/* =========================
   GLOW RINGS
========================= */
const glowRing = new THREE.Mesh(
  new THREE.TorusGeometry(2.15,.05,16,200),
  new THREE.MeshBasicMaterial({
    color:0x97ff68
  })
);

glowRing.rotation.x = Math.PI / 2;

wheelRoot.add(glowRing);

/* =========================
   PORTAL
========================= */
const portalGroup = new THREE.Group();

scene.add(portalGroup);

const portal = new THREE.Mesh(
  new THREE.SphereGeometry(1.3,64,64),
  new THREE.MeshStandardMaterial({
    color:0x77ff44,
    emissive:0x7dff4d,
    emissiveIntensity:3,
    transparent:true,
    opacity:.92,
    metalness:.2,
    roughness:.1
  })
);

portalGroup.add(portal);

const portalShell = new THREE.Mesh(
  new THREE.SphereGeometry(1.58,64,64),
  new THREE.MeshBasicMaterial({
    color:0x00ffcc,
    transparent:true,
    opacity:.08
  })
);

portalGroup.add(portalShell);

/* =========================
   INNER ENERGY
========================= */
const energyGeo = new THREE.BufferGeometry();

const energyPositions = [];

for(let i = 0; i < 1400; i++){

  const radius = Math.random() * 1.4;

  const theta = Math.random() * Math.PI * 2;
  const phi = Math.random() * Math.PI;

  energyPositions.push(
    radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.sin(phi) * Math.sin(theta),
    radius * Math.cos(phi)
  );
}

energyGeo.setAttribute(
  "position",
  new THREE.Float32BufferAttribute(energyPositions, 3)
);

const energy = new THREE.Points(
  energyGeo,
  new THREE.PointsMaterial({
    color:0xb4ff7e,
    size:.03,
    transparent:true,
    opacity:.85
  })
);

portalGroup.add(energy);

/* =========================
   SEGMENTS
========================= */
const segments = [];

const labels = [
  "gallery",
  "live",
  "music",
  "gaming",
  "store",
  "meta",
  "sports",
  "upload"
];

const total = 8;

const step = (Math.PI * 2) / total;

for(let i = 0; i < total; i++){

  const shape = new THREE.Shape();

  const innerRadius = 1.9;
  const outerRadius = 4.05;

  const start = i * step - step * .44;
  const end = i * step + step * .44;

  shape.moveTo(
    Math.cos(start) * innerRadius,
    Math.sin(start) * innerRadius
  );

  shape.absarc(
    0,
    0,
    innerRadius,
    start,
    end,
    false
  );

  shape.lineTo(
    Math.cos(end) * outerRadius,
    Math.sin(end) * outerRadius
  );

  shape.absarc(
    0,
    0,
    outerRadius,
    end,
    start,
    true
  );

  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape,{
    depth:.55,
    bevelEnabled:true,
    bevelSegments:4,
    steps:2,
    bevelSize:.04,
    bevelThickness:.05
  });

  const mat = new THREE.MeshStandardMaterial({
    color:0x111111,
    metalness:1,
    roughness:.24,
    emissive:0x1f3818,
    emissiveIntensity:.35
  });

  const mesh = new THREE.Mesh(geo,mat);

  mesh.rotation.x = Math.PI / 2;

  mesh.userData.index = i;
  mesh.userData.name = labels[i];

  wheelRoot.add(mesh);

  segments.push(mesh);

  /* EDGE LIGHT */

  const edge = new THREE.Mesh(
    new THREE.TorusGeometry(
      3.7,
      .02,
      8,
      120,
      step * .84
    ),
    new THREE.MeshBasicMaterial({
      color:0x88ff5e
    })
  );

  edge.rotation.x = Math.PI / 2;
  edge.rotation.z = i * step;

  wheelRoot.add(edge);
}

/* =========================
   BOLTS
========================= */
for(let i = 0; i < 16; i++){

  const angle = (Math.PI * 2 / 16) * i;

  const bolt = new THREE.Mesh(
    new THREE.CylinderGeometry(.12,.12,.22,18),
    new THREE.MeshStandardMaterial({
      color:0x999999,
      metalness:1,
      roughness:.25
    })
  );

  bolt.rotation.x = Math.PI / 2;

  bolt.position.set(
    Math.cos(angle) * 4.45,
    Math.sin(angle) * 4.45,
    .12
  );

  wheelRoot.add(bolt);
}

/* =========================
   ROTATION SYSTEM
========================= */
let velocity = 0;
let rotation = 0;

let dragging = false;

let pointerStartX = 0;

let targetTiltX = -.48;
let targetTiltY = 0;

let smoothTiltX = -.48;
let smoothTiltY = 0;

/* =========================
   POINTER MOVE
========================= */
window.addEventListener("pointermove",(e)=>{

  const x = (e.clientX / window.innerWidth) - .5;
  const y = (e.clientY / window.innerHeight) - .5;

  targetTiltY = x * .22;
  targetTiltX = -.48 + y * .12;
});

/* =========================
   DRAG
========================= */
window.addEventListener("pointerdown",(e)=>{

  dragging = true;

  pointerStartX = e.clientX;
});

window.addEventListener("pointermove",(e)=>{

  if(!dragging) return;

  const delta = e.clientX - pointerStartX;

  velocity = delta * .0008;

  pointerStartX = e.clientX;
});

window.addEventListener("pointerup",()=>{

  dragging = false;
});

window.addEventListener("pointercancel",()=>{

  dragging = false;
});

/* =========================
   CLICK / ROUTING
========================= */
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

window.addEventListener("click",(e)=>{

  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse,camera);

  const hits = raycaster.intersectObjects(segments);

  if(!hits.length) return;

  const name = hits[0].object.userData.name;

  triggerSegment(name);
});

/* =========================
   ROUTES
========================= */
function triggerSegment(name){

  const routes = {
    gallery:"/gallery.html",
    live:"/live.html",
    music:"/music.html",
    gaming:"/gaming.html",
    store:"/store.html",
    meta:"/metaverse.html",
    sports:"/sports.html",
    upload:"/upload.html"
  };

  const target = routes[name];

  if(target){
    window.location.href = target;
  }
}

/* =========================
   MENU
========================= */
const menuBtn = document.getElementById("menuBtn");
const quickMenu = document.getElementById("quickMenu");

menuBtn?.addEventListener("click",()=>{

  quickMenu?.classList.toggle("open");
});

/* =========================
   ACTIVATE
========================= */
window.enter = function(){

  const active = getActiveSegment();

  if(!active) return;

  triggerSegment(active.userData.name);
};

/* =========================
   ACTIVE SEGMENT
========================= */
function getActiveSegment(){

  let best = -Infinity;
  let active = null;

  segments.forEach((segment)=>{

    const position = new THREE.Vector3();

    segment.getWorldPosition(position);

    if(position.z > best){

      best = position.z;

      active = segment;
    }
  });

  return active;
}

/* =========================
   ANIMATE
========================= */
function animate(){

  requestAnimationFrame(animate);

  const elapsed = clock.getElapsedTime();

  /* SMOOTH TILT */

  smoothTiltX += (targetTiltX - smoothTiltX) * .06;
  smoothTiltY += (targetTiltY - smoothTiltY) * .06;

  omni.rotation.x = smoothTiltX;
  omni.rotation.y = smoothTiltY;

  /* ROTATION */

  rotation += velocity;

  if(!dragging){

    velocity *= .93;

    if(Math.abs(velocity) < .00008){

      velocity = 0;

      rotation =
        THREE.MathUtils.lerp(
          rotation,
          Math.round(rotation / step) * step,
          .08
        );
    }
  }

  wheelRoot.rotation.z = rotation;

  /* PORTAL */

  const pulse = 1 + Math.sin(elapsed * 2.4) * .05;

  portal.scale.setScalar(pulse);

  portal.material.emissiveIntensity =
    2.6 + Math.sin(elapsed * 3) * .6;

  portalShell.rotation.y += .004;

  energy.rotation.y += .008;
  energy.rotation.x += .003;

  /* STAR FIELD */

  stars.rotation.y += .0003;

  /* SEGMENT LIGHTING */

  segments.forEach((segment)=>{

    const pos = new THREE.Vector3();

    segment.getWorldPosition(pos);

    const depth = (pos.z + 5) / 10;

    segment.material.emissiveIntensity =
      .2 + depth * 1.2;

    segment.position.z =
      Math.max(depth * .18, 0);
  });

  /* FLOAT */

  wheelRoot.position.y =
    Math.sin(elapsed * 1.4) * .08;

  portalGroup.position.y =
    Math.sin(elapsed * 2) * .12;

  renderer.render(scene,camera);
}

animate();

/* =========================
   RESIZE
========================= */
window.addEventListener("resize",()=>{

  camera.aspect =
    window.innerWidth / window.innerHeight;

  camera.updateProjectionMatrix();

  renderer.setSize(
    window.innerWidth,
    window.innerHeight
  );
});
