import {JSDOM} from 'jsdom'; import fs from 'fs';
const html=fs.readFileSync(process.env.GAME||'dist/index.html','utf8');
const d=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'http://localhost/',
 beforeParse(w){ const _o=w.HTMLCanvasElement.prototype.getContext;
  const _p=new Proxy({},{get:(t,k)=>(k==='createLinearGradient'||k==='createRadialGradient')?()=>({addColorStop:()=>{}}):()=>{},set:()=>true});
  w.HTMLCanvasElement.prototype.getContext=function(t){return this.id==='cv'?_p:_o.call(this,t)};
  w.matchMedia=()=>({matches:false});w.requestAnimationFrame=()=>0;w.scrollTo=()=>{};}});
const w=d.window; await new Promise(r=>setTimeout(r,300));
w.eval("S.courses=[DEMO_COURSE()];syncCourses();SESSION.topics.v=Object.keys(WORDBANK);SESSION.topics.g=Object.keys(GRAMMARBANK);");

function probe(mode,emoji,n=2500){
  return JSON.parse(w.eval(`(()=>{
    S.opts={emoji:${emoji},answer:'${mode}'};
    const v={},g={}; let emojiSeen=0, typedV=0, typedG=0, bad=0;
    for(let d=0;d<3;d++) for(let i=0;i<${n};i++){
      const q=QM.vocab(d); v[q.kind]=(v[q.kind]||0)+1;
      if(q.kind!=='choice') typedV++;
      const text=(q.prompt||'')+(q.sub||'')+(q.options||[]).join('');
      if(/[\\u{1F300}-\\u{1FAFF}\\u{2600}-\\u{27BF}]/u.test(text)) emojiSeen++;
      if(q.kind==='choice'&&q.options[q.correct]===undefined) bad++;
      const r=QM.grammar(d); g[r.kind]=(g[r.kind]||0)+1;
      if(r.kind!=='choice') typedG++;
      if(r.kind==='choice'&&r.options[r.correct]===undefined) bad++;
    }
    return JSON.stringify({v,g,emojiSeen,typedV,typedG,bad})})()`));
}
for(const [m,e] of [['choice',true],['mixed',true],['typing',true],['mixed',false],['choice',false]]){
  const r=probe(m,e);
  console.log(`mode=${m.padEnd(6)} emoji=${String(e).padEnd(5)} | vocab ${JSON.stringify(r.v)} | grammar ${JSON.stringify(r.g)}`);
  console.log(`   typed vocab ${r.typedV}, typed grammar ${r.typedG}, emoji seen in ${r.emojiSeen} tasks, broken ${r.bad}`);
}

console.log('\n--- typing mode: sample grammar questions ---');
console.log(w.eval(`(()=>{S.opts={emoji:true,answer:'typing'};
 const seen=new Set(), out=[];
 for(let i=0;i<400&&out.length<10;i++){ const q=QM.grammar(1+(i%2));
   const k=q.prompt; if(seen.has(k))continue; seen.add(k);
   out.push('['+q.kind+'] '+q.prompt+'  →  '+String(q.correct).split('|')[0]); }
 return out.join('\\n')})()`));
console.log('\n--- choice mode: sample vocabulary (pictures off) ---');
console.log(w.eval(`(()=>{S.opts={emoji:false,answer:'choice'};
 const seen=new Set(), out=[];
 for(let i=0;i<400&&out.length<6;i++){ const q=QM.vocab(1+(i%2));
   if(seen.has(q.prompt+q.sub))continue; seen.add(q.prompt+q.sub);
   out.push(q.prompt+' | '+q.sub+'  →  ['+q.options.join(' / ')+'] ✔ '+q.options[q.correct]); }
 return out.join('\\n')})()`));
