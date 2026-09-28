/* =====================================================================
   3. ADAPTIVE LEARNING + QUESTION MANAGER
   ===================================================================== */
const WORDS_FLAT=[];
function rebuildWords(){
  WORDS_FLAT.length=0;
  for(const t in WORDBANK){ WORDBANK[t].lv.forEach((arr,lv)=>arr.forEach(s=>{
    const [en,ic,def]=s.split('|'); WORDS_FLAT.push({en,ic:ic||'',def:def||'',topic:t,lv});
  }))}
}
rebuildWords();
/* ---- custom courses: teacher-made content merged into the same banks the game already uses ----
   A course holds sections, a section holds lessons, a lesson holds words and grammar questions.
   Every lesson becomes one vocabulary topic (cv:...) and one grammar topic (cg:...), so custom
   content flows through the existing question generator with no special cases. */
const CUSTOM_V='cv:', CUSTOM_G='cg:';
const isCustom=t=>t.startsWith(CUSTOM_V)||t.startsWith(CUSTOM_G);
/* A lesson key is  <b|u><course>.<section>.<lesson>  —  'b' for a course that ships with the
   game, 'u' for one the teacher made. The letter matters: built-in lessons never have to be
   packed into a homework code, because everyone already has them. */
const isShipped=k=>/^c[vg]:b/.test(k);
function lessonPath(co,se,le){ return co.name+' › '+se.name+' › '+le.name }
function allCourses(){
  return [...(BUILTIN_COURSES||[]).map((c,i)=>({co:c,src:'b',i})),
          ...(S.courses||[]).map((c,i)=>({co:c,src:'u',i}))];
}
function syncCourses(){
  for(const k of Object.keys(WORDBANK)) if(k.startsWith(CUSTOM_V)) delete WORDBANK[k];
  for(const k of Object.keys(GRAMMARBANK)) if(k.startsWith(CUSTOM_G)) delete GRAMMARBANK[k];
  allCourses().forEach(({co,src,i:ci})=>(co.sections||[]).forEach((se,si)=>(se.lessons||[]).forEach((le,li)=>{
    const key=src+ci+'.'+si+'.'+li, name=lessonPath(co,se,le);
    if(le.words&&le.words.length){
      const enc=le.words.map(w=>w.en+'|'+(w.ic||'')+'|'+(w.def||''));
      WORDBANK[CUSTOM_V+key]={n:name,custom:true,lv:[enc,enc,enc]};   /* a lesson's words work at every difficulty */
    }
    if(le.grammar&&le.grammar.length){
      GRAMMARBANK[CUSTOM_G+key]={n:name,custom:true,q:[le.grammar,le.grammar,le.grammar]};
    }
  })));
  rebuildWords();
}
function lessonTopics(le,ci,si,li,src){
  const out={v:[],g:[]}, key=(src||'u')+ci+'.'+si+'.'+li;
  if(le.words&&le.words.length) out.v.push(CUSTOM_V+key);
  if(le.grammar&&le.grammar.length) out.g.push(CUSTOM_G+key);
  return out;
}
const wordsOf=(topic,lv)=>WORDS_FLAT.filter(w=>w.topic===topic&&w.lv===lv);

const Adapt={
  wordStat(en){ return S.words[en]||(S.words[en]={c:0,w:0,seen:0}) },
  gramStat(t){ return S.gram[t]||(S.gram[t]={c:0,w:0}) },
  markWord(w,ok){ const st=this.wordStat(w.en); st.seen++; st.def=w.def; st.topic=w.topic; st.lv=w.lv; st.ic=w.ic;
    ok?st.c++:st.w++; st.status=this.status(st); save(); },
  markGram(t,ok){ const st=this.gramStat(t); ok?st.c++:st.w++; save(); },
  status(st){ if(st.w>=2&&st.c<st.w) return 'hard'; if(st.c>=4&&st.c>=st.w*3) return 'done'; if(st.c>0||st.w>0) return 'learning'; return 'new'; },
  weight(en){ const st=S.words[en]; if(!st) return 1.6;                     // a new word appears a bit more often
    const memory = S.gear.eq.amulet==='amu-memory'?2:1;
    if(st.status==='hard') return 4*memory; if(st.status==='done') return .4; return 1.4; },
  hardWords(){ return Object.entries(S.words).filter(([,v])=>v.status==='hard').map(([k,v])=>({en:k,...v})); },
  hardTopics(kind){ if(kind==='v'){ const m={}; for(const [en,v] of Object.entries(S.words)) if(v.status==='hard'&&v.topic) m[v.topic]=(m[v.topic]||0)+1;
      return Object.keys(m).sort((a,b)=>m[b]-m[a]); }
    return Object.entries(S.gram).filter(([,v])=>v.w>v.c).sort((a,b)=>b[1].w-a[1].w).map(x=>x[0]); },
  pickWeighted(list,wf){ const tot=list.reduce((s,x)=>s+wf(x),0); let r=Math.random()*tot;
    for(const x of list){ r-=wf(x); if(r<=0) return x } return list[list.length-1]; }
};

/* ---- task-format options, chosen on the difficulty screen ----
   emoji  : may a task show the word's picture (emoji) at all
   answer : 'choice'  — every task is multiple choice, nothing is ever typed
            'mixed'   — the full mix (default)
            'typing'  — type or build the answer whenever the task allows it */
const ANSWER_MODES=[
  {id:'choice',n:'Choose only',   d:'Every task is multiple choice. Nothing to type — good for young learners, phones, and fast rounds.'},
  {id:'mixed', n:'Mixed',         d:'The full range: pictures, listening, spelling, missing letters, typing and word order.'},
  {id:'typing',n:'Write it out',  d:'Type the word or build the sentence whenever the task allows it. Hardest, and the best for spelling.'}
];
const V_CHOICE=new Set(['pic','name','def','listen','odd','spell']);   /* tasks answered by tapping */
const V_TYPED =new Set(['letters','scramble','type']);                 /* tasks answered by writing */
const opt=()=>S.opts||(S.opts={emoji:true,answer:'mixed'});
/* ---- fair marking for typed answers ----
   Now that a whole mode is built on typing, a learner must not lose a point for a straight
   apostrophe, a missing one, or writing "did not" where the key says "didn't". Each side is
   turned into a set of equivalent spellings and the two sets are compared. */
function answerForms(text){
  let t=String(text).toLowerCase()
        .replace(/[‘’ʼ`´]/g,"'")       /* curly and stray apostrophes */
        .replace(/[.,!?;:"“”]/g,'')
        .replace(/\s+/g,' ').trim();
  const out=new Set([t, t.replace(/'/g,'')]);
  const expand=x=>x
    .replace(/\bcan't\b/g,'cannot').replace(/\bwon't\b/g,'will not').replace(/\bshan't\b/g,'shall not')
    .replace(/n't\b/g,' not')
    .replace(/'m\b/g,' am').replace(/'re\b/g,' are').replace(/'ve\b/g,' have').replace(/'ll\b/g,' will');
  const e=expand(t).replace(/\s+/g,' ').trim();
  out.add(e); out.add(e.replace(/'/g,''));
  /* 'd and 's stand for two things each, so offer both readings */
[["'d",' would'],["'d",' had'],["'s",' is'],["'s",' has']].forEach(([c,f])=>{
    if(t.includes(c)){ const v=expand(t.split(c).join(f)).replace(/\s+/g,' ').trim(); out.add(v) }
  });
  out.add('cannot'===t?'can not':t);
  if(t.includes('cannot')) out.add(t.replace(/cannot/g,'can not'));
  if(/\bcan not\b/.test(t)) out.add(t.replace(/can not/g,'cannot'));
  return out;
}
function sameAnswer(a,b){
  const A=answerForms(a), B=answerForms(b);
  for(const x of A) if(B.has(x)) return true;
  return false;
}
const useEmoji=()=>opt().emoji!==false;
const answerMode=()=>opt().answer||'mixed';
/* a typed grammar question can be made out of a gap-fill choice question, but only when the
   answer is a short plain word — never out of "have / been learning" or a find-the-mistake task */
function typableCh(q){
  if(q.k!=='ch'||!/___/.test(q.q)) return false;
  const a=q.o[q.a]||'';
  return !/[\/]/.test(a) && a.split(/\s+/).length<=2 && a.length<=18;
}
