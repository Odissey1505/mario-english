/* Invite links: the host gets one copyable link, a guest who opens it is in the room with
   nothing to choose, and only name/avatar/hero stay personal. */
import {JSDOM} from 'jsdom'; import fs from 'fs'; import WS from 'ws';
const html=fs.readFileSync(process.env.GAME||'dist/index.html','utf8');
function boot(url){
  const d=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url,
   beforeParse(w){ const _o=w.HTMLCanvasElement.prototype.getContext;
    const _p=new Proxy({},{get:(t,k)=>(k==='createLinearGradient'||k==='createRadialGradient')?()=>({addColorStop:()=>{}}):()=>{},set:()=>true});
    w.HTMLCanvasElement.prototype.getContext=function(t){return this.id==='cv'?_p:_o.call(this,t)};
    w.matchMedia=()=>({matches:false});w.requestAnimationFrame=()=>0;w.scrollTo=()=>{};w.WebSocket=WS;}});
  return d.window;
}
let bad=0; const fail=m=>{ console.log('FAIL '+m); bad++ };

/* ---- the link the host copies ---- */
const A=boot('https://taras.github.io/crystal/index.html');
await new Promise(r=>setTimeout(r,350));
A.eval("NET.on=true;NET.role='host';NET.code='WX7K';NET.mode='coop';S.name='Taras';S.avatar='🦊';S.hero='sensei';NET.mate={name:'Olia',avatar:'🐼',hero:'ember'};show('online')");
const link=A.eval("$('#net-link')&&$('#net-link').value");
if(!link) fail('the host lobby shows no invite link');
console.log('invite link:', link);
if(!/^https:\/\/taras\.github\.io\/crystal\/index\.html#join=WX7K&m=coop$/.test(link||''))
  fail('the link does not carry the room and the mode: '+link);
if(!A.document.querySelector('#net-copy')) fail('there is no copy button');

/* a copied link is what actually reaches the clipboard */
let clip=''; A.eval("navigator.clipboard={writeText:t=>{window.__clip=t;return Promise.resolve()}}");
A.document.querySelector('#net-copy').click();
await new Promise(r=>setTimeout(r,50));
clip=A.eval('window.__clip');
if(clip!==link) fail('the copy button copied something else: '+clip);
A.document.querySelector('#net-copycode').click();
await new Promise(r=>setTimeout(r,50));
if(A.eval('window.__clip')!=='WX7K') fail('"copy the code only" did not copy the code');

/* opened outside http(s) there is no shareable link, and the code is offered instead */
const F=boot('about:blank');
await new Promise(r=>setTimeout(r,300));
F.eval("NET.on=true;NET.role='host';NET.code='QQ11';show('online')");
const ftxt=F.document.querySelector('#net-body').textContent;
if(F.document.querySelector('#net-link')) fail('a non-http page still offered a link that cannot work');
if(!/QQ11/.test(ftxt)) fail('a non-http page did not fall back to the room code');

/* ---- the guest side of the link ---- */
const B=boot('https://taras.github.io/crystal/index.html#join=WX7K&m=coop');
await new Promise(r=>setTimeout(r,350));
const inv=JSON.parse(B.eval('JSON.stringify(linkInvite())')||'null');
if(!inv||inv.code!=='WX7K'||inv.mode!=='coop') fail('the guest did not read the link: '+JSON.stringify(inv));
if(B.eval('NET.mode')!=='coop') fail('the mode from the link was not applied (got '+B.eval('NET.mode')+')');
if(!B.eval("$('#s-online').classList.contains('on')")) fail('the link did not open the room screen');
if(!B.eval('NET.invited')) fail('the guest was not marked as invited');
/* there is no real server here, so the attempt fails — it must offer a retry, not a dead end */
if(!B.document.querySelector('#net-rejoin')) fail('a failed invite offers no retry');
if(B.eval("$('#net-code').value")!=='WX7K') fail('the room code was not kept in the box for a retry');
console.log('guest after a link:', B.eval("$('#net-body').textContent").slice(0,64).trim());

/* the guest lobby, once connected, offers only personal choices */
B.eval(`NET.on=true;NET.role='guest';NET.code='WX7K';NET.mate={name:'Taras',avatar:'🦊',hero:'sensei'};
        S.name='Olia';S.avatar='🐼';S.hero='ember';renderOnline()`);
const g=B.document.querySelector('#net-body').textContent;
if(!/You in this room/.test(g)) fail('the guest lobby has no personal panel');
if(!/Olia/.test(g)||!/🐼/.test(g)) fail('the guest lobby does not show who they are');
if(B.document.querySelector('[data-netdiff]')||B.document.querySelector('[data-netam]')||B.document.querySelector('#net-lesson'))
  fail('the guest can still change what the room plays');
if(!B.document.querySelector('#net-start')===false) fail('the guest has a start button');

/* the character button leads to the hero screen and back to the room */
B.document.querySelector('#net-me').click();
if(!B.eval("$('#s-hero').classList.contains('on')")) fail('the character button did not open the hero screen');
const backBtn=B.document.querySelector('#s-hero .back');
if(backBtn.dataset.go!=='online') fail('the way out of the hero screen does not lead back to the room');
if(!/room/i.test(backBtn.textContent)) fail('the back button does not say it returns to the room: '+backBtn.textContent);
/* picking a hero from inside a room tells the partner at once */
const sent=[]; B.eval("NET.send=function(m){ window.__s(m) }"); B.__s=m=>sent.push(m);
B.document.querySelector('[data-hero]').click();
if(!sent.some(m=>m.t==='hi'&&m.hero)) fail('a new hero was not announced to the partner: '+JSON.stringify(sent));
B.eval("show('menu')");
if(B.eval('NET.fromRoom')) fail('the room detour was not cleared on leaving the hero screen');

console.log(bad?('t_invite: '+bad+' problem(s)'):'t_invite: ok');
process.exit(bad?1:0);
