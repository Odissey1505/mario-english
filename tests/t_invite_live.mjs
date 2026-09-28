/* The whole invite journey against the stand-in server: the host creates a room, copies the
   link, and a fresh browser opened on that link ends up playing the host's level. */
import {JSDOM} from 'jsdom'; import fs from 'fs'; import WS from 'ws';
import {start} from './fake_supabase.mjs';
const PORT=8793; const server=start(PORT);
const html=fs.readFileSync(process.env.GAME||'dist/index.html','utf8');
function boot(url){
  const d=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url,
   beforeParse(w){ const _o=w.HTMLCanvasElement.prototype.getContext;
    const _p=new Proxy({},{get:(t,k)=>(k==='createLinearGradient'||k==='createRadialGradient')?()=>({addColorStop:()=>{}}):()=>{},set:()=>true});
    w.HTMLCanvasElement.prototype.getContext=function(t){return this.id==='cv'?_p:_o.call(this,t)};
    w.matchMedia=()=>({matches:false}); w.requestAnimationFrame=()=>0; w.scrollTo=()=>{}; w.WebSocket=WS; }});
  return d.window;
}
const aim=w=>w.eval(`realtimeURL=(b,k)=>'ws://127.0.0.1:${PORT}/realtime/v1/websocket?apikey='+encodeURIComponent(k)+'&vsn=1.0.0'; S.net={url:'',key:''}; save();`);
let bad=0; const fail=m=>{ console.log('FAIL '+m); bad++ };

/* --- the host --- */
const A=boot('http://localhost/game/index.html');
await new Promise(r=>setTimeout(r,350));
aim(A);
A.eval("S.name='Taras';S.avatar='🦊';S.hero='sensei';NET.mode='coop';show('online')");
A.document.querySelector('#net-host').click();
await new Promise(r=>setTimeout(r,400));
const code=A.eval('NET.code');
let clip=''; A.eval("navigator.clipboard={writeText:t=>{window.__clip=t;return Promise.resolve()}}");
A.document.querySelector('#net-copy').click();
await new Promise(r=>setTimeout(r,60));
clip=A.eval('window.__clip');
console.log('host created room', code, '→ copied', clip);
if(!clip||!clip.includes(code)) fail('the copied link does not contain the new room code');

/* the host sets up the whole round: co-op, a lesson, hard, choose-only, no pictures */
A.eval(`setRoomTopics(['animals','food'],['past-simple']); SESSION.diff=2; S.diff=2;
        opt().answer='choice'; opt().emoji=false; save(); sendPlan(); renderOnline();`);
await new Promise(r=>setTimeout(r,120));

/* --- a fresh browser opens the copied link, and does nothing else --- */
const B=boot(clip);
await new Promise(r=>setTimeout(r,120));
aim(B);                                       /* the invite fires on boot, so re-aim and retry */
B.eval("S.name='Olia';S.avatar='🐼';S.hero='ember';");
await B.eval('autoJoin()');
await new Promise(r=>setTimeout(r,450));

if(!B.eval('NET.on')) fail('opening the link did not connect');
if(B.eval('NET.code')!==code) fail('the guest joined the wrong room: '+B.eval('NET.code'));
if(B.eval("NET.role")!=='guest') fail('the guest did not join as a guest');
if(B.eval('NET.mode')!=='coop') fail('the mode did not come from the link (got '+B.eval('NET.mode')+')');
if(!B.eval('!!NET.mate')) fail('the guest does not see the host');
if(!A.eval('!!NET.mate')) fail('the host does not see the guest who used the link');
console.log('guest joined:', B.eval('NET.code'), '| sees host:', A.eval("JSON.stringify(NET.mate&&NET.mate.name)"),
            '| host sees:', A.eval("JSON.stringify(NET.mate)"));

/* everything about the round came from the host, without the guest choosing anything */
if(B.eval('answerMode()')!=='choice') fail('the task format did not arrive (got '+B.eval('answerMode()')+')');
if(B.eval('useEmoji()')!==false) fail('the picture setting did not arrive');
const plan=B.eval("JSON.stringify(NET.plan&&{d:NET.plan.diff,v:NET.plan.tv})");
console.log('guest plan from host:', plan);
if(!/past|animals|food/.test(plan||'')) fail('the guest did not receive the topics: '+plan);

/* the host starts: both build the same level */
A.eval("$('#net-start').click()");
await new Promise(r=>setTimeout(r,400));
const sig=w=>w.eval("JSON.stringify(LV?{w:Math.round(LV.w),b:LV.blocks.length,e:LV.enemies.length,c:LV.needCoins}:null)");
if(sig(A)!==sig(B)) fail('the invited guest got a different level:\n  host  '+sig(A)+'\n  guest '+sig(B));
console.log('same level for both:', sig(A)===sig(B), sig(A));
if(B.eval('SESSION.diff')!==2) fail("the host's difficulty did not reach the guest");
/* and the guest kept their own skin */
if(B.eval('S.hero')!=='ember') fail('the guest lost their own hero');
if(A.eval('S.hero')!=='sensei') fail('the host lost the Sensei');

A.eval('NET.leave()'); B.eval('NET.leave()');
setTimeout(()=>{ try{ server.close() }catch(e){}
  console.log(bad?('t_invite_live: '+bad+' problem(s)'):'t_invite_live: ok');
  process.exit(bad?1:0); },300);
