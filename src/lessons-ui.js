/* =====================================================================
   COURSE LIBRARY — pick lessons, whole units or whole courses
   ---------------------------------------------------------------------
   One tree with three levels (course › unit › lesson) and a tick on every level,
   so "this lesson", "this whole unit" and "the entire course" are the same gesture.
   Several units and several courses can be on at once, and words and grammar can be
   chosen together or separately.

   It stores nothing of its own: a tick is just SESSION.topics.v / .g — the same arrays
   the topic chips write — so the level builder, homework codes and the online room all
   keep working unchanged.
   ===================================================================== */
const LIB={ open:{}, q:'', scope:'both', ctx:'topics' };

/* the library as a tree, with what each lesson actually holds */
function libTree(){
  return allCourses().map(({co,src,i:ci})=>{
    const sections=(co.sections||[]).map((se,si)=>{
      const lessons=(se.lessons||[]).map((le,li)=>{
        const t=lessonTopics(le,ci,si,li,src);
        return {name:le.name, id:src+ci+'.'+si+'.'+li, v:t.v, g:t.g,
                words:(le.words||[]).length, gram:(le.grammar||[]).length};
      }).filter(l=>l.v.length||l.g.length);
      return {name:se.name, id:src+ci+'.'+si, lessons};
    }).filter(s=>s.lessons.length);
    return {name:co.name, id:src+ci, mine:src==='u', sections};
  }).filter(c=>c.sections.length);
}
function libNode(id){                     /* find a course, unit or lesson by its row id */
  const tree=libTree();
  if(id[0]==='c') return tree.find(c=>'c'+c.id===id);
  if(id[0]==='s') return tree.flatMap(c=>c.sections).find(s=>'s'+s.id===id);
  return tree.flatMap(c=>c.sections).flatMap(s=>s.lessons).find(l=>'l'+l.id===id);
}
/* every topic key under a node, split by kind */
function libKeys(node){
  const v=[], g=[];
  const take=l=>{ (l.v||[]).forEach(k=>v.push(k)); (l.g||[]).forEach(k=>g.push(k)) };
  if(node.sections) node.sections.forEach(s=>s.lessons.forEach(take));
  else if(node.lessons) node.lessons.forEach(take);
  else take(node);
  return {v,g};
}
function libWants(){ return {v:LIB.scope!=='g', g:LIB.scope!=='v'} }   /* which kinds a tick touches */
function libState(node){                  /* on / part / off */
  const {v,g}=libKeys(node), w=libWants();
  const all=[...(w.v?v:[]),...(w.g?g:[])];
  if(!all.length) return 'off';
  const on=all.filter(k=>SESSION.topics[k.startsWith(CUSTOM_V)?'v':'g'].includes(k)).length;
  return on===0?'off':(on===all.length?'on':'part');
}
function libSet(node,on){
  const {v,g}=libKeys(node), w=libWants();
  const put=(arr,keys)=>keys.forEach(k=>{ const i=arr.indexOf(k);
    if(on&&i<0) arr.push(k); if(!on&&i>=0) arr.splice(i,1) });
  if(w.v) put(SESSION.topics.v,v);
  if(w.g) put(SESSION.topics.g,g);
  S.topics={v:[...SESSION.topics.v],g:[...SESSION.topics.g]}; save();
}
/* how much is chosen, in words and tasks — the number that says what a level will feel like */
function libCount(){
  let lessons=0, words=0, gram=0, units=new Set(), courses=new Set();
  libTree().forEach(c=>c.sections.forEach(s=>s.lessons.forEach(l=>{
    const vOn=l.v.length&&SESSION.topics.v.includes(l.v[0]);
    const gOn=l.g.length&&SESSION.topics.g.includes(l.g[0]);
    if(vOn||gOn){ lessons++; units.add(s.id); courses.add(c.id) }
    if(vOn) words+=l.words;
    if(gOn) gram+=l.gram;
  })));
  return {lessons,words,gram,units:units.size,courses:courses.size};
}
function libSummaryText(){
  const c=libCount();
  if(!c.lessons) return 'No course lessons chosen — the game will use the built-in topics below.';
  return c.lessons+' lesson'+(c.lessons>1?'s':'')+' from '+c.units+' unit'+(c.units>1?'s':'')+
         ' in '+c.courses+' course'+(c.courses>1?'s':'')+' · 📘 '+c.words+' words · 📐 '+c.gram+' grammar tasks';
}
function libClearAll(){
  SESSION.topics.v=SESSION.topics.v.filter(k=>!isCustom(k));
  SESSION.topics.g=SESSION.topics.g.filter(k=>!isCustom(k));
  S.topics={v:[...SESSION.topics.v],g:[...SESSION.topics.g]}; save();
}
const libHit=t=>!LIB.q||String(t).toLowerCase().includes(LIB.q);
const libTick=st=>'<span class="tick '+st+'">'+(st==='on'?'✓':(st==='part'?'–':''))+'</span>';
/* a search shows everything it matched; otherwise a single course starts open and the rest closed */
function libOpen(key,dflt){ return LIB.q?true:(LIB.open[key]===undefined?dflt:LIB.open[key]) }

function renderLessons(){
  const room=LIB.ctx==='online';
  $('#lib-hint').textContent=room
    ? 'Choosing for room '+NET.code+' — your partner sees every change at once.'
    : 'Tick a lesson, a whole unit or a whole course. Several units and several courses can be on at the same time.';
  const sc=[['both','📘📐 Words + grammar'],['v','📘 Words only'],['g','📐 Grammar only']];
  $('#lib-scope').innerHTML=sc.map(([id,n])=>
    '<button class="pill'+(LIB.scope===id?' gold':'')+'" data-libscope="'+id+'">'+n+'</button>').join('');
  $('#lib-scope-hint').innerHTML=(LIB.scope==='both'
    ? 'A tick takes both the words and the grammar of that lesson.'
    : (LIB.scope==='v' ? 'A tick takes only the words — grammar keeps what it already has.'
                       : 'A tick takes only the grammar — words keep what they already have.'))+
    '<br><b id="lib-count"></b>';

  const tree=libTree(), single=tree.length===1;
  let html='';
  tree.forEach(c=>{
    const cHit=libHit(c.name);
    const secs=c.sections.map(s=>({s,lessons:s.lessons.filter(l=>cHit||libHit(s.name)||libHit(l.name))}))
                         .filter(x=>x.lessons.length);
    if(!secs.length) return;
    const ck='c'+c.id, cOpen=libOpen(ck,single);
    html+='<div class="panel lib-course">'+
      '<div class="lib-row head" data-libtoggle="'+ck+'" data-libdflt="'+(single?1:0)+'">'+
        '<button class="tickbtn" data-libpick="'+ck+'" title="The whole course">'+libTick(libState(c))+'</button>'+
        '<span class="caret">'+(cOpen?'▾':'▸')+'</span>'+
        '<b>'+esc(c.name)+'</b>'+(c.mine?' <span class="badge learning">my course</span>':'')+
        '<span class="muted grow">'+c.sections.length+' units · '+
          c.sections.reduce((n,s)=>n+s.lessons.length,0)+' lessons</span></div>';
    if(cOpen) secs.forEach(({s,lessons})=>{
      const sk='s'+s.id, sOpen=libOpen(sk,false);
      html+='<div class="lib-sec">'+
        '<div class="lib-row" data-libtoggle="'+sk+'" data-libdflt="0">'+
          '<button class="tickbtn" data-libpick="'+sk+'" title="The whole unit">'+libTick(libState(s))+'</button>'+
          '<span class="caret">'+(sOpen?'▾':'▸')+'</span>'+
          '<span>'+esc(s.name)+'</span>'+
          '<span class="muted grow">'+lessons.length+' lessons</span></div>';
      if(sOpen) lessons.forEach(l=>{
        html+='<div class="lib-row lesson" data-libpick="l'+l.id+'">'+
          '<span class="tickbtn">'+libTick(libState(l))+'</span>'+
          '<span>'+esc(l.name)+'</span>'+
          '<span class="muted grow">'+(l.words?'📘 '+l.words:'')+(l.words&&l.gram?' · ':'')+
            (l.gram?'📐 '+l.gram:'')+'</span></div>';
      });
      html+='</div>';
    });
    html+='</div>';
  });
  if(!html) html='<div class="panel"><p class="muted">Nothing matches “'+esc(LIB.q)+'”. '+
    'Clear the search to see every course.</p></div>';
  $('#lib-tree').innerHTML=html;

  /* a row opens and closes; the tick button on it selects */
  $$('#lib-tree [data-libtoggle]').forEach(el=>el.onclick=()=>{
    const k=el.dataset.libtoggle;
    LIB.open[k]=!libOpen(k,el.dataset.libdflt==='1');
    renderLessons();
  });
  $$('#lib-tree [data-libpick]').forEach(el=>el.onclick=e=>{
    e.stopPropagation();
    const node=libNode(el.dataset.libpick); if(!node) return;
    const turnOn=libState(node)!=='on';
    libSet(node,turnOn);
    if(el.dataset.libpick[0]==='c'&&turnOn) LIB.open[el.dataset.libpick]=true;
    renderLessons(); libPush();
  });

  const c=libCount();
  const cnt=$('#lib-count');
  if(cnt) cnt.textContent=c.lessons?('Chosen: '+libSummaryText()):'Chosen: nothing yet';
  $('#lib-done').textContent=room
    ? (c.lessons?('Send '+c.lessons+' lesson'+(c.lessons>1?'s':'')+' to the room'):'Back to the room')
    : (c.lessons?('Use '+c.lessons+' lesson'+(c.lessons>1?'s':'')+' →'):'Back to the topics →');
  $('#lib-none').style.display=c.lessons?'':'none';
}
/* a change made from inside a room reaches the partner straight away */
function libPush(){ if(LIB.ctx==='online'&&NET.on&&NET.role==='host') sendPlan() }
function openLessons(ctx){
  LIB.ctx=ctx||'topics'; LIB.q='';
  const s=$('#lib-search'); if(s) s.value='';
  show('lessons');
}
function wireLessons(){
  const s=$('#lib-search');
  if(s) s.oninput=()=>{ LIB.q=s.value.trim().toLowerCase(); renderLessons() };
  $('#lib-expand').onclick=()=>{ libTree().forEach(c=>{ LIB.open['c'+c.id]=true;
    c.sections.forEach(x=>LIB.open['s'+x.id]=true) }); renderLessons() };
  $('#lib-collapse').onclick=()=>{ LIB.open={}; libTree().forEach(c=>{ LIB.open['c'+c.id]=false;
    c.sections.forEach(x=>LIB.open['s'+x.id]=false) }); renderLessons() };
  $('#lib-none').onclick=()=>{ libClearAll(); renderLessons(); libPush(); toast('Course lessons cleared') };
  $('#lib-done').onclick=()=>{
    if(LIB.ctx==='online'){ setRoomTopics(null,null); show('online'); return }
    show('topics');
  };
  document.addEventListener('click',e=>{
    const b=e.target.closest('[data-libscope]'); if(!b) return;
    LIB.scope=b.dataset.libscope; renderLessons();
  });
}
