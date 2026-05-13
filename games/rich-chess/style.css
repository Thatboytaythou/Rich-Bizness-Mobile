*{
  margin:0;
  padding:0;
  box-sizing:border-box;
  -webkit-tap-highlight-color:transparent;
}

html,
body{
  width:100%;
  min-height:100%;
  background:#020402;
  color:#fff;
  font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display",Arial,sans-serif;
  overflow-x:hidden;
}

body{
  background:
    radial-gradient(circle at 50% 8%,rgba(157,255,103,.20),transparent 30%),
    radial-gradient(circle at 16% 48%,rgba(0,255,190,.09),transparent 28%),
    radial-gradient(circle at 84% 72%,rgba(255,229,138,.12),transparent 30%),
    linear-gradient(145deg,#020402,#050905 46%,#000);
}

body::before{
  content:"";
  position:fixed;
  inset:0;
  z-index:0;
  pointer-events:none;
  background:
    linear-gradient(135deg,rgba(120,255,75,.08),transparent 30%,rgba(255,220,120,.04)),
    repeating-linear-gradient(135deg,rgba(255,255,255,.018) 0 1px,transparent 1px 9px),
    radial-gradient(circle at center,transparent 36%,rgba(0,0,0,.9) 100%);
}

body::after{
  content:"";
  position:fixed;
  inset:0;
  z-index:0;
  pointer-events:none;
  opacity:.38;
  background:
    radial-gradient(circle at 50% 35%,rgba(157,255,103,.08),transparent 36%),
    linear-gradient(to bottom,rgba(255,255,255,.035),transparent 12%,transparent 88%,rgba(0,0,0,.55));
}

.chess-page{
  position:relative;
  z-index:1;
  width:min(980px,100%);
  margin:0 auto;
  padding:calc(18px + env(safe-area-inset-top)) 16px calc(36px + env(safe-area-inset-bottom));
}

.topbar{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:14px;
  margin-bottom:18px;
}

.brand{
  display:flex;
  flex-direction:column;
  line-height:.9;
  text-align:center;
  font-family:Georgia,"Times New Roman",serif;
}

.brand strong{
  font-size:32px;
  letter-spacing:.05em;
  background:linear-gradient(to bottom,#fff8c7,#baff79 45%,#4c7618);
  -webkit-background-clip:text;
  -webkit-text-fill-color:transparent;
  filter:drop-shadow(0 0 16px rgba(129,255,82,.55));
}

.brand small{
  color:#ffe58a;
  letter-spacing:.22em;
  margin-top:6px;
  font-size:11px;
}

.circle-btn{
  width:48px;
  height:48px;
  border-radius:50%;
  border:1px solid rgba(255,219,123,.55);
  background:
    linear-gradient(145deg,rgba(44,44,44,.9),rgba(0,0,0,.74)),
    radial-gradient(circle at 30% 20%,rgba(255,255,255,.12),transparent 36%);
  color:#ffe58a;
  font-size:21px;
  display:grid;
  place-items:center;
  box-shadow:
    0 0 18px rgba(120,255,80,.18),
    inset 0 0 14px rgba(255,255,255,.07);
  text-decoration:none;
}

.hero,
.arena,
.panel{
  border:1px solid rgba(255,219,123,.32);
  background:
    linear-gradient(145deg,rgba(0,0,0,.82),rgba(10,18,10,.76)),
    radial-gradient(circle at top,rgba(132,255,80,.16),transparent 58%);
  box-shadow:
    0 0 42px rgba(0,0,0,.84),
    0 0 30px rgba(128,255,80,.12),
    inset 0 0 22px rgba(255,255,255,.025);
}

.hero{
  border-radius:32px;
  padding:20px;
  margin-bottom:16px;
  overflow:hidden;
  position:relative;
}

.hero::after{
  content:"♛";
  position:absolute;
  right:18px;
  top:10px;
  color:rgba(255,229,138,.08);
  font-size:128px;
  line-height:1;
  filter:drop-shadow(0 0 22px rgba(157,255,103,.16));
}

.kicker{
  color:#9dff67;
  font-size:12px;
  font-weight:950;
  letter-spacing:.18em;
  margin-bottom:8px;
}

.hero h1{
  font-size:36px;
  line-height:.96;
  font-family:Georgia,"Times New Roman",serif;
  background:linear-gradient(to bottom,#fff8c7,#aaff6d 45%,#547d19);
  -webkit-background-clip:text;
  -webkit-text-fill-color:transparent;
}

.hero p{
  color:#dfffd2;
  margin-top:10px;
  font-size:14px;
  line-height:1.45;
  max-width:720px;
}

.stats-grid{
  display:grid;
  grid-template-columns:repeat(4,1fr);
  gap:10px;
  margin-bottom:16px;
}

.stat{
  min-height:82px;
  border-radius:22px;
  border:1px solid rgba(151,255,97,.2);
  background:
    linear-gradient(145deg,rgba(255,255,255,.045),rgba(0,0,0,.58)),
    radial-gradient(circle at top,rgba(157,255,103,.08),transparent 55%);
  display:flex;
  flex-direction:column;
  align-items:center;
  justify-content:center;
  text-align:center;
  padding:10px;
  box-shadow:
    0 0 28px rgba(0,0,0,.74),
    inset 0 0 18px rgba(255,255,255,.025);
}

.stat small{
  color:#9dff67;
  font-size:10px;
  letter-spacing:.14em;
  font-weight:900;
}

.stat strong{
  margin-top:6px;
  font-size:17px;
}

.arena{
  border-radius:34px;
  padding:14px;
  margin-bottom:16px;
}

.player-card{
  display:flex;
  align-items:center;
  gap:12px;
  padding:12px;
  border-radius:24px;
  border:1px solid rgba(151,255,97,.2);
  background:
    linear-gradient(145deg,rgba(255,255,255,.055),rgba(0,0,0,.48)),
    radial-gradient(circle at left,rgba(157,255,103,.10),transparent 50%);
  margin-bottom:12px;
  box-shadow:inset 0 0 16px rgba(255,255,255,.02);
}

.bottom-player{
  margin-top:12px;
  margin-bottom:0;
}

.avatar{
  width:46px;
  height:46px;
  border-radius:50%;
  display:grid;
  place-items:center;
  color:#081008;
  font-weight:950;
  background:linear-gradient(to bottom,#e6ffc7,#9dff67 50%,#4c7618);
  box-shadow:
    0 0 22px rgba(128,255,80,.28),
    inset 0 4px 10px rgba(255,255,255,.35),
    inset 0 -8px 12px rgba(0,0,0,.25);
}

.player-card strong{
  display:block;
  font-size:16px;
}

.player-card small{
  display:block;
  color:#9dff67;
  margin-top:3px;
  font-weight:950;
  letter-spacing:.1em;
}

.board-wrap{
  position:relative;
  width:min(92vw,560px);
  margin:0 auto;
  aspect-ratio:1/1;
  perspective:900px;
}

.board-glow{
  position:absolute;
  inset:-20px;
  border-radius:38px;
  background:
    radial-gradient(circle,rgba(157,255,103,.24),transparent 64%),
    radial-gradient(circle at 50% 100%,rgba(255,229,138,.16),transparent 58%);
  filter:blur(12px);
}

.chess-board{
  position:relative;
  z-index:2;
  width:100%;
  height:100%;
  display:grid;
  grid-template-columns:repeat(8,1fr);
  grid-template-rows:repeat(8,1fr);
  border-radius:30px;
  overflow:hidden;
  border:2px solid rgba(255,229,138,.52);
  background:#111;
  box-shadow:
    0 28px 60px rgba(0,0,0,.88),
    0 0 40px rgba(128,255,80,.22),
    inset 0 0 22px rgba(255,255,255,.08);
  transform:rotateX(2deg);
}

.chess-board::before{
  content:"";
  position:absolute;
  inset:0;
  z-index:4;
  pointer-events:none;
  background:
    linear-gradient(135deg,rgba(255,255,255,.22),transparent 18%,transparent 72%,rgba(0,0,0,.28)),
    radial-gradient(circle at 50% 15%,rgba(255,255,255,.16),transparent 34%);
  mix-blend-mode:soft-light;
}

.square{
  position:relative;
  display:grid;
  place-items:center;
  user-select:none;
  cursor:pointer;
  overflow:hidden;
}

.square::before{
  content:"";
  position:absolute;
  inset:0;
  background:
    linear-gradient(145deg,rgba(255,255,255,.20),transparent 42%,rgba(0,0,0,.22)),
    radial-gradient(circle at 30% 24%,rgba(255,255,255,.12),transparent 36%);
  pointer-events:none;
}

.square.light{
  background:
    linear-gradient(145deg,#efffd8 0%,#aaff73 48%,#70b43e 100%);
  color:#061006;
}

.square.dark{
  background:
    linear-gradient(145deg,#1d4213 0%,#071107 52%,#000 100%);
  color:#ffe58a;
}

.square.selected{
  outline:4px solid rgba(255,229,138,.98);
  outline-offset:-4px;
  box-shadow:
    inset 0 0 28px rgba(255,229,138,.52),
    inset 0 0 10px rgba(255,255,255,.22);
}

.square.legal::after{
  content:"";
  position:absolute;
  z-index:5;
  width:24%;
  height:24%;
  border-radius:50%;
  background:rgba(255,229,138,.9);
  box-shadow:
    0 0 18px rgba(255,229,138,.7),
    inset 0 0 8px rgba(0,0,0,.2);
}

.square.capture::after{
  content:"";
  position:absolute;
  z-index:5;
  inset:10%;
  border-radius:50%;
  border:3px solid rgba(255,229,138,.92);
  box-shadow:
    0 0 20px rgba(255,229,138,.55),
    inset 0 0 16px rgba(255,229,138,.22);
}

.piece{
  position:relative;
  z-index:6;
  width:78%;
  height:78%;
  display:grid;
  place-items:center;
  font-size:clamp(30px,7.4vw,58px);
  line-height:1;
  transform:translateY(-4px) scale(1);
  transition:transform .18s ease, filter .18s ease;
  filter:
    drop-shadow(0 10px 8px rgba(0,0,0,.58))
    drop-shadow(0 0 10px rgba(255,229,138,.18));
  text-shadow:
    0 1px 0 rgba(255,255,255,.45),
    0 3px 0 rgba(0,0,0,.30),
    0 10px 14px rgba(0,0,0,.55);
}

.piece::before{
  content:"";
  position:absolute;
  z-index:-1;
  width:72%;
  height:18%;
  left:14%;
  bottom:2%;
  border-radius:50%;
  background:rgba(0,0,0,.34);
  filter:blur(5px);
}

.square:hover .piece,
.square.selected .piece{
  transform:translateY(-8px) scale(1.08);
  filter:
    drop-shadow(0 14px 10px rgba(0,0,0,.62))
    drop-shadow(0 0 16px rgba(255,229,138,.34));
}

.piece.white{
  color:#f2ffd9;
  text-shadow:
    0 1px 0 #fff,
    0 3px 0 #78a852,
    0 8px 12px rgba(0,0,0,.6),
    0 0 16px rgba(157,255,103,.22);
}

.piece.black{
  color:#111;
  text-shadow:
    0 1px 0 rgba(255,255,255,.18),
    0 3px 0 rgba(0,0,0,.75),
    0 8px 12px rgba(0,0,0,.72),
    0 0 14px rgba(255,229,138,.18);
}

.piece.gold{
  color:#ffe58a;
  text-shadow:
    0 1px 0 #fff6c8,
    0 3px 0 #80610d,
    0 8px 14px rgba(0,0,0,.68),
    0 0 16px rgba(255,229,138,.28);
}

.piece.moving{
  animation:piecePop .28s ease both;
}

@keyframes piecePop{
  0%{transform:translateY(-14px) scale(.92);opacity:.55}
  100%{transform:translateY(-4px) scale(1);opacity:1}
}

.controls{
  display:grid;
  grid-template-columns:repeat(4,1fr);
  gap:10px;
  margin-bottom:16px;
}

.main-btn,
.ghost-btn,
.danger-btn{
  border:none;
  outline:none;
  border-radius:18px;
  min-height:48px;
  font-weight:950;
  letter-spacing:.1em;
}

.main-btn{
  color:#081008;
  background:linear-gradient(to bottom,#e6ffc7,#9dff67 50%,#4c7618);
  box-shadow:
    0 0 26px rgba(128,255,80,.36),
    inset 0 4px 8px rgba(255,255,255,.35),
    inset 0 -8px 12px rgba(0,0,0,.22);
}

.ghost-btn{
  color:#dfffd2;
  background:rgba(255,255,255,.045);
  border:1px solid rgba(151,255,97,.22);
  box-shadow:inset 0 0 14px rgba(255,255,255,.025);
}

.danger-btn{
  color:#ffe8a0;
  background:rgba(0,0,0,.58);
  border:1px solid rgba(255,219,123,.38);
}

.grid{
  display:grid;
  grid-template-columns:1fr 1fr;
  gap:14px;
}

.panel{
  border-radius:30px;
  padding:16px;
}

.panel h2{
  color:#9dff67;
  font-size:13px;
  letter-spacing:.16em;
  margin-bottom:12px;
}

.field{
  display:flex;
  flex-direction:column;
  gap:6px;
  margin-bottom:10px;
}

.field label{
  color:#9dff67;
  font-size:11px;
  letter-spacing:.12em;
  font-weight:900;
}

input,
select{
  width:100%;
  border:none;
  outline:none;
  color:#fff;
  border-radius:16px;
  padding:13px;
  background:rgba(255,255,255,.045);
  border:1px solid rgba(255,255,255,.07);
  font-size:15px;
}

.full{
  width:100%;
}

.move-list{
  max-height:220px;
  overflow:auto;
  display:flex;
  flex-direction:column;
  gap:8px;
}

.move-item{
  display:flex;
  justify-content:space-between;
  gap:10px;
  padding:10px;
  border-radius:16px;
  background:rgba(255,255,255,.045);
  border:1px solid rgba(255,255,255,.05);
  color:#dfffd2;
  font-size:13px;
}

.captured{
  display:grid;
  gap:14px;
}

.captured small{
  color:#9dff67;
  letter-spacing:.12em;
  font-size:10px;
  font-weight:900;
}

.piece-row{
  min-height:38px;
  margin-top:8px;
  padding:8px;
  border-radius:16px;
  background:rgba(255,255,255,.04);
  border:1px solid rgba(255,255,255,.05);
  font-size:24px;
}

.empty{
  color:#dfffd2;
  padding:18px;
  border:1px dashed rgba(151,255,97,.24);
  border-radius:20px;
  text-align:center;
  background:rgba(0,0,0,.28);
}

.status{
  margin-top:14px;
  color:#9dff67;
  font-size:12px;
  letter-spacing:.12em;
  font-weight:850;
  min-height:18px;
}

@media(max-width:720px){
  .brand strong{font-size:26px}
  .hero h1{font-size:31px}
  .stats-grid{grid-template-columns:repeat(2,1fr)}
  .controls{grid-template-columns:1fr 1fr}
  .grid{grid-template-columns:1fr}
  .arena{padding:12px}
  .board-wrap{width:100%}
  .chess-board{border-radius:26px}
}

@media(max-width:420px){
  .piece{
    font-size:clamp(28px,8vw,46px);
  }

  .circle-btn{
    width:44px;
    height:44px;
  }
}
