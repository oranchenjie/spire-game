#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import re, subprocess, os, sys
sys.stdout = open(sys.stdout.fileno(), 'w', encoding='utf-8', buffering=1)

with open('card.html', 'r', encoding='utf-8') as f:
    text = f.read()

changes = []
insert_idx = text.find("// ---- Creative Neutral Cards ----")

cards = """

// ---- 意图反应卡牌 ----

addCard({id:'readAndCounter',name:'见招拆招',c:1,type:'attack',rarity:'uncommon',target:'enemy',
  desc:'9伤;若敌本回攻击过+敌攻击力伤',
  uDesc:'14伤;若敌本回攻击过+敌攻击力x2伤',
  f:(g,en,c)=>{const e=en[0];if(!e)return;var bonus=0;
    if(e.ci&&e.ci.t==='a'){bonus=e.ci.sD||0;if(c.u)bonus+=e.ci.sD||0;}
    if(e.ci&&e.ci.t==='m'){bonus=(e.ci.sD||0)+(c.u?e.ci.sD||0:0);}
    dmgEnemy(e,(c.u?14:9)+bonus,g);addLog('ReadCounter:'+((c.u?14:9)+bonus));}});

addCard({id:'tacticalDefense',name:'见招拆盾',c:1,type:'skill',rarity:'common',target:'self',
  desc:'每个攻击过的敌+4甲',
  uDesc:'每个攻击过的敌+6甲+抽1',
  f:(g,_,c)=>{var n=0;g.enemies.forEach(function(e){if(e.ci&&(e.ci.t==='a'||e.ci.t==='m'))n++;});
    g.block+=n*(c.u?6:4);if(c.u)drawCards(1);addLog('TacticalDef:'+n+'x'+(c.u?6:4));}});

addCard({id:'aftermathStrike',name:'后发制人',c:0,type:'attack',rarity:'uncommon',target:'enemy',
  desc:'7伤;敌本回若未攻击+4伤',
  uDesc:'11伤;敌本回若未攻击+7伤',
  f:(g,en,c)=>{const e=en[0];if(!e)return;
    var bonus=(e.ci&&(e.ci.t==='a'||e.ci.t==='m'))?0:(c.u?7:4);
    dmgEnemy(e,(c.u?11:7)+bonus,g);addLog('Aftermath:'+((c.u?11:7)+bonus));}});

addCard({id:'battleInsight',name:'洞察先机',c:0,type:'skill',rarity:'rare',target:'self',
  desc:'看1敌下回意图;若攻击+6甲;若防御+2能;消耗',
  uDesc:'看1敌下回意图;若攻击+10甲;若防御+3能+抽1;消耗',
  f:(g,_,c)=>{if(!g.enemies.length)return;
    var e=g.enemies.filter(function(x){return x.hp>0;})[0];
    var nextMv=e.mv?e.mv[(e.mi)%e.mv.length]:null;
    if(nextMv){
      if(nextMv.t==='a'||nextMv.t==='m'){g.block+=c.u?10:6;addLog('Insight:attack+block');}
      else if(nextMv.t==='d'){g.energy=Math.min(g.maxEnergy+(c.u?3:2),g.energy+(c.u?3:2));if(c.u)drawCards(1);addLog('Insight:defense+energy');}
      else{g.block+=3;addLog('Insight:other+3block');}
    }else{g.block+=3;}
    if(nextMv&&nextMv.d!==undefined){addLog('Next hit:'+nextMv.d);}},ex:true});
"""

text = text[:insert_idx] + cards + text[insert_idx:]
changes.append('Intent cards inserted')

# Preview IDs
ids_start = text.find('var _ids=["')
ids_end = text.find('];', ids_start)
for nid in ['readAndCounter','tacticalDefense','aftermathStrike','battleInsight']:
    if f'"{nid}"' not in text[ids_start:ids_end]:
        text = text[:ids_end] + f',"{nid}"' + text[ids_end:]
        ids_end += len(nid) + 3
changes.append('preview IDs added')

m = re.search(r'<script>(.*?)</script>', text, re.DOTALL)
if m:
    with open('_c.js','w',encoding='utf-8') as f: f.write(m.group(1))
    r = subprocess.run(['node','--check','_c.js'], capture_output=True)
    if r.returncode==0:
        changes.append('JS OK')
    else:
        print('JS ERR:', r.stderr.decode('utf-8',errors='replace')[:300])
    os.remove('_c.js')

with open('card.html', 'w', encoding='utf-8') as f:
    f.write(text)

for c in changes:
    print(f'  {c}')
PYEOF
