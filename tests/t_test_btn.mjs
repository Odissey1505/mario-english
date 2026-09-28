import {JSDOM} from 'jsdom'; import fs from 'fs'; import WS from 'ws';
import {start} from './fake_supabase.mjs';
const PORT=8791; const server=start(PORT);
const html=fs.readFileSync(process.env.GAME||'dist/index.html','utf8');
const d=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'http://localhost/',
 beforeParse(w){ const _o=w.HTMLCanvasElement.prototype.getContext;
  const _p=new Proxy({},{get:(t,k)=>(k==='createLinearGradient'||k==='createRadialGradient')?()=>({addColorStop:()=>{}}):()=>{},set:()=>true});
  w.HTMLCanvasElement.prototype.getContext=function(t){return this.id==='cv'?_p:_o.call(this,t)};
  w.matchMedia=()=>({matches:false});w.requestAnimationFrame=()=>0;w.scrollTo=()=>{};w.WebSocket=WS;}});
const w=d.window; await new Promise(r=>setTimeout(r,300));
w.eval(`realtimeURL=(b,k)=>'ws://127.0.0.1:${PORT}/realtime/v1/websocket?apikey='+encodeURIComponent(k)+'&vsn=1.0.0';`);
w.eval("show('online')");
w.document.querySelector('#net-url').value='https://demo.supabase.co';
w.document.querySelector('#net-key').value='anon-test';
w.document.querySelector('#net-test').click();
await new Promise(r=>setTimeout(r,1600));
console.log('good key  →', w.document.querySelector('#net-test-out').textContent.slice(0,60));
w.document.querySelector('#net-key').value='bad';
w.document.querySelector('#net-test').click();
await new Promise(r=>setTimeout(r,1600));
console.log('wrong key →', w.document.querySelector('#net-test-out').textContent.slice(0,80));
// url normalisation
console.log('url forms →', w.eval("[realtimeURL('https://ab.supabase.co/','k'),realtimeURL('ab.supabase.co','k')].join(' | ')"));
server.close(); process.exit(0);
