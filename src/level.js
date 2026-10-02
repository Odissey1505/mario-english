/* =====================================================================
   5. LEVEL GENERATOR (modular segments)
   ===================================================================== */
const VW=960, VH=540, GYTOP=470;   // one screen tall, ground surface at y=470
const BLOCKTYPES={
  yellow:{c:'#FFC84A',r:'coin'}, green:{c:'#6BE06B',r:'heart'}, blue:{c:'#5FA8FF',r:'boost'},
  purple:{c:'#B583FF',r:'shard'}, red:{c:'#FF5C7A',r:'risk'}, gold:{c:'#FFE08A',r:'gold'}
};
function buildLevel(worldId,diff){
  const W=WORLDS[worldId], D=DIFF[diff];
  const L={world:W,diff,w:0,ground:[],plats:[],blocks:[],coinsArr:[],enemies:[],traps:[],wells:[],chests:[],npcs:[],stones:[],
           deco:[],boss:null,finish:null,shards:0,needShards:3,mission:W.mission};
  let x=120; const g=(from,to)=>L.ground.push({x:from,w:to-from});
  let gStart=0;
  const nBlocks=rint(...D.blocks), nMobs=rint(...D.mobs), nStrong=rint(...D.strong), nQuests=D.quests;
  const segs=[];
  segs.push('start');
  const pool=[];
  for(let i=0;i<nMobs;i++) pool.push('mob');
  for(let i=0;i<nStrong;i++) pool.push('strong');
  for(let i=0;i<Math.ceil(nBlocks/3);i++) pool.push('blocks');
  for(let i=0;i<nQuests;i++) pool.push('well');
  for(let i=0;i<2+diff;i++) pool.push('plat');
  for(let i=0;i<1+diff;i++) pool.push('trap');
  for(let i=0;i<2+diff;i++) pool.push('stone');
  pool.push('chest'); pool.push('secret'); if(diff>0) pool.push('secret');
  segs.push(...shuffle(pool)); segs.push('prep'); segs.push('boss'); segs.push('finish');

  const foe=()=>rnd(W.foes), strongFoe=()=>rnd(['knight','golem','mage'].filter(f=>W.foes.includes(f)||true));
  segs.forEach(type=>{
    switch(type){
      case 'start': x+=260; break;
      case 'blocks':{ const n=rint(2,3); for(let i=0;i<n;i++){
          const t=RAND()<.5?'yellow':rnd(['green','blue','purple','red','gold','yellow','yellow']);
          L.blocks.push({x:x,y:GYTOP-145-(i%2)*58,w:44,h:44,type:t,used:false});
          x+=90; } x+=110; break; }
      case 'mob': L.enemies.push(mkEnemy(foe(),x,diff,false)); L.coinsArr.push({x:x+60,y:GYTOP-70}); x+=280; break;
      case 'strong': L.enemies.push(mkEnemy(strongFoe(),x,diff,true)); x+=300; break;
      case 'plat':{ const n=rint(2,3); let px=x;
        for(let i=0;i<n;i++){ const py=GYTOP-110-i*74-rint(0,40);
          L.plats.push({x:px,y:py,w:rint(110,170),h:22,mv:(diff>0&&RAND()<.4)?{a:py,b:py-rint(60,110),sp:.5+RAND()*.5,t:RAND()*6}:null});
          L.coinsArr.push({x:px+40,y:py-46}); L.coinsArr.push({x:px+80,y:py-46}); px+=rint(180,230); }
        if(diff>0&&RAND()<.55){ gStart=1; const gapAt=px; L.ground.push({gap:[gapAt-50,gapAt+rint(30,60)]}); }
        x=px+120; break; }
      case 'trap':{ const n=rint(2,4); for(let i=0;i<n;i++) L.traps.push({x:x+i*34,y:GYTOP-24,w:32,h:24});
        L.coinsArr.push({x:x+n*17,y:GYTOP-120}); x+=n*34+220; break; }
      case 'well': L.wells.push({x:x,y:GYTOP-46,w:64,h:46,used:false}); x+=260; break;
      case 'stone': L.stones.push({x:x,y:GYTOP-70,w:40,h:70,used:0}); x+=230; break;
      case 'chest': L.chests.push({x:x,y:GYTOP-44,w:52,h:44,open:false,key:true});
        L.enemies.push(mkEnemy('goblin',x+120,diff,false,true)); x+=320; break;
      case 'secret':{ const py=GYTOP-250-rint(0,40);
        L.plats.push({x:x,y:py,w:120,h:20,mv:null});
        L.blocks.push({x:x+38,y:py-90,w:44,h:44,type:'purple',used:false,secret:true});
        for(let i=0;i<4;i++) L.coinsArr.push({x:x+20+i*26,y:py-40});
        x+=300; break; }
      case 'prep': L.npcs.push({x:x+80,y:GYTOP-70,w:44,h:70,kind:'cage',freed:false});
        L.stones.push({x:x+210,y:GYTOP-70,w:40,h:70,used:0}); x+=320; break;
      case 'boss': L.bossX=x+180; x+=760; break;
      case 'finish': L.stones.push({x:x-130,y:GYTOP-70,w:40,h:70,used:0});
        L.finish={x:x+60,y:GYTOP-120,w:36,h:120}; x+=220; break;
    }
  });
  L.w=x+200;
  /* ground with pits */
  const gaps=L.ground.filter(o=>o.gap).map(o=>o.gap).sort((a,b)=>a[0]-b[0]);
  L.ground=[]; let cur=0;
  gaps.forEach(([a,b])=>{ if(a>cur) L.ground.push({x:cur,w:a-cur}); cur=b });
  L.ground.push({x:cur,w:L.w-cur});
  /* coins on the ground */
  for(let i=0;i<12+diff*6;i++) L.coinsArr.push({x:rint(300,L.w-300),y:GYTOP-rint(50,90)});
  /* decoration */
  for(let i=0;i<Math.floor(L.w/160);i++) L.deco.push({x:i*160+rint(-40,40),k:rint(0,2),s:.6+RAND()*.8});
  /* make sure the level can actually pay for itself: loose coins + blocks + monsters + boss */
  const potential=L.coinsArr.length+L.blocks.length*4+L.enemies.length*4+30;
  let missing=Math.ceil(DIFF[diff].coins*1.7)-potential;
  while(missing>0){ L.coinsArr.push({x:rint(300,L.w-300),y:GYTOP-rint(50,110)}); missing-- }
  /* boss */
  L.boss=mkBoss(W,diff,L.bossX);
  /* ---- the mission must be finishable ----
     Shards come from purple blocks and mini-quests, and both used to be left to chance: on Easy
     a level often held a single purple block while the mission asked for three, so the level
     could not be finished at all. Guarantee a real surplus — needShards + 2 — by recolouring
     blocks that are already placed (so the layout and its reachability do not change), and only
     adding new ones if the level is too small to hold enough. */
  if(L.mission==='shards'){
    const want=L.needShards+2;
    /* secret blocks sit on a high ledge that only a super jump reaches, so they are a bonus,
       never part of the guarantee — the promise is five shards on the normal-jump route. */
    const plain=b=>b.type==='purple'&&!b.secret;
    let have=L.blocks.filter(plain).length;
    if(have<want){
      /* recolour the least precious blocks first, spread along the level, never all in one place */
      const order=['yellow','red','green','blue','gold'];
      for(const t of order){
        const pool=L.blocks.filter(b=>b.type===t&&!b.secret);
        for(let i=pool.length-1;i>=0&&have<want;i--){
          /* keep at least one of each kind so a level never loses a whole block type */
          if(L.blocks.filter(b=>b.type===t).length<=1) break;
          pool[i].type='purple'; have++;
        }
        if(have>=want) break;
      }
    }
    while(have<want){                       /* a very short level: hang extra blocks over the ground */
      let gx=0, gy=0;
      for(let tries=0;tries<30;tries++){
        gx=rint(400,Math.max(500,L.w-400)); gy=GYTOP-145-(have%2)*58;
        const solidBelow=L.ground.some(g=>gx+22>=g.x&&gx+22<=g.x+g.w);       /* never over a pit */
        const clash=L.blocks.some(b=>Math.abs(b.x-gx)<60&&Math.abs(b.y-gy)<60);
        if(solidBelow&&!clash) break;
      }
      L.blocks.push({x:gx,y:gy,w:44,h:44,type:'purple',used:false});
      have++;
    }
    L.shardBlocks=have;    /* reachable without a super jump */
  }
  return L;
}

const FOECFG={
  slime :{w:40,h:34,hp:1,sp:.7 ,name:'Slime'  },
  bat   :{w:40,h:30,hp:1,sp:1.5,name:'Bat'    ,fly:true},
  goblin:{w:38,h:44,hp:1,sp:1.4,name:'Goblin' },
  knight:{w:44,h:50,hp:2,sp:.9 ,name:'Knight' },
  mage  :{w:40,h:50,hp:2,sp:.5 ,name:'Mage'   ,shoot:true},
  ghost :{w:42,h:44,hp:2,sp:1.1,name:'Ghost'  ,fly:true,fade:true},
  golem :{w:58,h:62,hp:3,sp:.45,name:'Golem'  },
  mimic :{w:52,h:44,hp:2,sp:0  ,name:'Mimic'  }
};
function mkEnemy(kind,x,diff,strong,guard){
  const c=FOECFG[kind]||FOECFG.slime;
  const hp=strong?Math.max(2,c.hp+ (diff>1?1:0)):c.hp;
  return {kind,x,y:c.fly?GYTOP-115-(c.h-30):GYTOP-c.h,w:c.w,h:c.h,hp,maxhp:hp,
          dir:Math.random()<.5?-1:1,sp:c.sp*(1+diff*.12),home:x,t:Math.random()*6,alive:true,guard:!!guard,cool:0,strong:!!strong};
}
function mkBoss(W,diff,x){
  const hp=3+diff;   // 3 / 4 / 5 phases
  return {x:x||0,y:GYTOP-120,w:96,h:120,hp,maxhp:hp,name:W.boss,ua:W.bossUa,t:0,phase:0,vy:0,cool:120,shots:[],active:false,dead:false,inv:0};
}
