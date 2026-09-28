import {JSDOM} from 'jsdom'; import fs from 'fs';
const html=fs.readFileSync(process.env.GAME||'dist/index.html','utf8');
const d=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'http://localhost/',
 beforeParse(w){ const _o=w.HTMLCanvasElement.prototype.getContext;
  const _p=new Proxy({},{get:(t,k)=>(k==='createLinearGradient'||k==='createRadialGradient')?()=>({addColorStop:()=>{}}):()=>{},set:()=>true});
  w.HTMLCanvasElement.prototype.getContext=function(t){return this.id==='cv'?_p:_o.call(this,t)};
  w.matchMedia=()=>({matches:false});w.requestAnimationFrame=()=>0;w.scrollTo=()=>{};}});
const w=d.window; await new Promise(r=>setTimeout(r,250));
w.eval("show('diff')");
console.log('mode cards:', w.document.querySelectorAll('[data-am]').length, '| picture buttons:', w.document.querySelectorAll('[data-em]').length);
console.log('default:', w.eval("JSON.stringify(opt())"));
w.document.querySelectorAll('[data-am]')[0].click();
w.document.querySelectorAll('[data-em]')[1].click();
console.log('after clicks:', w.eval("JSON.stringify(opt())"));
console.log('selection is highlighted:', w.document.querySelector('[data-am="choice"]').className.includes('sel'),
            w.document.querySelector('[data-em="0"]').className.includes('gold'));
w.eval("show('brief')");
const brief=w.document.querySelector('#brief-box').textContent;
console.log('brief shows it:', /Answers/.test(brief), '→', brief.match(/Answers(.{0,40})/)[1]);
// survives a reload
const saved=w.localStorage.getItem('crystal-of-words-v1');
const d2=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'http://localhost/',
 beforeParse(x){ const _o=x.HTMLCanvasElement.prototype.getContext;
  const _p=new Proxy({},{get:(t,k)=>(k==='createLinearGradient'||k==='createRadialGradient')?()=>({addColorStop:()=>{}}):()=>{},set:()=>true});
  x.HTMLCanvasElement.prototype.getContext=function(t){return this.id==='cv'?_p:_o.call(this,t)};
  x.matchMedia=()=>({matches:false});x.requestAnimationFrame=()=>0;x.scrollTo=()=>{};
  x.localStorage.setItem('crystal-of-words-v1',saved); }});
await new Promise(r=>setTimeout(r,250));
console.log('remembered after reload:', d2.window.eval("JSON.stringify(opt())"));
// homework carries the format
w.eval("show('teacher')"); w.document.querySelector('#t-make').click();
const code=w.document.querySelector('#t-out code').textContent;
const d3=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'http://localhost/',
 beforeParse(x){ const _o=x.HTMLCanvasElement.prototype.getContext;
  const _p=new Proxy({},{get:(t,k)=>(k==='createLinearGradient'||k==='createRadialGradient')?()=>({addColorStop:()=>{}}):()=>{},set:()=>true});
  x.HTMLCanvasElement.prototype.getContext=function(t){return this.id==='cv'?_p:_o.call(this,t)};
  x.matchMedia=()=>({matches:false});x.requestAnimationFrame=()=>0;x.scrollTo=()=>{};}});
await new Promise(r=>setTimeout(r,250));
const st=d3.window;
console.log('student default before code:', st.eval("JSON.stringify(opt())"));
st.eval("show('teacher')"); st.document.querySelector('#t-in').value=code; st.document.querySelector('#t-load').click();
console.log('student after code       :', st.eval("JSON.stringify(opt())"));
