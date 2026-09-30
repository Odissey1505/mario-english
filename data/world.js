/* Worlds, equipment, boosts, achievements and daily tasks. */
/* ---- Worlds, equipment, boosts, achievements ---- */
const WORLDS = [
 {id:0,n:'Green Forest',mission:'key',sky:['#2E6B4F','#8FD9A0'],ground:'#4B7A3A',plat:'#6B4A2A',acc:'#9BE87C',foes:['slime','bat','goblin'],boss:'Forest Guardian',theme:'forest'},
 {id:1,n:'Crystal Caves',mission:'shards',sky:['#1B2A55','#3E6FA8'],ground:'#2C3B6B',plat:'#4A5FA0',acc:'#7FE8FF',foes:['slime','bat','ghost'],boss:'Crystal Warden',theme:'cave'},
 {id:2,n:'Desert Kingdom',mission:'key',sky:['#B4692A','#F3C77B'],ground:'#C89A4E',plat:'#8B5E2B',acc:'#FFD98A',foes:['goblin','knight','mage'],boss:'Sand Vizier',theme:'desert'},
 {id:3,n:'Snow Mountains',mission:'shards',sky:['#4A6E9B','#D8ECFF'],ground:'#8FB4D4',plat:'#5C7FA5',acc:'#FFFFFF',foes:['slime','bat','golem'],boss:'Frost Titan',theme:'snow'},
 {id:4,n:'Pirate Islands',mission:'key',sky:['#12688F','#79D7E8'],ground:'#C8B27A',plat:'#7A5230',acc:'#FFE28A',foes:['goblin','knight','ghost'],boss:'Captain Kraken',theme:'pirate'},
 {id:5,n:'Mechanical City',mission:'shards',sky:['#38304F','#8C7FB8'],ground:'#4B4463',plat:'#6E6488',acc:'#FFB84A',foes:['knight','mage','golem'],boss:'Steam Colossus',theme:'city'},
 {id:6,n:'Haunted Castle',mission:'key',sky:['#2A1B3D','#6B4E8C'],ground:'#3A2A50',plat:'#54406E',acc:'#C8A2FF',foes:['ghost','bat','knight'],boss:'Lord of Whispers',theme:'castle'},
 {id:7,n:'Volcano Realm',mission:'shards',sky:['#5C1B14','#E2703A'],ground:'#6E2B1E',plat:'#94422A',acc:'#FF9247',foes:['golem','mage','knight'],boss:'Magma Serpent',theme:'volcano'},
 {id:8,n:'Sky Islands',mission:'key',sky:['#3E6BB8','#CBE4FF'],ground:'#7FA8D8',plat:'#9C7FD4',acc:'#FFF3A0',foes:['bat','ghost','mage'],boss:'Storm Sentinel',theme:'sky'},
 {id:9,n:'Dark Kingdom',mission:'shards',sky:['#170F2E','#4B2C6B'],ground:'#241A44',plat:'#3E2E6B',acc:'#FF5C7A',foes:['golem','knight','mage','ghost'],boss:'The Word Eater',theme:'dark'}
];

const GEAR = [
 {id:'sword-wood',slot:'weapon',ic:'🗡️',n:'Wooden Sword',d:'Your starting weapon. No bonus, always with you.',price:0},
 {id:'sword-silver',slot:'weapon',ic:'⚔️',n:'Silver Sword',d:'40% chance of double damage to strong monsters.',price:180},
 {id:'sword-magic',slot:'weapon',ic:'🔮',n:'Magic Sword',d:'Once per level it defeats a weak monster instantly.',price:420},
 {id:'helm-know',slot:'helmet',ic:'🎩',n:'Helmet of Knowledge',d:'One free 50/50 hint per level.',price:150},
 {id:'helm-guard',slot:'helmet',ic:'🪖',n:'Guard Helmet',d:'Forgives one wrong answer per level.',price:260},
 {id:'boots-speed',slot:'boots',ic:'👟',n:'Boots of Speed',d:'You run 25% faster.',price:140},
 {id:'boots-jump',slot:'boots',ic:'🥾',n:'Boots of Jumping',d:'You jump higher.',price:200},
 {id:'amu-magnet',slot:'amulet',ic:'🧲',n:'Magnet Amulet',d:'Pulls nearby coins towards you.',price:170},
 {id:'amu-memory',slot:'amulet',ic:'📿',n:'Amulet of Memory',d:'Shows the words you got wrong more often.',price:230},
 {id:'amu-luck',slot:'amulet',ic:'🍀',n:'Lucky Coin',d:'+50% chance of a bonus reward from a block.',price:300}
];

const BOOSTS = {
 shield:{ic:'🛡️',n:'Shield',d:'Ignores one wrong answer.',price:40},
 second:{ic:'🔄',n:'Second Chance',d:'Forgives one wrong answer: no damage and no freeze. Tap it before you answer.',price:35},
 fifty:{ic:'✂️',n:'Fifty-Fifty',d:'Removes wrong options.',price:30},
 dictionary:{ic:'📗',n:'Dictionary',d:'Gives an extra clue about the word.',price:25},
 time:{ic:'⏳',n:'Time Freeze',d:'Stops the question timer.',price:30},
 coins:{ic:'💰',n:'Double Coins',d:'Doubles your next reward.',price:45},
 skip:{ic:'💨',n:'Monster Skip',d:'Skips one normal monster.',price:50},
 grammar:{ic:'📖',n:'Grammar Book',d:'Shows a short rule before you answer.',price:35}
};

const ACHS = [
 {id:'first',n:'First Step',d:'Finish your first level',c:s=>s.levels>=1,r:50},
 {id:'coin100',n:'Coin Collector',d:'Collect 100 coins in total',c:s=>s.totalCoins>=100,r:60},
 {id:'coin1000',n:'Coin Master',d:'Collect 1000 coins in total',c:s=>s.totalCoins>=1000,r:200},
 {id:'voc50',n:'Vocabulary Beginner',d:'50 correct vocabulary answers',c:s=>s.vocOk>=50,r:80},
 {id:'voc500',n:'Word Expert',d:'500 correct vocabulary answers',c:s=>s.vocOk>=500,r:300},
 {id:'mon100',n:'Grammar Warrior',d:'Defeat 100 monsters',c:s=>s.monsters>=100,r:150},
 {id:'boss5',n:'Boss Hunter',d:'Defeat 5 bosses',c:s=>s.bosses>=5,r:180},
 {id:'perfect',n:'Perfect Run',d:'Finish a level with no mistakes',c:s=>s.perfect>=1,r:120},
 {id:'streak20',n:'Fast Learner',d:'20 correct answers in a row',c:s=>s.bestStreak>=20,r:100},
 {id:'quests10',n:'Well Diver',d:'Complete 10 mini-quests',c:s=>s.quests>=10,r:120},
 {id:'secrets10',n:'Explorer',d:'Find 10 secrets',c:s=>s.secrets>=10,r:120},
 {id:'comeback',n:'Comeback',d:'Finish a level with one heart left',c:s=>s.comeback>=1,r:140},
 {id:'nohelp',n:'No Help Needed',d:'Finish a Hard level without boosts',c:s=>s.noHelpHard>=1,r:250},
 {id:'stars15',n:'Star Seeker',d:'Collect 15 stars',c:s=>s.stars>=15,r:200}
];

const DAILY_POOL = [
 {id:'d-voc',n:'Answer 20 vocabulary questions',goal:20,r:40},
 {id:'d-mon',n:'Defeat 10 monsters',goal:10,r:40},
 {id:'d-quest',n:'Complete 1 mini-quest',goal:1,r:30},
 {id:'d-coin',n:'Collect 100 coins',goal:100,r:50},
 {id:'d-rev',n:'Review 10 difficult words',goal:10,r:45}
];
