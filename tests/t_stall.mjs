import {JSDOM} from 'jsdom'; import fs from 'fs';
const html=fs.readFileSync(process.env.GAME||'dist/index.html','utf8');
const d=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'http://localhost/',
 beforeParse(w){ const _o=w.HTMLCanvasElement.prototype.getContext;
  const _p=new Proxy({},{get:(t,k)=>(k==='createLinearGradient'||k==='createRadialGradient')?()=>({addColorStop:()=>{}}):()=>{},set:()=>true});
  w.HTMLCanvasElement.prototype.getContext=function(t){return this.id==='cv'?_p:_o.call(this,t)};
  w.matchMedia=()=>({matches:false});w.requestAnimationFrame=()=>0;w.scrollTo=()=>{};}});
const SEEDIDX=Number(process.env.IDX||12);
const w=d.window; await new Promise(r=>setTimeout(r,400));
w.eval(`const _v=QM.vocab.bind(QM),_g=QM.grammar.bind(QM);
 QM.vocab=(...a)=>{window.LASTQ=_v(...a);return window.LASTQ};
 QM.grammar=(...a)=>{window.LASTQ=_g(...a);return window.LASTQ};`);
w.eval(`const k=Object.keys(WORDBANK).filter(x=>x.startsWith('cv:b'))[${SEEDIDX}];
 SESSION.topics.v=[k]; SESSION.topics.g=[k.replace('cv:','cg:')];
 S.opts={emoji:true,answer:'mixed'}; startLevel(1,1);`);
// trace every place that touches busy
w.eval(`window.TRACE=[];
 ['hitBlock','fight','bossAttackTry','interact','runeStone','runQuest'].forEach(n=>{
   const f=window[n]; window[n]=function(...a){ TRACE.push('call '+n); const r=f.apply(this,a);
     if(r&&r.then) r.then(()=>TRACE.push('done '+n),e=>TRACE.push('fail '+n+' '+e.message));
     return r } });
 const u=window.unstick; window.unstick=function(why){ window.STALL={why,trace:TRACE.slice(-8),
   q:document.querySelector('#m-question').classList.contains('on'),
   quest:document.querySelector('#m-quest').classList.contains('on'),
   askActive, busy:LV&&LV.busy}; return u(why) };`);
const wait=()=>new Promise(r=>setImmediate(r));
function step(){
  const card=w.document.querySelector('#q-card');
  if(!w.document.querySelector('#m-question').classList.contains('on')) return;
  const nx=[...card.querySelectorAll('button.big-btn')].find(b=>/Continue|Got it/.test(b.textContent));
  if(nx) return nx.click();
  const q=w.LASTQ, opts=[...card.querySelectorAll('.opt')];
  if(opts.length) return opts[q.correct].click();
  const inp=card.querySelector('.qinput');
  if(inp){ inp.value=String(q.correct).split('|')[0]; return card.querySelector('button.big-btn').click() }
  const toks=[...card.querySelectorAll('.tok')], target=String(q.correct);
  ((q.sep||'')?target.split(q.sep):target.split('')).forEach(pt=>{const b=toks.find(x=>!x.classList.contains('used')&&x.textContent===pt);b&&b.click()});
  [...card.querySelectorAll('button.big-btn')].pop().click();
}
let t=0;
for(let i=0;i<5000&&!w.STALL;i++){
  if(i%60===0) w.eval("if(LV)LV.hearts=LV.maxHearts");
  w.eval(`K.KeyD=1;K.Space=${(i%22)<7?1:0};K.KeyF=${i%7===0?1:0};K.KeyE=${i%11===0?1:0};`);
  t+=17; w.eval(`if(running&&LV) loopStep(${t})`);
  await wait();
  if(w.document.querySelector('#m-question').classList.contains('on')){ step(); await wait(); step(); await wait() }
  if(w.document.querySelector('#m-quest').classList.contains('on')){
    const b=w.document.querySelector('#quest-card .big-btn')||w.document.querySelector('#quest-card .opt'); b&&b.click();
    await wait(); }
  if(!w.eval('running')) break;
}
console.log(w.STALL?JSON.stringify(w.STALL,null,1):'no stall in this run');
