const QM={
  hist:[],
  remember(id){ this.hist.push(id); if(this.hist.length>12) this.hist.shift() },
  fresh(id){ return !this.hist.includes(id) },

  /* ---------- VOCABULARY ---------- */
  misspell(word){
    const w=word.replace(/ /g,''); if(w.length<4) return w+'e';
    const i=rint(1,w.length-2);
    const ops=[ ()=>w.slice(0,i)+w.slice(i+1),
                ()=>w.slice(0,i)+w[i]+w.slice(i),
                ()=>w.slice(0,i)+w[i+1]+w[i]+w.slice(i+2),
                ()=>w.slice(0,i)+rnd(['a','e','i','o','u'])+w.slice(i+1) ];
    const out=rnd(ops)(); return out===w?w.slice(0,i)+w[i]+w.slice(i):out;
  },
  vocab(diff,forceType,depth){
    /* last-resort guard: never hand out a question whose options repeat */
    if(!depth){ for(let k=0;k<4;k++){ const q=this.vocab(diff,forceType,1);
        if(q.kind!=='choice'||new Set(q.options).size===q.options.length) return q } }
    const topics=SESSION.topics.v.length?SESSION.topics.v:Object.keys(WORDBANK);
    let pool=[];
    topics.forEach(t=>{ pool=pool.concat(wordsOf(t,diff)); if(diff>0&&Math.random()<.25) pool=pool.concat(wordsOf(t,diff-1)); });
    if(!pool.length) pool=WORDS_FLAT.filter(w=>w.lv===diff);
    let w=Adapt.pickWeighted(pool,x=>Adapt.weight(x.en));
    let guard=0; while(!this.fresh('v:'+w.en)&&guard++<8) w=Adapt.pickWeighted(pool,x=>Adapt.weight(x.en));
    this.remember('v:'+w.en);
    const others=shuffle(pool.filter(x=>x.en!==w.en));
    const nOpt=DIFF[diff].opts, topicName=WORDBANK[w.topic].n;
    const clue=w.def?w.def:((w.ic&&useEmoji())?'Topic: '+topicName+'  '+w.ic:'Topic: '+topicName);
    const explain=w.en+(w.def?' — '+w.def:' · topic: '+topicName);
    const EM=useEmoji(), AM=answerMode();
    /* course entries can be whole phrases ("volunteer at the animal shelter"), and some tasks
       stop being reasonable at that length: nobody should unscramble 29 loose letters */
    const bare=w.en.replace(/ /g,''), oneWord=!/\s/.test(w.en);
    const canScramble=oneWord&&bare.length<=11, canType=w.en.length<=20;
    let types=[];
    if(w.ic&&EM) types.push('pic','name','name');
    if(w.def) types.push('def','def');
    types.push('listen','odd','spell');
    types.push('letters'); if(canScramble) types.push('scramble');
    if(diff===2){ types.push('spell'); if(canType) types.push('type') }
    if(diff===0) types=types.filter(t=>['pic','name','listen','odd','letters','def'].includes(t));
    /* the player's choice wins over the difficulty default */
    if(AM==='choice') types=types.filter(t=>V_CHOICE.has(t));
    else if(AM==='typing'){ types=['letters'];
      if(canScramble) types.push('scramble');
      if(canType&&diff>0) types.push('type'); }
    if(!types.length) types=AM==='typing'?['letters']:['listen','odd','spell'];
    const safe=AM==='typing'?'letters':'listen';   /* fallback that still honours the chosen mode */
    const type=forceType||rnd(types);
    const base={tag:'Vocabulary · '+topicName,ref:{type:'word',id:w.en,word:w},clue,
                ex:explain,ee:explain,tr:clue,time:DIFF[diff].timer,kind:'choice',listen:null,pic:false};
    /* start with the answer's own value so a distractor can never look identical to it
       (two different words can share an emoji, for instance) */
    const distract=(n,fn)=>{ const seen=new Set([fn(w)]); const res=[];
      for(const o of others){ const v=fn(o); if(v&&!seen.has(v)){seen.add(v);res.push(o)} if(res.length>=n) break } return res };

    if(type==='pic'){ const ds=distract(nOpt-1,o=>o.ic).filter(o=>o.ic);
      if(ds.length<2) return this.vocab(diff,safe,1);
      const opts=shuffle([w,...ds]); return {...base,pic:true,prompt:'Which picture shows "'+w.en+'"?',sub:'Tap the right picture',
        options:opts.map(o=>o.ic),correct:opts.indexOf(w),answer:w.ic+' '+w.en,listen:w.en}; }
    if(type==='name'){ const ds=distract(nOpt-1,o=>o.en);
      return (()=>{ const opts=shuffle([w,...ds]); return {...base,prompt:'What is this in English?',sub:w.ic+'   ',
        options:opts.map(o=>o.en),correct:opts.indexOf(w),answer:w.en,listen:w.en} })(); }
    if(type==='def'){ const ds=distract(nOpt-1,o=>o.en);
      const opts=shuffle([w,...ds]); return {...base,prompt:'Which word means this?',sub:'"'+w.def+'"',
        options:opts.map(o=>o.en),correct:opts.indexOf(w),answer:w.en,listen:w.en}; }
    if(type==='listen'){ const ds=distract(nOpt-1,o=>o.en);
      const opts=shuffle([w,...ds]); return {...base,prompt:'Listen and choose the word',sub:'Tap the speaker to hear it again',
        options:opts.map(o=>o.en),correct:opts.indexOf(w),answer:w.en,listen:w.en,autoListen:true}; }
    if(type==='spell'){ const wrong=new Set();
      let tries=0; while(wrong.size<nOpt-1&&tries++<20){ const m=this.misspell(w.en); if(m!==w.en) wrong.add(m) }
      if(wrong.size<2) return this.vocab(diff,safe,1);
      const opts=shuffle([w.en,...[...wrong]]);
      return {...base,prompt:'Choose the correct spelling',sub:clue,options:opts,correct:opts.indexOf(w.en),answer:w.en,listen:w.en}; }
    if(type==='odd'){ const otherTopics=Object.keys(WORDBANK).filter(t=>t!==w.topic);
      const same=shuffle(wordsOf(w.topic,w.lv).filter(x=>x.en!==w.en)).slice(0,2);
      /* the same word can live in two topics (fish is an animal and a food), so the odd
         one out must not collide with the words it is hiding among */
      const taken=new Set([w.en,...same.map(x=>x.en)]);
      let alien=null;
      for(let k=0;k<12&&!alien;k++){ const c=rnd(wordsOf(rnd(otherTopics),w.lv)); if(c&&!taken.has(c.en)) alien=c }
      if(!alien||same.length<2) return this.vocab(diff,safe,1);
      const opts=shuffle([w,...same,alien]);
      return {...base,ref:{type:'word',id:alien.en,word:alien},prompt:'Which word does not belong?',
        sub:'Three words share a topic, one does not',
        options:opts.map(o=>o.en),correct:opts.indexOf(alien),answer:alien.en,
        ex:alien.en+' is about '+WORDBANK[alien.topic].n+'; the others are about '+topicName+'.',
        ee:alien.en+' is about '+WORDBANK[alien.topic].n+'.',clue:'Look at the topic of each word'}; }
    if(type==='letters'){ const chars=w.en.split(''); const hide=new Set();
      const share=oneWord?(diff===2?.45:.3):(diff===2?.22:.14);   /* go gentler on long phrases */
      const n=clamp(Math.round(bare.length*share),1,9);
      let t=0; while(hide.size<n&&t++<40){ const i=rint(0,chars.length-1); if(chars[i]!==' ') hide.add(i) }
      const masked=chars.map((c,i)=>hide.has(i)?'_':c).join(' ');
      return {...base,kind:'input',prompt:'Complete the word',sub:masked+'   ·   '+clue,correct:w.en,answer:w.en,listen:w.en}; }
    if(type==='scramble'){ const letters=shuffle(w.en.replace(/ /g,'').split(''));
      return {...base,kind:'seq',prompt:'Put the letters in the right order',sub:clue,
        tokens:letters,correct:w.en.replace(/ /g,''),answer:w.en,listen:w.en}; }
    return {...base,kind:'input',prompt:'Listen and type the word',sub:clue,correct:w.en,answer:w.en,listen:w.en,autoListen:true};
  },

  /* ---------- GRAMMAR ---------- */
  grammar(diff,exclude=[]){
    const topics=(SESSION.topics.g.length?SESSION.topics.g:Object.keys(GRAMMARBANK)).filter(t=>GRAMMARBANK[t]);
    const AM=answerMode();
    /* keep only the question kinds the chosen format allows */
    const fits=q=> AM==='choice' ? (q.k==='ch'||q.k==='er')
                 : AM==='typing' ? (q.k==='in'||q.k==='sq'||typableCh(q))
                 : true;
    const pick=(topic,strict)=>{
      const set=GRAMMARBANK[topic].q[diff]||GRAMMARBANK[topic].q[0];
      let l=set.map((q,i)=>({q,i,t:topic})).filter(x=>!strict||fits(x.q));
      const fr=l.filter(x=>this.fresh('g:'+topic+x.i)&&!exclude.includes(topic+x.i));
      if(fr.length) return fr;
      const ne=l.filter(x=>!exclude.includes(topic+x.i));
      return ne.length?ne:l;
    };
    let t=Adapt.pickWeighted(topics,x=>{const st=S.gram[x];return st&&st.w>st.c?3:1});
    let list=pick(t,true);
    if(!list.length){                       /* this topic cannot serve that format — try the others */
      for(const alt of shuffle(topics)){ const l=pick(alt,true); if(l.length){ t=alt; list=l; break } }
    }
    if(!list.length) list=pick(t,false);    /* nothing anywhere: rather than stall, use what exists */
    const {q,i}=rnd(list); this.remember('g:'+t+i);
    /* in writing mode a gap-fill choice question becomes a typed one */
    if(AM==='typing'&&typableCh(q)){
      const a=q.o[q.a];
      return {tag:'Grammar · '+GRAMMARBANK[t].n,ref:{type:'gram',id:t,qid:t+i},ex:q.ee,ee:q.ee,clue:q.ee,
              time:DIFF[diff].timer,rule:q.ee,kind:'input',prompt:q.q,
              sub:'Type the missing word'+(a.split(/\s+/).length>1?'s':''),correct:a,answer:a};
    }
    const base={tag:'Grammar · '+GRAMMARBANK[t].n,ref:{type:'gram',id:t,qid:t+i},ex:q.ee,ee:q.ee,clue:q.ee,
                time:DIFF[diff].timer,rule:q.ee};
    if(q.k==='ch') return {...base,kind:'choice',prompt:q.q,sub:'Choose the correct option',options:q.o,correct:q.a,answer:q.o[q.a]};
    if(q.k==='er') return {...base,kind:'choice',prompt:q.q,sub:'Tap the mistake',options:q.o,correct:q.a,answer:q.o[q.a]};
    if(q.k==='in') return {...base,kind:'input',prompt:q.q,sub:'Type your answer in English',correct:q.a,answer:q.a.split('|')[0]};
    return {...base,kind:'seq',prompt:q.q||'Put the words in the correct order',sub:'Tap the words one by one',
            tokens:shuffle(q.a.split(' ')),correct:q.a,answer:q.a,sep:' '};
  }
};

/* =====================================================================
   4. QUESTION WINDOW (shared by blocks, monsters, bosses, quests)
   ===================================================================== */
let LV=null;   // current level state
function boostLeft(id){ return LV? (LV.boosts[id]||0) : 0 }
function useBoost(id){ if(!boostLeft(id)) return false; LV.boosts[id]--; LV.stats.boostsUsed++; save(); return true }

let askActive=false;
function ask(q){
  return new Promise(resolve=>{
    const M=$('#m-question');
    /* never let a second question overwrite an open one — that used to leave the game waiting forever */
    if(askActive){ console.warn('[ask] re-entry blocked'); return resolve({ok:false,shielded:false,skipped:true}) }
    askActive=true; clearKeys();
    const card=$('#q-card');
    let done=false, second=false, shielded=false, tId=null, tLeft=q.time||0, helpTried=false, rescued=false;
    let answered=false;                 /* one answer per question — no tapping the right one afterwards */
    const isHard=SESSION.diff===2;
    card.innerHTML='';
    /* head */
    const head=document.createElement('div'); head.className='qhead';
    head.innerHTML='<span class="qtag">'+q.tag+'</span><span class="qtag">'+(LV?'❤️ '+LV.hearts+'  🪙 '+LV.coins:'')+'</span>';
    card.appendChild(head);
    /* timer */
    let bar=null;
    if(tLeft){ const t=document.createElement('div'); t.className='timer'; t.innerHTML='<i></i>'; card.appendChild(t); bar=t.firstChild; }
    /* prompt */
    const p=document.createElement('div'); p.className='qprompt'; p.textContent=q.prompt; card.appendChild(p);
    const sub=document.createElement('div'); sub.className='qsub'; sub.textContent=q.sub||''; card.appendChild(sub);
    if(q.listen){ const b=document.createElement('button'); b.className='pill'; b.style.marginBottom='12px'; b.textContent='🔊 Listen';
      b.onclick=()=>speak(q.listen); card.appendChild(b); if(q.autoListen) setTimeout(()=>speak(q.listen),250); }
    /* body */
    const body=document.createElement('div'); card.appendChild(body);
    const fb=document.createElement('div'); fb.className='fb';
    const boostRow=document.createElement('div'); boostRow.className='boostrow';

    let optEls=[];
    if(q.kind==='choice'){
      const wrap=document.createElement('div'); wrap.className='opts'+(q.pic?' two':'');
      q.options.forEach((o,i)=>{ const b=document.createElement('button'); b.className='opt'+(q.pic?' pic':''); b.textContent=o;
        b.onclick=()=>pick(i); wrap.appendChild(b); optEls.push(b) });
      body.appendChild(wrap);
    } else if(q.kind==='input'){
      const words=String(q.correct).split('|')[0].trim().split(/\s+/).length;
      const inp=document.createElement('input'); inp.className='qinput'; inp.autocomplete='off';
      inp.placeholder=words>1?('your answer ('+words+' words, spaces are fine)…'):'your answer…';
      inp.autocapitalize='off'; inp.spellcheck=false;
      inp.onkeydown=e=>{ if(e.key==='Enter') pick(inp.value) };
      const b=document.createElement('button'); b.className='big-btn'; b.style.marginTop='12px'; b.textContent='Answer';
      b.onclick=()=>pick(inp.value);
      body.appendChild(inp); body.appendChild(b); setTimeout(()=>inp.focus(),80); optEls=[inp,b];
    } else { /* seq */
      const line=document.createElement('div'); line.className='seqline'; body.appendChild(line);
      const pool=document.createElement('div'); pool.className='opts'; pool.style.gridTemplateColumns='none'; pool.style.display='flex';
      pool.style.flexWrap='wrap'; pool.style.gap='6px'; body.appendChild(pool);
      const chosen=[];
      q.tokens.forEach((t,i)=>{ const b=document.createElement('button'); b.className='tok'; b.textContent=t;
        b.onclick=()=>{ if(b.classList.contains('used')) return; b.classList.add('used'); chosen.push({t,b});
          const c=document.createElement('button'); c.className='tok'; c.textContent=t;
          c.onclick=()=>{ const k=chosen.findIndex(x=>x.b===b); if(k>=0){chosen.splice(k,1); b.classList.remove('used'); c.remove()} };
          line.appendChild(c); };
        pool.appendChild(b) });
      const go=document.createElement('button'); go.className='big-btn'; go.style.marginTop='12px'; go.textContent='Done';
      go.onclick=()=>pick(chosen.map(x=>x.t).join(q.sep||''));
      body.appendChild(go); optEls=[go];
    }
    /* boosts */
    const canFifty = q.kind==='choice' && q.options.length>2;
    const bl=[];
    if(canFifty) bl.push(['fifty','✂️ 50/50',()=>{ if(!spend('fifty'))return; const wrong=q.options.map((_,i)=>i).filter(i=>i!==q.correct);
        shuffle(wrong).slice(0,Math.max(1,q.options.length-2)).forEach(i=>optEls[i].classList.add('dim')); }]);
    bl.push(['dictionary','📗 Dictionary',()=>{ if(!spend('dictionary'))return; sub.textContent=(q.sub?q.sub+' · ':'')+(q.clue||q.ee) }]);
    if(q.rule) bl.push(['grammar','📖 Rule',()=>{ if(!spend('grammar'))return; sub.textContent=q.rule }]);
    bl.push(['second','🔄 Forgive a mistake',()=>{ if(!spend('second'))return; second=true; toast('One wrong answer will cost you nothing') }]);
    if(tLeft) bl.push(['time','⏳ Freeze timer',()=>{ if(!spend('time'))return; clearInterval(tId); tId=null; if(bar) bar.style.background='var(--cyan)' }]);
    bl.forEach(([id,label,fn])=>{ const b=document.createElement('button'); b.className='bchip'; b.textContent=label+' ×'+boostLeft(id);
      b.disabled=!boostLeft(id); b.onclick=()=>{fn(); b.textContent=label+' ×'+boostLeft(id); b.disabled=!boostLeft(id)}; boostRow.appendChild(b) });
    /* free hint from the Helmet of Knowledge */
    if(canFifty && LV && S.gear.eq.helmet==='helm-know' && !LV.freeHint){
      const b=document.createElement('button'); b.className='bchip'; b.textContent='🎩 Helmet hint';
      b.onclick=()=>{ LV.freeHint=true; b.disabled=true; const wrong=q.options.map((_,i)=>i).filter(i=>i!==q.correct);
        shuffle(wrong).slice(0,Math.max(1,q.options.length-2)).forEach(i=>optEls[i].classList.add('dim')) };
      boostRow.appendChild(b);
    }
    if(LV) card.appendChild(boostRow);
    card.appendChild(fb);
    function spend(id){ if(!useBoost(id)){toast('You have no such boost');return false} return true }

    M.classList.add('on');
    if(tLeft){ tId=setInterval(()=>{ tLeft-=.1; if(bar) bar.style.width=clamp(tLeft/q.time*100,0,100)+'%';
        if(tLeft<=0){ clearInterval(tId); pick(null) } },100); }

    function correctOf(){ if(q.kind==='choice') return q.correct; return String(q.correct) }
    function isRight(val){
      if(val===null) return false;
      if(q.kind==='choice') return val===q.correct;
      return String(q.correct).split('|').some(c=>sameAnswer(c,val));
    }
    function pick(val){
      if(done||answered) return;
      let ok=isRight(val);
      /* the moment an answer is in, the whole answer area stops taking clicks —
         including while a co-op partner is being asked to rescue it */
      answered=true; body.style.pointerEvents='none';
      /* Second Chance forgives the mistake — it never hands back the question. Once an
         answer is in, the right option can no longer be tapped: guessing must cost something. */
      if(!ok && second){ second=false; shielded=true; }
      /* co-op: hand the question to your partner before anything else is spent on it */
      if(!ok && NET.on && NET.mate && NET.mode==='coop' && q.kind==='choice' && !helpTried){
        helpTried=true; toast('Asking your partner…');
        if(q.kind==='choice'&&val!==null&&optEls[val]) optEls[val].classList.add('dim');
        askPartner(q).then(saved=>{
          if(saved){ shielded=true; rescued=true; toast('Your partner rescued that one!') }
          settle(false, val);          /* still your mistake for practice stats — but the hit is absorbed */
        });
        return;
      }
      settle(ok, val);
    }
    function settle(ok,val){
      if(done) return;
      if(!ok && LV && S.gear.eq.helmet==='helm-guard' && !LV.guardUsed){ LV.guardUsed=true; shielded=true; }
      else if(!ok && boostLeft('shield')){ useBoost('shield'); shielded=true; }
      done=true; clearInterval(tId);
      /* a mistake nobody absorbed costs ten seconds of silence */
      if(!ok && !shielded && LV) startFreeze();
      if(q.kind==='choice'){ optEls.forEach((b,i)=>{ b.onclick=null; if(i===q.correct) b.classList.add('ok'); });
        if(!ok&&val!==null&&optEls[val]) optEls[val].classList.add('bad'); }
      optEls.forEach(e=>{ if(e.tagName==='BUTTON'&&e.className.includes('big-btn')) e.disabled=true });
      record(q,ok);
      fb.className='fb on '+(ok?'good':'bad');
      const expl = q.ee||q.ex||'';
      fb.innerHTML = ok
        ? '<b>✅ Correct!</b><br>'+(q.answer?'<span style="opacity:.85">'+q.answer+'</span><br>':'')+expl
        : (rescued?'<b>🤝 Your partner answered it for you</b><br>':shielded?'<b>🛡️ A boost protected you</b><br>':'<b>❌ Not quite</b><br>')+
          'Correct answer: <b>'+ (q.kind==='choice'? q.options[q.correct] : q.answer) +'</b><br>'+expl;
      if(!isHard && q.clue && q.clue!==expl) fb.innerHTML+='<br><span style="opacity:.7;font-size:12.5px">'+q.clue+'</span>';
      if(!ok&&!shielded&&LV) fb.innerHTML+='<br><span style="color:#8ED8FF">🧊 Frozen for 10 seconds — '+
        'read the explanation while you wait, then carry on collecting coins.</span>';
      ok?Snd.good():Snd.bad();
      const next=document.createElement('button'); next.className='big-btn'; next.style.marginTop='14px';
      next.textContent=ok?'Continue →':'Got it →'; next.onclick=close; card.appendChild(next);
      setTimeout(()=>next.focus(),60);
      function close(){ askActive=false; clearInterval(tId); M.classList.remove('on'); clearKeys(); resolve({ok, shielded}); }
      card.onkeydown=e=>{ if(e.key==='Enter') close() };
    }
  });
}

/* record the result in the stats and the adaptive system */
function record(q,ok){
  const st=S.stats;
  if(q.ref.type==='word'){ Adapt.markWord(q.ref.word,ok); ok?st.vocOk++:st.vocBad++; if(LV&&LV.review) st.reviewed++; daily('d-voc',ok?1:0); }
  else { Adapt.markGram(q.ref.id,ok); ok?st.gramOk++:st.gramBad++; }
  if(LV){ ok?LV.stats.ok++:LV.stats.bad++;
    if(ok){ LV.stats.streak++; LV.stats.best=Math.max(LV.stats.best,LV.stats.streak); st.bestStreak=Math.max(st.bestStreak,LV.stats.streak);
      applyStreakJump(LV.stats.streak); }
    else { LV.stats.streak=0; LV.mistakes.push({q:q.prompt+' '+(q.sub||''),a:q.kind==='choice'?q.options[q.correct]:q.answer}); }
    $('#streak').textContent=LV.stats.streak>2?('🔥 streak '+LV.stats.streak):'';
  }
  checkAch(); save();
}
