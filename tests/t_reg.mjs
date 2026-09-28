import {JSDOM} from 'jsdom';
import {createCanvas, Image as NImage} from 'canvas';
import fs from 'fs';
const html=fs.readFileSync(process.env.GAME||'dist/index.html','utf8');
const real=createCanvas(960,540); const rctx=real.getContext('2d');
const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'http://localhost/',
 beforeParse(w){ const _o=w.HTMLCanvasElement.prototype.getContext;
  w.HTMLCanvasElement.prototype.getContext=function(t){ return this.id==='cv'?rctx:_o.call(this,t) };
  w.Image=NImage; w.matchMedia=()=>({matches:false}); w.requestAnimationFrame=()=>0; w.scrollTo=()=>{}; }});
const w=dom.window;
const oc=w.document.createElement.bind(w.document);
w.document.createElement=(t,...a)=>String(t).toLowerCase()==='canvas'?createCanvas(2,2):oc(t,...a);
const errs=[];
w.addEventListener('error',e=>errs.push('ERR '+(e.error&&e.error.stack||e.message)));
w.addEventListener('unhandledrejection',e=>errs.push('REJ '+(e.reason&&e.reason.stack||e.reason)));
process.on('unhandledRejection',r=>errs.push('NODEREJ '+(r&&r.stack||r)));
await new Promise(r=>setTimeout(r,600));

// every screen renders
for(const id of ['menu','map','topics','diff','brief','shop','backpack','ach','teacher','settings','online','hero','courses'])
  w.eval(`show('${id}')`);
console.log('all screens render:', errs.length===0, errs.slice(0,2));

// level generation across worlds/difficulties, with the coin guarantee
const lv=w.eval(`(()=>{const o=[];for(let wo=0;wo<10;wo++)for(let d=0;d<3;d++){
  const L=withSeed('t'+wo+d,()=>buildLevel(wo,d));
  o.push({need:DIFF[d].coins,pot:L.coinsArr.length+L.blocks.length*4+L.enemies.length*4+30,
          b:L.blocks.length,st:L.stones.length,boss:!!L.boss,fin:!!L.finish});}
  return JSON.stringify(o)})()`);
const rows=JSON.parse(lv);
console.log('30 levels valid:', rows.every(r=>r.boss&&r.fin&&r.b>0&&r.st>=4),
            '| worst coin supply:', Math.min(...rows.map(r=>r.pot/r.need)).toFixed(2)+'×');

// question generation stress, built-in + custom content
w.eval("S.courses=[DEMO_COURSE()]; syncCourses(); SESSION.topics.v=Object.keys(WORDBANK); SESSION.topics.g=Object.keys(GRAMMARBANK);");
const q=w.eval(`(()=>{const bad=[];let n=0;
 for(let d=0;d<3;d++)for(let i=0;i<400;i++){
  try{const x=QM.vocab(d);n++;if(x.kind==='choice'&&(x.options[x.correct]===undefined||new Set(x.options).size!==x.options.length))bad.push('v')}catch(e){bad.push('vt '+e.message)}
  try{const x=QM.grammar(d);n++;if(x.kind==='choice'&&x.options[x.correct]===undefined)bad.push('g')}catch(e){bad.push('gt '+e.message)}}
 return JSON.stringify({n,bad:[...new Set(bad)].slice(0,3),count:bad.length})})()`);
console.log('question stress:', q);

// full playthrough with auto-answers
w.eval(`const _v=QM.vocab.bind(QM),_g=QM.grammar.bind(QM);
 QM.vocab=(...a)=>{window.LASTQ=_v(...a);return window.LASTQ};
 QM.grammar=(...a)=>{window.LASTQ=_g(...a);return window.LASTQ};`);
w.eval("S.hero='moss'; startLevel(0,1);");
const wait=()=>new Promise(r=>setImmediate(r));
function answer(){
  const card=w.document.querySelector('#q-card'); if(!w.document.querySelector('#m-question').classList.contains('on')) return;
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
let t=0, answered=0;
for(let i=0;i<6000;i++){
  if(i%60===0) w.eval("if(LV)LV.hearts=LV.maxHearts");
  w.eval(`K.KeyD=1;K.Space=${(i%22)<7?1:0};K.KeyF=${i%7===0?1:0};K.KeyE=${i%11===0?1:0};`);
  t+=17; w.eval(`if(running) loopStep(${t})`);
  await wait();
  if(w.document.querySelector('#m-question').classList.contains('on')){ answer(); await wait(); answer(); await wait(); answered++ }
  if(w.document.querySelector('#m-quest').classList.contains('on')){
    const b=w.document.querySelector('#quest-card .big-btn')||w.document.querySelector('#quest-card .opt'); b&&b.click();
    await new Promise(r=>setTimeout(r,4)); }
  if(!w.eval('running')) break;
}
if(w.eval('!!LV')) w.eval("LV.hasKey=true;LV.freed=true;LV.bossDead=true;LV.shardsGot=LV.needShards;LV.coins=Math.max(LV.coins,LV.needCoins);LV.finishCd=0;tryFinish()");
await new Promise(r=>setTimeout(r,80));
console.log('playthrough answered:',answered,'| results shown:', w.document.querySelector('#s-results').classList.contains('on'));
console.log('errors:',[...new Set(errs)].slice(0,3), 'total', errs.length);
// frame cost
w.eval("startLevel(9,2); fade=1;");
for(let i=0;i<150;i++){ t+=17; w.eval(`K.KeyD=1;loopStep(${t})`) }
const t0=Date.now(); for(let i=0;i<300;i++){ t+=17; w.eval(`loopStep(${t})`) }
console.log('avg frame:',((Date.now()-t0)/300).toFixed(2),'ms');
