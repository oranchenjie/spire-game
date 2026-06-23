#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""尖塔之魂 完整攻略生成器"""
import json, re, sys
sys.stdout.reconfigure(encoding='utf-8')

with open('C:/Users/25065/Desktop/AI game/card.html', 'r', encoding='utf-8') as f:
    content = f.read()

# === 数据提取: 用括号匹配提取全部598张卡 ===
_cards_raw = []
_cpos = 0
while True:
    _idx = content.find("addCard({", _cpos)
    if _idx < 0: break
    _depth = 0
    for _j, _ch in enumerate(content[_idx:]):
        if _ch == '{': _depth += 1
        elif _ch == '}':
            _depth -= 1
            if _depth == 0:
                _end = _idx + _j + 1
                break
    _block = content[_idx:_end]
    _cid = re.search(r"id:'([^']+)'", _block)
    _cname = re.search(r"name:'([^']+)'", _block)
    if _cid and _cname:
        _cost = re.search(r"c:([^,}]+)", _block)
        _ctype = re.search(r"type:'([^']+)'", _block)
        _crar = re.search(r"rarity:'([^']+)'", _block)
        _ctgt = re.search(r"target:'([^']+)'", _block)
        _cdsc = re.search(r"desc:'([^']+)'", _block)
        _cud = re.search(r"uDesc:'([^']+)'", _block)
        _cards_raw.append({
            'id': _cid.group(1), 'name': _cname.group(1),
            'c': _cost.group(1) if _cost else '',
            'type': _ctype.group(1) if _ctype else '',
            'rarity': _crar.group(1) if _crar else '',
            'target': _ctgt.group(1) if _ctgt else '',
            'desc': _cdsc.group(1) if _cdsc else '',
            'uDesc': _cud.group(1) if _cud else ''
        })
    _cpos = _end
cards = _cards_raw

relics_section = content[content.find('const RELICS=['):]
relics_section = relics_section[:relics_section.find('];') + 2]
relics_raw = re.findall(r"\{id:'([^']+)',name:'([^']+)',desc:'([^']+)'", relics_section)
relics = [{'id': r[0], 'name': r[1], 'desc': r[2]} for r in relics_raw]

# === Extract enemies ===
import json as _json
_enemies_raw = []
_et_start = content.find('const ET=[')
if _et_start >= 0:
    _et_sec = content[_et_start:]
    _d = 0
    for _i2, _ch2 in enumerate(_et_sec):
        if _ch2 == '[': _d += 1
        elif _ch2 == ']':
            _d -= 1
            if _d == 0:
                _et_sec = _et_sec[:_i2+1]
                break
    _e_pos = 0
    while True:
        _bs = _et_sec.find('{', _e_pos)
        if _bs < 0: break
        _d = 0
        for _j2, _ch2 in enumerate(_et_sec[_bs:]):
            if _ch2 == '{': _d += 1
            elif _ch2 == '}':
                _d -= 1
                if _d == 0:
                    _be = _bs + _j2 + 1
                    break
        _blk = _et_sec[_bs:_be]
        _eid = re.search(r"id:'([^']+)'", _blk)
        _enm = re.search(r"name:'([^']+)'", _blk)
        if _eid and _enm:
            _hb = re.search(r'hb:(\d+)', _blk)
            _hs = re.search(r'hs:([\d.]+)', _blk)
            _act = re.search(r'act:(\d+)', _blk)
            _desc = re.search(r"desc:'([^']+)'", _blk)
            _ab = []
            if 'preemptive' in _blk: _ab.append('先制')
            if 'elite:true' in _blk: _ab.append('精英')
            if 'boss:true' in _blk: _ab.append('Boss')
            if '_enrageHp' in _blk: _ab.append('狂怒')
            if '_lifesteal' in _blk: _ab.append('吸血')
            if '_retaliate' in _blk: _ab.append('反击')
            if '_reflect' in _blk: _ab.append('反射')
            if '_curseOnHit' in _blk: _ab.append('伤口诅咒')
            if '_lastStand' in _blk: _ab.append('爆发')
            if '_lifeLink' in _blk: _ab.append('连接')
            if '_phaseTwo' in _blk: _ab.append('二阶段')
            if '_spawnMinion' in _blk: _ab.append('召唤')
            _enemies_raw.append({
                'id': _eid.group(1), 'name': _enm.group(1),
                'hb': int(_hb.group(1)) if _hb else 0,
                'hs': float(_hs.group(1)) if _hs else 0,
                'act': int(_act.group(1)) if _act else 1,
                'elite': 'elite:true' in _blk,
                'boss': 'boss:true' in _blk,
                'desc': _desc.group(1) if _desc else '',
                'abilities': _ab
            })
        _e_pos = _be
enemies = _enemies_raw


char_patterns = {
    'ironclad': ['strike_B','defend_B','bash','ironWave','twinStrike','heavyStrike','bloodStrike',
                 'soulReap','lastStand','retribution','whirlwindSlash','volcanicEruption','chainLightning',
                 'chargeBlow','spinningEdge','earthShatter','ironShield','energySurge','lifeDrain',
                 'greedBlade','warTotem','ironWill','sacrificePower','natureForce','shadowPact',
                 'fightInstinct','soulResonance','weightTraining','burnBoats','knowledgePower',
                 'equivalentExchange','tacticalDefense','battleInsight','roulette','luckySeven','dealer',
                 'surpriseBox','voidStrike','voidNova','desperateStrike','debilitatingStrike',
                 'venomMastery','voidShield','ironResonance','berserkerSoul','bargain','doubleStrike',
                 'chargedStrike','sacrificialStrike','boomerangStrike','investmentStrike','timeStopStrike',
                 'barrageStrike','goldStrike','readAndCounter','aftermathStrike','undercurrent','redirect',
                 'bloodStarStrike','poisonStrStrike','discardMantraStrike','emptyHand','countdownStrike',
                 'loanStrike','waitAndSee','decay','clash','hemoKinesis','bloodBurst','ironCounter',
                 'secondWind','reflect','secondWind'],
    'silent': ['neutralize','survivor','strike_G','defend_G','shiv','deadlyPoison','poisonStab',
               'noxiousFumes','catalyst','corpseExplosion','envenom','bouncingFlask','flyingKnee',
               'outmaneuver','sneakyStrike','legSweep','dodgeRoll','footwork','backflip','deflect','blur',
               'distraction','cloakAndDagger','daggerThrow','daggerSpray','tactician','acrobatics',
               'quickSlash','eviscerate','finisher','dash','predator','piercingWail','malaise','afterImage',
               'phantasmal','alchemize','adrenaline','nightmare','toolsOfTheTrade','glassKnife',
               'wraithForm','dieDieDie','grandFinale','calculatedGamble','stormOfSteel','shivStorm',
               'shivGuard','venomEdge','shivRecall','razorWind','allOutAttack','windDance','disrupt',
               'chaosReroll','nimble','crossFertilize','bouncingFlask'],
    'defect': ['strike_D','defend_D','barrage','coldSnap','chargeBattery','claw','compileDriver',
               'doomAndGloom','electrodynamics','glacier','hyperbeam','leap','reboot','recursion',
               'reinforcedBody','reprogram','scrape','seek','selfRepair','skimming','staticDischarge',
               'steam','stack','storm','sunder','sweepingBeam','tempest','turbo','whiteNoise','amplify',
               'rainbow','rebound','ripAndTear','autoShields','ballLightning','beamCell','blizzard',
               'bootSequence','buffer','capacitor','chaos','chill','consume','creativeAI','defragment',
               'dualcast','equilibrium','fission','forceField','fusion','geneticAlgorithm','hologram',
               'loop','machineLearning','melter','multiCast','overclock','overheat','recycle','redo',
               'reflex','shadowBlade','frostOrbMastery','timeCapsule','energyShield','gravityWell',
               'starFlow','overload'],
    'watcher': ['strike_W','defend_W','eruption','vigilance','emptyFist','emptyBody','emptyMind',
                'flowState','consecrate','crushJoints','cutThroughFate','evaluate','fearNoEvil','halt',
                'handOfGreed','innerPeace','judgment','likeWater','meditate','mentalFortress',
                'perseverance','pressurePoints','prostrate','protect','reachHeaven','rushdown',
                'sashWhip','scrawl','signatureMove','simmeringFury','smite','spiritShield','study',
                'swivel','talkToHand','temple','thirdEye','vault','wallop','waveOfTheHand','wheelKick',
                'worship','windmillStrike','wish','alpha','beta','gamma','battleHymn','blasphemy',
                'brilliance','carveReality','clearTheMind','collect','conclude','deceiveReality',
                'devotion','establishment','foresight','foreignInfluence','masterReality','nirvana',
                'omniscience','pray','reality','sandsOfTime','tranquility','unraveling',
                'watcherMark','yinYang','samsara','stoneForm','fasting'],
    'regent': ['star','forge','servant','kingBlade','prismatic','cosmic','nova','comet','newMoon',
               'starShield','starReap','infiniteRadiance','bigBang','whosDare','protectKing',
               'forgeBlade','spoilsOfWar','forgeWall','battleForged','conqueror','recallBlade','smelt',
               'loyalServant','servantStrike','royalGuard','servantWave','reinforce','grandArmy',
               'servantSacrifice','servantFortress','starBlade','starBomb','forgeArmor','forgeServant',
               'forgeHeart','royalDecree','starForge','everChange','decreePower','sevenStars',
               'gammaBurst','coreImpact','radiantBarrier','stellarBurst','starOrbit','trackingBlade',
               'starPower','forgeSacrifice','servantPhalanx','poisonForge','starVortex','servantPower',
               'echoStar','starShieldPassive','forgeRecall','servantHeal','forgeStar','starFlow',
               'starBurst','radiantStar','prismaticStar','starBlessing']
}

for c in cards:
    cid = c['id']
    assigned = 'neutral'
    for ch, pats in char_patterns.items():
        for p in pats:
            if cid.startswith(p) or p in cid:
                assigned = ch
                break
        if assigned != 'neutral':
            break
    c['_char'] = assigned

game_data = {'cards': cards, 'relics': relics}
data_json = json.dumps(game_data, ensure_ascii=False, separators=(',', ':'))


# =======================================================================
#  CSS
# =======================================================================
CSS = r'''*{margin:0;padding:0;box-sizing:border-box}
body{background:#0a0820;color:#e0d8f0;font-family:'Segoe UI','Microsoft YaHei',sans-serif;overflow-x:hidden}
::-webkit-scrollbar{width:6px}::-webkit-scrollbar-track{background:#0a0820}::-webkit-scrollbar-thumb{background:#3a3080;border-radius:3px}
.header{background:linear-gradient(135deg,#1a1040,#2a1a60,#1a1040);padding:18px 24px;border-bottom:2px solid #4a3a90;position:sticky;top:0;z-index:100}
.header h1{font-size:22px;background:linear-gradient(90deg,#FFD700,#FF6B6B,#E040FB);-webkit-background-clip:text;-webkit-text-fill-color:transparent;display:inline}
.header span{color:#888;font-size:13px;margin-left:12px}
.tabs{display:flex;gap:2px;background:#0a0820;padding:0 12px;position:sticky;top:62px;z-index:99;flex-wrap:wrap;border-bottom:1px solid #2a1a60}
.tab{padding:10px 16px;cursor:pointer;font-size:13px;color:#999;border-radius:8px 8px 0 0;transition:.2s;background:transparent;border:none;font-family:inherit;white-space:nowrap}
.tab:hover{color:#fff;background:rgba(74,58,144,0.3)}
.tab.active{color:#FFD700;background:rgba(74,58,144,0.5)}
.tab .badge{background:#4a3a90;color:#ccc;border-radius:10px;padding:1px 7px;font-size:11px;margin-left:4px}
.tab.active .badge{background:#FFD700;color:#1a1040}
.content{display:none;padding:16px 20px;max-width:1200px;margin:auto}
.content.active{display:block}
.search-bar{display:flex;gap:10px;margin:12px 0;flex-wrap:wrap}
.search-bar input{flex:1;min-width:200px;padding:10px 14px;border-radius:8px;border:1px solid #3a3080;background:#120828;color:#e0d8f0;font-size:14px;outline:none}
.search-bar input:focus{border-color:#FFD700}
.search-bar select{padding:8px 12px;border-radius:8px;border:1px solid #3a3080;background:#120828;color:#e0d8f0;font-size:13px;outline:none;cursor:pointer}
.card-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(235px,1fr));gap:10px;margin-top:10px}
.entry{background:linear-gradient(135deg,#120828,#1a0e38);border:1px solid #2a1a60;border-radius:10px;padding:12px;transition:.2s;position:relative;overflow:hidden}
.entry:hover{border-color:#4a3a90;transform:translateY(-2px);box-shadow:0 4px 20px rgba(74,58,144,0.3)}
.entry .name{font-size:14px;font-weight:700;color:#FFD700;margin-bottom:3px}
.entry .sub{font-size:11px;color:#888;margin-bottom:4px;display:flex;gap:8px;flex-wrap:wrap}
.entry .sub .tag{padding:1px 6px;border-radius:4px;font-size:10px}
.entry .desc{font-size:12px;color:#bbb;line-height:1.5}
.tag.attack{background:rgba(255,68,68,0.2);color:#FF6B6B}.tag.skill{background:rgba(100,181,246,0.2);color:#64B5F6}.tag.power{background:rgba(171,139,255,0.2);color:#AD8BFF}
.tag.basic{background:rgba(150,150,150,0.2);color:#aaa}.tag.common{background:rgba(76,175,80,0.2);color:#4CAF50}.tag.uncommon{background:rgba(100,181,246,0.2);color:#64B5F6}.tag.rare{background:rgba(255,215,0,0.2);color:#FFD700}
.tag.self{background:rgba(171,139,255,0.15);color:#AD8BFF}.tag.enemy{background:rgba(255,68,68,0.15);color:#FF6B6B}.tag.all{background:rgba(255,152,0,0.15);color:#FF9800}
.tag.elite{background:rgba(255,68,68,0.3);color:#FF4444}.tag.boss{background:rgba(255,215,0,0.3);color:#FFD700}
.entry .cost{position:absolute;top:8px;right:10px;font-size:13px;font-weight:700}.cost.e0{color:#4CAF50}.cost.e1{color:#64B5F6}.cost.e2{color:#FF9800}.cost.e3{color:#FF6B6B}
.card-icon{display:inline-block;width:36px;height:50px;border-radius:4px;margin-right:8px;border:1px solid rgba(255,255,255,0.1);flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:16px;background:rgba(0,0,0,0.3)}
.card-header{display:flex;align-items:center}
.filter-bar{display:flex;gap:6px;flex-wrap:wrap;margin:6px 0}
.filter-btn{padding:4px 12px;border-radius:14px;border:1px solid #3a3080;background:transparent;color:#999;cursor:pointer;font-size:11px;transition:.2s;font-family:inherit}
.filter-btn:hover{border-color:#4a3a90;color:#fff}
.filter-btn.active{background:#4a3a90;border-color:#AD8BFF;color:#fff}
.count{font-size:12px;color:#666;margin:4px 0}.count b{color:#AD8BFF}
.boss-entry{border-color:#5a3080;background:linear-gradient(135deg,#1a0848,#2a1058)}.boss-entry .name{color:#FF6B6B}
.elite-entry{border-color:#3a2070}

/* Strategy card styles */
.strat-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:14px;margin-top:10px}
.strat-card{background:linear-gradient(135deg,#120828,#1a0e38);border:1px solid #2a1a60;border-radius:12px;padding:18px}
.strat-card h3{color:#FFD700;font-size:15px;margin-bottom:10px;padding-bottom:6px;border-bottom:1px solid #2a1a60}
.strat-card h4{color:#E040FB;font-size:13px;margin:10px 0 5px}
.strat-card p,.strat-card li{font-size:12.5px;color:#bbb;line-height:1.7;margin-bottom:4px}
.strat-card ul{padding-left:18px}
.strat-card .highlight{color:#FFD700}.strat-card .dmg{color:#FF6B6B}.strat-card .blk{color:#64B5F6}.strat-card .spe{color:#E040FB}
.strat-card .pick{color:#4CAF50;font-weight:700}.strat-card .avoid{color:#FF5252;font-weight:700}.strat-card .situ{color:#FF9800;font-weight:700}

/* Boss section */
.boss-strat{border:1px solid #5a3080;background:linear-gradient(135deg,#1a0848,#2a1058)}
.boss-strat h3{color:#FF6B6B}

/* Char intro banner */
.char-banner{display:flex;gap:16px;align-items:start;padding:16px;border-radius:12px;margin-bottom:14px}
.char-banner .icon{font-size:48px;flex-shrink:0;width:64px;text-align:center}
.char-banner .info{flex:1}
.char-banner .info h2{font-size:18px;margin-bottom:4px}
.char-banner .info p{font-size:12.5px;color:#bbb;line-height:1.6}

/* Highlight box */
.tip-box{background:#0a0418;border-left:3px solid #AD8BFF;border-radius:6px;padding:10px 14px;margin:8px 0;font-size:12px;color:#ccc;line-height:1.6}
.tip-box.gold{border-left-color:#FFD700}
.tip-box.red{border-left-color:#FF6B6B}
.tip-box.green{border-left-color:#4CAF50}

/* Combo grid */
.combo-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:10px;margin:8px 0}
.combo-item{background:rgba(10,4,24,0.6);border-radius:8px;padding:10px;border:1px solid #2a1a60}
.combo-item .cname{color:#FFD700;font-size:12px;font-weight:700}
.combo-item .cdesc{color:#bbb;font-size:11px;margin-top:2px}

@media(max-width:640px){.card-grid{grid-template-columns:1fr}.strat-grid{grid-template-columns:1fr}.tabs .tab{padding:8px 10px;font-size:11px}}
'''

# =======================================================================
#  JavaScript + DATA
# =======================================================================
JS_HEAD = r'''
<script>
const DATA = ''' + data_json + r''';

document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', function() {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.content').forEach(c => c.classList.remove('active'));
    this.classList.add('active');
    const el = document.getElementById('tab-'+this.dataset.tab);
    if (el) el.classList.add('active');
  });
});

function tag(t,c){return '<span class="tag '+c+'">'+t+'</span>'}
function esc(s){return String(s).replace(/</g,'&lt;').replace(/>/g,'&gt;')}

// === CARDS ===
function renderCards(filterFn) {
  const g = document.getElementById('cardGrid'); if(!g) return;
  const items = DATA.cards.filter(filterFn);
  const ct = document.getElementById('cardCount'); if(ct) ct.textContent = items.length;
  g.innerHTML = items.map(function(c){
    var icon = c.type==='attack'?'&#x2694;':c.type==='power'?'&#x1F52E;':'&#x1F6E1;';
    var tl = {attack:'攻击',power:'能力',skill:'技能'}[c.type]||c.type;
    var rl = {basic:'基础',common:'普通',uncommon:'罕见',rare:'稀有'}[c.rarity]||c.rarity;
    var cl = c.c==='-1'?'X':c.c;
    var tgt = {all:'全体',self:'自身',enemy:'单体'}[c.target]||c.target;
    var cc = 'e'+Math.min(3,parseInt(c.c)||0);
    return '<div class="entry"><div class="card-header"><div class="card-icon">'+icon+'</div><div><div class="name">'+esc(c.name)+'</div><div class="sub">'+tag(tl,c.type)+tag(rl,c.rarity)+tag(tgt,c.target)+'</div></div></div><div class="cost '+cc+'">'+cl+'费</div><div class="desc">'+esc(c.desc)+'</div><div class="desc" style="color:#AD8BFF;margin-top:3px;font-size:11px"><b>升级:</b> '+esc(c.uDesc)+'</div></div>';
  }).join('');
}
function filterCards(){
  var q=(document.getElementById('cardSearch')||{}).value||'';q=q.toLowerCase();
  var type=(document.getElementById('cardType')||{}).value||'';
  var rar=(document.getElementById('cardRarity')||{}).value||'';
  var ch='';var ab=document.querySelector('#charFilter .active');if(ab)ch=ab.dataset.char||'';
  renderCards(function(c){
    if(type&&c.type!==type)return 0;if(rar&&c.rarity!==rar)return 0;
    if(ch&&c._char!==ch)return 0;
    if(q&&!c.name.includes(q)&&!c.desc.toLowerCase().includes(q)&&!c.id.toLowerCase().includes(q))return 0;
    return 1;
  });
}
function setCharFilter(el,ch){
  document.querySelectorAll('#charFilter .filter-btn').forEach(function(b){b.classList.remove('active')});
  el.classList.add('active');filterCards();
}

// === RELICS ===
function renderRelics(fn){
  var g=document.getElementById('relicGrid');if(!g)return;
  var items=DATA.relics.filter(fn);
  var ct=document.getElementById('relicCount');if(ct)ct.textContent=items.length;
  g.innerHTML=items.map(function(r){return '<div class="entry"><div class="name">&#x1F48E; '+esc(r.name)+'</div><div class="desc">'+esc(r.desc)+'</div></div>'}).join('');
}
function filterRelics(){var q=(document.getElementById('relicSearch')||{}).value||'';q=q.toLowerCase();renderRelics(function(r){return !q||r.name.includes(q)||r.desc.toLowerCase().includes(q);});}

// === ENEMIES ===
var ENEMIES_DATA=[{n:'史莱姆',a:1,h:14,s:2.0,d:'狂怒(HP≤30%)',mv:'攻击→防御→debuff→攻击'},{n:'哥布林',a:1,h:13,s:3.0,mv:'攻击→防御→多段→攻击'},{n:'虫',a:1,h:15,s:2.0,mv:'攻击→防御→debuff→攻击'},{n:'邪教徒',a:1,h:14,s:2.0,mv:'攻击→buff→攻击→攻击'},{n:'颚虫',a:1,h:16,s:2.0,mv:'攻击→防御→buff→攻击'},{n:'甲壳怪',a:1,h:16,s:3.0,mv:'攻击→防御→攻击→buff'},{n:'毒蜘蛛',a:1,h:14,s:3.0,d:'吸血8%',mv:'多段→攻击→debuff→攻击'},{n:'幽灵',a:1,h:15,s:3.0,mv:'攻击→攻击→debuff→塞牌'},{n:'骷髅兵',a:1,h:15,s:3.0,mv:'攻击→攻击→防御→多段'},{n:'毛虫',a:1,h:15,s:3.0,mv:'攻击→防御→攻击→debuff'},{n:'刺球史莱姆',a:1,h:16,s:3.0,d:'反击(2)',mv:'攻击→攻击→防御→攻击'},{n:'双生哥布林',a:1,h:10,s:3.0,mv:'多段→攻击→防御→攻击'},{n:'真菌兽',a:1,h:16,s:3.0,mv:'攻击→攻击→buff→攻击'},{n:'头目',a:1,h:30,s:3.0,el:1,d:'每打非攻击+1力;半血暴怒 | 狂怒(HP≤40%), 特殊反应',mv:'buff→buff→攻击→buff…'},{n:'Lagavulin',a:1,h:30,s:3.0,el:1,d:'先制1虚1易;回合+1力 | 吸血8%, 先制',mv:'debuff→debuff→攻击→攻击…'},{n:'厄运教徒',a:1,h:16,s:3.0,mv:'攻击→debuff→攻击→buff'},{n:'幽影',a:1,h:12,s:4.0,d:'幽灵',mv:'攻击→debuff→攻击→debuff'},{n:'奴贩',a:2,h:24,s:3.0,mv:'攻击→攻击→抽能→攻击'},{n:'百夫长',a:2,h:24,s:4.0,mv:'攻击→攻击→buff→防御'},{n:'秘术师',a:2,h:20,s:4.0,mv:'攻击→debuff→buff→治疗'},{n:'诅咒术士',a:2,h:26,s:4.0,d:'攻击塞伤口',mv:'攻击→debuff→debuff→攻击'},{n:'蛇女',a:2,h:28,s:5.0,mv:'攻击→攻击→防御→攻击'},{n:'蛇花',a:2,h:26,s:3.0,mv:'攻击→debuff→多段→攻击'},{n:'被选者',a:2,h:28,s:3.0,mv:'攻击→buff→攻击→buff'},{n:'鸟人',a:2,h:30,s:4.0,mv:'多段→攻击→防御→攻击'},{n:'自爆者',a:2,h:20,s:3.0,d:'死亡爆炸12伤 | 死亡爆发(12伤)',mv:'攻击→buff→攻击→攻击'},{n:'抽能者',a:2,h:28,s:4.0,mv:'攻击→抽能→防御→攻击'},{n:'毒蛇',a:2,h:26,s:4.0,mv:'攻击→debuff→攻击→防御'},{n:'山贼',a:2,h:25,s:4.0,mv:'攻击→攻击→buff→塞牌'},{n:'法师',a:2,h:22,s:4.0,mv:'攻击→debuff→攻击→buff'},{n:'甲壳寄生',a:2,h:28,s:4.0,mv:'攻击→攻击→防御→攻击'},{n:'窃贼',a:2,h:24,s:4.0,mv:'攻击→攻击→防御→多段'},{n:'伤口小鬼',a:2,h:14,s:3.0,mv:'塞牌→攻击→攻击→防御'},{n:'治愈僧',a:2,h:24,s:4.0,mv:'治疗→攻击→buff→攻击'},{n:'眼镜蛇',a:2,h:30,s:4.0,mv:'攻击→debuff→攻击→防御'},{n:'墓穴守卫',a:2,h:50,s:4.0,el:1,d:'先制12甲;反击3;每回合+2力 | 反击(3), 先制',mv:'buff→攻击→防御→攻击…'},{n:'监工',a:2,h:48,s:4.0,el:1,d:'先制12甲;半血暴怒 | 狂怒(HP≤35%), 先制',mv:'buff→攻击→攻击→buff…'},{n:'奴贩团',a:2,h:46,s:4.0,el:1,d:'攻击塞伤口',mv:'攻击→debuff→防御→debuff'},{n:'厄运骑士',a:2,h:38,s:6.0,el:1,mv:'攻击→debuff→多段→buff'},{n:'暗影',a:3,h:42,s:5.0,d:'吸血20%, 攻击塞伤口',mv:'攻击→debuff→多段→攻击'},{n:'尖塔之灵',a:3,h:44,s:4.0,d:'吸血15%',mv:'攻击→攻击→buff→攻击'},{n:'镜面守卫',a:3,h:45,s:8.0,el:1,d:'奇数回合无敌锁血(可挂Debuff);偶数回合猛攻',mv:'buff→多段→buff'},{n:'巨首',a:3,h:50,s:5.0,mv:'攻击→反馈→防御→攻击'},{n:'骑士',a:3,h:42,s:5.0,mv:'攻击→防御→攻击→buff'},{n:'恶魔',a:3,h:52,s:5.0,d:'每回+2力;半血暴怒;吸血 | 狂怒(HP≤40%), 吸血15%',mv:'攻击→buff→多段→攻击'},{n:'螺壳怪',a:3,h:40,s:4.0,d:'反击(4)',mv:'防御→攻击→buff→攻击'},{n:'石魔像',a:3,h:46,s:5.0,d:'反射15%',mv:'攻击→防御→攻击→buff'},{n:'虚空恶魔',a:3,h:40,s:5.0,mv:'攻击→buff→多段→攻击'},{n:'狂战士',a:3,h:34,s:5.0,d:'狂怒(HP≤50%)',mv:'多段→buff→攻击→攻击'},{n:'梦魅之灵',a:3,h:30,s:4.0,d:'攻击塞伤口',mv:'塞牌→攻击→debuff→攻击'},{n:'反馈法师',a:3,h:38,s:5.0,mv:'攻击→反馈→防御→攻击'},{n:'转瞬即逝',a:3,h:70,s:5.0,mv:'攻击→攻击→攻击→攻击…'},{n:'腐蚀之心',a:3,h:50,s:5.0,d:'每回合+2力量',mv:'攻击→buff→多段→攻击'},{n:'暗影法师',a:3,h:38,s:5.0,mv:'攻击→debuff→攻击→塞牌'},{n:'暗影群',a:3,h:58,s:5.0,el:1,d:'先制10伤;吸血;生命链接 | 吸血15%, 生命链接, 先制',mv:'攻击→攻击→debuff→多段…'},{n:'星云',a:3,h:62,s:5.0,el:1,d:'狂怒(HP≤30%), 攻击塞伤口',mv:'攻击→buff→多段→攻击'},{n:'蜥蜴召唤师',a:3,h:56,s:5.0,el:1,d:'反击(3)',mv:'攻击→buff→攻击→塞牌'},{n:'史莱姆王',a:1,h:100,s:2.0,b:1,d:'先制1虚;半血分裂;召唤史莱姆 | 二阶段, 先制, 召唤',mv:'debuff→攻击→debuff→多段…'},{n:'六火亡魂',a:1,h:100,s:2.0,b:1,d:'先制4伤+2灼烧;召唤幽灵;半血暴怒 | 狂怒(HP≤50%), 先制, 召唤',mv:'攻击→塞牌→攻击→多段…'},{n:'巨石守卫',a:1,h:90,s:2.0,b:1,d:'先制30甲沉睡;受击+2甲;半血苏醒狂暴 | 二阶段, 先制, 嘲讽, 特殊反应',mv:'buff→buff→攻击→防御…'},{n:'毒巢女王',a:1,h:80,s:2.0,b:1,d:'先制2毒;召唤虫卵;攻击叠毒 | 先制, 召唤',mv:'debuff→攻击→debuff→攻击…'},{n:'毒虫卵',a:1,h:10,s:1.0},{n:'守卫者',a:2,h:160,s:2.0,b:1,d:'受攻击8甲;反伤;召唤甲壳;反击4 | 反击(4), 反射25%, 召唤, 嘲讽, 特殊反应',mv:'buff→攻击→防御→攻击…'},{n:'铜制机械',a:2,h:155,s:2.0,b:1,d:'受攻击+1力;破甲;100%吸血 | 吸血100%, 破盾, 特殊反应',mv:'buff→攻击→防御→攻击…'},{n:'觉醒者',a:3,h:220,s:3.0,b:1,d:'能力牌+1力;召唤邪教徒;二阶段+6力+6荆棘 | 狂怒(HP≤40%), 二阶段, 召唤, 特殊反应',mv:'buff→攻击→debuff→多段…'},{n:'时间吞噬者',a:3,h:210,s:3.0,b:1,d:'先制12伤+3易;召唤骷髅;反击5;反馈 | 反击(5), 先制, 召唤',mv:'debuff→攻击→攻击→防御…'},{n:'亡灵仆从',a:3,h:8,s:1.0,mv:'攻击→攻击→攻击→攻击'},{n:'亡灵君主',a:3,h:140,s:3.0,b:1,d:'每回合召唤亡灵仆从;击杀亡灵君主即可获胜 | 召唤',mv:'攻击→攻击→多段→攻击…'},{n:'镜像统领',a:2,h:130,s:2.0,b:1,d:'先制易伤;反射伤害;召唤镜像碎片 | 反击(0.15), 二阶段, 先制, 召唤',mv:'debuff→攻击→攻击→buff…'},{n:'镜像碎片',a:2,h:18,s:1.0,d:'死亡时为主体+2力',mv:'攻击→防御→攻击→攻击'},{n:'熵变体',a:3,h:170,s:3.0,b:1,d:'先制塞伤口;熵增腐蚀;低血量狂暴 | 狂怒(HP≤30%), 吸血6%, 攻击塞伤口, 先制',mv:'塞牌→攻击→debuff→攻击…'},{n:'回声',a:3,h:42,s:4.0,el:1,d:'先制记录;回声反击;你强它更强 | 吸血10%, 先制, 回声',mv:'debuff→攻击→攻击→多段…'},{n:'思维漩涡',a:3,h:50,s:5.0,el:1,d:'每回合吸走1张手牌;用其效果反击;吸多则强 | 吸牌',mv:'攻击→攻击→防御→多段…'},{n:'抄袭者',a:2,h:38,s:4.0,el:1,d:'先制窃取;每回复制弃牌堆1张牌 | 攻击塞伤口, 先制',mv:'debuff→攻击→攻击→多段…'}];

function renderEnemies(fn){
  var g=document.getElementById('enemyGrid');if(!g)return;
  var items=ENEMIES_DATA.filter(fn);
  var ct=document.getElementById('enemyCount');if(ct)ct.textContent=items.length;
  g.innerHTML=items.map(function(e){
    var cls=e.b?'boss-entry':e.el?'elite-entry':'';
    var tt=e.b?tag('BOSS','boss'):e.el?tag('精英','elite'):tag('普通','basic');
    var dd=e.d?'<div class="desc" style="margin-top:2px">'+esc(e.d)+'</div>':'';
    var mv=e.mv?'<div class="desc" style="margin-top:2px;color:#AD8BFF;font-size:11px">动作: '+esc(e.mv)+'</div>':'';
    return '<div class="entry '+cls+'"><div class="name">'+esc(e.n)+'</div><div class="sub">'+tag('幕'+e.a,'common')+tt+'</div><div class="desc">基础HP: <span class="dmg">'+e.h+'</span> | 成长: <span class="blk">'+e.s+'</span></div>'+dd+mv+'</div>';
  }).join('');
}
function filterEnemies(){
  var q=(document.getElementById('enemySearch')||{}).value||'';q=q.toLowerCase();
  var a=(document.getElementById('enemyAct')||{}).value||'';
  var t=(document.getElementById('enemyType')||{}).value||'';
  renderEnemies(function(e){
    if(a&&e.a!==parseInt(a))return 0;if(t==='elite'&&!e.el&&!e.b)return 0;
    if(t==='boss'&&!e.b)return 0;if(t==='normal'&&(e.el||e.b))return 0;
    if(q&&!e.n.includes(q))return 0;return 1;
  });
}

// === POTIONS ===
function renderPotions(fn){
  var g=document.getElementById('potionGrid');if(!g)return;
  var p=[{n:'生命药水',d:'回复40HP'},{n:'能量药水',d:'+3能量'},{n:'力量药水',d:'本场+6力量'},{n:'格挡药水',d:'+20格挡'},{n:'毒雾药水',d:'全体9毒'},{n:'爆炸药水',d:'全敌20伤'},{n:'迅捷药水',d:'抽3张'},{n:'敏捷药水',d:'本场+10敏'},{n:'再生药水',d:'3回每回+5HP'},{n:'异教徒药水',d:'+5力+2易伤'},{n:'烈焰药水',d:'单敌30'},{n:'护甲药水',d:'+2金属化'},{n:'弹跳药水',d:'10+10随机'},{n:'幽灵药水',d:'15血+15甲'},{n:'赌徒骰',d:'弃所有抽等量+1'},{n:'能力药水',d:'随机能力牌'},{n:'虚弱药水',d:'全体3虚'},{n:'姿态药水',d:'宁静/怒火'},{n:'青铜液',d:'+3荆棘'},{n:'连击药水',d:'本回攻击2次'},{n:'赋能药水',d:'+3力+3敏'},{n:'复制药水',d:'下张打2次'},{n:'精灵药水',d:'免死回30%'},{n:'记忆液',d:'回收消耗堆'},{n:'钢之精华',d:'+25甲-50%伤'},{n:'无色药水',d:'稀有卡费-1'},{n:'混沌药水',d:'随机打3张'},{n:'集中药水',d:'+3集中'},{n:'远古药水',d:'+2人工制品'},{n:'类固醇药水',d:'+6力战后消'},{n:'果汁',d:'永久+5最大HP'},{n:'狂怒药水',d:'怒火姿态(观者)'},{n:'念力药水',d:'+6念力'},{n:'寒冰药水',d:'2冰球+8甲'},{n:'雷电药水',d:'2闪电+12伤'},{n:'净化药水',d:'移除所有Debuff'},{n:'铁壁药水',d:'30甲+3金属化'},{n:'回收药水',d:'弃牌堆回收3张'},{n:'献祭药水',d:'自残5+3力+15甲'},{n:'翻倍药水',d:'力量翻倍(战后消)'},{n:'缓冲药水',d:'+2缓冲'},{n:'磁力药水',d:'手牌费-1'},{n:'复苏药水',d:'回40HP+清伤口'},{n:'狂暴药水',d:'+2力+2敏+抽2'},{n:'虚空药水',d:'+4印记+8甲'},{n:'辉星药水',d:'+6辉星'},{n:'铸剑药水',d:'+8铸剑'},{n:'仆从药水',d:'+5仆从+10甲'},{n:'潮汐药水',d:'Lv+3+涌'},{n:'幸运药水',d:'随机正面效果'}];
  var items=p.filter(fn);var ct=document.getElementById('potionCount');if(ct)ct.textContent=items.length;
  g.innerHTML=items.map(function(x){return '<div class="entry"><div class="name">&#x1F9EA; '+esc(x.n)+'</div><div class="desc" style="color:#4CAF50">'+esc(x.d)+'</div></div>'}).join('');
}
function filterPotions(){var q=(document.getElementById('potionSearch')||{}).value||'';q=q.toLowerCase();renderPotions(function(p){return !q||p.n.includes(q)||p.d.includes(q);});}

// === EVENTS ===
function renderEvents(fn){
  var g=document.getElementById('eventGrid');if(!g)return;
  var ev=[{n:'黄金神殿',o:'供奉(125金/失5血) / 祈祷(回30%) / 离开'},{n:'遗忘之泉',o:'移除1牌 / 离开'},{n:'铁匠铺',o:'升级攻击或技能 / 离开'},{n:'深渊之镜',o:'复制1牌入牌库 / 离开'},{n:'暗影交易',o:'失5血获遗物 / 离开'},{n:'占卜师',o:'看顶3留1 / 离开'},{n:'神秘箱子',o:'55-110金币 / 离开'},{n:'疗愈之泉',o:'回复30%HP / 离开'},{n:'流浪商人',o:'失20血获稀有遗物 / 离开'},{n:'战斗竞技场',o:'精英战高额金币 / 离开'},{n:'神秘雕像',o:'失8血获随机遗物 / 离开'},{n:'流浪医者',o:'回复50% / 升级随机牌 / 离开'},{n:'附魔师',o:'免费升级1牌 / 离开'},{n:'审讯者',o:'精英战1.5倍金 / 付25金 / 失5血'},{n:'图书馆',o:'免费1牌+5HP / 离开'},{n:'休眠守卫',o:'失3血 / 精英战双倍金 / 离开'},{n:'蘑菇地',o:'+8血随机效果 / 25金 / 离开'},{n:'回廊',o:'50-80金或失10血 / 离开'},{n:'幽灵',o:'失3HP上限升2牌 / 30金 / 无视'},{n:'变形器',o:'变形1手牌 / 离开'},{n:'赌桌',o:'下注50金(50%双倍) / 离开'},{n:'图书馆(大)',o:'从5张选2张 / 离开'},{n:'神秘蘑菇',o:'15HP+1力 / 无视'},{n:'神秘宝箱',o:'失5血+稀有遗物 / 离开'},{n:'赏金猎人',o:'下个精英+30金 / 拒绝'},{n:'老乞丐',o:'25金换遗物 / 离开'},{n:'神秘祭坛',o:'失5血+200金 / 精英遗物'}];
  var items=ev.filter(fn);var ct=document.getElementById('eventCount');if(ct)ct.textContent=items.length;
  g.innerHTML=items.map(function(x){return '<div class="entry"><div class="name">&#x2753; '+esc(x.n)+'</div><div class="desc" style="color:#64B5F6">'+esc(x.o)+'</div></div>'}).join('');
}
function filterEvents(){var q=(document.getElementById('eventSearch')||{}).value||'';q=q.toLowerCase();renderEvents(function(e){return !q||e.n.includes(q)||e.o.includes(q);});}

renderCards(function(){return 1;});renderRelics(function(){return 1;});renderEnemies(function(){return 1;});renderPotions(function(){return 1;});renderEvents(function(){return 1;});
</script>
</body>
</html>'''


# =======================================================================
#  BUILD HTML
# =======================================================================
with open('C:/Users/25065/Desktop/AI game/guide.html', 'w', encoding='utf-8') as f:

    # === HEAD ===
    f.write('<!DOCTYPE html>\n<html lang="zh-CN">\n<head>\n<meta charset="UTF-8">\n'
            '<meta name="viewport" content="width=device-width, initial-scale=1.0">\n'
            '<title>尖塔之魂 · 完整攻略</title>\n<style>' + CSS + '</style>\n</head>\n<body>\n')

    # === HEADER ===
    f.write('<div class="header"><h1>尖塔之魂 · 完整攻略</h1><span>新手入门 · 角色指南 · 流派构建 · Boss对策 · 全数据查询</span></div>\n')

    # === TABS ===
    f.write('<div class="tabs">\n')
    tabs = [
        ('home', '入门指南'),
        ('strategy', '角色攻略'),
        ('builds', '流派构建'),
        ('boss', 'Boss攻略'),
        ('cards', '卡牌图鉴'),
        ('relics', '遗物图鉴'),
        ('enemies', '敌人图鉴'),
        ('potions', '药水'),
        ('events', '事件'),
        ('mechanics', '机制数据'),
    ]
    first = True
    badge_map = {'cards': f' <span class="badge">{len(cards)}</span>',
                 'enemies': f' <span class="badge">{len(enemies)}</span>'}
    for tid, tname in tabs:
        cls = ' active' if first else ''
        first = False
        badge = badge_map.get(tid, '')
        f.write(f'  <button class="tab{cls}" data-tab="{tid}">{tname}{badge}</button>\n')
    f.write('</div>\n')

    # ===================================================================
    #  TAB: HOME - 入门指南
    # ===================================================================
    f.write(r'''<div class="content active" id="tab-home">
<div style="max-width:860px;margin:auto">

<h2 style="color:#FFD700;font-size:20px;margin:16px 0 10px">尖塔之魂 完全攻略</h2>
<p style="color:#bbb;font-size:13.5px;line-height:1.8">这是一款类<杀戮尖塔>的卡牌构筑游戏。你将选择一位角色攀登尖塔，每层三选一路线前进，击败怪物获取卡牌和遗物强化牌组，最终战胜每层Boss。<br>本攻略涵盖角色解析、流派构建、Boss对策、全数据查询等，助你轻松通关。</p>

<h3 style="color:#E040FB;margin:20px 0 10px">新手入门六条黄金法则</h3>
<div class="tip-box gold">1. <b>删牌比抓牌重要</b> — 牌组越精简越好，优先在商店移除打击/防御等基础牌。牌组越小，关键牌上手率越高。</div>
<div class="tip-box gold">2. <b>路线选择看Boss</b> — 根据Boss类型决定路线：打Aoe弱的Boss多走精英拿遗物，生存压力大就走篝火路线。</div>
<div class="tip-box gold">3. <b>精英不是必须打</b> — 第一幕精英较简单可优先打拿遗物，但第三幕精英往往非常危险，量力而行。</div>
<div class="tip-box gold">4. <b>优先拿过牌</b> — 过牌能力决定了牌组的上限，不能过牌的力量再高也打不出来。</div>
<div class="tip-box gold">5. <b>AOE是生存之本</b> — 多敌战斗频繁，至少要有1张AOE牌应对群怪，否则会被小怪群殴致死。</div>
<div class="tip-box gold">6. <b>血量是资源</b> — 不需要追求无伤过小怪。适当卖血走精英路线换取遗物，长远收益更大。</div>

<h3 style="color:#E040FB;margin:24px 0 10px">通用策略</h3>
<div class="strat-grid" style="grid-template-columns:1fr 1fr">
<div class="strat-card">
<h4>路线规划</h4>
<ul>
<li>看Boss决定路线 — 群战Boss需要AOE, 单体Boss需要爆发</li>
<li>幕1多走精英(较简单)拿遗物建立优势</li>
<li>幕2篝火重要 — 血量和升级需求大</li>
<li>幕3尽量跳过多精英路线, 留状态打Boss</li>
<li>商店楼层前留金币买关键遗物</li>
</ul>
</div>
<div class="strat-card">
<h4>牌组管理</h4>
<ul>
<li>牌组控制在25-35张最佳, 太多关键牌难上手</li>
<li>每张牌问自己: 它能改善我现在的战斗力吗?</li>
<li>不要为"未来可能有用"抓牌, 解决当前问题优先</li>
<li>移除诅咒牌优先级高于升级</li>
<li>事件中的删牌机会非常珍贵, 优先选</li>
</ul>
</div>
<div class="strat-card">
<h4>遗物优先级</h4>
<ul>
<li>能量遗物(符文穹顶/日晷等) — 更多能量=更多操作</li>
<li>过牌遗物(准备袋/墨水等) — 牌组运转核心</li>
<li>防御遗物(船锚/角钉等) — 缓解前期压力</li>
<li>成长遗物(金刚杵/手里剑等) — 长期收益</li>
<li class="highlight">会员卡 → 兵书 → 开心花 → 墨水(通用强)</li>
</ul>
</div>
<div class="strat-card">
<h4>商店购买优先级</h4>
<ol style="padding-left:18px;font-size:12.5px;color:#bbb">
<li>关键遗物(会员卡/金刚杵等) — 立即提升战力</li>
<li>移除诅咒/基础牌 — 精简牌组</li>
<li>关键卡牌 — 补强流派核心</li>
<li>药水 — 应急用, 战斗前记得喝</li>
<li>升级 — 篝火也能做, 优先级最低</li>
</ol>
</div>
</div>

<h3 style="color:#E040FB;margin:24px 0 10px">难度说明</h3>
<div style="background:#120828;border-radius:10px;padding:14px;margin-bottom:16px">
<table class="stance-table"><tr><th>难度</th><th>怪物HP</th><th>怪物伤害</th><th>初始抽牌</th><th>推荐</th></tr>
<tr><td>普通</td><td>×1.0</td><td>×1.0</td><td>5张</td><td>新手首选</td></tr>
<tr><td>困难</td><td>×1.3</td><td>×1.35</td><td>4张</td><td>熟悉后挑战</td></tr>
<tr><td>噩梦</td><td>×1.6</td><td>×1.7</td><td>4张</td><td>高手向</td></tr>
</table>
</div>

</div></div>
''')

    # ===================================================================
    #  TAB: STRATEGY - 角色攻略
    # ===================================================================
    f.write(r'''<div class="content" id="tab-strategy">
<div style="max-width:900px;margin:auto">

<h2 style="color:#FFD700;font-size:20px;margin:16px 0 10px">角色攻略</h2>

<!-- 铁甲 -->
<div class="char-banner" style="background:linear-gradient(135deg,rgba(255,68,68,0.08),rgba(20,8,40,0.8))">
<div class="icon">&#x1F525;</div>
<div class="info"><h2 style="color:#FF6B6B">铁甲战士</h2><p>初始遗物: 燃烧之血(战斗后回复10HP) | 核心机制: 力量叠层、自残增益、消耗体系<br>优势: 爆发高、回复强、AOE充足 | 劣势: 过牌慢、灵活度低</p></div>
</div>
<div class="strat-grid">
<div class="strat-card">
<h4>&#x1F3AF; 必抓核心牌</h4>
<div class="tip-box green"><b>力量核心:</b> 活动肌肉、突破极限、金刚臂、观察弱点、燃烧</div>
<div class="tip-box green"><b>过牌/运转:</b> 剑柄打击、战吼、燃烧契约、祭品、硬撑</div>
<div class="tip-box green"><b>防御:</b> 耸肩、坚毅、幽灵护甲、金属化、堡垒</div>
<div class="tip-box green"><b>AOE:</b> 旋风斩、燔祭、全体攻击、火山喷发</div>
<div class="tip-box red"><b>避坑:</b> 狂野打击(塞伤口)、燔祭(无AOE需求时别拿太多)</div>
</div>
<div class="strat-card">
<h4>&#x1F4A1; 玩法思路</h4>
<ul>
<li><b>力量流:</b> 快速叠力量 → 用多段攻击(金刚臂/双持)打出爆炸伤害</li>
<li><b>消耗流:</b> 腐化+黑暗之拥+坚毅 = 无限循环</li>
<li><b>自残流:</b> 撕裂+祭品+金属化 → 自残触发力量+防御</li>
<li>铁甲的最大问题是过牌, 遇到祭品/战吼/燃烧契约必抓</li>
<li>燃烧之血是极好的续航遗物, 可以利用它走精英路线</li>
</ul>
</div>
<div class="strat-card">
<h4>&#x1F91D; 关键Combo</h4>
<div class="combo-item"><div class="cname">腐化 + 黑暗之拥 + 坚毅</div><div class="cdesc">核心无限。腐化使技能牌0费消耗, 黑暗之拥抽牌, 坚毅格挡。启动后基本无敌</div></div>
<div class="combo-item"><div class="cname">突破极限 + 活动肌肉 + 金刚臂</div><div class="cdesc">力量乘法。活动肌肉给力量, 突破极限翻倍, 金刚臂多段打满</div></div>
<div class="combo-item"><div class="cname">祭品 + 撕裂 + 金属化</div><div class="cdesc">自残循环。祭品给能量过牌, 撕裂将自残转为力量, 金属化给格挡</div></div>
</div>
<div class="strat-card">
<h4>&#x26A1; 升级优先级</h4>
<p><b>T0(优先升级):</b> 祭品(抽更多)、活动肌肉(力量+抽牌)、突破极限</p>
<p><b>T1(推荐升级):</b> 旋风斩、金刚臂、耸肩、剑柄打击</p>
<p><b>T2:</b> 燃烧、战吼、硬撑</p>
</div>
</div>

<!-- 静默 -->
<div class="char-banner" style="background:linear-gradient(135deg,rgba(76,175,80,0.08),rgba(20,8,40,0.8));margin-top:20px">
<div class="icon">&#x1F5E1;</div>
<div class="info"><h2 style="color:#4CAF50">静默猎手</h2><p>初始遗物: 蛇之戒(首回合+1能+2抽) | 核心机制: 敏捷、毒药、小刀、弃牌<br>优势: 过牌极强、防御灵活、毒药无视格挡 | 劣势: 爆发慢、AOE依赖遗物</p></div>
</div>
<div class="strat-grid">
<div class="strat-card">
<h4>&#x1F3AF; 必抓核心牌</h4>
<div class="tip-box green"><b>毒药流:</b> 致命毒药、毒雾、催化、尸体爆炸、毒爆</div>
<div class="tip-box green"><b>小刀流:</b> 斗篷与匕首、刀锋风暴、淬毒刃、无限刀锋</div>
<div class="tip-box green"><b>过牌/运转:</b> 后空翻、杂技、战术家、计算下注、预谋</div>
<div class="tip-box green"><b>防御:</b> 扫腿、敏捷、残影、幽魂形态</div>
<div class="tip-box red"><b>避坑:</b> 玻璃刀刃(消耗掉就没了)、终结技(牌多才强)</div>
</div>
<div class="strat-card">
<h4>&#x1F4A1; 玩法思路</h4>
<ul>
<li><b>毒药流:</b> 叠毒→催化翻倍→尸体爆炸清场, 慢热但无视防御</li>
<li><b>小刀流:</b> 无限小刀→淬毒刃附加中毒→刀锋风暴AOE</li>
<li><b>弃牌流:</b> 杂技+战术家+计算下注 = 无限过牌+能量</li>
<li>静默过牌能力强, 牌组可以比铁甲稍大(35张左右)</li>
<li>蛇之戒提供了极好的开局, 首回合爆发力强</li>
</ul>
</div>
<div class="strat-card">
<h4>&#x1F91D; 关键Combo</h4>
<div class="combo-item"><div class="cname">催化 + 致命毒药 + 尸体爆炸</div><div class="cdesc">毒药标准终端。叠几层毒后催化翻倍, 尸体爆炸清场群杀</div></div>
<div class="combo-item"><div class="cname">杂技 + 战术家 + 计算下注</div><div class="cdesc">弃牌无限。每张弃牌=1能量, 配合清沙(弃牌伤敌)+坚韧绷带(弃牌得甲)</div></div>
<div class="combo-item"><div class="cname">幽魂形态 + 残影</div><div class="cdesc">无敌组合。幽魂形态使受伤降为1, 残影保留格挡</div></div>
</div>
<div class="strat-card">
<h4>&#x26A1; 升级优先级</h4>
<p><b>T0:</b> 催化(3→5倍)、致命毒药、幽魂形态</p>
<p><b>T1:</b> 后空翻、杂技、扫腿、斗篷与匕首</p>
<p><b>T2:</b> 毒雾、计算下注、足跟勾</p>
</div>
</div>

<!-- 机兵 -->
<div class="char-banner" style="background:linear-gradient(135deg,rgba(100,181,246,0.08),rgba(20,8,40,0.8));margin-top:20px">
<div class="icon">&#x1F52E;</div>
<div class="info"><h2 style="color:#64B5F6">机兵</h2><p>初始遗物: 裂变核心(开局2闪电球) | 核心机制: 球体、集中、循环、激发<br>优势: AOE王者、防御稳定、成长性强 | 劣势: 启动慢、怕集中被降</p></div>
</div>
<div class="strat-grid">
<div class="strat-card">
<h4>&#x1F3AF; 必抓核心牌</h4>
<div class="tip-box green"><b>集中:</b> 碎片整理、超频、偏差认知、能量护盾</div>
<div class="tip-box green"><b>球体:</b> 电击、冰川、寒冰、彩虹、混沌、暴风雪</div>
<div class="tip-box green"><b>运转:</b> 编译驱动、搜索、超频、重启、均衡</div>
<div class="tip-box green"><b>防御:</b> 冰川、飞跃、蒸汽护壁、缓冲</div>
<div class="tip-box red"><b>避坑:</b> 偏差认知(不加集中时会降集中)、过度耗能(吃球位)</div>
</div>
<div class="strat-card">
<h4>&#x1F4A1; 玩法思路</h4>
<ul>
<li><b>闪电AOE:</b> 电磁场+闪电球 = 每回合群伤, 配合碎片整理叠集中</li>
<li><b>冰霜龟缩:</b> 冰川+冰霜护符+冰核 = 每回合海量格挡</li>
<li><b>暗黑蓄力:</b> 养一个超大的暗黑球, 一次激发秒Boss</li>
<li>集中是机兵的生命线, 碎片整理必抓</li>
<li>循环牌可以让最右边的球体每回合多次触发</li>
</ul>
</div>
<div class="strat-card">
<h4>&#x1F91D; 关键Combo</h4>
<div class="combo-item"><div class="cname">电磁场 + 碎片整理 + 闪电球</div><div class="cdesc">闪电AOE核心。电磁场让闪电打全体, 碎片整理加集中, 配合风暴可一回合打几十AOE</div></div>
<div class="combo-item"><div class="cname">冰川 + 冰核 + 循环</div><div class="cdesc">冰霜龟缩。每回合海量冰霜球被动+激发, 几乎不掉血</div></div>
<div class="combo-item"><div class="cname">多重释放 + 暗黑球</div><div class="cdesc">蓄一个大暗黑球然后用多重释放反复激发, 一发秒Boss</div></div>
</div>
<div class="strat-card">
<h4>&#x26A1; 升级优先级</h4>
<p><b>T0:</b> 碎片整理(集中+1)、电磁场、冰川</p>
<p><b>T1:</b> 超频、编译驱动、重启、弹幕齐射</p>
<p><b>T2:</b> 飞跃、寒冰、风暴</p>
</div>
</div>

<!-- 观者 -->
<div class="char-banner" style="background:linear-gradient(135deg,rgba(171,139,255,0.08),rgba(20,8,40,0.8));margin-top:20px">
<div class="icon">&#x262F;</div>
<div class="info"><h2 style="color:#AD8BFF">观者</h2><p>初始遗物: 净水(最大能量+1) | 核心机制: 姿态切换、念力、神格<br>优势: 爆发极高、能量充足、上限天花板 | 劣势: 操作复杂、容易暴毙</p></div>
</div>
<div class="strat-grid">
<div class="strat-card">
<h4>&#x1F3AF; 必抓核心牌</h4>
<div class="tip-box green"><b>姿态核心:</b> 怒火、警惕、神格、以手抵心、宁静</div>
<div class="tip-box green"><b>输出:</b> 疾风连击、挥拳、以盾为祭、咬牙切齿</div>
<div class="tip-box green"><b>防御:</b> 精神壁垒、以手抵心、警惕、保护</div>
<div class="tip-box green"><b>过牌:</b> 内心平静、先见之明、评估、研习</div>
<div class="tip-box red"><b>避坑:</b> 过多神格牌(卡手)、不要拿太多高费牌</div>
</div>
<div class="strat-card">
<h4>&#x1F4A1; 玩法思路</h4>
<ul>
<li><b>怒火循环:</b> 进怒火→打爆发→转宁静回能→再进怒火</li>
<li><b>神格一拳:</b> 积累念力→进神格→一拳超人(伤害×3+吸血)</li>
<li><b>以盾为祭:</b> 把格挡转为伤害, 配合精神壁垒极强</li>
<li>观者能量充沛但容易暴毙, 优先确保防御</li>
<li>净水给额外能量, 但前期别抓太多高费牌</li>
</ul>
</div>
<div class="strat-card">
<h4>&#x1F91D; 关键Combo</h4>
<div class="combo-item"><div class="cname">怒火 + 疾风连击 + 内心平静</div><div class="cdesc">标准循环。怒火x2伤+疾风多段, 内心平静退宁静回能</div></div>
<div class="combo-item"><div class="cname">精神壁垒 + 以盾为祭 + 警惕</div><div class="cdesc">攻防一体。切换姿态得甲, 以盾为祭把甲变伤</div></div>
<div class="combo-item"><div class="cname">神格 + 咬牙切齿 + 以手抵心</div><div class="cdesc">神格爆发。进神格后咬牙切齿×3伤, 以手抵心吸血</div></div>
</div>
<div class="strat-card">
<h4>&#x26A1; 升级优先级</h4>
<p><b>T0:</b> 怒火(进怒火抽1)、以盾为祭、精神壁垒</p>
<p><b>T1:</b> 疾风连击、内心平静、咬牙切齿</p>
<p><b>T2:</b> 警惕、评估、先见之明</p>
</div>
</div>

<!-- 储君 -->
<div class="char-banner" style="background:linear-gradient(135deg,rgba(255,215,0,0.08),rgba(20,8,40,0.8));margin-top:20px">
<div class="icon">&#x2B50;</div>
<div class="info"><h2 style="color:#FFD700">储君 (隐藏角色)</h2><p>初始遗物: 天赋君权(每战3辉星, 战后回5HP) | 核心机制: 辉星、铸剑、仆从、无色四选一<br>优势: 体系多样、后期极强、可混搭 | 劣势: 上手复杂、前期弱</p></div>
</div>
<div class="strat-grid">
<div class="strat-card">
<h4>&#x1F3AF; 四大体系</h4>
<div class="tip-box gold"><b>辉星流:</b> 核心牌: 星爆/新月/超新星/伽马爆破。消耗辉星获得额外效果, 爆发高但资源有限</div>
<div class="tip-box gold"><b>铸剑流:</b> 核心牌: 淬炼刀刃/君王之剑/征服者。铸剑→锻造王刃→王刃输出, 成长型体系</div>
<div class="tip-box gold"><b>仆从流:</b> 核心牌: 忠仆/仆从打击/大军。积累仆从→仆从数提供攻防, 后期人海碾压</div>
<div class="tip-box gold"><b>无色流:</b> 核心: 棱彩之星/王令/洞悉万象。混搭其他职业卡, 上限极高但不稳定</div>
</div>
<div class="strat-card">
<h4>&#x1F4A1; 玩法思路</h4>
<ul>
<li>前期主抓一个体系, 不要分散投资</li>
<li>辉星流爆发最强, 但要注意辉星消耗管理</li>
<li>铸剑流最稳, 君王之剑0费保留+多段 = 稳定输出</li>
<li>仆从流前期较弱, 需要先积累仆从数</li>
<li>无色流适合熟悉游戏后挑战, 上限高但下限低</li>
<li>天赋君权+战后回血 = 续航优秀, 可走精英路线</li>
</ul>
</div>
</div>

</div></div>
''')

    # ===================================================================
    #  TAB: BUILDS - 流派构建
    # ===================================================================
    f.write(r'''<div class="content" id="tab-builds">
<div style="max-width:900px;margin:auto">
<h2 style="color:#FFD700;font-size:20px;margin:16px 0 10px">流派构建指南</h2>
<p style="color:#bbb;font-size:13px;margin-bottom:12px">每个流派的核心卡牌、关键遗物、玩法思路和强度评价。</p>

<div class="strat-grid">

<div class="strat-card">
<h3 style="color:#FF6B6B">力量流 — 铁甲</h3>
<div class="tip-box"><b>难度:</b> 简单 | <b>强度:</b> S级 | <b>启动速度:</b> 中</div>
<h4>&#x1F3F7; 核心卡</h4><p>活动肌肉(力量)、突破极限(翻倍)、金刚臂/双持(多段)、观察弱点</p>
<h4>&#x1F48E; 关键遗物</h4><p>金刚杵、手里剑、赤牛、红骷髅、墨水瓶</p>
<h4>&#x1F3AF; 构建思路</h4>
<p>前期先拿过牌和防御, 中期拿到活动肌肉或突破极限后开始叠力。多段攻击牌是输出终端。注意不要叠力太慢被小怪打死。</p>
<h4>&#x26A1; 推荐升级</h4><p>活动肌肉 > 金刚臂 > 突破极限</p>
</div>

<div class="strat-card">
<h3 style="color:#4CAF50">毒药流 — 静默</h3>
<div class="tip-box"><b>难度:</b> 中等 | <b>强度:</b> A级 | <b>启动速度:</b> 慢</div>
<h4>&#x1F3F7; 核心卡</h4><p>致命毒药、毒雾、催化、尸体爆炸、毒爆</p>
<h4>&#x1F48E; 关键遗物</h4><p>毒药瓶、样本、毒囊、锈蚀之刃</p>
<h4>&#x1F3AF; 构建思路</h4>
<p>核心是叠毒→催化翻倍→尸体爆炸清场。毒药无视格挡但需要回合数。催化升级后5倍翻倍是关键。注意Boss层毒抗性。</p>
<p class="highlight">催化是本流派的灵魂, 没遇到催化不要强行走毒药流!</p>
</div>

<div class="strat-card">
<h3 style="color:#64B5F6">闪电AOE流 — 机兵</h3>
<div class="tip-box"><b>难度:</b> 简单 | <b>强度:</b> S级 | <b>启动速度:</b> 中</div>
<h4>&#x1F3F7; 核心卡</h4><p>电磁场、碎片整理、风暴、电击、弹幕齐射</p>
<h4>&#x1F48E; 关键遗物</h4><p>数据盘、核能电池、镀金缆线、冰霜护符</p>
<h4>&#x1F3AF; 构建思路</h4>
<p>碎片整理叠集中, 电磁场让闪电打全体, 风暴一波爆发清场。集中是生命线, 至少2张碎片整理。配合循环每回合大量AOE。</p>
<p class="blk">小怪战和精英战都是顶级强度, 唯二弱点: 时间吞噬者(反馈)和觉醒者(能力加力)。</p>
</div>

<div class="strat-card">
<h3 style="color:#AD8BFF">怒火循环流 — 观者</h3>
<div class="tip-box"><b>难度:</b> 高 | <b>强度:</b> S+级 | <b>启动速度:</b> 快</div>
<h4>&#x1F3F7; 核心卡</h4><p>怒火、警惕(或内心平静)、疾风连击、精神壁垒、以盾为祭</p>
<h4>&#x1F48E; 关键遗物</h4><p>能量护符、净水、神泪、冰霜护符</p>
<h4>&#x1F3AF; 构建思路</h4>
<p>怒火(伤害x2)→打爆发→转宁静(+3能)→再怒火。循环中配合精神壁垒白嫖格挡, 以盾为祭将格挡转为伤害。</p>
<p class="highlight">理论上是游戏最强流派, 但操作要求高, 容易在怒火形态中暴毙。务必确保手中有格挡再进怒火。</p>
</div>

<div class="strat-card">
<h3 style="color:#FF9800">弃牌流 — 静默</h3>
<div class="tip-box"><b>难度:</b> 中等 | <b>强度:</b> A+级 | <b>启动速度:</b> 中快</div>
<h4>&#x1F3F7; 核心卡</h4><p>杂技、战术家、计算下注、清沙、坚韧绷带、终结技</p>
<h4>&#x1F48E; 关键遗物</h4><p>清沙、坚韧绷带、蛇之戒、墨水瓶</p>
<h4>&#x1F3AF; 构建思路</h4>
<p>弃牌=过牌+能量+伤害+防御。杂技弃抽3, 战术家让弃牌给能量, 清沙让弃牌打伤害, 绷带给格挡。无限循环的钥匙。</p>
</div>

<div class="strat-card">
<h3 style="color:#9C27B0">冰霜龟缩流 — 机兵</h3>
<div class="tip-box"><b>难度:</b> 简单 | <b>强度:</b> A级 | <b>启动速度:</b> 慢</div>
<h4>&#x1F3F7; 核心卡</h4><p>冰川、寒冰、冰霜护符、暴风雪、均衡</p>
<h4>&#x1F48E; 关键遗物</h4><p>冰核、冰霜护符、数据盘、核能电池</p>
<h4>&#x1F3AF; 构建思路</h4>
<p>冰川和寒冰生成大量冰球→每回合冰球被动给海量格挡→暴风雪把冰球数转为伤害。几乎不掉血, 但打得很慢。</p>
</div>

<div class="strat-card">
<h3 style="color:#FFD700">辉星爆发流 — 储君</h3>
<div class="tip-box"><b>难度:</b> 中等 | <b>强度:</b> A级 | <b>启动速度:</b> 中</div>
<h4>&#x1F3F7; 核心卡</h4><p>星爆、新月、超新星、伽马爆破、星之爆发</p>
<h4>&#x1F48E; 关键遗物</h4><p>辉星罗盘、星辰铸炉、天赋君权</p>
<h4>&#x1F3AF; 构建思路</h4>
<p>积累辉星→消耗辉星触发额外效果。新月的耗2辉星+18伤、伽马爆破的全辉星转AOE都是核心输出。注意不要把辉星用光。</p>
</div>

<div class="strat-card">
<h3 style="color:#4CAF50">消耗流 — 铁甲</h3>
<div class="tip-box"><b>难度:</b> 中等 | <b>强度:</b> S级 | <b>启动速度:</b> 慢</div>
<h4>&#x1F3F7; 核心卡</h4><p>腐化、黑暗之拥、坚毅、无惧之痛</p>
<h4>&#x1F48E; 关键遗物</h4><p>死灵书(消耗给牌)、医疗箱(状态0费消耗)、符文金字塔</p>
<h4>&#x1F3AF; 构建思路</h4>
<p>腐化使所有技能牌0费+消耗, 配合黑暗之拥抽牌=无限。坚毅和无惧之痛提供格挡。启动后每回合可打空牌组。死灵书配合更加恐怖。</p>
</div>

<div class="strat-card">
<h3 style="color:#64B5F6">小刀流 — 静默</h3>
<div class="tip-box"><b>难度:</b> 简单 | <b>强度:</b> A级 | <b>启动速度:</b> 快</div>
<h4>&#x1F3F7; 核心卡</h4><p>斗篷与匕首、刀锋风暴、淬毒刃、无限刀锋、小刀回收</p>
<h4>&#x1F48E; 关键遗物</h4><p>腕刃(0费伤+4)、清沙、苦无、手里剑</p>
<h4>&#x1F3AF; 构建思路</h4>
<p>铺小刀→淬毒刃附加中毒→刀锋风暴AOE+格挡。小刀是0费消耗, 配合腕刃+4伤, 手里剑叠力量, 爆发极快。注意续航问题。</p>
</div>

<div class="strat-card">
<h3 style="color:#E040FB">神格一拳流 — 观者</h3>
<div class="tip-box"><b>难度:</b> 高 | <b>强度:</b> S级 | <b>启动速度:</b> 慢</div>
<h4>&#x1F3F7; 核心卡</h4><p>神格、咬牙切齿、以手抵心、祈祷、圣洁</p>
<h4>&#x1F48E; 关键遗物</h4><p>神泪、净水、能量护符</p>
<h4>&#x1F3AF; 构建思路</h4>
<p>积累念力(祈祷/圣洁/神泪)→攒够10念力进神格→神格下伤害x3+吸血50%→一拳结束战斗。前期需要苟活攒念力, 爆发后毁天灭地。</p>
</div>

</div>

<h3 style="color:#E040FB;margin:20px 0 10px">流派强度天梯</h3>
<div style="background:#120828;border-radius:10px;padding:14px">
<table class="stance-table">
<tr><th>梯队</th><th>流派</th><th>角色</th><th>说明</th></tr>
<tr><td style="color:#FF6B6B"><b>S+</b></td><td>怒火循环流</td><td>观者</td><td>上限天花板, 但操作要求高</td></tr>
<tr><td style="color:#FF6B6B"><b>S</b></td><td>力量流</td><td>铁甲</td><td>简单粗暴, 稳定通Boss</td></tr>
<tr><td style="color:#FF6B6B"><b>S</b></td><td>闪电AOE流</td><td>机兵</td><td>小怪精英通吃, 成型即无敌</td></tr>
<tr><td style="color:#FF6B6B"><b>S</b></td><td>消耗流</td><td>铁甲</td><td>启动后无限循环</td></tr>
<tr><td style="color:#FF9800"><b>A+</b></td><td>弃牌流</td><td>静默</td><td>无限潜力, 需要关键遗物</td></tr>
<tr><td style="color:#FF9800"><b>A</b></td><td>毒药流</td><td>静默</td><td>稳但慢, 需要催化</td></tr>
<tr><td style="color:#FF9800"><b>A</b></td><td>小刀流</td><td>静默</td><td>爆发快, 续航略差</td></tr>
<tr><td style="color:#FF9800"><b>A</b></td><td>冰霜龟缩</td><td>机兵</td><td>最稳防御, 但输出慢</td></tr>
<tr><td style="color:#64B5F6"><b>B+</b></td><td>神格一拳</td><td>观者</td><td>秒天秒地, 启动困难</td></tr>
<tr><td style="color:#64B5F6"><b>B</b></td><td>辉星爆发</td><td>储君</td><td>爆发高但资源有限</td></tr>
</table>
</div>

</div></div>
''')

    # ===================================================================
    #  TAB: BOSS - Boss攻略
    # ===================================================================
    f.write(r'''<div class="content" id="tab-boss">
<div style="max-width:860px;margin:auto">
<h2 style="color:#FFD700;font-size:20px;margin:16px 0 10px">Boss攻略</h2>
<p style="color:#bbb;font-size:13px;margin-bottom:12px">每个Boss的机制分析和应对策略。颜色偏红的Boss更难对付。</p>

<div class="strat-grid">

<div class="strat-card boss-strat">
<h3>&#x1F99C; 史莱姆王 | 幕1 Boss</h3>
<p><b>HP:</b> 100 | <b>特性:</b> 半血分裂、召唤史莱姆</p>
<div class="tip-box red"><b>危险动作:</b> 半血后分裂成多个小史莱姆, 场次数量翻倍</div>
<p><b>策略:</b> 攒好AOE再打下半血, 分裂后一波AOE全清。建议用旋风斩/燔祭等AOE。也可以直接灌伤害秒掉(在半血前打出足够伤害)。</p>
<p><b>关键卡:</b> AOE卡、高爆发单体</p>
</div>

<div class="strat-card boss-strat">
<h3>&#x1F525; 六火亡魂 | 幕1 Boss</h3>
<p><b>HP:</b> 100 | <b>特性:</b> 先制4伤+2灼烧、召唤幽灵、半血暴怒</p>
<div class="tip-box red"><b>危险动作:</b> 先制塞灼烧(抽到自伤3) + 多段攻击(3x8)</div>
<p><b>策略:</b> 准备消耗灼烧的手段(医疗箱/过牌)。暴怒前攒好格挡, 暴怒后伤害翻倍。幽灵需要AOE清掉。力量不要叠太高, 会被它用。</p>
<p><b>关键卡:</b> 过牌(快速过掉灼烧)、AOE、稳定格挡</p>
</div>

<div class="strat-card boss-strat">
<h3>&#x26ED; 巨石守卫 | 幕1 Boss</h3>
<p><b>HP:</b> 90 | <b>特性:</b> 先制30甲、受击+2甲、半血狂暴</p>
<div class="tip-box"><b>特殊机制:</b> 初始30甲沉睡, 打醒后开始攻击。每受击一次+2甲。</div>
<p><b>策略:</b> 起手先破30甲(需要高伤单发)。半血前攒好力量和格挡, 半血后它+4力+3荆棘, 伤害很高。易伤对它效果很好。</p>
<p><b>关键卡:</b> 高伤单发(破甲)、易伤、稳定防御</p>
</div>

<div class="strat-card boss-strat">
<h3>&#x1F41D; 毒巢女王 | 幕1 Boss</h3>
<p><b>HP:</b> 80 | <b>特性:</b> 先制2毒、召唤虫卵、攻击叠毒</p>
<div class="tip-box green"><b>相对简单:</b> 幕1最弱的Boss, 血少且毒需要叠层</div>
<p><b>策略:</b> 速攻她。80血不多, 尽快输出。虫卵只有10血容易清掉。有解毒手段更好(药水/人工制品)。</p>
<p><b>关键卡:</b> 高爆发输出</p>
</div>

<div class="strat-card boss-strat">
<h3>&#x1F6E1; 守卫者 | 幕2 Boss</h3>
<p><b>HP:</b> 160 | <b>特性:</b> 受攻击+8甲、反射25%伤害、召唤甲壳怪、反击4</p>
<div class="tip-box red"><b>危险动作:</b> 反射伤害+召唤小怪+反伤荆棘, 打它会自伤</div>
<p><b>策略:</b> 不要无脑多段攻击(每次触发+8甲还反射)。用高伤单发或少段大伤。先清小怪再打本体。中毒/灼烧等DOT效果很好(不触发反射)。</p>
<p><b>关键卡:</b> DOT(毒/灼烧)、高伤单发、AOE清小怪</p>
</div>

<div class="strat-card boss-strat">
<h3>&#x1F6E1; 铜制机械 | 幕2 Boss</h3>
<p><b>HP:</b> 155 | <b>特性:</b> 受攻击+1力、破盾(有甲受额外伤)、100%吸血</p>
<div class="tip-box red"><b>极其危险!</b> 100%吸血意味着打不动它就永远打不死。破盾让你不敢叠甲。</div>
<p><b>策略:</b> 这是幕2最难的Boss之一。核心是爆发够高: 要么叠高力量一回合秒, 要么用毒(无视吸血)。破盾机制意味着格挡反而是累赘, 用铁甲的自残或观者的姿态比较有利。</p>
<p><b>关键卡:</b> 毒药(无视吸血)、超高爆发、不要依赖格挡</p>
</div>

<div class="strat-card boss-strat">
<h3>&#x1FA9E; 镜像统领 | 幕2 Boss</h3>
<p><b>HP:</b> 130 | <b>特性:</b> 反射15%伤害、召唤镜像碎片、二阶段强化</p>
<div class="tip-box"><b>机制:</b> 召唤的镜像碎片死亡时给主体+2力。半血进入二阶段(+4力+3荆棘)</div>
<p><b>策略:</b> 不要先杀碎片(会加主体力量)。直接集火本体。碎片只有18血, AOE扫掉但不刻意杀。二阶段前攒好防御。</p>
<p><b>关键卡:</b> 单体爆发、AOE(顺带清碎片)</p>
</div>

<div class="strat-card boss-strat">
<h3>&#x1F47E; 觉醒者 | 幕3 Boss</h3>
<p><b>HP:</b> 220 | <b>特性:</b> 能力牌+1力、召唤邪教徒、半血二阶段(+6力+6荆棘)</p>
<div class="tip-box red"><b>能力牌杀手!</b> 每打一张能力牌它+1力, 机兵/观者非常头疼</div>
<p><b>策略:</b> 限制能力牌使用! 打它之前不要拿太多能力牌。铁甲战士最克制它(能力牌少)。二阶段非常狂暴(+6力), 尽量在半血前压低血量, 二阶段一波爆发带走。毒药流也很有效。</p>
<p><b>关键卡:</b> 少用能力、毒药、爆发输出</p>
</div>

<div class="strat-card boss-strat">
<h3>&#x23F0; 时间吞噬者 | 幕3 Boss</h3>
<p><b>HP:</b> 210 | <b>特性:</b> 先制12伤+3易、反击5、反馈(按出牌数伤)</p>
<div class="tip-box red"><b>小牌组杀手!</b> 反馈机制按你出牌数量伤, 弃牌流/小刀流很伤</div>
<p><b>策略:</b> 先制易伤+伤害很疼, 开局就要叠甲或免易伤(生姜)。反击5意味着每次打它自伤5, 多段攻击非常亏。反馈每张牌伤20, 少出牌多过牌, 用大牌高效输出。毒药流依然稳定。</p>
<p><b>关键卡:</b> 高费高效牌、毒药、生姜(免易伤)</p>
</div>

<div class="strat-card boss-strat">
<h3>&#x1F480; 亡灵君主 | 幕3 Boss</h3>
<p><b>HP:</b> 140 | <b>特性:</b> 每回合召唤亡灵仆从(8血)</p>
<div class="tip-box green"><b>相对简单:</b> 不需要杀小怪, 直接杀本体就赢。有AOE会轻松很多。</div>
<p><b>策略:</b> 直接集火本体! 140血在幕3不算多。小怪只有8血, AOE顺手清掉, 不清也没事(杀本体就赢)。</p>
<p><b>关键卡:</b> 单体爆发、AOE</p>
</div>

<div class="strat-card boss-strat">
<h3>&#x1F5E1; 血狂 | 幕3 Boss</h3>
<p><b>HP:</b> 100 | <b>特性:</b> 先制3力、出牌即反伤、每回合+2力、半血二阶段</p>
<div class="tip-box red"><b>极致进攻!</b> 血狂没有防御动作、没有召唤、没有回复 — 全是攻击和加力量。打攻击牌它反5伤，打技能牌它反3伤，每回合还+2力。</div>
<p><b>策略:</b> 这是纯粹的DPS检测Boss。速战速决! 不要带太多低费小牌(每张触发反伤)。用高费高效的大牌打出爆发。能力牌不会触发反伤(它只反攻击和技能)，可以放心使用。力量叠好后一波爆发带走。拖到第4回合后每下攻击都能到30+伤害。</p>
<p><b>关键卡:</b> 高费高效牌、能力牌(安全)、爆发COMBO、易伤</p>
</div>

<div class="strat-card boss-strat">
<h3>&#x26A0; 熵变体 | 幕3 Boss</h3>
<p><b>HP:</b> 170 | <b>特性:</b> 先制塞伤口、吸血6%、半血狂暴、攻击塞伤口</p>
<div class="tip-box red"><b>消耗战!</b> 不断塞伤口压缩牌组, 还会吸血, 拖越久越不利</div>
<p><b>策略:</b> 需要处理伤口的手段(医疗箱/过牌)。尽快输出, 拖久了牌组全是伤口就打不了。半血后非常狂暴。高爆发一波带走最好。</p>
<p><b>关键卡:</b> 医疗箱(让伤口0费消耗)、高爆发、过牌</p>
</div>

</div>
</div></div>
''')

    # ===================================================================
    #  TAB: CARDS - 卡牌图鉴
    # ===================================================================
    f.write(r'''<div class="content" id="tab-cards">
<h2 style="color:#FFD700;margin:8px 0">卡牌图鉴</h2>
<div class="search-bar">
  <input type="text" id="cardSearch" placeholder="搜索卡牌名称/效果..." oninput="filterCards()">
  <select id="cardType" onchange="filterCards()"><option value="">全部类型</option><option value="attack">攻击</option><option value="skill">技能</option><option value="power">能力</option></select>
  <select id="cardRarity" onchange="filterCards()"><option value="">全部稀有度</option><option value="basic">基础</option><option value="common">普通</option><option value="uncommon">罕见</option><option value="rare">稀有</option></select>
</div>
<div class="filter-bar" id="charFilter">
  <button class="filter-btn active" data-char="" onclick="setCharFilter(this,'')">全部</button>
  <button class="filter-btn" data-char="ironclad" onclick="setCharFilter(this,'ironclad')">&#x1F525;铁甲</button>
  <button class="filter-btn" data-char="silent" onclick="setCharFilter(this,'silent')">&#x1F5E1;静默</button>
  <button class="filter-btn" data-char="defect" onclick="setCharFilter(this,'defect')">&#x1F52E;机兵</button>
  <button class="filter-btn" data-char="watcher" onclick="setCharFilter(this,'watcher')">&#x262F;观者</button>
  <button class="filter-btn" data-char="regent" onclick="setCharFilter(this,'regent')">&#x2B50;储君</button>
  <button class="filter-btn" data-char="neutral" onclick="setCharFilter(this,'neutral')">无色</button>
</div>
<p class="count">共 <b id="cardCount">0</b> 张</p>
<div class="card-grid" id="cardGrid"></div>
</div>
''')

    # ===================================================================
    #  TAB: RELICS - 遗物图鉴
    # ===================================================================
    f.write(r'''<div class="content" id="tab-relics">
<h2 style="color:#FFD700;margin:8px 0">遗物图鉴</h2>
<div class="search-bar"><input type="text" id="relicSearch" placeholder="搜索遗物..." oninput="filterRelics()"></div>
<p class="count">共 <b id="relicCount">0</b> 件</p>
<div class="card-grid" id="relicGrid"></div>
</div>
''')

    # ===================================================================
    #  TAB: ENEMIES - 敌人图鉴
    # ===================================================================
    f.write(r'''<div class="content" id="tab-enemies">
<h2 style="color:#FFD700;margin:8px 0">敌人图鉴</h2>
<div class="search-bar">
  <input type="text" id="enemySearch" placeholder="搜索敌人..." oninput="filterEnemies()">
  <select id="enemyAct" onchange="filterEnemies()"><option value="">全部幕</option><option value="1">幕1</option><option value="2">幕2</option><option value="3">幕3</option></select>
  <select id="enemyType" onchange="filterEnemies()"><option value="">全部类型</option><option value="normal">普通</option><option value="elite">精英</option><option value="boss">Boss</option></select>
</div>
<p class="count">共 <b id="enemyCount">0</b> 个</p>
<div class="card-grid" id="enemyGrid"></div>
</div>
''')

    # ===================================================================
    #  TAB: POTIONS - 药水
    # ===================================================================
    f.write(r'''<div class="content" id="tab-potions">
<h2 style="color:#FFD700;margin:8px 0">药水大全</h2>
<div class="search-bar"><input type="text" id="potionSearch" placeholder="搜索药水..." oninput="filterPotions()"></div>
<p class="count">共 <b id="potionCount">0</b> 种</p>
<div class="card-grid" id="potionGrid"></div>
</div>
''')

    # ===================================================================
    #  TAB: EVENTS - 事件
    # ===================================================================
    f.write(r'''<div class="content" id="tab-events">
<h2 style="color:#FFD700;margin:8px 0">随机事件</h2>
<div class="search-bar"><input type="text" id="eventSearch" placeholder="搜索事件..." oninput="filterEvents()"></div>
<p class="count">共 <b id="eventCount">0</b> 个</p>
<div class="card-grid" id="eventGrid"></div>
</div>
''')

    # ===================================================================
    #  TAB: MECHANICS - 机制数据
    # ===================================================================
    f.write(r'''<div class="content" id="tab-mechanics">
<h2 style="color:#FFD700;margin:8px 0">机制数据</h2>
<div class="mech-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:14px">

<div class="strat-card"><h3>&#x2694;&#xFE0F; 伤害公式</h3>
<div class="tip-box">d = (base + strength x 1.5/hitCnt)</div>
<ul><li>力量: 每点+1.5伤害(多段分摊)</li><li>虚弱: d x 0.75</li><li>怒火姿态: x2</li><li>神格姿态: x(divineWrath)</li><li>上限: x8(神格+神威x12)</li><li>易伤: 独立 x1.5(手钻x2)</li><li>血怒玺戒: x1.5</li></ul></div>

<div class="strat-card"><h3>&#x1F52E; 球体系统</h3>
<p>集中阈值: <span class="highlight">12</span>(超12后半效)</p>
<table class="stance-table"><tr><th>类型</th><th>被动</th><th>激发</th></tr>
<tr><td style="color:#FFD700">&#x26A1;闪电</td><td>7+eff伤</td><td>18+effx2伤</td></tr>
<tr><td style="color:#64B5F6">&#x2744;冰霜</td><td>6+eff甲</td><td>12+eff甲</td></tr>
<tr><td style="color:#9C27B0">&#x1F311;暗黑</td><td>蓄15+eff</td><td>释放全体</td></tr>
<tr><td style="color:#AD8BFF">&#x26A1;等离子</td><td>+3能</td><td>+4能</td></tr>
</table></div>

<div class="strat-card"><h3>&#x262F; 姿态系统</h3>
<table class="stance-table"><tr><th>姿态</th><th>效果</th></tr>
<tr><td style="color:#FF6B6B">&#x1F525;怒火</td><td>伤害x2, 受伤x1.5</td></tr>
<tr><td style="color:#64B5F6">&#x1F4A7;宁静</td><td>退出时+3(+1)能量</td></tr>
<tr><td style="color:#FFD700">&#x2728;神格</td><td>伤害x(divineWrath), 吸血50%</td></tr>
</table>
<p style="margin-top:6px">精神壁垒: 切换得甲 | 风暴: 切换AOE | 阴阳: 切换抽牌+甲</p></div>

<div class="strat-card"><h3>&#x1F4AA; Buff/Debuff</h3>
<table class="stance-table"><tr><th>效果</th><th>说明</th></tr>
<tr><td style="color:#FF6B6B">力量</td><td>每点+1.5伤</td></tr>
<tr><td style="color:#64B5F6">敏捷</td><td>每点+1.5甲</td></tr>
<tr><td style="color:#AD8BFF">集中</td><td>每点+1球体效果</td></tr>
<tr><td style="color:#9C27B0">金属化</td><td>每回+金属化数甲</td></tr>
<tr><td style="color:#4CAF50">荆棘</td><td>受伤反弹</td></tr>
<tr><td style="color:#E040FB">缓冲</td><td>抵挡伤害</td></tr>
<tr><td style="color:#FF9800">易伤</td><td>受伤+50%(手钻+100%)</td></tr>
<tr><td style="color:#64B5F6">虚弱</td><td>伤害-25%(纸鹤-50%)</td></tr>
<tr><td style="color:#4CAF50">中毒</td><td>每回毒伤, 上限99</td></tr>
</table></div>

<div class="strat-card"><h3>&#x1F3F7; 敌人公式</h3>
<div class="tip-box">hp = (hb + floor x hs x hpBase) x diffHp</div>
<div class="tip-box">dmg = (base + floor x dScale) x diffDmg</div>
<ul><li>hpBase = 1.0 + act x 0.45</li><li>dScale: 幕1=0.60, 幕2=0.80, 幕3=1.00</li><li>bScale: 幕1=0.30, 幕2=0.40, 幕3=0.50</li><li>diffHp = 1 + diff x 0.30</li><li>diffDmg = 1 + diff x 0.35</li></ul></div>

<div class="strat-card"><h3>&#x1F3B2; 稀有度权重</h3>
<table class="stance-table"><tr><th>幕</th><th>稀有</th><th>罕见</th></tr>
<tr><td>幕1</td><td>x0.30</td><td>x0.80</td></tr>
<tr><td>幕2</td><td>x0.55</td><td>x1.00</td></tr>
<tr><td>幕3</td><td>x1.00</td><td>x1.00</td></tr></table>
<p>初始抽牌: 5张(困难/噩梦-1, 蛇戒+2)</p></div>

<div class="strat-card"><h3>&#x1F504; 回合流程</h3>
<ol style="padding-left:18px;font-size:12.5px;color:#bbb;line-height:1.8">
<li>能量恢复(冰淇淋保留)、格挡重置</li>
<li>Buff衰减: 虚弱/易伤-1(萝卜/生姜免疫)</li>
<li>触发: 金属化、恶魔形态、毒雾、球体被动</li>
<li>抽牌: 计算张数后抽牌</li>
<li>出牌: 自由出牌阶段</li>
<li>结束: 弃牌、触发遗物</li>
<li>敌人回合: 执行意图</li>
</ol></div>

<div class="strat-card"><h3>&#x2B50; 储君体系</h3>
<p><span class="highlight">辉星:</span> 消耗辉星获得爆发效果</p>
<p><span class="highlight">铸剑:</span> 积累铸剑锻造君王之剑(0费保留, 铸剑x6/10伤)</p>
<p><span class="highlight">仆从:</span> 积累仆从数提供攻防加成</p>
<p><span class="highlight">无色流:</span> 混搭其他职业卡, 跨体系组合</p></div>

<div class="strat-card"><h3>&#x1F30A; 潮汐系统</h3>
<p>Lv 0-10, 三种相位轮换</p>
<ul><li>相位0(涌): Lv伤害/甲</li><li>相位1(回): Lv/2+抽1+1能</li><li>相位2(怒): Lv+3+Lvx3甲</li></ul>
<p>回响: Lv3首技-1费 | Lv6首攻+3 | Lv9回始抽1</p></div>

<div class="strat-card"><h3>&#x1F4A0; 特殊状态</h3>
<table class="stance-table"><tr><th>牌</th><th>效果</th></tr>
<tr><td>伤口</td><td>占据手牌无法打出</td></tr>
<tr><td>晕眩</td><td>占据手牌无法打出</td></tr>
<tr><td>灼烧</td><td>抽到自伤3;消耗</td></tr>
<tr><td>小刀</td><td>0费6/9伤;消耗</td></tr>
<tr><td>重击</td><td>0费14伤;消耗</td></tr>
<tr><td>护盾</td><td>0费14甲;消耗</td></tr>
</table></div>

</div>
</div>
''')

    # === FOOTER JS ===
    f.write(JS_HEAD)

print(f"Guide rebuilt: {len(open('C:/Users/25065/Desktop/AI game/guide.html', 'r', encoding='utf-8').read())} bytes")
print("Done!")
