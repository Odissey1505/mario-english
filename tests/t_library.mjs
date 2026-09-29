/* The course library: tick a lesson, a whole unit or a whole course, mix several courses,
   pick words and grammar separately, search, and hand the result to a level or a room. */
import {JSDOM} from 'jsdom'; import fs from 'fs';
const html=fs.readFileSync(process.env.GAME||'dist/index.html','utf8');
const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'http://localhost/',
 beforeParse(w){ const _o=w.HTMLCanvasElement.prototype.getContext;
  const _p=new Proxy({},{get:(t,k)=>(k==='createLinearGradient'||k==='createRadialGradient')?()=>({addColorStop:()=>{}}):()=>{},set:()=>true});
  w.HTMLCanvasElement.prototype.getContext=function(t){return this.id==='cv'?_p:_o.call(this,t)};
  w.matchMedia=()=>({matches:false});w.requestAnimationFrame=()=>0;w.scrollTo=()=>{}; }});
const w=dom.window, D=w.document;
await new Promise(r=>setTimeout(r,300));
let bad=0; const fail=m=>{ console.log('FAIL '+m); bad++ };
const J=x=>JSON.parse(w.eval('JSON.stringify('+x+')'));
const count=()=>J('libCount()');
const clear=()=>w.eval('SESSION.topics.v=[];SESSION.topics.g=[];libClearAll()');

/* a second course of the teacher's own, so "several courses at once" is really tested */
w.eval(`S.courses=[{name:'My club course',sections:[
  {name:'Unit A',lessons:[
    {name:'Pets',words:[{en:'hamster',def:'a small pet rodent'},{en:'parrot',def:'a talking bird'}],
     grammar:[{q:'She ___ a parrot.',a:'has',o:['has','have','having']}]},
    {name:'Snacks',words:[{en:'popcorn',def:'puffed corn you eat at the cinema'}],grammar:[]}]},
  {name:'Unit B',lessons:[
    {name:'Weather talk',words:[{en:'drizzle',def:'very light rain'}],
     grammar:[{q:'It ___ raining.',a:'is',o:['is','are','be']}]}]}]}];
  save(); syncCourses(); show('lessons');`);

const tree=J('libTree()');
if(tree.length<2) fail('the library does not list both the built-in and my own course ('+tree.length+')');
const mine=tree.find(c=>c.name==='My club course');
if(!mine) fail('my own course is missing from the library');
if(!mine.mine) fail('my own course is not marked as mine');
if(mine.sections.length!==2) fail('my course lost a unit');
if(mine.sections[0].lessons.length!==2) fail('my unit lost a lesson');
console.log('courses in the library:', tree.map(c=>c.name+' ('+c.sections.length+' units)').join(' | '));

/* --- one lesson --- */
clear();
w.eval("renderLessons(); LIB.open['c"+mine.id+"']=true; LIB.open['s"+mine.sections[0].id+"']=true; renderLessons()");
const lessonRow=[...D.querySelectorAll('#lib-tree .lib-row.lesson')].find(r=>r.textContent.includes('Pets'));
if(!lessonRow) fail('the lesson rows are not shown when a unit is opened');
lessonRow.click();
let c=count();
if(c.lessons!==1||c.words!==2||c.gram!==1) fail('one lesson did not select cleanly: '+JSON.stringify(c));
if(!w.eval("SESSION.topics.v.some(k=>k.startsWith('cv:u'))")) fail('the lesson words did not reach the level topics');
lessonRow.click();
if(count().lessons!==0) fail('clicking the lesson again did not clear it');

/* --- a whole unit, from the unit row --- */
const unitTick=D.querySelector('[data-libpick="s'+mine.sections[0].id+'"]');
if(!unitTick) fail('a unit has no tick of its own');
unitTick.click();
c=count();
if(c.lessons!==2||c.words!==3) fail('ticking a unit did not take all its lessons: '+JSON.stringify(c));
if(J("libState(libNode('s"+mine.sections[0].id+"'))")!=='on') fail('a fully selected unit does not read as on');
if(J("libState(libNode('c"+mine.id+"'))")!=='part') fail('a course with one of two units on should read as part');

/* --- the whole course, from the course row --- */
D.querySelector('[data-libpick="c'+mine.id+'"]').click();
c=count();
if(c.lessons!==3||c.units!==2) fail('ticking the course did not take every unit: '+JSON.stringify(c));
if(J("libState(libNode('c"+mine.id+"'))")!=='on') fail('a fully selected course does not read as on');
D.querySelector('[data-libpick="c'+mine.id+'"]').click();
if(count().lessons!==0) fail('un-ticking the course left lessons behind');

/* --- several courses at once --- */
const big=tree.find(c=>!c.mine);
D.querySelector('[data-libpick="c'+mine.id+'"]').click();
w.eval("LIB.open['c"+big.id+"']=true; renderLessons()");
D.querySelector('[data-libpick="s'+big.sections[0].id+'"]').click();
c=count();
if(c.courses!==2) fail('two courses cannot be selected at once: '+JSON.stringify(c));
console.log('mixed selection:', w.eval('libSummaryText()'));

/* --- words and grammar separately --- */
clear(); w.eval("LIB.scope='v'; renderLessons()");
D.querySelector('[data-libpick="s'+mine.sections[0].id+'"]').click();
if(w.eval('SESSION.topics.g.length')!==0) fail('"words only" still took grammar');
if(!w.eval('SESSION.topics.v.length')) fail('"words only" took no words');
w.eval("LIB.scope='g'; renderLessons()");
D.querySelector('[data-libpick="s'+mine.sections[1].id+'"]').click();
if(!w.eval('SESSION.topics.g.length')) fail('"grammar only" took no grammar');
const vAfter=w.eval('SESSION.topics.v.length');
if(w.eval("SESSION.topics.v.filter(k=>k.includes('.1.')).length")) fail('"grammar only" also took words');
console.log('split pick → words:', vAfter, 'grammar:', w.eval('SESSION.topics.g.length'));
w.eval("LIB.scope='both'");

/* --- search --- */
w.eval("LIB.q='weather'; renderLessons()");
const shown=D.querySelector('#lib-tree').textContent;
if(!/Weather talk/.test(shown)) fail('search did not find the lesson');
if(/Snacks/.test(shown)) fail('search still shows lessons that do not match');
w.eval("LIB.q=''; renderLessons()");

/* --- the result really drives a level --- */
clear(); w.eval("LIB.scope='both'; renderLessons()");
D.querySelector('[data-libpick="c'+mine.id+'"]').click();
w.eval("SESSION.world=0;SESSION.diff=1;startLevel(0,1,{seed:'lib'})");
await new Promise(r=>setTimeout(r,80));
const q=J("(function(){const o=[];for(let i=0;i<40;i++){const x=QM.vocab(1);o.push(x.answer||x.prompt)}return o})()");
const own=['hamster','parrot','popcorn','drizzle'];
const foreign=q.filter(x=>!own.some(o=>String(x).toLowerCase().includes(o)));
if(foreign.length>q.length*0.5) fail('the level is not built from the chosen course: '+JSON.stringify(q.slice(0,6)));
console.log('level words come from the picked course:', q.slice(0,4).join(', '));

/* --- the topics screen reflects it, and the room button opens the library --- */
w.eval("show('topics')");
if(!/lesson/.test(D.querySelector('#lib-summary').textContent)) fail('the topics screen does not summarise the library');
w.eval("NET.on=true;NET.role='host';NET.code='LIB1';NET.mate={name:'O',avatar:'🐼',hero:'azure'};show('online')");
const libBtn=D.querySelector('[data-netlib]');
if(!libBtn) fail('the room has no button for the library');
libBtn.click();
if(!w.eval("$('#s-lessons').classList.contains('on')")) fail('the room button did not open the library');
if(w.eval('LIB.ctx')!=='online') fail('the library does not know it is choosing for a room');
if(!/room LIB1/.test(D.querySelector('#lib-hint').textContent)) fail('the library does not say it is choosing for the room');
/* a change inside the room is pushed to the partner */
const sent=[]; w.eval("NET.send=function(m){ window.__s(m) }"); w.__s=m=>sent.push(m);
D.querySelector('[data-libpick="c'+mine.id+'"]').click();
if(!sent.some(m=>m.t==='lobby')) fail('a change in the library was not sent to the room: '+JSON.stringify(sent));
D.querySelector('#lib-done').click();
if(!w.eval("$('#s-online').classList.contains('on')")) fail('"send to the room" did not go back to the room');

console.log(bad?('t_library: '+bad+' problem(s)'):'t_library: ok');
process.exit(bad?1:0);
