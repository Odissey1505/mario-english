/* =====================================================================
   ONLINE PLAY — two players, one level
   Two modes:
     race  — the same level for both, side by side, first to finish wins
     coop  — one shared goal: coins, mission items and the boss are pooled,
             and a wrong answer can be handed to your partner to rescue
   Transport is Supabase Realtime (the user's own free project). Everything below
   goes through NET.send / NET.onMsg, so another transport can be dropped in.
   ===================================================================== */
/* ---------- transport: a plain WebSocket straight to Supabase Realtime ----------
   Supabase Realtime speaks the Phoenix channel protocol over one socket, so the game talks to
   it directly instead of pulling a library from a CDN. That keeps the game a single file and
   lets online play work even from a local file, where a CDN module import would be blocked.
   Presence is handled by the game itself (a small "hi" beat), so nothing here depends on
   server-side presence behaviour. */
/* The game ships with its own Supabase project, so a student just opens the page and plays.
   This is the anon public key, which is designed to sit in client code; it can only reach
   Realtime channels. Anyone can put their own project in Play Together → Server instead. */
const NET_DEFAULT={url:'https://yhekszqxheljbxoucalt.supabase.co',
  key:'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InloZWtzenF4aGVsamJ4b3VjYWx0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MTE1NTIsImV4cCI6MjA5MDE4NzU1Mn0.cHUU9AFy2yUnfHXjqYTidmXaN6s3ybl0gi7U11eP4bY'};
function netCfg(){ const c=S.net||{}; return {url:c.url||NET_DEFAULT.url, key:c.key||NET_DEFAULT.key} }
function realtimeURL(base,key){
  const host=String(base||'').trim().replace(/^https?:\/\//,'').replace(/\/+$/,'');
  return 'wss://'+host+'/realtime/v1/websocket?apikey='+encodeURIComponent(key)+'&vsn=1.0.0';
}
class Realtime{
  constructor(url,topic){ this.url=url; this.topic='realtime:'+topic; this.ref=0; this.ws=null;
    this.onEvent=()=>{}; this.onState=()=>{}; this.beat=null; this.joined=false; }
  next(){ return String(++this.ref) }
  push(event,payload){
    if(!this.ws||this.ws.readyState!==1) return;
    this.ws.send(JSON.stringify({topic:this.topic,event,payload:payload||{},ref:this.next()}));
  }
  connect(){
    return new Promise(resolve=>{
      let settled=false;
      const done=v=>{ if(!settled){ settled=true; resolve(v) } };
      let ws; try{ ws=new WebSocket(this.url) }catch(e){ return done(false) }
      this.ws=ws;
      const timer=setTimeout(()=>{ if(!this.joined){ try{ws.close()}catch(e){} done(false) } },9000);
      ws.onopen=()=>{
        this.push('phx_join',{config:{broadcast:{self:false,ack:false},presence:{key:''}}});
        this.beat=setInterval(()=>{
          if(ws.readyState===1) ws.send(JSON.stringify({topic:'phoenix',event:'heartbeat',payload:{},ref:this.next()}));
        },25000);
      };
      ws.onmessage=e=>{
        let m; try{ m=JSON.parse(e.data) }catch(err){ return }
        if(m.event==='phx_reply'&&m.topic===this.topic){
          if(m.payload&&m.payload.status==='ok'){ this.joined=true; clearTimeout(timer); this.onState('joined'); done(true) }
          else { clearTimeout(timer); this.onState('rejected'); done(false) }
          return;
        }
        if(m.event==='broadcast'&&m.payload&&m.payload.payload) this.onEvent(m.payload.payload);
        if(m.event==='phx_error'||m.event==='phx_close'){ this.onState('closed') }
      };
      ws.onerror=()=>{ clearTimeout(timer); this.onState('error'); done(false) };
      ws.onclose=()=>{ clearInterval(this.beat); this.joined=false; this.onState('closed'); done(false) };
    });
  }
  send(obj){ this.push('broadcast',{type:'broadcast',event:'m',payload:obj}) }
  close(){ clearInterval(this.beat); this.joined=false; try{ this.ws&&this.ws.close() }catch(e){} }
}

const NET={
  on:false, role:'', code:'', mode:'race', rt:null, plan:null,
  mate:null, mateState:null, lastSend:0, lastSig:'', buf:[], gap:120, status:'', lastHeard:0, hiTimer:null,
  results:{}, pendingHelp:null, helpFor:null, invited:false, fromRoom:false,
  me(){ return {name:S.name||'Player', avatar:S.avatar||'🦊', hero:S.hero} },
  log(m){ this.status=m; if($('#s-online').classList.contains('on')) renderOnline() },
  async connect(code,role,mode){
    const cfg=netCfg();
    if(!cfg.url||!cfg.key){ toast('Add a Supabase link and key in Server settings'); return false }
    this.log('Connecting…');
    this.code=code; this.role=role; this.mode=mode; this.mate=null; this.mateState=null; this.buf=[]; this.results={};
    this.rt=new Realtime(realtimeURL(cfg.url,cfg.key),'cow-'+code);
    this.rt.onEvent=m=>this.onMsg(m);
    this.rt.onState=st=>{ if(st==='closed'&&this.on){ this.on=false; this.mate=null;
        this.log('The connection dropped. You can keep playing on your own.'); toast('Connection lost — carrying on solo') } };
    const ok=await this.rt.connect();
    if(!ok){ this.log('Could not reach the server. Check the project link and the anon key, and that the project is not paused.'); return false }
    this.on=true;
    /* own presence: a small beat, so a partner appears and disappears without server presence */
    clearInterval(this.hiTimer);
    this.hiTimer=setInterval(()=>{
      if(!this.on) return;
      this.send({t:'hi',role:this.role,...this.me()});
      if(this.mate&&Date.now()-this.lastHeard>7000){ this.mate=null; this.mateState=null; this.buf=[];
        this.log('Your partner left the room.'); toast('Your partner left — carry on solo'); hud() }
    },2000);
    this.send({t:'hi',role:this.role,...this.me()});
    this.log(role==='host'?('Room '+code+' is open. Share the code.'):('Joined room '+code+'.'));
    return true;
  },
  leave(){ try{ this.send({t:'bye'}) }catch(e){}
    clearInterval(this.hiTimer); if(this.rt) this.rt.close();
    this.on=false; this.rt=null; this.mate=null; this.mateState=null; this.buf=[]; this.code=''; this.results={};
    const mb=$('#mate'); if(mb) mb.style.display='none'; this.log(''); },
  send(m){ if(this.on&&this.rt) this.rt.send(m) },
  onMsg(m){
    if(!m||!m.t) return;
    if(m.t!=='bye') this.lastHeard=Date.now();
    switch(m.t){
      case 'hi': {
        if(m.role===this.role) return;                 /* ignore an echo of our own beat */
        const fresh=!this.mate;
        this.mate={name:m.name||'Player',avatar:m.avatar||'🙂',hero:m.hero||'azure'};
        if(!fresh&&$('#s-online').classList.contains('on')) renderOnline();   /* they changed hero or name */
        if(fresh){ this.log('Connected with '+this.mate.avatar+' '+this.mate.name);
          toast(this.mate.avatar+' '+this.mate.name+' joined');
          this.send({t:'hi',role:this.role,...this.me()});   /* answer so they see us straight away */
          if(this.role==='host') sendPlan();                 /* and show them what we are about to play */
        }
        break;
      }
      case 'cfg':                                   /* the host decides what both play */
        SESSION.world=m.world; SESSION.diff=m.diff; SESSION.seed=m.seed; SESSION.pin=true; NET.mode=m.mode;
        SESSION.topics.v=m.tv; SESSION.topics.g=m.tg;
        if(m.o) S.opts={emoji:m.o.emoji!==false, answer:m.o.answer||'mixed'};   /* both play the same format */
        (m.c||[]).forEach(e=>{ if(e.lv) WORDBANK[e.k]={n:e.n,custom:true,lv:[e.lv,e.lv,e.lv]};
                               if(e.q)  GRAMMARBANK[e.k]={n:e.n,custom:true,q:[e.q,e.q,e.q]} });
        if(m.c&&m.c.length) rebuildWords();
        toast('Host started the level'); startLevel(m.world,m.diff,{seed:m.seed});
        break;
      case 'lobby':                                /* the host tells the room what will be played */
        NET.plan={tv:m.tv,tg:m.tg,diff:m.diff,names:m.names,o:m.o};
        /* the host owns the task format too, so the guest already plays by it in the lobby */
        if(m.o) S.opts={emoji:m.o.emoji!==false, answer:m.o.answer||'mixed'};
        if($('#s-online').classList.contains('on')) renderOnline();
        break;
      case 'pos': netPos(m); break;
      case 'stat': NET.mateState=Object.assign(NET.mateState||{},m); hud(); break;
      case 'ev': netEvent(m); break;
      case 'help': netHelpRequest(m); break;
      case 'helped': netHelped(m); break;
      case 'fin': NET.results.mate=m; netCheckFinish(); break;
      case 'bye': NET.mate=null; NET.mateState=null; NET.buf=[]; toast('Your partner left'); hud(); break;
    }
  }
};
/* ---- shared world events (co-op) and score updates (race) ---- */
function netEvent(m){
  if(!LV) return;
  if(NET.mode!=='coop') return;
  if(m.k==='coin'){ LV.coins+=m.n; addFloat(P.x,P.y-30,'+'+m.n+'🪙 partner','#FFC84A') }
  if(m.k==='key'){ LV.hasKey=true; toast('Your partner found the golden key') }
  if(m.k==='shard'){ LV.shardsGot=Math.max(LV.shardsGot,m.n); toast('Partner found a crystal shard') }
  if(m.k==='boss'){ LV.boss.hp=Math.min(LV.boss.hp,m.n); $('#bossfill').style.width=(LV.boss.hp/LV.boss.maxhp*100)+'%';
    if(LV.boss.hp<=0){ LV.boss.dead=true; LV.bossDead=true; $('#bossbar').style.display='none'; toast('Partner finished the boss!') } }
  if(m.k==='freed'){ LV.freed=true; toast('Partner freed the wizard') }
  hud();
}
/* ---- co-op rescue: a wrong answer can be passed to your partner ---- */
function netHelpRequest(m){
  if(!LV||NET.mode!=='coop') return;
  NET.helpFor=m.id;
  const card=$('#quest-card'), M=$('#m-quest');
  M.classList.add('on');
  card.innerHTML='<div class="qtag">Your partner needs help</div>'+
    '<div class="qprompt">'+m.prompt+'</div><div class="qsub">'+(m.sub||'')+'</div><div class="opts" id="hv"></div>';
  const box=$('#hv',card);
  (m.options||[]).forEach((o,i)=>{ const b=document.createElement('button'); b.className='opt'; b.textContent=o;
    b.onclick=()=>{ const ok=i===m.correct;
      box.querySelectorAll('.opt').forEach((x,j)=>{ x.onclick=null; if(j===m.correct) x.classList.add('ok') });
      if(!ok) b.classList.add('bad');
      NET.send({t:'helped',id:m.id,ok});
      setTimeout(()=>{ M.classList.remove('on'); toast(ok?'You rescued your partner':'Not this time') },800);
      ok?Snd.good():Snd.bad(); };
    box.appendChild(b) });
  setTimeout(()=>{ if(NET.helpFor===m.id){ M.classList.remove('on'); NET.send({t:'helped',id:m.id,ok:false}) } },12000);
}
function netHelped(m){ if(NET.pendingHelp&&NET.pendingHelp.id===m.id) NET.pendingHelp.resolve(m.ok) }
function askPartner(q){
  if(!(NET.on&&NET.mate&&NET.mode==='coop')) return Promise.resolve(false);
  const id='h'+Date.now();
  NET.send({t:'help',id,prompt:q.prompt,sub:q.sub||'',options:q.options||[],correct:q.correct});
  return new Promise(res=>{
    NET.pendingHelp={id,resolve:v=>{ NET.pendingHelp=null; res(v) }};
    setTimeout(()=>{ if(NET.pendingHelp&&NET.pendingHelp.id===id){ NET.pendingHelp=null; res(false) } },13000);
  });
}
/* ---- the partner's position, smoothed ----
   Packets arrive every ~100 ms and the screen draws every ~16 ms, so painting the
   last packet where it landed makes the partner stand still and then teleport.
   Instead every packet is stamped with its arrival time and the ghost is drawn
   slightly in the past, gliding between the two samples that surround that moment. */
const MATE_DELAY=130;        /* how far behind live we render, in ms */
const MATE_EXTRA=200;        /* how long we may guess ahead after a missed packet */
function netPos(m){
  NET.mateState=Object.assign(NET.mateState||{},m);
  const now=(window.performance&&performance.now)?performance.now():Date.now();
  const b=NET.buf, last=b[b.length-1];
  if(last){ const d=now-last.t; if(d>30&&d<2000) NET.gap=NET.gap*.7+d*.3 }   /* learn the real rate */
  b.push({t:now,x:m.x,y:m.y,d:m.d,f:m.f,b:m.b,fly:m.fly});
  if(b.length>6) b.shift();
}
function mateAt(now){
  const b=NET.buf; if(!b.length) return null;
  const newest=b[b.length-1];
  const age=now-newest.t;
  /* nothing for a while: stop guessing, park the ghost and say so */
  if(age>1200) return {x:newest.x,y:newest.y,d:newest.d,f:newest.f,busy:newest.b,fly:newest.fly,stale:age};
  const want=now-Math.max(MATE_DELAY,NET.gap*1.3);
  if(want>=newest.t){                                    /* ahead of the last packet: glide on */
    const prev=b[b.length-2];
    let x=newest.x, y=newest.y;
    if(prev&&newest.t>prev.t){
      const k=Math.min(want-newest.t,MATE_EXTRA)/(newest.t-prev.t);
      x+=(newest.x-prev.x)*k; y+=(newest.y-prev.y)*k;
    }
    return {x,y,d:newest.d,f:newest.f,busy:newest.b,fly:newest.fly,stale:0};
  }
  for(let i=b.length-1;i>0;i--){
    const a=b[i-1], z=b[i];
    if(want>=a.t&&want<=z.t){
      const k=(want-a.t)/Math.max(1,z.t-a.t);
      if(Math.abs(z.x-a.x)>260||Math.abs(z.y-a.y)>260)     /* a real jump (respawn, new level): snap */
        return {x:z.x,y:z.y,d:z.d,f:z.f,busy:z.b,fly:z.fly,stale:0};
      return {x:a.x+(z.x-a.x)*k, y:a.y+(z.y-a.y)*k, d:z.d, f:k>.5?z.f:a.f, busy:z.b, fly:z.fly, stale:0};
    }
  }
  const o=b[0];
  return {x:o.x,y:o.y,d:o.d,f:o.f,busy:o.b,fly:o.fly,stale:0};
}
/* ---- the partner's character, drawn as a translucent ghost ---- */
function drawMate(c){
  const st=NET.mateState; if(!st||st.x==null) return;
  const now=(window.performance&&performance.now)?performance.now():Date.now();
  const m=mateAt(now); if(!m) return;
  c.save(); c.globalAlpha=(NET.mode==='coop'?.9:.5)*(m.stale?.55:1);
  const H=heroSheet(st.hero||'azure');
  const fy=m.y+P.h, cx=m.x+P.w/2;
  c.fillStyle='rgba(0,0,0,.2)'; c.beginPath(); c.ellipse(cx,fy+3,P.w*.5,5,0,0,7); c.fill();
  if(m.fly){                                        /* the partner is mid super jump */
    const g=c.createRadialGradient(cx,m.y+P.h/2,4,cx,m.y+P.h/2,40);
    g.addColorStop(0,'rgba(120,230,255,.35)'); g.addColorStop(1,'rgba(120,230,255,0)');
    c.fillStyle=g; c.beginPath(); c.arc(cx,m.y+P.h/2,40,0,7); c.fill();
  }
  if(H){ const f=H.meta[m.f]||H.meta.idle, sc=H.s;
    c.save(); c.translate(cx,fy); c.scale(m.d||1,1);
    c.drawImage(H.img,f[0],f[1],f[2],f[3],-f[4]*sc,-(f[5]+1)*sc,f[2]*sc,f[3]*sc); c.restore(); }
  else { c.fillStyle='#38E1C8'; rr(c,m.x,m.y,P.w,P.h,8); c.fill() }
  c.globalAlpha=1;
  /* say out loud why the partner is not moving, so a pause never reads as a bug */
  if(m.busy){
    const by=m.y-26, bw=62;
    c.fillStyle='rgba(12,16,32,.72)'; rr(c,cx-bw/2,by-14,bw,20,9); c.fill();
    c.fillStyle='#FFE08A'; c.font='bold 11px Rubik,sans-serif'; c.textAlign='center';
    c.fillText('💭 thinking',cx,by);
  } else if(m.stale){
    c.fillStyle='rgba(12,16,32,.72)'; rr(c,cx-26,m.y-40,52,20,9); c.fill();
    c.fillStyle='#FF9EB5'; c.font='bold 11px Rubik,sans-serif'; c.textAlign='center';
    c.fillText('📶 '+(m.stale/1000).toFixed(1)+'s',cx,m.y-26);
  }
  c.font='bold 12px Rubik,sans-serif'; c.textAlign='center';
  c.fillStyle='rgba(0,0,0,.5)'; c.fillText((st.a||'🙂')+' '+(st.nm||'Partner'),cx+1,m.y-9);
  c.fillStyle=NET.mode==='coop'?'#38E1C8':'#FFC84A'; c.fillText((st.a||'🙂')+' '+(st.nm||'Partner'),cx,m.y-10);
  c.textAlign='left'; c.restore();
}
function netTick(){
  if(!NET.on||!NET.mate||!LV) return;
  const now=performance.now();
  netLinkBadge(now);
  /* 10 packets a second: Supabase Realtime throttles a channel at that rate by default,
     and going over it is what turns a smooth partner into a stuttering one. */
  if(now-NET.lastSend<100) return;
  const me=NET.me();
  const H=heroSheet(S.hero);
  const msg={t:'pos',x:Math.round(P.x),y:Math.round(P.y),d:P.face,f:heroFrame(H&&H.meta),
             b:LV.busy?1:0, fly:P.fly>0?1:0,
             hero:me.hero,nm:me.name,a:me.avatar};
  /* while nothing moves (a question is open, the hero stands still) one packet every
     600 ms is enough to say "still here" — the rest of the budget stays for real motion */
  const sig=msg.x+','+msg.y+','+msg.d+','+msg.f+','+msg.b;
  if(sig===NET.lastSig&&now-NET.lastSend<600) return;
  NET.lastSig=sig; NET.lastSend=now;
  msg.ts=Math.round(now);
  NET.send(msg);
}
/* the small 🌐 box in the HUD turns into a warning when packets stop arriving */
function netLinkBadge(now){
  const mb=$('#mate'); if(!mb) return;
  const b=NET.buf, age=b.length?now-b[b.length-1].t:9999;
  const bad=age>900;
  if(mb.dataset.bad!==(bad?'1':'0')){
    mb.dataset.bad=bad?'1':'0';
    mb.style.color=bad?'#FF9EB5':'';
    mb.style.borderColor=bad?'rgba(255,158,181,.6)':'';
    mb.title=bad?'The partner’s data is late — a weak connection or a slow room':'Link is healthy';
  }
}
/* a row of coins collected in one run becomes a single shared-coins packet */
let coinPend=0, coinTimer=0;
function netCoin(n){
  coinPend+=n;
  if(coinTimer) return;
  coinTimer=setTimeout(()=>{ const k=coinPend; coinPend=0; coinTimer=0;
    if(k&&NET.on&&NET.mate) NET.send({t:'ev',k:'coin',n:k}); },400);
}
/* score updates ride on the same budget as movement: picking up a row of coins used to
   fire one packet per coin, which is exactly what pushes the channel over its limit */
let statTimer=0;
function netStat(){
  if(!NET.on||!NET.mate||!LV) return;
  if(statTimer) return;
  statTimer=setTimeout(()=>{ statTimer=0;
    if(!NET.on||!NET.mate||!LV) return;
    NET.send({t:'stat',coins:LV.coins,hearts:LV.hearts,ok:LV.stats.ok,bad:LV.stats.bad,
              prog:Math.round(P.x/LV.w*100)});
  },400);
}
function netCheckFinish(){
  if(!NET.results.me||!NET.results.mate) return;
  const a=NET.results.me, b=NET.results.mate;
  const winner = NET.mode==='coop' ? null : (a.time===b.time?null:(a.time<b.time?'me':'mate'));
  const body=$('#results-body');
  const row=(k,x,y)=>'<div class="kv"><span>'+k+'</span><b>'+x+' · '+y+'</b></div>';
  body.insertAdjacentHTML('afterbegin',
    '<div class="panel"><h3>'+(NET.mode==='coop'?'🤝 Team result':'🏁 Race result')+'</h3>'+
    '<div class="qsub">'+(S.avatar||'🦊')+' '+(S.name||'You')+'  vs  '+((NET.mate&&NET.mate.avatar)||'🙂')+' '+((NET.mate&&NET.mate.name)||'Partner')+'</div>'+
    row('Time',a.time+'s',b.time+'s')+row('Coins',a.coins,b.coins)+row('Correct answers',a.ok,b.ok)+
    row('Accuracy',a.acc+'%',b.acc+'%')+
    '<div class="starsbig">'+(NET.mode==='coop'?'🤝':(winner==='me'?'🏆':winner==='mate'?'🥈':'🤝'))+'</div>'+
    '<p class="muted" style="text-align:center">'+(NET.mode==='coop'
      ? 'You finished the level together.'
      : (winner==='me'?'You finished first!':winner==='mate'?'Your partner finished first.':'A dead heat.'))+'</p></div>');
}

/* ---------- what is going to be played ---------- */
function topicNames(list,bank){
  return (list||[]).map(k=>{
    const t=bank[k]; if(!t) return k;
    return isCustom(k) ? t.n.split(' › ').slice(-1)[0] : t.n;
  });
}
function topicSummary(list,bank,max){
  const n=topicNames(list,bank);
  if(!n.length) return '—';
  const m=max||2;
  return n.length<=m ? n.join(', ') : n.slice(0,m).join(', ')+' +'+(n.length-m);
}
function planNames(){
  return {v:topicNames(SESSION.topics.v,WORDBANK), g:topicNames(SESSION.topics.g,GRAMMARBANK)};
}
function sendPlan(){
  if(!NET.on||NET.role!=='host') return;
  NET.send({t:'lobby',tv:SESSION.topics.v,tg:SESSION.topics.g,diff:SESSION.diff,names:planNames(),o:opt()});
}
/* every lesson of every course, for the quick picker */
function lessonOptions(){
  const out=[];
  allCourses().forEach(({co,src,i:ci})=>(co.sections||[]).forEach((se,si)=>(se.lessons||[]).forEach((le,li)=>{
    const t=lessonTopics(le,ci,si,li,src);
    if(t.v.length||t.g.length) out.push({label:co.name+' · '+se.name.replace(/^Unit \d+ · /,'')+' · '+le.name,
                                         short:le.name, v:t.v, g:t.g, key:src+ci+'.'+si+'.'+li});
  })));
  return out;
}

/* ---------- picking what the room will play ---------- */
function hostPlanPanel(){
  const lessons=lessonOptions();
  const cur=new Set([...SESSION.topics.v,...SESSION.topics.g]);
  const activeLesson=lessons.find(l=>[...l.v,...l.g].every(k=>cur.has(k)) &&
                                      cur.size===new Set([...l.v,...l.g]).size);
  const built=[['animals','Animals'],['food','Food'],['school','School'],['travel','Travel'],
               ['technology','Technology'],['feelings','Feelings']];
  return '<div class="panel"><h3>📚 What the room will play</h3>'+
    '<div class="kv"><span>Vocabulary</span><b>'+esc(topicSummary(SESSION.topics.v,WORDBANK,3))+'</b></div>'+
    '<div class="kv"><span>Grammar</span><b>'+esc(topicSummary(SESSION.topics.g,GRAMMARBANK,3))+'</b></div>'+
    '<div class="kv"><span>Difficulty</span><b>'+DIFF[SESSION.diff].n+'</b></div>'+
    '<h3 style="margin:16px 0 8px">Pick a lesson</h3>'+
    '<select id="net-lesson" class="qinput" style="text-align:left;font-size:14px;letter-spacing:0">'+
      '<option value="">— choose a lesson from a course —</option>'+
      lessons.map((l,i)=>'<option value="'+i+'"'+(activeLesson===l?' selected':'')+'>'+esc(l.label)+'</option>').join('')+
    '</select>'+
    '<h3 style="margin:16px 0 8px">Or a built-in topic</h3>'+
    '<div class="row">'+built.map(([k,n])=>
      '<button class="pill'+(SESSION.topics.v.length===1&&SESSION.topics.v[0]===k?' gold':'')+'" data-nettopic="'+k+'">'+n+'</button>').join('')+
      '<button class="pill" data-netfull="1">⚙️ Full topic picker</button></div>'+
    '<h3 style="margin:16px 0 8px">Difficulty</h3>'+
    '<div class="row">'+DIFF.map(d=>
      '<button class="pill'+(SESSION.diff===d.id?' gold':'')+'" data-netdiff="'+d.id+'">'+d.n+'</button>').join('')+'</div>'+
    '<h3 style="margin:16px 0 8px">Which tasks can come up</h3>'+
    '<div class="row">'+ANSWER_MODES.map(m=>
      '<button class="pill'+(answerMode()===m.id?' gold':'')+'" data-netam="'+m.id+'" title="'+esc(m.d)+'">'+m.n+'</button>').join('')+'</div>'+
    '<div class="row" style="margin-top:8px">'+
      '<button class="pill'+(useEmoji()?' gold':'')+'" data-netem="1">🖼️ Show pictures</button>'+
      '<button class="pill'+(useEmoji()?'':' gold')+'" data-netem="0">🚫 Words only</button></div>'+
    '<p class="muted" style="margin-top:8px">'+esc((ANSWER_MODES.find(m=>m.id===answerMode())||ANSWER_MODES[1]).d)+'</p>'+
    '<button class="big-btn" id="net-start" style="margin-top:16px" '+(NET.mate?'':'disabled')+'>▶ Start the level for both</button>'+
    '<p class="muted" style="margin-top:10px">Your partner sees this list straight away and gets exactly the same level.</p></div>';
}
/* the guest chooses nothing about the level — only who they are in it */
function guestSelfPanel(){
  return '<div class="panel"><h3>🎭 You in this room</h3>'+
    '<div class="kv"><span>Name</span><b>'+esc(S.name||'Player')+'</b></div>'+
    '<div class="kv"><span>Avatar</span><b>'+(S.avatar||'🦊')+'</b></div>'+
    '<div class="kv"><span>Hero</span><b>'+esc(heroDef(S.hero).n)+'</b></div>'+
    '<div class="row" style="margin-top:10px"><button class="pill gold" id="net-me">🎨 Change name, avatar or hero</button></div>'+
    '<p class="muted" style="margin-top:8px">Everything else — the mode, the topics, the difficulty and the kind of tasks — '+
    'comes from the host. Just wait for them to start.</p></div>';
}
function wireGuestSelf(){
  if($('#net-me')) $('#net-me').onclick=()=>{ NET.fromRoom=true; show('hero') };
}
function guestPlanPanel(){
  const p=NET.plan;
  if(!p) return '<div class="panel"><h3>📚 What the room will play</h3>'+
    '<p class="muted">Waiting for the host to choose the topics…</p></div>';
  const fmt=a=>(a&&a.length)?esc(a.slice(0,3).join(', ')+(a.length>3?' +'+(a.length-3):'')):'—';
  return '<div class="panel"><h3>📚 What the room will play</h3>'+
    '<div class="kv"><span>Vocabulary</span><b>'+fmt(p.names&&p.names.v)+'</b></div>'+
    '<div class="kv"><span>Grammar</span><b>'+fmt(p.names&&p.names.g)+'</b></div>'+
    '<div class="kv"><span>Difficulty</span><b>'+(DIFF[p.diff]?DIFF[p.diff].n:'—')+'</b></div>'+
    '<div class="kv"><span>Tasks</span><b>'+
      esc((ANSWER_MODES.find(m=>m.id===((p.o&&p.o.answer)||'mixed'))||ANSWER_MODES[1]).n)+
      ' · '+((p.o&&p.o.emoji===false)?'words only':'pictures on')+'</b></div>'+
    '<p class="muted">The host chooses for the room. Waiting for them to start.</p></div>';
}
function setRoomTopics(v,g){
  if(v) SESSION.topics.v=[...v];
  if(g) SESSION.topics.g=[...g];
  /* a level needs both kinds, so keep a sensible partner for whichever side is empty */
  if(!SESSION.topics.v.length) SESSION.topics.v=Object.keys(WORDBANK).filter(k=>!isCustom(k)).slice(0,3);
  if(!SESSION.topics.g.length) SESSION.topics.g=Object.keys(GRAMMARBANK).filter(k=>!isCustom(k)).slice(0,2);
  S.topics={v:[...SESSION.topics.v],g:[...SESSION.topics.g]}; save();
  sendPlan(); renderOnline();
}
function wireHostPlan(){
  const sel=$('#net-lesson');
  if(sel) sel.onchange=()=>{
    const l=lessonOptions()[+sel.value];
    if(!l) return;
    setRoomTopics(l.v.length?l.v:null, l.g.length?l.g:null);
    toast('Room topic: '+l.short);
  };
  $$('[data-nettopic]').forEach(b=>b.onclick=()=>{
    setRoomTopics([b.dataset.nettopic], null);
    toast('Room topic: '+WORDBANK[b.dataset.nettopic].n);
  });
  $$('[data-netdiff]').forEach(b=>b.onclick=()=>{
    SESSION.diff=+b.dataset.netdiff; S.diff=SESSION.diff; save(); sendPlan(); renderOnline();
  });
  /* task format: the host decides for the room, and the guest sees it change live */
  $$('[data-netam]').forEach(b=>b.onclick=()=>{
    opt().answer=b.dataset.netam; save(); sendPlan(); renderOnline();
    toast('Tasks: '+(ANSWER_MODES.find(m=>m.id===b.dataset.netam)||{}).n);
  });
  $$('[data-netem]').forEach(b=>b.onclick=()=>{
    opt().emoji=b.dataset.netem==='1'; save(); sendPlan(); renderOnline();
  });
  const full=$('[data-netfull]');
  if(full) full.onclick=()=>{ NET.fromLobby=true; show('topics') };
}

/* ---------- invite links ----------
   The host copies one link, the partner opens it and is already in the room: the mode,
   the topics, the difficulty and the task format all come from the host. Only what is
   personal — name, avatar, hero — stays with the player who opened the link. */
function joinLink(code,mode){
  const base=location.origin+location.pathname;
  return base+'#join='+encodeURIComponent(code)+'&m='+(mode||NET.mode||'race');
}
function linkIsShareable(){ return location.protocol==='http:'||location.protocol==='https:' }
function linkInvite(){
  const s=(location.hash||'').replace(/^#/,'')+'&'+(location.search||'').replace(/^\?/,'');
  const c=/(?:^|&)(?:join|room|r)=([A-Za-z0-9]{4})/.exec(s);
  if(!c) return null;
  const m=/(?:^|&)m=(race|coop)/i.exec(s);
  return {code:c[1].toUpperCase(), mode:m?m[1].toLowerCase():''};
}
/* opened through an invite: connect as a guest straight away, with nothing to choose */
async function autoJoin(){
  const inv=linkInvite(); if(!inv) return false;
  if(inv.mode) NET.mode=inv.mode;
  NET.invited=true;
  show('online');
  NET.log('Joining room '+inv.code+'…'); renderOnline();
  const ok=await NET.connect(inv.code,'guest',NET.mode);
  renderOnline();
  if(ok) toast('You are in room '+inv.code);
  else NET.log('Room '+inv.code+' did not answer. Ask for a fresh link, or type the code below by hand.');
  return ok;
}
/* a changed name, avatar or hero is announced at once, so the partner's screen keeps up */
function netMe(){ if(NET.on) NET.send({t:'hi',role:NET.role,...NET.me()}) }
async function copyText(t){
  try{ if(navigator.clipboard&&navigator.clipboard.writeText){ await navigator.clipboard.writeText(t); return true } }catch(e){}
  try{ const ta=document.createElement('textarea'); ta.value=t;
    ta.style.cssText='position:fixed;left:-9999px'; document.body.appendChild(ta);
    ta.select(); const ok=document.execCommand&&document.execCommand('copy');
    document.body.removeChild(ta); return !!ok; }catch(e){ return false }
}
function invitePanel(){
  const link=joinLink(NET.code);
  if(!linkIsShareable())
    return '<div class="panel"><h3>🔗 Invite link</h3>'+
      '<p class="muted">The game is open from a file on this device, so a link would not work for anyone else. '+
      'Put the game online (GitHub Pages) and the link will appear here. For now give your partner the room code '+
      '<b>'+esc(NET.code)+'</b> — they can type it in Play together → Join.</p></div>';
  return '<div class="panel"><h3>🔗 Invite link</h3>'+
    '<input id="net-link" class="qinput" readonly style="text-align:left;font-size:13px;letter-spacing:0" value="'+esc(link)+'">'+
    '<div class="row" style="margin-top:10px">'+
      '<button class="pill gold" id="net-copy">📋 Copy link</button>'+
      (navigator.share?'<button class="pill" id="net-share">📤 Share</button>':'')+
      '<button class="pill" id="net-copycode">Copy the code only</button></div>'+
    '<p class="muted" style="margin-top:8px">Send this to your partner. Opening it puts them straight into the room — '+
    'mode, topics, difficulty and the task format are all yours. They only choose their own name, avatar and hero.</p></div>';
}
function wireInvite(){
  const inp=$('#net-link');
  if($('#net-copy')) $('#net-copy').onclick=async()=>{
    const ok=await copyText(joinLink(NET.code));
    if(ok) toast('Link copied — send it to your partner');
    else { if(inp){ inp.focus(); inp.select() } toast('Select the link and copy it by hand') }
  };
  if($('#net-copycode')) $('#net-copycode').onclick=async()=>{
    toast(await copyText(NET.code)?('Code '+NET.code+' copied'):('Room code: '+NET.code));
  };
  if($('#net-share')) $('#net-share').onclick=()=>{
    navigator.share({title:'Crystal of Words',text:'Join my room '+NET.code,url:joinLink(NET.code)}).catch(()=>{});
  };
  if(inp) inp.onclick=()=>{ inp.focus(); inp.select() };
}
/* ---------- lobby screen ---------- */
function renderOnline(){
  const cfg=S.net||(S.net={url:'',key:''});
  const body=$('#net-body');
  if(NET.on){
    body.innerHTML=
      '<div class="panel"><h3>Room '+NET.code+'</h3>'+
      '<div class="kv"><span>You</span><b>'+(S.avatar||'🦊')+' '+(S.name||'Player')+' ('+NET.role+')</b></div>'+
      '<div class="kv"><span>Partner</span><b>'+(NET.mate?(NET.mate.avatar+' '+NET.mate.name):'waiting…')+'</b></div>'+
      '<div class="kv"><span>Mode</span><b>'+(NET.mode==='coop'?'🤝 Co-op — one shared goal':'🏁 Race — first to finish')+'</b></div>'+
      '<p class="muted">'+esc(NET.status)+'</p>'+
      (NET.role==='host'
        ? (S.hero!=='sensei'?'<button class="pill gold" id="net-sensei" style="margin-bottom:12px">🧙 Teach as the Sensei</button>':
           '<p class="muted">You are playing as the Sensei, so your students can see who is leading.</p>')
        : '')+
      '<button class="pill" id="net-leave" style="margin-top:12px">Leave room</button></div>'+
      (NET.role==='host' ? invitePanel()+hostPlanPanel() : guestSelfPanel()+guestPlanPanel());
    if(NET.role==='host'){ wireHostPlan(); wireInvite() } else wireGuestSelf();
    if(NET.role==='host'&&$('#net-start')) $('#net-start').onclick=()=>{
      const seed='mp'+Date.now()+'-'+Math.floor(Math.random()*1e6);
      const cfg={t:'cfg',world:SESSION.world,diff:SESSION.diff,seed,mode:NET.mode,
                 tv:SESSION.topics.v,tg:SESSION.topics.g,o:opt()};
      /* your own lessons travel with the invite, so a partner who has never seen your course can still play it */
      const used=[...SESSION.topics.v,...SESSION.topics.g].filter(k=>isCustom(k)&&!isShipped(k));
      if(used.length) cfg.c=used.map(k=>({k,n:(WORDBANK[k]||GRAMMARBANK[k]).n,
        lv:WORDBANK[k]?WORDBANK[k].lv[0]:null, q:GRAMMARBANK[k]?GRAMMARBANK[k].q[0]:null}));
      NET.send(cfg);
      SESSION.pin=true; startLevel(SESSION.world,SESSION.diff,{seed});
    };
    if($('#net-sensei')) $('#net-sensei').onclick=()=>{ S.hero='sensei'; save();
      NET.send({t:'hi',role:NET.role,...NET.me()}); renderOnline(); toast('You are the Sensei now') };
    $('#net-leave').onclick=()=>{ NET.send({t:'bye'}); NET.leave(); renderOnline() };
    return;
  }
  body.innerHTML=
   (NET.invited?'<div class="panel"><h3>🔗 You were invited to room '+esc((linkInvite()||{}).code||'')+'</h3>'+
     '<p class="muted">'+esc(NET.status||'The room did not answer.')+'</p>'+
     '<div class="row" style="margin-top:10px"><button class="pill gold" id="net-rejoin">↻ Try the room again</button></div>'+
     '<p class="muted" style="margin-top:8px">Still nothing? Ask for a fresh link — a room only exists while the host has the game open.</p></div>':'')+
   '<div class="panel"><h3>How it works</h3><p class="muted">Two players, one level, built from the same seed so both see exactly the same world.<br><br>'+
   '<b>🏁 Race</b> — you both run the level at the same time and see each other as a ghost. Whoever finishes first wins; coins and accuracy are compared at the end.<br>'+
   '<b>🤝 Co-op</b> — one shared goal. Coins go into a common purse, the key, the shards and the boss count for both of you, and when one of you gets a question wrong the other is offered the chance to answer it and rescue the mistake.</p></div>'+
   '<div class="panel"><h3>Mode</h3><div class="row">'+
     '<button class="pill '+(NET.mode==='race'?'gold':'')+'" data-mode="race">🏁 Race</button>'+
     '<button class="pill '+(NET.mode==='coop'?'gold':'')+'" data-mode="coop">🤝 Co-op</button></div></div>'+
   '<div class="panel"><h3>Room</h3>'+
     '<div class="row"><button class="pill gold" id="net-host">Create a room</button></div>'+
     '<div class="row" style="margin-top:10px"><input id="net-code" class="qinput" style="max-width:180px;text-transform:uppercase" maxlength="4" placeholder="CODE">'+
     '<button class="pill" id="net-join">Join</button></div>'+
     '<p class="muted" style="margin-top:8px">'+esc(NET.status)+'</p></div>'+
   '<div class="panel"><h3>Server <span class="muted">'+(S.net&&S.net.url?'· your own project':'· built in, nothing to set up')+'</span></h3>'+
     '<p class="muted">A room server is already built into the game, so you can just create a room and play. '+
     'If you would rather run your own free Supabase project, paste its <b>Project URL</b> and <b>anon public</b> key below '+
     '(Settings → API). No tables and no sign-in are needed. Never paste the <b>service_role</b> key anywhere in a web page.</p>'+
     '<input id="net-url" class="qinput" style="text-align:left;font-size:13px;letter-spacing:0;margin-top:10px" placeholder="https://xxxx.supabase.co">'+
     '<input id="net-key" class="qinput" style="text-align:left;font-size:13px;letter-spacing:0;margin-top:8px" placeholder="anon public key">'+
     '<div class="row" style="margin-top:10px"><button class="pill gold" id="net-save">Save server</button>'+
     '<button class="pill" id="net-test">Test connection</button>'+
     '<button class="pill" id="net-reset">Use the built-in one</button></div>'+
     '<div class="muted" id="net-test-out" style="margin-top:10px"></div></div>';
  $$('[data-mode]').forEach(b=>b.onclick=()=>{ NET.mode=b.dataset.mode; renderOnline() });
  /* an invite that could not connect: keep the code in the box so one tap retries it */
  const inv=linkInvite();
  if(inv&&$('#net-code')) $('#net-code').value=inv.code;
  if($('#net-rejoin')) $('#net-rejoin').onclick=()=>autoJoin();
  $('#net-url').value=cfg.url||''; $('#net-key').value=cfg.key||'';
  $('#net-url').placeholder=NET_DEFAULT.url?'using the built-in server':'https://xxxx.supabase.co';
  $('#net-save').onclick=()=>{ cfg.url=$('#net-url').value.trim(); cfg.key=$('#net-key').value.trim(); save(); toast('Server saved') };
  $('#net-reset').onclick=()=>{ cfg.url=''; cfg.key=''; save(); renderOnline(); toast('Back to the built-in server') };
  $('#net-test').onclick=async()=>{
    cfg.url=$('#net-url').value.trim(); cfg.key=$('#net-key').value.trim(); save();
    const out=$('#net-test-out'); out.textContent='Testing…';
    const use=netCfg();
    if(!use.url||!use.key){ out.textContent='Fill in both fields first.'; return }
    const rt=new Realtime(realtimeURL(use.url,use.key),'cow-selftest');
    const t0=Date.now(); let got=false;
    rt.onEvent=m=>{ if(m&&m.t==='ping') got=true };
    const ok=await rt.connect();
    const ms=Date.now()-t0;
    if(!ok){ rt.close();
      out.innerHTML='❌ No connection. Check that the link looks like <code>https://xxxx.supabase.co</code>, '+
        'that the key is the <b>anon public</b> one, and that the project is not paused in Supabase.'; return }
    rt.send({t:'ping'});
    setTimeout(()=>{ rt.close();
      out.innerHTML='✅ Connected in '+ms+' ms. Rooms will work.'+
        (got?' (The channel even echoed a test message back.)':''); },900);
  };
  $('#net-host').onclick=async()=>{
    const code=Array.from({length:4},()=>'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random()*32)]).join('');
    if(await NET.connect(code,'host',NET.mode)) renderOnline();
  };
  $('#net-join').onclick=async()=>{
    const code=($('#net-code').value||'').trim().toUpperCase();
    if(code.length<4){ toast('Enter the 4-character room code'); return }
    if(await NET.connect(code,'guest',NET.mode)) renderOnline();
  };
}
