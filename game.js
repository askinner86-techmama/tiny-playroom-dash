(() => {
  const W = 1280, H = 720, GROUND = 598;
  const KEYS = { scores: "tpd_scores_v1", best: "tpd_best_v1", char: "tpd_char_v1" };
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const $ = (id) => document.getElementById(id);
  const ui = {
    menu: $("screenMenu"), scores: $("screenScores"), pause: $("screenPause"),
    over: $("screenOver"), hud: $("hud"), touch: $("touchLayer"),
    score: $("hudScore"), overScore: $("overScore"), overMsg: $("overMsg"),
    initialsBox: $("initialsBox"), scoreList: $("scoreList")
  };
  const store = {
    get(k, d) { try { return localStorage.getItem(k) ?? d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch {}
    }
  };
  const state = {
    mode: "menu", char: store.get(KEYS.char, "boy"), t: 0, last: 0, dist: 0,
    score: 0, bonus: 0, best: +store.get(KEYS.best, "0") || 0, speed: 320,
    player: null, items: [], parts: [], spawnX: 0, shake: 0,
    initials: ["A","A","A"], initI: 0, pending: 0, floor: null, wall: null
  };
  function beep(f, d, type) {
    try {
      const a = beep.ac || (beep.ac = new (window.AudioContext || window.webkitAudioContext)());
      if (a.state === "suspended") a.resume();
      const o = a.createOscillator(), g = a.createGain();
      o.type = type || "square"; o.frequency.value = f; g.gain.value = 0.04;
      g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + d);
      o.connect(g).connect(a.destination); o.start(); o.stop(a.currentTime + d);
    } catch {}
  }
  function scores() {
    try { const r = JSON.parse(store.get(KEYS.scores, "[]")); return Array.isArray(r) ? r.slice(0,10) : []; }
    catch { return []; }
  }
  function rr(x,y,w,h,r) {
    ctx.beginPath(); ctx.moveTo(x+r,y);
    ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r);
    ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath();
  }
  function drawKid(who,x,y,w,h) {
    const boy = who !== "girl";
    ctx.save(); ctx.translate(x,y);
    ctx.fillStyle = boy ? "#c47a3a" : "#e8c37a"; rr(w*0.28,h*0.02,w*0.46,h*0.22,12); ctx.fill();
    ctx.fillStyle = "#f3c7a0"; ctx.beginPath(); ctx.arc(w*0.5,h*0.20,w*0.20,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = boy ? "#5b3518" : "#6aa84f";
    ctx.beginPath(); ctx.arc(w*0.42,h*0.19,4,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(w*0.58,h*0.19,4,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = boy ? "#e06b55" : "#5aa6e8"; rr(w*0.22,h*0.38,w*0.56,h*0.28,8); ctx.fill();
    ctx.fillStyle = boy ? "#c9a15b" : "#f2d7c4";
    if (boy) { rr(w*0.24,h*0.64,w*0.22,h*0.22,6); ctx.fill(); rr(w*0.54,h*0.64,w*0.22,h*0.22,6); ctx.fill(); }
    else { rr(w*0.22,h*0.62,w*0.56,h*0.22,10); ctx.fill(); }
    ctx.fillStyle = "#6b3a1e"; rr(w*0.26,h*0.84,w*0.18,h*0.12,4); ctx.fill(); rr(w*0.56,h*0.84,w*0.18,h*0.12,4); ctx.fill();
    ctx.restore();
  }
  function drawToy(kind,x,y,w,h) {
    ctx.save();
    if (kind === "ball") {
      ctx.fillStyle = "#e23b2a"; ctx.beginPath(); ctx.arc(x+w/2,y+h/2,w/2,0,Math.PI*2); ctx.fill();
      ctx.fillStyle = "#f5d031"; ctx.beginPath(); ctx.arc(x+w/2,y+h/2,w*0.22,0,Math.PI*2); ctx.fill();
    } else if (kind === "block") {
      ctx.fillStyle = "#e0aa5a"; rr(x,y,w,h,8); ctx.fill();
      ctx.fillStyle = "#d4552a"; ctx.font = "bold "+Math.floor(h*0.5)+"px sans-serif";
      ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("A", x+w/2, y+h/2);
    } else if (kind === "car") {
      ctx.fillStyle = "#3b89e6"; rr(x,y+h*0.28,w,h*0.5,10); ctx.fill();
      ctx.fillStyle = "#f08a2a"; rr(x+w*0.12,y+h*0.08,w*0.5,h*0.32,8); ctx.fill();
      ctx.fillStyle = "#222"; ctx.beginPath(); ctx.arc(x+w*0.25,y+h*0.82,h*0.16,0,Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(x+w*0.75,y+h*0.82,h*0.16,0,Math.PI*2); ctx.fill();
    } else if (kind === "book") {
      ctx.fillStyle = "#2fa4c8"; rr(x,y,w,h,6); ctx.fill(); ctx.fillStyle = "#f0d24a"; ctx.fillRect(x,y,8,h);
    } else if (kind === "marble") {
      ctx.fillStyle = "#3aa0ff"; ctx.beginPath(); ctx.arc(x+w/2,y+h/2,w/2,0,Math.PI*2); ctx.fill();
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(x+w*0.35,y+h*0.35,w*0.12,0,Math.PI*2); ctx.fill();
    } else {
      ctx.fillStyle = "#ffd54a"; ctx.beginPath(); ctx.ellipse(x+w*0.5,y+h*0.62,w*0.38,h*0.28,0,0,Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(x+w*0.55,y+h*0.28,w*0.22,0,Math.PI*2); ctx.fill();
      ctx.fillStyle = "#f08a2a"; ctx.beginPath(); ctx.ellipse(x+w*0.78,y+h*0.30,w*0.16,h*0.08,0,0,Math.PI*2); ctx.fill();
    }
    ctx.restore();
  }
  function makePlayer() {
    return { x: 210, y: GROUND, w: 78, h: 118, vy: 0, on: true, jumps: 0, slide: false, slideT: 0, dead: false, rot: 0 };
  }
  function hit(p) {
    return p.slide ? { x: p.x+16, y: p.y-52, w: p.w-10, h: 52 } : { x: p.x+18, y: p.y-p.h+16, w: p.w-32, h: p.h-22 };
  }
  function burst(x,y,c,n) {
    for (let i=0;i<n;i++) state.parts.push({ x,y, vx:(Math.random()-0.5)*180, vy:-40-Math.random()*160, life:0.5, t:0, c, r:2+Math.random()*4 });
  }
  function push(kind,x,y,w,h,extra) {
    state.items.push(Object.assign({ kind,x,y,w,h,got:false,bob:Math.random()*6 }, extra||{}));
  }
  function spawn() {
    const x = state.spawnX, g = GROUND, r = Math.random();
    if (r < 0.22) { push("ball",x,g,78,78); if (Math.random()<0.45) push("marble",x+90,g-150,34,34); }
    else if (r < 0.4) push("duck",x,g,86,86);
    else if (r < 0.55) { push("block",x,g,74,74); if (Math.random()<0.5) push("marble",x+18,g-118,34,34); }
    else if (r < 0.68) push("car",x,g,130,62);
    else if (r < 0.84) {
      const by = g-118-Math.random()*70;
      push("book",x,by+18,168,28,{ platform:true });
      if (Math.random()<0.7) push("marble",x+70,by-22,34,34);
    } else {
      push("block",x,g,70,70); push("block",x+66,g-68,70,70);
    }
    state.spawnX += 420 + Math.random()*260 + state.speed*0.12;
  }
  function reset() {
    state.t=0; state.dist=0; state.score=0; state.bonus=0; state.speed=320;
    state.items=[]; state.parts=[]; state.spawnX=720; state.shake=0; state.player=makePlayer();
    for (let i=0;i<5;i++) spawn();
    ui.score.textContent="0";
  }
  function show(el){ el.classList.remove("hidden"); }
  function hide(el){ el.classList.add("hidden"); }
  function gotoMenu() {
    state.mode="menu"; hide(ui.hud); hide(ui.touch); hide(ui.pause); hide(ui.over); hide(ui.scores); show(ui.menu);
    document.querySelectorAll(".char-card").forEach(c => c.classList.toggle("selected", c.dataset.char===state.char));
  }
  function start() {
    beep(440,0.05,"sine"); reset(); state.mode="play";
    hide(ui.menu); hide(ui.scores); hide(ui.pause); hide(ui.over); show(ui.hud); show(ui.touch);
  }
  function renderBoard() {
    const list = scores(); ui.scoreList.innerHTML="";
    if (!list.length) { const li=document.createElement("li"); li.style.gridTemplateColumns="1fr"; li.textContent="No runs yet"; ui.scoreList.appendChild(li); return; }
    list.forEach((row,i) => { const li=document.createElement("li"); li.innerHTML=`<span>${i+1}</span><span>${row.name}</span><span>${row.score}</span>`; ui.scoreList.appendChild(li); });
  }
  function over() {
    if (state.mode!=="play") return;
    state.mode="over"; beep(90,0.28,"sawtooth"); state.shake=12; state.pending=state.score;
    if (state.score>state.best) { state.best=state.score; store.set(KEYS.best, String(state.best)); }
    ui.overScore.textContent=String(state.score);
    const list=scores(); const q = state.score>0 && (list.length<10 || state.score>list[list.length-1].score);
    ui.overMsg.textContent = q ? "You made the Top 10 board!" : "The toys win this time.";
    ui.initialsBox.classList.toggle("hidden", !q);
    hide(ui.hud); hide(ui.touch); hide(ui.pause); show(ui.over);
    if (q) { state.initials=["A","A","A"]; state.initI=0; syncInit(); }
  }
  function syncInit() {
    document.querySelectorAll(".init-cell").forEach((el,i) => {
      el.textContent=state.initials[i]; el.classList.toggle("active", i===state.initI);
    });
  }
  function saveScore() {
    const name=state.initials.join("");
    const list=scores(); list.push({ name, score:state.pending, ts:Date.now() });
    list.sort((a,b)=>b.score-a.score||a.ts-b.ts); store.set(KEYS.scores, JSON.stringify(list.slice(0,10)));
    hide(ui.initialsBox); ui.overMsg.textContent=name+" is on the board!";
  }
  function jump() {
    if (state.mode!=="play") return;
    const p=state.player; if (p.dead) return;
    if (p.slide) { p.slide=false; p.slideT=0; }
    if (p.on || p.jumps<2) {
      p.vy = p.on ? -820 : -740; p.on=false; p.jumps++; p.slide=false;
      beep(p.jumps===1?520:720,0.1); burst(p.x+30,p.y-4,"#e8d2a4",6);
    }
  }
  function slide() {
    if (state.mode!=="play") return;
    const p=state.player; if (!p.on || p.dead) return;
    p.slide=true; p.slideT=0.42; beep(180,0.08,"triangle");
  }
  function patterns() {
    const floor=document.createElement("canvas"); floor.width=256; floor.height=160;
    const f=floor.getContext("2d");
    for (let y=0;y<160;y+=32) {
      f.fillStyle = y%64===0 ? "#c8883c" : "#e0ab66"; f.fillRect(0,y,256,32);
      f.strokeStyle="rgba(90,50,16,0.28)"; f.beginPath(); f.moveTo(0,y+31); f.lineTo(256,y+31); f.stroke();
    }
    state.floor=floor;
    const wall=document.createElement("canvas"); wall.width=800; wall.height=420;
    const w=wall.getContext("2d");
    const g=w.createLinearGradient(0,0,0,420);
    g.addColorStop(0,"#8fd4f0"); g.addColorStop(1,"#f3d7a4"); w.fillStyle=g; w.fillRect(0,0,800,420);
    state.wall=wall;
  }
  function backdrop(cam) {
    ctx.drawImage(state.wall,0,0,W,520);
    ctx.fillStyle="#f0c27a"; ctx.fillRect(0,430,W,90);
    ctx.fillStyle="#b57a3a"; ctx.fillRect(0,500,W,18);
    const fx=-((cam*0.95)%256);
    for (let x=fx-256;x<W+256;x+=256) ctx.drawImage(state.floor,x,GROUND,256,H-GROUND);
    ctx.fillStyle="rgba(0,0,0,0.12)"; ctx.fillRect(0,GROUND,W,8);
    const far=-((cam*0.15)%700);
    ctx.fillStyle="rgba(255,255,255,0.5)";
    for (let i=0;i<6;i++) { ctx.beginPath(); ctx.ellipse(far+i*280+80,118,70,28,0,0,Math.PI*2); ctx.fill(); }
  }
  function aabb(a,b){ return a.x<b.x+b.w && a.x+a.w>b.x && a.y<b.y+b.h && a.y+a.h>b.y; }
  function update(dt) {
    if (state.mode!=="play") { state.t+=dt; return; }
    const p=state.player;
    state.t+=dt; state.speed=Math.min(640,320+state.dist*0.018);
    state.dist+=state.speed*dt; state.score=Math.floor(state.dist/8)+(state.bonus||0);
    ui.score.textContent=String(state.score);
    if (p.slide) { p.slideT-=dt; if (p.slideT<=0) p.slide=false; }
    p.vy+=2200*dt; p.y+=p.vy*dt; p.rot = p.on ? 0 : Math.max(-0.18, Math.min(0.22, p.vy*0.00022));
    let supported=false;
    if (p.y>=GROUND) { p.y=GROUND; p.vy=0; p.on=true; p.jumps=0; supported=true; }
    const cam=state.dist, pb=hit(p);
    for (const it of state.items) {
      if (!it.platform) continue;
      const plat={ x:it.x-cam, y:it.y-it.h, w:it.w, h:it.h };
      if (p.vy>=0 && pb.x+pb.w>plat.x+8 && pb.x<plat.x+plat.w-8 && p.y>=plat.y && p.y<=plat.y+22) {
        p.y=plat.y; p.vy=0; p.on=true; p.jumps=0; supported=true;
      }
    }
    if (!supported && p.y<GROUND) p.on=false;
    for (const it of state.items) {
      if (it.got || it.platform) continue;
      const box={ x:it.x-cam+it.w*0.18, y:it.y-it.h+it.h*0.18, w:it.w*0.64, h:it.h*0.72 };
      if (!aabb(pb,box)) continue;
      if (it.kind==="marble") { it.got=true; state.bonus+=50; beep(880,0.08,"sine"); burst(it.x-cam+16,it.y-20,"#f4c431",10); }
      else { p.dead=true; over(); return; }
    }
    state.items=state.items.filter(it => it.x-cam>-280 && !it.got);
    while (state.spawnX < cam + W*1.8) spawn();
    for (const q of state.parts) { q.t+=dt; q.x+=q.vx*dt; q.y+=q.vy*dt; q.vy+=420*dt; }
    state.parts=state.parts.filter(q => q.t<q.life);
    state.shake*=Math.max(0,1-dt*6);
  }
  function draw() {
    const cam=state.dist;
    ctx.save();
    if (state.shake>0.4) ctx.translate((Math.random()-0.5)*state.shake,(Math.random()-0.5)*state.shake);
    backdrop(cam);
    if (state.player) {
      for (const it of state.items) {
        const x=it.x-cam; if (x<-220||x>W+220) continue;
        const bob=it.kind==="marble"?Math.sin(state.t*6+it.bob)*6:0;
        drawToy(it.kind,x,it.y-it.h+bob,it.w,it.h);
      }
      for (const q of state.parts) {
        ctx.globalAlpha=1-q.t/q.life; ctx.fillStyle=q.c; ctx.beginPath(); ctx.arc(q.x,q.y,q.r,0,Math.PI*2); ctx.fill(); ctx.globalAlpha=1;
      }
      const p=state.player, sliding=p.slide;
      const bob=p.on&&!sliding?Math.sin(state.t*14)*3:0;
      const h=sliding?p.h*0.58:p.h, w=sliding?p.w*1.15:p.w, y=p.y-h+bob;
      ctx.save(); ctx.translate(p.x+w/2,y+h); ctx.rotate(p.rot); drawKid(state.char,-w/2,-h,w,h); ctx.restore();
    }
    ctx.restore();
  }
  function loop(ts) {
    if (!state.last) state.last=ts;
    let dt=Math.min(0.05,(ts-state.last)/1000); state.last=ts;
    if (state.mode==="play") update(dt);
    if (state.mode==="menu") backdrop(performance.now()*0.06);
    else draw();
    requestAnimationFrame(loop);
  }
  function fit() {
    const dpr=Math.min(2,window.devicePixelRatio||1);
    canvas.width=W*dpr; canvas.height=H*dpr; ctx.setTransform(dpr,0,0,dpr,0,0);
  }
  document.querySelectorAll(".char-card").forEach(card => {
    card.addEventListener("click", () => {
      state.char=card.dataset.char; store.set(KEYS.char, state.char);
      document.querySelectorAll(".char-card").forEach(c => c.classList.remove("selected"));
      card.classList.add("selected");
    });
  });
  $("btnPlay").onclick=start;
  $("btnScores").onclick=()=>{ renderBoard(); hide(ui.menu); show(ui.scores); };
  $("btnScoresBack").onclick=gotoMenu;
  $("btnPause").onclick=()=>{ if(state.mode==="play"){ state.mode="pause"; show(ui.pause); } };
  $("btnResume").onclick=()=>{ hide(ui.pause); state.mode="play"; state.last=0; };
  $("btnQuit").onclick=()=>{ hide(ui.pause); gotoMenu(); };
  $("btnAgain").onclick=start;
  $("btnMenu").onclick=gotoMenu;
  $("btnSaveScore").onclick=saveScore;
  document.querySelectorAll(".init-cell").forEach(el => {
    el.onclick=()=>{ const i=+el.dataset.i; state.initI=i; const c=state.initials[i].charCodeAt(0); state.initials[i]=String.fromCharCode(c>=90?65:c+1); syncInit(); };
  });
  $("btnJump").onpointerdown=(e)=>{ e.preventDefault(); jump(); };
  $("btnSlide").onpointerdown=(e)=>{ e.preventDefault(); slide(); };
  window.addEventListener("keydown", e => {
    if (state.mode==="over" && !ui.initialsBox.classList.contains("hidden")) {
      if (/^[a-zA-Z]$/.test(e.key)) { state.initials[state.initI]=e.key.toUpperCase(); state.initI=Math.min(2,state.initI+1); syncInit(); e.preventDefault(); return; }
      if (e.key==="Enter") saveScore();
    }
    if (e.code==="Space"||e.code==="ArrowUp") { e.preventDefault(); if(state.mode==="menu") start(); else jump(); }
    if (e.code==="ArrowDown") slide();
    if (e.code==="Escape") {
      if (state.mode==="play") { state.mode="pause"; show(ui.pause); }
      else if (state.mode==="pause") { hide(ui.pause); state.mode="play"; state.last=0; }
    }
  });
  canvas.addEventListener("pointerdown", e => {
    if (state.mode!=="play") return;
    const r=canvas.getBoundingClientRect();
    if ((e.clientX-r.left)/r.width<0.38) slide(); else jump();
  });
  window.addEventListener("resize", fit);
  patterns(); fit(); requestAnimationFrame(loop);
})();
