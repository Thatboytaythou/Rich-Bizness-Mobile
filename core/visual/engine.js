const app = document.getElementById("app");

export function startEngine(){

  const wheel = document.createElement("div");
  wheel.className = "wheel";

  wheel.innerHTML = `
    <div class="center">ENTER</div>

    <div class="node" data-page="live">LIVE</div>
    <div class="node" data-page="music">MUSIC</div>
    <div class="node" data-page="gaming">GAMING</div>
    <div class="node" data-page="store">STORE</div>
    <div class="node" data-page="sports">SPORTS</div>
    <div class="node" data-page="upload">UPLOAD</div>
  `;

  app.appendChild(wheel);

  rotateWheel(wheel);
}

function rotateWheel(wheel){
  let angle = 0;

  setInterval(()=>{
    angle += 0.3;
    wheel.style.transform = `translate(-50%,-50%) rotate(${angle}deg)`;
  },16);
}
