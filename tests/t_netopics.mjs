/* Two linked clients: the host picks topics in the lobby, the guest sees them, both play them. */
import {JSDOM} from 'jsdom'; import fs from 'fs'; import WS from 'ws';
import {serve} from '../tools/serve.mjs';
const html=fs.readFileSync(process.env.GAME||'dist/index.html','utf8');
function boot(){
  const d=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'http://localhost/',
   beforeParse(w){ const _o=w.HTMLCanvasElement.prototype.getContext;
    const _p=new Proxy({},{get:(t,k)=>(k==='createLinearGradient'||k==='createRadialGradient')?()=>({addColorStop:()=>{}}):()=>{},set:()=>true});
    w.HTMLCanvasElement.prototype.getContext=function(t){return this.id==='cv'?_p:_o.call(this,t)};
    w.matchMedia=()=>({matches:false});w.requestAnimationFrame=()=>0;w.scrollTo=()=>{};w.WebSocket=WS;}});
  return d.window;
}
const A=boot(), B=boot();
await new Promise(r=>setTimeout(r,500));
function link(x,y,role,name,avatar){
  x.eval(`NET.on=true;NET.role='${role}';NET.code='TOPI';NET.mode='coop';S.name='${name}';S.avatar='${avatar}';
          NET.mate={name:'other',avatar:'🙂',hero:'azure'};`);
  x.eval("NET.send=function(m){ window.__out(m) };");
  x.__out=m=>y.eval("(function(m){NET.onMsg(m)})")(JSON.parse(JSON.stringify(m)));
}
link(A,B,'host','Taras','🦊'); link(B,A,'guest','Olia','🐼');
A.eval("show('online')");
console.log('host lobby has a lesson picker:', !!A.document.querySelector('#net-lesson'),
            '| built-in topic chips:', A.document.querySelectorAll('[data-nettopic]').length,
            '| difficulty buttons:', A.document.querySelectorAll('[data-netdiff]').length);
const opts=[...A.document.querySelectorAll('#net-lesson option')];
console.log('lessons offered:', opts.length-1, '| first:', opts[1] && opts[1].textContent.slice(0,60));
// guest before the host picks anything
B.eval("show('online')");
console.log('guest before:', B.document.querySelector('#net-body').textContent.replace(/\s+/g,' ').match(/What the room will play.{0,60}/)[0]);
// host picks a course lesson
const sel=A.document.querySelector('#net-lesson');
const idx=opts.findIndex(o=>/Lesson 16/.test(o.textContent));
sel.value=String(idx-1); sel.dispatchEvent(new A.window.Event('change'));
await new Promise(r=>setTimeout(r,40));
console.log('host topics now:', A.eval("topicSummary(SESSION.topics.v,WORDBANK,2)+' / '+topicSummary(SESSION.topics.g,GRAMMARBANK,2)"));
B.eval("show('online')");
console.log('guest sees:', B.document.querySelector('#net-body').textContent.replace(/\s+/g,' ').match(/Vocabulary.{0,80}/)[0]);
// host switches to a built-in topic and a difficulty
A.document.querySelector('[data-nettopic="travel"]').click();
A.document.querySelector('[data-netdiff="2"]').click();
await new Promise(r=>setTimeout(r,40));
console.log('after built-in pick → host:', A.eval("SESSION.topics.v.join(',')"), '| diff', A.eval('SESSION.diff'));
console.log('guest plan:', B.eval("JSON.stringify({v:NET.plan.names.v,diff:NET.plan.diff})"));
// start: the guest must build the same level AND get the same topics
A.eval("show('online')");
A.document.querySelector('#net-start').click();
await new Promise(r=>setTimeout(r,300));
const sig=w=>w.eval("LV?JSON.stringify({seed:LV.seed,b:LV.blocks.length,e:LV.enemies.map(e=>e.kind).join('')}):null");
console.log('same level:', sig(A)===sig(B));
console.log('guest topics after start:', B.eval("SESSION.topics.v.join(',')+' | diff '+SESSION.diff"));
console.log('guest question comes from that topic:',
  B.eval("(()=>{const q=QM.vocab(SESSION.diff);return q.tag})()"));

// the full topic picker opened from the room comes back to the room
A.eval("LV=null; running=false; show('online')");
A.document.querySelector('[data-netfull]').click();
console.log('\nfull picker → screen:', A.eval("$$('.screen.on')[0].id"),
  '| CTA:', A.document.querySelector('#topics-next').textContent,
  '| hint:', A.document.querySelector('#topics-hint').textContent.slice(0,40));
A.eval("SESSION.topics.v=['animals','food']; SESSION.topics.g=['past-simple'];");
A.document.querySelector('#topics-next').click();
await new Promise(r=>setTimeout(r,40));
console.log('after Back to the room → screen:', A.eval("$$('.screen.on')[0].id"),
  '| guest now sees:', B.eval("NET.plan.names.v.join(',')+' / '+NET.plan.names.g.join(',')"));
// leaving the picker another way clears the detour
A.document.querySelector('[data-netfull]').click();
A.eval("show('menu'); show('topics')");
console.log('picker opened normally → CTA:', A.document.querySelector('#topics-next').textContent);
