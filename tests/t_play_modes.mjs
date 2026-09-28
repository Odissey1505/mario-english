import {JSDOM} from 'jsdom'; import fs from 'fs';
const html=fs.readFileSync(process.env.GAME||'dist/index.html','utf8');
async function play(mode,emoji){
  const d=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'http://localhost/',
   beforeParse(w){ const _o=w.HTMLCanvasElement.prototype.getContext;
    const _p=new Proxy({},{get:(t,k)=>(k==='createLinearGradient'||k==='createRadialGradient')?()=>({addColorStop:()=>{}}):()=>{},set:()=>true});
    w.HTMLCanvasElement.prototype.getContext=function(t){return this.id==='cv'?_p:_o.call(this,t)};
    w.matchMedia=()=>({matches:false});w.requestAnimationFrame=()=>0;w.scrollTo=()=>{};}});
  const w=d.window; const errs=[];
  w.addEventListener('error',e=>errs.push(e.message));
  w.addEventListener('unhandledrejection',e=>errs.push(String(e.reason&&e.reason.message||e.reason)));
  await new Promise(r=>setTimeout(r,250));
  w.eval(`S.opts={emoji:${emoji},answer:'${mode}'};
    const _v=QM.vocab.bind(QM),_g=QM.grammar.bind(QM);
    QM.vocab=(...a)=>{window.LASTQ=_v(...a);return window.LASTQ};
    QM.grammar=(...a)=>{window.LASTQ=_g(...a);return window.LASTQ};
    startLevel(0,1);`);
  const wait=()=>new Promise(r=>setImmediate(r));
  let typed=0, tapped=0, answered=0;
  function step(){
    const card=w.document.querySelector('#q-card');
    if(!w.document.querySelector('#m-question').classList.contains('on')) return;
    const nx=[...card.querySelectorAll('button.big-btn')].find(b=>/Continue|Got it/.test(b.textContent));
    if(nx) return nx.click();
    const q=w.LASTQ, opts=[...card.querySelectorAll('.opt')];
    if(opts.length){ tapped++; return opts[q.correct].click() }
    const inp=card.querySelector('.qinput');
    if(inp){ typed++; inp.value=String(q.correct).split('|')[0]; return card.querySelector('button.big-btn').click() }
    const toks=[...card.querySelectorAll('.tok')], target=String(q.correct); typed++;
    ((q.sep||'')?target.split(q.sep):target.split('')).forEach(pt=>{const b=toks.find(x=>!x.classList.contains('used')&&x.textContent===pt);b&&b.click()});
    [...card.querySelectorAll('button.big-btn')].pop().click();
  }
  let t=0;
  for(let i=0;i<5000;i++){
    if(i%60===0) w.eval("if(LV)LV.hearts=LV.maxHearts");
    w.eval(`K.KeyD=1;K.Space=${(i%22)<7?1:0};K.KeyF=${i%7===0?1:0};K.KeyE=${i%11===0?1:0};`);
    t+=17; w.eval(`if(running) loopStep(${t})`);
    await wait();
    if(w.document.querySelector('#m-question').classList.contains('on')){ step(); await wait(); step(); await wait(); answered++ }
    if(w.document.querySelector('#m-quest').classList.contains('on')){
      const b=w.document.querySelector('#quest-card .big-btn')||w.document.querySelector('#quest-card .opt'); b&&b.click();
      await new Promise(r=>setTimeout(r,4)); }
    if(!w.eval('running')) break;
  }
  const acc=w.eval("LV?Math.round(LV.stats.ok/Math.max(1,LV.stats.ok+LV.stats.bad)*100):null");
  console.log(`${mode.padEnd(6)} emoji=${String(emoji).padEnd(5)} → answered ${String(answered).padStart(3)} (tapped ${tapped}, typed ${typed}), correct-rate ${acc}%, errors ${errs.length}`);
  if(errs.length) console.log('   ', [...new Set(errs)].slice(0,2));
}
for(const [m,e] of [['choice',true],['mixed',true],['typing',true],['typing',false]]) await play(m,e);
