/* =====================================================================
   8. MINI-QUESTS (a separate scene in a well or cave)
   ===================================================================== */
const QUEST_ITEMS=[['rope','🪢'],['apple','🍎'],['key','🔑'],['hammer','🔨'],
 ['wood','🪵'],['fish','🐟'],['hat','🎩'],['book','📕'],['candle','🕯️'],
 ['bucket','🪣'],['mushroom','🍄'],['star','⭐'],['bread','🍞'],['boots','🥾']];
function runQuest(){
  return new Promise(resolve=>{
    const M=$('#m-quest'), card=$('#quest-card'); M.classList.add('on');
    const kind=rnd(['items','plates','sentence','shop']);
    const finish=(ok,msg)=>{ M.classList.remove('on'); toast(msg||(ok?'Quest complete!':'Quest failed')); ok?Snd.win():Snd.bad(); resolve(ok); };
    const head=(title,line)=>'<div class="qtag">Mini-quest · '+title+'</div><div class="qprompt">'+line+'</div>';

    if(kind==='items'){
      const want=shuffle(QUEST_ITEMS).slice(0,3), pool=shuffle([...want,...shuffle(QUEST_ITEMS.filter(i=>!want.includes(i))).slice(0,6)]);
      const got=new Set();
      card.innerHTML=head('The lost traveller','“Bring me '+want.map(w=>'a '+w[0]).join(', ')+'.”')+
        '<div class="qsub">Find and collect exactly these items</div><div class="opts two" id="qitems"></div>';
      const box=$('#qitems',card);
      pool.forEach(it=>{ const b=document.createElement('button'); b.className='opt pic'; b.innerHTML=it[1]+'<div style="font-size:12px;opacity:.8">'+it[0]+'</div>';
        b.onclick=()=>{ if(want.includes(it)){ got.add(it[0]); b.classList.add('ok'); b.onclick=null; Snd.coin();
            if(got.size===want.length) finish(true,'You collected everything the traveller asked for'); }
          else { b.classList.add('bad'); Snd.bad(); setTimeout(()=>finish(false,'That is not what he asked for'),450); } };
        box.appendChild(b) });
    }
    else if(kind==='plates'){
      let round=0; const rounds=3;
      const step=()=>{
        const tasks=[
          ()=>{const w=rnd(WORDS_FLAT.filter(x=>x.topic==='food'&&x.lv===0));
               return {line:'Step on something you can eat.',ok:w,pool:WORDS_FLAT.filter(x=>x.lv===0&&x.topic!=='food')}},
          ()=>{const w=rnd(WORDS_FLAT.filter(x=>x.topic==='animals'&&x.lv===0));
               return {line:'Step on an animal.',ok:w,pool:WORDS_FLAT.filter(x=>x.lv===0&&x.topic!=='animals')}},
          ()=>{const w=rnd(WORDS_FLAT.filter(x=>x.topic==='clothes'&&x.lv===0));
               return {line:'Step on something you can wear.',ok:w,pool:WORDS_FLAT.filter(x=>x.lv===0&&x.topic!=='clothes')}},
          ()=>{const w=rnd(WORDS_FLAT.filter(x=>x.topic==='transport'&&x.lv===0));
               return {line:'Step on something you can drive or ride.',ok:w,pool:WORDS_FLAT.filter(x=>x.lv===0&&x.topic!=='transport')}}
        ];
        const t=rnd(tasks)(); const opts=shuffle([t.ok,...shuffle(t.pool).slice(0,5)]);
        card.innerHTML=head('The room of plates','“'+t.line+'”')+'<div class="qsub">Plate '+(round+1)+' of '+rounds+'</div><div class="opts two" id="qp"></div>';
        const box=$('#qp',card);
        opts.forEach(o=>{ const b=document.createElement('button'); b.className='opt';
          b.innerHTML=((o.ic&&useEmoji())?o.ic+' ':'')+o.en; b.onclick=()=>{ if(o===t.ok){ b.classList.add('ok'); Snd.good(); round++;
              if(round>=rounds) setTimeout(()=>finish(true,'The door opens'),400); else setTimeout(step,400); }
            else { b.classList.add('bad'); Snd.bad(); setTimeout(()=>finish(false,'The plate collapsed'),450) } };
          box.appendChild(b) });
      }; step();
    }
    else if(kind==='sentence'){
      const t=rnd(SESSION.topics.g.length?SESSION.topics.g:Object.keys(GRAMMARBANK));
      const pool=(GRAMMARBANK[t].q[SESSION.diff]||GRAMMARBANK[t].q[0]);
      const src=pool.find(q=>q.k==='sq')||{a:'The magic door opens for a brave hero',ee:'Put the words in the correct order.'};
      const words=shuffle(src.a.split(' ')); const chosen=[];
      card.innerHTML=head('The door of words','Build a correct sentence to open the door')+
        '<div class="seqline" id="qline"></div><div id="qpool" style="display:flex;flex-wrap:wrap;gap:6px"></div>'+
        '<button class="big-btn" style="margin-top:14px" id="qgo">Open the door</button>';
      const line=$('#qline',card), pl=$('#qpool',card);
      words.forEach(w=>{ const b=document.createElement('button'); b.className='tok'; b.textContent=w;
        b.onclick=()=>{ b.classList.add('used'); chosen.push(w); const c2=document.createElement('button'); c2.className='tok'; c2.textContent=w;
          c2.onclick=()=>{ const i=chosen.lastIndexOf(w); if(i>=0){chosen.splice(i,1); b.classList.remove('used'); c2.remove()} };
          line.appendChild(c2) }; pl.appendChild(b) });
      $('#qgo',card).onclick=()=>{ const ok=chosen.join(' ').toLowerCase()===src.a.toLowerCase();
        finish(ok, ok?'The door opens!':'Correct answer: '+src.a) };
    }
    else { /* shop */
      const budget=20;
      const goods=shuffle(QUEST_ITEMS).slice(0,6).map(i=>({i,price:rint(4,14)}));
      const want=shuffle(goods).slice(0,2);
      let spent=0; const bought=new Set();
      card.innerHTML=head('The goblin shop','“Buy a '+want[0].i[0]+' and a '+want[1].i[0]+'. You have 20 coins.”')+
        '<div class="qsub">Do not spend more than 20 coins</div><div class="opts two" id="qs"></div><div class="qsub" id="qbal" style="margin-top:10px">Spent: 0 / 20</div>';
      const box=$('#qs',card);
      goods.forEach(g=>{ const b=document.createElement('button'); b.className='opt';
        b.innerHTML=g.i[1]+' '+g.i[0]+' <span style="float:right;color:#FFC84A">🪙'+g.price+'</span>';
        b.onclick=()=>{ if(bought.has(g)) return; spent+=g.price; bought.add(g); b.classList.add(want.includes(g)?'ok':'bad');
          $('#qbal',card).textContent='Spent: '+spent+' / '+budget;
          if(spent>budget) return finish(false,'Too much money spent — the goblin is angry');
          if(!want.includes(g)) return finish(false,'That is not what he asked for');
          if(want.every(w=>bought.has(w))) finish(true,'Order complete!'); };
        box.appendChild(b) });
    }
  });
}
