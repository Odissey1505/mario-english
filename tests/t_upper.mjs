/* The Upper-Intermediate course: every lesson must offer 20+ different vocabulary tasks and
   20+ different grammar tasks, no listen-and-repeat anywhere, and a fair set of options. */
import {JSDOM} from 'jsdom'; import fs from 'fs';
const html=fs.readFileSync(process.env.GAME||'dist/index.html','utf8');
const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'http://localhost/',
 beforeParse(w){ const _o=w.HTMLCanvasElement.prototype.getContext;
  const _p=new Proxy({},{get:(t,k)=>(k==='createLinearGradient'||k==='createRadialGradient')?()=>({addColorStop:()=>{}}):()=>{},set:()=>true});
  w.HTMLCanvasElement.prototype.getContext=function(t){return this.id==='cv'?_p:_o.call(this,t)};
  w.matchMedia=()=>({matches:false});w.requestAnimationFrame=()=>0;w.scrollTo=()=>{}; }});
const w=dom.window;
await new Promise(r=>setTimeout(r,400));
let bad=0; const fail=m=>{ console.log('FAIL '+m); bad++ };
const J=x=>JSON.parse(w.eval('JSON.stringify('+x+')'));

/* --- the course is there, in the right place --- */
const courses=J("BUILTIN_COURSES.map(c=>({n:c.name,s:c.sections.length,l:c.sections.reduce((a,x)=>a+x.lessons.length,0)}))");
console.log('built-in courses:', courses.map(c=>c.n+' ('+c.s+' units, '+c.l+' lessons)').join(' | '));
if(courses.length!==2) fail('expected two built-in courses, found '+courses.length);
if(courses[0].n!=='English 10–12 · Intermediate') fail('the first course moved — lesson keys (cv:b0…) would break');
const up=courses[1];
if(!/Upper-Intermediate/.test(up.n)) fail('the Upper-Intermediate course is not the second one');
if(up.l!==29) fail('expected 29 Upper-Intermediate lessons, found '+up.l);
if(up.s!==8) fail('expected 8 Upper-Intermediate units, found '+up.s);

/* --- every lesson of it, measured through the real generators --- */
const lessons=J(`BUILTIN_COURSES[1].sections.flatMap((se,si)=>se.lessons.map((le,li)=>
  ({unit:se.name,name:le.name,key:'b1.'+si+'.'+li,words:le.words.length,gram:le.grammar.length})))`);
const rows=[]; let listen=0, dup=0, leak=0, thin=0;
for(const L of lessons){
  const r=J(`(function(){
    SESSION.topics.v=['cv:${L.key}']; SESSION.topics.g=['cg:${L.key}'];
    S.opts={emoji:true,answer:'mixed'}; S.words={}; S.gram={};
    const vp=new Set(), gp=new Set(), kinds={}, pos={};
    let listen=0, dup=0, leak=0, thin=0;
    for(let i=0;i<260;i++){
      const q=QM.vocab(1); vp.add(q.prompt+'|'+(q.sub||''));
      kinds['v:'+q.kind]=(kinds['v:'+q.kind]||0)+1;
      if(/Listen and/.test(q.prompt)) listen++;
      if(q.options){ if(new Set(q.options).size!==q.options.length) dup++;
        const a=String(q.options[q.correct]).toLowerCase();
        if(a.length>3&&(q.prompt+' '+(q.sub||'')).toLowerCase().includes(a)) leak++; }
    }
    for(let i=0;i<260;i++){
      const q=QM.grammar(1); gp.add(q.prompt+'|'+(q.sub||''));
      kinds['g:'+q.kind]=(kinds['g:'+q.kind]||0)+1;
      if(q.options){ if(new Set(q.options).size!==q.options.length) dup++;
        pos[q.correct]=(pos[q.correct]||0)+1; }
      if((q.ee||'').length<18) thin++;
    }
    return {v:vp.size,g:gp.size,kinds,listen,dup,leak,thin,pos};
  })()`);
  rows.push({...L,...r});
  listen+=r.listen; dup+=r.dup; leak+=r.leak; thin+=r.thin;
  if(r.v<20) fail(L.name+': only '+r.v+' different vocabulary tasks (needs 20+)');
  if(r.g<20) fail(L.name+': only '+r.g+' different grammar tasks (needs 20+)');
}
if(listen) fail(listen+' listen-and-repeat vocabulary tasks appeared — this course must use English definitions');
if(dup) fail(dup+' questions had a repeated option');
if(leak) fail(leak+' questions gave the answer away inside the prompt');
if(thin) fail(thin+' grammar questions had no real explanation');

const worstV=rows.reduce((a,b)=>a.v<b.v?a:b), worstG=rows.reduce((a,b)=>a.g<b.g?a:b);
console.log('lessons measured:', rows.length,
  '| fewest distinct vocabulary tasks:', worstV.v, '('+worstV.name+')',
  '| fewest distinct grammar tasks:', worstG.g, '('+worstG.name+')');
console.log('words in the course:', rows.reduce((a,r)=>a+r.words,0),
            '| authored grammar questions:', rows.reduce((a,r)=>a+r.gram,0));

/* --- the answer must not always sit in the same slot --- */
const pos={};
rows.forEach(r=>Object.entries(r.pos).forEach(([k,v])=>pos[k]=(pos[k]||0)+v));
const total=Object.values(pos).reduce((a,b)=>a+b,0);
const share=Object.entries(pos).map(([k,v])=>[k,v/total]);
console.log('correct grammar option by slot:', share.map(([k,v])=>k+': '+(v*100).toFixed(0)+'%').join(', '));
if(share.some(([,v])=>v>0.55)) fail('the correct grammar option sits in one slot '+
  Math.round(Math.max(...share.map(x=>x[1]))*100)+'% of the time — a learner can tap it without reading');

/* --- but an error-spotting question must keep its chunks in sentence order --- */
const er=J(`(function(){
  SESSION.topics.g=Object.keys(GRAMMARBANK).filter(k=>k.startsWith('cg:b1.'));
  S.opts={emoji:true,answer:'choice'};
  let seen=0, scrambled=0;
  for(let i=0;i<600;i++){
    const q=QM.grammar(1);
    if(q.sub!=='Tap the mistake'||!q.options) continue;
    seen++;
    const flat=q.prompt.toLowerCase().replace(/[^a-z0-9]/g,'');
    let at=0, ok=true;
    for(const o of q.options){ const n=o.toLowerCase().replace(/[^a-z0-9]/g,'');
      const k=flat.indexOf(n,at); if(k<0){ ok=false; break } at=k+n.length }
    if(!ok) scrambled++;
  }
  return {seen,scrambled};
})()`);
console.log('error-spotting questions seen:', er.seen, '| with chunks out of order:', er.scrambled);
if(!er.seen) fail('no error-spotting questions were generated at all');
if(er.scrambled) fail(er.scrambled+' error-spotting questions had their sentence chunks shuffled');

/* --- a level really builds and plays from an Upper-Intermediate lesson --- */
w.eval(`SESSION.topics.v=['cv:b1.0.0']; SESSION.topics.g=['cg:b1.0.0'];
        SESSION.world=1; SESSION.diff=1; startLevel(1,1,{seed:'upper'});`);
await new Promise(r=>setTimeout(r,80));
if(!w.eval('!!LV')) fail('a level could not be built from an Upper-Intermediate lesson');
const q=J("(function(){const q=QM.vocab(1);return {tag:q.tag,prompt:q.prompt,sub:q.sub}})()");
if(!/Feelings Run High/.test(q.tag)) fail('the question is not tagged with the lesson: '+q.tag);
console.log('sample from lesson 9:', q.tag, '→', q.prompt, '·', (q.sub||'').slice(0,60));

console.log(bad?('t_upper: '+bad+' problem(s)'):'t_upper: ok');
process.exit(bad?1:0);
