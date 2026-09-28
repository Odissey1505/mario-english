/* Playable characters and their sprite sheets. A hero either points at a sheet in SHEETS
   (optionally recoloured with `hue`) or is the plain vector fallback.
   Data only — nothing here runs. The sheets are fetched by loadHeroSheets() in src/render.js,
   which main.js calls once every file is loaded. */
const HERO_SHEETS={classic:'assets/hero-classic.png', sensei:'assets/hero-sensei.png'};
const SENSEI_META={"run0": [2, 2, 77, 94, 38.7, 93.0], "run1": [149, 2, 86, 91, 34.9, 90.0], "run2": [296, 2, 79, 91, 36.2, 90.0], "run3": [443, 2, 77, 93, 39.7, 92.0], "run4": [2, 102, 72, 93, 29.4, 92.0], "idle": [149, 102, 67, 95, 31.7, 94.0], "stand": [296, 102, 73, 95, 32.4, 94.0], "crouch": [443, 102, 76, 96, 35.0, 95.0], "jump": [2, 202, 81, 84, 24.0, 83.0], "fall": [149, 202, 95, 93, 36.6, 92.0], "attack": [296, 202, 143, 74, 35.6, 73.0], "hurt": [443, 202, 65, 76, 34.9, 75.0], "think": [2, 302, 60, 76, 28.9, 75.0], "down": [149, 302, 73, 51, 35.5, 50.0]};
const HERO_META={"run0": [2, 2, 75, 99, 40.8, 98.0], "run1": [167, 2, 71, 99, 37.3, 98.0], "run2": [332, 2, 70, 99, 37.9, 98.0], "run3": [497, 2, 69, 99, 37.4, 98.0], "run4": [2, 109, 70, 98, 36.7, 97.0], "jump": [167, 109, 62, 93, 28.3, 92.0], "fall": [332, 109, 62, 90, 32.1, 89.0], "crouch": [497, 109, 71, 88, 36.3, 87.0], "attack": [2, 216, 161, 103, 35.6, 102.0], "hurt": [167, 216, 78, 97, 31.2, 96.0], "idle": [332, 216, 76, 88, 32.6, 87.0], "stand": [497, 216, 70, 102, 36.2, 101.0]};
/* Every drawn character lives here. A hero either points at one of these sheets or is the
   plain vector fallback; `targetH` is how tall it stands on screen, and the scale is worked
   out from its own idle frame so sheets drawn at different sizes still match. */
const SHEETS={
  classic:{src:HERO_SHEETS.classic, meta:HERO_META,   targetH:60, img:null, ok:false, s:1},
  sensei :{src:HERO_SHEETS.sensei,  meta:SENSEI_META, targetH:66, img:null, ok:false, s:1}
};
const HERO=SHEETS.classic;                    /* kept as a name for the original sheet */
/* ---------- characters you can play as ----------
   One drawn sprite sheet, recoloured: only the armour's blue pixels are hue-rotated, so the
   hair, skin and scarf stay as drawn. Slots are ready for real artwork — give a hero a `sheet`
   URL later and it will be used instead of a recolour. */
const HEROES=[
  {id:'azure', n:'Azure',  hue:0,    d:'The original wanderer in blue.'},
  {id:'ember', n:'Ember',  hue:140,  d:'Crimson armour, forged in the volcano.'},
  {id:'moss',  n:'Moss',   hue:-95,  d:'Green plate from the deep forest.'},
  {id:'dusk',  n:'Dusk',   hue:60,   d:'Violet steel of the night watch.'},
  {id:'sand',  n:'Sand',   hue:-175, d:'Amber gear of the desert scouts.'},
  {id:'frost', n:'Frost',  hue:-35,  d:'Pale cyan armour from the snow peaks.'},
  {id:'sensei',n:'Sensei', sheet:'sensei', mentor:true,
   d:'The old master of the Crystal. Meant for the teacher in a shared game — everyone can see at a glance who is leading.'},
  {id:'spark', n:'Classic',vector:true, d:'The simple vector hero from the first build.'}
];
const AVATARS=['🦊','🐼','🐲','🦉','🐙','🦄','🐝','🦁','🐧','🦖','🐢','🦇','⭐','🔮','⚔️','🍀','🎧','🚀'];
