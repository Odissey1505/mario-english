/* =====================================================================
   11. START
   ===================================================================== */
document.addEventListener('click',e=>{
  const go=e.target.closest('[data-go]'); if(!go) return;
  const d=go.dataset.go;
  if(d==='back') return back();
  if(d==='quick'){ SESSION.mode='quick'; SESSION.world=rint(0,S.unlocked-1); return show('topics') }
  if(d==='review'){ const hv=Adapt.hardTopics('v'), hg=Adapt.hardTopics('g');
    if(hv.length) SESSION.topics.v=hv.slice(0,4); if(hg.length) SESSION.topics.g=hg.slice(0,4);
    SESSION.mode='review'; SESSION.world=rint(0,S.unlocked-1); toast('Review mode: your difficult topics are selected'); return show('topics') }
  show(d);
});
$('#topics-next').onclick=()=>{
  if(!SESSION.topics.v.length){ toast('Choose at least one vocabulary topic'); return }
  if(!SESSION.topics.g.length){ toast('Choose at least one grammar topic'); return }
  /* opened from a room: go back there with the new choice instead of starting a solo level */
  if(NET.on&&NET.fromLobby){ NET.fromLobby=false; sendPlan(); show('online'); return }
  show('diff');
};
$('#diff-next').onclick=()=>show('brief');
$('#start-level').onclick=()=>{
  /* a pinned seed (homework or an online room) must survive; a free play gets a fresh world */
  if(!NET.on && !SESSION.pin) SESSION.seed=null;
  startLevel(SESSION.world,SESSION.diff,{review:SESSION.mode==='review'});
};
$('#pausebtn').onclick=togglePause;
$$('[data-act]').forEach(b=>b.onclick=()=>{
  const a=b.dataset.act, all=Object.keys(WORDBANK).filter(x=>!isCustom(x)), allg=Object.keys(GRAMMARBANK).filter(x=>!isCustom(x));
  if(a==='v-all') SESSION.topics.v=[...all];
  if(a==='v-none') SESSION.topics.v=[];
  if(a==='v-rand') SESSION.topics.v=shuffle(all).slice(0,4);
  if(a==='v-rec') SESSION.topics.v=all.slice(0,5);
  if(a==='v-hard'){ const h=Adapt.hardTopics('v'); SESSION.topics.v=h.length?h.slice(0,5):SESSION.topics.v; if(!h.length) toast('No difficult topics yet') }
  if(a==='g-all') SESSION.topics.g=[...allg];
  if(a==='g-none') SESSION.topics.g=[];
  if(a==='g-rand') SESSION.topics.g=shuffle(allg).slice(0,3);
  if(a==='g-rec') SESSION.topics.g=allg.slice(0,3);
  if(a==='g-hard'){ const h=Adapt.hardTopics('g'); SESSION.topics.g=h.length?h.slice(0,4):SESSION.topics.g; if(!h.length) toast('No difficult topics yet') }
  if(a==='preset-save'){ const n=prompt('Preset name:'); if(n){ S.presets[n]={v:[...SESSION.topics.v],g:[...SESSION.topics.g]}; save(); toast('Preset saved') } }
  renderTopics();
});
addEventListener('resize',updateTouchVisibility);
document.addEventListener('pointerdown',()=>Snd.resume(),{once:true});
document.addEventListener('keydown',()=>Snd.resume(),{once:true});
SESSION.diff=S.diff||0;
wireLessons();
loadHeroSheets(); syncCourses(); ensureDaily(); updateTouchVisibility(); renderMenu();
/* an invite link lands straight in the room — nothing to pick, everything comes from the host */
autoJoin();
