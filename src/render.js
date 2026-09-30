/* =====================================================================
   7. RENDERING — parallax worlds, weather, animated characters, effects
   ===================================================================== */
function rr(c,x,y,w,h,r){ c.beginPath(); c.moveTo(x+r,y); c.arcTo(x+w,y,x+w,y+h,r); c.arcTo(x+w,y+h,x,y+h,r);
  c.arcTo(x,y+h,x,y,r); c.arcTo(x,y,x+w,y,r); c.closePath(); }
function h1(i){ const x=Math.sin(i*127.1)*43758.5453; return x-Math.floor(x) }

/* ---------- weather (screen space) ---------- */
const WEATHER={
  forest :{k:'fall' ,n:24,c:'#C6EE9E',s:5 ,vy:.7,sway:2.2},
  cave   :{k:'rise' ,n:22,c:'#8FF0FF',s:3 ,vy:-.5,sway:1.2},
  desert :{k:'blow' ,n:30,c:'rgba(255,228,175,.55)',s:2,vy:.1,vx:-3.4},
  snow   :{k:'fall' ,n:48,c:'#FFFFFF',s:3 ,vy:.9,sway:1.6},
  pirate :{k:'drift',n:12,c:'rgba(255,255,255,.45)',s:22,vy:0,vx:-.35},
  city   :{k:'rise' ,n:20,c:'rgba(255,184,74,.75)',s:3,vy:-.8,sway:1},
  castle :{k:'drift',n:14,c:'rgba(200,162,255,.35)',s:16,vy:-.12,vx:.25},
  volcano:{k:'rise' ,n:32,c:'#FF9247',s:3 ,vy:-1.1,sway:1.4},
  sky    :{k:'drift',n:11,c:'rgba(255,255,255,.5)',s:28,vy:0,vx:-.3},
  dark   :{k:'rise' ,n:20,c:'rgba(255,92,122,.55)',s:3,vy:-.6,sway:1.6}
};
let weather=[], weatherCfg=WEATHER.forest, GRAD=null;
function buildGradients(W){
  const c=CX; GRAD={};
  GRAD.sky=c.createLinearGradient(0,0,0,VH);
  GRAD.sky.addColorStop(0,W.sky[0]); GRAD.sky.addColorStop(.78,W.sky[1]); GRAD.sky.addColorStop(1,W.sky[1]);
  GRAD.top=c.createLinearGradient(0,0,0,26);
  GRAD.top.addColorStop(0,W.acc); GRAD.top.addColorStop(1,'rgba(0,0,0,0)');
  GRAD.halo=c.createRadialGradient(0,0,6,0,0,120);
  GRAD.halo.addColorStop(0,'rgba(255,255,255,.55)'); GRAD.halo.addColorStop(.35,'rgba(255,255,255,.14)');
  GRAD.halo.addColorStop(1,'rgba(255,255,255,0)');
  const vg=c.createRadialGradient(VW/2,VH/2,VH*.45,VW/2,VH/2,VH*.95);
  vg.addColorStop(0,'rgba(0,0,0,0)'); vg.addColorStop(1,'rgba(0,0,0,.34)');
  GRAD.vig=bake(VW,VH,x=>{ x.fillStyle=vg; x.fillRect(0,0,VW,VH) });
  GRAD.haloImg=bake(260,260,x=>{ const g=x.createRadialGradient(130,130,6,130,130,120);
    g.addColorStop(0,'rgba(255,255,255,.55)'); g.addColorStop(.35,'rgba(255,255,255,.14)');
    g.addColorStop(1,'rgba(255,255,255,0)'); x.fillStyle=g; x.fillRect(0,0,260,260) });
}
/* draw once into an offscreen canvas, then blit every frame — much cheaper than re-filling gradients */
function bake(w,h,fn){ const cv=document.createElement('canvas'); cv.width=w; cv.height=h; fn(cv.getContext('2d')); return cv }
function initWeather(theme){
  weatherCfg=WEATHER[theme]||WEATHER.forest; weather=[];
  for(let i=0;i<weatherCfg.n;i++) weather.push({x:Math.random()*VW,y:Math.random()*VH,
    ph:Math.random()*6.3,sp:.6+Math.random()*.8,s:weatherCfg.s*(.6+Math.random()*.8)});
}
function updateWeather(dt){
  const W=weatherCfg;
  weather.forEach(p=>{
    p.ph+=.03*dt;
    p.x+=((W.vx||0)*p.sp+(W.sway?Math.sin(p.ph)*W.sway*.35:0))*dt;
    p.y+=W.vy*p.sp*dt;
    if(p.y<-30) p.y=VH+20; if(p.y>VH+30) p.y=-20;
    if(p.x<-40) p.x=VW+30; if(p.x>VW+40) p.x=-30;
  });
}
function drawWeather(c){
  const W=weatherCfg; c.save(); c.fillStyle=W.c;
  weather.forEach(p=>{
    if(W.k==='drift'){ c.globalAlpha=.75; c.beginPath();
      c.arc(p.x,p.y,p.s,0,7); c.arc(p.x+p.s*.8,p.y+2,p.s*.75,0,7); c.arc(p.x-p.s*.8,p.y+3,p.s*.65,0,7); c.fill(); }
    else if(W.k==='blow'){ c.globalAlpha=.8; c.fillRect(p.x,p.y,p.s*5,p.s*.8) }
    else if(W.k==='rise'){ c.globalAlpha=.35+Math.abs(Math.sin(p.ph))*.55; c.beginPath(); c.arc(p.x,p.y,p.s,0,7); c.fill() }
    else { c.globalAlpha=.8; c.beginPath(); c.ellipse(p.x,p.y,p.s*.7,p.s,Math.sin(p.ph),0,7); c.fill() }
  });
  c.restore();
}

/* ---------- parallax silhouettes ---------- */
const PARALLAX=[{p:.12,s:1.35,a:.16,dy:26},{p:.3,s:1,a:.26,dy:10},{p:.55,s:.72,a:.4,dy:-2}];
function silhouette(c,theme,x,y,s,layer){
  const S_=s*46;
  switch(theme){
    case 'forest':
      c.fillRect(x-3*s,y-S_*.7,6*s,S_*.7);
      c.beginPath(); c.arc(x,y-S_*.8,S_*.44,0,7); c.arc(x-S_*.3,y-S_*.6,S_*.34,0,7); c.arc(x+S_*.3,y-S_*.62,S_*.32,0,7); c.fill(); break;
    case 'cave':
      c.beginPath(); c.moveTo(x-S_*.3,y); c.lineTo(x,y-S_*1.1); c.lineTo(x+S_*.26,y); c.fill();
      c.beginPath(); c.moveTo(x+S_*.2,y); c.lineTo(x+S_*.45,y-S_*.6); c.lineTo(x+S_*.66,y); c.fill(); break;
    case 'desert':
      c.beginPath(); c.moveTo(x-S_,y); c.quadraticCurveTo(x,y-S_*.55,x+S_,y); c.fill();
      if(layer===1){ c.beginPath(); c.moveTo(x-S_*.5,y); c.lineTo(x,y-S_*.95); c.lineTo(x+S_*.5,y); c.fill() } break;
    case 'snow':
      c.beginPath(); c.moveTo(x-S_*.9,y); c.lineTo(x-S_*.15,y-S_*1.25); c.lineTo(x+S_*.25,y-S_*.75); c.lineTo(x+S_*.95,y); c.fill(); break;
    case 'pirate':
      c.beginPath(); c.moveTo(x-S_*.8,y); c.quadraticCurveTo(x,y-S_*.28,x+S_*.8,y); c.fill();
      if(layer===2){ c.fillRect(x-2*s,y-S_*1.1,4*s,S_*1.1);
        c.beginPath(); c.moveTo(x,y-S_*1.05); c.lineTo(x+S_*.45,y-S_*.75); c.lineTo(x,y-S_*.5); c.fill() } break;
    case 'city':
      c.fillRect(x-S_*.4,y-S_*(0.7+h1(x)*.9),S_*.8,S_*1.6);
      if(layer===2){ c.beginPath(); c.arc(x+S_*.7,y-S_*.5,S_*.28,0,7); c.fill();
        for(let k=0;k<6;k++){ const an=k/6*6.28; c.fillRect(x+S_*.7+Math.cos(an)*S_*.3-2,y-S_*.5+Math.sin(an)*S_*.3-2,5,5) } } break;
    case 'castle':
      c.fillRect(x-S_*.3,y-S_*1.1,S_*.6,S_*1.1);
      for(let k=0;k<3;k++) c.fillRect(x-S_*.3+k*S_*.22,y-S_*1.24,S_*.14,S_*.16);
      if(layer===1){ c.beginPath(); c.moveTo(x-S_*.34,y-S_*1.1); c.lineTo(x,y-S_*1.6); c.lineTo(x+S_*.34,y-S_*1.1); c.fill() } break;
    case 'volcano':
      c.beginPath(); c.moveTo(x-S_,y); c.lineTo(x-S_*.2,y-S_*1.15); c.lineTo(x+S_*.1,y-S_*.9); c.lineTo(x+S_*.9,y); c.fill();
      if(layer===2){ c.beginPath(); c.arc(x-S_*.15,y-S_*1.35,S_*.2,0,7); c.arc(x+S_*.1,y-S_*1.6,S_*.15,0,7); c.fill() } break;
    case 'sky':
      c.beginPath(); c.ellipse(x,y-S_*.6,S_*.7,S_*.22,0,0,7); c.fill();
      c.beginPath(); c.moveTo(x-S_*.5,y-S_*.55); c.lineTo(x,y-S_*.1); c.lineTo(x+S_*.5,y-S_*.55); c.fill(); break;
    default:
      c.beginPath(); c.moveTo(x-S_*.28,y); c.lineTo(x,y-S_*1.5); c.lineTo(x+S_*.28,y); c.fill();
      if(layer===1) c.fillRect(x+S_*.4,y-S_*.7,S_*.1,S_*.7);
  }
}
function drawBackdrop(c,W){
  if(!GRAD) buildGradients(W);
  c.fillStyle=GRAD.sky; c.fillRect(0,0,VW,VH);
  /* sun / moon with a soft halo */
  const sx=VW*.76-((camX*.03)%(VW*1.6)), sy=104;
  c.drawImage(GRAD.haloImg,sx-130,sy-130);
  c.fillStyle='rgba(255,255,255,.8)'; c.beginPath(); c.arc(sx,sy,26,0,7); c.fill();
  PARALLAX.forEach((L,li)=>{
    const step=230*L.s, off=camX*L.p;
    const first=Math.floor(off/step)-1, last=first+Math.ceil(VW/step)+3;
    c.save(); c.globalAlpha=L.a; c.fillStyle='#0B0722';
    for(let i=first;i<=last;i++){ const x=i*step-off+h1(i*(li+2))*60;
      silhouette(c,W.theme,x,GYTOP+L.dy,(.75+h1(i*(li+7))*.55)*L.s,li); }
    c.restore();
  });
}
function groundDetail(c,W,x,y){
  const r=h1(x*.37);
  switch(W.theme){
    case 'snow': c.fillStyle='rgba(255,255,255,.8)'; c.beginPath(); c.arc(x,y+2,3+r*3,Math.PI,0); c.fill(); break;
    case 'desert': c.fillStyle='rgba(255,255,255,.18)'; c.fillRect(x,y+4,10+r*10,2); break;
    case 'city': case 'volcano': c.fillStyle='rgba(0,0,0,.22)'; c.fillRect(x,y+3,3,6+r*5); break;
    case 'cave': case 'dark': case 'castle': c.fillStyle=W.acc; c.globalAlpha=.35;
      c.beginPath(); c.arc(x,y+3,2+r*2,0,7); c.fill(); c.globalAlpha=1; break;
    default: c.fillStyle=W.acc; c.globalAlpha=.75;
      c.beginPath(); c.moveTo(x,y+4); c.lineTo(x+2,y-4-r*7); c.lineTo(x+4,y+4); c.fill(); c.globalAlpha=1;
  }
}

/* ---------- main frame ---------- */
const onScreen=(x,pad)=>x>camX-(pad||120)&&x<camX+VW+(pad||120);
function draw(){
  const W=LV.world, c=CX; c.clearRect(0,0,VW,VH);
  drawBackdrop(c,W);
  c.save();
  const sh=shake>0?shake:0;
  c.translate(-camX+(Math.random()-.5)*sh, (Math.random()-.5)*sh);
  /* ground */
  LV.ground.forEach(gr=>{
    c.fillStyle=W.ground; c.fillRect(gr.x,GYTOP,gr.w,VH-GYTOP+80);
    c.save(); c.translate(0,GYTOP); c.globalAlpha=.5; c.fillStyle=GRAD.top;
    c.fillRect(gr.x,0,gr.w,26); c.restore();
    c.fillStyle=W.acc; c.fillRect(gr.x,GYTOP,gr.w,5);
    const from=Math.max(gr.x,camX-40), to=Math.min(gr.x+gr.w,camX+VW+40);
    for(let x=Math.ceil(from/34)*34;x<to;x+=34) groundDetail(c,W,x,GYTOP);
  });
  /* platforms */
  LV.plats.forEach(p=>{
    if(!onScreen(p.x,240)) return;
    c.fillStyle='rgba(0,0,0,.18)'; rr(c,p.x+3,p.y+5,p.w,p.h,8); c.fill();
    c.fillStyle=W.plat; rr(c,p.x,p.y,p.w,p.h,8); c.fill();
    c.fillStyle=W.acc; c.globalAlpha=.55; c.fillRect(p.x+2,p.y,p.w-4,4); c.globalAlpha=1;
    if(p.mv){ c.fillStyle='rgba(255,255,255,.35)'; for(let k=0;k<3;k++) c.fillRect(p.x+p.w/2-10+k*9,p.y+p.h-6,4,3) }
  });
  /* traps */
  LV.traps.forEach(t=>{ if(!onScreen(t.x)) return; for(let i=0;i<3;i++){ const bx=t.x+i*11;
    const gr=c.createLinearGradient(bx,t.y,bx,t.y+t.h); gr.addColorStop(0,'#F2F0FF'); gr.addColorStop(1,'#8A83B8');
    c.fillStyle=gr; c.beginPath(); c.moveTo(bx,t.y+t.h); c.lineTo(bx+5.5,t.y); c.lineTo(bx+11,t.y+t.h); c.fill(); } });
  /* wells / portals */
  LV.wells.forEach(w=>{
    c.fillStyle='#231A4C'; rr(c,w.x-6,w.y-2,w.w+12,w.h+2,12); c.fill();
    c.fillStyle='#150F33'; c.beginPath(); c.ellipse(w.x+w.w/2,w.y+14,28,12,0,0,7); c.fill();
    if(!w.used){ const t=gameT*.05;
      for(let k=0;k<3;k++){ c.strokeStyle='rgba(124,92,255,'+(.7-k*.2)+')'; c.lineWidth=3;
        c.beginPath(); c.ellipse(w.x+w.w/2,w.y+14,20-k*5,9-k*2.5,t+k,0,4.4); c.stroke(); }
      c.fillStyle='rgba(56,225,200,.85)'; c.beginPath(); c.ellipse(w.x+w.w/2,w.y+14,7+Math.sin(t*3)*2,3.5,0,0,7); c.fill();
      c.fillStyle='#fff'; c.font='bold 14px Rubik,sans-serif'; c.textAlign='center';
      c.fillText('E',w.x+w.w/2,w.y-10+Math.sin(gameT*.08)*3); c.textAlign='left'; }
  });
  /* rune stones — endless practice for coins */
  LV.stones.forEach(st=>{ if(!onScreen(st.x)) return;
    const pulse=.45+Math.sin(gameT*.06+st.x)*.3;
    c.fillStyle='rgba(0,0,0,.22)'; c.beginPath(); c.ellipse(st.x+st.w/2,st.y+st.h+3,st.w*.6,5,0,0,7); c.fill();
    c.save(); c.globalAlpha=pulse*.45; c.fillStyle='#38E1C8';
    c.beginPath(); c.arc(st.x+st.w/2,st.y+34,34,0,7); c.fill(); c.restore();
    c.fillStyle=LV.world.plat; c.beginPath();
    c.moveTo(st.x+6,st.y+st.h); c.lineTo(st.x+2,st.y+16); c.lineTo(st.x+st.w/2,st.y);
    c.lineTo(st.x+st.w-2,st.y+16); c.lineTo(st.x+st.w-6,st.y+st.h); c.closePath(); c.fill();
    c.strokeStyle='rgba(0,0,0,.32)'; c.lineWidth=2; c.stroke();
    c.globalAlpha=.55+pulse*.45; c.fillStyle='#38E1C8';
    c.beginPath(); c.moveTo(st.x+st.w/2,st.y+22); c.lineTo(st.x+st.w/2+9,st.y+34);
    c.lineTo(st.x+st.w/2,st.y+46); c.lineTo(st.x+st.w/2-9,st.y+34); c.fill(); c.globalAlpha=1;
    if(Math.abs((st.x+st.w/2)-(P.x+P.w/2))<70){
      c.fillStyle='#fff'; c.font='bold 13px Rubik,sans-serif'; c.textAlign='center';
      c.fillText('E  +'+Math.max(2,6-st.used)+'🪙',st.x+st.w/2,st.y-10+Math.sin(gameT*.09)*3); c.textAlign='left'; }
  });
  /* chests */
  LV.chests.forEach(ch=>{
    c.fillStyle='rgba(0,0,0,.2)'; c.beginPath(); c.ellipse(ch.x+ch.w/2,ch.y+ch.h+3,ch.w*.5,5,0,0,7); c.fill();
    c.fillStyle='#8B5E2B'; rr(c,ch.x,ch.y+(ch.open?8:0),ch.w,ch.h-(ch.open?8:0),6); c.fill();
    c.fillStyle=ch.open?'#3D2A14':'#C89A4E'; c.fillRect(ch.x+4,ch.y+(ch.open?10:14),ch.w-8,10);
    c.fillStyle='#FFE08A'; c.fillRect(ch.x+ch.w/2-4,ch.y+(ch.open?12:18),8,7);
    if(ch.open){ c.globalAlpha=.5+Math.sin(gameT*.12)*.3; c.fillStyle='#FFE08A';
      c.beginPath(); c.arc(ch.x+ch.w/2,ch.y-4,10,0,7); c.fill(); c.globalAlpha=1 }
  });
  /* blocks */
  LV.blocks.forEach(b=>{
    if(!onScreen(b.x)) return;
    const off=(b.pop>0?-7:0)+(b.used?0:Math.sin(gameT*.05+b.x)*1.5), t=BLOCKTYPES[b.type];
    if(!b.used){ c.globalAlpha=.20+Math.sin(gameT*.07+b.x)*.10; c.fillStyle=t.c;
      c.beginPath(); c.arc(b.x+b.w/2,b.y+b.h/2+off,b.w*.85,0,7); c.fill(); c.globalAlpha=1 }
    c.fillStyle=b.used?'#4A4470':t.c; rr(c,b.x,b.y+off,b.w,b.h,9); c.fill();
    c.strokeStyle='rgba(0,0,0,.35)'; c.lineWidth=2; c.stroke();
    if(!b.used){ c.fillStyle='rgba(255,255,255,.35)'; rr(c,b.x+5,b.y+off+4,b.w-10,7,4); c.fill() }
    c.fillStyle=b.used?'#8078B5':'rgba(0,0,0,.6)'; c.font='bold 22px Unbounded,sans-serif'; c.textAlign='center';
    c.fillText(b.used?'✓':'?',b.x+b.w/2,b.y+off+31); c.textAlign='left';
  });
  /* coins */
  LV.coinsArr.forEach(co=>{
    if(!onScreen(co.x,60)) return;
    const sp=Math.cos(gameT*.09+co.x*.05), yy=co.y+Math.sin(gameT*.06+co.x*.1)*2;
    c.fillStyle='#C98A16'; c.beginPath(); c.ellipse(co.x,yy,9*Math.abs(sp)+1.5,9,0,0,7); c.fill();
    c.fillStyle='#FFC84A'; c.beginPath(); c.ellipse(co.x,yy,7*Math.abs(sp)+1,7,0,0,7); c.fill();
    if(sp>.55){ c.fillStyle='rgba(255,255,255,.85)'; c.fillRect(co.x-1,yy-4,2,8) }
  });
  /* NPC cage */
  LV.npcs.forEach(n=>{
    c.font='34px system-ui'; c.fillText('🧙',n.x,n.y+52+Math.sin(gameT*.05)*2);
    if(!n.freed){ c.strokeStyle='#B0A8D8'; c.lineWidth=3;
      for(let i=0;i<4;i++){ c.beginPath(); c.moveTo(n.x+i*13,n.y); c.lineTo(n.x+i*13,n.y+n.h); c.stroke() }
      c.beginPath(); c.moveTo(n.x,n.y); c.lineTo(n.x+42,n.y); c.stroke(); }
    else { c.globalAlpha=.4+Math.sin(gameT*.1)*.25; c.fillStyle='#38E1C8';
      c.beginPath(); c.arc(n.x+18,n.y+30,26,0,7); c.fill(); c.globalAlpha=1 }
  });
  /* finish */
  if(LV.finish){ const f=LV.finish, ready=missionDone()&&LV.coins>=LV.needCoins;
    c.fillStyle='#DCD6F0'; c.fillRect(f.x,f.y,6,f.h);
    c.fillStyle=ready?'#38E1C8':'#FF5C7A';
    c.beginPath(); c.moveTo(f.x+6,f.y+6);
    for(let i=0;i<=10;i++){ const p=i/10; c.lineTo(f.x+6+p*50,f.y+14+Math.sin(gameT*.12+p*4)*4+p*6) }
    for(let i=10;i>=0;i--){ const p=i/10; c.lineTo(f.x+6+p*50,f.y+34+Math.sin(gameT*.12+p*4)*4-p*2) }
    c.closePath(); c.fill();
    if(ready){ c.globalAlpha=.25+Math.sin(gameT*.1)*.15; c.fillStyle='#38E1C8';
      c.beginPath(); c.arc(f.x+3,f.y+f.h,42,0,7); c.fill(); c.globalAlpha=1 }
  }
  /* monsters */
  LV.enemies.forEach(e=>{ if(e.alive&&onScreen(e.x)) drawFoe(c,e) });
  (LV.shots||[]).forEach(s=>{ c.fillStyle='#C8A2FF';
    c.globalAlpha=.35; c.beginPath(); c.arc(s.x,s.y,s.r*1.8,0,7); c.fill(); c.globalAlpha=1;
    c.beginPath(); c.arc(s.x,s.y,s.r,0,7); c.fill() });
  /* boss + arena barrier */
  if(LV.boss.active&&!LV.boss.dead){ const B=LV.boss;
    [B.x-430,B.x+150+P.w].forEach(bx=>{ const gr=c.createLinearGradient(bx-10,0,bx+10,0);
      gr.addColorStop(0,'rgba(124,92,255,0)'); gr.addColorStop(.5,'rgba(124,92,255,.5)'); gr.addColorStop(1,'rgba(124,92,255,0)');
      c.fillStyle=gr; c.fillRect(bx-12,0,24,GYTOP+10);
      c.fillStyle='rgba(56,225,200,'+(.3+Math.sin(gameT*.08)*.2)+')'; c.fillRect(bx-2,0,4,GYTOP+10); });
    drawBoss(c,B); }
  LV.boss.shots.forEach(s=>{ c.fillStyle='rgba(255,138,74,.4)'; c.beginPath(); c.arc(s.x,s.y,s.r*1.7,0,7); c.fill();
    c.fillStyle='#FF8A4A'; c.beginPath(); c.arc(s.x,s.y,s.r,0,7); c.fill() });
  (LV.rocks||[]).forEach(r=>{ c.fillStyle='#8A7F9E'; c.beginPath(); c.arc(r.x,r.y,r.r,0,7); c.fill();
    c.fillStyle='rgba(0,0,0,.25)'; c.beginPath(); c.arc(r.x+3,r.y+3,r.r*.5,0,7); c.fill() });
  /* partner, then player */
  if(NET.on&&NET.mate) drawMate(c);
  drawPlayer(c);
  /* particles, effects, floating text */
  particles.forEach(p=>{ c.fillStyle=p.c; c.globalAlpha=clamp(p.life/(p.s?16:32),0,1);
    c.fillRect(p.x,p.y,p.s||5,p.s||5); c.globalAlpha=1 });
  fx.forEach(f=>{
    if(f.k==='ring'){ const r=f.t*7; c.strokeStyle=f.c; c.globalAlpha=clamp(1-f.t/46,0,1); c.lineWidth=6-f.t/12;
      c.beginPath(); c.arc(f.x,f.y,r,0,7); c.stroke(); c.globalAlpha=1 }
    else { const r=6+f.t*1.6; c.fillStyle=f.c; c.globalAlpha=clamp(1-f.t/26,0,1);
      for(let k=0;k<6;k++){ const an=k/6*6.28+f.t*.05;
        c.beginPath(); c.arc(f.x+Math.cos(an)*r,f.y+Math.sin(an)*r,4-f.t*.1,0,7); c.fill() } c.globalAlpha=1 }
  });
  c.textAlign='center'; floats.forEach(f=>{ c.globalAlpha=clamp(f.life/70,0,1);
    c.font='bold 15px Rubik,sans-serif';
    c.fillStyle='rgba(0,0,0,.5)'; c.fillText(f.t,f.x+1,f.y+1);
    c.fillStyle=f.c; c.fillText(f.t,f.x,f.y); c.globalAlpha=1 }); c.textAlign='left';
  c.restore();
  /* screen-space layers */
  drawWeather(c);
  c.drawImage(GRAD.vig,0,0);
  if(P.inv>60){ c.fillStyle='rgba(255,60,90,'+((P.inv-60)/30*.28)+')'; c.fillRect(0,0,VW,VH) }
  /* frozen out of questions: a cold edge on the screen, so the state is never a mystery */
  if(LV.freeze>0){
    const g=c.createLinearGradient(0,0,0,VH);
    g.addColorStop(0,'rgba(142,216,255,.22)'); g.addColorStop(.35,'rgba(142,216,255,.05)');
    g.addColorStop(.75,'rgba(142,216,255,.05)'); g.addColorStop(1,'rgba(142,216,255,.22)');
    c.fillStyle=g; c.fillRect(0,0,VW,VH);
    c.strokeStyle='rgba(142,216,255,'+(.35+Math.sin(gameT*.12)*.15)+')'; c.lineWidth=5;
    c.strokeRect(2.5,2.5,VW-5,VH-5);
    c.font='bold 15px Rubik,sans-serif'; c.textAlign='center';
    c.fillStyle='rgba(8,20,40,.55)'; rr(c,VW/2-104,12,208,30,14); c.fill();
    c.fillStyle='#BFE9FF';
    c.fillText('🧊 Frozen — '+Math.ceil(LV.freeze/60)+' s until you can answer',VW/2,32);
    c.textAlign='left';
  }
  if(fade<1){ c.fillStyle='rgba(6,4,18,'+(1-fade)+')'; c.fillRect(0,0,VW,VH) }
}


/* ---------- hero sprite sheet (frames sliced from the uploaded artwork, embedded so the game stays one file) ----------
   meta: name -> [x, y, w, h, anchorX, anchorY] inside the atlas; the anchor is the point between the feet */
/* Fetch every sprite sheet listed in data/heroes.js. Called once from main.js. */
function loadHeroSheets(){
  Object.keys(SHEETS).forEach(k=>{
    const sh=SHEETS[k], img=new Image();
    img.onload=()=>{ sh.img=img; sh.ok=true; sh.s=sh.targetH/sh.meta.idle[3];
      const scr=document.getElementById('s-hero');
      if(scr&&scr.classList.contains('on')&&typeof renderHero==='function') renderHero(); };
    img.onerror=()=>{ sh.ok=false; console.warn('[hero] sheet "'+k+'" failed to load from '+sh.src) };
    img.src=sh.src;
  });
}
const heroDef=id=>HEROES.find(h=>h.id===id)||HEROES[0];
const HERO_CACHE={};
function tintSheet(img,deg){
  const c=document.createElement('canvas'); c.width=img.width; c.height=img.height;
  const x=c.getContext('2d'); x.drawImage(img,0,0);
  const d=x.getImageData(0,0,c.width,c.height), a=d.data;
  for(let i=0;i<a.length;i+=4){
    if(a[i+3]<8) continue;
    const r=a[i]/255,g=a[i+1]/255,b=a[i+2]/255;
    const mx=Math.max(r,g,b), mn=Math.min(r,g,b), l=(mx+mn)/2, ch=mx-mn;
    if(ch<0.08) continue;                                  /* greys stay grey */
    let h=0;
    if(mx===r) h=((g-b)/ch)%6; else if(mx===g) h=(b-r)/ch+2; else h=(r-g)/ch+4;
    h*=60; if(h<0) h+=360;
    if(h<185||h>265) continue;                             /* only the armour blues move */
    const sat=l>.5?ch/(2-mx-mn):ch/(mx+mn);
    let nh=(h+deg)%360; if(nh<0) nh+=360;
    const C=(1-Math.abs(2*l-1))*sat, X=C*(1-Math.abs((nh/60)%2-1)), m=l-C/2;
    let R,G,B;
    if(nh<60){R=C;G=X;B=0} else if(nh<120){R=X;G=C;B=0} else if(nh<180){R=0;G=C;B=X}
    else if(nh<240){R=0;G=X;B=C} else if(nh<300){R=X;G=0;B=C} else {R=C;G=0;B=X}
    a[i]=(R+m)*255; a[i+1]=(G+m)*255; a[i+2]=(B+m)*255;
  }
  x.putImageData(d,0,0); return c;
}
let tintBlocked=false;   /* opening the game straight from disk taints the canvas: recolour once, then stop trying */
function heroSheet(id){
  const def=heroDef(id);
  if(def.vector) return null;
  const sh=SHEETS[def.sheet||'classic'];
  if(!sh||!sh.ok) return null;
  let img=sh.img;
  if(def.hue&&!tintBlocked){
    if(!HERO_CACHE[def.id]){
      try{ HERO_CACHE[def.id]=tintSheet(sh.img,def.hue) }
      catch(e){ tintBlocked=true;
        console.warn('[hero] the browser will not let the game read the sprite sheet, so the recoloured heroes look like the original. '+
                     'That happens when index.html is opened straight from disk — serve the folder over http instead.') }
    }
    img=HERO_CACHE[def.id]||sh.img;
  }
  return {img, meta:sh.meta, s:sh.s};
}
/* which frame fits the hero's current state; extra poses are used only if the sheet has them */
function heroFrame(meta){
  const has=n=>!meta||!!meta[n];
  if(LV&&LV.hearts<=0&&has('down')) return 'down';          /* out of hearts */
  if(LV&&LV.busy&&has('think')) return 'think';             /* a question is on screen */
  if(P.atk>0) return 'attack';
  if(P.inv>70) return 'hurt';
  if(P.fly>0) return 'jump';
  if(!P.ground) return P.vy<0?'jump':'fall';
  if(P.squash>.45) return 'crouch';
  if(Math.abs(P.vx)>.4) return 'run'+(Math.floor(P.anim*.28)%5);
  return 'idle';
}
/* ---------- characters ---------- */
function drawPlayer(c){
  const w=P.w,h=P.h,cx=P.x+w/2,fy=P.y+h;
  c.fillStyle='rgba(0,0,0,.25)'; c.beginPath(); c.ellipse(cx,fy+3,w*.52*(1+P.squash*.3),5,0,0,7); c.fill();
  if(P.inv>0&&Math.floor(P.inv/5)%2) return;
  const flying=P.fly>0;
  /* auras stay the same whether the hero is a sprite or the vector fallback */
  if(LV.jumpT>0&&!flying){ c.save(); c.globalAlpha=.25+Math.sin(gameT*.2)*.12; c.fillStyle='#38E1C8';
    c.beginPath(); c.ellipse(cx,fy,w*.85,7,0,0,7); c.fill(); c.restore(); }
  if(flying){ c.save(); c.globalAlpha=.22+Math.sin(gameT*.3)*.1; c.fillStyle='#38E1C8';
    c.beginPath(); c.ellipse(cx,fy-h*.5,w*1.15,h*.9,0,0,7); c.fill(); c.restore(); }
  const H=heroSheet(S.hero);
  if(H){
    const f=H.meta[heroFrame(H.meta)]||H.meta.idle, s=H.s, sheet=H.img;
    c.save(); c.translate(cx,fy); c.scale(P.face*(1+P.squash*.22),1-P.squash*.22);
    if(flying){ c.fillStyle='rgba(56,225,200,.85)'; c.beginPath();
      c.moveTo(-10,0); c.lineTo(0,20+Math.sin(gameT*.5)*6); c.lineTo(10,0); c.fill(); }
    c.drawImage(sheet, f[0],f[1],f[2],f[3], -f[4]*s, -(f[5]+1)*s, f[2]*s, f[3]*s);
    if(P.atk>0){ const k=clamp(P.atk/14,0,1);   /* faint arc still shows how far the sword reaches */
      c.strokeStyle='rgba(255,224,138,'+(.22*k).toFixed(2)+')'; c.lineWidth=6;
      c.beginPath(); c.arc(4,-h*.55,ATTACK_REACH*.62,-.75,.75); c.stroke(); }
    c.restore();
    if(flying) flightBar(c,cx);
    return;
  }
  drawPlayerVector(c,cx,fy,flying);
  if(flying) flightBar(c,cx);
}
function flightBar(c,cx){
  const p=clamp(P.fly/SUPER_TIME,0,1);
  c.fillStyle='rgba(0,0,0,.45)'; rr(c,cx-24,P.y-18,48,7,3); c.fill();
  c.fillStyle=p>.3?'#38E1C8':'#FFC84A'; rr(c,cx-24,P.y-18,48*p,7,3); c.fill();
}
/* fallback used if the sprite sheet is unavailable */
function drawPlayerVector(c,cx,fy,flying){
  const w=P.w,h=P.h;
  const run=P.ground&&Math.abs(P.vx)>.4, t=P.anim, sw=run?Math.sin(t)*8:0;
  const bob=run?Math.abs(Math.sin(t))*2:Math.sin(gameT*.04)*1.2;
  c.save(); c.translate(cx,fy); c.scale(P.face*(1+P.squash*.28),1-P.squash*.28);
  /* legs */
  c.fillStyle='#3C2F73';
  if(flying){ c.fillRect(-11,-15,9,15); c.fillRect(2,-15,9,15);
    c.fillStyle='rgba(56,225,200,.85)'; c.beginPath();
    c.moveTo(-10,0); c.lineTo(0,20+Math.sin(gameT*.5)*6); c.lineTo(10,0); c.fill(); c.fillStyle='#3C2F73'; }
  else if(P.ground){ c.fillRect(-13+sw*.5,-13,10,13); c.fillRect(3-sw*.5,-13,10,13); }
  else if(P.vy<0){ c.fillRect(-13,-14,10,12); c.fillRect(4,-17,10,14); }
  else { c.fillRect(-15,-13,10,13); c.fillRect(5,-13,10,13); }
  /* cloak behind */
  c.fillStyle='#5B3FD6'; c.beginPath();
  c.moveTo(-w/2+2,-h+16-bob); c.lineTo(w/2-2,-h+16-bob);
  c.lineTo(w/2-6,-8); c.lineTo(-w/2-2-(run?6:2)-Math.sin(t)*2,-6); c.closePath(); c.fill();
  /* body */
  c.fillStyle='#7C5CFF'; rr(c,-w/2+2,-h+14-bob,w-4,h-24,8); c.fill();
  c.fillStyle='#38E1C8'; c.fillRect(-w/2+2,-h+30-bob,w-4,5);
  /* scarf */
  c.fillStyle='#38E1C8'; c.beginPath(); c.moveTo(-9,-h+18-bob);
  c.lineTo(-9-(run?11:5)-Math.sin(t*1.2)*3,-h+24-bob); c.lineTo(-9,-h+28-bob); c.fill();
  /* head + hood */
  c.fillStyle='#F6E2C8'; rr(c,-13,-h+2-bob,26,20,8); c.fill();
  c.fillStyle='#2A2050'; rr(c,-15,-h-3-bob,30,13,6); c.fill();
  const blink=(Date.now()%3400)<130;
  c.fillStyle='#1B1440';
  if(blink) c.fillRect(3,-h+12-bob,5,2); else c.fillRect(3,-h+10-bob,4,5);
  /* sword swing */
  if(P.atk>0){ const k=clamp(P.atk/14,0,1);
    c.strokeStyle='rgba(255,224,138,'+(.30*k).toFixed(2)+')'; c.lineWidth=7;
    c.beginPath(); c.arc(4,-h*.45,ATTACK_REACH*.62,-.75,.75); c.stroke();
    c.strokeStyle='rgba(255,243,196,'+(.9*k).toFixed(2)+')'; c.lineWidth=4;
    c.beginPath(); c.arc(4,-h*.45,34+(1-k)*26,-.9,.9); c.stroke();
    c.strokeStyle='#EDE6FF'; c.lineWidth=4; c.beginPath();
    c.moveTo(6,-h*.5); c.lineTo(6+34+(1-k)*14,-h*.5-10+(1-k)*22); c.stroke(); }
  c.restore();
}
function drawFoe(c,e){
  const cfg=FOECFG[e.kind], x=e.x, y=e.y, w=e.w, h=e.h, t=e.t;
  if(!cfg.fly){ c.fillStyle='rgba(0,0,0,.22)'; c.beginPath(); c.ellipse(x+w/2,y+h+3,w*.45,4,0,0,7); c.fill() }
  c.save();
  if(e.kind==='ghost') c.globalAlpha=.5+Math.sin(t*1.4)*.35;
  const cols={slime:'#6BE06B',bat:'#8C6BFF',goblin:'#7BB661',knight:'#B9C2D8',mage:'#C285FF',ghost:'#E8E4FF',golem:'#9A8F86',mimic:'#C89A4E'};
  const base=cols[e.kind]||'#6BE06B';
  c.fillStyle=(e.flash>0&&Math.floor(e.flash/3)%2)?'#FFFFFF':base;
  if(e.kind==='slime'){ const sq=Math.sin(t*2)*.14, bw=w*(1+sq), bh=h*(1-sq);
    c.beginPath(); c.moveTo(x+w/2-bw/2,y+h); c.quadraticCurveTo(x+w/2-bw/2,y+h-bh,x+w/2,y+h-bh);
    c.quadraticCurveTo(x+w/2+bw/2,y+h-bh,x+w/2+bw/2,y+h); c.fill();
    c.fillStyle='rgba(255,255,255,.5)'; c.beginPath(); c.ellipse(x+w*.35,y+h-bh*.62,4,3,-.4,0,7); c.fill(); }
  else if(e.kind==='bat'){ const f=Math.sin(t*4)*9;
    c.beginPath(); c.moveTo(x+6,y+h/2); c.lineTo(x-14,y+h/2-10-f); c.lineTo(x-3,y+h/2+9); c.fill();
    c.beginPath(); c.moveTo(x+w-6,y+h/2); c.lineTo(x+w+14,y+h/2-10-f); c.lineTo(x+w+3,y+h/2+9); c.fill();
    c.beginPath(); c.arc(x+w/2,y+h/2,h/2,0,7); c.fill();
    c.beginPath(); c.moveTo(x+w/2-8,y+2); c.lineTo(x+w/2-4,y-7); c.lineTo(x+w/2-1,y+2); c.fill();
    c.beginPath(); c.moveTo(x+w/2+8,y+2); c.lineTo(x+w/2+4,y-7); c.lineTo(x+w/2+1,y+2); c.fill(); }
  else if(e.kind==='golem'){ const st=Math.abs(Math.sin(t*1.4))*3;
    rr(c,x,y+st,w,h-st,10); c.fill();
    c.fillStyle='rgba(0,0,0,.22)'; c.fillRect(x+8,y+16+st,w-16,7); c.fillRect(x+6,y+40+st,w-12,7);
    c.fillStyle=LV.world.acc; c.globalAlpha=.5+Math.sin(t*2)*.3; c.fillRect(x+w/2-5,y+26+st,10,8); c.globalAlpha=1; }
  else if(e.kind==='mage'){ c.beginPath(); c.moveTo(x+w/2,y+2); c.lineTo(x+w,y+h); c.lineTo(x,y+h); c.fill();
    c.beginPath(); c.moveTo(x+w/2-9,y+4); c.lineTo(x+w/2,y-14); c.lineTo(x+w/2+9,y+4); c.fill();
    const ox=x+w/2+Math.cos(t*2)*20, oy=y+h*.5+Math.sin(t*2)*10;
    c.fillStyle='#FFE08A'; c.globalAlpha=.85; c.beginPath(); c.arc(ox,oy,5,0,7); c.fill(); c.globalAlpha=1; }
  else if(e.kind==='knight'){ rr(c,x,y,w,h,6); c.fill();
    c.fillStyle='#5E6B8C'; rr(c,x-9+Math.sin(t*1.6)*2,y+12,13,26,4); c.fill();
    c.fillStyle='#8E9AB8'; c.fillRect(x+4,y-6,w-8,7);
    c.fillStyle='#FF5C7A'; c.fillRect(x+w/2-2,y-12,4,7); }
  else if(e.kind==='ghost'){ const wob=Math.sin(t*2)*3;
    c.beginPath(); c.moveTo(x,y+h); c.quadraticCurveTo(x,y,x+w/2,y); c.quadraticCurveTo(x+w,y,x+w,y+h);
    for(let i=0;i<3;i++) c.lineTo(x+w-i*w/3-w/6,y+h-7+((i%2)?wob:-wob)); c.fill(); }
  else if(e.kind==='mimic'){ const lid=Math.abs(Math.sin(t*3))*5;
    rr(c,x,y+lid,w,h-lid,6); c.fill();
    c.fillStyle='#FF5C7A'; for(let i=0;i<5;i++){ c.beginPath();
      c.moveTo(x+6+i*9,y+16); c.lineTo(x+10+i*9,y+6+lid); c.lineTo(x+14+i*9,y+16); c.fill() } }
  else { const bob=Math.sin(t*3)*2;
    rr(c,x,y+bob,w,h-bob,7); c.fill();
    c.fillStyle='#4F7A3F'; c.fillRect(x+2,y-5+bob,w-4,8);
    c.fillStyle=base; c.fillRect(x-5,y+14+bob,5,12); c.fillRect(x+w,y+14-bob,5,12); }
  /* eyes */
  c.fillStyle='#1B1440';
  const ey=y+h*(e.kind==='bat'?.42:.35), blink=(Date.now()+e.home*40)%2600<120;
  if(blink){ c.fillRect(x+w*.28,ey+2,6,2); c.fillRect(x+w*.6,ey+2,6,2) }
  else { c.fillRect(x+w*.28,ey,5,6); c.fillRect(x+w*.6,ey,5,6);
    c.fillStyle='rgba(255,255,255,.8)'; c.fillRect(x+w*.28+3,ey+1,2,2); c.fillRect(x+w*.6+3,ey+1,2,2) }
  c.restore();
  if(e.maxhp>1){ c.fillStyle='rgba(0,0,0,.45)'; rr(c,x,y-13,w,6,3); c.fill();
    c.fillStyle=e.hp/e.maxhp>.5?'#6BE06B':'#FFC84A'; rr(c,x,y-13,w*(e.hp/e.maxhp),6,3); c.fill() }
}
function drawBoss(c,B){
  const x=B.x,y=B.y,w=B.w,h=B.h,t=B.t;
  const breathe=Math.sin(t*1.6)*3, telegraph=B.cool<22;
  c.fillStyle='rgba(0,0,0,.3)'; c.beginPath(); c.ellipse(x+w/2,y+h+6,w*.5,9,0,0,7); c.fill();
  c.save(); if(B.inv>0&&Math.floor(B.inv/5)%2) c.globalAlpha=.5;
  /* aura */
  c.globalAlpha*= 1; c.fillStyle=LV.world.acc;
  c.save(); c.globalAlpha=telegraph?.30+Math.sin(t*9)*.15:.14;
  c.beginPath(); c.arc(x+w/2,y+h/2,w*.9+breathe,0,7); c.fill(); c.restore();
  /* body */
  c.fillStyle=LV.world.acc; rr(c,x,y-breathe,w,h+breathe,18); c.fill();
  c.fillStyle='rgba(0,0,0,.32)'; rr(c,x+12,y+22-breathe,w-24,30,10); c.fill();
  /* eyes */
  c.fillStyle=telegraph?'#FFFFFF':'#FF5C7A';
  c.fillRect(x+20,y+30-breathe,15,11); c.fillRect(x+w-35,y+30-breathe,15,11);
  c.fillStyle='rgba(255,255,255,.85)'; c.fillRect(x+24,y+33-breathe,5,4); c.fillRect(x+w-31,y+33-breathe,5,4);
  /* crown */
  c.fillStyle='#FFC84A'; c.beginPath(); c.moveTo(x+14,y-breathe); c.lineTo(x+30,y-24-breathe);
  c.lineTo(x+46,y-breathe); c.lineTo(x+62,y-24-breathe); c.lineTo(x+78,y-breathe); c.fill();
  /* arms */
  c.fillStyle=LV.world.acc; const sw=Math.sin(t*1.2)*6;
  rr(c,x-14,y+42+sw-breathe,16,34,7); c.fill(); rr(c,x+w-2,y+42-sw-breathe,16,34,7); c.fill();
  /* mouth */
  c.fillStyle='rgba(0,0,0,.5)'; rr(c,x+24,y+68-breathe,w-48,12,6); c.fill();
  c.fillStyle='#FFF'; for(let i=0;i<4;i++) c.fillRect(x+28+i*12,y+68-breathe,6,5);
  c.restore();
}
