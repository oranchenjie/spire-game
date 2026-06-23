#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import re, subprocess, os

with open('card.html', 'r', encoding='utf-8') as f:
    text = f.read()

changes = []

# Remove wisdomCrown relic line
idx = text.find("id:'wisdomCrown'")
if idx > 0:
    line_start = text.rfind('\n', 0, idx)
    line_end = text.find('\n', idx)
    text = text[:line_start] + text[line_end:]
    changes.append('removed wisdomCrown relic')

# Remove insight from combat reset
text = text.replace("'_insight','_insightMax',", '')
changes.append('cleaned combat reset')

# Simplify universalInsight card
idx = text.find("id:'universalInsight'")
if idx > 0:
    start = text.rfind('\n', 0, idx)
    end = text.find('});', idx) + 3
    new = '\naddCard({id:"universalInsight",name:"洞悉万象",c:1,type:"power",rarity:"rare",target:"self",desc:"能力:获得1个副职业;回合始+3甲",uDesc:"能力:获得1个副职业;回合始+6甲+抽1",f:(g,_,c)=>{if(!G._secondClassPick)pickSecondClass();G.universalInsight=c.u?1:0;G._uiArmor=c.u?6:3;addLog("\U0001f52e 洞悉万象:副职业已开启");}});'
    text = text[:start] + new + text[start+len(text[start:end]):]
    changes.append('simplified universalInsight card')

# Remove wellRead card
idx = text.find("id:'wellRead'")
if idx > 0:
    start = text.rfind('\n', 0, idx)
    end = text.find('});', idx) + 3
    text = text[:start] + '' + text[end:]
    changes.append('removed wellRead card')

# Remove oneInAll card
idx = text.find("id:'oneInAll'")
if idx > 0:
    start = text.rfind('\n', 0, idx)
    end = text.find('});', idx) + 3
    end2 = text.find('},ex:true});', idx) + 13
    if end2 > start and end2 < start + 500:
        end = end2
    text = text[:start] + '' + text[end:]
    changes.append('removed oneInAll card')

# Remove wisdomCrown startCombat hook (find by surrounding ASCII)
text = text.replace("// 智慧冠冕: 战斗开始+2洞见", '')
hooks_removed = 0
while 'wisdomCrown' in text:
    idx = text.find('wisdomCrown')
    if idx < 0:
        break
    line_start = text.rfind('\n', 0, idx)
    line_end = text.find('\n', idx)
    if line_end < 0:
        line_end = len(text)
    # Remove the full line and preceding comment if it was on a separate line
    # Find the comment line too
    text = text[:line_start] + text[line_end:]
    hooks_removed += 1
changes.append(f'removed {hooks_removed} wisdomCrown hook lines')

# Remove insight cost reduction / startTurn hooks
for pat in ['// 洞见降费', '// 洞悉万象:每回合+洞见', '// 智慧冠冕:打异职业卡']:
    while pat in text:
        idx = text.find(pat)
        line_start = text.rfind('\n', 0, idx)
        line_end = text.find('\n', idx)
        text = text[:line_start] + text[line_end:]
changes.append('removed insight hook lines')

# Fix up double newlines
text = text.replace('\n\n\n', '\n\n')

# Clean preview IDs
for rid in [',"wellRead"', ',"oneInAll"']:
    text = text.replace(rid, '')
changes.append('cleaned preview IDs')

# Verify JS
m = re.search(r'<script>(.*?)</script>', text, re.DOTALL)
if m:
    with open('_c.js', 'w', encoding='utf-8') as f:
        f.write(m.group(1))
    r = subprocess.run(['node', '--check', '_c.js'], capture_output=True)
    if r.returncode == 0:
        changes.append('JS OK')
    else:
        err = r.stderr.decode('utf-8', errors='replace')[:500]
        print(f'JS Error: {err}')
        sys.exit(1)
    os.remove('_c.js')

with open('card.html', 'w', encoding='utf-8') as f:
    f.write(text)

for c in changes:
    print(f'  {c}')
print('\nDone!')
