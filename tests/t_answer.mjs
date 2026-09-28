import {JSDOM} from 'jsdom'; import fs from 'fs';
const html=fs.readFileSync(process.env.GAME||'dist/index.html','utf8');
const d=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'http://localhost/',
 beforeParse(w){ const _o=w.HTMLCanvasElement.prototype.getContext;
  const _p=new Proxy({},{get:(t,k)=>(k==='createLinearGradient'||k==='createRadialGradient')?()=>({addColorStop:()=>{}}):()=>{},set:()=>true});
  w.HTMLCanvasElement.prototype.getContext=function(t){return this.id==='cv'?_p:_o.call(this,t)};
  w.matchMedia=()=>({matches:false});w.requestAnimationFrame=()=>0;w.scrollTo=()=>{};}});
const w=d.window; await new Promise(r=>setTimeout(r,250));
const ok=[["didn't","didnt"],["didn't","did not"],["didn't","didn’t"],["isn't","is not"],
 ["he is not happy","he isn't happy"],["can't","cannot"],["can't","can not"],["won't","will not"],
 ["has just finished","Has just finished."],["studies"," studies "],["wouldn't go","would not go"],
 ["artificial intelligence","Artificial  Intelligence"],["I'm","I am"],["they're","they are"],
 ["he's gone","he has gone"],["Hamlet was written by Shakespeare","hamlet was written by shakespeare."]];
const no=[["didn't","did"],["is","are"],["studies","study"],["have tried","tried"],["the","a"],
 ["he is not happy","he is happy"],["went","go"]];
let bad=[];
ok.forEach(([a,b])=>{ if(!w.eval(`sameAnswer(${JSON.stringify(a)},${JSON.stringify(b)})`)) bad.push('should accept: '+a+' / '+b) });
no.forEach(([a,b])=>{ if(w.eval(`sameAnswer(${JSON.stringify(a)},${JSON.stringify(b)})`)) bad.push('should reject: '+a+' / '+b) });
console.log('answer matching:', bad.length?('FAIL → '+bad.join('; ')):(ok.length+' accepted, '+no.length+' rejected — all correct'));
