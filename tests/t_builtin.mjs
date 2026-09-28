import {JSDOM} from 'jsdom'; import fs from 'fs';
const html=fs.readFileSync(process.env.GAME||'dist/index.html','utf8');
const d=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'http://localhost/',
 beforeParse(w){ const _o=w.HTMLCanvasElement.prototype.getContext;
  const _p=new Proxy({},{get:(t,k)=>(k==='createLinearGradient'||k==='createRadialGradient')?()=>({addColorStop:()=>{}}):()=>{},set:()=>true});
  w.HTMLCanvasElement.prototype.getContext=function(t){return this.id==='cv'?_p:_o.call(this,t)};
  w.matchMedia=()=>({matches:false});w.requestAnimationFrame=()=>0;w.scrollTo=()=>{};}});
const w=d.window; await new Promise(r=>setTimeout(r,300));
console.log('built-in courses:', w.eval("BUILTIN_COURSES.length"), '| lessons:',
  w.eval("BUILTIN_COURSES[0].sections.reduce((n,s)=>n+s.lessons.length,0)"));
console.log('vocab topics:', w.eval("Object.keys(WORDBANK).filter(k=>k.startsWith('cv:b')).length"),
            '| grammar topics:', w.eval("Object.keys(GRAMMARBANK).filter(k=>k.startsWith('cg:b')).length"));
console.log('sample topic name:', w.eval("WORDBANK[Object.keys(WORDBANK).filter(k=>k.startsWith('cv:b'))[0]].n"));
// play a built-in lesson only
w.eval("SESSION.topics.v=Object.keys(WORDBANK).filter(k=>k.startsWith('cv:b')); SESSION.topics.g=Object.keys(GRAMMARBANK).filter(k=>k.startsWith('cg:b'));");
for(const mode of ['choice','mixed','typing']){
  const r=JSON.parse(w.eval(`(()=>{S.opts={emoji:true,answer:'${mode}'};
    const kinds={},bad=[]; const prompts=new Set();
    for(let d=0;d<3;d++) for(let i=0;i<900;i++){
      const q=QM.vocab(d); kinds['v:'+q.kind]=(kinds['v:'+q.kind]||0)+1;
      if(q.kind==='choice'&&(q.options[q.correct]===undefined||new Set(q.options).size!==q.options.length)) bad.push('v');
      if(q.kind==='seq'&&q.tokens.length>14) bad.push('scramble too long: '+q.answer);
      prompts.add((q.prompt||'')+'|'+(q.sub||''));
      const g=QM.grammar(d); kinds['g:'+g.kind]=(kinds['g:'+g.kind]||0)+1;
      if(g.kind==='choice'&&g.options[g.correct]===undefined) bad.push('g');
    }
    return JSON.stringify({kinds,bad:[...new Set(bad)].slice(0,3),n:bad.length,distinct:prompts.size})})()`));
  console.log(mode.padEnd(6), JSON.stringify(r.kinds), '| distinct vocab prompts:', r.distinct, '| problems:', r.n, r.bad);
}
// UI
w.eval("show('courses')");
console.log('built-in shown in list:', w.document.querySelectorAll('[data-bco]').length);
w.document.querySelector('[data-bco]').click();
console.log('sections:', w.document.querySelectorAll('[data-se]').length, '| copy button:', !!w.document.querySelector('#cb-copy'));
w.document.querySelector('[data-se]').click();
console.log('lessons:', w.document.querySelectorAll('[data-le]').length, '| per-lesson play:', w.document.querySelectorAll('[data-plle]').length);
w.document.querySelector('[data-le]').click();
console.log('editor read-only:', w.document.querySelector('#cb-words').hasAttribute('readonly'), '| no save button:', !w.document.querySelector('#cb-save'));
