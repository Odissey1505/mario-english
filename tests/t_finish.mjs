/* Every level must be finishable. Three ways it used to fail:
   not enough shard sources on the map, a wrong answer burning the last one, and no fallback
   once everything was used up. */
import {JSDOM} from 'jsdom'; import fs from 'fs';
const html=fs.readFileSync(process.env.GAME||'dist/index.html','utf8');
const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'http://localhost/',
 beforeParse(w){ const _o=w.HTMLCanvasElement.prototype.getContext;
  const _p=new Proxy({},{get:(t,k)=>(k==='createLinearGradient'||k==='createRadialGradient')?()=>({addColorStop:()=>{}}):()=>{},set:()=>true});
  w.HTMLCanvasElement.prototype.getContext=function(t){return this.id==='cv'?_p:_o.call(this,t)};
  w.matchMedia=()=>({matches:false});w.requestAnimationFrame=()=>0;w.scrollTo=()=>{}; }});
const w=dom.window;
await new Promise(r=>setTimeout(r,300));
let bad=0; const fail=m=>{ console.log('FAIL '+m); bad++ };
const J=x=>JSON.parse(w.eval('JSON.stringify('+x+')'));

/* --- 1. the map itself always holds more shard sources than the mission needs --- */
const supply=J(`(function(){
  const out={levels:0,worst:99,short:0,byDiff:{},keyless:0};
  for(let world=0;world<WORLDS.length;world++) for(let diff=0;diff<3;diff++){
    for(let i=0;i<120;i++){
      const L=withSeed('fin'+world+'-'+diff+'-'+i,()=>buildLevel(world,diff));
      out.levels++;
      if(L.mission==='shards'){
        /* count only what a plain jump can reach — secret blocks need a super jump */
        const src=L.blocks.filter(b=>b.type==='purple'&&!b.secret).length;
        out.worst=Math.min(out.worst,src-L.needShards);
        if(src<L.needShards+2) out.short++;
        const k='d'+diff; out.byDiff[k]=Math.min(out.byDiff[k]===undefined?99:out.byDiff[k],src);
      }
      if(L.mission==='key'&&!L.chests.length) out.keyless++;
    }
  }
  return out;
})()`);
console.log('levels generated:', supply.levels,
  '| fewest purple blocks by difficulty:', JSON.stringify(supply.byDiff),
  '| smallest surplus over the 3 needed:', supply.worst);
if(supply.short) fail(supply.short+' shard levels have fewer than needShards+2 purple blocks');

/* the extra shard blocks must be as reachable as the ones the generator placed itself:
   over solid ground, on a row the hero can jump to, and not inside another block */
const place=J(`(function(){
  const rows=new Set(), bad={pit:0,clash:0,row:0}; let checked=0;
  for(let world=0;world<WORLDS.length;world++) for(let diff=0;diff<3;diff++)
   for(let i=0;i<60;i++){
    const L=withSeed('pl'+world+'-'+diff+'-'+i,()=>buildLevel(world,diff));
    if(L.mission!=='shards') continue;
    L.blocks.forEach(b=>{ if(b.type!=='purple'||b.secret) return; checked++;
      rows.add(GYTOP-b.y);
      if(!L.ground.some(g=>b.x+22>=g.x&&b.x+22<=g.x+g.w)) bad.pit++;
      if(L.blocks.some(o=>o!==b&&Math.abs(o.x-b.x)<40&&Math.abs(o.y-b.y)<40)) bad.clash++;
      if(b.y>GYTOP-100||b.y<GYTOP-210) bad.row++;   /* outside the two rows a plain jump reaches */
    });
   }
  return {checked,bad,rows:[...rows].sort((a,b)=>a-b)};
})()`);
console.log('purple blocks checked:', place.checked, '| heights above ground:', place.rows.join(', '));
if(place.bad.pit) fail(place.bad.pit+' purple blocks hang over a pit');
if(place.bad.clash) fail(place.bad.clash+' purple blocks overlap another block');
if(place.bad.row) fail(place.bad.row+' purple blocks sit too low to jump into');
if(supply.keyless) fail(supply.keyless+' key levels have no chest to hold the key');

/* --- 2. a wrong answer must not spend a block that still holds a needed shard --- */
/* a clean profile: a shield or a guard helmet would absorb the wrong answer we are testing */
w.eval(`S.opts={emoji:true,answer:'choice'}; S.boosts={}; S.slots=[null,null,null]; S.gear.eq={};
        SESSION.world=1; SESSION.diff=0;
        SESSION.topics.v=['animals']; SESSION.topics.g=['to-be'];
        startLevel(1,0,{seed:'burn'}); LV.boosts={};`);
await new Promise(r=>setTimeout(r,80));
if(w.eval('LV.mission')!=='shards') fail('world 1 is not a shards world any more — pick another for this test');
async function answer(correct){
  await new Promise(r=>setTimeout(r,25));
  const card=w.document.querySelector('#q-card');
  const opts=[...card.querySelectorAll('.opt')];
  if(!opts.length) return false;
  const right=w.eval('window.__q.correct');
  opts[correct?right:(right===0?1:0)].click();
  await new Promise(r=>setTimeout(r,25));
  const next=[...card.querySelectorAll('.big-btn')].pop(); next&&next.click();
  await new Promise(r=>setTimeout(r,25));
  return true;
}
/* a rune stone asks a vocabulary OR a grammar question, so both have to be captured */
w.eval(`const _v=QM.vocab.bind(QM), _g=QM.grammar.bind(QM);
        QM.vocab=(...a)=>{ window.__q=_v(...a); return window.__q };
        QM.grammar=(...a)=>{ window.__q=_g(...a); return window.__q };`);

const before=w.eval("LV.blocks.filter(b=>b.type==='purple'&&!b.used).length");
w.eval("LV.freeze=0; LV.busy=false; hitBlock(LV.blocks.find(b=>b.type==='purple'&&!b.used))");
await answer(false);
const afterWrong=w.eval("LV.blocks.filter(b=>b.type==='purple'&&!b.used).length");
if(afterWrong!==before) fail('a wrong answer consumed a block that still held a needed shard');
if(w.eval('LV.shardsGot')!==0) fail('a wrong answer handed over the shard anyway');
console.log('purple blocks left after a wrong answer:', afterWrong, '(was', before+')');

/* the same block, answered correctly, does give the shard and is then spent */
w.eval("LV.freeze=0; LV.busy=false; hitBlock(LV.blocks.find(b=>b.type==='purple'&&!b.used))");
await answer(true);
if(w.eval('LV.shardsGot')!==1) fail('a correct answer did not give the shard');
if(w.eval("LV.blocks.filter(b=>b.type==='purple'&&!b.used).length")!==before-1) fail('the block was not spent after the shard was taken');
console.log('after a correct answer → shards:', w.eval('LV.shardsGot'),
            '| purple blocks left:', w.eval("LV.blocks.filter(b=>b.type==='purple'&&!b.used).length"));

/* --- 3. with every source gone, a rune stone still finishes the mission --- */
w.eval("LV.blocks.forEach(b=>{if(b.type==='purple')b.used=true}); LV.wells.forEach(x=>x.used=true); LV.shardsGot=0");
if(w.eval('shardSourcesLeft()')!==0) fail('the level still reports shard sources after they were all used');
for(let i=0;i<3;i++){
  w.eval("LV.freeze=0; LV.busy=false; runeStone(LV.stones[0])");
  await answer(true);
}
if(w.eval('LV.shardsGot')<3) fail('three correct answers at a rune stone did not replace the lost shards (got '+w.eval('LV.shardsGot')+')');
console.log('shards recovered from a rune stone with nothing else left:', w.eval('LV.shardsGot'));
/* and once the mission is satisfied the stone goes back to paying coins */
const coins=w.eval('LV.coins');
w.eval("LV.freeze=0; LV.busy=false; runeStone(LV.stones[0])");
await answer(true);
if(w.eval('LV.coins')<=coins) fail('a rune stone stopped paying coins once the shards were complete');

/* --- 4. the same promise for the golden key --- */
w.eval(`SESSION.world=0; SESSION.diff=0; startLevel(0,0,{seed:'keyless'}); LV.boosts={};`);
await new Promise(r=>setTimeout(r,60));
if(w.eval('LV.mission')!=='key') fail('world 0 is not a key world any more');
w.eval("LV.chests.forEach(c=>c.open=true); LV.blocks.forEach(b=>{if(b.type==='gold')b.used=true})");
if(w.eval('keySourcesLeft()')!==0) fail('the level still reports key sources after they were all used');
w.eval("LV.freeze=0; LV.busy=false; runeStone(LV.stones[0])");
await answer(true);
if(!w.eval('LV.hasKey')) fail('with the chest open and no gold blocks left, a rune stone did not give the key');
console.log('key recovered from a rune stone with nothing else left:', w.eval('LV.hasKey'));

/* --- 5. the message at the finish says where to go --- */
w.eval("LV.shardsGot=0; LV.coins=LV.needCoins; LV.bossDead=true");
w.eval(`SESSION.world=1; startLevel(1,0,{seed:'msg'}); LV.boosts={}; LV.coins=LV.needCoins; LV.bossDead=true;
        LV.blocks.forEach(b=>{if(b.type==='purple')b.used=true}); LV.wells.forEach(x=>x.used=true);
        window.__t=''; const _toast=toast; toast=(m)=>{window.__t=m; _toast(m)}; tryFinish();`);
const msg=w.eval('window.__t');
if(!/rune stone/.test(msg)) fail('the finish does not point the player at the rune stone: '+msg);
console.log('message when the shards are gone:', msg);

console.log(bad?('t_finish: '+bad+' problem(s)'):'t_finish: ok');
process.exit(bad?1:0);
