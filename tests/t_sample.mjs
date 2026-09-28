import {JSDOM} from 'jsdom'; import fs from 'fs';
const html=fs.readFileSync(process.env.GAME||'dist/index.html','utf8');
const d=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'http://localhost/',
 beforeParse(w){ const _o=w.HTMLCanvasElement.prototype.getContext;
  const _p=new Proxy({},{get:(t,k)=>(k==='createLinearGradient'||k==='createRadialGradient')?()=>({addColorStop:()=>{}}):()=>{},set:()=>true});
  w.HTMLCanvasElement.prototype.getContext=function(t){return this.id==='cv'?_p:_o.call(this,t)};
  w.matchMedia=()=>({matches:false});w.requestAnimationFrame=()=>0;w.scrollTo=()=>{};}});
const w=d.window; await new Promise(r=>setTimeout(r,400));
// Lesson 16 (Protect the planet) as the student sees it
w.eval(`const k=Object.keys(WORDBANK).filter(x=>x.startsWith('cv:b')).find(x=>/Protect the planet/.test(WORDBANK[x].n));
 SESSION.topics.v=[k]; SESSION.topics.g=[k.replace('cv:','cg:')]; S.opts={emoji:true,answer:'mixed'};`);
console.log('--- VOCABULARY, one lesson, eight different task types ---');
console.log(w.eval(`(()=>{const seen=new Set(),out=[];
 for(let i=0;i<3000&&out.length<8;i++){ const q=QM.vocab(1);
   const t=(q.pic?'picture':q.kind==='seq'?'anagram':q.kind==='input'?(/Complete/.test(q.prompt)?'missing letters':'type it'):q.prompt.slice(0,22));
   if(seen.has(t))continue; seen.add(t);
   out.push('• '+q.prompt+(q.sub?'  ['+q.sub+']':'')+'\\n    '+(q.options?q.options.join(' / '):'answer: '+String(q.correct).split('|')[0])+(q.options?'   ✔ '+q.options[q.correct]:'')); }
 return out.join('\\n')})()`));
console.log('\n--- GRAMMAR, same lesson ---');
console.log(w.eval(`(()=>{const seen=new Set(),out=[];
 for(let i=0;i<3000&&out.length<8;i++){ const q=QM.grammar(1);
   if(seen.has(q.prompt))continue; seen.add(q.prompt);
   out.push('• ['+q.kind+'] '+q.prompt+'\\n    '+(q.options?q.options.join(' / ')+'   ✔ '+q.options[q.correct]:'✔ '+String(q.correct).split('|')[0])+'\\n    → '+q.ee); }
 return out.join('\\n')})()`));
console.log('\n--- typed grammar built from a choice question (Write it out mode) ---');
console.log(w.eval(`(()=>{S.opts={emoji:true,answer:'typing'};const seen=new Set(),out=[];
 for(let i=0;i<600&&out.length<4;i++){ const q=QM.grammar(1);
   if(q.kind!=='input'||seen.has(q.prompt))continue; seen.add(q.prompt);
   out.push('• '+q.prompt+'  ['+q.sub+']   ✔ '+String(q.correct).split('|')[0]); }
 return out.join('\\n')})()`));
