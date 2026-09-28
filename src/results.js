/* =====================================================================
   9. PAUSE, GAME OVER, RESULTS
   ===================================================================== */
function togglePause(){
  if(!LV||LV.busy||!running) return;
  LV.paused=!LV.paused;
  const M=$('#m-pause');
  if(LV.paused){ M.classList.add('on');
    $('#pause-card').innerHTML='<h2 style="margin-bottom:8px">Paused</h2>'+
      '<div class="qsub">'+LV.world.n+' · '+DIFF[SESSION.diff].n+'</div>'+
      '<div class="kv"><span>Mission</span><b>'+missionShort()+'</b></div>'+
      '<div class="kv"><span>Progress</span><b>'+missionProgress()+'</b></div>'+
      '<div class="kv"><span>Coins</span><b>'+LV.coins+' / '+LV.needCoins+'</b></div>'+
      '<div class="kv"><span>Accuracy</span><b>'+acc()+'%</b></div>'+
      '<div class="row" style="margin-top:16px">'+
      '<button class="pill gold" id="p-res">▶ Resume</button>'+
      '<button class="pill" id="p-re">↻ Restart level</button>'+
      '<button class="pill" id="p-exit">✕ Quit to menu</button></div>';
    $('#p-res').onclick=togglePause;
    $('#p-re').onclick=()=>{M.classList.remove('on'); startLevel(SESSION.world,SESSION.diff)};
    $('#p-exit').onclick=()=>{M.classList.remove('on'); running=false; LV=null; Music.stop(); show('menu')};
    Music.stop();
  } else { M.classList.remove('on'); Music.start(SESSION.world,LV.boss&&LV.boss.active&&!LV.boss.dead) }
}
function acc(){ const t=LV.stats.ok+LV.stats.bad; return t?Math.round(LV.stats.ok/t*100):100 }
function gameOver(){
  running=false; Music.stop(); Snd.lose();
  const M=$('#m-pause'); M.classList.add('on');
  $('#pause-card').innerHTML='<h2>Out of hearts</h2><p class="qsub">Not a defeat — just a hint that a few topics need more practice.</p>'+
    '<div class="kv"><span>Correct answers</span><b>'+LV.stats.ok+'</b></div>'+
    '<div class="kv"><span>Mistakes</span><b>'+LV.stats.bad+'</b></div>'+
    '<div class="row" style="margin-top:16px"><button class="pill gold" id="go-re">↻ Try again</button>'+
    '<button class="pill" id="go-exit">✕ Menu</button></div>';
  $('#go-re').onclick=()=>{M.classList.remove('on'); startLevel(SESSION.world,SESSION.diff)};
  $('#go-exit').onclick=()=>{M.classList.remove('on'); LV=null; Music.stop(); show('menu')};
}
function finishLevel(){
  running=false; Music.stop(); fade=0;
  const time=Math.round((Date.now()-LV.startedAt)/1000);
  const a=acc();
  let stars=1;
  if(LV.coins>=LV.needCoins*1.3&&a>=70) stars=2;
  if(LV.coins>=LV.needCoins*1.6&&a>=85&&LV.stats.bad<=2) stars=3;
  const earned=Math.round(LV.coins*(1+stars*.25));
  S.coins+=earned;
  const prev=S.stars[SESSION.world]||0;
  if(stars>prev){ S.stats.stars+=(stars-prev); S.stars[SESSION.world]=stars; }
  S.stats.levels++; if(LV.stats.bad===0) S.stats.perfect++;
  if(LV.hearts===1) S.stats.comeback++;
  if(SESSION.diff===2&&LV.stats.boostsUsed===0) S.stats.noHelpHard++;
  if(SESSION.mode==='adventure'&&SESSION.world+1>=S.unlocked&&SESSION.world+1<WORLDS.length) S.unlocked=SESSION.world+2;
  checkAch(); save(); Snd.win();
  if(NET.on&&NET.mate){ NET.results.me={time,coins:LV.coins,ok:LV.stats.ok,bad:LV.stats.bad,acc:a,stars};
    NET.send({t:'fin',time,coins:LV.coins,ok:LV.stats.ok,bad:LV.stats.bad,acc:a,stars}); }
  const mistakes=LV.mistakes.slice(0,6).map(m=>'<div class="kv"><span style="opacity:.8">'+m.q+'</span><b>'+m.a+'</b></div>').join('');
  $('#results-body').innerHTML=
    '<div class="topbar"><h2>Level complete</h2></div>'+
    '<div class="panel"><div class="starsbig">'+'⭐'.repeat(stars)+'☆'.repeat(3-stars)+'</div>'+
    '<div class="qsub" style="text-align:center">'+LV.world.n+' · '+DIFF[SESSION.diff].n+'</div>'+
    '<div class="kv"><span>Coins collected</span><b>'+LV.coins+' / '+LV.needCoins+'</b></div>'+
    '<div class="kv"><span>Correct answers</span><b>'+LV.stats.ok+'</b></div>'+
    '<div class="kv"><span>Mistakes</span><b>'+LV.stats.bad+'</b></div>'+
    '<div class="kv"><span>Accuracy</span><b>'+a+'%</b></div>'+
    '<div class="kv"><span>Best streak</span><b>'+LV.stats.best+'</b></div>'+
    '<div class="kv"><span>Monsters defeated</span><b>'+LV.stats.mobs+'</b></div>'+
    '<div class="kv"><span>Mini-quests</span><b>'+LV.quests+'</b></div>'+
    '<div class="kv"><span>Secrets found</span><b>'+LV.secrets+'</b></div>'+
    '<div class="kv"><span>Boosts used</span><b>'+LV.stats.boostsUsed+'</b></div>'+
    '<div class="kv"><span>Time</span><b>'+Math.floor(time/60)+' min '+(time%60)+' s</b></div>'+
    '<div class="kv"><span>Added to your purse</span><b>🪙 '+earned+'</b></div></div>'+
    (mistakes?'<div class="panel"><h3>🔁 Practise these next time</h3>'+mistakes+'</div>':'')+
    '<div class="row"><button class="pill gold" id="r-next">Next level →</button>'+
    '<button class="pill" id="r-re">↻ Play again</button>'+
    '<button class="pill" id="r-shop">🛒 Shop</button>'+
    '<button class="pill" id="r-menu">✕ Menu</button></div>';
  show('results');
  $('#r-next').onclick=()=>{ SESSION.world=Math.min(WORLDS.length-1,SESSION.world+1); show('brief') };
  $('#r-re').onclick=()=>startLevel(SESSION.world,SESSION.diff);
  $('#r-shop').onclick=()=>show('shop');
  $('#r-menu').onclick=()=>show('menu');
  if(NET.on&&NET.mate) setTimeout(netCheckFinish,60);
  LV=null;
}

/* ---- achievements & daily tasks ---- */
function checkAch(){
  ACHS.forEach(a=>{ if(!S.ach.includes(a.id)&&a.c(S.stats)){ S.ach.push(a.id); S.coins+=a.r; toast('🏆 '+a.n+' +'+a.r+'🪙',2600) } });
}
function todayKey(){ return new Date().toISOString().slice(0,10) }
function ensureDaily(){
  if(S.daily.date!==todayKey()){ S.daily={date:todayKey(),tasks:shuffle(DAILY_POOL).slice(0,3).map(t=>({id:t.id,p:0,done:false}))}; save() }
}
function daily(id,n){ ensureDaily(); const t=S.daily.tasks.find(t=>t.id===id); if(!t||t.done||!n) return;
  const def=DAILY_POOL.find(d=>d.id===id); t.p+=n;
  if(t.p>=def.goal){ t.done=true; S.coins+=def.r; toast('📅 Daily task complete +'+def.r+'🪙') } save(); }
