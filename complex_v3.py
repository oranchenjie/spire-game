#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""混沌潮汐v3 - 更多复杂度"""

import sys, io, re, subprocess, os
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

with open('card.html', 'rb') as f:
    data = f.read()

# ============================================================
# 1. Add echoes to save/load
# ============================================================
old = b"tideLevel:G._tideLevel||0,tidePlayed:G._tidePlayed||0,tidePhase:G._tidePhase||0,tidePool:G._tidePool||0,"
new = b"tideLevel:G._tideLevel||0,tidePlayed:G._tidePlayed||0,tidePhase:G._tidePhase||0,tidePool:G._tidePool||0,tideEchoes:G._tideEchoes||0,"
if old in data:
    data = data.replace(old, new)
    print("Save: +tideEchoes")
else:
    print("Save not found")

old = b"G._tideLevel=data.tideLevel||0;G._tidePlayed=data.tidePlayed||0;G._tidePhase=data.tidePhase||0;G._tidePool=data.tidePool||0;G._geneticLvl=data.ga||0;"
new = b"G._tideLevel=data.tideLevel||0;G._tidePlayed=data.tidePlayed||0;G._tidePhase=data.tidePhase||0;G._tidePool=data.tidePool||0;G._tideEchoes=data.tideEchoes||0;G._geneticLvl=data.ga||0;"
if old in data:
    data = data.replace(old, new)
    print("Load: +tideEchoes")
else:
    print("Load not found")

# Add echoes to combat reset
old = b"'_tidePlayed','_tidePhase','_tidePool','_tideFinished'"
new = b"'_tidePlayed','_tidePhase','_tidePool','_tideEchoes','_tideEchoFlow','_tideEchoForce','_tideEchoTime','_tideFinished'"
if old in data:
    data = data.replace(old, new)
    print("Reset: +echo vars")
else:
    print("Reset not found")

# ============================================================
# 2. Add deep current & echo activation in playCard hook
# ============================================================
# Find the tide pool hook
old = b"if(G.hand.some(function(x){var _xd=def(x);return _xd&&_xd.id==='chaosTide';})){G._tidePool=(G._tidePool||0)+1;}"
new = b"var _ctInHand=G.hand.some(function(x){var _xd=def(x);return _xd&&_xd.id==='chaosTide';});if(_ctInHand){G._tidePool=(G._tidePool||0)+1;var _ctLv=G._tideLevel||0;if(_ctLv>=3)G._tideDeep=_ctLv;}"
if old in data:
    data = data.replace(old, new)
    print("PlayCard: +deep current tracking")
else:
    print("PlayCard hook not found")

# ============================================================
# 3. Add deep current damage in dmgEnemy
# ============================================================
# Find where strength damage is added in dmgEnemy
old = b"var rawStr=g.strength||0;var cappedStr=rawStr;"
new = b"var rawStr=g.strength||0;var cappedStr=rawStr;if(g._tideDeep>0&&!g._orbDmg){g._tideStrBonus=Math.floor(g._tideDeep/3);d+=g._tideStrBonus;}"
if old in data:
    data = data.replace(old, new, 1)
    print("DmgEnemy: +deep current damage")
else:
    print("DmgEnemy not found")

# ============================================================
# 4. Replace chaosTide card with v3
# ============================================================
idx = data.find(b"addCard({id:'chaosTide'")
end = data.find(b"addCard({id:'tideSurge'", idx)

new_card_data = """addCard({id:'chaosTide',name:'混沌潮汐',c:2,type:'attack',rarity:'rare',target:'all',in:true,iu:true,
cP:function(g){return g.hand.length>1&&g.energy>=(((g._tidePlayed||0)+2));},
desc:'[固有]战起上手|[基础费]2能+随机消耗1牌+本回每多打1次+1能|[潮汐]Lv+1(上10跨战保满-5)|[相位]0涌Lv|1回Lv/2+抽1+1能|2怒Lv+3+Lv×3甲+双交+费+1|[回响]前牌:攻→交×1.5|技→+Lv×3甲|能→1能+抽1|[潮池]持牌期每1牌+1池,池×Lv全伤|[交叉]每1其他攻+Lv全伤|[溢满]Lv>=5→[涌]+1能|[满潮]Lv=10→全10毒+10刺+抽5+Lv-5|[暗流]持牌期每攻击+Lv/3伤|[回响]Lv3解锁:每回合首技能-1费|Lv6解锁:每回合首攻+3伤|Lv9解锁:回合始抽1|[过载]费后能≤0追:涌+6甲|回+1能|怒全5伤',
uDesc:'[固有]上手|[费用]2能+消1牌+本回每多1+1能|[潮汐]Lv+1(上10)|[相位]0:Lv+1|1:Lv/2抽2+1能|2:Lv+3+Lv×3甲+双交+费+1|[回响]攻→交×2|技→+Lv×4甲|能→1能+抽2|[潮池]池×(Lv+1)全伤|[交叉]每1攻+Lv×2全伤|[溢满]Lv>=4→[涌]+2能(每3多1)|[满潮]Lv=10→全15毒+15刺+抽6+Lv-5|[暗流]+Lv/3攻伤|[回响]Lv3:首技-1|Lv6:首攻+4|Lv9:回始抽1|[过载]能≤0:涌+9甲|回+2能|怒全8伤',
f:function(g,en,c){
  if(g._tideLevel===undefined)g._tideLevel=0;
  // === 费用 ===
  var extra=g._tidePlayed||0;
  g.energy-=extra;
  if(g.hand.length>0){var _ci=Math.floor(Math.random()*g.hand.length);g.exhaust.push(g.hand.splice(_ci,1)[0]);if(g.fnp>0)g.block+=g.fnp;}
  g._tidePlayed=(g._tidePlayed||0)+1;
  var afterCost=g.energy;
  // === 相位 ===
  if(g._tidePhase===undefined)g._tidePhase=0;
  var ph=g._tidePhase;g._tidePhase=(ph+1)%3;
  // === Lv升级 ===
  if(c.u&&g._tideLevel<1)g._tideLevel=1;
  var b=c.u?1:0;
  g._tideLevel=Math.min(10,(g._tideLevel||0)+1);
  var t=g._tideLevel;
  // === 潮汐回响(Lv3/6/9解锁) ===
  if(g._tideEchoes===undefined)g._tideEchoes=0;
  if(t>=3&&!(g._tideEchoes&1)){g._tideEchoes|=1;g._tideEchoFlow=true;g.block+=4;addFX(480,180,'🔊回响·流:首技-1费','#4DD0E1');addLog('🔊 潮汐回响[流]:首技能-1费');}
  if(t>=6&&!(g._tideEchoes&2)){g._tideEchoes|=2;g._tideEchoForce=(c.u?4:3);addFX(480,160,'🔊回响·力:首攻+'+((c.u?4:3))+'伤','#FF6B6B');addLog('🔊 潮汐回响[力]:首攻+'+((c.u?4:3))+'伤');}
  if(t>=9&&!(g._tideEchoes&4)){g._tideEchoes|=4;g._tideEchoTime=1;addFX(480,140,'🔊回响·时:回合始抽1','#FFD700');addLog('🔊 潮汐回响[时]:回合始抽1');}
  // === 基础 ===
  var dm=t+b,bk=t+b,pn='🌊';
  if(ph===1){dm=Math.max(1,Math.floor(t/2));bk=Math.floor(t/2);pn='🔄';g.energy=Math.min(g.maxEnergy+1,g.energy+1);drawCards(1);}
  else if(ph===2){dm=t+3+b;bk=(t+b)*3;pn='🌪️';if(g.energy>0){g.energy--;extra++;}}
  en.forEach(function(e){if(e.hp>0)dmgEnemy(e,dm,g);});
  g.block+=bk;
  // === 过载(费用后能量≤0) ===
  if(afterCost<=0){g._tideOverload=true;
    if(ph===0){g.block+=c.u?9:6;addFX(480,220,'⚡过载·涌+'+((c.u?9:6))+'甲','#4DD0E1');}
    else if(ph===1){g.energy=Math.min(g.maxEnergy+1,g.energy+1);addFX(480,220,'⚡过载·回+1能','#FFB74D');}
    else if(ph===2){var _od=c.u?8:5;en.forEach(function(e){if(e.hp>0)dmgEnemy(e,_od,g);});addFX(480,220,'⚡过载·怒全'+_od+'伤','#FF6B6B');}
    addLog('⚡ 过载触发!相位'+ph);
  }
  // === 回响 ===
  var lt=g._prevCardType||'';
  if(lt==='attack'){var eb=c.u?2:1.5;var oa=(g._attacksThisTurn||0)+(c.u?1:0);
    var xd=c.u?Math.floor(oa*t*2*eb):Math.floor(oa*t*eb);var ch=(ph===2)?2:1;
    for(var _cx=0;_cx<ch;_cx++){if(xd>0&&xd!==t){en.forEach(function(e){if(e.hp>0)dmgEnemy(e,xd,g);});}}}
  else if(lt==='skill'){var eb2=t*(c.u?4:3);g.block+=eb2;}
  else if(lt==='power'){g.energy=Math.min(g.maxEnergy+1,g.energy+1);drawCards(c.u?2:1);}
  // === 潮池 ===
  var pool=g._tidePool||0;
  if(pool>0){var pd=pool*(c.u?t+1:t);en.forEach(function(e){if(e.hp>0)dmgEnemy(e,pd,g);});
    addFX(480,120,'💦池'+pool+'x'+t+'=+'+pd,'#00BCD4');addLog('💦 潮池:'+pool+'乘'+t+'='+pd+'全伤');}
  g._tidePool=0;g._tideDeep=0;
  // === 溢满 ===
  if(t>=(c.u?4:5)){var sc=Math.floor(t/(c.u?3:4))+1;
    for(var _si=0;_si<sc;_si++){g.hand.push({...M.tideSurge,id:'tideSurge_'+Date.now()+'_'+_si,u:c.u?1:0});}
    g.energy=Math.min(g.maxEnergy+(c.u?2:1),g.energy+(c.u?2:1));}
  // === 满潮 ===
  if(t>=10){var fp=c.u?15:10,ft=c.u?15:10,fd=c.u?6:5;
    en.forEach(function(e){if(e.hp>0){e.poison=(e.poison||0)+fp;capPoison(e);}});
    g.thorns=(g.thorns||0)+ft;drawCards(fd);g._tideLevel=Math.max(0,(g._tideLevel||0)-5);}
  g._attacksThisTurn=(g._attacksThisTurn||0)+1;
  addFX(480,200,pn+'Lv'+t+':'+dm+'伤'+bk+'甲','#4DD0E1');
  addLog('🌊 潮汐:'+pn+'Lv'+t+' '+dm+'+'+bk+'甲+费'+extra+'+1牌');
}});"""

data = data[:idx] + new_card_data.encode('utf-8') + data[end:]

with open('card.html', 'wb') as f:
    f.write(data)

m = re.search(rb'<script>(.*?)</script>', data, re.DOTALL)
with open('_tc.js', 'wb') as out:
    out.write(m.group(1))
r = subprocess.run(['node', '--check', '_tc.js'], capture_output=True, text=True)
print("JS OK" if r.returncode == 0 else f"Error: {r.stderr[:150]}")
os.remove('_tc.js')
PYEOF
