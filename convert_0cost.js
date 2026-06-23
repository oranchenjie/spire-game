const fs = require('fs');
let s = fs.readFileSync('C:/Users/25065/Desktop/AI game/card.html', 'utf8');

// Cards to convert from 0 to 1 cost
const ids = [
  'backstab','bargain','battleTrance','bootSequence','borrowedTime',
  'brutality','burnBoats','claw','classShift','cosmicTide','crossFertilize',
  'curiosity','dangerSense','desperate','doubleEdge','echoOther','emptyFort',
  'energyConvert','energySurge','fightInstinct','fission','forgeSacrifice',
  'forgeStar','ftl','ghostShroud','ghostWalk','goForTheEyes','hauntedSmirk',
  'knowledgePower','lastStand','lastStandSGS','loanStrike','luckyStar',
  'markup','meditateSimple','memoryShard','nimble','overcharge','overdraw',
  'panache','pawn','plasmaRush','poisonDagger','pursuit','rage',
  'repulseBounce','riskInvestment','shivRecall','spinningEdge','starBlade',
  'starVoid','starVortex','steamBurst','steamTurbine','steamVent','tideFlow',
  'tideSense','tideSurge','voidBolt','voidDrain','voidSurge','voidWarp',
  'waitAndSee','weakStrike','wellLaidPlans','windDance','bloodRitual',
  'servantPower','mirrorShard','soulBargain','energyTorrent'
];

let count = 0;
ids.forEach(function(id) {
  const pattern = "addCard({id:'" + id + "',name:'";
  const idx = s.indexOf(pattern);
  if (idx >= 0) {
    // Find the c:0, part within this card definition
    const cardEnd = s.indexOf("},", idx);
    const cardDef = s.substring(idx, cardEnd);
    if (cardDef.includes(",c:0,")) {
      const before = s.substring(0, idx);
      const after = s.substring(idx);
      const newAfter = after.replace(",c:0,", ",c:1,");
      s = before + newAfter;
      count++;
    }
  }
});

// Also check for c:0 without trailing comma (at end of definition)
ids.forEach(function(id) {
  const pattern = "addCard({id:'" + id + "',name:'";
  let idx = s.indexOf(pattern);
  // Handle case where replacement shifted positions
  while (idx >= 0) {
    const cardEnd = s.indexOf("}", idx);
    const cardDef = s.substring(idx, Math.min(cardEnd + 1, idx + 200));
    if (cardDef.includes(",c:0,")) {
      const before = s.substring(0, idx);
      const after = s.substring(idx);
      const newAfter = after.replace(",c:0,", ",c:1,");
      s = before + newAfter;
      count++;
      idx = s.indexOf(pattern, idx + 1);
    } else {
      break;
    }
  }
});

console.log('Converted ' + count + ' cards');

fs.writeFileSync('C:/Users/25065/Desktop/AI game/card.html', s, 'utf8');
const m = s.match(/<script>([\s\S]*?)<\/script>/);
try { new Function(m[1]); console.log('Syntax: ✓'); } catch(e) { console.log('ERROR: ' + e.message); }

// Count remaining 0-cost
const re = /addCard\(\{id:'([^']+)',name:'([^']+)',c:0,/g;
const unique = new Set();
let match;
while ((match = re.exec(s)) !== null) unique.add(match[1]);
const basics = new Set(['strike','defend']);
const zero = [...unique].filter(id => !basics.has(id));
console.log('Remaining 0-cost cards: ' + zero.length);
zero.sort().forEach(id => console.log('  ' + id));
