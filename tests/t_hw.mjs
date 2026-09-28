import {JSDOM} from 'jsdom'; import fs from 'fs';
const html=fs.readFileSync(process.env.GAME||'dist/index.html','utf8');
const mk=()=>{const d=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'http://localhost/',
 beforeParse(w){const _o=w.HTMLCanvasElement.prototype.getContext;
  const _p=new Proxy({},{get:(t,k)=>(k==='createLinearGradient'||k==='createRadialGradient')?()=>({addColorStop:()=>{}}):()=>{},set:()=>true});
  w.HTMLCanvasElement.prototype.getContext=function(t){return this.id==='cv'?_p:_o.call(this,t)};
  w.matchMedia=()=>({matches:false});w.requestAnimationFrame=()=>0;w.scrollTo=()=>{};}}); return d.window};
const T=mk(), St=mk();
await new Promise(r=>setTimeout(r,250));
T.eval("S.courses=[DEMO_COURSE()];syncCourses();SESSION.topics.v=Object.keys(WORDBANK).filter(isCustom);SESSION.topics.g=Object.keys(GRAMMARBANK).filter(isCustom);SESSION.diff=2;SESSION.world=3;show('teacher')");
T.document.querySelector('#t-make').click();
const code=T.document.querySelector('#t-out code').textContent;
console.log('code length:', code.length);
// student has no courses at all
console.log('student custom topics before:', St.eval("Object.keys(WORDBANK).filter(isCustom).length"));
St.eval("show('teacher')");
St.document.querySelector('#t-in').value=code;
St.document.querySelector('#t-load').click();
console.log('student custom topics after :', St.eval("Object.keys(WORDBANK).filter(isCustom).length"),
            '| diff:', St.eval('SESSION.diff'), '| world:', St.eval('SESSION.world'));
console.log('student can build questions from the teacher\'s lesson:',
  St.eval("(()=>{try{const q=QM.vocab(2);return q.tag+' → '+q.answer}catch(e){return 'FAIL '+e.message}})()"));
// identical level for teacher and student
T.eval("show('brief')"); T.document.querySelector('#start-level').click();
St.document.querySelector('#start-level').click();
console.log('seeds match:', T.eval('LV.seed')===St.eval('LV.seed'), T.eval('LV.seed'));
const sig=w=>w.eval("JSON.stringify({w:Math.round(LV.w),b:LV.blocks.map(b=>Math.round(b.x)+b.type).join(''),e:LV.enemies.map(e=>e.kind).join('')})");
console.log('teacher and student get the identical level:', sig(T)===sig(St));
