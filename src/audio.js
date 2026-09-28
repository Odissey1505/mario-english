const Snd={
  ctx:null, master:null, sfxBus:null, musBus:null, noiseBuf:null,
  init(){
    if(this.ctx) return;
    try{
      const C=window.AudioContext||window.webkitAudioContext; this.ctx=new C();
      this.master=this.ctx.createGain(); this.master.gain.value=VOLS[S.settings.volume||'mid'];
      this.master.connect(this.ctx.destination);
      this.sfxBus=this.ctx.createGain(); this.sfxBus.gain.value=.8; this.sfxBus.connect(this.master);
      this.musBus=this.ctx.createGain(); this.musBus.gain.value=.34; this.musBus.connect(this.master);
      const n=this.ctx.sampleRate*1.2; this.noiseBuf=this.ctx.createBuffer(1,n,this.ctx.sampleRate);
      const d=this.noiseBuf.getChannelData(0); for(let i=0;i<n;i++) d[i]=Math.random()*2-1;
    }catch(e){ this.ctx=null }
  },
  resume(){ this.init(); if(this.ctx&&this.ctx.state==='suspended') this.ctx.resume(); },
  setVolume(){ if(this.master) this.master.gain.value=VOLS[S.settings.volume||'mid'] },
  /* one shaped tone */
  tone(o={}){
    if(!S.settings.sound&&!o.music) return; this.init(); if(!this.ctx) return;
    const t=(o.when||this.ctx.currentTime), osc=this.ctx.createOscillator(), g=this.ctx.createGain();
    osc.type=o.type||'square'; osc.frequency.setValueAtTime(o.f,t);
    if(o.f2) osc.frequency.exponentialRampToValueAtTime(Math.max(40,o.f2),t+(o.d||.12));
    const vol=o.vol==null?.22:o.vol, at=o.attack==null?.006:o.attack, d=o.d||.12;
    g.gain.setValueAtTime(.0001,t); g.gain.exponentialRampToValueAtTime(vol,t+at);
    g.gain.exponentialRampToValueAtTime(.0001,t+d);
    osc.connect(g); g.connect(o.music?this.musBus:this.sfxBus); osc.start(t); osc.stop(t+d+.05);
  },
  /* filtered noise burst — steps, landings, hits, hi-hats */
  noise(o={}){
    if(!S.settings.sound&&!o.music) return; this.init(); if(!this.ctx||!this.noiseBuf) return;
    const t=(o.when||this.ctx.currentTime), src=this.ctx.createBufferSource(), g=this.ctx.createGain(), f=this.ctx.createBiquadFilter();
    src.buffer=this.noiseBuf; f.type=o.hp?'highpass':'lowpass'; f.frequency.value=o.freq||1200;
    const vol=o.vol==null?.14:o.vol, d=o.d||.1;
    g.gain.setValueAtTime(vol,t); g.gain.exponentialRampToValueAtTime(.0001,t+d);
    src.connect(f); f.connect(g); g.connect(o.music?this.musBus:this.sfxBus); src.start(t); src.stop(t+d+.02);
  },
  seq(list,gap=90){ list.forEach((o,i)=>setTimeout(()=>this.tone(o),i*gap)) },

  jump(){ this.tone({f:300,f2:640,d:.13,type:'square',vol:.16}); this.noise({freq:2200,hp:true,d:.05,vol:.05}) },
  land(){ this.noise({freq:520,d:.09,vol:.12}); this.tone({f:150,f2:80,d:.09,type:'sine',vol:.12}) },
  step(){ this.noise({freq:900,d:.035,vol:.045}) },
  coin(){ this.tone({f:1050,d:.05,type:'triangle',vol:.14}); this.tone({f:1560,d:.11,type:'triangle',vol:.12,when:(this.ctx?this.ctx.currentTime+.05:0)}) },
  block(){ this.tone({f:220,f2:120,d:.09,type:'square',vol:.16}); this.noise({freq:1400,hp:true,d:.05,vol:.07}) },
  good(){ this.seq([{f:523,d:.1,type:'triangle',vol:.16},{f:659,d:.1,type:'triangle',vol:.16},{f:784,d:.22,type:'triangle',vol:.17}],80) },
  bad(){ this.tone({f:260,f2:150,d:.22,type:'sine',vol:.16}); this.tone({f:196,f2:130,d:.24,type:'triangle',vol:.1}) },
  hit(){ this.noise({freq:700,d:.14,vol:.16}); this.tone({f:180,f2:70,d:.16,type:'sawtooth',vol:.14}) },
  kill(){ this.tone({f:420,f2:120,d:.18,type:'square',vol:.14}); this.noise({freq:1600,hp:true,d:.16,vol:.1}) },
  shard(){ this.seq([{f:900,d:.1,type:'sine',vol:.14},{f:1350,d:.1,type:'sine',vol:.13},{f:1800,d:.26,type:'sine',vol:.12}],70) },
  heal(){ this.seq([{f:660,d:.12,type:'sine',vol:.14},{f:880,d:.2,type:'sine',vol:.14}],90) },
  bossHit(){ this.tone({f:110,f2:55,d:.4,type:'sawtooth',vol:.18}); this.noise({freq:400,d:.3,vol:.14}) },
  boss(){ this.tone({f:90,f2:60,d:.7,type:'sawtooth',vol:.2}) },
  win(){ this.seq([{f:523,d:.16,type:'triangle',vol:.18},{f:659,d:.16,type:'triangle',vol:.18},
                   {f:784,d:.16,type:'triangle',vol:.18},{f:1047,d:.4,type:'triangle',vol:.2}],110) },
  lose(){ this.seq([{f:392,d:.24,type:'triangle',vol:.16},{f:330,d:.24,type:'triangle',vol:.16},{f:262,d:.5,type:'triangle',vol:.16}],200) },
  beep(f=440,d=.09,type='square',vol=.14,slide=0){ this.tone({f,f2:slide?f+slide:0,d,type,vol}) }
};
const VOLS={off:0,low:.35,mid:.7,high:1};

/* ---- procedural background music: one theme per world, faster minor theme for bosses ---- */
const MTHEMES=[
 {root:57,scale:[0,2,4,5,7,9,11],prog:[0,3,4,3],tempo:104,wave:'triangle'},   // Green Forest
 {root:53,scale:[0,2,3,5,7,8,10],prog:[0,5,3,4],tempo:88 ,wave:'sine'},       // Crystal Caves
 {root:57,scale:[0,1,4,5,7,8,10],prog:[0,4,0,5],tempo:110,wave:'square'},     // Desert Kingdom
 {root:60,scale:[0,2,4,7,9,11,5],prog:[0,4,5,3],tempo:96 ,wave:'sine'},       // Snow Mountains
 {root:55,scale:[0,2,4,5,7,9,10],prog:[0,3,5,4],tempo:118,wave:'triangle'},   // Pirate Islands
 {root:52,scale:[0,2,3,5,7,9,10],prog:[0,5,3,5],tempo:126,wave:'square'},     // Mechanical City
 {root:50,scale:[0,1,3,5,7,8,10],prog:[0,5,4,3],tempo:84 ,wave:'triangle'},   // Haunted Castle
 {root:48,scale:[0,1,4,5,6,8,10],prog:[0,4,3,5],tempo:120,wave:'sawtooth'},   // Volcano Realm
 {root:62,scale:[0,2,4,6,7,9,11],prog:[0,3,4,5],tempo:92 ,wave:'sine'},       // Sky Islands
 {root:47,scale:[0,1,3,5,6,8,10],prog:[0,5,3,4],tempo:112,wave:'sawtooth'}    // Dark Kingdom
];
const Music={
  timer:null, step:0, next:0, theme:null, boss:false, playing:false,
  midi(n){ return 440*Math.pow(2,(n-69)/12) },
  note(deg,oct){ const sc=this.theme.scale, i=((deg%sc.length)+sc.length)%sc.length;
    const o=Math.floor(deg/sc.length)+(oct||0); return this.theme.root+sc[i]+o*12 },
  start(worldId,boss){
    if(!S.settings.music) return;
    Snd.init(); if(!Snd.ctx) return;
    this.theme={...MTHEMES[worldId%MTHEMES.length]}; this.boss=!!boss;
    if(boss){ this.theme.tempo=Math.round(this.theme.tempo*1.22); this.theme.wave='sawtooth'; }
    this.step=0; this.next=Snd.ctx.currentTime+.1; this.playing=true;
    clearInterval(this.timer); this.timer=setInterval(()=>this.tick(),70);
  },
  stop(){ this.playing=false; clearInterval(this.timer); this.timer=null; },
  tick(){
    if(!this.playing||!Snd.ctx) return;
    const spb=60/this.theme.tempo/4;                       // one 16th note
    if(this.next<Snd.ctx.currentTime) this.next=Snd.ctx.currentTime+.05;   // after a stall, restart from now
    let guard=0;
    while(this.next<Snd.ctx.currentTime+.35&&guard++<16){ this.play(this.step,this.next); this.step++; this.next+=spb }
  },
  play(step,t){
    const T=this.theme, bar=Math.floor(step/16)%T.prog.length, root=T.prog[bar], s=step%16;
    const V=.9;
    if(s===0||s===8) Snd.tone({music:true,f:this.midi(this.note(root,-2)),f2:this.midi(this.note(root,-2))*.99,d:.5,type:'triangle',vol:.16*V,when:t});
    if(s%2===0){ const arp=[0,2,4,2][(step/2)%4|0];
      Snd.tone({music:true,f:this.midi(this.note(root+arp,0)),d:.13,type:T.wave,vol:.07*V,when:t}); }
    if(this.boss? (s===4||s===12||s===14) : (s===6||s===14)){
      const mel=[4,2,5,3,6,4,2,0][Math.floor(step/2)%8];
      Snd.tone({music:true,f:this.midi(this.note(root+mel,1)),d:.22,type:'sine',vol:.06*V,when:t}); }
    if(s%4===0) Snd.noise({music:true,freq:180,d:.1,vol:.09*V,when:t});                 // kick
    if(s%4===2||(this.boss&&s%2===1)) Snd.noise({music:true,freq:6000,hp:true,d:.03,vol:.03*V,when:t}); // hat
  }
};
let speakT=null;
function speak(text){
  if(!('speechSynthesis' in window)) return;
  try{
    clearTimeout(speakT); speechSynthesis.cancel();
    /* a tiny delay after cancel() keeps Chrome's speech thread from locking up on rapid replays */
    speakT=setTimeout(()=>{ try{
      const u=new SpeechSynthesisUtterance(text); u.lang='en-US'; u.rate=.85;
      speechSynthesis.resume(); speechSynthesis.speak(u);
    }catch(e){} },70);
  }catch(e){}
}
