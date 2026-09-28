import {JSDOM} from 'jsdom'; import fs from 'fs';
const html=fs.readFileSync(process.env.GAME||'dist/index.html','utf8');
const d=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'http://localhost/',
 beforeParse(w){ const _o=w.HTMLCanvasElement.prototype.getContext;
  const _p=new Proxy({},{get:(t,k)=>(k==='createLinearGradient'||k==='createRadialGradient')?()=>({addColorStop:()=>{}}):()=>{},set:()=>true});
  w.HTMLCanvasElement.prototype.getContext=function(t){return this.id==='cv'?_p:_o.call(this,t)};
  w.matchMedia=()=>({matches:false});w.requestAnimationFrame=()=>0;w.scrollTo=()=>{};}});
const w=d.window; await new Promise(r=>setTimeout(r,250));
console.log('fresh install uses built-in server:', w.eval("JSON.stringify(netCfg()).includes('yhekszqxheljbxoucalt')"));
const u=w.eval("realtimeURL(netCfg().url,netCfg().key)");
console.log('socket URL:', u.replace(/apikey=[^&]+/,'apikey=<anon>'));
console.log('key is the anon role:', w.eval("JSON.parse(atob(netCfg().key.split('.')[1])).role"));
w.eval("show('online')");
console.log('lobby label:', w.document.querySelector('#net-body h3:last-of-type')?.textContent);
console.log('reset button present:', !!w.document.querySelector('#net-reset'));
// a custom server overrides the default
w.eval("S.net={url:'https://mine.supabase.co',key:'k'}");
console.log('custom override:', w.eval("netCfg().url"));
w.eval("show('online')"); w.document.querySelector('#net-reset').click();
console.log('after reset:', w.eval("netCfg().url"));
