/* =====================================================================
   10. INTERFACE SCREENS
   ===================================================================== */
function crystalSVG(){
  const lit=Object.keys(S.stars).length;
  let sh='';
  for(let i=0;i<10;i++){ const a=i/10*Math.PI*2-Math.PI/2, r=86;
    const x=150+Math.cos(a)*r, y=150+Math.sin(a)*r;
    sh+='<polygon class="shard '+(i<lit?'':'off')+'" points="'+x+','+(y-26)+' '+(x+20)+','+y+' '+x+','+(y+26)+' '+(x-20)+','+y+'" fill="'+(i%2?'#38E1C8':'#7C5CFF')+'"/>';
  }
  return '<svg class="crystal" viewBox="0 0 300 300" width="100%" height="320" role="img" aria-label="Crystal of Words">'+
    '<circle cx="150" cy="150" r="58" fill="none" stroke="rgba(255,255,255,.14)" stroke-width="2"/>'+
    '<polygon points="150,86 196,150 150,214 104,150" fill="#FFC84A" opacity=".9"/>'+
    '<text x="150" y="160" text-anchor="middle" font-family="Unbounded" font-size="26" fill="#2A1B00">'+lit+'/10</text>'+sh+'</svg>';
}
function renderMenu(){
  ensureDaily();
  $('#menu-stats').innerHTML=
    (S.avatar||'🦊')+' <b>'+(S.name||'Player')+'</b> &nbsp; 🪙 <b>'+S.coins+'</b> coins &nbsp; ⭐ <b>'+S.stats.stars+'</b> stars &nbsp; 📘 <b>'+Object.keys(S.words).length+'</b> words in the backpack &nbsp; 🏆 <b>'+S.ach.length+'/'+ACHS.length+'</b>';
  $('#menu-art').innerHTML=crystalSVG();
}
function renderMap(){
  $('#worlds').innerHTML=WORLDS.map((w,i)=>{
    const lock=i>=S.unlocked, st=S.stars[i]||0;
    return '<div class="world '+(lock?'lock':'')+'" data-world="'+i+'" style="background:linear-gradient(140deg,'+w.sky[0]+','+w.sky[1]+')">'+
      '<div class="num">WORLD '+(i+1)+'</div><h3>'+w.n+'</h3><div class="sub">Boss: '+w.boss+'</div>'+
      '<div class="stars">'+(lock?'🔒':'⭐'.repeat(st)+'☆'.repeat(3-st))+'</div></div>';
  }).join('');
  $$('#worlds .world').forEach(el=>el.onclick=()=>{
    const i=+el.dataset.world; if(i>=S.unlocked){ toast('Finish the previous world first'); return }
    SESSION.world=i; SESSION.mode='adventure'; SESSION.pin=false; SESSION.seed=null; show('topics');
  });
}
function renderTopics(){
  const back=NET.on&&NET.fromLobby;
  const btn=$('#topics-next'); if(btn) btn.textContent=back?'← Back to the room':'Next: difficulty →';
  const hint=$('#topics-hint');
  if(hint) hint.textContent=back?'Choosing for room '+NET.code+' — your partner sees the change at once.':'';
  /* the course library sits above the chips: lessons, units and whole courses live there */
  const ls=$('#lib-summary'); if(ls) ls.textContent=libSummaryText();
  const lo=$('#lib-open'); if(lo) lo.onclick=()=>openLessons('topics');
  const lc=$('#lib-clear');
  if(lc){ lc.style.display=libCount().lessons?'':'none';
    lc.onclick=()=>{ libClearAll(); renderTopics(); toast('Course lessons cleared') } }
  const v=$('#vtopics'), g=$('#gtopics');
  const chip=(id,t,attr)=>'<div class="chip '+(SESSION.topics[attr].includes(id)?'sel':'')+'" data-'+attr+'="'+id+'">'+
      '<span class="box"><i>✓</i></span><span>'+t.n+(t.custom?' <span style="opacity:.55;font-size:11px">· my course</span>':'')+'</span></div>';
  const split=(bank,attr)=>{ const en=Object.entries(bank);
    const built=en.filter(([id])=>!isCustom(id)), mine=en.filter(([id])=>isCustom(id));
    return built.map(([id,t])=>chip(id,t,attr)).join('')+mine.map(([id,t])=>chip(id,t,attr)).join('') };
  v.innerHTML=split(WORDBANK,'v');
  g.innerHTML=split(GRAMMARBANK,'g');
  $$('[data-v]',v).forEach(el=>el.onclick=()=>{ const id=el.dataset.v; const i=SESSION.topics.v.indexOf(id);
    i<0?SESSION.topics.v.push(id):SESSION.topics.v.splice(i,1); el.classList.toggle('sel'); counts() });
  $$('[data-g]',g).forEach(el=>el.onclick=()=>{ const id=el.dataset.g; const i=SESSION.topics.g.indexOf(id);
    i<0?SESSION.topics.g.push(id):SESSION.topics.g.splice(i,1); el.classList.toggle('sel'); counts() });
  $('#presets').innerHTML=Object.keys(S.presets).map(n=>'<button class="pill" data-preset="'+n+'">📂 '+n+'</button>').join('')||'<span class="muted">No saved presets yet</span>';
  $$('[data-preset]').forEach(b=>b.onclick=()=>{ const p=S.presets[b.dataset.preset];
    SESSION.topics.v=[...p.v]; SESSION.topics.g=[...p.g]; renderTopics(); toast('Preset loaded') });
  counts();
  function counts(){ $('#vcount').textContent='· '+SESSION.topics.v.length+' selected'; $('#gcount').textContent='· '+SESSION.topics.g.length+' selected';
    S.topics={v:[...SESSION.topics.v],g:[...SESSION.topics.g]}; save(); }
}
function renderDiff(){
  $('#diffs').innerHTML=DIFF.map(d=>'<div class="dcard '+(SESSION.diff===d.id?'sel':'')+'" data-d="'+d.id+'">'+
    '<h3>'+d.n+'</h3><div class="muted">'+d.time+' per level</div><ul>'+
    '<li>'+d.opts+' answer options</li><li>blocks: '+d.blocks[0]+'–'+d.blocks[1]+'</li>'+
    '<li>monsters: '+d.mobs[0]+'–'+d.mobs[1]+' (strong: '+d.strong[0]+'–'+d.strong[1]+')</li>'+
    '<li>mini-quests: '+d.quests+'</li><li>coins needed: '+d.coins+'</li><li>hearts: '+d.hearts+'</li>'+
    '<li>'+(d.timer?d.timer+'-second answer timer':'no answer timer')+'</li>'+
    '<li>'+(d.hint?'pictures and extra clues':'clues and typing tasks, fewer hints')+'</li></ul></div>').join('');
  $$('#diffs .dcard').forEach(el=>el.onclick=()=>{ SESSION.diff=+el.dataset.d; S.diff=SESSION.diff; save(); renderDiff() });
  const o=opt();
  $('#answer-modes').innerHTML=ANSWER_MODES.map(m=>
    '<div class="dcard '+(o.answer===m.id?'sel':'')+'" data-am="'+m.id+'" style="padding:14px">'+
    '<h3 style="font-size:16px">'+m.n+'</h3><p class="muted" style="margin:8px 0 0;font-size:12.5px;line-height:1.5">'+m.d+'</p></div>').join('');
  $$('[data-am]').forEach(el=>el.onclick=()=>{ o.answer=el.dataset.am; save(); renderDiff() });
  $('#emoji-opt').innerHTML=
    '<button class="pill '+(o.emoji!==false?'gold':'')+'" data-em="1">🖼️ Show pictures</button>'+
    '<button class="pill '+(o.emoji===false?'gold':'')+'" data-em="0">🚫 Words only</button>';
  $$('[data-em]').forEach(b=>b.onclick=()=>{ o.emoji=b.dataset.em==='1'; save(); renderDiff() });
}
function renderBrief(){
  const W=WORLDS[SESSION.world], D=DIFF[SESSION.diff];
  $('#brief-box').innerHTML='<div class="eyebrow">World '+(SESSION.world+1)+'</div><h2>'+W.n+'</h2>'+
    '<div class="kv"><span>Main mission</span><b>'+(W.mission==='key'?'Find the golden key and free the wizard':'Collect 3 crystal shards')+'</b></div>'+
    '<div class="kv"><span>Boss</span><b>'+W.boss+'</b></div>'+
    '<div class="kv"><span>Difficulty</span><b>'+D.n+' · '+D.time+'</b></div>'+
    '<div class="kv"><span>Answers</span><b>'+(ANSWER_MODES.find(m=>m.id===answerMode())||ANSWER_MODES[1]).n+
      ' · '+(useEmoji()?'pictures on':'words only')+'</b></div>'+
    '<div class="kv"><span>Coins needed</span><b>🪙 '+D.coins+'</b></div>'+
    '<div class="kv"><span>Vocabulary topics</span><b>'+(SESSION.topics.v.map(t=>WORDBANK[t].n).join(', ')||'—')+'</b></div>'+
    '<div class="kv"><span>Grammar topics</span><b>'+(SESSION.topics.g.map(t=>GRAMMARBANK[t].n).join(', ')||'—')+'</b></div>'+
    '<p class="muted" style="margin-top:12px">Controls: A/D or ←→ to move, Space to jump, <b>Shift or C for a super jump (5 flights per level)</b>, F to attack, E to interact, Q to use a boost, Esc to pause. Out of coins? Go back to a rune stone 💠 and answer more questions — they never run out.<br><br>On a phone or tablet: the left stick moves (a light push walks, a full push runs, and pushing it <b>up</b> also jumps), ⤴ jumps, ⚔ attacks, 🚀 is the super jump. You can slide your thumb straight from one button to another. Buttons too low or too small? Settings → <b>Button height</b> and <b>Button size</b>.</p>';
  $('#brief-gear').innerHTML=GEAR.filter(g=>S.gear.owned.includes(g.id)).map(g=>
    '<div class="item"><div class="ic">'+g.ic+'</div><h4>'+g.n+'</h4><p>'+g.d+'</p>'+
    '<button class="'+(S.gear.eq[g.slot]===g.id?'eq':'')+'" data-eq="'+g.id+'">'+(S.gear.eq[g.slot]===g.id?'Equipped':'Equip')+'</button></div>').join('')
    +'<div class="item"><div class="ic">🛒</div><h4>More equipment</h4><p>Buy new items for coins in the shop.</p><button data-go2="shop">Go to shop</button></div>';
  $$('[data-eq]').forEach(b=>b.onclick=()=>{ const g=GEAR.find(x=>x.id===b.dataset.eq);
    S.gear.eq[g.slot]=S.gear.eq[g.slot]===g.id?null:g.id; save(); renderBrief() });
  $$('[data-go2]').forEach(b=>b.onclick=()=>show('shop'));
  $('#brief-boosts').innerHTML=Object.entries(BOOSTS).map(([id,b])=>{
    const n=S.boosts[id]||0, inSlot=S.slots.includes(id);
    return '<div class="item" style="'+(n?'':'opacity:.45')+'"><div class="ic">'+b.ic+'</div><h4>'+b.n+' ×'+n+'</h4><p>'+b.d+'</p>'+
      '<button class="'+(inSlot?'eq':'')+'" data-slot="'+id+'">'+(inSlot?'In slot':'Put in slot')+'</button></div>' }).join('');
  $$('[data-slot]').forEach(b=>b.onclick=()=>{ const id=b.dataset.slot; const i=S.slots.indexOf(id);
    if(i>=0) S.slots.splice(i,1);
    else { if(S.slots.length>=3){ toast('Only 3 boosts fit in your slots'); return } if(!S.boosts[id]){ toast('Buy this boost first'); return } S.slots.push(id) }
    save(); renderBrief() });
}
/* Previews are cropped from the same recoloured sheet the game draws, so what you pick
   is exactly what you play as. Each one is cut once and cached as a small image. */
const PREVIEW={};
function heroPreview(id,size){
  const s=size||64, H=heroSheet(id);
  if(!H) return '<div style="font-size:'+Math.round(s*.6)+'px;line-height:'+s+'px">🧙</div>';
  if(!PREVIEW[id]){
    try{
      const f=H.meta.idle, c=document.createElement('canvas');
      c.width=f[2]; c.height=f[3];
      c.getContext('2d').drawImage(H.img,f[0],f[1],f[2],f[3],0,0,f[2],f[3]);
      PREVIEW[id]=c.toDataURL('image/png');
    }catch(e){ return '<div style="font-size:'+Math.round(s*.6)+'px;line-height:'+s+'px">🧙</div>' }
  }
  return '<img src="'+PREVIEW[id]+'" alt="'+esc(heroDef(id).n)+'" style="height:'+s+'px;display:block;margin:0 auto">';
}
function renderHero(){
  /* opened from a room: the way out leads back to the room, not to the menu */
  const bb=$('#s-hero .back'), inRoom=NET.on&&NET.fromRoom;
  if(bb){ bb.dataset.go=inRoom?'online':'menu'; bb.textContent=inRoom?'← Back to the room':'← Menu' }
  const nm=$('#hr-name');
  nm.value=S.name||'';
  nm.oninput=()=>{ S.name=nm.value.slice(0,16); save(); netMe() };
  $('#hr-avatars').innerHTML=AVATARS.map(a=>
    '<button class="pill '+(S.avatar===a?'gold':'')+'" data-av="'+a+'" style="font-size:22px;padding:8px 12px">'+a+'</button>').join('');
  $$('[data-av]').forEach(b=>b.onclick=()=>{ S.avatar=b.dataset.av; save(); netMe(); renderHero(); renderMenu() });
  $('#hr-heroes').innerHTML=HEROES.map(h=>
    '<div class="item" style="align-items:center;text-align:center">'+heroPreview(h.id,h.mentor?86:72)+
    '<h4>'+h.n+(h.mentor?' <span class="badge learning">teacher</span>':'')+'</h4><p>'+h.d+'</p>'+
    '<button class="'+(S.hero===h.id?'eq':'')+'" data-hero="'+h.id+'">'+(S.hero===h.id?'Selected':'Play as '+h.n)+'</button></div>').join('');
  $$('[data-hero]').forEach(b=>b.onclick=()=>{ S.hero=b.dataset.hero; save(); netMe(); renderHero(); toast('Hero: '+heroDef(S.hero).n) });
}

function renderShop(){
  $('#shop-coins').textContent='🪙 '+S.coins;
  $('#shop-gear').innerHTML=GEAR.map(g=>{ const own=S.gear.owned.includes(g.id);
    return '<div class="item"><div class="ic">'+g.ic+'</div><h4>'+g.n+'</h4><p>'+g.d+'</p>'+
      '<button class="'+(own?(S.gear.eq[g.slot]===g.id?'eq':'own'):'')+'" data-buy="'+g.id+'">'+
      (own?(S.gear.eq[g.slot]===g.id?'Equipped':'Equip'):'🪙 '+g.price)+'</button></div>' }).join('');
  $$('[data-buy]').forEach(b=>b.onclick=()=>{ const g=GEAR.find(x=>x.id===b.dataset.buy);
    if(!S.gear.owned.includes(g.id)){ if(S.coins<g.price){toast('Not enough coins');return}
      S.coins-=g.price; S.gear.owned.push(g.id); toast('Bought: '+g.n); }
    S.gear.eq[g.slot]=g.id; save(); renderShop() });
  $('#shop-boosts').innerHTML=Object.entries(BOOSTS).map(([id,b])=>
    '<div class="item"><div class="ic">'+b.ic+'</div><h4>'+b.n+' ×'+(S.boosts[id]||0)+'</h4><p>'+b.d+'</p>'+
    '<button data-bb="'+id+'">🪙 '+b.price+'</button></div>').join('');
  $$('[data-bb]').forEach(el=>el.onclick=()=>{ const id=el.dataset.bb, b=BOOSTS[id];
    if(S.coins<b.price){toast('Not enough coins');return}
    S.coins-=b.price; S.boosts[id]=(S.boosts[id]||0)+1;
    if(S.slots.length<3&&!S.slots.includes(id)) S.slots.push(id);
    save(); renderShop(); toast('Bought: '+b.n) });
}
let bpFilter='all';
function renderBackpack(){
  const F=[['all','All'],['new','New'],['learning','Learning'],['hard','Difficult'],['done','Learned']];
  $('#bp-filters').innerHTML=F.map(([id,n])=>'<button class="pill '+(bpFilter===id?'gold':'')+'" data-f="'+id+'">'+n+'</button>').join('')+
    '<button class="pill" data-f="practice">▶ Practise difficult words</button>';
  $$('[data-f]').forEach(b=>b.onclick=async()=>{ if(b.dataset.f==='practice') return practiceHard();
    bpFilter=b.dataset.f; renderBackpack() });
  const list=Object.entries(S.words).map(([en,v])=>({en,...v}))
    .filter(w=>bpFilter==='all'||w.status===bpFilter)
    .sort((a,b)=>(b.w||0)-(a.w||0));
  $('#bp-list').innerHTML=list.length?list.map(w=>{
    const cls={new:'new',learning:'learning',hard:'hard',done:'done'}[w.status||'new'];
    const nm={new:'New',learning:'Learning',hard:'Difficult',done:'Learned'}[w.status||'new'];
    const info=w.def?w.def:(w.topic&&WORDBANK[w.topic]?'Topic: '+WORDBANK[w.topic].n:'');
    return '<div class="wordrow"><button class="pill" data-say="'+w.en+'">🔊</button><span class="en">'+w.en+'</span>'+
      '<span class="ua">'+(w.ic?w.ic+' ':'')+info+'</span>'+
      '<span class="muted">✅'+(w.c||0)+' ❌'+(w.w||0)+'</span><span class="badge '+cls+'">'+nm+'</span></div>' }).join('')
    : '<p class="muted">Every word you meet in the game appears here. Finish your first level and the backpack starts filling up.</p>';
  $$('[data-say]').forEach(b=>b.onclick=()=>speak(b.dataset.say));
}
async function practiceHard(){
  const hard=Adapt.hardWords(); if(hard.length<3){ toast('Not enough difficult words yet — keep playing'); return }
  LV={boosts:{},stats:{ok:0,bad:0,streak:0,best:0,boostsUsed:0},mistakes:[],hearts:3,coins:0,review:true,busy:false};
  for(let i=0;i<Math.min(8,hard.length);i++){
    const w=WORDS_FLAT.find(x=>x.en===hard[i].en); if(!w) continue;
    const saveT=[...SESSION.topics.v]; SESSION.topics.v=[w.topic];
    const AM=answerMode();
    const ft = AM==='typing' ? 'letters'
             : w.def ? 'def'
             : (w.ic&&useEmoji()) ? 'name' : 'listen';
    const q=QM.vocab(w.lv,ft); 
    q.time=0;
    await ask(q); SESSION.topics.v=saveT; S.stats.reviewed++;
  }
  S.coins+=15; save(); daily('d-rev',8); toast('Review finished +15🪙'); LV=null; renderBackpack();
}
function renderAch(){
  ensureDaily();
  $('#daily').innerHTML=S.daily.tasks.map(t=>{ const d=DAILY_POOL.find(x=>x.id===t.id);
    return '<div class="kv"><span>'+(t.done?'✅ ':'')+d.n+'</span><b>'+Math.min(t.p,d.goal)+'/'+d.goal+' · +'+d.r+'🪙</b></div>' }).join('');
  $('#achs').innerHTML=ACHS.map(a=>{ const got=S.ach.includes(a.id);
    return '<div class="item" style="'+(got?'':'opacity:.5')+'"><div class="ic">'+(got?'🏆':'🔒')+'</div><h4>'+a.n+'</h4><p>'+a.d+'</p>'+
      '<span class="badge '+(got?'done':'')+'">'+(got?'Unlocked':'+'+a.r+' coins')+'</span></div>' }).join('');
}
function renderTeacher(){
  const hardV=Adapt.hardTopics('v').slice(0,5).map(t=>WORDBANK[t].n).join(', ')||'—';
  const hardG=Adapt.hardTopics('g').slice(0,5).map(t=>GRAMMARBANK[t]?GRAMMARBANK[t].n:t).join(', ')||'—';
  const st=S.stats, total=st.vocOk+st.vocBad+st.gramOk+st.gramBad;
  $('#teacher-box').innerHTML='<p class="muted">This is a working frame for Teacher Mode. The game already collects all the statistics, so adding classes and a cloud database (Supabase or Firebase) will not change the game logic.</p>'+
   '<h3 style="margin:16px 0 8px">Student statistics</h3>'+
   '<div class="kv"><span>Levels finished</span><b>'+st.levels+'</b></div>'+
   '<div class="kv"><span>Vocabulary: correct / wrong</span><b>'+st.vocOk+' / '+st.vocBad+'</b></div>'+
   '<div class="kv"><span>Grammar: correct / wrong</span><b>'+st.gramOk+' / '+st.gramBad+'</b></div>'+
   '<div class="kv"><span>Overall accuracy</span><b>'+(total?Math.round((st.vocOk+st.gramOk)/total*100):0)+'%</b></div>'+
   '<div class="kv"><span>Words in the backpack</span><b>'+Object.keys(S.words).length+'</b></div>'+
   '<div class="kv"><span>Weak vocabulary topics</span><b>'+hardV+'</b></div>'+
   '<div class="kv"><span>Weak grammar topics</span><b>'+hardG+'</b></div>'+
   '<h3 style="margin:16px 0 8px">Homework</h3>'+
   '<p class="muted">Pick the topics and difficulty first, then create a code here. The code carries the topics, the difficulty and the level seed, so every student plays the <b>identical</b> level — same blocks, same monsters, same boss.</p>'+
   '<div class="row"><button class="pill gold" id="t-make">Create an assignment code</button></div><div id="t-out" class="muted" style="margin-top:10px"></div>'+
   '<h3 style="margin:18px 0 8px">Open an assignment</h3>'+
   '<p class="muted">Students paste the code from their teacher here.</p>'+
   '<input id="t-in" class="qinput" style="text-align:left;font-size:13px;letter-spacing:0;margin-top:8px" placeholder="paste the assignment code">'+
   '<button class="pill gold" id="t-load" style="margin-top:10px">Load and play</button>';
  $('#t-make').onclick=()=>{
    const seed='hw'+Date.now().toString(36);
    const payload={v:SESSION.topics.v,g:SESSION.topics.g,d:SESSION.diff,w:SESSION.world,s:seed,o:opt()};
    /* custom lessons travel with the code so a student without the course can still play it */
    const used=[...SESSION.topics.v,...SESSION.topics.g].filter(k=>isCustom(k)&&!isShipped(k));
    if(used.length) payload.c=used.map(k=>({k,n:(WORDBANK[k]||GRAMMARBANK[k]).n,
      lv:WORDBANK[k]?WORDBANK[k].lv[0]:null, q:GRAMMARBANK[k]?GRAMMARBANK[k].q[0]:null}));
    SESSION.seed=seed; SESSION.pin=true;     /* the teacher plays the very same level */
    const code=btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
    S.presets['Homework '+new Date().toLocaleDateString('en-GB')]={v:[...SESSION.topics.v],g:[...SESSION.topics.g]}; save();
    $('#t-out').innerHTML='Assignment code — every student who opens it gets the same level:<br>'+
      '<code style="word-break:break-all;user-select:all">'+code+'</code>';
  };
  $('#t-load').onclick=()=>{
    try{
      const d=JSON.parse(decodeURIComponent(escape(atob(($('#t-in').value||'').trim()))));
      (d.c||[]).forEach(e=>{ if(e.lv) WORDBANK[e.k]={n:e.n,custom:true,lv:[e.lv,e.lv,e.lv]};
                             if(e.q)  GRAMMARBANK[e.k]={n:e.n,custom:true,q:[e.q,e.q,e.q]} });
      if(d.c&&d.c.length) rebuildWords();
      SESSION.topics.v=d.v||SESSION.topics.v; SESSION.topics.g=d.g||SESSION.topics.g;
      SESSION.diff=d.d||0; SESSION.world=d.w||0; SESSION.seed=d.s||null; SESSION.pin=!!d.s; SESSION.mode='homework';
      if(d.o) S.opts={emoji:d.o.emoji!==false, answer:d.o.answer||'mixed'};   /* the teacher's task format too */
      toast('Assignment loaded — same level for everyone'); show('brief');
    }catch(e){ toast('That code could not be read') }
  };
}
function renderSettings(){
  $('#settings-box').innerHTML=
   '<div class="kv"><span>Sound effects</span><button class="pill" id="set-snd">'+(S.settings.sound?'On':'Off')+'</button></div>'+
   '<div class="kv"><span>Music</span><button class="pill" id="set-mus">'+(S.settings.music?'On':'Off')+'</button></div>'+
   '<div class="kv"><span>Volume</span><button class="pill" id="set-vol">'+({off:'Muted',low:'Low',mid:'Medium',high:'High'})[S.settings.volume||'mid']+'</button></div>'+
   '<div class="kv"><span>On-screen buttons</span><button class="pill" id="set-touch">'+({auto:'Auto',on:'Always',off:'Never'})[S.settings.touch]+'</button></div>'+
   '<div class="kv"><span>Button height</span><button class="pill" id="set-lift">'+
     ({low:'Low',mid:'Raised',high:'High',huge:'Very high'})[S.settings.lift||'mid']+'</button></div>'+
   '<div class="kv"><span>Button size</span><button class="pill" id="set-tsize">'+
     ({s:'Small',m:'Normal',l:'Large',xl:'Extra large'})[S.settings.tsize||'m']+'</button></div>'+
   '<div class="kv"><span>Progress</span><button class="pill" id="set-reset">Reset everything</button></div>'+
   '<p class="muted" style="margin-top:12px">Progress is saved in the localStorage of this browser. Supabase or Firebase can be added later for classes and syncing between devices.</p>';
  $('#set-snd').onclick=()=>{S.settings.sound=!S.settings.sound; save(); renderSettings()};
  $('#set-mus').onclick=()=>{S.settings.music=!S.settings.music; save();
    if(S.settings.music&&LV&&running) Music.start(SESSION.world,LV.boss&&LV.boss.active&&!LV.boss.dead); else Music.stop(); renderSettings()};
  $('#set-vol').onclick=()=>{const o=['off','low','mid','high']; S.settings.volume=o[(o.indexOf(S.settings.volume||'mid')+1)%4];
    save(); Snd.setVolume(); Snd.coin(); renderSettings()};
  $('#set-touch').onclick=()=>{const o=['auto','on','off']; S.settings.touch=o[(o.indexOf(S.settings.touch)+1)%3]; save(); updateTouchVisibility(); renderSettings()};
  $('#set-lift').onclick=()=>{const o=['low','mid','high','huge'];
    S.settings.lift=o[(o.indexOf(S.settings.lift||'mid')+1)%4]; save(); applyPadStyle(); renderSettings()};
  $('#set-tsize').onclick=()=>{const o=['s','m','l','xl'];
    S.settings.tsize=o[(o.indexOf(S.settings.tsize||'m')+1)%4]; save(); applyPadStyle(); renderSettings()};
  $('#set-reset').onclick=()=>{ if(confirm('Reset all progress?')){ localStorage.removeItem(KEY); S=load(); renderSettings(); toast('Progress reset') } };
}
