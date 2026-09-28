/* =====================================================================
   6. GAME ENGINE
   ===================================================================== */
const CV=$('#cv'), CX=CV.getContext('2d');
const K={}; let touchState={l:0,r:0,j:0,a:0,e:0,q:0,s:0};
const typing=e=>{ const t=e.target; return t&&(/^(INPUT|TEXTAREA)$/.test(t.tagName)||t.isContentEditable) };
addEventListener('keydown',e=>{
  if(typing(e)) return;                    /* typing an answer — spaces and letters belong to the field */
  K[e.code]=1;
  if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)&&$('#s-game').classList.contains('on')) e.preventDefault();
  if(e.code==='Escape'&&$('#s-game').classList.contains('on')) togglePause();
});
addEventListener('keyup',e=>{ if(typing(e)) return; K[e.code]=0 });
function bindTouch(id,prop){ const el=$('#'+id);
  const on=e=>{e.preventDefault(); touchState[prop]=1}, off=e=>{e.preventDefault(); touchState[prop]=0};
  el.addEventListener('touchstart',on,{passive:false}); el.addEventListener('touchend',off,{passive:false});
  el.addEventListener('touchcancel',off,{passive:false});
  el.addEventListener('mousedown',on); el.addEventListener('mouseup',off); el.addEventListener('mouseleave',off);
}
['tl:l','tr:r','tj:j','ta:a','te:e','tq:q','ts:s'].forEach(s=>{const [a,b]=s.split(':');bindTouch(a,b)});

const ATTACK_REACH=170, ATTACK_HEIGHT=132;
const SUPER_CHARGES=5, SUPER_TIME=120, FLY_TOP=46;   /* super jump: 5 flights, ~2 s each */
/* answer streak → higher jumps for 30 seconds (30 s ≈ 1800 frames at 60 fps) */
const STREAK_JUMP=[{n:5,m:2,label:'×2'},{n:3,m:1.5,label:'+50%'},{n:1,m:1.25,label:'+25%'}], STREAK_TIME=1800;
const P={x:100,y:0,w:34,h:46,vx:0,vy:0,ground:false,face:1,inv:0,atk:0,safeX:100,anim:0,squash:0,stepT:0,fly:0,trail:0};
let camX=0, running=false, particles=[], floats=[], fx=[], lastT=0, shake=0, fade=0, gameT=0;
function shakeIt(n){ shake=Math.max(shake,n) }
/* a modal steals focus, so held keys could stay "pressed" — wipe the input state around every dialog */
function clearKeys(){
  for(const k in K) K[k]=0;
  for(const k in touchState) touchState[k]=0;
  prevE=prevA=prevQ=prevS=1;
}
/* if anything ever throws mid-question, unstick the level instead of freezing it */
function unstick(why){
  askActive=false;
  if(LV){ LV.busy=false; LV.paused=false }
  $('#m-question').classList.remove('on'); $('#m-quest').classList.remove('on');
  clearKeys(); console.warn('[recover]',why);
}
addEventListener('error',e=>{ if(LV&&LV.busy) { unstick('error: '+e.message); toast('Recovered — carry on') } });
addEventListener('unhandledrejection',e=>{ if(LV&&LV.busy){ unstick('promise: '+(e.reason&&e.reason.message)); toast('Recovered — carry on') } });
addEventListener('blur',()=>clearKeys());
document.addEventListener('visibilitychange',()=>{
  if(document.hidden){ clearKeys(); Music.stop(); if(LV&&running&&!LV.paused&&!LV.busy) togglePause(); }
});
/* a correct answer lifts your jump for 30 s; 3 and 5 in a row lift it much further */
function applyStreakJump(streak){
  if(!LV) return;
  const tier=STREAK_JUMP.find(t=>streak>=t.n); if(!tier) return;
  const better=tier.m>=LV.jumpMult;
  LV.jumpMult=Math.max(LV.jumpMult,tier.m); LV.jumpT=STREAK_TIME;
  if(better&&running){ addFloat(P.x,P.y-24,'⬆️ Jump '+tier.label,'#38E1C8'); Snd.shard(); }
  hud();
}
function poof(x,y,col){ fx.push({k:'poof',x,y,t:0,c:col||'#FFF3C4'}) }
function bigBurst(x,y,col){ fx.push({k:'ring',x,y,t:0,c:col||'#FFC84A'}); burst(x,y,col||'#FFC84A',40) }
function dust(x,y){ for(let i=0;i<3;i++) particles.push({x:x+rint(-8,8),y,vx:(Math.random()-.5)*1.6,vy:-Math.random()*1.4,c:'rgba(255,255,255,.55)',life:16,g:.05,s:3}) }

function startLevel(worldId,diff,opts={}){
  SESSION.world=worldId; SESSION.diff=diff;
  const D=DIFF[diff];
  const seed=opts.seed||SESSION.seed||('s'+Date.now()+'-'+Math.floor(Math.random()*1e6));
  SESSION.seed=seed; SESSION.lastSeed=seed;
  LV=withSeed(seed,()=>buildLevel(worldId,diff));
  LV.seed=seed;
  LV.review=!!opts.review;
  LV.coins=0; LV.needCoins=D.coins+(opts.review?-10:0); LV.hearts=D.hearts; LV.maxHearts=D.hearts;
  LV.hasKey=false; LV.shardsGot=0; LV.bossDead=false; LV.bossActive=false; LV.freed=false;
  LV.guardUsed=false; LV.freeHint=false; LV.magicSword=false; LV.busy=false; LV.paused=false;
  LV.startedAt=Date.now(); LV.mistakes=[]; LV.secrets=0; LV.quests=0;
  LV.stats={ok:0,bad:0,streak:0,best:0,boostsUsed:0,mobs:0};
  LV.jumpMult=1; LV.jumpT=0;
  LV.boosts={}; S.slots.forEach(id=>{ if(id&&S.boosts[id]>0){ LV.boosts[id]=S.boosts[id]; } });
  P.x=100; P.y=GYTOP-P.h-2; P.vx=P.vy=0; P.inv=0; P.atk=0; P.fly=0; P.safeX=100; camX=0; particles=[]; floats=[];
  LV.superLeft=SUPER_CHARGES+(S.gear.eq.boots==='boots-jump'?1:0);
  $('#bossbar').style.display='none';
  fx=[]; shake=0; fade=0; gameT=0; P.squash=0; initWeather(LV.world.theme); buildGradients(LV.world);
  NET.results={}; NET.mateState=null; NET.pendingHelp=null;
  show('game'); running=true; lastT=performance.now();
  Snd.resume(); Music.start(worldId,false);
  updateTouchVisibility(); hud();
  requestAnimationFrame(loop);
  toast(missionText(),3200);
}
function missionText(){
  if(!LV) return '';
  return LV.mission==='key' ? 'Mission: find the golden key, defeat the boss and free the wizard'
                            : 'Mission: collect 3 crystal shards and defeat the boss';
}
function missionShort(){ return LV.mission==='key'?'Find the key · Free the wizard':'Collect 3 crystal shards' }
function missionProgress(){
  if(LV.mission==='key') return (LV.hasKey?'🔑':'🔒')+' key · '+(LV.bossDead?'👑':'⚔️')+' boss · '+(LV.freed?'🧙 free':'🧙 in the cage');
  return '💎 '+LV.shardsGot+'/'+LV.needShards+' · '+(LV.bossDead?'👑 boss defeated':'⚔️ boss alive');
}
function missionDone(){
  if(LV.mission==='key') return LV.freed && LV.bossDead;
  return LV.shardsGot>=LV.needShards && LV.bossDead;
}
function hud(){
  if(!LV) return;
  const hp=clamp(LV.hearts,0,LV.maxHearts);
  $('#hp').textContent='❤️'.repeat(hp)+'🖤'.repeat(Math.max(0,LV.maxHearts-hp));
  $('#coins').textContent='🪙 '+LV.coins+' / '+LV.needCoins;
  $('#m-title').textContent=LV.world.n+' — '+missionShort();
  $('#m-sub').textContent=missionProgress();
  const q=S.slots.find(id=>id&&LV.boosts[id]>0&&['skip','coins'].includes(id));
  $('#boostslot').textContent=q?('Q '+BOOSTS[q].ic+' ×'+LV.boosts[q]):'Q —';
  const mb=$('#mate');
  if(NET.on&&NET.mate&&NET.mateState){ mb.style.display='';
    const m=NET.mateState;
    mb.textContent=(m.a||'🙂')+' '+(NET.mode==='coop'?('❤️'+(m.hearts==null?'?':m.hearts)+' ✅'+(m.ok||0))
                                                   :('🪙'+(m.coins||0)+' · '+(m.prog||0)+'%')); }
  else mb.style.display='none';
  const jb=$('#jumpbox');
  if(LV.jumpT>0){ jb.style.display=''; jb.textContent='⬆️ ×'+LV.jumpMult+' · '+Math.ceil(LV.jumpT/60)+'s' }
  else jb.style.display='none';
  $('#superbox').textContent='🚀 ×'+(LV.superLeft||0);
  $('#superbox').style.opacity=LV.superLeft?1:.45;
  const ts=$('#ts'); if(ts) ts.classList.toggle('empty',!LV.superLeft);
}
function updateTouchVisibility(){
  const touch = S.settings.touch==='on' || (S.settings.touch==='auto' && ((window.matchMedia&&matchMedia('(pointer:coarse)').matches)||innerWidth<820));
  $('#touch').classList.toggle('on',touch);
}

/* ---------- physics ---------- */
function solids(){
  const out=[];
  LV.ground.forEach(g=>out.push({x:g.x,y:GYTOP,w:g.w,h:VH-GYTOP+80}));
  LV.plats.forEach(p=>out.push(p));
  return out;
}
function hits(a,b){ return a.x<b.x+b.w && a.x+a.w>b.x && a.y<b.y+b.h && a.y+a.h>b.y }

function movePlayer(dt){
  const boots=S.gear.eq.boots;
  const speed=3.9*(boots==='boots-speed'?1.25:1);
  const jump=-14.4*(boots==='boots-jump'?1.14:1)*(LV.jumpT>0?Math.sqrt(LV.jumpMult):1);   /* jumpMult = how much higher, not how much faster */
  let ix=0;
  if(K.KeyA||K.ArrowLeft||touchState.l) ix=-1;
  if(K.KeyD||K.ArrowRight||touchState.r) ix=1;
  P.vx=ix*speed; if(ix) P.face=ix;
  const wantJump=K.Space||K.KeyW||K.ArrowUp||touchState.j;
  if(wantJump&&P.ground&&P.fly<=0){ P.vy=jump; P.ground=false; Snd.jump(); }
  if(P.fly>0){
    /* super jump: shoot up to the top of the screen, then hover for the rest of the time */
    P.fly-=dt;
    if(P.y>FLY_TOP+4) P.vy=-12.5;
    else { P.vy=0; P.y=FLY_TOP+Math.sin(gameT*.07)*5 }   /* smooth hover at the top of the screen */
    P.x+=ix*speed*.45*dt;                       // a little extra steering while flying
    P.trail+=dt;
    if(P.trail>2){ P.trail=0;
      particles.push({x:P.x+P.w/2+rint(-8,8),y:P.y+P.h-4,vx:(Math.random()-.5)*1.2,vy:1+Math.random(),
                      c:'rgba(56,225,200,.85)',life:20,g:.02,s:4}); }
    if(P.fly<=0){ P.fly=0; P.vy=1.5; Snd.beep(520,.18,'sine',.1,-260); }
  } else P.vy=Math.min(P.vy+0.72,17);
  const S_=P.fly>0?[]:solids();     /* while flying the hero passes through platforms */
  /* move on X */
  P.x+=P.vx*dt;
  S_.forEach(s=>{ if(hits(P,s)){ if(P.vx>0) P.x=s.x-P.w; else if(P.vx<0) P.x=s.x+s.w; } });
  P.x=clamp(P.x,0,LV.w-P.w);
  /* move on Y */
  const wasAir=!P.ground;
  P.y+=P.vy*dt; P.ground=false;
  S_.forEach(s=>{ if(hits(P,s)){
    if(P.vy>0){ const impact=P.vy; P.y=s.y-P.h; P.vy=0; P.ground=true; if(P.y<GYTOP) P.safeX=P.x;
      if(wasAir&&impact>6){ P.squash=1; Snd.land(); dust(P.x+P.w/2,P.y+P.h); if(impact>13) shakeIt(4) } }
    else if(P.vy<0){ P.y=s.y+s.h; P.vy=1; } } });
  if(P.ground&&P.y+P.h>=GYTOP-1) P.safeX=P.x;
  if(P.y>VH+80){ hurt(1,true); P.x=Math.max(60,P.safeX-46); P.y=GYTOP-P.h-40; P.vy=0; }
  P.anim+=Math.abs(P.vx)*dt*.2;
  if(P.squash>0) P.squash=Math.max(0,P.squash-.09*dt);
  if(P.ground&&Math.abs(P.vx)>.5){ P.stepT+=dt; if(P.stepT>11){ P.stepT=0; Snd.step(); dust(P.x+P.w/2,P.y+P.h) } }
}
/* force = damage that comes from a wrong answer. The question lock is still held at that
   moment, so without this flag the penalty was silently skipped and a wrong answer cost
   nothing. Hearts never go below zero: a question can still be resolving after game over. */
function hurt(n=1,silent,force){
  if(!LV||!running) return;
  if(P.inv>0&&!force) return;
  if(LV.busy&&!force) return;
  if(LV.hearts<=0) return;
  LV.hearts=Math.max(0,LV.hearts-n); P.inv=90; P.vy=-6; if(!silent) Snd.hit(); if(n>0) shakeIt(8); hud();
  addFloat(P.x,P.y,'-'+n+'❤️','#FF5C7A');
  if(LV.hearts<=0) gameOver();
}
function addFloat(x,y,t,c){ floats.push({x,y,t,c,life:70}) }
function burst(x,y,c,n=10){ for(let i=0;i<n;i++) particles.push({x,y,vx:(Math.random()-.5)*5,vy:-Math.random()*5,c,life:32}) }

function addCoins(n,x,y){
  const dbl=LV.boosts.coins>0&&LV.doubleNext; if(dbl){LV.doubleNext=false; n*=2}
  LV.coins+=n; S.stats.totalCoins+=n; daily('d-coin',n);
  if(NET.on&&NET.mate){ if(NET.mode==='coop') NET.send({t:'ev',k:'coin',n}); netStat(); }
  addFloat(x||P.x,y||P.y,'+'+n+'🪙','#FFC84A'); Snd.coin(); hud(); save();
}

/* ---------- interaction: blocks, monsters, boss ---------- */
async function hitBlock(b){
  if(b.used||LV.busy) return; LV.busy=true; Snd.block();
  try{
  const q=QM.vocab(SESSION.diff);
  const {ok,shielded}=await ask(q);
  b.used=true; b.pop=12;
  const t=b.type;
  if(ok||shielded){
    const lucky=S.gear.eq.amulet==='amu-luck'&&Math.random()<.5;
    if(t==='yellow') addCoins(rint(3,6)+(lucky?3:0),b.x,b.y);
    else if(t==='green'){ if(LV.hearts<LV.maxHearts){LV.hearts++; addFloat(b.x,b.y,'+1❤️','#6BE06B'); Snd.heal()} else addCoins(4,b.x,b.y); }
    else if(t==='blue'){ const id=rnd(Object.keys(BOOSTS)); LV.boosts[id]=(LV.boosts[id]||0)+1; S.boosts[id]=(S.boosts[id]||0)+1;
      addFloat(b.x,b.y,BOOSTS[id].ic+' '+BOOSTS[id].n,'#5FA8FF'); }
    else if(t==='purple'){ if(LV.mission==='shards'&&LV.shardsGot<LV.needShards){ LV.shardsGot++; addFloat(b.x,b.y,'+💎 shard','#B583FF'); Snd.shard();
      if(NET.mode==='coop') NET.send({t:'ev',k:'shard',n:LV.shardsGot}); }
      else addCoins(rint(6,10),b.x,b.y); if(b.secret){ LV.secrets++; S.stats.secrets++; } }
    else if(t==='red'){ if(Math.random()<.7) addCoins(rint(8,14),b.x,b.y); else { addFloat(b.x,b.y,'Trap!','#FF5C7A'); hurt(1) } }
    else if(t==='gold'){ addCoins(rint(12,20)+(lucky?6:0),b.x,b.y); if(LV.mission==='key'&&!LV.hasKey&&Math.random()<.35){LV.hasKey=true; addFloat(b.x,b.y,'🔑 Golden key','#FFE08A')} }
    burst(b.x+22,b.y,'#FFC84A',14);
  } else { addCoins(1,b.x,b.y); addFloat(b.x,b.y-20,'small reward','#9E95CF'); }
  hud();
  }catch(err){ unstick('hitBlock: '+err.message) }
  LV.busy=false;
}

async function fight(e){
  if(LV.busy||!e.alive) return; LV.busy=true;
  try{
  if(S.gear.eq.weapon==='sword-magic'&&!LV.magicSword&&!e.strong&&e.maxhp===1){
    LV.magicSword=true; killEnemy(e,true); LV.busy=false; return;
  }
  const q=QM.grammar(SESSION.diff);
  const {ok,shielded}=await ask(q);
  if(ok){
    let dmg=1;
    if(S.gear.eq.weapon==='sword-silver'&&e.strong&&Math.random()<.4){dmg=2; addFloat(e.x,e.y-20,'CRIT ×2','#FFC84A')}
    e.hp-=dmg; burst(e.x+e.w/2,e.y+e.h/2,'#6BE06B',12); e.flash=14; shakeIt(5);
    if(e.hp<=0) killEnemy(e);
    else { addFloat(e.x,e.y-20,'-'+dmg+' HP','#6BE06B'); e.x+=(e.x>P.x?1:-1)*46; P.inv=Math.max(P.inv,55); }
  } else if(!shielded){
    addFloat(e.x,e.y-20,'Missed!','#FF5C7A'); P.inv=0; hurt(SESSION.diff===0?0:1,false,true);
    if(SESSION.diff===0) addFloat(P.x,P.y-30,'Try again','#FFC84A');
  }
  }catch(err){ unstick('fight: '+err.message) }
  LV.busy=false;
}
function killEnemy(e,magic){
  e.alive=false; LV.stats.mobs++; S.stats.monsters++; daily('d-mon',1); Snd.kill(); poof(e.x+e.w/2,e.y+e.h/2);
  addCoins(e.strong?rint(6,10):rint(3,5),e.x,e.y);
  burst(e.x+e.w/2,e.y+e.h/2,'#FFC84A',16);
  if(magic) addFloat(e.x,e.y-24,'🔮 Magic sword!','#B583FF');
  if(e.guard) addFloat(e.x,e.y-40,'The chest is free!','#FFE08A');
  save();
}

async function bossAttackTry(){
  if(LV.busy||!LV.boss.active||LV.boss.dead) return; LV.busy=true;
  try{
  LV.bossQids=LV.bossQids||[];
  const q=QM.grammar(SESSION.diff,LV.bossQids);
  if(q.ref.qid) LV.bossQids.push(q.ref.qid);
  const {ok,shielded}=await ask(q);
  const B=LV.boss;
  if(ok){ B.hp--; B.inv=40; burst(B.x+B.w/2,B.y+B.h/2,'#FFC84A',22); Snd.bossHit(); shakeIt(9);
    if(NET.on&&NET.mate&&NET.mode==='coop') NET.send({t:'ev',k:'boss',n:B.hp});
    $('#bossfill').style.width=(B.hp/B.maxhp*100)+'%';
    addFloat(B.x,B.y-20,'Phase cleared!','#FFC84A');
    if(B.hp<=0){ B.dead=true; LV.bossDead=true; S.stats.bosses++; addCoins(30,B.x,B.y);
      $('#bossbar').style.display='none'; toast('👑 Boss defeated! The path is open'); Snd.win();
      Music.start(SESSION.world,false); shakeIt(16); bigBurst(B.x+B.w/2,B.y+B.h/2,LV.world.acc); }
  } else if(!shielded){ B.shots.push({x:B.x,y:B.y+40,vx:P.x<B.x?-5:5,vy:-1,r:12}); addFloat(B.x,B.y-20,'The boss strikes back!','#FF5C7A'); }
  hud();
  }catch(err){ unstick('boss: '+err.message) }
  LV.busy=false;
}

/* ---------- the E key ---------- */
async function interact(){
  if(LV.busy) return;
  try{
  const near=(o,d=70)=>Math.abs((o.x+(o.w||40)/2)-(P.x+P.w/2))<d && Math.abs((o.y||GYTOP)-P.y)<120;
  for(const w of LV.wells) if(!w.used&&near(w,60)){ LV.busy=true; clearKeys();
      let r=false; try{ r=await runQuest() }catch(err){ unstick('quest: '+err.message) }
      w.used=true; LV.quests++; S.stats.quests++; daily('d-quest',1); if(r) applyQuestReward();
      clearKeys(); LV.busy=false; return; }
  for(const st of LV.stones) if(near(st,58)){ LV.busy=true;
      try{ await runeStone(st) }catch(err){ unstick('stone: '+err.message) }
      LV.busy=false; return; }
  for(const c of LV.chests) if(!c.open&&near(c,60)){
      const guard=LV.enemies.find(e=>e.guard&&e.alive);
      if(guard&&Math.abs(guard.x-c.x)<300){ toast('A goblin is guarding the chest — defeat it first'); return }
      c.open=true; Snd.win();
      if(LV.mission==='key'&&!LV.hasKey){ LV.hasKey=true; addFloat(c.x,c.y-30,'🔑 Golden key!','#FFE08A'); toast('You found the golden key');
        if(NET.mode==='coop') NET.send({t:'ev',k:'key'}) }
      else { addCoins(rint(10,18),c.x,c.y); }
      hud(); return; }
  for(const n of LV.npcs) if(!n.freed&&near(n,70)){
      if(LV.mission==='key'&&!LV.hasKey){ toast('The cage is locked. Find the golden key 🔑'); return }
      if(!LV.bossDead){ toast('Defeat the boss first — his magic holds the cage'); return }
      n.freed=true; LV.freed=true; addCoins(20,n.x,n.y); toast('🧙 The wizard is free!');
      if(NET.mode==='coop') NET.send({t:'ev',k:'freed'}); Snd.win(); hud(); return; }
  if(LV.finish&&near(LV.finish,60)) tryFinish();
  }catch(err){ unstick('interact: '+err.message) }
}
/* rune stone: an endless practice spot — answer a question, earn coins.
   The reward shrinks with every use of the same stone (never below 2), so a level can
   always be finished, but farming stays slow enough to keep the pace. */
async function runeStone(st){
  const q=Math.random()<.5?QM.vocab(SESSION.diff):QM.grammar(SESSION.diff);
  const {ok,shielded}=await ask(q);
  if(ok||shielded){
    const r=Math.max(2,6-st.used); st.used++;
    addCoins(r,st.x+st.w/2,st.y); Snd.shard(); burst(st.x+st.w/2,st.y+10,'#38E1C8',12);
  } else { addFloat(st.x,st.y,'no coins this time','#9E95CF'); st.used=Math.max(0,st.used-1) }
  hud();
}
function applyQuestReward(){
  const kinds=['coins','boost','heart','shard'];
  let k=rnd(kinds);
  if(LV.mission==='shards'&&LV.shardsGot<LV.needShards) k='shard';
  if(k==='coins') addCoins(rint(12,22));
  else if(k==='boost'){ const id=rnd(Object.keys(BOOSTS)); LV.boosts[id]=(LV.boosts[id]||0)+1; S.boosts[id]=(S.boosts[id]||0)+1; toast('Reward: '+BOOSTS[id].ic+' '+BOOSTS[id].n) }
  else if(k==='heart'){ LV.hearts=Math.min(LV.maxHearts,LV.hearts+1); toast('Reward: +1 ❤️') }
  else { if(LV.shardsGot<LV.needShards){LV.shardsGot++; toast('Reward: 💎 a crystal shard')} else addCoins(20) }
  hud(); save();
}
function tryFinish(){
  const miss=[];
  if(LV.coins<LV.needCoins) miss.push('You need '+(LV.needCoins-LV.coins)+' more coins — answer questions at a rune stone 💠.');
  if(!LV.bossDead) miss.push('Defeat the '+LV.world.boss+'.');
  if(LV.mission==='key'&&!LV.hasKey) miss.push('Find the golden key.');
  if(LV.mission==='key'&&!LV.freed) miss.push('Save the wizard.');
  if(LV.mission==='shards'&&LV.shardsGot<LV.needShards) miss.push('Collect '+(LV.needShards-LV.shardsGot)+' more crystal shards.');
  if(miss.length){ toast(miss[0],2600); return }
  finishLevel(true);
}
function superJump(){
  if(LV.busy||LV.paused) return;
  if(P.fly>0) return;
  if(!LV.superLeft){ toast('No super jumps left on this level'); Snd.beep(200,.12,'sine',.08,-60); return }
  LV.superLeft--; P.fly=SUPER_TIME; P.ground=false; P.squash=0;
  Snd.tone({f:260,f2:1300,d:.5,type:'triangle',vol:.2}); Snd.noise({freq:3000,hp:true,d:.35,vol:.09});
  bigBurst(P.x+P.w/2,P.y+P.h,'#38E1C8'); shakeIt(5);
  addFloat(P.x,P.y-16,'🚀 SUPER JUMP','#38E1C8'); hud();
}
function useFieldBoost(){
  const id=S.slots.find(x=>x&&LV.boosts[x]>0&&['skip','coins'].includes(x));
  if(!id){ toast('No field boost in your slots'); return }
  if(id==='skip'){ const e=LV.enemies.find(e=>e.alive&&Math.abs(e.x-P.x)<180);
    if(!e){ toast('No monster nearby'); return } useBoost('skip'); e.alive=false; addFloat(e.x,e.y,'💨 skipped','#9E95CF'); }
  else { useBoost('coins'); LV.doubleNext=true; toast('💰 Your next reward is doubled'); }
  hud();
}

/* ---------- scene update ---------- */
function update(dt){
  if(!LV||LV.busy||LV.paused) return;
  movePlayer(dt);
  if(P.inv>0) P.inv-=dt*1.6;
  if(P.atk>0) P.atk-=dt;
  /* moving platforms */
  LV.plats.forEach(p=>{ if(p.mv){ p.mv.t+=dt*.02*p.mv.sp; p.y=p.mv.a+(p.mv.b-p.mv.a)*(Math.sin(p.mv.t)*.5+.5) } });
  /* blocks: hit from below */
  if(P.vy<0) LV.blocks.forEach(b=>{ if(!b.used&&hits({x:P.x,y:P.y-6,w:P.w,h:10},b)){ P.vy=2; hitBlock(b) } });
  LV.blocks.forEach(b=>{ if(b.pop>0) b.pop-=dt });
  /* coins */
  const magnet=S.gear.eq.amulet==='amu-magnet'?110:34;
  for(let i=LV.coinsArr.length-1;i>=0;i--){ const c=LV.coinsArr[i];
    const dx=(P.x+P.w/2)-c.x, dy=(P.y+P.h/2)-c.y, d=Math.hypot(dx,dy);
    if(d<magnet&&d>20){ c.x+=dx/d*3.2; c.y+=dy/d*3.2 }
    if(d<26){ LV.coinsArr.splice(i,1); addCoins(1,c.x,c.y) } }
  /* traps */
  LV.traps.forEach(t=>{ if(hits(P,t)) hurt(1) });
  /* monsters */
  LV.enemies.forEach(e=>{ if(!e.alive) return; const c=FOECFG[e.kind]; e.t+=dt*.04;
    if(e.kind!=='mimic'){ e.x+=e.dir*e.sp*dt; if(Math.abs(e.x-e.home)>110) e.dir*=-1; }
    if(c.fly) e.y=(GYTOP-115-(c.h-30))+Math.sin(e.t)*34;
    if(c.shoot){ e.cool-=dt; if(e.cool<=0&&Math.abs(e.x-P.x)<340){ e.cool=170; LV.shots=LV.shots||[];
        LV.shots.push({x:e.x,y:e.y+16,vx:P.x<e.x?-3.4:3.4,r:8}) } }
    if(hits(P,e)){
      if(P.vy>0&&P.y+P.h-P.vy*dt<=e.y+8){ P.vy=-9; fight(e); }
      else hurt(1);
    } });
  /* mage projectiles */
  (LV.shots||[]).forEach((s,i)=>{ s.x+=s.vx*dt;
    if(hits(P,{x:s.x-s.r,y:s.y-s.r,w:s.r*2,h:s.r*2})){ hurt(1); LV.shots.splice(i,1) }
    else if(s.x<camX-100||s.x>camX+VW+100) LV.shots.splice(i,1) });
  /* boss */
  const B=LV.boss;
  if(!B.dead&&!B.active&&P.x>B.x-420){ B.active=true; $('#bossbar').style.display='block';
    $('#bossname').textContent=B.name; $('#bossfill').style.width='100%'; Snd.boss(); Music.start(SESSION.world,true);
    shakeIt(10); toast('⚔️ '+B.name+' blocks your way!'); }
  if(B.active&&!B.dead){
    B.t+=dt*.03; if(B.inv>0) B.inv-=dt;
    B.y=GYTOP-B.h+Math.sin(B.t)*10;
    B.cool-=dt;
    if(B.cool<=0){ B.cool=110-SESSION.diff*18;
      const mode=rint(0,2);
      if(mode===0) B.shots.push({x:B.x,y:B.y+50,vx:P.x<B.x?-4.2:4.2,vy:0,r:14});
      else if(mode===1){ B.shots.push({x:B.x,y:B.y+20,vx:P.x<B.x?-3:3,vy:2.6,r:11}); }
      else { for(let i=0;i<3;i++) LV.rocks=(LV.rocks||[]).concat([{x:P.x+rint(-160,160),y:-30,vy:2.4+SESSION.diff,r:14}]); }
    }
    B.shots.forEach((s,i)=>{ s.x+=s.vx*dt; s.y+=(s.vy||0)*dt;
      if(hits(P,{x:s.x-s.r,y:s.y-s.r,w:s.r*2,h:s.r*2})){ hurt(1); B.shots.splice(i,1) }
      else if(s.x<camX-200||s.x>camX+VW+200||s.y>VH) B.shots.splice(i,1) });
    (LV.rocks||[]).forEach((r,i)=>{ r.y+=r.vy*dt;
      if(hits(P,{x:r.x-r.r,y:r.y-r.r,w:r.r*2,h:r.r*2})){ hurt(1); LV.rocks.splice(i,1) }
      else if(r.y>GYTOP) LV.rocks.splice(i,1) });
  }
  /* the finish also triggers on touch */
  if(LV.finishCd>0) LV.finishCd-=dt;
  if(LV.finish&&hits(P,LV.finish)&&!(LV.finishCd>0)){ LV.finishCd=110; tryFinish(); if(!LV) return; }
  /* magic barrier of the boss arena */
  if(B.active&&!B.dead){ const L1=B.x-430, L2=B.x+150;
    if(P.x<L1){P.x=L1; P.vx=0} if(P.x>L2){P.x=L2; P.vx=0} }
  /* particles, effects, camera shake */
  gameT+=dt;
  particles.forEach((p,i)=>{ p.x+=p.vx*dt; p.y+=p.vy*dt; p.vy+=(p.g==null?.28:p.g)*dt; p.life-=dt; if(p.life<=0) particles.splice(i,1) });
  fx.forEach((f,i)=>{ f.t+=dt; if(f.t>(f.k==='ring'?46:26)) fx.splice(i,1) });
  LV.enemies.forEach(e=>{ if(e.flash>0) e.flash-=dt });
  if(LV.jumpT>0){ LV.jumpT-=dt; if(LV.jumpT<=0){ LV.jumpT=0; LV.jumpMult=1; hud(); addFloat(P.x,P.y-20,'jump boost over','#9E95CF') }
    else if(Math.floor(LV.jumpT)%60===0) hud(); }
  if(shake>0) shake=Math.max(0,shake-.45*dt);
  if(fade<1) fade=Math.min(1,fade+.03*dt);
  updateWeather(dt);
  floats.forEach((f,i)=>{ f.y-=.7; f.life-=dt; if(f.life<=0) floats.splice(i,1) });
  /* camera */
  let target=P.x+P.w/2-VW/2;
  if(B.active&&!B.dead) target=clamp(target,B.x-VW+180,B.x-140);
  camX+=(clamp(target,0,LV.w-VW)-camX)*.12;
}
function attack(){
  if(LV.busy) return; P.atk=14; Snd.beep(700,.06,'square',.03,-200);
  const B=LV.boss;
  if(B.active&&!B.dead&&Math.abs((B.x+B.w/2)-(P.x+P.w/2))<180){ bossAttackTry(); return }
  /* the sword reaches in front of the player and a bit above/below, so bats and ghosts are hittable */
  const px=P.x+P.w/2, py=P.y+P.h/2;
  const inReach=e=>{ const dx=((e.x+e.w/2)-px)*P.face, dy=(e.y+e.h/2)-py;
    return dx>-46 && dx<ATTACK_REACH && Math.abs(dy)<ATTACK_HEIGHT; };
  const list=LV.enemies.filter(e=>e.alive&&inReach(e))
    .sort((a,b)=>Math.hypot(a.x-px,a.y-py)-Math.hypot(b.x-px,b.y-py));
  if(list[0]) fight(list[0]);
}
let prevE=0,prevA=0,prevQ=0,prevS=0;
let busySince=0;
function loopStep(now){
  if(!LV) return;
  const dt=clamp((now-lastT)/16.67,.2,2.6); lastT=now;
  const eDown=K.KeyE||touchState.e, aDown=K.KeyF||K.KeyJ||touchState.a, qDown=K.KeyQ||touchState.q;
  const sDown=K.ShiftLeft||K.ShiftRight||K.KeyC||touchState.s;
  if(eDown&&!prevE) interact();
  if(aDown&&!prevA) attack();
  if(qDown&&!prevQ) useFieldBoost();
  if(sDown&&!prevS) superJump();
  prevE=eDown; prevA=aDown; prevQ=qDown; prevS=sDown;
  /* watchdog: locked with no dialog on screen for three real seconds means something went wrong.
     Real time, not frames — a fast or slow machine must not change when this fires. */
  if(LV&&LV.busy&&!$('#m-question').classList.contains('on')&&!$('#m-quest').classList.contains('on')){
    const real=(window.performance&&performance.now)?performance.now():Date.now();
    if(!busySince) busySince=real;
    else if(real-busySince>3000){ busySince=0; unstick('watchdog'); toast('Recovered — carry on') }
  } else busySince=0;
  update(dt);
  if(!LV) return;            /* the level can end inside update — nothing left to draw */
  draw(); netTick();
}
function loop(now){ if(!running) return; loopStep(now); requestAnimationFrame(loop); }
