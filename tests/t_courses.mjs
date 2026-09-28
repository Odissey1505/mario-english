import {JSDOM} from 'jsdom';
import fs from 'fs';
const html=fs.readFileSync(process.env.GAME||'dist/index.html','utf8');
const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'http://localhost/',
 beforeParse(w){ const _o=w.HTMLCanvasElement.prototype.getContext;
  const _p=new Proxy({},{get:(t,k)=>(k==='createLinearGradient'||k==='createRadialGradient')?()=>({addColorStop:()=>{}}):()=>{},set:()=>true});
  w.HTMLCanvasElement.prototype.getContext=function(t){ return this.id==='cv'?_p:_o.call(this,t) };
  w.matchMedia=()=>({matches:false}); w.requestAnimationFrame=()=>0; w.scrollTo=()=>{}; }});
const w=dom.window;
await new Promise(r=>setTimeout(r,200));
// load the example course
w.eval("S.courses=[DEMO_COURSE()]; syncCourses();");
console.log('custom vocab topics:', w.eval("Object.keys(WORDBANK).filter(isCustom).length"),
            '| custom grammar topics:', w.eval("Object.keys(GRAMMARBANK).filter(isCustom).length"));
console.log('names:', w.eval("Object.keys(WORDBANK).filter(isCustom).map(k=>WORDBANK[k].n).join(' / ')"));
console.log('words merged into WORDS_FLAT:', w.eval("WORDS_FLAT.filter(x=>isCustom(x.topic)).length"));
// questions generated from custom content only
w.eval("SESSION.topics.v=Object.keys(WORDBANK).filter(isCustom); SESSION.topics.g=Object.keys(GRAMMARBANK).filter(isCustom);");
const out=w.eval(`(()=>{const r={v:{},g:{},bad:[]};
 for(let d=0;d<3;d++) for(let i=0;i<300;i++){
   try{ const q=QM.vocab(d); r.v[q.kind]=(r.v[q.kind]||0)+1;
     if(q.kind==='choice'&&q.options[q.correct]===undefined) r.bad.push('vocab');
     if(!/kitchen|bedroom|bathroom|garden|stairs|attic|sofa|wardrobe|shelf|carpet/.test(String(q.answer)+String(q.correct))) r.bad.push('leak:'+q.answer);
   }catch(e){ r.bad.push('vthrow '+e.message) }
   try{ const q=QM.grammar(d); r.g[q.kind]=(r.g[q.kind]||0)+1;
     if(q.kind==='choice'&&q.options[q.correct]===undefined) r.bad.push('gram');
   }catch(e){ r.bad.push('gthrow '+e.message) } }
 return JSON.stringify({v:r.v,g:r.g,bad:[...new Set(r.bad)].slice(0,4),n:r.bad.length})})()`);
console.log('generated from custom content:', out);
// text round-trip
const rt=w.eval(`(()=>{const le=S.courses[0].sections[0].lessons[0];
 const wt=wordsToText(le.words), gt=grammarToText(le.grammar);
 const w2=parseWords(wt), g2=parseGrammar(gt);
 return JSON.stringify({wordsSame:JSON.stringify(w2)===JSON.stringify(le.words),
   grammarSame:JSON.stringify(g2)===JSON.stringify(le.grammar), sampleG:gt.split('\\n')[2]})})()`);
console.log('round-trip:', rt);
// UI walk
w.eval("show('courses')");
console.log('course list rendered:', w.document.querySelectorAll('[data-co]').length);
w.document.querySelector('[data-co]').click();
console.log('sections:', w.document.querySelectorAll('[data-se]').length);
w.document.querySelector('[data-se]').click();
console.log('lessons:', w.document.querySelectorAll('[data-le]').length);
w.document.querySelector('[data-le]').click();
console.log('editor has textareas:', !!w.document.querySelector('#cb-words'), !!w.document.querySelector('#cb-gram'));
// edit and save
w.document.querySelector('#cb-words').value="window | 🪟 | you look through it\nroof | | the top of a house";
w.document.querySelector('#cb-gram').value="She ___ at home. | is; are; am | 1 | Use is with she.";
w.document.querySelector('#cb-save').click();
console.log('after save:', w.eval("JSON.stringify(S.courses[0].sections[0].lessons[0].words)"));
console.log('msg:', w.document.querySelector('#cb-msg')?.textContent);
