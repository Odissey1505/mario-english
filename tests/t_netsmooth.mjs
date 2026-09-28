/* Partner smoothing: packets arrive ~10/s, the ghost must move every frame,
   a question must read as "thinking", and a dropout must read as a weak link. */
import {JSDOM} from 'jsdom';
import fs from 'fs';
const html=fs.readFileSync(process.env.GAME||'dist/index.html','utf8');
const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'http://localhost/',
 beforeParse(w){ const _o=w.HTMLCanvasElement.prototype.getContext;
  const _p=new Proxy({},{get:(t,k)=>(k==='createLinearGradient'||k==='createRadialGradient')?()=>({addColorStop:()=>{}}):()=>{},set:()=>true});
  w.HTMLCanvasElement.prototype.getContext=function(t){ return this.id==='cv'?_p:_o.call(this,t) };
  w.matchMedia=()=>({matches:false}); w.requestAnimationFrame=()=>0; w.scrollTo=()=>{}; }});
const w=dom.window;
await new Promise(r=>setTimeout(r,250));
let bad=0; const fail=(m)=>{ console.log('FAIL '+m); bad++ };

w.eval(`NET.on=true; NET.mode='coop'; NET.mate={name:'Olia',avatar:'🐼',hero:'ember'};
        SESSION.world=0; SESSION.diff=1; startLevel(0,1,{seed:'smooth'});`);
await new Promise(r=>setTimeout(r,60));

/* a clock we control, so the test is not at the mercy of real timing */
w.eval(`window.__clk=1000; performance.now=()=>window.__clk;`);
const at=t=>{ w.eval('window.__clk='+t) };
const pos=(x,y,extra)=>w.eval(`netPos(Object.assign({t:'pos',x:${x},y:${y},d:1,f:'run'},${JSON.stringify(extra||{})}))`);
const seen=()=>JSON.parse(w.eval('JSON.stringify(mateAt(performance.now()))'));

/* 10 packets a second, the partner running right at 3 px/packet-gap */
for(let i=0;i<8;i++){ at(1000+i*100); pos(100+i*30,200) }

/* between two packets the ghost must be strictly between the two positions */
at(1700+40);                       /* render clock sits inside the buffered window */
const a=seen();
at(1700+80);
const b=seen();
if(!(b.x>a.x)) fail('the ghost does not advance between packets (x '+a.x+' → '+b.x+')');
if(a.x===Math.round(a.x)&&b.x===Math.round(b.x)&&a.x%30===10) fail('positions look snapped to packets, not interpolated');
if(a.stale) fail('a healthy stream was reported as stale');

/* one lost packet: keep gliding rather than stopping dead */
at(1700+180);
const c=seen();
if(!(c.x>b.x)) fail('no extrapolation across a missed packet');

/* a long silence: park the ghost, report the gap */
at(1700+2000);
const d=seen();
if(!d.stale||d.stale<1200) fail('a 2 s dropout was not reported as stale (got '+d.stale+')');
if(Math.abs(d.x-310)>1) fail('a stale ghost drifted off instead of parking (x '+d.x+')');

/* a partner with a question open is marked, so a deliberate pause is not read as lag */
at(4000); pos(500,120,{b:1,fly:1});
at(4050);
const e=seen();
if(!e.busy) fail('the busy flag did not reach the ghost');
if(!e.fly) fail('the super-jump flag did not reach the ghost');
w.eval('drawMate(document.getElementById("cv").getContext("2d"))');   /* must not throw */

/* the sender: 10/s cap, and quiet packets while nothing changes */
const out=[]; w.eval('NET.send=function(m){ window.__cap(m) }'); w.__cap=m=>out.push(m);
w.eval('NET.lastSend=0; NET.lastSig="";');
for(let i=0;i<60;i++){ at(5000+i*16); w.eval('P.x+=4; netTick()') }
const rate=out.length/(60*16/1000);
if(rate>11) fail('sending '+rate.toFixed(1)+' packets a second, over the 10/s channel limit');
if(rate<7) fail('sending only '+rate.toFixed(1)+' packets a second — too sparse to look smooth');
const n1=out.length;
for(let i=0;i<30;i++){ at(6000+i*16) ; w.eval('netTick()') }   /* standing still */
if(out.length-n1>2) fail('a motionless hero still floods the channel ('+(out.length-n1)+' packets in 0.5 s)');

console.log(bad?('t_netsmooth: '+bad+' problem(s)'):'t_netsmooth: ok');
process.exit(bad?1:0);
