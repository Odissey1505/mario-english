import {JSDOM} from 'jsdom'; import fs from 'fs';
const html=fs.readFileSync(process.env.GAME||'dist/index.html','utf8');
const d=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'http://localhost/',
 beforeParse(w){const _o=w.HTMLCanvasElement.prototype.getContext;
  const _p=new Proxy({},{get:(t,k)=>(k==='createLinearGradient'||k==='createRadialGradient')?()=>({addColorStop:()=>{}}):()=>{},set:()=>true});
  w.HTMLCanvasElement.prototype.getContext=function(t){return this.id==='cv'?_p:_o.call(this,t)};
  w.matchMedia=()=>({matches:false});w.requestAnimationFrame=()=>0;w.scrollTo=()=>{};}});
const w=d.window; await new Promise(r=>setTimeout(r,250));
w.eval("S.courses=[DEMO_COURSE()];syncCourses();SESSION.topics.v=Object.keys(WORDBANK);SESSION.topics.g=Object.keys(GRAMMARBANK);");
console.log(w.eval(`(()=>{let dup=0,bad=0,n=0;
 for(let d=0;d<3;d++)for(let i=0;i<4000;i++){const q=QM.vocab(d);n++;
  if(q.kind==='choice'){ if(new Set(q.options).size!==q.options.length)dup++; if(q.options[q.correct]===undefined)bad++; }}
 return '12000 vocabulary questions → duplicate options: '+dup+', broken: '+bad})()`));
