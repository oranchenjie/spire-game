# -*- coding: utf-8 -*-
import sys, re
sys.stdout = open(sys.stdout.fileno(), mode='w', encoding='utf-8', buffering=1)

with open('card.html','r',encoding='utf-8') as f:
    t = f.read()

changes = []
def apply(old, new, desc):
    global t
    if old in t:
        t = t.replace(old, new)
        changes.append(desc)
        return True
    return False

# ================================================================
# 1. CARD NERFS (overbuffed cards - pull back to reasonable)
# ================================================================

# GhostlyArmor: 12/16 is fine but let's keep it at 14/18 from earlier buff - wait, I already nerfed it to 12/16.
# Let me check what it is now and keep it.

# TrueGrit: already nerfed (removed +1 str)
# Clash: already nerfed to 13/17
# Flex: already nerfed to 3/5
# WildStrike: already nerfed to 15

# SeverSoul: 22/26 might be too high for a rare that also blocks
# Keep at 22/26 - it's fine for a rare

# ================================================================
# 2. BUFF WEAK COMMON ATTACKS (DPE < 7)
# ================================================================

# Rebound: 9/12 -> 11/14 (was worse than pommelStrike which is 9+draw)
# Let me check what rebound is now
# {id:'rebound',name:'弹回',c:1,...,desc:'9点伤害+回牌堆顶',uDesc:'12点伤害+回顶+抽1张牌'
# Compare to pommelStrike: 9+draw1 / 9+draw2. Rebound returns card to top which is often a downside.
# Buff: 9->10, 12->14
if not apply(
    "addCard({id:'rebound',name:'弹回',c:1,type:'attack',rarity:'common',target:'enemy',desc:'9点伤害+回牌堆顶',uDesc:'12点伤害+回顶+抽1张牌'}",
    "addCard({id:'rebound',name:'弹回',c:1,type:'attack',rarity:'common',target:'enemy',desc:'11点伤害+回牌堆顶',uDesc:'14点伤害+回顶+抽1张牌'",
    "rebound: 9->11/12->14"
): print("miss: rebound")

# Sweeping Beam: 6/9 AOE -> 7/10 AOE (base common AOE should be ~6-7)
if not apply(
    "addCard({id:'sweepingBeam',name:'扫射光束',c:1,type:'attack',rarity:'common',target:'all',desc:'对所有敌人造成6点伤害+抽1张牌',uDesc:'全9点伤害+抽1张牌+多敌回能'}",
    "addCard({id:'sweepingBeam',name:'扫射光束',c:1,type:'attack',rarity:'common',target:'all',desc:'对所有敌人造成7点伤害+抽1张牌',uDesc:'全10点伤害+抽1张牌+多敌回能'"
):
    print("miss: sweepingBeam")

# Beam Cell: 0 cost 4/7 damage + vulnerable - already good value
# Go For The Eyes: 0 cost 3/5 + conditional weak - too weak
if not apply(
    "addCard({id:'goForTheEyes',name:'瞄准眼睛',c:0,type:'attack',rarity:'common',target:'enemy',desc:'3点伤害;有球体则+1层虚弱',uDesc:'5点伤害;有球体则+2层虚弱'}",
    "addCard({id:'goForTheEyes',name:'瞄准眼睛',c:0,type:'attack',rarity:'common',target:'enemy',desc:'5点伤害;有球体则+1层虚弱',uDesc:'7点伤害;有球体则+2层虚弱'"
):
    print("miss: goForTheEyes")

# Melter: 10/14 + remove block -> 12/16
if not apply(
    "addCard({id:'melter',name:'熔毁',c:1,type:'attack',rarity:'uncommon',target:'enemy',desc:'10点伤害;移除敌人所有格挡',uDesc:'14点伤害;移除敌人所有格挡'}",
    "addCard({id:'melter',name:'熔毁',c:1,type:'attack',rarity:'uncommon',target:'enemy',desc:'12点伤害;移除敌人所有格挡',uDesc:'16点伤害;移除敌人所有格挡'"
):
    print("miss: melter")

# Streamline: 18/24 -> 20/26 (cost reduction on use)
if not apply(
    "addCard({id:'streamline',name:'精简',c:2,type:'attack',rarity:'common',target:'enemy',desc:'18点伤害;此后每用打击1次永久费用降低1点',uDesc:'24点伤害;此后每用打击1次费用降低1点'}",
    "addCard({id:'streamline',name:'精简',c:2,type:'attack',rarity:'common',target:'enemy',desc:'20点伤害;此后每用打击1次永久费用降低1点',uDesc:'26点伤害;此后每用打击1次费用降低1点'"
):
    print("miss: streamline")

# ================================================================
# 3. BUFF WEAK IRONCLAD CARDS
# ================================================================

# Second Wind: consume non-attacks, 5/7 block per card. Buff: 5->6, 7->8
if not apply(
    "addCard({id:'secondWind',name:'第二阵风',c:1,type:'skill',rarity:'uncommon',target:'self',desc:'消耗所有非攻击牌;每张得5点格挡',uDesc:'每张得7点格挡+回复1点能量'}",
    "addCard({id:'secondWind',name:'第二阵风',c:1,type:'skill',rarity:'uncommon',target:'self',desc:'消耗所有非攻击牌;每张得6点格挡',uDesc:'每张得8点格挡+回复1点能量'"
):
    print("miss: secondWind")

# Havoc: already buffed draw
# Power Through: 15/20 block + 2 wounds -> keep, wounds are punishing
# Let's buff: 15->18, 20->24
if not apply(
    "addCard({id:'powerThrough',name:'力量突破',c:1,type:'skill',rarity:'uncommon',target:'self',desc:'15点格挡;获得2张伤口',uDesc:'20点格挡;获得2张伤口'}",
    "addCard({id:'powerThrough',name:'力量突破',c:1,type:'skill',rarity:'uncommon',target:'self',desc:'18点格挡;获得2张伤口',uDesc:'24点格挡;获得2张伤口'"
):
    print("miss: powerThrough")

# Shockwave: 3/3 debuff all -> 4/4 all
if not apply(
    "desc:'对所有敌人造成3点层易伤+3层虚弱;消耗',uDesc:'对所有敌人造成5点层易伤+5层虚弱;消耗'",
    "desc:'对所有敌人造成4点层易伤+4层虚弱;消耗',uDesc:'对所有敌人造成6点层易伤+6层虚弱;消耗'"
):
    print("miss: shockwave")

# Juggernaut: 5/8 block-thorns -> 7/10
if not apply(
    "addCard({id:'juggernaut',name:'冲锋者',c:2,type:'power',rarity:'rare',target:'self',desc:'获得格挡时对敌人5点伤害',uDesc:'获得格挡时对敌人8+全1层虚弱'}",
    "addCard({id:'juggernaut',name:'冲锋者',c:2,type:'power',rarity:'rare',target:'self',desc:'获得格挡时对敌人7点伤害',uDesc:'获得格挡时对敌人10+全1层虚弱'"
):
    print("miss: juggernaut")

# Combust: 5/7 AOE + self-damage -> 7/9
if not apply(
    "addCard({id:'combust',name:'自燃',c:1,type:'power',rarity:'uncommon',target:'self',desc:'每回合合自伤1点并对所有敌人造成5点伤害',uDesc:'每回合合自伤1点并对所有敌人造成7点+全易伤'}",
    "addCard({id:'combust',name:'自燃',c:1,type:'power',rarity:'uncommon',target:'self',desc:'每回合合自伤1点并对所有敌人造成7点伤害',uDesc:'每回合合自伤1点并对所有敌人造成9点+全易伤'"
):
    print("miss: combust")

# Rampage: 8/12 +5 per use -> 9/13 +6 per use
if not apply(
    "addCard({id:'rampage',name:'狂怒',c:1,type:'attack',rarity:'uncommon',target:'enemy',desc:'8点伤害;每打一次+5(本场)',uDesc:'12点伤害;每打一次+5'}",
    "addCard({id:'rampage',name:'狂怒',c:1,type:'attack',rarity:'uncommon',target:'enemy',desc:'9点伤害;每打一次+6(本场)',uDesc:'13点伤害;每打一次+6'"
):
    print("miss: rampage")

# ================================================================
# 4. BUFF WEAK SILENT CARDS (not touched yet)
# ================================================================

# Escape Plan: 0 cost, draw 1, if skill +3/5 block -> +4/7
if not apply(
    "addCard({id:'escapePlan',name:'逃脱计划',c:0,type:'skill',rarity:'common',target:'self',desc:'抽1张牌;若抽到技能+3点格挡',uDesc:'抽1张牌;若抽到技能+5点格挡'}",
    "addCard({id:'escapePlan',name:'逃脱计划',c:0,type:'skill',rarity:'common',target:'self',desc:'抽1张牌;若抽到技能+4点格挡',uDesc:'抽1张牌;若抽到技能+7点格挡'"
):
    print("miss: escapePlan")

# Outmaneuver: +2/3 energy exhaust -> also draw 1 base
if not apply(
    "addCard({id:'outmaneuver',name:'策略',c:1,type:'skill',rarity:'uncommon',target:'self',desc:'+2点能量;消耗',uDesc:'+3点能量+抽1张牌;消耗'}",
    "addCard({id:'outmaneuver',name:'策略',c:1,type:'skill',rarity:'uncommon',target:'self',desc:'+2点能量+抽1;消耗',uDesc:'+3点能量+抽1;消耗'"
):
    print("miss: outmaneuver")

# Setup (集中/concentrate): already buffed
# Tactician: already decent
# Expertise: already buffed with block

# Malaise: X cost, X poison + X weak -> also gain X block
if not apply(
    "addCard({id:'malaise',name:'萎靡',c:-1,type:'skill',rarity:'rare',target:'self',desc:'消耗X点能量全体X毒+X虚弱;消耗',uDesc:'消耗X点能量全体X+1层中毒+X+1层虚弱;消耗'}",
    "addCard({id:'malaise',name:'萎靡',c:-1,type:'skill',rarity:'rare',target:'self',desc:'消耗X点能量全体X毒+X虚弱+X甲;消耗',uDesc:'消耗X点能量全体X+1毒+X+1弱+X+1甲;消耗'"
):
    print("miss: malaise")

# Storm of Steel (钢铁风暴): discard all, gain shivs = cards discarded
# Also gain block per shiv
# Let me check current
if not apply(
    "addCard({id:'stormSteel',name:'钢铁风暴',c:1,type:'skill',rarity:'uncommon',target:'self',desc:'丢弃所有手牌;每弃1张获得1张小刀;消耗',uDesc:'丢弃所有手牌;每弃1张获得2张升级小刀;消耗'}",
    "addCard({id:'stormSteel',name:'钢铁风暴',c:1,type:'skill',rarity:'uncommon',target:'self',desc:'丢弃所有手牌;每弃1张获得1张小刀+1甲;消耗',uDesc:'丢弃所有手牌;每弃1张获得2张升级小刀+2甲;消耗'"
):
    print("miss: stormSteel")

# ================================================================
# 5. BUFF WEAK WATCHER CARDS
# ================================================================

# Conclude: 14/18 AOE exhaust -> 16/20
if not apply(
    "addCard({id:'conclude',name:'终结',c:1,type:'attack',rarity:'uncommon',target:'all',desc:'对所有敌人造成14点伤害;消耗',uDesc:'对所有敌人造成18点伤害;消耗'}",
    "addCard({id:'conclude',name:'终结',c:1,type:'attack',rarity:'uncommon',target:'all',desc:'对所有敌人造成16点伤害;消耗',uDesc:'对所有敌人造成20点伤害;消耗'"
):
    print("miss: conclude")

# WheelKick: 15/20 + draw2 -> 16/20 (fine, but draw 2 is good)
if not apply(
    "addCard({id:'wheelKick',name:'轮踢',c:2,type:'attack',rarity:'common',target:'enemy',desc:'15点伤害;抽2张牌',uDesc:'20点伤害;抽2张牌'}",
    "addCard({id:'wheelKick',name:'轮踢',c:2,type:'attack',rarity:'common',target:'enemy',desc:'16点伤害;抽2张牌',uDesc:'20点伤害;抽2张牌'"
):
    print("miss: wheelKick")

# Sanctity: 9/12 block + draw2 -> 10/14 block + draw2
if not apply(
    "addCard({id:'sanctity',name:'神圣',c:1,type:'skill',rarity:'common',target:'self',desc:'9点格挡;抽2张牌',uDesc:'12点格挡;抽2张牌'}",
    "addCard({id:'sanctity',name:'神圣',c:1,type:'skill',rarity:'common',target:'self',desc:'10点格挡;抽2张牌',uDesc:'14点格挡;抽2张牌'"
):
    print("miss: sanctity")

# ================================================================
# 6. BUFF WEAK DEFECT CARDS
# ================================================================

# Rip and Tear: 7x2/10x2 random -> 8x2/11x2
if not apply(
    "addCard({id:'ripAndTear',name:'撕裂',c:1,type:'attack',rarity:'common',target:'enemy',desc:'随机敌人7点伤害x2',uDesc:'随机敌人10点伤害x2'}",
    "addCard({id:'ripAndTear',name:'撕裂',c:1,type:'attack',rarity:'common',target:'enemy',desc:'随机敌人8点伤害x2',uDesc:'随机敌人11点伤害x2'"
):
    print("miss: ripAndTear")

# Scrape: 10/13 + conditional draw -> 11/14
if not apply(
    "addCard({id:'scrape',name:'刮削',c:1,type:'attack',rarity:'common',target:'enemy',desc:'10点伤害;抽1张牌;若0费再抽1张牌',uDesc:'13点伤害;抽1张牌;0费再抽1张牌'}",
    "addCard({id:'scrape',name:'刮削',c:1,type:'attack',rarity:'common',target:'enemy',desc:'11点伤害;抽1张牌;若0费再抽1张牌',uDesc:'14点伤害;抽1张牌;0费再抽1张牌'"
):
    print("miss: scrape")

# FTL: 6/8 + conditional draw -> 7/9
if not apply(
    "addCard({id:'ftl',name:'超光速',c:0,type:'attack',rarity:'common',target:'enemy',desc:'6点伤害;已打3牌则抽1张牌',uDesc:'8点伤害;已打3牌则抽1张牌'}",
    "addCard({id:'ftl',name:'超光速',c:0,type:'attack',rarity:'common',target:'enemy',desc:'7点伤害;已打3牌则抽1张牌',uDesc:'9点伤害;已打3牌则抽1张牌'"
):
    print("miss: ftl")

# Reprogram: -2 str +2 dex +1 focus -> -1 str +3 dex +2 focus
if not apply(
    "addCard({id:'reprogram',name:'重编程',c:1,type:'skill',rarity:'uncommon',target:'self',desc:'-2点力量+2点敏捷+1集中',uDesc:'-2点力量+3点敏捷+2集中'}",
    "addCard({id:'reprogram',name:'重编程',c:1,type:'skill',rarity:'uncommon',target:'self',desc:'-1点力量+3点敏捷+1集中',uDesc:'-1点力量+4点敏捷+2集中'"
):
    print("miss: reprogram")

# Hello World: common card each turn -> also +1 card draw on play
if not apply(
    "addCard({id:'helloWorld',name:'你好世界',c:1,type:'power',rarity:'uncommon',target:'self',desc:'能力:回合开始获得1张随机普通卡',uDesc:'能力:回合开始获得1张随机普通卡(固有)'",
    "addCard({id:'helloWorld',name:'你好世界',c:1,type:'power',rarity:'uncommon',target:'self',desc:'能力:回合开始获得1张随机普通卡+抽1',uDesc:'能力:回合开始获得1张随机普通卡(固有)+抽1'"
):
    print("miss: helloWorld")

# Creative AI: 3 -> 2 cost
if not apply(
    "addCard({id:'creativeAI',name:'创造性AI',c:3,type:'power',rarity:'rare',target:'self',desc:'能力:回合开始获得1张随机能力牌',uDesc:'能力:回合开始获得1张随机能力牌(2费)'",
    "addCard({id:'creativeAI',name:'创造性AI',c:2,type:'power',rarity:'rare',target:'self',desc:'能力:回合开始获得1张随机能力牌',uDesc:'能力:回合开始获得1张随机能力牌(1费)'"
):
    print("miss: creativeAI")

# Overclock: 2 wounds -> 1 wound
if not apply(
    "desc:'抽2张牌;获得2张伤口;消耗',uDesc:'抽3张牌;获得2张伤口;消耗'",
    "desc:'抽2张牌;获得1张伤口;消耗',uDesc:'抽3张牌;获得1张伤口;消耗'"
):
    print("miss: overclock wounds")
if not apply(
    "g.discard.push({...S.wound},{...S.wound});addLog('⚡超频!');},ex:true}",
    "g.discard.push({...S.wound});addLog('⚡超频!');},ex:true}"
):
    print("miss: overclock push")

# ================================================================
# 7. BUFF WEAK POWER CARDS
# ================================================================

# Thought Armor: 1/2 block per draw -> 2/3
if not apply(
    "addCard({id:'thoughtArmor',name:'思绪铠甲',c:1,type:'power',rarity:'uncommon',target:'self',desc:'能力:每抽1张牌获得1点格挡',uDesc:'能力:每抽1张牌获得2点格挡'}",
    "addCard({id:'thoughtArmor',name:'思绪铠甲',c:1,type:'power',rarity:'uncommon',target:'self',desc:'能力:每抽1张牌获得2点格挡',uDesc:'能力:每抽1张牌获得3点格挡'"
):
    print("miss: thoughtArmor")

# White Noise: +2 block on play
if not apply(
    "addCard({id:'whiteNoise',name:'白噪音',c:1,type:'skill',rarity:'uncommon',target:'self',desc:'获得1张随机能力牌;消耗',uDesc:'获得2张随机能力牌;消耗',f:(g,_,c)=>{const n=c.u?2:1;const pool=ALL_CARDS.filter(x=>x.type==='power');for(let i=0;i<n&&pool.length>0;i++){const r=pick(pool);g.hand.push({...r,id:r.id+'_wn'+Date.now()+'_'+i});}},ex:true})",
    "addCard({id:'whiteNoise',name:'白噪音',c:1,type:'skill',rarity:'uncommon',target:'self',desc:'获得1张随机能力牌+4甲;消耗',uDesc:'获得2张随机能力牌+6甲;消耗',f:(g,_,c)=>{g.block+=c.u?10:6;const n=c.u?2:1;const pool=ALL_CARDS.filter(x=>x.type==='power');for(let i=0;i<n&&pool.length>0;i++){const r=pick(pool);g.hand.push({...r,id:r.id+'_wn'+Date.now()+'_'+i});}},ex:true})"
):
    print("miss: whiteNoise")

# Fasting: -1 str per turn for energy - too punishing -> change to no penalty
if not apply(
    "addCard({id:'fasting',name:'斋戒',c:1,type:'power',rarity:'uncommon',target:'self',desc:'能力:每打1牌+1点能量,获得回合-1点力量',uDesc:'能力:每打1牌+1点能量,回合-1点力量',f:(g,_,c)=>{g.fasting=(g.fasting||0)+1;g.strength=Math.max(0,(g.strength||0)-(c.u?1:1));}})",
    "addCard({id:'fasting',name:'斋戒',c:1,type:'power',rarity:'uncommon',target:'self',desc:'能力:每打2牌+1能量',uDesc:'能力:每打2牌+1能量+回合末+1甲',f:(g,_,c)=>{g.fasting=c.u?3:2;if(c.u)g.thoughtArmor=(g.thoughtArmor||0)+1;}})"
):
    print("miss: fasting")

# Magnetism: random rare per turn -> also reduce cost of generated card by 1
if not apply(
    "addCard({id:'magnetism',name:'磁力',c:1,type:'power',rarity:'rare',target:'self',desc:'能力:每回合合获得1张随机传说牌',uDesc:'能力:每回合合获得1张随机传说牌(升级)',f:(g,_,c)=>{g.magnetism=c.u?2:1;}})",
    "addCard({id:'magnetism',name:'磁力',c:1,type:'power',rarity:'rare',target:'self',desc:'能力:每回合获得1张随机传说牌(0费)',uDesc:'能力:每回合获得2张随机传说牌(0费)',f:(g,_,c)=>{g.magnetism=c.u?2:1;}})"
):
    print("miss: magnetism")

# ================================================================
# 8. BUFF MORE WEAK SKILL CARDS
# ================================================================

# Equilibrium: 13/17 block + retain hand -> 14/18
if not apply(
    "addCard({id:'equilibrium',name:'均衡',c:1,type:'skill',rarity:'uncommon',target:'self',desc:'13点格挡;保留手牌(本回合)',uDesc:'17点格挡;保留手牌(本回合)'",
    "addCard({id:'equilibrium',name:'均衡',c:1,type:'skill',rarity:'uncommon',target:'self',desc:'14点格挡;保留手牌(本回合)',uDesc:'18点格挡;保留手牌(本回合)'"
):
    print("miss: equilibrium")

# BootSequence: 10/14 + innate + draw on upgrade -> already good
# Let me also make it draw 1 base
if not apply(
    "addCard({id:'bootSequence',name:'启动序列',c:0,type:'power',rarity:'uncommon',target:'self',desc:'10点格挡;固有',uDesc:'14点格挡+抽1张牌;固有',in:true,f:(g,_,c)=>{g.block+=c.u?14:10;if(c.u)drawCards(1);}})",
    "addCard({id:'bootSequence',name:'启动序列',c:0,type:'power',rarity:'uncommon',target:'self',desc:'10点格挡+抽1;固有',uDesc:'14点格挡+抽2;固有',in:true,f:(g,_,c)=>{g.block+=c.u?14:10;drawCards(c.u?2:1);}})"
):
    print("miss: bootSequence")

# ================================================================
# 9. BUFF CONDITIONAL/COMBO CARDS
# ================================================================

# Finisher: 5/8 per attack this turn -> 6/9
if not apply(
    "addCard({id:'finisher',name:'终结技',c:1,type:'attack',rarity:'uncommon',target:'enemy',desc:'本回合每打1攻击牌造成5点伤害',uDesc:'本回合每打1攻击牌造成8点伤害'}",
    "addCard({id:'finisher',name:'终结技',c:1,type:'attack',rarity:'uncommon',target:'enemy',desc:'本回合每打1攻击牌造成6点伤害',uDesc:'本回合每打1攻击牌造成9点伤害'"
):
    print("miss: finisher")

# Sneaky Strike: 12/16 conditional energy -> 13/17
# But I already buffed this? Let me check
if not apply(
    "addCard({id:'sneakyStrike',name:'偷袭',c:2,type:'attack',rarity:'common',target:'enemy',desc:'12点伤害;若弃过牌回复1点能量',uDesc:'16点伤害;若弃过牌回复1点能量'}",
    "addCard({id:'sneakyStrike',name:'偷袭',c:2,type:'attack',rarity:'common',target:'enemy',desc:'13点伤害;若弃过牌回复1点能量',uDesc:'17点伤害;若弃过牌回复1点能量'"
):
    print("miss: sneakyStrike")

# ================================================================
# 10. BUFF UNDERUSED RELICS
# ================================================================

# Bottled Flame: +1 energy first turn -> also +2 block
if not apply(
    "{id:'bottledFlame',name:'火焰瓶',desc:'每场战斗首回合获得1点能量'}",
    "{id:'bottledFlame',name:'火焰瓶',desc:'每场战斗首回合+1能量+4甲'}"
):
    print("miss: bottledFlame")
if not apply(
    "if(G.relics.some(r=>r.id==='bottledFlame')){G.energy=Math.min(G.energy+1,G.maxEnergy+1);addFX(480,280,'🔥火焰瓶','#FF9800');}",
    "if(G.relics.some(r=>r.id==='bottledFlame')){G.energy=Math.min(G.energy+1,G.maxEnergy+1);G.block+=4;addFX(480,280,'🔥火焰瓶+1能+4甲','#FF9800');}"
):
    print("miss: bottledFlame code")

# War Horn: +2 str for 2 turns -> +3 str for 3 turns
if not apply(
    "{id:'warHorn',name:'战争号角',desc:'战斗开始+3点力量持续3回合'}",
    "{id:'warHorn',name:'战争号角',desc:'战斗开始+3点力量持续3回合'}"
):
    pass  # already 3/3

# Bronze Scales: 5 thorns -> 6 thorns
if not apply(
    "{id:'bronzeScales',name:'青铜甲',desc:'战斗开始+5荆棘;回合末荆棘-1'}",
    "{id:'bronzeScales',name:'青铜甲',desc:'战斗开始+6荆棘;回合末荆棘-1'}"
):
    print("miss: bronzeScales")

# Orichalcum: 6 block at end of turn if no block -> 8
if not apply(
    "if(G.relics.some(r=>r.id==='orichalcum')&&G.block===0){G.block+=6;addLog('🛡️ 山铜+6格挡');}",
    "if(G.relics.some(r=>r.id==='orichalcum')&&G.block===0){G.block+=8;addLog('🛡️ 山铜+8格挡');}"
):
    print("miss: orichalcum")

# Top (不停陀螺): draw 1 when hand empty -> draw 2
if not apply(
    "if(G.relics&&G.relics.some(r=>r.id==='top')&&G.hand.length===0){drawCards(1);addFX(480,260,'🌀陀螺!','#64B5F6');}",
    "if(G.relics&&G.relics.some(r=>r.id==='top')&&G.hand.length===0){drawCards(2);addFX(480,260,'🌀陀螺!','#64B5F6');}"
):
    print("miss: top")

# Sundial: 3 shuffles -> 2 shuffles for +2 energy
if not apply(
    "if(G.relics&&G.relics.some(r=>r.id==='sundial')){G._sundialCount=(G._sundialCount||0)+1;if(G._sundialCount>=3){G.energy=Math.min(G.maxEnergy+2,G.energy+2);G._sundialCount=0;addFX(480,240,'☀️日晷!','#FFD700');}}",
    "if(G.relics&&G.relics.some(r=>r.id==='sundial')){G._sundialCount=(G._sundialCount||0)+1;if(G._sundialCount>=2){G.energy=Math.min(G.maxEnergy+2,G.energy+2);G._sundialCount=0;addFX(480,240,'☀️日晷!','#FFD700');}}"
):
    print("miss: sundial")

# DuVu Doll: +1 per 2 status -> +1 per status
if not apply(
    "{id:'duVuDoll',name:'嘟-V玩偶',desc:'牌组中每有2张状态牌+1点力量',onGet:g=>{g.strength+=Math.min(3,g.deck.filter(x=>{const d=def(x);return d&&d.rarity==='status';}).length);}}",
    "{id:'duVuDoll',name:'嘟-V玩偶',desc:'每张状态牌+1力量(上限5)',onGet:g=>{g.strength+=Math.min(5,g.deck.filter(x=>{const d=def(x);return d&&d.rarity==='status';}).length);}}"
):
    print("miss: duVuDoll")

# Ice Cream: retain 50% energy -> retain 75%
if not apply(
    "if(G.relics&&G.relics.some(r=>r.id==='iceCream')){var _iceExtra=G.energy-G.maxEnergy;if(_iceExtra>0)_iceExtra=Math.floor(_iceExtra*0.5);",
    "if(G.relics&&G.relics.some(r=>r.id==='iceCream')){var _iceExtra=G.energy-G.maxEnergy;if(_iceExtra>0)_iceExtra=Math.floor(_iceExtra*0.75);"
):
    print("miss: iceCream")

# Centennial Puzzle: 3 block on draw? Let me check effect
# Centennial: every 3 shuffles draw 1? Let me find it
if "{id:'centennial'" in t:
    # Keep as is
    pass

# ================================================================
# 11. BUFF WEAK POTIONS
# ================================================================

# Swift pot: draw 3 -> draw 4
if not apply(
    "{id:'speed',name:'迅捷药水',desc:'抽3张牌',f:g=>{drawCards(3);}}",
    "{id:'speed',name:'迅捷药水',desc:'抽4张牌',f:g=>{drawCards(4);}}"
):
    print("miss: speed pot")

# Regen pot: 4hp x 3 -> 5hp x 3
if not apply(
    "{id:'regen',name:'再生药水',desc:'连续3回合每回合合回复4血',f:g=>{g.regenPotion=3;}}",
    "{id:'regen',name:'再生药水',desc:'连续3回合每回合合回复5血',f:g=>{g.regenPotion=3;}}"
):
    print("miss: regen pot")

# Dexterity pot: +8 dex for combat -> +10
if not apply(
    "{id:'dexterity',name:'敏捷药水',desc:'本场战斗+8点敏捷',f:g=>{g.dexterity+=8;}}",
    "{id:'dexterity',name:'敏捷药水',desc:'本场战斗+10点敏捷',f:g=>{g.dexterity+=10;}}"
):
    print("miss: dexterity pot")

# ================================================================
# 12. SAVE
# ================================================================

with open('card.html','w',encoding='utf-8') as f:
    f.write(t)

print(f"\n=== TOTAL: {len(changes)} CHANGES ===")
for c in changes:
    print(f"  {c}")
