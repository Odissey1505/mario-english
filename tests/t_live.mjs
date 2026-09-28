import {JSDOM} from 'jsdom'; import fs from 'fs'; import WS from 'ws';
import {start} from './fake_supabase.mjs';
const PORT=8790; const server=start(PORT);
const html=fs.readFileSync(process.env.GAME||'dist/index.html','utf8');
function boot(){
  const d=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'http://localhost/',
   beforeParse(w){ const _o=w.HTMLCanvasElement.prototype.getContext;
    const _p=new Proxy({},{get:(t,k)=>(k==='createLinearGradient'||k==='createRadialGradient')?()=>({addColorStop:()=>{}}):()=>{},set:()=>true});
    w.HTMLCanvasElement.prototype.getContext=function(t){return this.id==='cv'?_p:_o.call(this,t)};
    w.matchMedia=()=>({matches:false}); w.requestAnimationFrame=()=>0; w.scrollTo=()=>{};
    w.WebSocket=WS; }});
  return d.window;
}
const A=boot(), B=boot();
await new Promise(r=>setTimeout(r,300));
// point both at the stand-in server (ws instead of wss, same framing)
for(const w of [A,B]){
  w.eval(`realtimeURL=(base,key)=>'ws://127.0.0.1:${PORT}/realtime/v1/websocket?apikey='+encodeURIComponent(key)+'&vsn=1.0.0';`);
  w.eval("S.net={url:'',key:''}; save();");   // must fall back to the built-in server
}
A.eval("S.name='Taras';S.avatar='🦊';S.hero='azure';");
B.eval("S.name='Olia';S.avatar='🐼';S.hero='ember';");

console.log('host connects :', await A.eval("NET.connect('ROOM','host','coop')"));
console.log('guest connects:', await B.eval("NET.connect('ROOM','guest','coop')"));
await new Promise(r=>setTimeout(r,300));
console.log('host sees partner :', A.eval("JSON.stringify(NET.mate)"));
console.log('guest sees partner:', B.eval("JSON.stringify(NET.mate)"));

// host has a custom course and starts the level for both
A.eval("S.courses=[DEMO_COURSE()];syncCourses();SESSION.topics.v=Object.keys(WORDBANK).filter(isCustom);SESSION.topics.g=Object.keys(GRAMMARBANK).filter(isCustom);SESSION.world=2;SESSION.diff=1;NET.mode='coop';");
B.eval("NET.mode='coop'");
A.eval("show('online')");
A.document.querySelector('#net-start').click();
await new Promise(r=>setTimeout(r,400));
const sig=w=>w.eval("LV?JSON.stringify({seed:LV.seed,w:Math.round(LV.w),b:LV.blocks.map(b=>Math.round(b.x)+b.type).join('').length,e:LV.enemies.map(e=>e.kind).join(',')}):null");
console.log('guest received the level:', !!B.eval('!!LV'));
console.log('identical level over the wire:', sig(A)===sig(B), sig(A));
console.log('guest got the host course:', B.eval("Object.keys(WORDBANK).filter(isCustom).map(k=>WORDBANK[k].n)[0]"));

// live co-op: coins pool, key shared
A.eval("addCoins(9,0,0)"); await new Promise(r=>setTimeout(r,150));
console.log('coins over the wire → host', A.eval('LV.coins'), '| guest', B.eval('LV.coins'));

// live rescue
A.eval("LV.busy=false;window.__r=null;(async()=>{let q;for(let i=0;i<80;i++){q=QM.grammar(1);if(q.kind==='choice')break}window.__q=q;window.__r=await ask(q)})()");
await new Promise(r=>setTimeout(r,120));
const q=A.__q; A.document.querySelectorAll('#q-card .opt')[(q.correct+1)%q.options.length].click();
await new Promise(r=>setTimeout(r,250));
console.log('partner prompted:', B.document.querySelector('#m-quest').classList.contains('on'));
B.document.querySelectorAll('#hv .opt')[q.correct].click();
await new Promise(r=>setTimeout(r,300));
console.log('rescue text:', A.document.querySelector('#q-card .fb').textContent.slice(0,40));

// bad key is reported, not silent
const C=boot(); await new Promise(r=>setTimeout(r,250));
C.eval(`realtimeURL=(b,k)=>'ws://127.0.0.1:${PORT}/realtime/v1/websocket?apikey=bad&vsn=1.0.0';`);
C.eval("S.net={url:'https://demo.supabase.co',key:'bad'}");
console.log('bad key rejected:', await C.eval("NET.connect('ROOM','guest','race')")===false, '|', C.eval('NET.status').slice(0,45));
// unreachable server
const D=boot(); await new Promise(r=>setTimeout(r,250));
D.eval("realtimeURL=()=>'ws://127.0.0.1:8999/nope'; S.net={url:'x',key:'y'};");
const t0=Date.now();
console.log('dead server handled:', await D.eval("NET.connect('R2','host','race')")===false, '| in', Date.now()-t0,'ms');

// partner disconnects → host notices within the beat window
B.eval("NET.leave()");
await new Promise(r=>setTimeout(r,9000));
console.log('host noticed the partner left:', A.eval('NET.mate')===null, '| game alive:', A.eval('!!LV'));
server.close(); process.exit(0);
