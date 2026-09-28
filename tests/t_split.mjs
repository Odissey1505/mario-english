/* Loads the split project exactly as a web server would serve it. */
import {JSDOM} from 'jsdom';
import {createCanvas, Image as NImage} from 'canvas';
import {serve} from '../tools/serve.mjs';
const PORT=8899;
const server=await serve(process.cwd(),PORT);
const real=createCanvas(960,540); const rctx=real.getContext('2d');
const dom=await JSDOM.fromURL(`http://127.0.0.1:${PORT}/index.html`,{
  runScripts:'dangerously', resources:'usable', pretendToBeVisual:true,
  beforeParse(w){
    const _o=w.HTMLCanvasElement.prototype.getContext;
    w.HTMLCanvasElement.prototype.getContext=function(t){ return this.id==='cv'?rctx:_o.call(this,t) };
    w.Image=NImage; w.matchMedia=()=>({matches:false}); w.requestAnimationFrame=()=>0; w.scrollTo=()=>{};
    const oc=w.document.createElement.bind(w.document);
    w.document.createElement=(t,...a)=>String(t).toLowerCase()==='canvas'?createCanvas(2,2):oc(t,...a);
  }});
const w=dom.window;
const errs=[];
w.addEventListener('error',e=>errs.push(e.message||String(e.error)));
await new Promise(r=>setTimeout(r,1500));
const has=n=>w.eval(`typeof ${n}!=='undefined'`);
console.log('globals present:', ['WORDBANK','GRAMMARBANK','WORLDS','HEROES','BUILTIN_COURSES','QM','Adapt','NET','SHEETS','startLevel','renderCourses','draw']
  .map(n=>n+(has(n)?'✓':'✗')).join(' '));
console.log('built-in course:', w.eval("BUILTIN_COURSES[0].name"), '| lessons:',
  w.eval("BUILTIN_COURSES[0].sections.reduce((n,s)=>n+s.lessons.length,0)"));
console.log('topics:', w.eval("Object.keys(WORDBANK).length"), 'vocab /', w.eval("Object.keys(GRAMMARBANK).length"), 'grammar');
console.log('sprite sheets loaded from files:', w.eval("Object.keys(SHEETS).map(k=>k+'='+SHEETS[k].ok).join(' ')"));
// screens and a short play
for(const id of ['menu','map','topics','diff','brief','shop','backpack','ach','teacher','settings','online','hero','courses']) w.eval(`show('${id}')`);
w.eval("startLevel(0,1)");
let t=0; for(let i=0;i<400;i++){ w.eval(`K.KeyD=1;K.Space=${(i%22)<7?1:0};`); t+=17; w.eval(`if(running&&LV) loopStep(${t})`) }
console.log('level runs:', w.eval("LV? 'x='+Math.round(P.x)+' coins='+LV.coins : 'no level'"));
const q=w.eval(`(()=>{let bad=0; for(let d=0;d<3;d++) for(let i=0;i<300;i++){const a=QM.vocab(d),b=QM.grammar(d);
  if(a.kind==='choice'&&a.options[a.correct]===undefined)bad++; if(b.kind==='choice'&&b.options[b.correct]===undefined)bad++;} return bad})()`);
console.log('1800 questions generated, broken:', q);
console.log('page errors:', errs.length, errs.slice(0,2));
server.close(); process.exit(0);
