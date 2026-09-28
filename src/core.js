/* =====================================================================
   1. CONTENT DATABASE (Vocabulary words + Grammar questions)
   Word format: "english|emoji(optional)|short definition(optional)"
   Tiers: [0]=easy, [1]=medium, [2]=hard
   ===================================================================== */
/* =====================================================================
   2. CORE: saving, state, navigation, sound, adaptive learning
   ===================================================================== */
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
/* One switchable random source. Level generation runs on a seeded stream, so the same
   seed always builds the same level — that is what lets two players (or a whole class)
   play an identical level. Everything else keeps using Math.random. */
let RAND=Math.random;
function mulberry(seed){ let a=seed>>>0; return ()=>{ a=(a+0x6D2B79F5)>>>0;
  let t=Math.imul(a^(a>>>15),1|a); t=(t+Math.imul(t^(t>>>7),61|t))^t;
  return ((t^(t>>>14))>>>0)/4294967296; } }
function hashSeed(str){ let h=2166136261>>>0;
  for(let i=0;i<String(str).length;i++){ h^=String(str).charCodeAt(i); h=Math.imul(h,16777619) } return h>>>0 }
function withSeed(seed,fn){ const prev=RAND; RAND=mulberry(hashSeed(seed)); try{ return fn() } finally{ RAND=prev } }
const rnd=a=>a[Math.floor(RAND()*a.length)];
const rint=(a,b)=>a+Math.floor(RAND()*(b-a+1));
const shuffle=a=>{a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(RAND()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
const KEY='crystal-of-words-v1';

const DEF={
  coins:0, unlocked:1, stars:{},
  gear:{owned:['sword-wood'],eq:{weapon:'sword-wood',helmet:null,boots:null,amulet:null}},
  boosts:{shield:2,fifty:2,dictionary:2,second:1},
  slots:['shield','fifty','dictionary'],
  words:{}, gram:{}, ach:[], presets:{}, courses:[], hero:'azure', avatar:'🦊', name:'',
  opts:{emoji:true, answer:'mixed'},   /* task format chosen before a level */
  topics:{v:['animals','food','colors'],g:['to-be','present-simple']},
  diff:0,
  settings:{sound:true,music:true,volume:'mid',touch:'auto'},
  net:{url:'',key:''},   /* left empty here — NET_DEFAULT below is what is actually used */
  stats:{levels:0,totalCoins:0,vocOk:0,vocBad:0,gramOk:0,gramBad:0,monsters:0,bosses:0,perfect:0,
         bestStreak:0,quests:0,secrets:0,comeback:0,noHelpHard:0,stars:0,reviewed:0},
  daily:{date:'',tasks:[]}
};
const clone=o=>JSON.parse(JSON.stringify(o));
let S = load();
function load(){
  try{const raw=localStorage.getItem(KEY); if(!raw) return JSON.parse(JSON.stringify(DEF));
    const s=JSON.parse(raw); return deepFill(s,JSON.parse(JSON.stringify(DEF)));
  }catch(e){return JSON.parse(JSON.stringify(DEF))}
}
function deepFill(o,d){for(const k in d){ if(o[k]===undefined) o[k]=d[k];
  else if(d[k]&&typeof d[k]==='object'&&!Array.isArray(d[k])) deepFill(o[k],d[k]); } return o}
function save(){ try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){} }

/* ---- session (what the player picked before the level) ---- */
const SESSION={ world:0, diff:0, mode:'adventure', seed:null, pin:false, topics:{v:[...S.topics.v],g:[...S.topics.g]} };
const DIFF=[
 {id:0,n:'EASY',time:'up to 5 min',opts:3,blocks:[8,12],mobs:[3,5],strong:[0,1],quests:1,coins:20,hearts:5,timer:0,hint:true},
 {id:1,n:'MEDIUM',time:'7–8 min',opts:4,blocks:[12,18],mobs:[5,8],strong:[1,3],quests:2,coins:35,hearts:4,timer:0,hint:false},
 {id:2,n:'HARD',time:'10–12 min',opts:4,blocks:[18,25],mobs:[8,12],strong:[3,5],quests:3,coins:55,hearts:3,timer:18,hint:false}
];

/* ---- navigation ---- */
const HIST=[];
function show(id,push=true){
  /* leaving the topic picker any other way ends the "choosing for the room" detour */
  if(id!=='topics'&&typeof NET!=='undefined') NET.fromLobby=false;
  const cur=$$('.screen.on')[0];
  if(cur&&push) HIST.push(cur.id);
  $$('.screen').forEach(s=>s.classList.remove('on'));
  $('#s-'+id).classList.add('on');
  window.scrollTo(0,0);
  if(id==='menu') renderMenu();
  if(id==='map') renderMap();
  if(id==='topics') renderTopics();
  if(id==='diff') renderDiff();
  if(id==='brief') renderBrief();
  if(id==='online') renderOnline();
  if(id==='hero') renderHero();
  if(id==='courses') renderCourses();
  if(id==='shop') renderShop();
  if(id==='backpack') renderBackpack();
  if(id==='ach') renderAch();
  if(id==='teacher') renderTeacher();
  if(id==='settings') renderSettings();
}
function back(){ const p=HIST.pop(); if(p){ $$('.screen').forEach(s=>s.classList.remove('on')); show(p.replace('s-',''),false);} else show('menu',false); }

function toast(msg,ms=1900){ const t=$('#toast'); t.textContent=msg; t.classList.add('on'); clearTimeout(t._t); t._t=setTimeout(()=>t.classList.remove('on'),ms); }

/* ---- sound (WebAudio, no external files) ---- */
