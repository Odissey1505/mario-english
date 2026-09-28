/* =====================================================================
   COURSE BUILDER — teacher-made courses, sections, lessons, words, grammar
   ===================================================================== */
const CB={src:'u',co:-1,se:-1,le:-1};         /* which course / section / lesson is open */
const esc=t=>String(t==null?'':t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const GKIND={ch:'choice',er:'find the mistake',in:'type the answer',sq:'word order'};

function courseCounts(co){
  let w=0,g=0,l=0;
  (co.sections||[]).forEach(se=>(se.lessons||[]).forEach(le=>{ l++; w+=(le.words||[]).length; g+=(le.grammar||[]).length }));
  return {w,g,l,s:(co.sections||[]).length};
}
function saveCourses(){ syncCourses(); save() }

/* ---- text formats a teacher can paste ---- */
function parseWords(text){
  return text.split('\n').map(l=>l.trim()).filter(Boolean).map(l=>{
    const p=l.split('|').map(x=>x.trim());
    return {en:p[0], ic:p[1]||'', def:p[2]||''};
  }).filter(w=>w.en);
}
function wordsToText(words){ return (words||[]).map(w=>[w.en,w.ic||'',w.def||''].join(' | ').replace(/\s*\|\s*$/,'').replace(/\s*\|\s*$/,'')).join('\n') }
function parseGrammar(text){
  const out=[];
  text.split('\n').map(l=>l.trim()).filter(Boolean).forEach(line=>{
    let k='ch', l=line;
    if(l[0]==='?'){ k='in'; l=l.slice(1).trim() }
    else if(l[0]==='#'){ k='sq'; l=l.slice(1).trim() }
    else if(l[0]==='!'){ k='er'; l=l.slice(1).trim() }
    const p=l.split('|').map(x=>x.trim());
    if(k==='in'){ if(p.length<2) return; out.push({k,q:p[0],a:p[1].split(';').map(x=>x.trim()).filter(Boolean).join('|'),ee:p[2]||''}) }
    else if(k==='sq'){ if(!p[0]) return; out.push({k,q:'Put the words in the correct order',a:p[0],ee:p[1]||''}) }
    else { if(p.length<3) return;
      const o=p[1].split(';').map(x=>x.trim()).filter(Boolean); const a=parseInt(p[2],10)-1;
      if(o.length<2||!(a>=0&&a<o.length)) return;
      out.push({k,q:p[0],o,a,ee:p[3]||''}) }
  });
  return out;
}
function grammarToText(qs){
  return (qs||[]).map(q=>{
    if(q.k==='in') return '? '+q.q+' | '+String(q.a).split('|').join('; ')+(q.ee?' | '+q.ee:'');
    if(q.k==='sq') return '# '+q.a+(q.ee?' | '+q.ee:'');
    return (q.k==='er'?'! ':'')+q.q+' | '+q.o.join('; ')+' | '+(q.a+1)+(q.ee?' | '+q.ee:'');
  }).join('\n');
}

function renderCourses(){
  syncCourses();
  const body=$('#cb-body'), T=$('#cb-title');
  const list=CB.src==='b'?(BUILTIN_COURSES||[]):S.courses;
  const co=list[CB.co], shipped=CB.src==='b', se=co&&co.sections[CB.se], le=se&&se.lessons[CB.le];

  /* ---------- lesson editor ---------- */
  if(le){
    T.textContent=le.name;
    body.innerHTML=
     '<div class="row" style="margin-bottom:12px"><button class="pill" id="cb-up">↩ '+esc(se.name)+'</button>'+
     '<button class="pill gold" id="cb-play">▶ Play this lesson</button>'+
     (shipped?'<button class="pill" id="cb-copy">📋 Copy to my courses</button>'
             :'<button class="pill" id="cb-ren">✎ Rename</button><button class="pill" id="cb-del">🗑 Delete lesson</button>')+'</div>'+
     (shipped?'<p class="muted" style="margin-bottom:12px">This lesson comes with the game, so it stays as it is. '+
              'Copy the course into <b>My courses</b> if you want to change the words or add your own questions.</p>':'')+
     '<div class="panel"><h3>📘 Words <span class="muted">'+(le.words||[]).length+'</span></h3>'+
       '<p class="muted">One word per line. Optional extras after a vertical bar:<br>'+
       '<code>word | emoji | short English definition</code><br>'+
       'The emoji gives picture tasks, the definition gives “Which word means this?” tasks. Both can be left out.</p>'+
       '<textarea id="cb-words" class="qinput" style="font-family:monospace;font-size:14px;text-align:left;letter-spacing:0;'+
       'height:190px;width:100%;margin-top:10px"'+(shipped?' readonly':'')+'>'+esc(wordsToText(le.words))+'</textarea></div>'+
     '<div class="panel"><h3>📐 Grammar <span class="muted">'+(le.grammar||[]).length+'</span></h3>'+
       '<p class="muted">One question per line.<br>'+
       '<code>He ___ football. | play; plays; playing | 2 | We add -s after he, she, it.</code> — multiple choice, the number is the correct option.<br>'+
       '<code>? Make it negative: "He is happy." | he is not happy; he isn\'t happy | Add not after be.</code> — the student types the answer, any listed spelling counts.<br>'+
       '<code>! She don\'t know. | She; don\'t; know | 2 | Third person needs doesn\'t.</code> — the student taps the mistake.<br>'+
       '<code># The train leaves at six | Present Simple for timetables.</code> — the student rebuilds the sentence.</p>'+
       '<textarea id="cb-gram" class="qinput" style="font-family:monospace;font-size:14px;text-align:left;letter-spacing:0;'+
       'height:190px;width:100%;margin-top:10px"'+(shipped?' readonly':'')+'>'+esc(grammarToText(le.grammar))+'</textarea></div>'+
     (shipped?'':'<button class="big-btn" id="cb-save">Save lesson</button>')+'<div class="muted" id="cb-msg" style="margin-top:10px"></div>';
    $('#cb-up').onclick=()=>{ CB.le=-1; renderCourses() };
    if(shipped){ $('#cb-copy').onclick=()=>copyCourse(co);
      $('#cb-play').onclick=()=>playCustom(lessonTopics(le,CB.co,CB.se,CB.le,'b')); return }
    $('#cb-save').onclick=()=>{
      le.words=parseWords($('#cb-words').value); le.grammar=parseGrammar($('#cb-gram').value);
      saveCourses();
      const msg='Saved: '+le.words.length+' words, '+le.grammar.length+' grammar questions.';
      toast('Lesson saved'); renderCourses(); const m=$('#cb-msg'); if(m) m.textContent=msg;
    };
    $('#cb-ren').onclick=()=>{ const n=prompt('Lesson name:',le.name); if(n){ le.name=n; saveCourses(); renderCourses() } };
    $('#cb-del').onclick=()=>{ if(confirm('Delete "'+le.name+'"?')){ se.lessons.splice(CB.le,1); CB.le=-1; saveCourses(); renderCourses() } };
    $('#cb-play').onclick=()=>playCustom(lessonTopics(le,CB.co,CB.se,CB.le,'u'));
    return;
  }

  /* ---------- section: list of lessons ---------- */
  if(se){
    T.textContent=se.name;
    const t=collectTopics(CB.co,CB.se,CB.src);
    body.innerHTML=
     '<div class="row" style="margin-bottom:12px"><button class="pill" id="cb-up">↩ '+esc(co.name)+'</button>'+
     '<button class="pill gold" id="cb-play">▶ Play the whole section</button>'+
     (shipped?'':'<button class="pill" id="cb-ren">✎ Rename</button><button class="pill" id="cb-del">🗑 Delete section</button>')+'</div>'+
     '<div class="panel"><h3>Lessons</h3>'+
      ((se.lessons||[]).length?se.lessons.map((l,i)=>
        '<div class="kv"><span><b>'+esc(l.name)+'</b></span><b>'+(l.words||[]).length+' words · '+(l.grammar||[]).length+' grammar '+
        '<button class="pill" data-le="'+i+'" style="margin-left:8px">Open</button>'+
        '<button class="pill gold" data-plle="'+i+'" style="margin-left:6px">▶</button></b></div>').join('')
        :'<p class="muted">No lessons yet.</p>')+
      (shipped?'':'<button class="pill gold" id="cb-addl" style="margin-top:12px">+ New lesson</button>')+'</div>'+
     '<p class="muted">This section holds '+t.v.length+' vocabulary sets and '+t.g.length+' grammar sets.</p>';
    $('#cb-up').onclick=()=>{ CB.se=-1; renderCourses() };
    $$('[data-le]').forEach(b=>b.onclick=()=>{ CB.le=+b.dataset.le; renderCourses() });
    $$('[data-plle]').forEach(b=>b.onclick=()=>playCustom(lessonTopics(se.lessons[+b.dataset.plle],CB.co,CB.se,+b.dataset.plle,CB.src)));
    $('#cb-play').onclick=()=>playCustom(collectTopics(CB.co,CB.se,CB.src));
    if(shipped) return;
    $('#cb-addl').onclick=()=>{ const n=prompt('Lesson name:','Lesson '+((se.lessons||[]).length+1)); if(!n) return;
      se.lessons=se.lessons||[]; se.lessons.push({name:n,words:[],grammar:[]}); CB.le=se.lessons.length-1; saveCourses(); renderCourses() };
    $('#cb-ren').onclick=()=>{ const n=prompt('Section name:',se.name); if(n){ se.name=n; saveCourses(); renderCourses() } };
    $('#cb-del').onclick=()=>{ if(confirm('Delete "'+se.name+'" and its lessons?')){ co.sections.splice(CB.se,1); CB.se=-1; saveCourses(); renderCourses() } };
    return;
  }

  /* ---------- course: list of sections ---------- */
  if(co){
    T.textContent=co.name;
    const c=courseCounts(co), t=collectTopics(CB.co,null,CB.src);
    body.innerHTML=
     '<div class="row" style="margin-bottom:12px"><button class="pill" id="cb-up">↩ All courses</button>'+
     '<button class="pill gold" id="cb-play">▶ Play the whole course</button>'+
     (shipped?'<button class="pill" id="cb-copy">📋 Copy to my courses</button>'
             :'<button class="pill" id="cb-ren">✎ Rename</button><button class="pill" id="cb-del">🗑 Delete course</button>')+
     '<button class="pill" id="cb-exp">⬇ Export</button></div>'+
     '<div class="panel"><h3>Sections</h3>'+
      ((co.sections||[]).length?co.sections.map((x,i)=>
        '<div class="kv"><span><b>'+esc(x.name)+'</b></span><b>'+(x.lessons||[]).length+' lessons '+
        '<button class="pill" data-se="'+i+'" style="margin-left:8px">Open</button></b></div>').join('')
        :'<p class="muted">No sections yet.</p>')+
      (shipped?'':'<button class="pill gold" id="cb-adds" style="margin-top:12px">+ New section</button>')+'</div>'+
     '<p class="muted">'+c.s+' sections · '+c.l+' lessons · '+c.w+' words · '+c.g+' grammar questions. '+
      'Playable sets: '+t.v.length+' vocabulary, '+t.g.length+' grammar.</p>';
    $('#cb-up').onclick=()=>{ CB.co=-1; renderCourses() };
    $$('[data-se]').forEach(b=>b.onclick=()=>{ CB.se=+b.dataset.se; renderCourses() });
    $('#cb-exp').onclick=()=>exportCourse(co);
    $('#cb-play').onclick=()=>playCustom(t);
    if(shipped){ $('#cb-copy').onclick=()=>copyCourse(co); return }
    $('#cb-adds').onclick=()=>{ const n=prompt('Section name:','Unit '+((co.sections||[]).length+1)); if(!n) return;
      co.sections=co.sections||[]; co.sections.push({name:n,lessons:[]}); CB.se=co.sections.length-1; saveCourses(); renderCourses() };
    $('#cb-ren').onclick=()=>{ const n=prompt('Course name:',co.name); if(n){ co.name=n; saveCourses(); renderCourses() } };
    $('#cb-del').onclick=()=>{ if(confirm('Delete the whole course "'+co.name+'"?')){ S.courses.splice(CB.co,1); CB.co=-1; saveCourses(); renderCourses() } };
    return;
  }

  /* ---------- all courses ---------- */
  T.textContent='My Courses';
  body.innerHTML=
   '<p class="muted" style="margin-bottom:14px">Add your own words and grammar. A course holds sections (units), a section holds lessons, '+
   'and every lesson can be played on its own, together with its section, or as the whole course. Your content mixes with the built-in topics '+
   'and goes through the same tasks: pictures, listening, spelling, odd one out, and the rest.</p>'+
   ((BUILTIN_COURSES||[]).length?'<div class="panel"><h3>Courses that come with the game</h3>'+
     BUILTIN_COURSES.map((c,i)=>{ const n=courseCounts(c);
      return '<div class="kv"><span><b>'+esc(c.name)+'</b><br><span class="muted">'+n.s+' units · '+n.l+' lessons · '+n.w+' words · '+n.g+' grammar questions</span></span>'+
        '<b><button class="pill" data-bco="'+i+'">Open</button></b></div>' }).join('')+'</div>':'')+
   '<div class="panel"><h3>My courses</h3>'+
    (S.courses.length?S.courses.map((c,i)=>{ const n=courseCounts(c);
      return '<div class="kv"><span><b>'+esc(c.name)+'</b><br><span class="muted">'+n.s+' sections · '+n.l+' lessons · '+n.w+' words · '+n.g+' grammar</span></span>'+
        '<b><button class="pill" data-co="'+i+'">Open</button></b></div>' }).join('')
      :'<p class="muted">Nothing of your own yet. Create a course, or load the example to see the format.</p>')+
    '<div class="row" style="margin-top:12px"><button class="pill gold" id="cb-addc">+ New course</button>'+
    '<button class="pill" id="cb-imp">⬆ Import from file</button>'+
    '<button class="pill" id="cb-expall">⬇ Export all</button>'+
    '<button class="pill" id="cb-demo">✨ Load example course</button></div></div>'+
   '<input type="file" id="cb-file" accept=".json,application/json" style="display:none">';
  $$('[data-co]').forEach(b=>b.onclick=()=>{ CB.src='u'; CB.co=+b.dataset.co; renderCourses() });
  $$('[data-bco]').forEach(b=>b.onclick=()=>{ CB.src='b'; CB.co=+b.dataset.bco; renderCourses() });
  $('#cb-addc').onclick=()=>{ const n=prompt('Course name:','My course'); if(!n) return;
    S.courses.push({name:n,sections:[]}); CB.src='u'; CB.co=S.courses.length-1; saveCourses(); renderCourses() };
  $('#cb-expall').onclick=()=>exportCourse(null);
  $('#cb-demo').onclick=()=>{ S.courses.push(DEMO_COURSE()); saveCourses(); renderCourses(); toast('Example course added') };
  $('#cb-imp').onclick=()=>$('#cb-file').click();
  $('#cb-file').onchange=e=>{ const f=e.target.files[0]; if(!f) return;
    const r=new FileReader();
    r.onload=()=>{ try{
        const data=JSON.parse(r.result);
        const list=Array.isArray(data)?data:(data.courses||[data]);
        let added=0;
        list.forEach(c=>{ if(c&&c.name&&Array.isArray(c.sections)){ S.courses.push(c); added++ } });
        if(!added) return toast('No courses found in that file');
        saveCourses(); renderCourses(); toast('Imported '+added+' course'+(added>1?'s':''));
      }catch(err){ toast('That file is not valid course JSON') } };
    r.readAsText(f); e.target.value='';
  };
}
/* every lesson topic under a course (or one section of it) */
function collectTopics(ci,si,src){
  const out={v:[],g:[]}, co=((src==='b'?BUILTIN_COURSES:S.courses)||[])[ci]; if(!co) return out;
  (co.sections||[]).forEach((se,sj)=>{ if(si!=null&&si>=0&&sj!==si) return;
    (se.lessons||[]).forEach((le,lj)=>{ const t=lessonTopics(le,ci,sj,lj,src); out.v.push(...t.v); out.g.push(...t.g) }) });
  return out;
}
function copyCourse(co){
  const c=JSON.parse(JSON.stringify(co)); c.name=co.name+' (my copy)';
  S.courses.push(c); CB.src='u'; CB.co=S.courses.length-1; CB.se=-1; CB.le=-1;
  saveCourses(); renderCourses(); toast('Copied — now you can edit it');
}
function playCustom(t){
  if(!t.v.length&&!t.g.length){ toast('Add some words or grammar first'); return }
  SESSION.topics.v=t.v.length?[...t.v]:[...SESSION.topics.v];
  SESSION.topics.g=t.g.length?[...t.g]:[...SESSION.topics.g];
  if(!SESSION.topics.v.length) SESSION.topics.v=Object.keys(WORDBANK).filter(x=>!isCustom(x)).slice(0,3);
  if(!SESSION.topics.g.length) SESSION.topics.g=Object.keys(GRAMMARBANK).filter(x=>!isCustom(x)).slice(0,2);
  S.topics={v:[...SESSION.topics.v],g:[...SESSION.topics.g]}; save();
  SESSION.mode='custom'; SESSION.pin=false; SESSION.seed=null; SESSION.world=rint(0,Math.max(0,S.unlocked-1));
  toast('Topics set from your course'); show('diff');
}
function exportCourse(co){
  const data=co?{courses:[co]}:{courses:S.courses};
  const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download=(co?co.name.replace(/[^\w\-]+/g,'_'):'my-courses')+'.json';
  a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),4000);
  toast('Exported');
}
function DEMO_COURSE(){
  return {name:'Example course',sections:[{name:'Unit 1 — At home',lessons:[
    {name:'Lesson 1 — Rooms',
     words:[{en:'kitchen',ic:'🍳',def:'the room where you cook'},{en:'bedroom',ic:'🛏️',def:'the room where you sleep'},
            {en:'bathroom',ic:'🛁',def:'the room with a bath and a shower'},{en:'garden',ic:'🌷',def:'the green space outside a house'},
            {en:'stairs',ic:'',def:'steps that take you up to the next floor'},{en:'attic',ic:'',def:'the room right under the roof'}],
     grammar:[{k:'ch',q:'There ___ two windows in the kitchen.',o:['is','are','be'],a:1,ee:'Use "are" with a plural noun.'},
              {k:'ch',q:'The cat is ___ the bed.',o:['in','under','at'],a:1,ee:'"Under" means below something.'},
              {k:'in',q:'Make it negative: "There is a lamp here."',a:'there is not a lamp here|there isn\'t a lamp here',ee:'Add "not" after is.'},
              {k:'sq',q:'Put the words in the correct order',a:'My bedroom is next to the bathroom',ee:'Subject, verb, then the place.'}]},
    {name:'Lesson 2 — Furniture',
     words:[{en:'sofa',ic:'🛋️',def:'a long soft seat for two or three people'},{en:'wardrobe',ic:'',def:'a tall cupboard for your clothes'},
            {en:'shelf',ic:'',def:'a flat board on a wall for books'},{en:'carpet',ic:'',def:'a soft cover for the floor'}],
     grammar:[{k:'er',q:'Find the mistake: "The sofa are very old."',o:['The','sofa','are','old'],a:2,ee:'"Sofa" is singular, so use "is".'},
              {k:'ch',q:'We keep our clothes ___ the wardrobe.',o:['on','in','at'],a:1,ee:'"In" means inside.'}]}]}]};
}
