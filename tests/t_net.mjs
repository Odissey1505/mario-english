import {JSDOM} from 'jsdom';
import fs from 'fs';
const html=fs.readFileSync(process.env.GAME||'dist/index.html','utf8');
function boot(){
  const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'http://localhost/',
   beforeParse(w){ const _o=w.HTMLCanvasElement.prototype.getContext;
    const _p=new Proxy({},{get:(t,k)=>(k==='createLinearGradient'||k==='createRadialGradient')?()=>({addColorStop:()=>{}}):()=>{},set:()=>true});
    w.HTMLCanvasElement.prototype.getContext=function(t){ return this.id==='cv'?_p:_o.call(this,t) };
    w.matchMedia=()=>({matches:false}); w.requestAnimationFrame=()=>0; w.scrollTo=()=>{}; }});
  return dom.window;
}
// two independent game instances wired to each other through a fake transport
const A=boot(), B=boot();
await new Promise(r=>setTimeout(r,250));
function link(x,y,role,name,avatar,hero,mode){
  x.eval(`NET.on=true; NET.role='${role}'; NET.code='TEST'; NET.mode='${mode}';
    S.name='${name}'; S.avatar='${avatar}'; S.hero='${hero}';
    NET.mate={name:'other',avatar:'🐼',hero:'ember'};`);
  x.NET_OUT=[];
  x.eval("NET.send=function(m){ window.__out(m) };");
  x.__out=m=>{ y.eval("(function(m){ NET.onMsg(m) })")(JSON.parse(JSON.stringify(m))); };
}
link(A,B,'host','Taras','🦊','azure','coop');
link(B,A,'guest','Olia','🐼','ember','coop');
// host starts: config propagates and both build the identical level
A.eval("SESSION.world=0;SESSION.diff=1;SESSION.topics.v=['animals','food'];SESSION.topics.g=['to-be'];");
const seed='seed-test-123';
A.eval(`NET.send({t:'cfg',world:0,diff:1,seed:'${seed}',mode:'coop',tv:['animals','food'],tg:['to-be']}); startLevel(0,1,{seed:'${seed}'});`);
await new Promise(r=>setTimeout(r,60));
const sig=w=>w.eval(`(()=>{const L=LV;return JSON.stringify({w:Math.round(L.w),b:L.blocks.length,e:L.enemies.length,
  c:L.coinsArr.length,st:L.stones.length,q:L.wells.length,boss:L.boss.x,seed:L.seed,
  firstBlocks:L.blocks.slice(0,4).map(b=>Math.round(b.x)+':'+b.type).join(','),
  foes:L.enemies.slice(0,5).map(e=>e.kind+'@'+Math.round(e.x)).join(',')})})()`);
const sa=sig(A), sb=sig(B);
console.log('identical level for both players:', sa===sb);
console.log('  host :', sa.slice(0,150));
if(sa!==sb) console.log('  guest:', sb.slice(0,150));
// determinism across rebuilds
const again=A.eval(`JSON.stringify(withSeed('${seed}',()=>buildLevel(0,1)).blocks.slice(0,4).map(b=>Math.round(b.x)+':'+b.type))`);
const first=A.eval(`JSON.stringify(LV.blocks.slice(0,4).map(b=>Math.round(b.x)+':'+b.type))`);
console.log('same seed rebuilds the same level:', again===first);
console.log('different seed differs:', A.eval(`JSON.stringify(withSeed('other',()=>buildLevel(0,1)).blocks.slice(0,4).map(b=>Math.round(b.x)))`)!==A.eval(`JSON.stringify(LV.blocks.slice(0,4).map(b=>Math.round(b.x)))`));
// co-op: coins pool
const beforeB=B.eval('LV.coins');
A.eval("addCoins(7,100,100)");
await new Promise(r=>setTimeout(r,20));
console.log('coop coin pooling → host:',A.eval('LV.coins'),' guest:',B.eval('LV.coins'),'(guest gained',B.eval('LV.coins')-beforeB+')');
// co-op: key + boss shared
A.eval("LV.hasKey=true; NET.send({t:'ev',k:'key'}); LV.boss.hp=2; NET.send({t:'ev',k:'boss',n:2});");
await new Promise(r=>setTimeout(r,20));
console.log('guest has key:',B.eval('LV.hasKey'),'| guest boss hp:',B.eval('LV.boss.hp'));
// co-op rescue: host answers wrong, guest gets the request and answers correctly
A.eval("LV.busy=false; window.__r=null; (async()=>{ let q; for(let i=0;i<60;i++){ q=QM.grammar(1); if(q.kind==='choice') break } window.__q=q; window.__r=await ask(q) })()");
await new Promise(r=>setTimeout(r,40));
const q=A.__q;
const wrong=(q.correct+1)%q.options.length;
A.document.querySelectorAll('#q-card .opt')[wrong].click();
await new Promise(r=>setTimeout(r,60));
console.log('partner got a help request:', B.document.querySelector('#m-quest').classList.contains('on'));
const hv=[...B.document.querySelectorAll('#hv .opt')];
console.log('help options shown to partner:', hv.length);
hv[q.correct].click();
await new Promise(r=>setTimeout(r,120));
console.log('host result after rescue:', JSON.stringify(A.eval('window.__r')));
console.log('feedback text:', A.document.querySelector('#q-card .fb').textContent.slice(0,45));
console.log('host recorded it as a mistake (for practice):', A.eval('LV.stats.bad')>0);
// dismiss the feedback → the caller sees a protected (successful) answer
[...A.document.querySelectorAll('#q-card .big-btn')].find(b=>/Continue|Got it/.test(b.textContent)).click();
await new Promise(r=>setTimeout(r,40));
console.log('resolved as:', JSON.stringify(A.eval('window.__r')), '→ treated as a hit:', A.eval('!!(window.__r.ok||window.__r.shielded)'));
// ---- race mode ----
A.eval("NET.mode='race'"); B.eval("NET.mode='race'");
A.eval("LV.coins=42; netStat();"); await new Promise(r=>setTimeout(r,20));
console.log('race HUD data on partner side:', B.eval("JSON.stringify(NET.mateState&&{coins:NET.mateState.coins,prog:NET.mateState.prog})"));
A.eval("P.x=500;P.y=400;netTick();"); await new Promise(r=>setTimeout(r,20));
console.log('ghost position received:', B.eval("JSON.stringify(NET.mateState&&{x:NET.mateState.x,y:NET.mateState.y,nm:NET.mateState.nm,a:NET.mateState.a,hero:NET.mateState.hero})"));
// race coins must NOT pool
const cB=B.eval('LV.coins'); A.eval("addCoins(5,0,0)"); await new Promise(r=>setTimeout(r,20));
console.log('race keeps purses separate:', B.eval('LV.coins')===cB);
// finish comparison
B.eval("NET.results.me={time:80,coins:60,ok:12,bad:1,acc:92,stars:2};");
A.eval("NET.results.me={time:71,coins:55,ok:11,bad:2,acc:85,stars:2}; NET.send({t:'fin',time:71,coins:55,ok:11,bad:2,acc:85,stars:2});");
await new Promise(r=>setTimeout(r,20));
B.eval("$('#results-body').innerHTML=''; netCheckFinish();");
console.log('race result panel:', B.document.querySelector('#results-body').textContent.replace(/\s+/g,' ').slice(0,150));
// partner leaving must not break the level
A.eval("NET.onMsg({t:'bye'}); hud(); draw();");
console.log('after partner leaves → mate:', A.eval('NET.mate'), '| game still running:', A.eval('!!LV'));
