import {JSDOM} from 'jsdom'; import fs from 'fs';
const html=fs.readFileSync(process.env.GAME||'dist/index.html','utf8');
async function run(label, setup, mode){
  const d=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'http://localhost/',
   beforeParse(w){ const _o=w.HTMLCanvasElement.prototype.getContext;
    const _p=new Proxy({},{get:(t,k)=>(k==='createLinearGradient'||k==='createRadialGradient')?()=>({addColorStop:()=>{}}):()=>{},set:()=>true});
    w.HTMLCanvasElement.prototype.getContext=function(t){return this.id==='cv'?_p:_o.call(this,t)};
    w.matchMedia=()=>({matches:false});w.requestAnimationFrame=()=>0;w.scrollTo=()=>{};}});
  const w=d.window; const errs=[];
  w.addEventListener('error',e=>errs.push(e.message));
  w.addEventListener('unhandledrejection',e=>errs.push(String(e.reason&&e.reason.message||e.reason)));
  await new Promise(r=>setTimeout(r,400));
  w.eval(`const _v=QM.vocab.bind(QM),_g=QM.grammar.bind(QM);
    QM.vocab=(...a)=>{window.LASTQ=_v(...a);return window.LASTQ};
    QM.grammar=(...a)=>{window.LASTQ=_g(...a);return window.LASTQ};`);
  w.eval(setup); w.eval(`S.opts={emoji:true,answer:'${mode}'}; startLevel(1,1);`);
  w.eval(`['hitBlock','fight','bossAttackTry','interact','runeStone'].forEach(n=>{
    const f=window[n]; window[n]=function(...a){ window.__why=n; return f.apply(this,a) } });`);
  const wait=()=>new Promise(r=>setImmediate(r));
  let answered=0, wrong=0;
  function step(){
    const card=w.document.querySelector('#q-card');
    if(!w.document.querySelector('#m-question').classList.contains('on')) return;
    const nx=[...card.querySelectorAll('button.big-btn')].find(b=>/Continue|Got it/.test(b.textContent));
    if(nx){ if(/Not quite/.test(card.querySelector('.fb').textContent)) wrong++; return nx.click() }
    const q=w.LASTQ, opts=[...card.querySelectorAll('.opt')];
    if(opts.length) return opts[q.correct].click();
    const inp=card.querySelector('.qinput');
    if(inp){ inp.value=String(q.correct).split('|')[0]; return card.querySelector('button.big-btn').click() }
    const toks=[...card.querySelectorAll('.tok')], target=String(q.correct);
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
  console.log('   ended because:', w.eval("running?'loop ran out':(LV?'game over':'level finished')"));
  console.log(`${label} [${mode}] → ${answered} answered, ${wrong} marked wrong when the right answer was given, errors ${errs.length}`);
  if(errs.length) console.log('   ', [...new Set(errs)].slice(0,2));
}
const oneLesson = `const k=Object.keys(WORDBANK).filter(x=>x.startsWith('cv:b')).find(x=>/Lesson 13/.test(WORDBANK[x].n));
  SESSION.topics.v=[k]; SESSION.topics.g=[k.replace('cv:','cg:')];`;
const wholeCourse = `SESSION.topics.v=Object.keys(WORDBANK).filter(k=>k.startsWith('cv:b'));
  SESSION.topics.g=Object.keys(GRAMMARBANK).filter(k=>k.startsWith('cg:b'));`;
await run('one lesson ', oneLesson, 'mixed');
await run('one lesson ', oneLesson, 'typing');
await run('whole course', wholeCourse, 'choice');
await run('whole course', wholeCourse, 'typing');
