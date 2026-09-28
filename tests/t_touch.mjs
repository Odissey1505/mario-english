/* Touch pad: an analog stick that follows a finger, buttons you can slide between,
   a pad that can be raised and enlarged, and nothing left stuck down. */
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
let bad=0; const fail=m=>{ console.log('FAIL '+m); bad++ };

/* jsdom gives every element a zero-size rect, so lay the pad out by hand:
   the stick on the left, the jump and attack buttons on the right. */
w.eval(`
  const R={tstick:[20,400,180,180], tj:[820,400,110,110], ta:[690,410,90,90],
           te:[850,270,64,64], tq:[770,270,64,64], ts:[840,190,70,70]};
  Object.keys(R).forEach(id=>{ const el=document.getElementById(id); const [x,y,wd,ht]=R[id];
    el.getBoundingClientRect=()=>({left:x,top:y,right:x+wd,bottom:y+ht,width:wd,height:ht,x,y}); });
`);
const down=(x,y,id)=>w.eval(`tDown(${JSON.stringify(id||'f1')},${x},${y},null)`);
const move=(x,y,id)=>w.eval(`tMove(${JSON.stringify(id||'f1')},${x},${y})`);
const up=id=>w.eval(`tUp(${JSON.stringify(id||'f1')})`);
const st=()=>JSON.parse(w.eval('JSON.stringify(touchState)'));

/* --- the stick reads as analog and keeps following outside its base --- */
down(110,490);                                  /* centre of the stick */
if(Math.abs(st().ax)>.01) fail('the stick is not centred when grabbed at the centre (ax '+st().ax+')');
move(140,490);                                  /* a light push right */
const light=st();
if(!(light.ax>.2&&light.ax<.85)) fail('a light push did not read as a partial push (ax '+light.ax+')');
if(!light.r||light.l) fail('a push right did not set the right flag');
move(400,490);                                  /* far outside the base — must clamp, not stop */
if(st().ax!==1) fail('a finger outside the base did not clamp to full speed (ax '+st().ax+')');
move(20,490);
if(st().ax!==-1) fail('a full push left did not read as -1 (ax '+st().ax+')');
move(110,420);                                  /* pushed up */
if(!st().up) fail('pushing the stick up did not request a jump');
up();
if(st().ax!==0||st().l||st().r||st().up) fail('the stick did not return to neutral when released');

/* --- a light push walks, a full push runs --- */
w.eval("SESSION.world=0;SESSION.diff=1;startLevel(0,1,{seed:'touch'});");
await new Promise(r=>setTimeout(r,60));
const vxAfter=ax=>{ w.eval(`touchState.ax=${ax};touchState.l=${ax<-.18?1:0};touchState.r=${ax>.18?1:0};P.vx=0;movePlayer(1)`);
                    return +w.eval('P.vx') };
const walk=vxAfter(.3), run=vxAfter(1);
if(!(walk>0&&walk<run*.85)) fail('a light push is not slower than a full one (walk '+walk.toFixed(2)+' vs run '+run.toFixed(2)+')');
if(Math.abs(run-vxAfter(1))>1e-9) fail('a full push is not stable');
if(w.eval('(function(){touchState.ax=-1;movePlayer(1);return P.face})()')!==-1) fail('facing did not follow the stick');
w.eval('touchState.ax=0;touchState.l=touchState.r=0');

/* --- buttons: a press, a slide onto the neighbour, a release --- */
down(875,455,'f2');                              /* the jump button */
if(!st().j) fail('the jump button did not press');
if(!w.eval("document.getElementById('tj').classList.contains('hot')")) fail('the pressed button is not highlighted');
move(735,455,'f2');                              /* thumb slides onto attack */
const sl=st();
if(sl.j) fail('sliding off the jump button left it held down');
if(!sl.a) fail('sliding onto the attack button did not press it');
move(400,120,'f2');                              /* thumb slides onto nothing */
if(st().a) fail('sliding off every button left one held down');
move(875,455,'f2');                              /* and back onto jump */
if(!st().j) fail('sliding back onto a button did not press it again');
up('f2');
if(st().j) fail('the button stayed down after release');

/* --- the stick and a button work at the same time (two fingers) --- */
down(140,490,'A'); down(875,455,'B');
const both=st();
if(!(both.r&&both.j)) fail('the stick and a button cannot be used together');
w.eval('tWipe()');
if(Object.values(st()).some(v=>v)) fail('tWipe left input behind: '+JSON.stringify(st()));

/* --- height and size are settable, and a short screen is handled --- */
const lift=()=>w.eval("document.getElementById('touch').style.getPropertyValue('--tlift')");
const scale=()=>+w.eval("document.getElementById('touch').style.getPropertyValue('--tscale')");
w.eval("S.settings.lift='mid';S.settings.tsize='m';applyPadStyle()");
const mid=lift();
w.eval("S.settings.lift='huge';S.settings.tsize='xl';applyPadStyle()");
if(lift()===mid) fail('raising the pad changed nothing');
if(!(scale()>1)) fail('the extra-large size did not enlarge the pad (scale '+scale()+')');
if(!/env\(safe-area-inset-bottom\)/.test(lift())) fail('the pad ignores the safe area at the bottom');
const px=s=>+(s.match(/(\d+)px/)||[0,0])[1];
if(px(lift())<=px(mid)) fail('"very high" is not higher than "raised"');
w.eval("Object.defineProperty(window,'innerHeight',{value:420,configurable:true});applyPadStyle()");
if(px(lift())>24||scale()>.85) fail('a landscape phone still gets a tall, huge pad ('+lift()+' / '+scale()+')');

console.log(bad?('t_touch: '+bad+' problem(s)'):'t_touch: ok');
process.exit(bad?1:0);
