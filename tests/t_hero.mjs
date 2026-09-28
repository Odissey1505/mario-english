import {JSDOM} from 'jsdom';
import {createCanvas, Image as NImage} from 'canvas';
import fs from 'fs';
const html=fs.readFileSync(process.env.GAME||'dist/index.html','utf8');
const real=createCanvas(960,540); const rctx=real.getContext('2d');
const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'http://localhost/',
 beforeParse(w){ const _o=w.HTMLCanvasElement.prototype.getContext;
  w.HTMLCanvasElement.prototype.getContext=function(t){ return this.id==='cv'?rctx:_o.call(this,t) };
  w.Image=NImage; w.matchMedia=()=>({matches:false}); w.requestAnimationFrame=()=>0; w.scrollTo=()=>{}; }});
const w=dom.window;
const oc=w.document.createElement.bind(w.document);
w.document.createElement=(t,...a)=>String(t).toLowerCase()==='canvas'?createCanvas(2,2):oc(t,...a);
await new Promise(r=>setTimeout(r,600));
console.log('sprite loaded:', w.eval('HERO.ok'), '| heroes:', w.eval('HEROES.length'), '| avatars:', w.eval('AVATARS.length'));
w.eval("show('hero')");
console.log('hero cards:', w.document.querySelectorAll('[data-hero]').length, '| avatar buttons:', w.document.querySelectorAll('[data-av]').length);
w.document.querySelectorAll('[data-av]')[3].click();
console.log('avatar now:', w.eval('S.avatar'));
// recolour actually changes the armour and leaves skin/hair alone
const probe=w.eval(`(()=>{
  const out=[];
  for(const h of HEROES){ if(h.vector) continue;
    S.hero=h.id; const img=heroImage();
    const c=document.createElement('canvas'); c.width=img.width; c.height=img.height;
    const x=c.getContext('2d'); x.drawImage(img,0,0);
    const f=HERO_META.idle; const d=x.getImageData(f[0],f[1],f[2],f[3]).data;
    let blue=0,skin=0,n=0;
    for(let i=0;i<d.length;i+=4){ if(d[i+3]<40) continue; n++;
      const R=d[i],G=d[i+1],B=d[i+2];
      if(B>90&&B>R+25&&B>G+10) blue++;
      if(R>215&&G>195&&B>150&&B<225) skin++; }
    out.push(h.id+': armourBlue='+blue+' skin='+skin);
  }
  return out.join(' | ')})()`);
console.log(probe);
// in-game render with a recoloured hero
w.eval("startLevel(0,1); fade=1; camX=0;");
const ids=w.eval("JSON.stringify(HEROES.filter(h=>!h.vector).map(h=>h.id))");
JSON.parse(ids).forEach((id,i)=>{ w.eval(`S.hero='${id}'; P.x=${120+i*140}; P.y=GYTOP-P.h; P.vx=0; P.ground=true; drawPlayer(CX);`); });

real.toBuffer('image/png');
console.log('rendered every hero');
