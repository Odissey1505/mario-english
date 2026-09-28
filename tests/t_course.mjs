import {JSDOM} from 'jsdom'; import fs from 'fs';
const html=fs.readFileSync(process.env.GAME||'dist/index.html','utf8');
const d=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'http://localhost/',
 beforeParse(w){ const _o=w.HTMLCanvasElement.prototype.getContext;
  const _p=new Proxy({},{get:(t,k)=>(k==='createLinearGradient'||k==='createRadialGradient')?()=>({addColorStop:()=>{}}):()=>{},set:()=>true});
  w.HTMLCanvasElement.prototype.getContext=function(t){return this.id==='cv'?_p:_o.call(this,t)};
  w.matchMedia=()=>({matches:false});w.requestAnimationFrame=()=>0;w.scrollTo=()=>{};}});
const w=d.window; await new Promise(r=>setTimeout(r,400));
const c=w.eval("BUILTIN_COURSES[0]");
console.log('course:', w.eval("BUILTIN_COURSES[0].name"), '| units:', w.eval("BUILTIN_COURSES[0].sections.length"),
  '| lessons:', w.eval("BUILTIN_COURSES[0].sections.reduce((n,s)=>n+s.lessons.length,0)"));
console.log('units:', w.eval("BUILTIN_COURSES[0].sections.map(s=>s.name+' ('+s.lessons.length+')').join(' | ')"));
console.log('topics registered — vocab:', w.eval("Object.keys(WORDBANK).filter(k=>k.startsWith('cv:b')).length"),
            'grammar:', w.eval("Object.keys(GRAMMARBANK).filter(k=>k.startsWith('cg:b')).length"));

// per-lesson: how many DISTINCT vocabulary tasks can the engine build?
const per=JSON.parse(w.eval(`(()=>{const out=[];
 const keys=Object.keys(WORDBANK).filter(k=>k.startsWith('cv:b'));
 for(const k of keys){
   SESSION.topics.v=[k];
   const set=new Set(); S.opts={emoji:true,answer:'mixed'};
   for(let i=0;i<1200;i++){ const q=QM.vocab(1); set.add((q.prompt||'')+'§'+(q.sub||'')); }
   out.push([WORDBANK[k].n.split(' › ').pop(), WORDBANK[k].lv[0].length, set.size]);
 }
 return JSON.stringify(out)})()`));
const low=per.filter(x=>x[2]<20);
console.log('lessons checked:', per.length, '| min distinct vocab tasks:', Math.min(...per.map(x=>x[2])),
            '| max:', Math.max(...per.map(x=>x[2])), '| below 20:', low.length);
console.log('sample:', per.slice(0,3).map(x=>x[0]+': '+x[1]+' words → '+x[2]+' tasks').join(' | '));

// grammar per lesson
const g=JSON.parse(w.eval(`(()=>{const out=[];
 for(const k of Object.keys(GRAMMARBANK).filter(k=>k.startsWith('cg:b'))){
   const q=GRAMMARBANK[k].q[0];
   out.push([GRAMMARBANK[k].n.split(' › ').pop(), q.length, [...new Set(q.map(x=>x.k))].sort().join('/')]);
 } return JSON.stringify(out)})()`));
console.log('grammar per lesson: min', Math.min(...g.map(x=>x[1])), 'max', Math.max(...g.map(x=>x[1])),
            '| kind mixes:', [...new Set(g.map(x=>x[2]))].join(' , '));

// every mode across the whole course
for(const mode of ['choice','mixed','typing']){
  const r=JSON.parse(w.eval(`(()=>{S.opts={emoji:true,answer:'${mode}'};
    SESSION.topics.v=Object.keys(WORDBANK).filter(k=>k.startsWith('cv:b'));
    SESSION.topics.g=Object.keys(GRAMMARBANK).filter(k=>k.startsWith('cg:b'));
    const bad=[],kinds={};
    for(let d=0;d<3;d++) for(let i=0;i<1500;i++){
      const q=QM.vocab(d); kinds['v'+q.kind]=(kinds['v'+q.kind]||0)+1;
      if(q.kind==='choice'&&(q.options[q.correct]===undefined||new Set(q.options).size!==q.options.length)) bad.push('vocab options');
      if(q.kind==='seq'&&q.tokens.length>14) bad.push('long scramble: '+q.answer);
      const x=QM.grammar(d); kinds['g'+x.kind]=(kinds['g'+x.kind]||0)+1;
      if(x.kind==='choice'&&x.options[x.correct]===undefined) bad.push('grammar options');
      if(x.kind==='input'&&!String(x.correct).trim()) bad.push('empty answer');
    }
    return JSON.stringify({kinds,bad:[...new Set(bad)].slice(0,3),n:bad.length})})()`));
  console.log(mode.padEnd(6), JSON.stringify(r.kinds), 'problems:', r.n, r.bad);
}
