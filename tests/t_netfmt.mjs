/* The host chooses the task format for the room: answer mode and whether pictures appear.
   The guest must see it in the lobby and actually play by it. */
import {JSDOM} from 'jsdom'; import fs from 'fs'; import WS from 'ws';
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
await new Promise(r=>setTimeout(r,400));
let bad=0; const fail=m=>{ console.log('FAIL '+m); bad++ };
function link(x,y,role,name){
  x.eval(`NET.on=true;NET.role='${role}';NET.code='FMT1';NET.mode='coop';S.name='${name}';
          NET.mate={name:'other',avatar:'🙂',hero:'azure'};`);
  x.eval("NET.send=function(m){ window.__out(m) };");
  x.__out=m=>y.eval("(function(m){NET.onMsg(m)})")(JSON.parse(JSON.stringify(m)));
}
link(A,B,'host','Taras'); link(B,A,'guest','Olia');

/* the guest starts from the opposite settings, so nothing can pass by accident */
B.eval("S.opts={emoji:true,answer:'mixed'}; save()");
A.eval("S.opts={emoji:true,answer:'mixed'}; save(); show('online')");

const chips=A.document.querySelectorAll('[data-netam]').length;
if(chips!==3) fail('the lobby does not offer all three answer modes (got '+chips+')');
if(A.document.querySelectorAll('[data-netem]').length!==2) fail('the lobby has no picture switch');

/* host: choose-only, words only */
A.document.querySelector('[data-netam="choice"]').click();
A.document.querySelector('[data-netem="0"]').click();
await new Promise(r=>setTimeout(r,60));

if(A.eval('answerMode()')!=='choice') fail('the host did not switch to choose-only');
if(A.eval('useEmoji()')!==false) fail('the host did not switch pictures off');
if(B.eval('answerMode()')!=='choice') fail('the guest did not receive the answer mode (got '+B.eval('answerMode()')+')');
if(B.eval('useEmoji()')!==false) fail('the guest did not receive the picture setting');

B.eval("show('online')");
const seen=B.document.querySelector('#net-body').textContent;
if(!/Choose only/.test(seen)) fail('the guest lobby does not name the task format: '+seen.slice(0,160));
if(!/words only/.test(seen)) fail('the guest lobby does not say pictures are off');
console.log('guest lobby shows:', (seen.match(/Tasks.*?(?=The host)/s)||[''])[0].trim());

/* and the format survives the start of the level on the guest side */
A.eval("$('#net-start').click()");
await new Promise(r=>setTimeout(r,120));
if(B.eval('answerMode()')!=='choice') fail('the answer mode did not survive the level start');
if(B.eval('useEmoji()')!==false) fail('the picture setting did not survive the level start');
if(!B.eval('!!LV')) fail('the guest never started the level');

/* every question the guest now gets must be tappable, with no picture prompts */
const audit=B.eval(`(function(){
  let typed=0, pics=0, n=0;
  for(let i=0;i<200;i++){
    const q=QM.vocab(1+(i%2));
    n++; if(!q.options||!q.options.length) typed++;
    if(q.prompt&&/[\\u{1F300}-\\u{1FAFF}]/u.test(q.prompt)) pics++;
  }
  return JSON.stringify({n,typed,pics});
})()`);
const r=JSON.parse(audit);
if(r.typed) fail(r.typed+' of '+r.n+' guest questions still had to be typed in choose-only mode');
if(r.pics) fail(r.pics+' guest questions still showed a picture with pictures off');
console.log('guest questions audited:', r.n, '| typed:', r.typed, '| with pictures:', r.pics);

/* switching back reaches the guest too */
A.eval("show('online')");
A.document.querySelector('[data-netam="typing"]').click();
A.document.querySelector('[data-netem="1"]').click();
await new Promise(r=>setTimeout(r,60));
if(B.eval('answerMode()')!=='typing'||B.eval('useEmoji()')!==true) fail('a second change did not reach the guest');

console.log(bad?('t_netfmt: '+bad+' problem(s)'):'t_netfmt: ok');
process.exit(bad?1:0);
