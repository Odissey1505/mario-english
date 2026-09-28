import {JSDOM} from 'jsdom'; import fs from 'fs';
const html=fs.readFileSync(process.env.GAME||'dist/index.html','utf8');
const d=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'http://localhost/',
 beforeParse(w){ const _o=w.HTMLCanvasElement.prototype.getContext;
  const _p=new Proxy({},{get:(t,k)=>(k==='createLinearGradient'||k==='createRadialGradient')?()=>({addColorStop:()=>{}}):()=>{},set:()=>true});
  w.HTMLCanvasElement.prototype.getContext=function(t){return this.id==='cv'?_p:_o.call(this,t)};
  w.matchMedia=()=>({matches:false});w.requestAnimationFrame=()=>0;w.scrollTo=()=>{};}});
const w=d.window; await new Promise(r=>setTimeout(r,300));
w.eval("startLevel(0,1)");
// does a wrong answer against a monster actually cost a heart?
w.eval(`LV.hearts=3; P.inv=0; LV.busy=true; hurt(1,false,true);`);
console.log('answer penalty while the lock is held →', w.eval('LV.hearts'), '(3 → 2 means it works)');
w.eval("LV.hearts=3; LV.busy=true; P.inv=0; hurt(1);");
console.log('ordinary damage is still blocked by the lock →', w.eval('LV.hearts'), '(stays 3)');
w.eval("LV.busy=false; LV.hearts=3; P.inv=90; hurt(1);");
console.log('damage during invulnerability →', w.eval('LV.hearts'), '(stays 3)');
// can hearts go below zero?
w.eval("LV.busy=false; LV.hearts=1; P.inv=0; hurt(1); P.inv=0; hurt(1);");
console.log('hearts after two hits from 1 →', w.eval('LV.hearts'));
try{ w.eval("hud()"); console.log('hud() survived'); }catch(e){ console.log('hud() CRASHED:', e.message) }
