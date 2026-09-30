/* A wrong answer freezes questions for ten seconds, and one answer per question is final —
   the correct option can never be tapped after a wrong one. */
import {JSDOM} from 'jsdom'; import fs from 'fs';
const html=fs.readFileSync(process.env.GAME||'dist/index.html','utf8');
const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'http://localhost/',
 beforeParse(w){ const _o=w.HTMLCanvasElement.prototype.getContext;
  const _p=new Proxy({},{get:(t,k)=>(k==='createLinearGradient'||k==='createRadialGradient')?()=>({addColorStop:()=>{}}):()=>{},set:()=>true});
  w.HTMLCanvasElement.prototype.getContext=function(t){return this.id==='cv'?_p:_o.call(this,t)};
  w.matchMedia=()=>({matches:false});w.requestAnimationFrame=()=>0;w.scrollTo=()=>{}; }});
const w=dom.window, D=w.document;
await new Promise(r=>setTimeout(r,300));
let bad=0; const fail=m=>{ console.log('FAIL '+m); bad++ };
const tick=n=>w.eval('update('+n+')');

/* choose-only, so every question in this test is a set of buttons */
w.eval("S.opts={emoji:true,answer:'choice'};SESSION.world=0;SESSION.diff=1;S.gear.eq={};S.boosts={};startLevel(0,1,{seed:'freeze'})");
await new Promise(r=>setTimeout(r,80));

/* --- a wrong choice: frozen, and the right option is dead --- */
const q=w.eval("JSON.stringify(QM.vocab(1))");
w.eval("window.__r=null; ask("+q+").then(r=>window.__r=r)");
await new Promise(r=>setTimeout(r,60));
let opts=[...D.querySelectorAll('#q-card .opt')];
if(opts.length<2) fail('the question did not render its options');
const correct=JSON.parse(q).correct;
const wrongIdx=correct===0?1:0;
opts[wrongIdx].click();
await new Promise(r=>setTimeout(r,60));
if(!w.eval('LV.freeze>0')) fail('a wrong answer did not freeze the player');
const secs=w.eval('Math.ceil(LV.freeze/60)');
if(secs!==10) fail('the freeze is not ten seconds long (got '+secs+')');
if(!/Frozen for 10 seconds/.test(D.querySelector('#q-card .fb').textContent)) fail('the card does not explain the freeze');

/* tapping the correct option afterwards must change nothing */
const before=w.eval('JSON.stringify(LV.stats)');
opts[correct].click();
await new Promise(r=>setTimeout(r,60));
if(w.eval('JSON.stringify(LV.stats)')!==before) fail('the correct answer was still accepted after a wrong one');
if(D.querySelector('#q-card .opt.ok')!==opts[correct]) fail('the right answer is not revealed');
if(!opts[correct].className.includes('ok')||!opts[wrongIdx].className.includes('bad')) fail('the options are not marked');
if(w.eval("document.querySelector('#q-card .opts').parentElement.style.pointerEvents")!=='none')
  fail('the answer area still takes clicks after an answer');
[...D.querySelectorAll('#q-card .big-btn')].pop().click();   /* "Got it →" */
await new Promise(r=>setTimeout(r,60));
if(w.eval('askActive')) fail('the question did not close');

/* --- while frozen, nothing may open a question --- */
const fresh=()=>w.eval('askActive');
w.eval("LV.busy=false");
const blk=w.eval("(function(){const b=LV.blocks.find(b=>!b.used); b.used=false; hitBlock(b); return b.used})()");
await new Promise(r=>setTimeout(r,60));
if(fresh()) fail('a block still opened a question during the freeze');
if(blk) fail('the block was consumed during the freeze');
w.eval("(function(){const e=LV.enemies.find(e=>e.alive); if(e) fight(e)})()");
await new Promise(r=>setTimeout(r,60));
if(fresh()) fail('a monster still opened a question during the freeze');
w.eval("(function(){const st=LV.stones[0]; if(st){ P.x=st.x; P.y=st.y-10; interact() }})()");
await new Promise(r=>setTimeout(r,60));
if(fresh()) fail('a rune stone still opened a question during the freeze');
if(D.querySelector('#freezebox').style.display==='none') fail('the freeze is not shown in the HUD');
console.log('HUD while frozen:', D.querySelector('#freezebox').textContent);

/* --- it thaws on its own, and questions work again --- */
for(let i=0;i<12;i++) tick(60);          /* ~12 s of play */
if(w.eval('LV.freeze')!==0) fail('the freeze did not run out (left '+w.eval('LV.freeze')+')');
w.eval("LV.busy=false;(function(){const b=LV.blocks.find(b=>!b.used); hitBlock(b)})()");
await new Promise(r=>setTimeout(r,80));
if(!w.eval('askActive')) fail('questions did not come back after the thaw');
w.eval("unstick('test')");

/* --- a right answer never freezes --- */
w.eval("LV.freeze=0;LV.busy=false");
const q2=w.eval("JSON.stringify(QM.vocab(1))");
w.eval("ask("+q2+")");
await new Promise(r=>setTimeout(r,60));
[...D.querySelectorAll('#q-card .opt')][JSON.parse(q2).correct].click();
await new Promise(r=>setTimeout(r,60));
if(w.eval('LV.freeze>0')) fail('a correct answer froze the player');
[...D.querySelectorAll('#q-card .big-btn')].pop().click();
await new Promise(r=>setTimeout(r,60));

/* --- Second Chance forgives instead of handing the question back --- */
w.eval("LV.freeze=0;LV.busy=false;S.boosts.second=1;LV.boosts.second=1");
const q3=w.eval("JSON.stringify(QM.vocab(1))");
w.eval("ask("+q3+")");
await new Promise(r=>setTimeout(r,60));
const chip=[...D.querySelectorAll('#q-card .bchip')].find(b=>/Forgive/.test(b.textContent));
if(!chip) fail('the Second Chance boost is not offered as forgiveness');
chip.click();
const o3=[...D.querySelectorAll('#q-card .opt')];
const c3=JSON.parse(q3).correct;
o3[c3===0?1:0].click();
await new Promise(r=>setTimeout(r,60));
if(w.eval('LV.freeze>0')) fail('a forgiven mistake still froze the player');
if(!/protected you/.test(D.querySelector('#q-card .fb').textContent)) fail('the card does not say the mistake was absorbed');
const st3=w.eval('JSON.stringify(LV.stats)');
o3[c3].click();
await new Promise(r=>setTimeout(r,60));
if(w.eval('JSON.stringify(LV.stats)')!==st3) fail('Second Chance still let the question be answered twice');

console.log(bad?('t_freeze: '+bad+' problem(s)'):'t_freeze: ok');
process.exit(bad?1:0);
