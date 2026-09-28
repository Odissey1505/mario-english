import {JSDOM} from 'jsdom';
import {createCanvas, Image as NImage} from 'canvas';
import fs from 'fs';
const html=fs.readFileSync(process.env.GAME||'dist/index.html','utf8');
const real=createCanvas(960,540); const rctx=real.getContext('2d');
const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'http://localhost/',
 beforeParse(w){ const _o=w.HTMLCanvasElement.prototype.getContext;
  w.HTMLCanvasElement.prototype.getContext=function(t){ return this.id==='cv'?rctx:_o.call(this,t) };
  w.Image=NImage; w.matchMedia=()=>({matches:false}); w.requestAnimationFrame=()=>0; w.scrollTo=()=>{}; }});
const w=dom.window;
const oc=w.document.createElement.bind(w.document);
w.document.createElement=(t,...a)=>String(t).toLowerCase()==='canvas'?createCanvas(2,2):oc(t,...a);
await new Promise(r=>setTimeout(r,800));
console.log('sheets loaded:', w.eval("Object.keys(SHEETS).map(k=>k+'='+SHEETS[k].ok+' scale '+SHEETS[k].s.toFixed(2)).join(' | ')"));
console.log('heroes:', w.eval("HEROES.map(h=>h.id).join(', ')"));
console.log('sensei frames:', w.eval("Object.keys(SENSEI_META).join(' ')"));
// frame selection, including the extra poses
console.log(w.eval(`(()=>{S.hero='sensei'; startLevel(0,1); const H=heroSheet('sensei'); const out=[];
 const set=o=>Object.assign(P,{ground:true,vx:0,vy:0,atk:0,inv:0,fly:0,squash:0},o);
 set({}); LV.busy=false; LV.hearts=3; out.push('idle→'+heroFrame(H.meta));
 set({vx:4}); out.push('run→'+heroFrame(H.meta));
 set({ground:false,vy:-8}); out.push('jump→'+heroFrame(H.meta));
 set({ground:false,vy:6}); out.push('fall→'+heroFrame(H.meta));
 set({squash:1}); out.push('land→'+heroFrame(H.meta));
 set({atk:10}); out.push('attack→'+heroFrame(H.meta));
 set({inv:88}); out.push('hurt→'+heroFrame(H.meta));
 set({}); LV.busy=true; out.push('question open→'+heroFrame(H.meta));
 LV.busy=false; LV.hearts=0; out.push('no hearts→'+heroFrame(H.meta));
 LV.hearts=3;
 return out.join(' | ')})()`));
// the classic sheet must not gain the extra poses
console.log('classic with a question open:', w.eval("(()=>{S.hero='azure';const H=heroSheet('azure');LV.busy=true;const f=heroFrame(H.meta);LV.busy=false;return f})()"));
// previews
w.eval("show('hero')");
console.log('hero cards:', w.document.querySelectorAll('[data-hero]').length,
  '| previews that are real images:', [...w.document.querySelectorAll('#hr-heroes img')].length,
  '| teacher badge:', /teacher/.test(w.document.querySelector('#hr-heroes').innerHTML));
// render the sensei in game
w.eval("S.hero='sensei'; startLevel(0,1); fade=1; camX=0; P.x=200;P.y=GYTOP-P.h;P.vx=0;P.ground=true;LV.busy=false;LV.hearts=3;draw();");
/* render check only — no file written */ real.toBuffer('image/png');
w.eval("P.x=200;P.atk=12;draw();");
real.toBuffer('image/png');
console.log('rendered in-game frames');
// partner drawn with a different sheet
w.eval(`NET.on=true; NET.mate={name:'Olia',avatar:'🐼',hero:'ember'};
 NET.mateState={x:320,y:GYTOP-P.h,d:1,f:'idle',nm:'Olia',a:'🐼',hero:'ember'};
 S.hero='sensei'; P.x=180; P.atk=0; draw();`);
real.toBuffer('image/png');
console.log('partner with a different sheet drawn ok');
