export function startEngine(){

  console.log("ENGINE STARTED");

  const app = document.getElementById("app");

  if(!app){
    console.error("NO #app FOUND");
    return;
  }

  const text = document.createElement("div");

  text.innerText = "RICH BIZNESS LOADING...";
  text.style.color = "#00ffcc";
  text.style.fontSize = "24px";
  text.style.position = "absolute";
  text.style.top = "50%";
  text.style.left = "50%";
  text.style.transform = "translate(-50%, -50%)";

  app.appendChild(text);
}
