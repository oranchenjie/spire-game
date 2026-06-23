// ================================================================
//  尖塔之魂 — Spire Soul
//  完整游戏脚本 (v2.0)
//  结构: 初始化 → 工具函数 → 伤害系统 → 球体/姿态 → 卡牌定义
//        → 状态/药水/遗物 → 敌人/关卡/事件 → 游戏状态/存档
//        → 战斗系统(抽牌-开始-出牌-结束-敌人) → 流程(胜利-奖励-商店-篝火)
//        → 渲染系统(背景-敌人-玩家-手牌-特效-UI) → 输入 → 主循环
// ================================================================

// ==================== 画布/DOM 初始化 ====================
const canvas=document.getElementById('C'),ctx=canvas.getContext('2d');
const W=960,H=700,$=id=>document.getElementById(id);
canvas.setAttribute('tabindex','0');canvas.style.outline='none';
const hpEl=$('dHp'),mhEl=$('dMh'),epEl=$('dEp'),gpEl=$('dGp');
const flEl=$('dFl'),dkEl=$('dDk'),dsEl=$('dDs'),roomEl=$('dRoom');
const startScreen=$('startScreen'),overScreen=$('overScreen');
const finalFloor=$('finalFloor'),finalKills=$('finalKills');

function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.random()*i|0;[a[i],a[j]]=[a[j],a[i]]}return a}
function rand(mn,mx){return mn+Math.random()*(mx-mn+1)|0}
function pick(a){return a[rand(0,a.length-1)]}

let effects=[],shakeX=0,shakeY=0,shakeIntensity=0,enemyFlash=-1,playerFlash=-1,damageFlash=0,blockRings=[],stanceGlow=0;
function addLog(t){if(G){G._log.unshift(t);if(G._log.length>50)G._log.pop();}}
function addFX(x,y,t,c,s){effects.push({x,y,text:t,color:c,life:70,maxLife:70,size:s||16,dy:-0.4})}
function screenShake(n){shakeIntensity=Math.max(shakeIntensity,n);}
function flashEnemy(){enemyFlash=8;}
function flashPlayer(){playerFlash=8;}
// 粒子特效: 打出攻击牌时
function addHitParticles(x,y,color,count){
  for(let i=0;i<count;i++){
    const angle=Math.random()*Math.PI*2,speed=1+Math.random()*3;
    effects.push({x,y,text:'',color,life:20+rand(0,10),maxLife:30,size:3,dy:0,particle:true,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed});
  }
}
// 卡牌打出特效: 从手牌位置飞向敌人
function addPlayEffect(cardName,cx,cy){
  effects.push({x:cx,y:cy,text:'⚡'+cardName+'!',color:'#FFD700',life:35,maxLife:35,size:22,dy:-1.2,glow:true});
  addHitParticles(cx,cy,'#FFD700',6);
}

// ==================== 伤害系统 ====================
function dmgEnemy(e,b,g){
  if(!e||e.hp<=0)return 0;var d=b;if(!g._orbDmg){d+=g.strength||0;}if(g.wristBladeBonus)d+=g.wristBladeBonus;if(g._akabekoBonus){d+=g._akabekoBonus;g._akabekoBonus=0;}
    if((g.weak||0)>0)d=Math.floor(d*0.75);
  var dmgMult=1.0;
  if(!g._orbDmg){
    if(g._phantasmalActive){dmgMult+=0.5;addLog("👻 幻影+50%");}
    if((e.vulnerable||0)>0){var vMul=g.relics&&g.relics.some(r=>r.id==="handDrill")?1.0:0.5;dmgMult+=vMul;}
    if(g.stance==="wrath"){dmgMult+=1.0;}
    if(g.stance==="divinity"){dmgMult+=(g.divineWrath||3)-1;}
  }
  if(g.relics&&g.relics.some(r=>r.id==="theBoot")&&e.hp<=e.maxHp*0.5){d+=5;addFX(480,120,"👢铁靴!+5","#FF9800");}
  if(dmgMult>1.0)d=Math.floor(d*dmgMult);
// 神威:吸血50%
  if(g.stance==='divinity'&&g.divineWrath>0){const heal=Math.ceil(d*0.5);if(heal>0&&e.hp>0){g.hp=Math.min(g.maxHp,g.hp+heal);}}
  d=Math.max(0,d);if(e._thorns>0){d=Math.max(0,d-e._thorns);addFX(480,140,"🌵盾刺","#4CAF50");}
  const ab=Math.min(e.block||0,d);e.block-=ab;
  if(ab>0)addFX(480,140,'🛡️-'+ab,'#64B5F6',14);
  // 施虐本性: 攻击有Debuff的敌人额外伤害
  if(g.sadisticNature>0&&(e.weak||e.vulnerable||e.poison)){d+=g.sadisticNature;addFX(480,120,'💉施虐!+'+(g.sadisticNature),'#E040FB');addLog('💉 施虐本性+'+g.sadisticNature+'伤害');}
  // 折磨: 攻击有Debuff敌人追加伤害
  if(g.torment>0&&(e.weak||e.vulnerable||e.poison)){d+=g.torment;addFX(480,120,'😈折磨!+'+(g.torment),'#9C27B0');}
  let de=d-ab;if(de>0){
    e.hp-=de;if(de>=5)screenShake(5);else screenShake(2);
    flashEnemy();addHitParticles(480,125,'#FF4444',5+Math.floor(de/3));
    addFX(460+rand(0,40),120+rand(0,15),'-'+de,de>=10?'#FF0000':de>=5?'#FF6B6B':'#FFAA6B',22+Math.min(de,6));
    addLog('💥 对'+(e.name||'敌人')+'造成'+de+'伤害');
    // 敌人死亡特效(最后一击暗影消散)
    if(e.hp<=0){
      const isLast=g.enemies.every(o=>o.hp<=0);
      if(isLast){g._killDelay=35;screenShake(18);g._killFlash=20;
        // 暗影冲击波(向外扩散的暗红粒子环)
        for(let i=0;i<50;i++){const a=Math.random()*Math.PI*2,s=3+Math.random()*12;
          effects.push({x:e.x||480,y:125,text:'',color:pick(['#440000','#660000','#880000','#330011']),life:15+rand(0,20),maxLife:35,size:3+rand(0,8),dy:0,particle:true,vx:Math.cos(a)*s,vy:Math.sin(a)*s,glow:true});}
        // 灰烬飘散
        for(let i=0;i<25;i++){const a=-0.5+Math.random()*1;
          effects.push({x:(e.x||480)-40+Math.random()*80,y:100+Math.random()*50,text:'',color:pick(['#666','#888','#999','#555']),life:25+rand(0,20),maxLife:45,size:1+rand(0,3),dy:0,particle:true,vx:Math.cos(a)*0.5,vy:-0.5-Math.random()*2,glow:false});}
        addLog('💀 '+(e.name||'')+'被终结');}
      else{addFX(e.x||480,125,'💀','#FF4444',32);addHitParticles(e.x||480,125,'#FF6600',12);screenShake(8);}
      addLog('💀 '+(e.name||'敌人')+'死亡');
      // 自爆者:死亡对玩家造成伤害
      if(e.tpl&&e.tpl.id==='exploder'){const d=8;dmgPlayerD(g,d);addFX(480,260,'\u{1f4a5}自爆!'+d+'伤','#FF4400');addLog('\u{1f4a5} 自爆者爆炸!'+d+'伤害');}
    }
  }
  if(ab>0)addLog('🛡️ '+(e.name||'敌人')+'格挡吸收了'+ab+'伤害');
  if(G&&G._combatStats)G._combatStats.dmgDealt=(G._combatStats.dmgDealt||0)+de;return de;
}
// -------- 玩家受伤 --------
function dmgPlayer(g,b,enemy){
  let d=b+(enemy.strength||0);
  if((enemy.weak||0)>0)d=Math.floor(d*(g.relics&&g.relics.some(r=>r.id==='paperKrane')?0.50:0.75));
  if((g.vulnerable||0)>0)d=Math.floor(d*1.5);
  // 观者: 怒火姿态受伤×1.5
  if(g.stance==='wrath')d=Math.floor(d*1.5);
  d=Math.max(0,d);
  // 化石螺旋:首次伤害免疫
  if(G._fossilHelix&&d>0){G._fossilHelix=false;addFX(480,260,'🧬化石螺旋!','#64B5F6');addLog('🧬 化石螺旋抵挡伤害');d=0;}
  const ab=Math.min(g.block,d);g.block-=ab;
  let de=d-ab;if(de>0){
	    // 缓冲:抵挡伤害
	    if(g.buffer>0&&de>0){g.buffer--;addFX(480,260,'🛡缓冲!','#64B5F6');addLog('🛡 缓冲抵挡'+de+'伤');de=0;}
    // 幽魂形态:伤害降为1
    if(g.wraithForm>0&&de>0){de=1;addFX(480,260,'👻幽魂形态!','#9C27B0');addLog('👻 幽魂形态:伤害降为1');}

    // 钨棒:减伤1
    let actualDe=de;
    if(g.relics&&g.relics.some(r=>r.id==='tungstenRod')){actualDe=Math.max(1,actualDe-1);addFX(480,260,'🥢钨棒-1','#AD8BFF');}
    // 鸟居:≤5伤降为1
    if(g.relics&&g.relics.some(r=>r.id==='torii')&&actualDe<=5){actualDe=1;addFX(480,260,'⛩️鸟居!','#FF9800');}
    // 护盾发生器: 首次受伤-5
    if(g.relics&&g.relics.some(r=>r.id==='shieldGen')&&!g._shieldGenUsed){actualDe=Math.max(0,de-5);g._shieldGenUsed=true;if(actualDe<de)addFX(480,260,'🛡️护盾!','#64B5F6');}
    g.hp=Math.max(0,g.hp-actualDe);if(G&&G._combatStats)G._combatStats.dmgTaken=(G._combatStats.dmgTaken||0)+actualDe;if(actualDe>0)G._hpLostCombat=(G._hpLostCombat||0)+actualDe;damageFlash=1;if(actualDe>0)addLog('💔 受到'+actualDe+'伤害');
    if(g.reprisal>0&&actualDe>0){g.enemies.forEach(e=>{if(e.hp>0)dmgEnemy(e,g.reprisal,g);});addFX(480,200,'💥报复!','#FF6B6B');addLog('💥 报复触发!');}
    if(actualDe>0)addFX(460+rand(0,40),250+rand(0,10),'-'+actualDe,'#FF0000',22);
    if(g.rage>0){g.block+=g.rage;addFX(480,280,'💢愤怒!','#FF6B6B');}
    if(g.relics&&g.relics.some(r=>r.id==='clay')){g.block+=5;addFX(480,260,'🧱粘土!+5甲','#8D6E63');}
  }
  return de;
}
// -------- 直接伤害(自残) + 铁血/撕裂 --------
function dmgPlayerD(g,r){if(g._classPassive==='ironclad'&&r>0&&g.strength!==undefined){const bonus=Math.min(r,2);g.strength+=bonus;g.block+=bonus*2;addFX(480,250,'🔥铁血+'+(bonus)+'力+'+(bonus*2)+'甲','#FF6B6B');addLog('🔥 铁血:自残+'+(bonus)+'力+'+(bonus*2)+'甲');}
  g.hp=Math.max(0,g.hp-r);
  if(r>0&&g.rupture>0){g.strength+=g.rupture;addFX(480,280,'💥撕裂!','#FF6B6B');}
}
// ==================== 机兵·球体系统 ====================
// channel: 生成球, 超频被动(每4球+1集中)
function channel(g,type,p=1){if(g._classPassive==='defect'){g._defectOrbs=(g._defectOrbs||0)+1;if(g._defectOrbs>=3){g._defectOrbs=0;g.focus=(g.focus||0)+2;addFX(480,240,'🔮超频:集中+1','#AD8BFF');addLog('🔮 超频:生成4球集中+1');}}
  if(!g.orbs)g.orbs=[];if(!g.maxOrbs)g.maxOrbs=3;
  const orb={type,potency:p};
  if(g.orbs.length>=g.maxOrbs)evoke(g,0);
  g.orbs.push(orb);addLog('🔮 生成:'+(type||'?')+'球');
}
function evoke(g,i){g._orbDmg=true;
  if(!g.orbs||i>=g.orbs.length)return;
  const orb=g.orbs.splice(i,1)[0];
  const eff=Math.floor((g.focus||0)*0.5);
  switch(orb.type){
    case'lightning':{const tg=g.enemies.find(e=>e.hp>0);if(tg)dmgEnemy(tg,8+eff*2,g);addFX(480,130,'⚡激发!'+(8+eff*2),'#FFD700');}break;
    case'frost':g.block+=5+eff;addFX(480,260,'❄冰甲+'+(4+eff),'#64B5F6');break;
        case'dark':{const dmg=G._darkPool||0;G._darkPool=0;G.enemies.forEach(e=>{if(e.hp>0)dmgEnemy(e,dmg,g);});addFX(480,130,'🌑暗黑!'+((dmg||0))+'伤','#9C27B0');}break;
case'plasma':g.energy=Math.min(g.maxEnergy+2,g.energy+2);addFX(480,260,'⚡等离子+2能','#AD8BFF');break;
  }
  if(G.relics&&G.relics.some(r=>r.id==='emotionChip')&&!G._emotionUsed){G._emotionUsed=true;const eff2=Math.floor((g.focus||0)*0.5);switch(orb.type){case'lightning':{const tg=g.enemies.find(e=>e.hp>0);if(tg)dmgEnemy(tg,8+eff2*2,g);addFX(480,130,'⚡情感!'+(8+eff2*2),'#FFD700');}break;case'frost':g.block+=4+eff2;addFX(480,260,'❄情感+'+eff2+'甲','#64B5F6');break;case'dark':{const dmg2=G._darkPool||0;G._darkPool=0;G.enemies.forEach(e=>{if(e.hp>0)dmgEnemy(e,dmg2,g);});addFX(480,130,'🌑情感!'+((dmg2||0))+'伤','#9C27B0');}break;case'plasma':const pB2=G.relics&&G.relics.some(r=>r.id==='goldPlatedCables')?1:0;g.energy=Math.min(g.maxEnergy+2+pB2,g.energy+2+pB2);addFX(480,260,'⚡情感+'+(2+pB2)+'能','#AD8BFF');break;}addLog('🔮 情感芯片:额外激发!');}addLog('🔮 激发:'+(orb?orb.type:'?')+'球');
}
function orbPassive(g){if(g.loop>0&&g.orbs&&g.orbs.length>0){const rightmost=g.orbs[g.orbs.length-1];if(rightmost){for(let l=0;l<g.loop;l++){const eff=Math.floor((g.focus||0)*0.5);switch(rightmost.type){case'lightning':{if(g.electro)g.enemies.forEach(e=>{if(e.hp>0)dmgEnemy(e,2+eff,g);});else{const tg=g.enemies.find(e=>e.hp>0);if(tg)dmgEnemy(tg,3+eff,g);}}break;case'frost':g.block+=2+eff;g._totalFrost=(g._totalFrost||0)+1;break;case'dark':g._darkPool=(g._darkPool||0)+(6+eff);break;case'plasma':g.energy=Math.min(g.maxEnergy+1,g.energy+1);break;}}}addFX(480,240,'🔄循环!','#AD8BFF');}
  if(!g.orbs||!g.orbs.length)return;
  (g.orbs||[]).forEach(orb=>{g._orbDmg=true;
    const eff=Math.floor((g.focus||0)*0.5);
    switch(orb.type){
      case'lightning':{if(g.electro)g.enemies.forEach(e=>{if(e.hp>0)dmgEnemy(e,2+eff,g);});else{const tg=g.enemies.find(e=>e.hp>0);if(tg)dmgEnemy(tg,3+eff,g);}g._totalLightning=(g._totalLightning||0)+1;}break;
      case'frost':g.block+=2+eff;g._totalFrost=(g._totalFrost||0)+1;break;
            case'dark':g._darkPool=(g._darkPool||0)+(6+eff);break;
case'plasma':const pP=G.relics&&G.relics.some(r=>r.id==='goldPlatedCables')?2:1;g.energy=Math.min(g.maxEnergy+pP,g.energy+pP);break;
    }
  });
}

// ==================== 观者·姿态系统 ====================
// 切换姿态: 退出宁静+3能, 精神壁垒, 风暴姿态, 阴阳, 能量护符等触发
function setStance(g,s){
  const oldStance=g.stance;
  const stanceNames={wrath:'🔥怒火',calm:'💧宁静',divinity:'✨神格'};
  if(oldStance!==s&&oldStance!=='neutral')addLog('姿态:'+(stanceNames[oldStance]||oldStance)+'→'+(stanceNames[s]||s));
  else if(s!=='neutral')addLog('进入'+(stanceNames[s]||s));
  if(oldStance==='calm'){const calmBonus=g._classPassive==='watcher'?1:0;g.energy=Math.min(g.maxEnergy+3+calmBonus,g.energy+3+calmBonus);addFX(480,200,'💧退出宁静+'+(3+calmBonus)+'能','#64B5F6');addHitParticles(480,200,'#64B5F6',8);}
  // 精神壁垒: 切换姿态时获得格挡
  if(g.mentalFortress>0&&oldStance!==s){g.block+=g.mentalFortress;addFX(480,240,'🧱精神壁垒+'+(g.mentalFortress),'#64B5F6');addLog('🧱 精神壁垒+'+g.mentalFortress+'格挡');}
  // 风暴姿态:切换姿态AOE
  if(g.stormStance>0&&oldStance!==s){g.enemies.forEach(e=>{if(e.hp>0)dmgEnemy(e,g.stormStance,g);});addFX(480,100,'⛈风暴!','#64B5F6');}
  // 暗影姿态:切换姿态全体毒
  if(g.shadowStance>0&&oldStance!==s){g.enemies.forEach(e=>{if(e.hp>0){e.poison=(e.poison||0)+g.shadowStance;}});addFX(480,100,'🌑暗影姿态!','#9C27B0');addLog('🌑 暗影姿态:全体'+g.shadowStance+'毒');}
  // 阴阳:切换姿态抽牌+甲
  if(g.yinYang>0&&oldStance!==s){drawCards(g.yinYang);g.block+=g.yinYang;if(g.yinYang>=2)g.energy=Math.min(g.maxEnergy,g.energy+1);addFX(480,220,'☯阴阳!','#9C27B0');addLog('☯ 阴阳:抽'+(g.yinYang)+'+'+(g.yinYang)+'甲');}
  // 能量护符:进入姿态+2甲
  if(g.relics&&g.relics.some(r=>r.id==='energyTalisman')&&oldStance!==s){drawCards(1);addFX(480,220,'🔮能量护符+3+抽1','#64B5F6');}
  // 急袭: 切换姿态时从弃牌堆返回手牌
  if(oldStance!==s){
    for(let i=g.discard.length-1;i>=0;i--){
      const d=def(g.discard[i]);
      if(d&&d.id==='strikeOfFlurry'){g.hand.push(g.discard.splice(i,1)[0]);addFX(480,220,'⚡急袭回收!','#64B5F6');}
    }
  }
  // 姿态切换标记(给急冲/魂之羁绊用)
  if(s==='wrath'&&oldStance!=='wrath'){g._enteredWrath=true;drawCards(1);addFX(480,220,'⚡怒火抽1','#FF4444');} // 进怒火抽1
  if(s==='calm'&&oldStance!=='calm')g._enteredCalm=true;
  g.stance=s;
  const names={wrath:'🔥怒火!',calm:'💧宁静!',divinity:'✨神格!'};
  const colors={wrath:'#FF4444',calm:'#64B5F6',divinity:'#FFD700'};
  if(names[s]){addFX(480,200,names[s],'#FFD700',28);addHitParticles(480,200,colors[s]||'#FFD700',10);screenShake(4);}
  if(s==='divinity'){g._divCountdown=1;addHitParticles(480,100,'#FFD700',20);screenShake(8);}
}

// ===================================================================
//  卡牌定义 (ALL_CARDS + addCard)
//  角色: 0=铁甲 1=静默猎手
//  类型: attack/skill/power/status
//  稀有度: basic/common/uncommon/rare
// ===================================================================
const ALL_CARDS=[];
function addCard(c){ALL_CARDS.push(c);}

// ---- 基础卡（全角色通用） ----
addCard({id:'strike',name:'打击',c:1,type:'attack',rarity:'basic',target:'enemy',desc:'造成6点伤害',uDesc:'造成9点伤害',f:(g,en,c)=>{const e=en[0];if(!e)return;dmgEnemy(e,c.u?9:6,g);}});
addCard({id:'defend',name:'防御',c:1,type:'skill',rarity:'basic',target:'self',desc:'获得5点格挡',uDesc:'获得8点格挡',f:(g,_,c)=>{g.block+=c.u?8:5;}});
addCard({id:'bash',name:'重击',c:2,type:'attack',rarity:'basic',target:'enemy',desc:'造成8伤+2易伤',uDesc:'造成10伤+3易伤',f:(g,en,c)=>{const e=en[0];if(!e)return;dmgEnemy(e,c.u?10:8,g);e.vulnerable=(e.vulnerable||0)+(c.u?3:2);}});
addCard({id:'precisionStrike',name:'精准打击',c:-1,type:'attack',rarity:'common',target:'enemy',desc:'X费:6伤xX次',uDesc:'X费:9伤xX次',f:(g,en,c)=>{const e=en[0];if(!e)return;const x=g._lastXCost||0;const d=c.u?9:6;for(let i=0;i<x;i++)if(e.hp>0)dmgEnemy(e,d,g);}});

// ---- 普通攻击 ----
addCard({id:'twinStrike',name:'双斩',c:1,type:'attack',rarity:'common',target:'enemy',desc:'6伤x2',uDesc:'8伤x2+1易伤',f:(g,en,c)=>{const e=en[0];if(!e)return;const b=c.u?8:6;for(let i=0;i<2;i++)if(e.hp>0)dmgEnemy(e,b,g);if(c.u)e.vulnerable=(e.vulnerable||0)+1;}});
addCard({id:'pommelStrike',name:'剑柄打击',c:1,type:'attack',rarity:'common',target:'enemy',desc:'9伤,抽1张牌',uDesc:'9伤,抽2张牌',f:(g,en,c)=>{const e=en[0];if(!e)return;dmgEnemy(e,9,g);drawCards(c.u?2:1);}});
addCard({id:'cleave',name:'旋风斩',c:1,type:'attack',rarity:'common',target:'all',desc:'对所有敌造成8伤',uDesc:'11伤+1易伤',f:(g,en,c)=>{const b=c.u?11:8;en.forEach(e=>{if(e.hp>0){dmgEnemy(e,b,g);if(c.u)e.vulnerable=(e.vulnerable||0)+1;}});}});
addCard({id:'headbutt',name:'头槌',c:1,type:'attack',rarity:'common',target:'enemy',desc:'12伤,弃牌回抽牌堆',uDesc:'16伤,弃牌回抽牌堆',f:(g,en,c)=>{const e=en[0];if(!e)return;dmgEnemy(e,c.u?16:12,g);if(g.discard.length>0)g.draw.push(g.discard.pop());}});
addCard({id:'wildStrike',name:'狂野打击',c:1,type:'attack',rarity:'common',target:'enemy',desc:'12伤害+1伤口',uDesc:'15伤害+1伤口+全体3伤',f:(g,en,c)=>{const e=en[0];if(!e)return;dmgEnemy(e,c.u?15:12,g);g.discard.push({...S.wound});if(c.u)g.enemies.forEach(o=>{if(o!==e&&o.hp>0)dmgEnemy(o,3,g);});}});
addCard({id:'uppercut',name:'上勾拳',c:2,type:'attack',rarity:'common',target:'enemy',desc:'16伤害+1层虚弱',uDesc:'20伤害+2层虚弱',f:(g,en,c)=>{const e=en[0];if(!e)return;dmgEnemy(e,c.u?20:16,g);e.weak=(e.weak||0)+(c.u?2:1);}});
addCard({id:'ironWave',name:'铁斩波',c:1,type:'attack',rarity:'common',target:'enemy',desc:'7伤+7甲',uDesc:'9伤+9甲+敌虚弱',f:(g,en,c)=>{const e=en[0];if(!e)return;const b=c.u?9:7;dmgEnemy(e,b,g);g.block+=b;if(c.u)e.weak=(e.weak||0)+1;}});
// ---- 特殊条件攻击 ----
addCard({id:'clash',name:'冲突',c:0,type:'attack',rarity:'common',target:'enemy',desc:'14伤;有技能牌不可用',uDesc:'18伤;击杀抽2',f:(g,en,c)=>{const e=en[0];if(!e)return;const bf=e.hp;dmgEnemy(e,c.u?18:14,g);if(c.u&&e.hp<=0&&bf>0)drawCards(2);},cP:g=>!g.hand.some(c=>{const d=def(c);return d&&d.type==='skill';})});
addCard({id:'thunderclap',name:'雷霆',c:1,type:'attack',rarity:'common',target:'all',desc:'全体4伤+1易伤',uDesc:'全体6伤+1易+1虚',f:(g,en,c)=>{const b=c.u?6:4;en.forEach(e=>{if(e.hp>0){dmgEnemy(e,b,g);e.vulnerable=(e.vulnerable||0)+1;if(c.u)e.weak=(e.weak||0)+1;}});}});
addCard({id:'bodySlam',name:'摔绊',c:1,type:'attack',rarity:'common',target:'enemy',desc:'伤害=当前格挡',uDesc:'伤害=1.5倍格挡+回半甲',f:(g,en,c)=>{const e=en[0];if(!e)return;const baseDmg=c.u?Math.floor(g.block*1.5):g.block;const dealt=dmgEnemy(e,baseDmg,g);if(c.u)g.block+=Math.floor(dealt/2);}});

// ---- 普通技能 ----
addCard({id:'shrug',name:'耸肩无视',c:1,type:'skill',rarity:'common',target:'self',desc:'8甲抽1',uDesc:'11甲抽1+1敏',f:(g,_,c)=>{g.block+=c.u?11:8;if(c.u)g.dexterity=(g.dexterity||0)+1;drawCards(1);}});
addCard({id:'sentinel',name:'哨卫',c:1,type:'skill',rarity:'common',target:'self',desc:'获得8格挡;获得1能量',uDesc:'获得12格挡;获得1能量',f:(g,_,c)=>{g.block+=c.u?12:8;g.energy=Math.min(g.maxEnergy,g.energy+1);addHitParticles(480,390,'#AD8BFF',3);}});
addCard({id:'battleTrance',name:'战斗专注',c:0,type:'skill',rarity:'common',target:'self',desc:'抽2张牌;消耗',uDesc:'抽3张牌;消耗',f:(g,_,c)=>{drawCards(c.u?3:2);},ex:true});
addCard({id:'trueGrit',name:'坚毅',c:1,type:'skill',rarity:'common',target:'self',desc:'9甲消耗',uDesc:'12甲+1力消耗',f:(g,_,c)=>{g.block+=c.u?12:9;if(c.u)g.strength++;},ex:true});
addCard({id:'armaments',name:'武装',c:1,type:'skill',rarity:'common',target:'self',desc:'获得10格挡;永久+1力(跨战斗)',uDesc:'获得13格挡;永久+2力(跨战斗)',f:(g,_,c)=>{g.block+=c.u?13:10;g.strength+=c.u?2:1;}});

// 稀有攻击
addCard({id:'swordBoomerang',name:'剑刃回旋',c:1,type:'attack',rarity:'uncommon',target:'enemy',desc:'4伤害x3',uDesc:'4伤害x4',f:(g,en,c)=>{const e=en[0];if(!e)return;const b=4;const hits=c.u?4:3;for(let i=0;i<hits;i++)if(e.hp>0)dmgEnemy(e,b,g);}});
addCard({id:'recklessCharge',name:'鲁莽',c:0,type:'attack',rarity:'uncommon',target:'enemy',desc:'9伤+1晕眩',uDesc:'9伤+1晕眩+1能量',f:(g,en,c)=>{const e=en[0];if(!e)return;dmgEnemy(e,9,g);g.discard.push({...S.dazed});if(c.u)g.energy=Math.min(g.maxEnergy,g.energy+1);}});
addCard({id:'dropkick',name:'飞踢',c:1,type:'attack',rarity:'uncommon',target:'enemy',desc:'7伤害;若易伤回1能抽1',uDesc:'10伤害;若易伤回1能抽1',f:(g,en,c)=>{const e=en[0];if(!e)return;dmgEnemy(e,c.u?10:7,g);if((e.vulnerable||0)>0){g.energy=Math.min(g.maxEnergy,g.energy+1);drawCards(1);}}});
addCard({id:'hemokinesis',name:'血祭',c:1,type:'attack',rarity:'uncommon',target:'enemy',desc:'15伤;自损3血+3甲',uDesc:'20伤;自损3+3甲+回2',f:(g,en,c)=>{const e=en[0];if(!e)return;dmgEnemy(e,c.u?20:15,g);dmgPlayerD(g,3);if(c.u)g.hp=Math.min(g.maxHp,g.hp+2);}});
addCard({id:'perfectedStrike',name:'完美打击',c:2,type:'attack',rarity:'uncommon',target:'enemy',desc:'6+每打击+3伤',uDesc:'9+每打击+3+3打击回能',f:(g,en,c)=>{const e=en[0];if(!e)return;const n=g.deck.filter(x=>{const d=def(x);return d&&(x.id.includes('strike')||d.id==='perfectedStrike');}).length;dmgEnemy(e,(c.u?9:6)+n*3,g);if(c.u&&n>=3)g.energy=Math.min(g.maxEnergy,g.energy+1);}});
addCard({id:'pummel',name:'连打',c:1,type:'attack',rarity:'uncommon',target:'enemy',desc:'4伤x3;消耗',uDesc:'6伤x3+1力;消耗',f:(g,en,c)=>{const e=en[0];if(!e)return;const b=c.u?6:4;for(let i=0;i<3;i++)if(e.hp>0)dmgEnemy(e,b,g);if(c.u)g.strength++;},ex:true});
addCard({id:'whirlwind',name:'暴风',c:2,type:'attack',rarity:'uncommon',target:'all',desc:'全体13伤',uDesc:'全体17伤+1弱',f:(g,en,c)=>{const b=c.u?17:13;en.forEach(e=>{if(e.hp>0){dmgEnemy(e,b,g);if(c.u)e.weak=(e.weak||0)+1;}});}});
addCard({id:'immolate',name:'圣火',c:2,type:'attack',rarity:'rare',target:'all',desc:'全体18伤害;加1灼烧',uDesc:'全体24',f:(g,en,c)=>{const b=c.u?24:18;en.forEach(e=>{if(e.hp>0)dmgEnemy(e,b,g);});g.discard.push({...S.burn});}});
addCard({id:'severSoul',name:'灵魂分离',c:2,type:'attack',rarity:'rare',target:'enemy',desc:'20伤;消耗非攻击',uDesc:'22伤+消耗每张+2甲',f:(g,en,c)=>{const e=en[0];if(!e)return;dmgEnemy(e,c.u?22:20,g);let cnt=0;for(let i=g.hand.length-1;i>=0;i--){const d=def(g.hand[i]);if(d&&d.type!=='attack'){g.exhaust.push(g.hand[i]);g.hand.splice(i,1);if(g.fnp>0)g.block+=g.fnp;cnt++;}}if(c.u)g.block+=cnt*2;}});
addCard({id:'fiendFire',name:'魔火',c:2,type:'attack',rarity:'rare',target:'enemy',desc:'消耗手牌每张7伤',uDesc:'每张8伤+每张抽1',f:(g,en,c)=>{const e=en[0];if(!e)return;const n=g.hand.length;[...g.hand].forEach(cd=>{dmgEnemy(e,c.u?8:7,g);g.exhaust.push(cd);if(g.fnp>0)g.block+=g.fnp;});g.hand=[];if(c.u)drawCards(n);}});

// 稀有技能
addCard({id:'flameBarrier',name:'火焰障壁',c:2,type:'skill',rarity:'uncommon',target:'self',desc:'12甲+反4伤',uDesc:'16甲+反6+全体易伤',f:(g,_,c)=>{g.block+=c.u?16:12;g.thorns=(g.thorns||0)+(c.u?6:4);if(c.u)g.enemies.forEach(e=>{if(e.hp>0)e.vulnerable=(e.vulnerable||0)+2;});}});
addCard({id:'ghostlyArmor',name:'幽魂甲',c:1,type:'skill',rarity:'uncommon',target:'self',desc:'11甲;消耗',uDesc:'14甲+抽1;消耗',f:(g,_,c)=>{g.block+=c.u?14:11;if(c.u)drawCards(1);},ex:true});
addCard({id:'powerThrough',name:'力量突破',c:1,type:'skill',rarity:'uncommon',target:'self',desc:'22甲+2伤口',uDesc:'30甲+2伤口+回3血',f:(g,_,c)=>{g.block+=c.u?30:22;g.hand.push({...S.wound},{...S.wound});if(c.u)g.hp=Math.min(g.maxHp,g.hp+3);}});
addCard({id:'disarm',name:'缴械',c:1,type:'skill',rarity:'uncommon',target:'self',desc:'敌人-3力;消耗',uDesc:'敌-5力+回8甲;消耗',f:(g,_,c)=>{const v=c.u?5:3;g.enemies.forEach(e=>{if(e.hp>0)e.strength=Math.max(0,(e.strength||0)-v);});if(c.u)g.block+=8;},ex:true});
addCard({id:'intimidate',name:'威吓',c:1,type:'skill',rarity:'uncommon',target:'self',desc:'全体2虚弱;消耗',uDesc:'全体2虚+1易;消耗',f:(g,_,c)=>{g.enemies.forEach(e=>{if(e.hp>0){e.weak=(e.weak||0)+2;if(c.u)e.vulnerable=(e.vulnerable||0)+1;}});},ex:true});
addCard({id:'shockwave',name:'震波',c:2,type:'skill',rarity:'uncommon',target:'self',desc:'全体3易+2虚;消耗',uDesc:'全体4易+3虚+回8甲;消耗',f:(g,_,c)=>{const v=c.u?4:3,w=c.u?3:2;g.enemies.forEach(e=>{if(e.hp>0){e.vulnerable=(e.vulnerable||0)+v;e.weak=(e.weak||0)+w;}});if(c.u)g.block+=8;},ex:true});
addCard({id:'seeingRed',name:'怒火',c:0,type:'skill',rarity:'uncommon',target:'self',desc:'获得1点能量;消耗',uDesc:'获得2点能量;消耗',f:(g,_,c)=>{const e=c.u?2:1;g.energy=Math.min(g.maxEnergy+e,g.energy+e);addHitParticles(480,390,'#AD8BFF',3);},ex:true});
addCard({id:'bloodletting',name:'放血',c:0,type:'skill',rarity:'uncommon',target:'self',desc:'获得2能量;自损3血',uDesc:'获得3能量;自损3血',f:(g,_,c)=>{const e=c.u?3:2;g.energy=Math.min(g.maxEnergy+e,g.energy+e);dmgPlayerD(g,3);}});
addCard({id:'spotWeakness',name:'识破',c:1,type:'skill',rarity:'uncommon',target:'self',desc:'获得2点力量',uDesc:'获得4点力量',f:(g,_,c)=>{g.strength+=c.u?4:2;}});
addCard({id:'offering',name:'奉献',c:0,type:'skill',rarity:'rare',target:'self',desc:'自损5血;+2能量;抽2;消耗',uDesc:'自损4血;+2能量;抽2;消耗',f:(g,_,c)=>{dmgPlayerD(g,c.u?4:5);g.energy=Math.min(g.maxEnergy+2,g.energy+2);drawCards(2);},ex:true});
addCard({id:'limitBreak',name:'突破极限',c:2,type:'skill',rarity:'rare',target:'self',desc:'力量翻倍;消耗',uDesc:'力量翻倍+回4;消耗',f:(g,_,c)=>{g.strength*=2;if(c.u)g.hp=Math.min(g.maxHp,g.hp+4);},ex:true});

// 能力
addCard({id:'metallicize',name:'金属化',c:1,type:'power',rarity:'uncommon',target:'self',desc:'能力:回合8甲;入手5甲',uDesc:'能力:回合12甲+3刺;入手8',in:true,iu:true,f:(g,_,c)=>{const v=c.u?12:8;g.metall=(g.metall||0)+v;g.block+=v;if(c.u)g.thorns=(g.thorns||0)+3;}});
addCard({id:'feelNoPain',name:'无惧疼痛',c:1,type:'power',rarity:'uncommon',target:'self',desc:'能力:消耗得3甲;入手4',uDesc:'能力:消耗得5+回1能;入手6',f:(g,_,c)=>{g.fnp=(g.fnp||0)+(c.u?5:3);g.block+=c.u?6:4;if(c.u)g.energy=Math.min(g.maxEnergy,g.energy+1);}});
addCard({id:'barricade',name:'壁垒',c:2,type:'power',rarity:'rare',target:'self',desc:'能力:格挡不清零;入手8甲',uDesc:'能力:挡不清零+入手12',f:(g,_,c)=>{g.barricade=true;g.block+=c.u?12:8;}});
addCard({id:'inflame',name:'燃烧',c:1,type:'power',rarity:'rare',target:'self',desc:'能力:+2力量+入手5甲',uDesc:'能力:+3力量+回4+入手7',f:(g,_,c)=>{g.strength+=c.u?3:2;g.block+=c.u?7:5;if(c.u)g.hp=Math.min(g.maxHp,g.hp+4);}});
addCard({id:'demonForm',name:'恶魔形态',c:2,type:'power',rarity:'rare',target:'self',desc:'能力:回合+3力;入手+3',uDesc:'能力:回合+4力;入手+4+4甲',f:(g,_,c)=>{const v=c.u?4:3;g.dForm=(g.dForm||0)+v;g.strength+=v;if(c.u)g.block+=4;}});
addCard({id:'darkEmbrace',name:'黑暗之拥',c:1,type:'power',rarity:'rare',target:'self',desc:'能力:消耗抽1;入手抽1+3甲+回1能',uDesc:'能力:消耗抽2+入手抽2+8甲+回2能',iu:true,f:(g,_,c)=>{const v=c.u?2:1;g.de=v;drawCards(v);g.block+=c.u?8:3;g.energy=Math.min(g.maxEnergy+(c.u?2:1),g.energy+(c.u?2:1));}});
addCard({id:'evolve',name:'进化',c:1,type:'power',rarity:'uncommon',target:'self',desc:'能力:状态多抽2;入手抽1+3甲',uDesc:'能力:状态多抽3+入手抽2+6甲',in:true,f:(g,_,c)=>{const v=c.u?3:2;g.evolve=(g.evolve||0)+v;drawCards(c.u?2:1);g.block+=c.u?6:3;}});
addCard({id:'corruption',name:'腐化',c:2,type:'power',rarity:'rare',target:'self',desc:'能力:技能0费+消耗+入手6甲',uDesc:'能力:技能0费+消耗+回5+2力+10甲',f:(g,_,c)=>{g.corruption=true;g.block+=c.u?10:6;g.hp=Math.min(g.maxHp,g.hp+(c.u?5:3));if(c.u)g.strength+=2;}});

// 传说
addCard({id:'impervious',name:'岿然不动',c:2,type:'skill',rarity:'rare',target:'self',desc:'获得22格挡;消耗',uDesc:'获得28格挡;消耗',f:(g,_,c)=>{g.block+=c.u?28:22;},ex:true});
addCard({id:'reaper',name:'死神',c:2,type:'attack',rarity:'rare',target:'all',desc:'全体5伤害;回复等量血',uDesc:'全体8伤害;回复等量血',f:(g,en,c)=>{let t=0;const b=c.u?8:5;en.forEach(e=>{if(e.hp>0)t+=dmgEnemy(e,b,g);});g.hp=Math.min(g.maxHp,g.hp+t);}});
addCard({id:'exhume',name:'发掘',c:1,type:'skill',rarity:'rare',target:'self',desc:'从消耗堆回收1张牌',uDesc:'回收2张',f:(g,_,c)=>{const exh=g.exhaust||[];const n=(c&&c.u)?2:1;for(let i=0;i<n&&exh.length>0;i++){const cd=exh.pop();if(cd){g.hand.push(cd);addLog('📤 发掘回收:'+cd.name);}}},ex:true});
addCard({id:'doubleTap',name:'双重击',c:1,type:'skill',rarity:'rare',target:'self',desc:'下张攻击牌打出2次;消耗',uDesc:'下张攻击打出2次;返1能',f:(g,_,c)=>{g.dt=true;if(c.u)g.energy=Math.min(g.maxEnergy,g.energy+1);},ex:true});
addCard({id:'feed',name:'盛宴',c:1,type:'attack',rarity:'rare',target:'enemy',desc:'10伤害;击杀+4血上限',uDesc:'14伤害;击杀+4血上限',f:(g,en,c)=>{const e=en[0];if(!e)return;const bf=e.hp;dmgEnemy(e,c.u?14:10,g);if(e.hp<=0&&bf>0){g.maxHp+=4;g.hp+=4;}}});
addCard({id:'entrench',name:'堑壕',c:2,type:'skill',rarity:'rare',target:'self',desc:'将当前格挡值翻倍',uDesc:'将当前格挡值变为2.5倍',f:(g,_,c)=>{g.block=c.u?Math.floor(g.block*2.5):g.block*2;}});
addCard({id:'burningPact',name:'燃契',c:1,type:'skill',rarity:'rare',target:'self',desc:'抽3张牌;消耗',uDesc:'抽4张牌;消耗',f:(g,_,c)=>{drawCards(c.u?4:3);},ex:true});
addCard({id:'bludgeon',name:'重锤',c:3,type:'attack',rarity:'rare',target:'enemy',desc:'造成32点伤害',uDesc:'造成42点伤害',f:(g,en,c)=>{const e=en[0];if(!e)return;dmgEnemy(e,c.u?42:32,g);}});

// 新卡牌
addCard({id:'rampage',name:'狂怒',c:1,type:'attack',rarity:'uncommon',target:'enemy',desc:'8伤;每打一次+5(本场)',uDesc:'12伤;每打一次+5',f:(g,en,c)=>{const e=en[0];if(!e)return;const b=(c._r||0)+(c.u?12:8);dmgEnemy(e,b,g);c._r=(c._r||0)+5;}});
addCard({id:'heavyBlade',name:'厚重之刃',c:2,type:'attack',rarity:'uncommon',target:'enemy',desc:'造成14点伤害;力量加成翻倍',uDesc:'造成18点伤害;力量加成翻倍',f:(g,en,c)=>{const e=en[0];if(!e)return;const b=(c.u?18:14)+(g.strength||0);dmgEnemy(e,b,g);}});
addCard({id:'flex',name:'活动肌肉',c:0,type:'skill',rarity:'uncommon',target:'self',desc:'获得3点力量;回合末失去等量力量',uDesc:'获得5点力量;回合末失去等量力量',f:(g,_,c)=>{const v=c.u?5:3;g.strength+=v;g.flexLoss=(g.flexLoss||0)+v;}});
addCard({id:'rupture',name:'撕裂',c:1,type:'power',rarity:'uncommon',target:'self',desc:'能力:自残得2力+抽1;入手5甲',uDesc:'能力:自残得3力+抽2+回能;入手8',in:true,f:(g,_,c)=>{g.rupture=(g.rupture||0)+(c.u?3:2);drawCards(c.u?2:1);g.block+=c.u?8:5;if(c.u)g.energy=Math.min(g.maxEnergy,g.energy+1);}});
addCard({id:'fireBreathing',name:'火焰吐息',c:1,type:'power',rarity:'uncommon',target:'self',desc:'能力:状态全10伤;入手全6',uDesc:'能力:状态全14+敌易;入手全10',in:true,f:(g,_,c)=>{g.fireBreathing=(g.fireBreathing||0)+(c.u?14:10);const d=c.u?10:6;g.enemies.forEach(e=>{if(e.hp>0){dmgEnemy(e,d,g);if(c.u)e.vulnerable=(e.vulnerable||0)+1;}});}});
addCard({id:'carnage',name:'残杀',c:2,type:'attack',rarity:'uncommon',target:'enemy',desc:'20伤害;消耗',uDesc:'28伤害;消耗',f:(g,en,c)=>{const e=en[0];if(!e)return;dmgEnemy(e,c.u?28:20,g);},ex:true});
// 铁甲战士强化
addCard({id:'fervor',name:'热血沸腾',c:1,type:'power',rarity:'uncommon',target:'self',
  desc:'能力:每回合+1力量;自损1血',uDesc:'能力:每回合+2力量;自损1血',
  f:(g,_,c)=>{g.fervor=(g.fervor||0)+(c.u?2:1);}});
addCard({id:'crush',name:'碾碎',c:2,type:'attack',rarity:'uncommon',target:'enemy',
  desc:'造成15伤害;每有1点力量+2伤害',uDesc:'造成20伤害;每有1点力量+2伤害',
  f:(g,en,c)=>{const e=en[0];if(!e)return;dmgEnemy(e,(c.u?20:15)+(g.strength||0)*2,g);}});
addCard({id:'battleFury',name:'战意爆发',c:-1,type:'power',rarity:'rare',target:'self',desc:'X费:获得X力量+X*3甲',uDesc:'X费:获得X+1力量+X*4甲',f:(g,_,c)=>{const x=(g._lastXCost||0)+(c.u?1:0);g.strength+=x;g.block+=x*(c.u?4:3);addLog('⚡ 战意爆发+'+(x)+'力+'+(x*(c.u?4:3))+'甲');}});

// 机兵补全
addCard({id:'coldSnap',name:'寒冰',c:1,type:'attack',rarity:'common',target:'enemy',desc:'6伤+1冰球',uDesc:'9伤+1冰+敌虚弱',f:(g,en,c)=>{const e=en[0];if(!e)return;dmgEnemy(e,c.u?9:6,g);channel(g,'frost',1);if(c.u)e.weak=(e.weak||0)+1;}});
addCard({id:'sweepingBeam',name:'扫射光束',c:1,type:'attack',rarity:'common',target:'all',desc:'全体6伤+抽1',uDesc:'全9伤+抽1+多敌回能',f:(g,en,c)=>{const b=c.u?9:6;let hit=0;en.forEach(e=>{if(e.hp>0){dmgEnemy(e,b,g);hit++;}});drawCards(1);if(c.u&&hit>=2)g.energy=Math.min(g.maxEnergy,g.energy+1);}});
addCard({id:'rebound',name:'弹回',c:1,type:'attack',rarity:'common',target:'enemy',desc:'9伤+回牌堆顶',uDesc:'12伤+回顶+抽1',f:(g,en,c)=>{const e=en[0];if(!e)return;dmgEnemy(e,c.u?12:9,g);g.draw.push(c);if(c.u)drawCards(1);}});
addCard({id:'recycle',name:'回收',c:1,type:'skill',rarity:'uncommon',target:'self',desc:'消耗1张手牌;获得等量能量',uDesc:'消耗1张手牌;获得等量能量+1',f:(g,_,c)=>{if(g.hand.length>0){const cd=g.hand.pop();const energy=cd.c+1;g.exhaust.push(cd);g.energy=Math.min(g.maxEnergy+energy+(c.u?1:0),g.energy+energy+(c.u?1:0));drawCards(1);addLog('♻ 回收:'+cd.name+'+'+energy+'能');}}});
// 跨体系链接
addCard({id:'focusShield',name:'聚焦护盾',c:1,type:'skill',rarity:'common',target:'self',desc:'每个球体获得4格挡',uDesc:'每个球体获得6格挡',f:(g,_,c)=>{const n=g.orbs?g.orbs.length:0;const b=n*(c.u?6:4);g.block+=b;addFX(480,240,'🛡聚焦护盾+'+(b),'#64B5F6');}});
addCard({id:'superconduct',name:'超导',c:1,type:'skill',rarity:'uncommon',target:'self',desc:'激发首个球体并获得额外效果',uDesc:'激发首个球体并获得更强效果',f:(g,_,c)=>{if(!g.orbs||!g.orbs.length)return;const o=g.orbs[0];evoke(g,0);if(o.type==='lightning'){g.energy=Math.min(g.maxEnergy+2,g.energy+2);}else if(o.type==='frost'){g.block+=c.u?8:5;}else if(o.type==='plasma'){drawCards(c.u?3:2);}addFX(480,220,'⚡超导!','#AD8BFF');}});

// 机兵完整补全
addCard({id:'beamCell',name:'光束细胞',c:0,type:'attack',rarity:'common',target:'enemy',desc:'4伤;+1脆弱',uDesc:'7伤;+2脆弱',f:(g,en,c)=>{const e=en[0];if(!e)return;dmgEnemy(e,c.u?7:4,g);e.vulnerable=(e.vulnerable||0)+(c.u?2:1);}});
addCard({id:'barrage',name:'弹幕齐射',c:1,type:'attack',rarity:'common',target:'enemy',desc:'每球4伤',uDesc:'每球6伤+生1电',f:(g,en,c)=>{const e=en[0];if(!e)return;const n=g.orbs?g.orbs.length:0;if(n>0)dmgEnemy(e,n*(c.u?6:4),g);if(c.u)channel(g,'lightning',1);}});
addCard({id:'compileDriver',name:'编译驱动',c:1,type:'attack',rarity:'common',target:'enemy',desc:'8伤;每有1种球体抽1',uDesc:'12伤;每有1种球体抽1',f:(g,en,c)=>{const e=en[0];if(!e)return;dmgEnemy(e,c.u?12:8,g);if(g.orbs){const types={};g.orbs.forEach(o=>types[o.type]=true);drawCards(Object.keys(types).length);}}});
addCard({id:'autoShields',name:'自动护盾',c:1,type:'skill',rarity:'uncommon',target:'self',desc:'获得11甲(无盾时)',uDesc:'获得15甲(无盾时)',f:(g,_,c)=>{g.block+=c.u?15:11;if(g.block>0)g.block+=3;}});
addCard({id:'allForOne',name:'一为全',c:2,type:'attack',rarity:'rare',target:'enemy',desc:'12伤;回收弃牌堆所有0费牌',uDesc:'16伤;回收弃牌堆所有0费牌',f:(g,en,c)=>{const e=en[0];if(!e)return;dmgEnemy(e,c.u?16:12,g);for(let i=g.discard.length-1;i>=0;i--){const cd=g.discard[i];if(cd.c===0){g.hand.push(g.discard.splice(i,1)[0]);}}addLog('♻ 一为全:回收0费牌');}});
addCard({id:'hyperbeam',name:'超光束',c:2,type:'attack',rarity:'rare',target:'all',desc:'全体26伤;集中-3',uDesc:'全体34伤;集中-2',f:(g,en,c)=>{const b=c.u?34:26;en.forEach(e=>{if(e.hp>0)dmgEnemy(e,b,g);});g.focus=Math.max(0,(g.focus||0)-(c.u?2:3));addLog('💥 超光束:集中-'+(c.u?2:3));}});
addCard({id:'selfRepair',name:'自我修复',c:1,type:'power',rarity:'uncommon',target:'self',desc:'战末回7血;入手5甲',uDesc:'战末回10血;入手8甲',f:(g,_,c)=>{g.selfRepair=(g.selfRepair||0)+(c.u?10:7);g.block+=c.u?8:5;}});
addCard({id:'loop',name:'循环',c:1,type:'power',rarity:'uncommon',target:'self',desc:'球体额外触发1次;入手抽1',uDesc:'额外触发2+入手抽1+3甲',in:true,iu:true,f:(g,_,c)=>{g.loop=(g.loop||0)+(c.u?2:1);drawCards(1);if(c.u)g.block+=3;}});
addCard({id:'rainbow',name:'彩虹',c:2,uc:0,type:'skill',rarity:'rare',target:'self',desc:'生成闪电/冰霜/暗黑球各1',uDesc:'0费',f:(g,_,c)=>{channel(g,'lightning',1);channel(g,'frost',1);channel(g,'dark',1);}});

// 机兵追加卡牌
addCard({id:'leap',name:'跳跃',c:1,type:'skill',rarity:'common',target:'self',desc:'获得9格挡',uDesc:'获得12格挡',f:(g,_,c)=>{g.block+=c.u?12:9;}});
addCard({id:'steamBarrier',name:'蒸汽护壁',c:1,type:'skill',rarity:'common',target:'self',desc:'获得8格挡',uDesc:'获得12格挡',f:(g,_,c)=>{g.block+=c.u?12:8;}});
addCard({id:'recursion',name:'递归',c:1,type:'skill',rarity:'common',target:'self',desc:'激发首个球体并生成相同球体',uDesc:'零费',f:(g,_,c)=>{if(g.orbs&&g.orbs.length>0){const o=g.orbs[0];const t=o.type;const p=o.potency;evoke(g,0);channel(g,t,p);if(c.u)g.energy=Math.min(g.maxEnergy,g.energy+1);}}});

addCard({id:'claw',name:'爪击',c:0,type:'attack',rarity:'common',target:'enemy',desc:'7伤;本场每用1次爪击+4伤',uDesc:'11伤;本场每用1次爪击+5伤',f:(g,en,c)=>{const e=en[0];if(!e)return;const bonus=(g._clawCount||0)*(c.u?5:4);dmgEnemy(e,(c.u?11:7)+bonus,g);g._clawCount=(g._clawCount||0)+1;}});
addCard({id:'goForTheEyes',name:'瞄准眼睛',c:0,type:'attack',rarity:'common',target:'enemy',desc:'3伤;有球体则+1虚弱',uDesc:'5伤;有球体则+2虚弱',f:(g,en,c)=>{const e=en[0];if(!e)return;dmgEnemy(e,c.u?5:3,g);if(g.orbs&&g.orbs.length>0)e.weak=(e.weak||0)+(c.u?2:1);}});
addCard({id:'streamline',name:'精简',c:2,type:'attack',rarity:'common',target:'enemy',desc:'18伤;此后每用1次永久-1费',uDesc:'24伤;此后每用1次-1费',f:(g,en,c)=>{const e=en[0];if(!e)return;dmgEnemy(e,c.u?24:18,g);c.c=Math.max(0,(c.c||2)-1);}});
addCard({id:'melter',name:'熔毁',c:1,type:'attack',rarity:'uncommon',target:'enemy',desc:'10伤;移除敌人所有格挡',uDesc:'14伤;移除敌人所有格挡',f:(g,en,c)=>{const e=en[0];if(!e)return;e.block=0;dmgEnemy(e,c.u?14:10,g);}});
addCard({id:'doomAndGloom',name:'末日',c:2,type:'attack',rarity:'uncommon',target:'all',desc:'全体10伤;生成1暗黑球',uDesc:'全体14伤;生成1暗黑球',f:(g,en,c)=>{const b=c.u?14:10;en.forEach(e=>{if(e.hp>0)dmgEnemy(e,b,g);});channel(g,'dark',1);}});
addCard({id:'chaos',name:'混沌',c:1,type:'skill',rarity:'uncommon',target:'self',desc:'生成1随机球',uDesc:'生成2随机球',f:(g,_,c)=>{const types=['lightning','frost','dark','plasma'];const n=c.u?2:1;for(let i=0;i<n;i++)channel(g,types[Math.floor(Math.random()*types.length)],1);}});

addCard({id:'spiritShield',name:'精神护盾',c:2,type:'skill',rarity:'uncommon',target:'self',
  desc:'每张手牌获得4格挡',uDesc:'每张手牌获得5格挡',
  f:(g,_,c)=>{const n=g.hand.length*(c.u?5:4);g.block+=n;addFX(480,240,'🛡️精神护盾+'+n,'#64B5F6');}});
addCard({id:'reinfBody',name:'强化身躯',c:-1,type:'skill',rarity:'uncommon',target:'self',
  desc:'X费:X*8格挡',uDesc:'X费:X*10格挡',
  f:(g,_,c)=>{const x=g._lastXCost||0;g.block+=x*(c.u?10:8);addFX(480,240,'💪强化身躯+'+(x*(c.u?10:8))+'甲','#64B5F6');}});
addCard({id:'ironWhirl',name:'铁旋风',c:1,type:'attack',rarity:'common',target:'enemy',
  desc:'6伤害+4格挡',uDesc:'9伤害+6格挡',
  f:(g,en,c)=>{const e=en[0];if(!e)return;const b=c.u?9:6;const blk=c.u?6:4;dmgEnemy(e,b,g);g.block+=blk;}});
// 力量爆发: 快速大量获得力量
addCard({id:'battleSpirit',name:'战意',c:1,type:'skill',rarity:'uncommon',target:'self',
  desc:'获得3点力量;消耗',uDesc:'获得5点力量;消耗',
  f:(g,_,c)=>{g.strength+=(c.u?5:3);addFX(480,280,'⚡战意+'+(c.u?5:3)+'力','#FF6B6B');},ex:true});
// 定向检索: 从抽牌堆/弃牌堆找牌
addCard({id:'seek',name:'寻找',c:1,type:'skill',rarity:'rare',target:'self',
  desc:'从抽牌堆选择1张牌入手牌;消耗',uDesc:'从抽牌堆选择2张牌入手牌;消耗',
  f:(g,_,c)=>{g._seekCount=c.u?2:1;g._seekPicks=0;g._seekFilter='any';g._seekSource='draw';g.phase='seekPick';},ex:true});

// 机兵缺失补全
addCard({id:'zap',name:'电击',c:1,type:'skill',rarity:'basic',target:'self',desc:'生成1闪电球',uDesc:'生成1闪电球',f:(g,_,c)=>{channel(g,'lightning',1);}});
addCard({id:'dualcast',name:'双重释放',c:1,type:'skill',rarity:'basic',target:'self',desc:'激发首个球体2次',uDesc:'激发首个球体2次',f:(g,_,c)=>{if(g.orbs&&g.orbs.length>0){const t=g.orbs[0].type;const p=g.orbs[0].potency;evoke(g,0);g.orbs.unshift({type:t,potency:p});evoke(g,0);}}});
addCard({id:'ballLightning',name:'球形闪电',c:1,type:'attack',rarity:'common',target:'enemy',desc:'7伤;生成1闪电球',uDesc:'10伤;生成1闪电球',f:(g,en,c)=>{const e=en[0];if(!e)return;dmgEnemy(e,c.u?10:7,g);channel(g,'lightning',1);}});
addCard({id:'coolheaded',name:'冷静头脑',c:1,type:'skill',rarity:'common',target:'self',desc:'6甲;生成1冰霜球',uDesc:'9甲;生成1冰霜球',f:(g,_,c)=>{g.block+=c.u?9:6;channel(g,'frost',1);}});
addCard({id:'glacier',name:'冰川',c:2,type:'skill',rarity:'uncommon',target:'self',desc:'8甲;生成2冰霜球',uDesc:'11甲;生成2冰霜球',f:(g,_,c)=>{g.block+=c.u?11:8;channel(g,'frost',1);channel(g,'frost',1);}});
addCard({id:'capacitor',name:'电容器',c:1,type:'power',rarity:'uncommon',target:'self',desc:'球位+2+集中+1;入手6甲',uDesc:'球位+4+集中+2+入手8',in:true,iu:true,f:(g,_,c)=>{g.maxOrbs=(g.maxOrbs||3)+(c.u?4:2);g.focus=(g.focus||0)+(c.u?2:1);g.block+=c.u?8:6;}});
addCard({id:'defragment',name:'碎片整理',c:1,type:'power',rarity:'uncommon',target:'self',desc:'集中+2;入手6甲',uDesc:'集中+3+入手8甲',in:true,iu:true,f:(g,_,c)=>{g.focus=(g.focus||0)+(c.u?3:2);g.block+=c.u?8:6;}});
addCard({id:'tempest',name:'暴风',c:-1,type:'skill',rarity:'uncommon',target:'self',desc:'X费:生成X球(闪电+冰霜交替)',uDesc:'X费:生成X+1球(闪电+冰霜交替)',f:(g,_,c)=>{const x=(g._lastXCost||0)+(c.u?1:0);for(let i=0;i<x;i++)channel(g,i%2===0?'lightning':'frost',1);}});
addCard({id:'electrodynamics',name:'电动力学',c:1,type:'power',rarity:'rare',target:'self',desc:'闪电球攻击全体',uDesc:'闪电球攻击全体+入手5甲',in:true,iu:true,f:(g,_,c)=>{g.electro=true;if(c.u)g.block+=5;}});
addCard({id:'echoForm',name:'回响形态',c:2,uc:0,type:'power',rarity:'rare',target:'self',desc:'首张牌打出2次',uDesc:'首张牌打出2次(1费)',f:(g,_,c)=>{g.echoForm=true;}});


addCard({id:'buffer',name:'缓冲',c:1,type:'power',rarity:'rare',target:'self',desc:'抵挡2次伤害',uDesc:'抵挡3次伤害',f:(g,_,c)=>{g.buffer=(g.buffer||0)+(c.u?3:2);}});
addCard({id:'staticDischarge',name:'静电释放',c:1,type:'power',rarity:'uncommon',target:'self',desc:'受伤生1电球',uDesc:'受伤生1电球+2甲+生1',f:(g,_,c)=>{g.staticDischarge=(g.staticDischarge||0)+(c.u?2:1);if(c.u)channel(g,'lightning',1);}});
addCard({id:'thunderStrike',name:'雷霆打击',c:2,type:'attack',rarity:'rare',target:'enemy',desc:'7伤;每闪电球+3伤',uDesc:'10伤;每闪电球+4伤',f:(g,en,c)=>{const e=en[0];if(!e)return;const bonus=(g._totalLightning||0)*(c.u?4:3);dmgEnemy(e,(c.u?10:7)+bonus,g);}});
addCard({id:'geneticAlgorithm',name:'遗传算法',c:1,type:'skill',rarity:'uncommon',target:'self',desc:'获得1格挡;永久+4格挡(跨战斗累计)',uDesc:'获得1格挡;永久+6格挡(跨战斗累计)',f:(g,_,c)=>{const lvl=g._geneticLvl||0;g.block+=1+lvl;g._geneticLvl=(g._geneticLvl||0)+(c.u?8:6);addFX(480,260,'🧬遗传+'+(1+lvl)+'甲','#64B5F6');}});
addCard({id:'skim',name:'浏览',c:1,type:'skill',rarity:'uncommon',target:'self',desc:'抽3张牌',uDesc:'抽4张牌',f:(g,_,c)=>{drawCards(c.u?4:3);}});
addCard({id:'whiteNoise',name:'白噪音',c:1,type:'skill',rarity:'uncommon',target:'self',desc:'获得1张随机能力牌;消耗',uDesc:'获得2张随机能力牌;消耗',f:(g,_,c)=>{const n=c.u?2:1;const pool=ALL_CARDS.filter(x=>x.type==='power');for(let i=0;i<n&&pool.length>0;i++){const r=pick(pool);g.hand.push({...r,id:r.id+'_wn'+Date.now()+'_'+i});}},ex:true});
addCard({id:'heatsinks',name:'散热片',c:1,type:'power',rarity:'uncommon',target:'self',desc:'能力:每3能力抽1;入手抽1',uDesc:'能力:每能力抽1+入手抽2',in:true,iu:true,f:(g,_,c)=>{g.heatsinks=(g.heatsinks||0)+(c.u?2:1);drawCards(c.u?2:1);}});
addCard({id:'storm',name:'风暴',c:1,type:'power',rarity:'uncommon',target:'self',desc:'能力:每3能力生1电;入手生1',uDesc:'能力:每能力生1+抽1',in:true,iu:true,f:(g,_,c)=>{g.storm=(g.storm||0)+(c.u?2:1);channel(g,'lightning',1);if(c.u)drawCards(1);}});
addCard({id:'consume',name:'消耗',c:2,type:'power',rarity:'uncommon',target:'self',desc:'集中+2;球位-1',uDesc:'集中+3+入手4;球位-1',f:(g,_,c)=>{g.focus=(g.focus||0)+(c.u?3:2);g.maxOrbs=Math.max(1,Math.min(8,(g.maxOrbs||3)-1));if(c.u)g.block+=4;}});
addCard({id:'bootSequence',name:'启动序列',c:0,type:'power',rarity:'uncommon',target:'self',desc:'10甲;固有',uDesc:'14甲+抽1;固有',in:true,f:(g,_,c)=>{g.block+=c.u?14:10;if(c.u)drawCards(1);}});
addCard({id:'orbSurge',name:'球体奔涌',c:-1,type:'skill',rarity:'uncommon',target:'self',desc:'X费:生成X个随机球',uDesc:'X费:生成X+1个随机球',f:(g,_,c)=>{const x=(g._lastXCost||0)+(c.u?1:0);const types=['lightning','frost','dark','plasma'];for(let i=0;i<x;i++)channel(g,types[Math.floor(Math.random()*types.length)],1);}});
addCard({id:'overclock',name:'超频',c:0,type:'skill',rarity:'uncommon',target:'self',desc:'抽2张牌;获得2张伤口;消耗',uDesc:'抽3张牌;获得2张伤口;消耗',f:(g,_,c)=>{drawCards(c.u?3:2);g.discard.push({...S.wound},{...S.wound});addLog('⚡超频!');},ex:true});
addCard({id:'stack',name:'叠加',c:1,type:'skill',rarity:'common',target:'self',desc:'获得等于弃牌堆牌数的格挡',uDesc:'获得等于弃牌堆牌数+3的格挡',f:(g,_,c)=>{const n=g.discard.length+(c.u?3:0);g.block+=n;addFX(480,240,'📚叠加+'+n+'甲','#64B5F6');}});
addCard({id:'repulse',name:'排斥',c:2,type:'attack',rarity:'common',target:'all',desc:'全体14伤',uDesc:'全体18伤',f:(g,en,c)=>{const b=c.u?18:14;en.forEach(e=>{if(e.hp>0)dmgEnemy(e,b,g);});}});
addCard({id:'multiCast',name:'多重释放',c:-1,type:'skill',rarity:'uncommon',target:'self',desc:'X费:激发首个球体X次',uDesc:'X费:激发首个球体X+1次',f:(g,_,c)=>{if(g.orbs&&g.orbs.length>0){const x=(g._lastXCost||0)+(c.u?1:0);const t=g.orbs[0].type;const p=g.orbs[0].potency;for(let i=0;i<x;i++){if(g.orbs.length>0&&g.orbs[0].type===t){evoke(g,0);if(i<x-1)g.orbs.unshift({type:t,potency:p});}}g.orbs=g.orbs.filter(o=>o!==null);}}});
addCard({id:'sunder',name:'粉碎',c:3,type:'attack',rarity:'rare',target:'enemy',desc:'24伤;击杀+3能量',uDesc:'32伤;击杀+3能量',f:(g,en,c)=>{const e=en[0];if(!e)return;const bf=e.hp;dmgEnemy(e,c.u?32:24,g);if(e.hp<=0&&bf>0){g.energy=Math.min(g.maxEnergy+3,g.energy+3);addFX(480,220,'💥粉碎击杀!+3能','#FFD700');}}});
addCard({id:'amplify',name:'增幅',c:1,type:'power',rarity:'rare',target:'self',desc:'能力:下张能力x2;入手抽1',uDesc:'能力:下张能力x3+4甲',f:(g,_,c)=>{g.amplify=(g.amplify||0)+(c.u?3:2);drawCards(1);if(c.u)g.block+=4;}});
addCard({id:'meteorStrike',name:'陨石打击',c:5,type:'attack',rarity:'rare',target:'enemy',desc:'24伤;生成3等离子球',uDesc:'30伤;生成3等离子球',f:(g,en,c)=>{const e=en[0];if(!e)return;dmgEnemy(e,c.u?30:24,g);channel(g,'plasma',1);channel(g,'plasma',1);channel(g,'plasma',1);}});
addCard({id:'coreSurge',name:'核心电涌',c:1,type:'attack',rarity:'rare',target:'enemy',desc:'11伤;获得1人工制品',uDesc:'15伤;获得2人工制品',f:(g,en,c)=>{const e=en[0];if(!e)return;dmgEnemy(e,c.u?15:11,g);g.artifact=(g.artifact||0)+(c.u?2:1);}});
addCard({id:'blizzard',name:'暴风雪',c:1,type:'attack',rarity:'uncommon',target:'all',desc:'每个冰霜球对全体造成2伤',uDesc:'每个冰霜球对全体造成3伤',f:(g,en,c)=>{const n=(g._totalFrost||0)*(c.u?3:2);if(n>0)en.forEach(e=>{if(e.hp>0)dmgEnemy(e,n,g);});addFX(480,130,'❄暴风雪!'+n+'伤','#64B5F6');}});
addCard({id:'forceField',name:'力场',c:1,type:'skill',rarity:'uncommon',target:'self',desc:'获得8格挡;每张能力牌-1费',uDesc:'获得11格挡;每张能力牌-1费',f:(g,_,c)=>{g.block+=c.u?11:8;const powers=g.deck.filter(x=>{const d=def(x);return d&&d.type==='power';}).length;c.c=Math.max(0,1-powers);}});
addCard({id:'reboot',name:'重启',c:2,type:'skill',rarity:'rare',target:'self',desc:'弃所有手牌;抽等量牌;消耗',uDesc:'弃所有手牌;抽等量牌+2;消耗',f:(g,_,c)=>{const n=g.hand.length+(c.u?2:0);g.hand.forEach(cd=>g.discard.push(cd));g.hand=[];drawCards(n);},ex:true});
addCard({id:'hologram',name:'全息影像',c:1,type:'skill',rarity:'uncommon',target:'self',desc:'获得6格挡;从弃牌堆选择1张牌回收',uDesc:'获得9格挡;从弃牌堆选择1张牌回收',f:(g,_,c)=>{g.block+=c.u?9:6;g._seekCount=1;g._seekPicks=0;g._seekFilter='any';g._seekSource='discard';g.phase='seekPick';}});
// 最终还原: 无色卡补全
addCard({id:'thinkingAhead',name:'先见之明',c:0,type:'skill',rarity:'uncommon',target:'self',
  desc:'抽1张牌;将1张手牌放回抽牌堆顶',uDesc:'抽2张牌;将1张手牌放回抽牌堆顶',
  f:(g,_,c)=>{drawCards(c.u?2:1);if(g.hand.length>0){const top=g.hand.pop();g.draw.push(top);addLog('🔮 先见之明放回:'+top.name);}}});
addCard({id:'magnetism',name:'磁力',c:1,type:'power',rarity:'rare',target:'self',
  desc:'能力:每回合获得1张随机传说牌',uDesc:'能力:每回合获得1张随机传说牌(升级)',
  f:(g,_,c)=>{g.magnetism=c.u?2:1;}});
// 过牌转化:抽牌转防御
addCard({id:'thoughtArmor',name:'思绪铠甲',c:1,type:'power',rarity:'uncommon',target:'self',
  desc:'能力:每抽1张牌获得1点格挡',uDesc:'能力:每抽1张牌获得2点格挡',
  f:(g,_,c)=>{g.thoughtArmor=(g.thoughtArmor||0)+(c.u?2:1);}});
// 弃牌转化:弃牌得能量+弃牌AOE
addCard({id:'concentrate',name:'集中',c:1,type:'skill',rarity:'uncommon',target:'self',
  desc:'弃3张牌;获得2能量',uDesc:'弃2张牌;获得2能量',
  f:(g,_,c)=>{const need=c.u?2:3;let ct=0;for(let i=g.hand.length-1;i>=0&&ct<need;i--){g.discard.push(g.hand.splice(i,1)[0]);ct++;}g._discardedThisTurn=(g._discardedThisTurn||0)+ct;g.energy=Math.min(g.maxEnergy+2,g.energy+2);addLog('🎯 集中弃'+ct+'牌+2能');}});
addCard({id:'scatter',name:'散射',c:1,type:'attack',rarity:'uncommon',target:'all',
  desc:'抽2张牌;对所有敌人造成本回合抽牌数×2伤害',uDesc:'抽3张牌;对所有敌人造成本回合抽牌数×3伤害',
  f:(g,en,c)=>{drawCards(c.u?3:2);const drawn=g._totalDrawnThisTurn||0;const dmg=drawn*(c.u?3:2);if(dmg>0)en.forEach(e=>{if(e.hp>0)dmgEnemy(e,dmg,g);});addLog('🎯 散射抽'+drawn+'张='+dmg+'AOE');}});
// 体系深度:千刀万剐/玻璃小刀/交易工具/反射
addCard({id:'thousandCuts',name:'千刀万剐',c:1,type:'power',rarity:'rare',target:'self',
  desc:'能力:每打1张牌对全体敌人造成1伤害',uDesc:'能力:每打1张牌对全体敌人造成2伤害',
  f:(g,_,c)=>{g.thousandCuts=(g.thousandCuts||0)+(c.u?2:1);addLog('🗡️ 千刀万剐!每牌'+((c.u?2:1))+'AOE');}});
addCard({id:'glassKnife',name:'玻璃小刀',c:1,type:'attack',rarity:'uncommon',target:'enemy',
  desc:'造成10伤害x2',uDesc:'造成12伤害x2',
  f:(g,en,c)=>{const e=en[0];if(!e)return;const b=c.u?12:10;for(let i=0;i<2;i++)if(e.hp>0)dmgEnemy(e,b,g);}});
addCard({id:'toolsOfTrade',name:'交易工具',c:1,type:'power',rarity:'rare',target:'self',
  desc:'能力:回合开始抽1张弃1张',uDesc:'能力:回合开始抽1张弃1张(固有)',
  iu:true,f:(g,_,c)=>{g.toolsOfTrade=true;}});
addCard({id:'reflex',name:'反射',c:1,type:'skill',rarity:'uncommon',target:'self',
  desc:'抽1张牌;若本回合弃过牌额外抽2',uDesc:'抽1张牌;若本回合弃过牌额外抽3',
  f:(g,_,c)=>{const extra=c.u?3:2;const discarded=g._discardedThisTurn||0;drawCards(1+(discarded>0?extra:0));}});
// 神格增强:轮回/神威/神之庇护
addCard({id:'samsara',name:'轮回',c:1,type:'power',rarity:'uncommon',target:'self',
  desc:'能力:退出神格时+1念力;入手+8甲',uDesc:'能力:退出神格时+2念力;入手+12甲',
  f:(g,_,c)=>{g.samsara=(g.samsara||0)+(c.u?2:1);g.block+=c.u?12:8;}});
addCard({id:'divineWrath',name:'神威',c:1,type:'power',rarity:'rare',target:'self',
  desc:'能力:神格伤害×4;攻击吸血50%',uDesc:'能力:神格伤害×5;攻击吸血50%',
  f:(g,_,c)=>{g.divineWrath=(c.u?5:4);}});
addCard({id:'divineShield',name:'神之庇护',c:1,type:'skill',rarity:'common',target:'self',
  desc:'进入宁静;若已在宁静转化格挡为念力(2:1)',uDesc:'若已在宁静转化格挡为念力(1.5:1)',
  f:(g,_,c)=>{if(g.stance==='calm'){const rate=c.u?1.5:2;const mantra=Math.floor(g.block/rate);g.mantra=(g.mantra||0)+mantra;g.block=0;addLog('🛡️ 神之庇护:'+mantra+'格挡→念力');}else setStance(g,'calm');}});
// 状态利用:伤痛之力/灼烧之魂/利用伤口
addCard({id:'painPower',name:'伤痛之力',c:1,type:'power',rarity:'uncommon',target:'self',
  desc:'能力:抽到状态牌时+1力量',uDesc:'能力:抽到状态牌时+2力量',
  f:(g,_,c)=>{g.painPower=(g.painPower||0)+(c.u?2:1);}});
addCard({id:'burningSoul',name:'灼烧之魂',c:1,type:'attack',rarity:'uncommon',target:'enemy',
  desc:'5伤;弃牌堆每张灼烧+5伤',uDesc:'7伤;弃牌堆每张灼烧+7伤',
  f:(g,en,c)=>{const e=en[0];if(!e)return;const b=c.u?7:5;const bonus=(g.discard||[]).filter(x=>{const d=def(x);return d&&d.id==='burn';}).length;dmgEnemy(e,b+bonus*(c.u?7:5),g);}});
addCard({id:'woundRecycle',name:'利用伤口',c:1,type:'skill',rarity:'uncommon',target:'self',
  desc:'消耗手牌所有状态牌;每张+2甲+1能',uDesc:'消耗手牌所有状态牌;每张+3甲+1能',
  f:(g,_,c)=>{for(let i=g.hand.length-1;i>=0;i--){const d=def(g.hand[i]);if(d&&d.type==='status'){g.exhaust.push(g.hand.splice(i,1)[0]);const b=c.u?3:2;g.block+=b;g.energy=Math.min(g.maxEnergy+1,g.energy+1);addLog('♻️ 利用伤口:回收+'+(b)+'甲+1能');}}}});

// 风暴姿态:切换姿态AOE
addCard({id:'stormStance',name:'风暴姿态',c:1,type:'power',rarity:'uncommon',target:'self',
  desc:'能力:切换姿态时对全体敌人造成5伤害',uDesc:'能力:切换姿态时对全体敌人造成8伤害',
  f:(g,_,c)=>{g.stormStance=(g.stormStance||0)+(c.u?8:5);}});
// 快速姿态切换
addCard({id:'stanceDance',name:'姿态切换',c:0,type:'skill',rarity:'common',target:'self',
  desc:'怒火↔宁静切换;若中立则进宁静',uDesc:'切换+抽1',
  f:(g,_,c)=>{if(g.stance==='wrath')setStance(g,'calm');else if(g.stance==='calm')setStance(g,'wrath');else setStance(g,'calm');if(c.u)drawCards(1);}});
// 桥接能力:铁壁之力/念能转化
addCard({id:'ironWallPower',name:'铁壁之力',c:1,type:'power',rarity:'uncommon',target:'self',
  desc:'能力:获得格挡时+1力量',uDesc:'能力:获得格挡时+2力量',
  f:(g,_,c)=>{g.ironWallPower=(g.ironWallPower||0)+(c.u?2:1);}});
addCard({id:'mantraEnergy',name:'念能转化',c:1,type:'power',rarity:'uncommon',target:'self',
  desc:'能力:获得念力时+1能量',uDesc:'能力:获得念力时+1能量+1甲',
  f:(g,_,c)=>{g.mantraEnergy=c.u?2:1;}});
// 体系衔接:力毒双修/以盾为祭/刀锋淬毒
addCard({id:'toxinStrength',name:'力毒双修',c:1,type:'power',rarity:'rare',target:'self',
  desc:'能力:施加毒时+1力量',uDesc:'能力:施加毒时+2力量',
  f:(g,_,c)=>{g.toxinStrength=(g.toxinStrength||0)+(c.u?2:1);}});
addCard({id:'shieldSacrifice',name:'以盾为祭',c:1,type:'skill',rarity:'uncommon',target:'self',
  desc:'失去全部格挡;每5甲得1念力+1能',uDesc:'失去全部格挡;每4甲得1念力+1能',
  f:(g,_,c)=>{const threshold=c.u?4:5;const amt=Math.floor(g.block/threshold);if(amt>0){g.mantra=(g.mantra||0)+amt;g.energy=Math.min(g.maxEnergy+amt,g.energy+amt);g.block=0;addLog('🛡️ 以盾为祭:'+amt+'念力+'+amt+'能');}}});
addCard({id:'bladeVenom',name:'刀锋淬毒',c:1,type:'power',rarity:'uncommon',target:'self',
  desc:'能力:攻击牌施加3毒',uDesc:'能力:攻击牌施加5毒',
  f:(g,_,c)=>{g.bladeVenom=(g.bladeVenom||0)+(c.u?5:3);}});

addCard({id:'jackOfTrades',name:'万金油',c:0,type:'skill',rarity:'uncommon',target:'self',
  desc:'从3张随机无色牌选1入手牌;消耗',uDesc:'从3张随机无色牌选1入手牌;获得1能;消耗',
  f:(g,_,c)=>{const pool=ALL_CARDS.filter(x=>x.rarity!=='basic'&&x.rarity!=='status'&&x.rarity!=='common');shuffle(pool);const cards=pool.slice(0,3);g._seekCards=cards;g._seekCount=1;g._seekPicks=0;g._seekFilter='any';g._seekSource='pool';g.phase='seekPick';if(c.u)g.energy=Math.min(g.maxEnergy+1,g.energy+1);}});

// 保留体系:回合结束保留手牌
addCard({id:'wellLaidPlans',name:'缜密计划',c:0,type:'power',rarity:'uncommon',target:'self',
  desc:'能力:回合末保留1张手牌',uDesc:'能力:回合末保留2张手牌',
  f:(g,_,c)=>{g.retainCount=(g.retainCount||0)+(c.u?2:1);}});
// 体系碰撞:复制/翻倍
addCard({id:'burst',name:'回响',c:1,type:'skill',rarity:'rare',target:'self',
  desc:'本回合下张技能牌打出2次;消耗',uDesc:'本回合下张技能牌打出2次',
  f:(g,_,c)=>{g.skillDouble=true;if(c.u)c.ex=false;},ex:true});
// 小众机制扩展:自残/状态/格挡反击
addCard({id:'bloodExplosion',name:'血爆术',c:1,type:'skill',rarity:'rare',target:'self',
  desc:'自损4血;本场每失去1HP对全体造成1伤;消耗',uDesc:'自损4血;本场每失去1HP对全体造成1.5伤;消耗',
  f:(g,_,c)=>{const hpLost=g._hpLostCombat||0;const mult=c.u?1.5:1;dmgPlayerD(g,4);const d=Math.floor(hpLost*mult);if(d>0)g.enemies.forEach(e=>{if(e.hp>0)dmgEnemy(e,d,g);});addLog('💥 血爆术 HP损失'+hpLost+'='+d+'AOE');},ex:true});
addCard({id:'woundToss',name:'伤口投掷',c:1,type:'attack',rarity:'uncommon',target:'enemy',
  desc:'8伤;弃牌堆每张状态牌+3伤',uDesc:'12伤;弃牌堆每张状态牌+5伤',
  f:(g,en,c)=>{const e=en[0];if(!e)return;const statusCount=(g.discard||[]).filter(x=>{const d=def(x);return d&&d.type==='status';}).length;dmgEnemy(e,(c.u?12:8)+statusCount*(c.u?5:3),g);}});
addCard({id:'ironCounter',name:'铁壁反击',c:2,type:'skill',rarity:'uncommon',target:'self',
  desc:'获得15格挡;下回合开始对全体造成等于格挡值的伤害',uDesc:'获得20格挡;下回合开始对全体造成等于格挡值的1.5倍伤害',
  f:(g,_,c)=>{g.block+=c.u?20:15;g._ironCounter=c.u?1.5:1;addLog('🛡️ 铁壁反击蓄力!');}});
// StS还原:关键机制卡
addCard({id:'lessonLearned',name:'习得',c:1,type:'attack',rarity:'rare',target:'enemy',
  desc:'10伤;击杀则随机升级1张牌',uDesc:'15伤;击杀则随机升级1张牌',
  f:(g,en,c)=>{const e=en[0];if(!e)return;const bf=e.hp;dmgEnemy(e,c.u?15:10,g);if(e.hp<=0&&bf>0){const pool=g.deck.filter(x=>!x.u);if(pool.length){const p=pool[Math.floor(Math.random()*pool.length)];p.u=true;addLog('📖 习得升级:'+p.name);addFX(480,280,'⬆️习得!','#FFD700');}}}});

addCard({id:'talkToHand',name:'问手',c:1,type:'attack',rarity:'uncommon',target:'enemy',
  desc:'5伤;下回合获得等量格挡',uDesc:'8伤;下回合获得等量格挡',
  f:(g,en,c)=>{const e=en[0];if(!e)return;const d=c.u?8:5;const bf=e.hp;dmgEnemy(e,d,g);const dealt=Math.min(d,bf);if(dealt>0)g._talkHand=(g._talkHand||0)+dealt;addLog('🖐️ 问手下回合+'+(g._talkHand||0)+'甲');}});
// 速攻体系: 0费过牌 + 能量回收
addCard({id:'gustSlash',name:'疾风斩',c:0,type:'attack',rarity:'common',target:'enemy',
  desc:'造成6点伤害',uDesc:'造成9点伤害',
  f:(g,en,c)=>{const e=en[0];if(!e)return;dmgEnemy(e,c.u?9:6,g);}});
addCard({id:'energyChannel',name:'能量分流',c:1,type:'skill',rarity:'uncommon',target:'self',
  desc:'本回合每用3张牌得1能量(至少1)',uDesc:'本回合每用2张牌得1能量(至少1)',
  f:(g,_,c)=>{const t=c.u?2:3;const e=Math.max(1,Math.floor((g.cardsPlayed||0)/t));
    g.energy=Math.min(g.maxEnergy+e,g.energy+e);
    addFX(480,280,'⚡能量分流+'+(e)+'能','#AD8BFF');addLog('⚡能量分流+'+e+'能(已打'+(g.cardsPlayed||0)+'张)');}});

// 静默猎手专属卡牌
addCard({id:'neutralize',name:'中和',c:0,type:'attack',rarity:'basic',target:'enemy',desc:'4伤+1虚',uDesc:'6伤+2虚+抽1',f:(g,en,c)=>{const e=en[0];if(!e)return;dmgEnemy(e,c.u?6:4,g);e.weak=(e.weak||0)+(c.u?2:1);if(c.u)drawCards(1);}});
addCard({id:'quickSlash',name:'精准打击',c:1,type:'attack',rarity:'common',target:'enemy',desc:'13伤;手牌≤3抽1',uDesc:'15伤;手牌≤3抽2',f:(g,en,c)=>{const e=en[0];if(!e)return;dmgEnemy(e,c.u?15:13,g);if(g.hand.length<=3)drawCards(c.u?2:1);}});
addCard({id:'bladeDance',name:'刀舞',c:1,type:'skill',rarity:'uncommon',target:'self',desc:'加3张小刀到手牌',uDesc:'加4张小刀到手牌',f:(g,_,c)=>{const n=c.u?4:3;for(let i=0;i<n;i++)g.hand.push({...M.shiv,id:'shiv_'+Date.now()+'_'+i});}});
addCard({id:'cloakDagger',name:'斗篷',c:1,type:'attack',rarity:'common',target:'enemy',desc:'6伤+1小刀',uDesc:'6伤+2刀+回1能',f:(g,en,c)=>{const e=en[0];if(!e)return;dmgEnemy(e,6,g);const n=c.u?2:1;for(let i=0;i<n;i++)g.hand.push({...M.shiv,id:'shiv_cd'+Date.now()+'_'+i});if(c.u)g.energy=Math.min(g.maxEnergy,g.energy+1);}});
addCard({id:'deadlyPoison',name:'致命毒药',c:1,type:'skill',rarity:'common',target:'self',desc:'全体5毒',uDesc:'全体6毒+1易伤',f:(g,_,c)=>{const v=c.u?6:5;g.enemies.forEach(e=>{if(e.hp>0){e.poison=(e.poison||0)+v;if(c.u)e.vulnerable=(e.vulnerable||0)+1;}});}});
addCard({id:'noxiousFumes',name:'毒雾',c:1,type:'power',rarity:'uncommon',target:'self',desc:'能力:回合全3毒+入手3甲',uDesc:'能力:回合全5毒+入手5甲',in:true,f:(g,_,c)=>{g.noxiousFumes=(g.noxiousFumes||0)+(c.u?5:3);g.block+=c.u?5:3;}});
addCard({id:'catalyst',name:'催化剂',c:1,type:'skill',rarity:'uncommon',target:'self',desc:'全体中毒翻倍;消耗',uDesc:'全体中毒翻3倍;消耗',f:(g,_,c)=>{const m=c.u?3:2;g.enemies.forEach(e=>{if(e.hp>0&&e.poison>0)e.poison*=m;});},ex:true});
addCard({id:'escapePlan',name:'逃脱计划',c:0,type:'skill',rarity:'common',target:'self',desc:'抽1张牌;若抽到技能+3甲',uDesc:'抽1张牌;若抽到技能+5甲',f:(g,_,c)=>{const top=g.draw.length?g.draw[g.draw.length-1]:null;drawCards(1);if(top){const d=def(top);if(d&&d.type==='skill')g.block+=c.u?5:3;}}});
addCard({id:'afterImage',name:'残影',c:1,type:'power',rarity:'rare',target:'self',desc:'能力:每打1牌得3甲+入手3甲',uDesc:'能力:每打1牌得5甲+入手5',in:true,iu:true,f:(g,_,c)=>{g.afterImage=(g.afterImage||0)+(c.u?5:3);g.block+=c.u?5:3;}});
addCard({id:'acrobatics',name:'杂技',c:1,type:'skill',rarity:'common',target:'self',desc:'抽3张牌;弃1张',uDesc:'抽4张牌;弃1张',f:(g,_,c)=>{drawCards(c.u?4:3);if(g.hand.length>0)g.discard.push(g.hand.pop());}});
addCard({id:'dodgeRoll',name:'后空翻',c:1,type:'skill',rarity:'common',target:'self',desc:'6格挡;抽1张牌',uDesc:'9格挡;抽2张牌',f:(g,_,c)=>{g.block+=c.u?9:6;drawCards(c.u?2:1);}});
addCard({id:'survivor',name:'生存者',c:1,type:'skill',rarity:'common',target:'self',desc:'8格挡;弃1张牌',uDesc:'11格挡;弃1张牌',f:(g,_,c)=>{g.block+=c.u?11:8;if(g.hand.length>0)g.discard.push(g.hand.pop());}});
addCard({id:'calcGamble',name:'计算下注',c:1,type:'skill',rarity:'uncommon',target:'self',desc:'弃所有+抽等量;消耗',uDesc:'弃所有+抽等+1回能;消耗',f:(g,_,c)=>{const n=g.hand.length+(c.u?1:0);g.hand.forEach(cd=>g.discard.push(cd));g.hand=[];drawCards(n);if(c.u)g.energy=Math.min(g.maxEnergy,g.energy+1);},ex:true});
addCard({id:'backstab',name:'内切',c:0,type:'attack',rarity:'uncommon',target:'enemy',desc:'8伤;消耗',uDesc:'11伤+抽1;消耗',f:(g,en,c)=>{const e=en[0];if(!e)return;dmgEnemy(e,c.u?11:8,g);if(c.u)drawCards(1);},ex:true});
addCard({id:'skewer',name:'穿刺',c:-1,type:'attack',rarity:'uncommon',target:'enemy',desc:'X能量:X次9伤害',uDesc:'X能量:X次12伤害',f:(g,en,c)=>{const e=en[0];if(!e)return;for(let i=0;i<(g._lastXCost||0);i++)if(e.hp>0)dmgEnemy(e,c.u?12:9,g);}});
addCard({id:'bane',name:'灾祸',c:1,type:'attack',rarity:'common',target:'enemy',desc:'7伤;若中毒变14伤',uDesc:'10伤;若中毒变20伤',f:(g,en,c)=>{const e=en[0];if(!e)return;const base=c.u?10:7;const bonus=(e.poison||0)>0?(c.u?10:7):0;dmgEnemy(e,base+bonus,g);}});
addCard({id:'piercingWail',name:'尖啸',c:1,type:'skill',rarity:'uncommon',target:'self',desc:'全体-3攻(本回合);消耗',uDesc:'全体-5攻(本回合);消耗',f:(g,_,c)=>{const v=c.u?5:3;g.enemies.forEach(e=>{if(e.hp>0)e.strength=Math.max(0,(e.strength||0)-v);});},ex:true});
addCard({id:'legSweep',name:'扫腿',c:2,type:'skill',rarity:'common',target:'self',desc:'获得13格挡;全体2层虚弱',uDesc:'获得17格挡;全体2层虚弱',f:(g,_,c)=>{g.block+=c.u?17:13;g.enemies.forEach(e=>{if(e.hp>0)e.weak=(e.weak||0)+2;});}});
addCard({id:'poisonedStab',name:'毒刺',c:1,type:'attack',rarity:'common',target:'enemy',desc:'6伤+3毒',uDesc:'6伤+5毒+抽1',f:(g,en,c)=>{const e=en[0];if(!e)return;dmgEnemy(e,6,g);e.poison=(e.poison||0)+(c.u?5:3);if(c.u)drawCards(1);}});
addCard({id:'cripplingCloud',name:'致残毒云',c:2,type:'skill',rarity:'uncommon',target:'self',desc:'全体4毒+2虚弱;消耗',uDesc:'全体7毒+2虚弱;消耗',f:(g,_,c)=>{const v=c.u?7:4;g.enemies.forEach(e=>{if(e.hp>0){e.poison=(e.poison||0)+v;e.weak=(e.weak||0)+2;}});},ex:true});
addCard({id:'flyingKnee',name:'飞膝',c:1,type:'attack',rarity:'common',target:'enemy',desc:'11伤;下回合+1能',uDesc:'15伤;下回合+1能',f:(g,en,c)=>{const e=en[0];if(!e)return;dmgEnemy(e,c.u?15:11,g);G._nextTurnEnergyBonus=(G._nextTurnEnergyBonus||0)+1;}});
addCard({id:'dash',name:'猛冲',c:2,type:'attack',rarity:'common',target:'enemy',desc:'13伤+6甲',uDesc:'15伤+8甲+回1能',f:(g,en,c)=>{const e=en[0];if(!e)return;const dmg=c.u?15:13;const blk=c.u?8:6;dmgEnemy(e,dmg,g);g.block+=blk;if(c.u)g.energy=Math.min(g.maxEnergy,g.energy+1);}});
addCard({id:'suckerPunch',name:'偷袭',c:1,type:'attack',rarity:'common',target:'enemy',desc:'8伤+1虚',uDesc:'10伤+1虚+1易',f:(g,en,c)=>{const e=en[0];if(!e)return;dmgEnemy(e,c.u?10:8,g);e.weak=(e.weak||0)+1;if(c.u)e.vulnerable=(e.vulnerable||0)+1;}});
addCard({id:'daggerSpray',name:'匕首雨',c:1,type:'attack',rarity:'common',target:'all',desc:'全体6x2伤',uDesc:'全体6x2+敌虚弱',f:(g,en,c)=>{const b=6;en.forEach(e=>{if(e.hp>0){dmgEnemy(e,b,g);dmgEnemy(e,b,g);if(c.u)e.weak=(e.weak||0)+1;}});}});
addCard({id:'daggerThrow',name:'投匕',c:1,type:'attack',rarity:'common',target:'enemy',desc:'11伤+弃1+抽1',uDesc:'11伤+弃时打2+抽1',f:(g,en,c)=>{const e=en[0];if(!e)return;dmgEnemy(e,11,g);if(g.hand.length>0){const cd=g.hand.pop();g.discard.push(cd);if(c.u){const tg=g.enemies.find(o=>o.hp>0);if(tg)dmgEnemy(tg,2,g);}}drawCards(1);}});
addCard({id:'footwork',name:'步法',c:1,type:'power',rarity:'uncommon',target:'self',desc:'能力:+3敏+入手3甲',uDesc:'能力:+5敏+入手6甲',in:true,iu:true,f:(g,_,c)=>{g.dexterity=(g.dexterity||0)+(c.u?5:3);g.block+=c.u?6:3;}});
addCard({id:'caltrops',name:'蒺藜',c:1,type:'power',rarity:'uncommon',target:'self',desc:'能力:回合全3伤',uDesc:'能力:回合全5+入手3刺',in:true,iu:true,f:(g,_,c)=>{g.caltrops=(g.caltrops||0)+(c.u?5:3);if(c.u)g.thorns=(g.thorns||0)+3;}});
addCard({id:'predator',name:'掠食',c:2,type:'attack',rarity:'uncommon',target:'enemy',desc:'18伤;下回合多抽2张',uDesc:'24伤;下回合多抽2张',f:(g,en,c)=>{const e=en[0];if(!e)return;dmgEnemy(e,c.u?24:18,g);G._nextTurnDrawBonus=(G._nextTurnDrawBonus||0)+2;}});
addCard({id:'terror',name:'恐慌',c:1,type:'skill',rarity:'uncommon',target:'self',desc:'全体3层易伤;消耗',uDesc:'全体3层易伤;下回+2抽;消耗',f:(g,_,c)=>{g.enemies.forEach(e=>{if(e.hp>0)e.vulnerable=(e.vulnerable||0)+3;});if(c.u)G._nextTurnDrawBonus=(G._nextTurnDrawBonus||0)+2;},ex:true});
addCard({id:'outmaneuver',name:'策略',c:1,type:'skill',rarity:'uncommon',target:'self',desc:'+2能;消耗',uDesc:'+3能+抽1;消耗',f:(g,_,c)=>{const e=c.u?3:2;g.energy=Math.min(g.maxEnergy+e,g.energy+e);if(c.u)drawCards(1);},ex:true});
addCard({id:'riddleHoles',name:'千疮百孔',c:1,type:'attack',rarity:'uncommon',target:'enemy',desc:'7伤x5',uDesc:'10伤x5',f:(g,en,c)=>{const e=en[0];if(!e)return;const b=c.u?10:7;for(let i=0;i<5;i++)if(e.hp>0)dmgEnemy(e,b,g);}});
addCard({id:'blur',name:'模糊',c:1,type:'skill',rarity:'uncommon',target:'self',desc:'12格挡;下回合不清零',uDesc:'16格挡;下回合不清零',f:(g,_,c)=>{g.block+=c.u?16:12;g._blurNextTurn=true;}});
addCard({id:'slice',name:'切割',c:0,type:'attack',rarity:'common',target:'enemy',desc:'10伤',uDesc:'15伤',f:(g,en,c)=>{const e=en[0];if(!e)return;dmgEnemy(e,c.u?15:10,g);}});
addCard({id:'danceKnife',name:'舞刃',c:1,type:'attack',rarity:'uncommon',target:'enemy',desc:'4伤x2;手牌有刀额外+1次',uDesc:'6伤x2;手牌有刀额外+1次',f:(g,en,c)=>{const e=en[0];if(!e)return;const b=c.u?6:4;let t=2;if(g.hand.some(x=>def(x)&&def(x).id==='shiv'))t++;for(let i=0;i<t;i++)if(e.hp>0)dmgEnemy(e,b,g);}});
addCard({id:'toxinBurst',name:'毒爆',c:1,type:'skill',rarity:'uncommon',target:'self',desc:'消耗敌人所有中毒;每层造成3伤;消耗',uDesc:'消耗敌人所有中毒;每层造成5伤;消耗',f:(g,_,c)=>{g.enemies.forEach(e=>{if(e.hp>0&&e.poison>0){const d=e.poison*(c.u?5:3);e.poison=0;dmgEnemy(e,d,g);addFX(480,130,'💥毒爆!','#9C27B0',20);}});},ex:true});
addCard({id:'stormSteel',name:'钢铁风暴',c:1,type:'skill',rarity:'uncommon',target:'self',desc:'丢弃所有手牌;每弃1张获得1张小刀;消耗',uDesc:'丢弃所有手牌;每弃1张获得2张小刀;消耗',f:(g,_,c)=>{const n=g.hand.length;const mult=c.u?2:1;g.hand.forEach(x=>g.discard.push(x));g.hand=[];for(let i=0;i<n*mult;i++)g.hand.push({...M.shiv,id:'shiv_ss'+Date.now()+'_'+i});},ex:true});
addCard({id:'envenom',name:'涂毒',c:1,type:'power',rarity:'uncommon',target:'self',desc:'能力:攻击+1毒;入手抽1',uDesc:'能力:攻击+2毒+3甲',in:true,iu:true,f:(g,_,c)=>{g.envenom=(g.envenom||0)+(c.u?2:1);drawCards(1);if(c.u)g.block+=3;}});

addCard({id:'phantasmalKiller',name:'幻影杀手',c:1,type:'power',rarity:'rare',target:'self',desc:'本回合伤害+50%;入手4甲',uDesc:'本回合+50%+回1能+6甲',f:(g,_,c)=>{g.phantasmalKiller=true;g.block+=c.u?6:4;if(c.u)g.energy=Math.min(g.maxEnergy,g.energy+1);}});

// 观者专属卡牌
addCard({id:'eruption',name:'爆发',c:1,uc:2,type:'attack',rarity:'basic',target:'enemy',desc:'9伤害;进入怒火姿态',uDesc:'12伤害;进入怒火姿态(2费)',f:(g,en,c)=>{const e=en[0];if(!e)return;dmgEnemy(e,c.u?12:9,g);setStance(g,'wrath');}});
addCard({id:'vigilance',name:'警惕',c:1,type:'skill',rarity:'basic',target:'self',desc:'9格挡;进入宁静姿态',uDesc:'12格挡;进入宁静姿态',f:(g,_,c)=>{g.block+=c.u?12:9;setStance(g,'calm');}});
addCard({id:'emptyFist',name:'空手',c:1,type:'attack',rarity:'common',target:'enemy',desc:'12伤害;退出当前姿态',uDesc:'17伤害;退出当前姿态',f:(g,en,c)=>{const e=en[0];if(!e)return;dmgEnemy(e,c.u?17:12,g);g.stance='neutral';}});
addCard({id:'sanctity',name:'神圣',c:1,type:'skill',rarity:'common',target:'self',desc:'9格挡;抽2张牌',uDesc:'12格挡;抽2张牌',f:(g,_,c)=>{g.block+=c.u?12:9;drawCards(2);}});
addCard({id:'fearNoEvil',name:'无畏',c:1,type:'attack',rarity:'uncommon',target:'enemy',desc:'12伤;若敌攻击则进宁静',uDesc:'16伤;若敌攻击则进宁静',f:(g,en,c)=>{const e=en[0];if(!e)return;dmgEnemy(e,c.u?16:12,g);const intent=e.ci;if(intent&&intent.t==='a')setStance(g,'calm');}});
addCard({id:'tantrum',name:'暴怒',c:1,type:'attack',rarity:'uncommon',target:'enemy',desc:'4伤x3;进入怒火姿态',uDesc:'6伤x3;进入怒火姿态',f:(g,en,c)=>{const e=en[0];if(!e)return;const b=c.u?6:4;for(let i=0;i<3;i++)if(e.hp>0)dmgEnemy(e,b,g);setStance(g,'wrath');}});
addCard({id:'consecrate',name:'圣洁',c:1,type:'attack',rarity:'uncommon',target:'all',desc:'全体8伤;进宁静',uDesc:'全体11伤;进宁静',f:(g,en,c)=>{const b=c.u?11:8;en.forEach(e=>{if(e.hp>0)dmgEnemy(e,b,g);});setStance(g,'calm');}});
addCard({id:'meditate',name:'冥想',c:1,type:'skill',rarity:'uncommon',target:'self',desc:'8甲;进宁静;弃1放回抽牌堆',uDesc:'11甲;进宁静;弃1放回抽牌堆',f:(g,_,c)=>{g.block+=c.u?11:8;setStance(g,'calm');if(g.hand.length>0){const top=g.hand.pop();g.draw.push(top);}}});
addCard({id:'cutThroughFate',name:'斩破命运',c:1,type:'attack',rarity:'common',target:'enemy',desc:'9伤;抽1后弃1放回抽牌堆',uDesc:'12伤;抽1后弃1放回抽牌堆',f:(g,en,c)=>{const e=en[0];if(!e)return;dmgEnemy(e,c.u?12:9,g);drawCards(1);if(g.hand.length>0){const top=g.hand.pop();g.draw.push(top);}}});
addCard({id:'study',name:'研习',c:1,type:'power',rarity:'uncommon',target:'self',desc:'每回2随机牌;入手抽2',uDesc:'每回3+入手抽2+3甲',in:true,iu:true,f:(g,_,c)=>{g.study=c.u?3:2;drawCards(c.u?2:1);if(c.u)g.block+=3;}});
addCard({id:'pray',name:'祈祷',c:1,type:'skill',rarity:'uncommon',target:'self',desc:'6念力;消耗',uDesc:'10念力+3甲;消耗',f:(g,_,c)=>{g.mantra=(g.mantra||0)+(c.u?10:6);if(c.u)g.block+=3;},ex:true});
addCard({id:'strikeOfFlurry',name:'急袭',c:1,type:'attack',rarity:'uncommon',target:'enemy',desc:'7伤;切换姿态时此牌从弃牌堆返回',uDesc:'10伤;切换姿态时返回',f:(g,en,c)=>{const e=en[0];if(!e)return;dmgEnemy(e,c.u?10:7,g);}});
addCard({id:'emptyBody',name:'空体',c:1,type:'skill',rarity:'common',target:'self',desc:'8甲;退出姿态',uDesc:'12甲+抽1;退出姿态',f:(g,_,c)=>{g.block+=c.u?12:8;g.stance='neutral';if(c.u)drawCards(1);}});
addCard({id:'wheelKick',name:'轮踢',c:2,type:'attack',rarity:'common',target:'enemy',desc:'15伤;抽2张牌',uDesc:'20伤;抽2张牌',f:(g,en,c)=>{const e=en[0];if(!e)return;dmgEnemy(e,c.u?20:15,g);drawCards(2);}});
addCard({id:'worship',name:'崇拜',c:2,type:'skill',rarity:'rare',target:'self',desc:'5念力;消耗',uDesc:'进神格;消耗',f:(g,_,c)=>{if(c.u)setStance(g,'divinity');else g.mantra=(g.mantra||0)+5;},ex:true});
addCard({id:'prostrate',name:'伏地',c:1,type:'skill',rarity:'common',target:'self',desc:'4甲+3念力',uDesc:'6甲+4念力',f:(g,_,c)=>{g.block+=c.u?6:4;g.mantra=(g.mantra||0)+(c.u?4:3);}});
addCard({id:'devotion',name:'虔诚',c:1,type:'power',rarity:'uncommon',target:'self',desc:'能力:回合5念力;入手5甲',uDesc:'能力:回合7+入手8',in:true,iu:true,f:(g,_,c)=>{g.devotion=(g.devotion||0)+(c.u?7:5);g.block+=c.u?8:5;}});
addCard({id:'brilliance',name:'光辉',c:1,type:'attack',rarity:'uncommon',target:'enemy',desc:'12+念力伤',uDesc:'16+念力伤',f:(g,en,c)=>{const e=en[0];if(!e)return;const m=g.mantra||0;dmgEnemy(e,(c.u?16:12)+m,g);}});
addCard({id:'conclude',name:'终结',c:1,type:'attack',rarity:'uncommon',target:'all',desc:'全体14伤;消耗',uDesc:'全体18伤;消耗',f:(g,en,c)=>{const b=c.u?18:14;en.forEach(e=>{if(e.hp>0)dmgEnemy(e,b,g);});},ex:true});
addCard({id:'rushdown',name:'急冲',c:1,type:'attack',rarity:'uncommon',target:'enemy',desc:'6伤;进过怒火则抽2',uDesc:'10伤;进过怒火则抽2',f:(g,en,c)=>{const e=en[0];if(!e)return;dmgEnemy(e,c.u?10:6,g);if(G._enteredWrath)drawCards(2);}});
addCard({id:'mentalFortress',name:'精神壁垒',c:1,type:'power',rarity:'uncommon',target:'self',desc:'能力:切换姿态得8甲+抽1',uDesc:'能力:切换姿态得12甲+抽1',in:true,iu:true,f:(g,_,c)=>{g.mentalFortress=(g.mentalFortress||0)+(c.u?12:8);}});
addCard({id:'indignation',name:'愤怒',c:1,type:'skill',rarity:'common',target:'self',desc:'2念力;怒火时8甲',uDesc:'3念力;怒火时12甲',f:(g,_,c)=>{g.mantra=(g.mantra||0)+(c.u?3:2);if(g.stance==='wrath')g.block+=c.u?12:8;}});
addCard({id:'evaluate',name:'评估',c:1,type:'skill',rarity:'common',target:'self',desc:'11甲+抽1;宁静额外4甲',uDesc:'14甲+抽1;宁静额外4甲',f:(g,_,c)=>{const b=c.u?14:11;g.block+=b;if(g.stance==='calm')g.block+=4;drawCards(1);}});
addCard({id:'likeWater',name:'如水',c:1,type:'power',rarity:'uncommon',target:'self',desc:'能力:宁静末+10甲+入手4甲',uDesc:'能力:宁静末+14甲+入手6',iu:true,f:(g,_,c)=>{g.likeWater=(g.likeWater||0)+(c.u?14:10);g.block+=c.u?6:4;}});
addCard({id:'meditateSimple',name:'凝神',c:0,type:'skill',rarity:'common',target:'self',desc:'1念力+抽1;消耗',uDesc:'2念力+抽1;消耗',f:(g,_,c)=>{g.mantra=(g.mantra||0)+(c.u?2:1);drawCards(1);},ex:true});
addCard({id:'battleHymn',name:'战歌',c:1,type:'power',rarity:'uncommon',target:'self',desc:'每回合1张随机攻-1费',uDesc:'每回合2张随机攻-1费',f:(g,_,c)=>{g.battleHymn=c.u?2:1;}});
addCard({id:'sigSoul',name:'魂之羁绊',c:1,type:'attack',rarity:'uncommon',target:'enemy',desc:'12伤;切换过姿态+8',uDesc:'16伤;切换过姿态+10',f:(g,en,c)=>{const e=en[0];if(!e)return;let d=c.u?16:12;if(G._enteredWrath||G._enteredCalm)d+=c.u?10:8;dmgEnemy(e,d,g);}});
addCard({id:'innerPeace',name:'内心宁静',c:1,type:'skill',rarity:'uncommon',target:'self',desc:'宁静时抽3;否则进宁静',uDesc:'宁静时抽4;否则进宁静',f:(g,_,c)=>{if(g.stance==='calm')drawCards(c.u?4:3);else setStance(g,'calm');}});
addCard({id:'crescendo',name:'渐强',c:1,type:'skill',rarity:'uncommon',target:'self',desc:'进怒火;消耗',uDesc:'进怒火+抽1;消耗',f:(g,_,c)=>{setStance(g,'wrath');if(c.u)drawCards(1);},ex:true});
addCard({id:'halt',name:'止步',c:1,type:'skill',rarity:'common',target:'self',desc:'4甲;怒火时+7甲',uDesc:'7甲;怒火时+10甲',f:(g,_,c)=>{const b=c.u?7:4;g.block+=b;if(g.stance==='wrath')g.block+=c.u?10:7;}});
addCard({id:'flyingSleeves',name:'飞袖',c:1,type:'attack',rarity:'common',target:'enemy',desc:'6伤x2',uDesc:'8伤x2',f:(g,en,c)=>{const e=en[0];if(!e)return;const b=c.u?8:6;for(let i=0;i<2;i++)if(e.hp>0)dmgEnemy(e,b,g);}});
addCard({id:'clearMind',name:'清醒',c:1,type:'skill',rarity:'common',target:'self',desc:'8甲+退出姿态+抽1',uDesc:'11甲+退出姿态+抽1',f:(g,_,c)=>{g.block+=c.u?11:8;g.stance='neutral';drawCards(1);}});
addCard({id:'justLucky',name:'只靠运气',c:0,type:'attack',rarity:'common',target:'enemy',desc:'4伤+3甲',uDesc:'6伤+4甲',f:(g,en,c)=>{const e=en[0];if(!e)return;dmgEnemy(e,c.u?6:4,g);g.block+=c.u?4:3;}});
addCard({id:'furyFist',name:'怒拳',c:1,type:'attack',rarity:'uncommon',target:'enemy',desc:'12伤;怒火时+6甲',uDesc:'16伤;怒火时+8甲',f:(g,en,c)=>{const e=en[0];if(!e)return;dmgEnemy(e,c.u?16:12,g);if(g.stance==='wrath')g.block+=c.u?8:6;}});
addCard({id:'windGuard',name:'御风',c:1,type:'skill',rarity:'uncommon',target:'self',desc:'12甲;宁静时抽2',uDesc:'16甲;宁静时抽3',f:(g,_,c)=>{g.block+=c.u?16:12;if(g.stance==='calm')drawCards(c.u?3:2);}});

// 还原补全卡牌
addCard({id:'secondWind',name:'第二阵风',c:1,type:'skill',rarity:'uncommon',target:'self',desc:'消耗所有非攻击牌;每张得5甲',uDesc:'每张得7甲+回1能',f:(g,_,c)=>{let cnt=0;for(let i=g.hand.length-1;i>=0;i--){const d=def(g.hand[i]);if(d&&d.type!=='attack'){g.exhaust.push(g.hand[i]);g.hand.splice(i,1);cnt++;if(g.fnp>0)g.block+=g.fnp;}}g.block+=cnt*(c.u?7:5);if(c.u)g.energy=Math.min(g.maxEnergy,g.energy+1);},ex:true});
addCard({id:'bulletTime',name:'子弹时间',c:3,type:'skill',rarity:'rare',target:'self',desc:'手牌费用降为0(本回合)',uDesc:'2费',f:(g,_,c)=>{g.hand.forEach(cd=>{if(cd.originalCost===undefined)cd.originalCost=cd.c;cd.c=0;});if(c.u){};},cP:g=>{if(G._bulletTimeActive)return true;G._bulletTimeActive=true;G.hand.forEach(cd=>{cd.c=0;});return true;}});
addCard({id:'dieDieDie',name:'死吧死吧',c:1,type:'attack',rarity:'rare',target:'all',desc:'全体10伤;消耗',uDesc:'全体14伤;消耗',f:(g,en,c)=>{const b=c.u?14:10;en.forEach(e=>{if(e.hp>0)dmgEnemy(e,b,g);});},ex:true});
addCard({id:'handOfGreed',name:'贪婪之手',c:2,type:'attack',rarity:'rare',target:'enemy',desc:'20伤;击杀+5金币',uDesc:'25伤;击杀+5金币',f:(g,en,c)=>{const e=en[0];if(!e)return;const bf=e.hp;const dmg=c.u?25:20;dmgEnemy(e,dmg,g);if(e.hp<=0&&bf>0){g.gold+=5;addFX(480,120,'🪙+5金币','#FFD700');addLog('🪙 贪婪之手+5金币');}}});


// 跨体系连接卡牌
addCard({id:'burningArmor',name:'烈焰战甲',c:1,type:'power',rarity:'uncommon',target:'self',desc:'回合8甲;有灼烧+5+抽1',uDesc:'回合12甲;有灼烧+7+抽1',f:(g,_,c)=>{const v=c.u?12:8;g.burningArmor=(g.burningArmor||0)+v;g.block+=v+4;drawCards(1);}});
addCard({id:'poisonFrenzy',name:'毒血沸腾',c:1,type:'skill',rarity:'uncommon',target:'self',desc:'每毒+2力+2甲(本回);消耗',uDesc:'每毒+3力+3甲;消耗',f:(g,_,c)=>{const tl=g.enemies.reduce((s,e)=>s+(e.poison||0),0);const m=c.u?3:2;if(tl>0){const bon=tl*m;g.strength+=bon;g.block+=bon;g.energy=Math.min(g.maxEnergy+Math.min(2,bon),g.energy+Math.min(2,bon));addLog('☠️ 毒血沸腾+'+bon+'力+'+bon+'甲');addFX(480,240,'☠️毒血+'+(bon)+'力甲','#9C27B0');}},ex:true});
addCard({id:'shadowStance',name:'暗影姿态',c:1,type:'power',rarity:'uncommon',target:'self',desc:'切换姿态全2毒+抽1',uDesc:'切换姿态全3毒+抽1',f:(g,_,c)=>{g.shadowStance=(g.shadowStance||0)+(c.u?3:2);drawCards(1);}});
addCard({id:'orbResonance',name:'能量共鸣',c:1,type:'power',rarity:'uncommon',target:'self',desc:'每球种得2念力+抽1',uDesc:'每球种得3念力+抽2',f:(g,_,c)=>{var ts={};(g.orbs||[]).forEach(function(o){ts[o.type]=true;});var n=Object.keys(ts).length;var v=c.u?3:2;g.orbResonance=v;g.mantra=(g.mantra||0)+n*v;drawCards(c.u?2:1);}});
addCard({id:'soulLink',name:'灵魂链接',c:1,type:'power',rarity:'rare',target:'self',desc:'失1血抽3+1力;入手回5',uDesc:'失1血抽4+2力+入手8',f:(g,_,c)=>{g.soulLink=(g.soulLink||0)+(c.u?4:3);g.strength+=c.u?2:1;g.hp=Math.min(g.maxHp,g.hp+(c.u?8:5));}});
addCard({id:'ironBastion',name:'铁壁',c:1,type:'skill',rarity:'uncommon',target:'self',desc:'12甲;每消耗张+5甲+抽1',uDesc:'18甲;每消耗张+7甲+抽1',f:(g,_,c)=>{var cnt=g.exhaust?g.exhaust.length:0;var v=cnt*(c.u?7:5)+(c.u?18:12);g.block+=v;drawCards(1);addLog('🛡️ 铁壁+'+v+'甲');}});
addCard({id:'poisonDagger',name:'淬毒匕首',c:0,type:'attack',rarity:'common',target:'enemy',desc:'3伤+2毒;消耗',uDesc:'5伤+3毒;消耗',f:(g,en,c)=>{const e=en[0];if(!e)return;dmgEnemy(e,c.u?5:3,g);e.poison=(e.poison||0)+(c.u?3:2);},ex:true});
addCard({id:'yinYang',name:'阴阳',c:1,type:'power',rarity:'uncommon',target:'self',desc:'能力:切换姿态抽1+1甲',uDesc:'能力:切换姿态抽2+2甲+回1能',f:(g,_,c)=>{g.yinYang=(g.yinYang||0)+(c.u?2:1);g.block+=c.u?4:2;}});

// 各角色补强卡
addCard({id:'overload',name:'过载',c:1,type:'skill',rarity:'uncommon',target:'self',desc:'集中+2;球位-1;抽1;消耗',uDesc:'集中+3+甲5;球位-1;消耗',f:(g,_,c)=>{g.focus=(g.focus||0)+(c.u?3:2);g.maxOrbs=Math.max(1,(g.maxOrbs||3)-1);drawCards(1);if(c.u)g.block+=5;addLog('⚡ 过载:集中+'+(c.u?3:2));},ex:true});
addCard({id:'soulBarrier',name:'魂之壁垒',c:1,type:'skill',rarity:'uncommon',target:'self',desc:'消耗牌数×4甲;入手抽1',uDesc:'消耗牌数×6甲+抽1',f:(g,_,c)=>{var n=g.exhaust?g.exhaust.length:0;var v=n*(c.u?6:4);g.block+=v;drawCards(1);addLog('🛡️ 魂壁+'+v+'甲');}});
addCard({id:'toxicCloud',name:'毒云',c:2,type:'skill',rarity:'uncommon',target:'self',desc:'全体5毒+2虚;消耗',uDesc:'全体8毒+3虚;消耗',f:(g,_,c)=>{var v=c.u?8:5;g.enemies.forEach(function(e){if(e.hp>0){e.poison=(e.poison||0)+v;e.weak=(e.weak||0)+(c.u?3:2);}});},ex:true});
addCard({id:'lightningStorm',name:'雷霆风暴',c:2,type:'attack',rarity:'rare',target:'all',desc:'全体5伤x2;每电球+2伤',uDesc:'全体7伤x2;每电球+3伤',f:(g,en,c)=>{var bonus=Math.min(5,((g._totalLightning||0)/5|0))*(c.u?3:2);var b=(c.u?7:5)+bonus;en.forEach(function(e){if(e.hp>0){dmgEnemy(e,b,g);dmgEnemy(e,b,g);}});addFX(480,130,'⚡雷霆风暴!'+b+'x2','#FFD700');}});
// ===== Silent 缺失卡 =====
addCard({id:'endlessAgony',name:'无尽痛苦',c:0,type:'skill',rarity:'uncommon',target:'self',desc:'抽到时复制一张到手牌;消耗',uDesc:'抽到时复制一张到手牌;消耗',f:(g,_,c)=>{},ex:true});
addCard({id:'prepared',name:'准备',c:0,type:'skill',rarity:'common',target:'self',desc:'抽1张牌;弃1张牌',uDesc:'抽2张牌;弃1张牌',f:(g,_,c)=>{drawCards(c.u?2:1);if(g.hand.length>0)g.discard.push(g.hand.pop());}});
addCard({id:'poisonBlade',name:'淬毒之刃',c:1,type:'attack',rarity:'uncommon',target:'enemy',desc:'6伤+4毒',uDesc:'9伤+6毒',f:(g,en,c)=>{const e=en[0];if(!e)return;dmgEnemy(e,c.u?9:6,g);e.poison=(e.poison||0)+(c.u?6:4);}});
addCard({id:'shadowStep',name:'暗影步',c:1,type:'skill',rarity:'uncommon',target:'self',desc:'6甲;抽1张牌',uDesc:'9甲;抽2张牌',f:(g,_,c)=>{g.block+=c.u?9:6;drawCards(c.u?2:1);}});
// ===== Defect 缺失卡 =====
addCard({id:'fusion',name:'聚变',c:1,type:'skill',rarity:'uncommon',target:'self',desc:'生成1个等离子球',uDesc:'生成1个等离子球;抽1',f:(g,_,c)=>{channel(g,'plasma',1);if(c.u)drawCards(1);}});
addCard({id:'equilibrium',name:'均衡',c:1,type:'skill',rarity:'uncommon',target:'self',desc:'13甲;保留手牌(本回合)',uDesc:'17甲;保留手牌(本回合)',f:(g,_,c)=>{g.block+=c.u?17:13;g._equilibrium=true;}});
addCard({id:'machineLearning',name:'机器学习',c:1,type:'power',rarity:'rare',target:'self',desc:'每回合多抽1张牌',uDesc:'每回合多抽1张牌;入手3甲',f:(g,_,c)=>{g.machineLearning=true;if(c.u)g.block+=3;}});
addCard({id:'biasedCognition',name:'偏差认知',c:1,type:'power',rarity:'rare',target:'self',desc:'集中+4;每回合-1集中',uDesc:'集中+6;每回合-1集中',f:(g,_,c)=>{g.biasedCognition=true;g.focus=(g.focus||0)+(c.u?6:4);}});
// ===== Ironclad 缺失卡 =====
addCard({id:'combust',name:'自燃',c:1,type:'power',rarity:'uncommon',target:'self',desc:'每回自伤1并对全体5伤',uDesc:'每回自伤1并对全体7+全易伤',f:(g,_,c)=>{g.combust=c.u?7:5;if(c.u)g.enemies.forEach(e=>{if(e.hp>0)e.vulnerable=(e.vulnerable||0)+1;});}});
addCard({id:'juggernaut',name:'冲锋者',c:2,type:'power',rarity:'rare',target:'self',desc:'得甲时对敌5伤',uDesc:'得甲时对敌8+全1虚',f:(g,_,c)=>{g.juggernaut=c.u?8:5;if(c.u)g.enemies.forEach(e=>{if(e.hp>0)e.weak=(e.weak||0)+1;});}});
addCard({id:'rage',name:'愤怒',c:0,type:'skill',rarity:'common',target:'self',desc:'本回合受伤时+3甲',uDesc:'本回合受伤时+5甲',f:(g,_,c)=>{g.rage=c.u?5:3;}});
// ===== Watcher 缺失卡 =====
addCard({id:'reachHeaven',name:'冲天',c:1,type:'attack',rarity:'common',target:'enemy',desc:'10伤;抽牌堆加入1张"登天"',uDesc:'14伤;抽牌堆加入1张"登天"',f:(g,en,c)=>{const e=en[0];if(!e)return;dmgEnemy(e,c.u?14:10,g);const ascendedCard={...M.ascendedOne,id:'ascendedOne_'+Date.now()};if(g.masterReality)ascendedCard.u=true;g.draw.push(ascendedCard);}});
addCard({id:'carveReality',name:'刻现实',c:1,type:'attack',rarity:'common',target:'enemy',desc:'6伤;获得1张"重击"',uDesc:'10伤;获得2张"重击"',f:(g,en,c)=>{const e=en[0];if(!e)return;dmgEnemy(e,c.u?10:6,g);const n=c.u?2:1;for(let i=0;i<n;i++){const smiteCard={...M.smite,id:'smite_'+Date.now()+'_'+i};if(g.masterReality)smiteCard.u=true;g.hand.push(smiteCard);}}});
addCard({id:'crushJoints',name:'碎关节',c:1,type:'attack',rarity:'common',target:'enemy',desc:'7伤;若敌人易伤回1能',uDesc:'10伤;若敌人易伤回1能',f:(g,en,c)=>{const e=en[0];if(!e)return;dmgEnemy(e,c.u?10:7,g);if((e.vulnerable||0)>0){g.energy=Math.min(g.maxEnergy,g.energy+1);addFX(480,240,'⚡碎关节回能!','#FFD700');}}});
addCard({id:'deceiveReality',name:'欺现实',c:1,type:'skill',rarity:'uncommon',target:'self',desc:'4甲;获得1张"护盾"',uDesc:'6甲;获得2张"护盾"',f:(g,_,c)=>{g.block+=c.u?6:4;const n=c.u?2:1;for(let i=0;i<n;i++){const safetyCard={...M.safety,id:'safety_'+Date.now()+'_'+i};if(g.masterReality)safetyCard.u=true;g.hand.push(safetyCard);}}});
addCard({id:'foreignInfluence',name:'外势',c:0,type:'skill',rarity:'uncommon',target:'self',desc:'从3张随机攻击牌选1入手;消耗',uDesc:'从3张随机攻击牌选1入手(0费);消耗',f:(g,_,c)=>{const pool=ALL_CARDS.filter(x=>x.type==='attack'&&x.rarity!=='basic'&&x.rarity!=='status');shuffle(pool);const cards=pool.slice(0,3);g._seekCards=cards;g._seekCount=1;g._seekPicks=0;g._seekFilter='any';g._seekSource='pool';g.phase='seekPick';},ex:true});
addCard({id:'foresight',name:'预见',c:1,type:'power',rarity:'uncommon',target:'self',desc:'能力:回合开始抽1弃1;入手抽1',uDesc:'能力:回合开始抽2弃1+入手4甲',f:(g,_,c)=>{g.foresight=(c.u?2:1);g.block+=c.u?4:0;drawCards(1);}});
addCard({id:'masterReality',name:'主现实',c:1,type:'power',rarity:'uncommon',target:'self',desc:'能力:生成的卡牌升级',uDesc:'能力:生成的卡牌升级+入手4甲',f:(g,_,c)=>{g.masterReality=true;if(c.u)g.block+=4;}});
addCard({id:'mantraStorm',name:'念力风暴',c:-1,type:'skill',rarity:'uncommon',target:'self',desc:'X费:获得X念力+进宁静',uDesc:'X费:获得X+1念力+进宁静',f:(g,_,c)=>{const x=(g._lastXCost||0)+(c.u?1:0);const mult=(g.stance==='calm')?2:1;g.mantra=(g.mantra||0)+x*mult;setStance(g,'calm');addLog('🌀 念力风暴+'+x*mult+'念力');}});
// ===== Silent 缺失卡 =====
addCard({id:'corpseExplosion',name:'尸爆',c:2,type:'skill',rarity:'rare',target:'self',desc:'全体6毒;死亡时对全体造成最大生命值伤害;消耗',uDesc:'全体9毒;死亡时对全体造成最大生命值伤害;消耗',f:(g,_,c)=>{const v=c.u?9:6;g.enemies.forEach(e=>{if(e.hp>0){e.poison=(e.poison||0)+v;e._corpseExplode=true;}});addLog('💀 尸爆施加!');},ex:true});
addCard({id:'eviscerate',name:'剔骨',c:3,type:'attack',rarity:'uncommon',target:'enemy',desc:'7伤x本回合弃牌数(每弃1-1费)',uDesc:'10伤x本回合弃牌数(每弃1-1费)',f:(g,en,c)=>{const e=en[0];if(!e)return;const discarded=g._discardedThisTurn||0;const d=c.u?10:7;const total=Math.max(1,discarded)*d;dmgEnemy(e,total,g);addLog('🗡️ 剔骨弃'+discarded+'张='+total+'伤');}});
addCard({id:'infiniteBlades',name:'无尽刀锋',c:1,type:'power',rarity:'uncommon',target:'self',desc:'能力:回合开始获得1张小刀',uDesc:'能力:回合开始获得2张小刀',in:true,f:(g,_,c)=>{g.infiniteBlades=(g.infiniteBlades||0)+(c.u?2:1);}});
addCard({id:'malaise',name:'萎靡',c:-1,type:'skill',rarity:'rare',target:'self',desc:'X费:全体X毒+X虚弱;消耗',uDesc:'X费:全体X+1毒+X+1虚弱;消耗',f:(g,_,c)=>{const x=(g._lastXCost||0)+(c.u?1:0);g.enemies.forEach(e=>{if(e.hp>0){e.poison=(e.poison||0)+x;e.weak=(e.weak||0)+x;}});},ex:true});
addCard({id:'toxicWave',name:'毒波',c:-1,type:'skill',rarity:'uncommon',target:'self',desc:'X费:全体毒+X*X甲',uDesc:'X费:全体毒+X+1甲',f:(g,_,c)=>{const x=(g._lastXCost||0)+(c.u?1:0);let cnt=0;g.enemies.forEach(e=>{if(e.hp>0){e.poison=(e.poison||0)+x;cnt++;}});g.block+=cnt*x;addLog('☠️ 毒波:'+x+'毒x'+cnt+'敌+'+(cnt*x)+'甲');}});
addCard({id:'wraithForm',name:'幽魂形态',c:3,type:'power',rarity:'rare',target:'self',desc:'能力:获得2层"虚无"(受伤降为1)',uDesc:'能力:获得3层"虚无"(受伤降为1)',f:(g,_,c)=>{const v=c.u?3:2;g.wraithForm=(g.wraithForm||0)+v;}});
addCard({id:'tactician',name:'策略家',c:1,type:'skill',rarity:'uncommon',target:'self',desc:'若本回合弃过牌+1能;消耗',uDesc:'若本回合弃过牌+2能;消耗',f:(g,_,c)=>{if((g._discardedThisTurn||0)>0){const e=c.u?2:1;g.energy=Math.min(g.maxEnergy+e,g.energy+e);addFX(480,260,'♟️策略家+'+(e)+'能','#FFD700');}},ex:true});
addCard({id:'expertise',name:'专精',c:1,type:'skill',rarity:'uncommon',target:'self',desc:'抽到手牌达到6张',uDesc:'抽到手牌达到7张',f:(g,_,c)=>{const target=c.u?7:6;const need=Math.max(0,target-g.hand.length);if(need>0)drawCards(need);}});
// ===== Defect 缺失卡 =====
addCard({id:'chill',name:'寒气',c:0,type:'skill',rarity:'uncommon',target:'self',desc:'每有1个敌人生成1冰霜球;消耗',uDesc:'每有1个敌人生成1冰霜球+1集中;消耗',f:(g,_,c)=>{const n=g.enemies.filter(e=>e.hp>0).length;for(let i=0;i<n;i++)channel(g,'frost',1);if(c.u)g.focus=(g.focus||0)+2;},ex:true});
addCard({id:'creativeAI',name:'创造性AI',c:3,type:'power',rarity:'rare',target:'self',desc:'能力:回合开始获得1张随机能力牌',uDesc:'能力:回合开始获得1张随机能力牌(2费)',f:(g,_,c)=>{g.creativeAI=true;if(c.u)g.energy=Math.min(g.maxEnergy+1,g.energy+1);}});
addCard({id:'darkness',name:'暗黑',c:1,type:'skill',rarity:'common',target:'self',desc:'生成1暗黑球',uDesc:'生成1暗黑球;暗黑伤害+4',f:(g,_,c)=>{channel(g,'dark',1);if(c.u){g._darkPool=(g._darkPool||0)+4;addFX(480,240,'🌑暗黑强化+4','#9C27B0');}}});
addCard({id:'fission',name:'裂变',c:0,type:'skill',rarity:'rare',target:'self',desc:'移除所有球体;每球+1能+抽1;消耗',uDesc:'移除所有球体;每球+2能+抽1;消耗',f:(g,_,c)=>{const n=g.orbs?g.orbs.length:0;const mult=c.u?2:1;g.orbs=[];if(n>0){g.energy=Math.min(g.maxEnergy+n*mult,g.energy+n*mult);drawCards(n);addLog('⚡ 裂变!移除'+n+'球+'+(n*mult)+'能+'+n+'抽');}addFX(480,240,'💥裂变!','#AD8BFF');},ex:true});
addCard({id:'helloWorld',name:'你好世界',c:1,type:'power',rarity:'uncommon',target:'self',desc:'能力:回合开始获得1张随机普通卡',uDesc:'能力:回合开始获得1张随机普通卡(固有)',f:(g,_,c)=>{g.helloWorld=c.u?2:1;if(c.u)g.block+=3;}});
addCard({id:'ripAndTear',name:'撕裂',c:1,type:'attack',rarity:'common',target:'enemy',desc:'随机敌人7伤x2',uDesc:'随机敌人10伤x2',f:(g,en,c)=>{const tg=g.enemies.filter(e=>e.hp>0);const b=c.u?10:7;for(let i=0;i<2;i++){if(tg.length){const e=pick(tg);if(e.hp>0)dmgEnemy(e,b,g);}}}});
addCard({id:'turbo',name:'涡轮',c:0,type:'skill',rarity:'common',target:'self',desc:'+2能;消耗',uDesc:'+3能;消耗',f:(g,_,c)=>{const e=c.u?3:2;g.energy=Math.min(g.maxEnergy+e,g.energy+e);},ex:true});
// ===== 缺失卡结束 =====

// ---- StS 还原卡 ----
addCard({id:'anger',name:'愤怒',c:1,type:'attack',rarity:'common',target:'enemy',desc:'8伤;复制消耗(复制不触发连击)',uDesc:'11伤;复制消耗(复制不触发连击)',f:(g,en,c)=>{const e=en[0];if(!e)return;dmgEnemy(e,c.u?11:8,g);const clone={...c,id:c.id+'_anger_'+Date.now(),ex:true};g.hand.push(clone);addLog('🔥 愤怒复制!');}});
addCard({id:'bloodForBlood',name:'以血还血',c:4,type:'attack',rarity:'uncommon',target:'enemy',desc:'18伤;本场每失去2HP-1费',uDesc:'22伤;本场每失去2HP-1费',f:(g,en,c)=>{const e=en[0];if(!e)return;const hpLost=g._hpLostCombat||0;const reduction=Math.min(3,Math.floor(hpLost/2));c.c=Math.max(1,4-reduction);dmgEnemy(e,c.u?22:18,g);}});
addCard({id:'clothesline',name:'晾衣绳',c:2,type:'attack',rarity:'common',target:'enemy',desc:'14伤+2虚弱',uDesc:'18伤+3虚弱',f:(g,en,c)=>{const e=en[0];if(!e)return;dmgEnemy(e,c.u?18:14,g);e.weak=(e.weak||0)+(c.u?3:2);}});
addCard({id:'dualWield',name:'双持',c:1,type:'skill',rarity:'rare',target:'self',desc:'复制1张手牌(保留);消耗',uDesc:'复制1张手牌(保留);消耗',f:(g,_,c)=>{if(g.hand.length>0){const idx=Math.floor(Math.random()*g.hand.length);const cd=g.hand[idx];g.hand.push({...cd,id:cd.id+'_dw_'+Date.now()});addLog('⚔️ 双持复制:'+cd.name);}},ex:true});
addCard({id:'havoc',name:'浩劫',c:1,type:'skill',rarity:'common',target:'self',desc:'打出抽牌堆顶牌;消耗',uDesc:'打出抽牌堆顶牌;抽1;消耗',f:(g,_,c)=>{if(g.draw.length>0){const top=g.draw.pop();const d=def(top);if(d&&d.f){if(d.type==='attack'){const tg=g.enemies.filter(e=>e.hp>0);if(tg.length)d.f(g,[tg[0]],top);else d.f(g,null,top);}else d.f(g,null,top);}addLog('💥 浩劫打出:'+(top.name||'?'));g.exhaust.push(top);if(c.u)drawCards(1);}},ex:true});
addCard({id:'searingBlow',name:'灼热打击',c:2,type:'attack',rarity:'uncommon',target:'enemy',desc:'12伤;可在篝火多次升级',uDesc:'16伤;可在篝火多次升级',f:(g,en,c)=>{const e=en[0];if(!e)return;const lvl=c._searingLevel||0;const bonus=lvl*(c.u?8:6);dmgEnemy(e,(c.u?16:12)+bonus,g);}});
addCard({id:'shockwave',name:'冲击波',c:2,type:'skill',rarity:'uncommon',target:'self',desc:'全体3易伤+3虚弱;消耗',uDesc:'全体5易伤+5虚弱;消耗',f:(g,_,c)=>{const v=c.u?5:3;g.enemies.forEach(e=>{if(e.hp>0){e.vulnerable=(e.vulnerable||0)+v;e.weak=(e.weak||0)+v;}});},ex:true});
addCard({id:'powerThrough',name:'力量突破',c:1,type:'skill',rarity:'uncommon',target:'self',desc:'15甲;获得2张伤口',uDesc:'20甲;获得2张伤口',f:(g,_,c)=>{g.block+=c.u?20:15;g.hand.push({...S.wound},{...S.wound});}});
addCard({id:'accuracy',name:'精准',c:1,type:'power',rarity:'uncommon',target:'self',desc:'能力:小刀+4伤',uDesc:'能力:小刀+7伤',f:(g,_,c)=>{g.accuracy=(g.accuracy||0)+(c.u?7:4);}});
addCard({id:'bouncingFlask',name:'弹跳毒瓶',c:2,type:'skill',rarity:'uncommon',target:'self',desc:'随机敌3毒x3',uDesc:'随机敌3毒x4',f:(g,_,c)=>{const hits=c.u?4:3;for(let i=0;i<hits;i++){const tg=g.enemies.filter(e=>e.hp>0);if(tg.length){const e=pick(tg);e.poison=(e.poison||0)+3;}}addLog('🧪 弹跳毒瓶:'+hits+'次');}});
addCard({id:'finisher',name:'终结技',c:1,type:'attack',rarity:'uncommon',target:'enemy',desc:'本回合每打1攻击牌造成4伤',uDesc:'本回合每打1攻击牌造成7伤',f:(g,en,c)=>{const e=en[0];if(!e)return;const atks=g._attacksThisTurn||0;dmgEnemy(e,atks*(c.u?7:4),g);}});
addCard({id:'sneakyStrike',name:'偷袭',c:2,type:'attack',rarity:'common',target:'enemy',desc:'12伤;若弃过牌回1能',uDesc:'16伤;若弃过牌回1能',f:(g,en,c)=>{const e=en[0];if(!e)return;dmgEnemy(e,c.u?16:12,g);if((g._discardedThisTurn||0)>0)g.energy=Math.min(g.maxEnergy,g.energy+1);}});
addCard({id:'ftl',name:'超光速',c:0,type:'attack',rarity:'common',target:'enemy',desc:'6伤;已打3牌则抽1',uDesc:'8伤;已打3牌则抽1',f:(g,en,c)=>{const e=en[0];if(!e)return;dmgEnemy(e,c.u?8:6,g);if((g.cardsPlayed||0)>=3)drawCards(1);}});
addCard({id:'lockOn',name:'锁定',c:1,type:'skill',rarity:'common',target:'self',desc:'全体6伤;本回合易伤+2',uDesc:'全体9伤;本回合易伤+3',f:(g,_,c)=>{const b=c.u?9:6;g.enemies.forEach(e=>{if(e.hp>0){dmgEnemy(e,b,g);e.vulnerable=(e.vulnerable||0)+(c.u?3:2);}});}});
addCard({id:'scrape',name:'刮削',c:1,type:'attack',rarity:'common',target:'enemy',desc:'10伤;抽1;若0费再抽1',uDesc:'13伤;抽1;0费再抽1',f:(g,en,c)=>{const e=en[0];if(!e)return;const b=c.u?13:10;dmgEnemy(e,b,g);drawCards(1);if(g.draw.length>0){const top=g.draw[g.draw.length-1];if(top.c===0||(def(top)&&def(top).c===0))drawCards(1);}}});
addCard({id:'reprogram',name:'重编程',c:1,type:'skill',rarity:'uncommon',target:'self',desc:'-2力+2敏+1集中',uDesc:'-2力+3敏+2集中',f:(g,_,c)=>{g.strength=Math.max(0,(g.strength||0)-2);g.dexterity=(g.dexterity||0)+(c.u?3:2);g.focus=(g.focus||0)+(c.u?2:1);addLog('⚙️ 重编程:-2力+'+(c.u?3:2)+'敏+'+(c.u?2:1)+'集中');}});
addCard({id:'redo',name:'重做',c:1,type:'skill',rarity:'uncommon',target:'self',desc:'激发最右侧的球;消耗',uDesc:'激发最右侧的球+抽1;消耗',f:(g,_,c)=>{if(g.orbs&&g.orbs.length>0){evoke(g,g.orbs.length-1);if(c.u)drawCards(1);}},ex:true});
// ---- 龙焰(游戏逻辑已存在但缺卡牌定义) ----
addCard({id:'dragonFlame',name:'龙焰',c:5,type:'attack',rarity:'rare',target:'enemy',desc:'30伤;每打1牌-1费(回合初重置)',uDesc:'40伤;每打1牌-1费(回合初重置)',f:(g,en,c)=>{const e=en[0];if(!e)return;dmgEnemy(e,c.u?40:30,g);}});
// ---- 缺失卡牌(有游戏逻辑但缺定义) ----
addCard({id:'berserk',name:'狂暴',c:0,type:'power',rarity:'rare',target:'self',desc:'能力:每回合+1能;易伤+3',uDesc:'能力:每回合+1能;易伤+2',f:(g,_,c)=>{g.berserk=true;g.vulnerable=(g.vulnerable||0)+(c.u?2:3);}});
addCard({id:'brutality',name:'残忍',c:0,type:'power',rarity:'uncommon',target:'self',desc:'能力:每回抽1伤1;入手3甲',uDesc:'能力:每回抽1伤1回1+入手5甲',f:(g,_,c)=>{g.brutality=true;g.block+=c.u?5:3;if(c.u)g.brutalityHeal=true;}});
addCard({id:'vault',name:'穹顶',c:3,type:'skill',rarity:'rare',target:'self',desc:'获得额外回合;消耗',uDesc:'获得额外回合(+2甲);消耗',f:(g,_,c)=>{g._vaultTurn=true;g.endingTurn=true;if(c.u)g.block+=2;endTurn();},ex:true});
addCard({id:'apotheosis',name:'神化',c:1,type:'skill',rarity:'rare',target:'self',desc:'本场战斗永久升级所有手牌;消耗',uDesc:'本场战斗永久升级所有牌;消耗',f:(g,_,c)=>{g.apotheosis=true;g.deck.forEach(cd=>{cd.u=true;});g.hand.forEach(cd=>{cd.u=true;});g.draw.forEach(cd=>{cd.u=true;});addLog('✨ 神化!全牌升级');},ex:true});
addCard({id:'enlightenment',name:'顿悟',c:0,type:'skill',rarity:'uncommon',target:'self',desc:'本回合抽到的牌-1费;消耗',uDesc:'本回合抽到的牌-1费+抽1;消耗',f:(g,_,c)=>{G._enlightened=true;g.hand.forEach(cd=>{if(cd.c>0)cd.c=Math.max(0,cd.c-1);});if(c.u)drawCards(1);},ex:true});
addCard({id:'sadisticNature',name:'施虐本性',c:1,type:'power',rarity:'rare',target:'self',desc:'能力:攻击有Debuff的敌人+5伤',uDesc:'能力:攻击有Debuff的敌人+8伤',f:(g,_,c)=>{g.sadisticNature=(g.sadisticNature||0)+(c.u?8:5);}});
addCard({id:'torment',name:'折磨',c:1,type:'power',rarity:'uncommon',target:'self',desc:'能力:攻击Debuff敌人+3伤',uDesc:'能力:攻击Debuff敌人+5伤+入手3甲',f:(g,_,c)=>{g.torment=(g.torment||0)+(c.u?5:3);if(c.u)g.block+=3;}});
addCard({id:'reprisal',name:'报复',c:1,type:'power',rarity:'uncommon',target:'self',desc:'能力:受伤时对全体造成2伤',uDesc:'能力:受伤时对全体造成3伤+入手3甲',f:(g,_,c)=>{g.reprisal=(g.reprisal||0)+(c.u?3:2);if(c.u)g.block+=3;}});
addCard({id:'fasting',name:'斋戒',c:1,type:'power',rarity:'uncommon',target:'self',desc:'能力:每打1牌+1能,获得回合-1力',uDesc:'能力:每打1牌+1能,回合-1力',f:(g,_,c)=>{g.fasting=(g.fasting||0)+1;g.strength=Math.max(0,(g.strength||0)-(c.u?1:1));}});
addCard({id:'panache',name:'绝技',c:0,type:'power',rarity:'rare',target:'self',desc:'能力:每5牌全体10伤',uDesc:'能力:每4牌全体15伤',f:(g,_,c)=>{g.panache={count:0,threshold:c.u?4:5,damage:c.u?15:10};}});

// ===================================================================
//  状态牌 + M 查找表
// ===================================================================
const S={wound:{id:'wound',name:'伤口',c:1,type:'status',rarity:'basic',target:'self',desc:'诅咒:占据手牌无法打出',f:()=>{}},
  dazed:{id:'dazed',name:'晕眩',c:1,type:'status',rarity:'basic',target:'self',desc:'诅咒:占据手牌无法打出',f:()=>{}},
  burn:{id:'burn',name:'灼烧',c:1,type:'status',rarity:'basic',target:'self',desc:'抽到时受到2点伤害;消耗',f:(g)=>{dmgPlayerD(g,2);}},
  shiv:{id:'shiv',name:'小刀',c:0,type:'attack',rarity:'basic',target:'enemy',desc:'0费:造成6伤害;消耗',f:(g,en)=>{const e=en[0];if(!e)return;dmgEnemy(e,6+(g.accuracy||0),g);},ex:true},
  smite:{id:'smite',name:'重击',c:1,type:'attack',rarity:'basic',target:'enemy',desc:'0费:造成12伤害;消耗',f:(g,en)=>{const e=en[0];if(!e)return;dmgEnemy(e,12,g);},ex:true},
  safety:{id:'safety',name:'护盾',c:1,type:'skill',rarity:'basic',target:'self',desc:'0费:获得12格挡;消耗',f:(g)=>{g.block+=12;},ex:true},
  ascendedOne:{id:'ascendedOne',name:'登天',c:1,type:'attack',rarity:'basic',target:'enemy',desc:'0费:造成20伤害;消耗',f:(g,en)=>{const e=en[0];if(!e)return;dmgEnemy(e,20,g);},ex:true}};

const M={};ALL_CARDS.forEach(c=>M[c.id]=c);Object.values(S).forEach(c=>M[c.id]=c);
function def(c){
  if(!c||!c.id)return null;
  let id=c.id;
  while(M[id]===undefined){
    // Try stripping trailing _digits then _word suffixes
    const next=id.replace(/_\d+$/,'').replace(/_\w+$/,'');
    if(next===id)break;
    id=next;
  }
  return M[id]||null;
}

// ===================================================================
//  药水 (POTIONS)
// ===================================================================
const POTIONS=[
  {id:'heal',name:'生命药水',desc:'立即回复25点生命值',f:g=>{g.hp=Math.min(g.maxHp,g.hp+25);}},
  {id:'energy',name:'能量药水',desc:'立即获得2点能量',f:g=>{g.energy=Math.min(g.maxEnergy+2,g.energy+2);}},
  {id:'strength',name:'力量药水',desc:'本场战斗+3力量',f:g=>{g.strength+=3;}},
  {id:'block',name:'格挡药水',desc:'立即获得12点格挡',f:g=>{g.block+=12;}},
  {id:'poison',name:'毒雾药水',desc:'全体敌人获得6层中毒',f:g=>{g.enemies.forEach(e=>{if(e.hp>0)e.poison=(e.poison||0)+6;});}},
  {id:'explosive',name:'爆炸药水',desc:'对所有敌人造成15点伤害',f:g=>{g.enemies.forEach(e=>{if(e.hp>0)dmgEnemy(e,15,g);});}},
  {id:'speed',name:'迅捷药水',desc:'立即抽3张牌',f:g=>{drawCards(3);}},
  {id:'dexterity',name:'敏捷药水',desc:'本场战斗+2敏捷(每回格挡)',f:g=>{g.dexterity=(g.dexterity||0)+2;}},
  {id:'regen',name:'再生药水',desc:'连续3回合每回合回复4血',f:g=>{g.regenPotion=3;}},
  {id:'cultist',name:'异教徒药水',desc:'+5力量但施加3层易伤',f:g=>{g.strength+=5;g.vulnerable=(g.vulnerable||0)+3;}},
  {id:'fire',name:'烈焰药水',desc:'对单个敌人造成20点伤害',f:g=>{const e=g.enemies.find(x=>x.hp>0);if(e)dmgEnemy(e,20,g);}},
  {id:'armor',name:'护甲药水',desc:'获得2层金属化(每回+2甲)',f:g=>{g.metall=(g.metall||0)+2;}},
  {id:'bounce',name:'弹跳药水',desc:'造成10伤,再对随机敌10伤',f:g=>{const tg=g.enemies.filter(e=>e.hp>0);if(tg.length){dmgEnemy(tg[0],10,g);if(tg.length>1)dmgEnemy(tg[1],10,g);else dmgEnemy(tg[0],10,g);}}},
  {id:'ghost',name:'幽灵药水',desc:'回复10血+10格挡',f:g=>{g.hp=Math.min(g.maxHp,g.hp+10);g.block+=10;}},
  {id:'gambler',name:'赌徒骰',desc:'弃所有手牌;抽等量',f:g=>{const n=g.hand.length;g.hand.forEach(c=>g.discard.push(c));g.hand=[];drawCards(n);}},
  {id:'powerPotion',name:'能力药水',desc:'获得1张随机能力牌',f:g=>{const pool=ALL_CARDS.filter(x=>x.type==='power');if(pool.length){const p=pick(pool);g.hand.push({...p,id:p.id+'_pot_'+Date.now()});addFX(480,280,'⚡能力药水:'+p.name,'#FFD700');}}},
  {id:'weakPotion',name:'虚弱药水',desc:'全体敌人3层虚弱',f:g=>{g.enemies.forEach(e=>{if(e.hp>0)e.weak=(e.weak||0)+3;});}},
  {id:'stancePotion',name:'姿态药水',desc:'进入宁静或怒火姿态',f:g=>{if(Math.random()<0.5)setStance(g,'calm');else setStance(g,'wrath');}},
  {id:'liquidBronze',name:'青铜液',desc:'获得3层荆棘(反伤)',f:g=>{g.thorns=(g.thorns||0)+3;}},
  {id:'duplicationPotion',name:'复制药水',desc:'下张牌打出2次',f:g=>{g.duplicationPotion=true;}},
];

// ===================================================================
//  遗物 (RELICS)
// ===================================================================
const RELICS=[
  {id:'burningBlood',name:'燃烧之血',desc:'战斗后回复8点生命(铁甲战士初始)'},
  {id:'ringSnake',name:'蛇之戒',desc:'首回合+1能量+1抽(静默初始)'},
  {id:'pureWater',name:'净水',desc:'最大能量+1(观者初始)'},
  {id:'crackedCore',name:'裂变核心',desc:'战斗开始生成1闪电球(机兵初始)'},
  {id:'dataDisk',name:'数据盘',desc:'获得时集中+2',onGet:g=>{g.focus=(g.focus||0)+2;}},
  {id:'vajra',name:'金刚杵',desc:'每场战斗开始时获得2力量',},
  {id:'bagPrep',name:'准备袋',desc:'每场战斗首回合多抽2张牌'},
  {id:'oddStone',name:'光滑石头',desc:'每回合+2敏捷',onGet:g=>{g.dexterity=(g.dexterity||0)+2;}},
  {id:'orichalcum',name:'山铜',desc:'回合末若无格挡则获得6格挡'},
  {id:'happyFlower',name:'快乐花',desc:'每3回合获得1点能量上限'},
  {id:'anchor',name:'船锚',desc:'每场战斗首回合+10格挡'},
  {id:'strawberry',name:'草莓',desc:'永久+8最大生命值',onGet:g=>{g.maxHp+=8;g.hp+=8;}},
  {id:'centennial',name:'百年拼图',desc:'首回合第一次抽牌额外+1张',onGet:g=>{g._centennialReady=true;}},
  {id:'shuriken',name:'手里剑',desc:'每打出3张攻击牌+1力量(可叠加)'},
  {id:'kunai',name:'苦无',desc:'每打出3张攻击牌+8格挡'},
  {id:'clay',name:'自成形粘土',desc:'每次受到伤害时获得3格挡'},
  {id:'paperKrane',name:'纸鹤',desc:'敌方的虚弱效果翻倍(减伤50%)'},
  {id:'nunchaku',name:'双节棍',desc:'每打出2张攻击牌+1能量'},
  {id:'toughBelt',name:'坚韧腰带',desc:'每回合开始时获得3格挡'},
  {id:'marbles',name:'弹珠袋',desc:'战斗开始时全体敌人获得1层易伤'},
  {id:'redSkull',name:'红骷髅',desc:'生命值≤50%时获得3点力量'},
  {id:'artOfWar',name:'兵书',desc:'若上回合未打出攻击,本回合+1能量'},
  {id:'penNib',name:'笔尖',desc:'每打出8次攻击,下张攻击翻倍'},
  {id:'top',name:'不停陀螺',desc:'回合末手牌为空则抽1张牌'},
  {id:'deadBranch',name:'死灵书',desc:'消耗牌时获得1张随机卡牌'},
  {id:'gremlinHorn',name:'地精角',desc:'敌人死亡时抽1张牌+1能量'},
  {id:'hourglass',name:'水银沙漏',desc:'每回合结束时所有敌人受3伤害'},
  {id:'mummyHand',name:'木乃伊手',desc:'打出能力牌时随机1张手牌-1费'},
  {id:'whiteBeast',name:'白兽雕像',desc:'战斗后必定获得1瓶药水'},
  {id:'bell',name:'铃铛',desc:'每4回合获得1点力量',effect:'bell'},
  {id:'ink',name:'墨水',desc:'每打出4张牌抽1张牌'},
  {id:'stove',name:'暖炉',desc:'每3回合回复8点生命'},
  {id:'ancientCoin',name:'古钱币',desc:'获得时增加150金币',onGet:g=>{g.gold+=100;}},
  {id:'strikeDummy',name:'打击木桩',desc:'所有打击牌+2伤害'},
  {id:'theBoot',name:'铁靴',desc:'攻击对HP≤50%敌人额外造成5伤害'},
  {id:'sundial',name:'日晷',desc:'每洗牌3次获得2能量'},
  {id:'bloodVial',name:'血瓶',desc:'每场战斗开始时回复5点生命'},
  {id:'meatBone',name:'骨肉',desc:'战斗结束时若HP≤50%回复12点生命'},
  {id:'bottledFlame',name:'火焰瓶',desc:'战斗开始时获得1点能量'},
  {id:'lantern',name:'煤灯',desc:'首回合+1能量'},
  {id:'sutra',name:'经书',desc:'每回合第一次抽牌额外抽1张'},
  {id:'whetstone',name:'磨刀石',desc:'获得时随机升级2张攻击牌',onGet:g=>{let n=2;const pool=g.deck.filter(c=>{const d=def(c);return d&&d.type==='attack'&&!c.u;});for(let i=0;i<pool.length&&n>0;i++){pool[i].u=true;n--;}}},
  {id:'polishedArmor',name:'抛光铠甲',desc:'战斗开始时获得8点格挡'},
  {id:'poisonBottle',name:'毒药瓶',desc:'战斗开始对首个敌人施加3层毒'},
  {id:'warHorn',name:'战争号角',desc:'战斗开始+3力量持续3回合'},
  {id:'shieldGen',name:'护盾发生器',desc:'每回合首次受伤减少5点'},
  {id:'championBelt',name:'冠军腰带',desc:'战斗开始时敌人获得易伤+虚弱'},
  {id:'hornCleat',name:'角钉',desc:'每场战斗开始时获得14点格挡'},
  {id:'turnip',name:'萝卜',desc:'免疫虚弱效果'},
  {id:'ginger',name:'生姜',desc:'免疫易伤效果'},
  {id:'fruitJuice',name:'果汁',desc:'永久+5最大生命值',onGet:g=>{g.maxHp+=8;g.hp+=8;}},
  {id:'runicPyramid',name:'符文金字塔',desc:'回合结束时不弃牌(保留所有手牌)'},
  {id:'prismatic',name:'万花筒碎片',desc:'卡牌奖励不再限制角色(全职业混搭)'},
  {id:'tungstenRod',name:'钨棒',desc:'每次受到伤害减少1点'},
  {id:'torii',name:'鸟居',desc:'受到≤5的伤害降为1'},
  {id:'preservedInsect',name:'压制昆虫',desc:'精英怪物HP-25%'},
  {id:'handDrill',name:'手钻',desc:'敌人的易伤效果翻倍(受伤+100%)'},
  {id:'strangeSpoon',name:'神秘勺子',desc:'消耗牌有50%概率不消耗'},
  {id:'pocketwatch',name:'怀表',desc:'手牌≤3张时抽到6张'},

  {id:'tingsha',name:'清沙',desc:'每弃1张牌对随机敌人造成3伤害'},
  {id:'wristBlade',name:'腕刃',desc:'0费攻击牌伤害+4'},
  {id:'singingBowl',name:'歌铃碗',desc:'选择奖励卡时+2最大生命值'},
  {id:'specimen',name:'样本',desc:'中毒敌人死亡时将中毒转移'},

  {id:'ironThorn',name:'铁棘甲',desc:'获得格挡时对所有敌人造成1伤害'},
  {id:'vitalSpring',name:'活力之泉',desc:'回复生命时获得1能量'},
  {id:'toxinSack',name:'毒囊',desc:'攻击牌施加1层中毒'},
  {id:'energyTalisman',name:'能量护符',desc:'进入姿态时+3甲抽1张'},
  {id:'iceCream',name:'冰淇淋',desc:'能量不会在回合间清空(可跨回合累积)'},

  {id:'frozenCore',name:'冰核',desc:'回合开始生成1冰霜球(替换裂变核心)'},
  {id:'goldPlatedCables',name:'镀金缆线',desc:'等离子球额外+1能量效果'},
  {id:'emotionChip',name:'情感芯片',desc:'每回合首次激发时额外触发1次'},
  {id:'symbiosis',name:'共生',desc:'战斗开始生成1暗黑球'},
  {id:'nuclearBattery',name:'核能电池',desc:'每场战斗首回合+1能量;获得时集中+1',onGet:g=>{g.focus=(g.focus||0)+1;}},
  {id:'ornamentalFan',name:'饰品扇',desc:'每打出3张攻击牌获得4点格挡'},
  {id:'duVuDoll',name:'嘟-V玩偶',desc:'牌组中每有2张状态牌+1力量',onGet:g=>{g.strength+=Math.min(3,g.deck.filter(x=>{const d=def(x);return d&&d.rarity==='status';}).length);}},
  {id:'medicalKit',name:'医疗箱',desc:'状态牌可以打出(0费+消耗)'},
  {id:'toughBandages',name:'坚韧绷带',desc:'每弃1张牌获得3点格挡'},
  {id:'membershipCard',name:'会员卡',desc:'商店物品价格减半'},
  {id:'bronzeScales',name:'青铜甲',desc:'战斗开始时获得3点荆棘'},
  {id:'akabeko',name:'赤牛',desc:'每场战斗第一次攻击额外造成8点伤害'},
  {id:'mango',name:'芒果',desc:'永久+14最大生命值',onGet:g=>{g.maxHp+=10;g.hp+=10;}},
  {id:'sneckoEye',name:'史尼可之眼',desc:'每回合多抽2张牌;手牌费用随机化(1-3)'},
  {id:'runicDome',name:'符文穹顶',desc:'每回合+1能量;无法看到敌人意图',onGet:g=>{g.maxEnergy++;g._runicDomeAdded=true;}},
  {id:'pandorasBox',name:'潘多拉魔盒',desc:'获得时消除所有打击和防御,替换为随机卡牌',onGet:g=>{const replaced=g.deck.filter(c=>{const d=def(c);return d&&(d.id==='strike'||d.id==='defend');});const pool=ALL_CARDS.filter(x=>x.rarity!=='basic'&&x.rarity!=='status');replaced.forEach(c=>{const idx=g.deck.indexOf(c);if(idx>=0&&pool.length){const r=pool[Math.floor(Math.random()*pool.length)];g.deck[idx]={...r,id:r.id+'_panda_'+Date.now(),u:false};}});g.deck=g.deck.filter(c=>{const d=def(c);return !d||(d.id!=='strike'&&d.id!=='defend');});}},
  {id:'blackBlood',name:'黑血',desc:'战斗后回复12点生命(替换燃烧之血)'},
  {id:'inserter',name:'插入器',desc:'每2回合获得1个球位'},
  {id:'letterOpener',name:'开信刀',desc:'每打出3张技能牌对全体敌人造成5点伤害'},
  {id:'fossilizedHelix',name:'化石螺旋',desc:'每场战斗首回合免疫伤害'},
  {id:'gamblingChip',name:'赌博筹码',desc:'战斗开始时可以重抽手牌'},
  {id:'questionCard',name:'问题卡',desc:'卡牌奖励多1张可选'},];

  // ===================================================================
  //  敌人模板 (ET — Enemy Templates)
  //  mv 动作类型: a=攻击 d=防御 db=Debuff b=Buff m=多连击 s=塞牌 h=治疗
  // ===================================================================
  const ET=[
  {id:'slime',name:'史莱姆',hb:10,hs:2,act:1,mv:[{t:'a',d:4}, {t:'a',d:7}, {t:'d',b:6}]},
  {id:'gremlin',name:'哥布林',hb:12,hs:3,act:1,mv:[{t:'a',d:6}, {t:'a',d:5}, {t:'a',d:9}]},
  {id:'louse',name:'虫',hb:13,hs:2,act:1,mv:[{t:'a',d:5}, {t:'d',b:7}, {t:'db',ef:'vuln',v:1}]},
  {id:'gNob',name:'头目',hb:22,hs:3,act:1,elite:true,mv:[{t:'a',d:12}, {t:'b',ef:'str',v:2}, {t:'a',d:14}]},
  {id:'laga',name:'Lagavulin',hb:22,hs:3,act:1,elite:true,mv:[{t:'a',d:10}, {t:'a',d:12}, {t:'d',b:12}]},
  {id:'slaver',name:'奴贩',hb:22,hs:3,act:2,mv:[{t:'a',d:9}, {t:'a',d:6,ef:g=>{g.weak=(g.weak||0)+1;}}, {t:'d',b:9}]},
  {id:'centurion',name:'百夫长',hb:24,hs:4,act:2,mv:[{t:'a',d:11}, {t:'a',d:7}, {t:'b',ef:'str',v:1}]},
  {id:'mystic',name:'秘术师',hb:20,hs:4,act:2,mv:[{t:'a',d:7}, {t:'db',ef:'vuln',v:2}, {t:'b',ef:'blk',v:10}]},
  {id:'taskmaster',name:'监工',hb:34,hs:4,act:2,elite:true,mv:[{t:'a',d:14}, {t:'a',d:9}, {t:'b',ef:'str',v:2}]},
  {id:'slavers',name:'奴贩团',hb:30,hs:4,act:2,elite:true,mv:[{t:'a',d:16}, {t:'db',ef:'weak',v:2}, {t:'d',b:14}]},
  {id:'darkling',name:'暗影',hb:38,hs:5,act:3,mv:[{t:'a',d:15}, {t:'db',ef:'weak',v:1}, {t:'a',d:15}]},
  {id:'spirit',name:'尖塔之灵',hb:42,hs:4,act:3,mv:[{t:'a',d:12}, {t:'a',d:7,ef:g=>{g.block=Math.max(0,g.block-4);}}, {t:'b',ef:'str',v:2}]},
  {id:'giantHead',name:'巨首',hb:45,hs:5,act:3,mv:[{t:'a',d:17}, {t:'a',d:17}, {t:'d',b:12}]},
  {id:'darklings',name:'暗影群',hb:42,hs:5,act:3,elite:true,mv:[{t:'a',d:19}, {t:'db',ef:'vuln',v:2}, {t:'a',d:20}]},
  {id:'nebula',name:'星云',hb:46,hs:5,act:3,elite:true,mv:[{t:'a',d:16}, {t:'b',ef:'str',v:3}, {t:'a',d:18}]},
  {id:'slimeBoss',name:'史莱姆王',hb:95,hs:1,act:1,boss:true,mv:[{t:'a',d:11}, {t:'db',ef:'weak',v:2}, {t:'a',d:14}, {t:'a',d:9}]},
  {id:'guardian',name:'守卫者',hb:115,hs:1,act:2,boss:true,mv:[{t:'a',d:13}, {t:'d',b:20}, {t:'a',d:18}, {t:'b',ef:'str',v:3}]},
  {id:'awakened',name:'觉醒者',hb:145,hs:1,act:3,boss:true,mv:[{t:'a',d:16}, {t:'db',ef:'vuln',v:3}, {t:'a',d:20}, {t:'b',ef:'str',v:3}]},
  // 新敌人
  {id:'cultist',name:'邪教徒',hb:10,hs:2,act:1,mv:[{t:'a',d:4}, {t:'a',d:7}, {t:'a',d:5}]},
  {id:'jawWorm',name:'颚虫',hb:14,hs:2,act:1,mv:[{t:'a',d:6}, {t:'d',b:5}, {t:'b',ef:'str',v:1}]},
  {id:'shell',name:'甲壳怪',hb:16,hs:3,act:1,mv:[{t:'a',d:5}, {t:'d',b:9}, {t:'a',d:7}]},
  {id:'poisonSpider',name:'毒蜘蛛',hb:13,hs:3,act:1,mv:[{t:'m',d:3,n:2}, {t:'a',d:6}, {t:'db',ef:'poison',v:2}]},
  {id:'cursedMage',name:'诅咒术士',hb:24,hs:4,act:2,mv:[{t:'a',d:8}, {t:'db',ef:'vuln',v:2}, {t:'db',ef:'weak',v:2}]},
  {id:'naga',name:'蛇女',hb:28,hs:5,act:2,mv:[{t:'a',d:9}, {t:'a',d:6,ef:g=>{g.weak=(g.weak||0)+1;g.vulnerable=(g.vulnerable||0)+1;}}, {t:'d',b:10}]},
  {id:'snakePlant',name:'蛇花',hb:26,hs:3,act:2,mv:[{t:'a',d:11}, {t:'db',ef:'vuln',v:1}, {t:'a',d:12}]},
  {id:'chosen',name:'被选者',hb:28,hs:3,act:2,mv:[{t:'a',d:10}, {t:'b',ef:'blk',v:12}, {t:'a',d:11}]},
  {id:'byrd',name:'鸟人',hb:30,hs:4,act:2,mv:[{t:'a',d:12}, {t:'a',d:15}, {t:'d',b:8}]},
  {id:'spheric',name:'螺壳怪',hb:36,hs:4,act:3,mv:[{t:'d',b:15}, {t:'a',d:11}, {t:'b',ef:'str',v:2}]},
  {id:'reptomancer',name:'蜥蜴召唤师',hb:40,hs:5,act:3,elite:true,mv:[{t:'a',d:14}, {t:'b',ef:'str',v:2}, {t:'a',d:19}]},
  // 新敌人(丰富度)
  {id:'ghost',name:'幽灵',hb:13,hs:3,act:1,mv:[{t:'a',d:4}, {t:'a',d:6}, {t:'db',ef:'weak',v:1}]},
  {id:'skeleton',name:'骷髅兵',hb:16,hs:3,act:1,mv:[{t:'a',d:7}, {t:'a',d:5}, {t:'d',b:8}]},
  {id:'bandit',name:'山贼',hb:25,hs:4,act:2,mv:[{t:'a',d:9}, {t:'a',d:11}, {t:'b',ef:'str',v:1}]},
  {id:'mage',name:'法师',hb:22,hs:4,act:2,mv:[{t:'a',d:8}, {t:'db',ef:'vuln',v:2}, {t:'a',d:12}]},
  {id:'knight',name:'骑士',hb:38,hs:5,act:3,mv:[{t:'a',d:12}, {t:'d',b:15}, {t:'a',d:16}, {t:'b',ef:'str',v:1}]},
  {id:'demon',name:'恶魔',hb:48,hs:5,act:3,mv:[{t:'a',d:17}, {t:'b',ef:'str',v:2}, {t:'a',d:18}]},
  // 更多敌人
  {id:'fuzzy',name:'毛虫',hb:15,hs:3,act:1,mv:[{t:'a',d:5}, {t:'d',b:6}, {t:'a',d:8}]},
  {id:'spikeSlime',name:'刺球史莱姆',hb:14,hs:3,act:1,mv:[{t:'a',d:4}, {t:'a',d:7,ef:g=>{g.vulnerable=(g.vulnerable||0)+1;}}, {t:'a',d:6}]},
  {id:'thief',name:'窃贼',hb:24,hs:4,act:2,mv:[{t:'a',d:8}, {t:'a',d:11}, {t:'d',b:8}]},
  {id:'snake',name:'蛇',hb:26,hs:4,act:2,mv:[{t:'a',d:7}, {t:'db',ef:'poison',v:3}, {t:'a',d:10}]},
  {id:'golem',name:'石魔像',hb:46,hs:5,act:3,mv:[{t:'a',d:16}, {t:'d',b:14}, {t:'a',d:18}]},
  {id:'voidDemon',name:'虚空恶魔',hb:36,hs:5,act:3,mv:[{t:'a',d:14}, {t:'b',ef:'str',v:2}, {t:'a',d:15}]},
  // 新BOSS
  {id:'hexaghost',name:'六火亡魂',hb:85,hs:1,act:1,boss:true,mv:[{t:'a',d:10}, {t:'a',d:12}, {t:'a',d:12},{t:'a',d:14}]},
  {id:'bronze',name:'铜制机械',hb:110,hs:1,act:2,boss:true,mv:[{t:'a',d:14}, {t:'d',b:20}, {t:'a',d:18}, {t:'b',ef:'str',v:3}]},
  {id:'timeEater',name:'时间吞噬者',hb:140,hs:1,act:3,boss:true,mv:[{t:'a',d:22}, {t:'d',b:22}, {t:'a',d:28}, {t:'b',ef:'str',v:3}]},
  // 扩展怪物
  {id:'exploder',name:'自爆者',hb:18,hs:3,act:2,mv:[{t:'a',d:10}, {t:'a',d:12}, {t:'a',d:14}]},
  {id:'energyThief',name:'抽能者',hb:26,hs:4,act:2,mv:[{t:'a',d:7}, {t:'a',d:4,ef:g=>{g.energy=Math.max(0,g.energy-1);addFX(480,260,'⚡能量被窃!','#FF9800');}}, {t:'d',b:10}]},
  {id:'feedbackMage',name:'反馈法师',hb:35,hs:5,act:3,mv:[{t:'a',d:12}, {t:'a',d:6,ef:g=>{const extra=g.hand.length*2;enemy._handBonus=extra;addLog('📖 反馈法师因手牌+'+extra+'伤');}}, {t:'d',b:12}]},
  // 还原怪物
  {id:'transient',name:'转瞬即逝',hb:70,hs:5,act:3,mv:[{t:'a',d:10}, {t:'a',d:12}, {t:'a',d:14}, {t:'a',d:16}, {t:'a',d:18},{t:'a',d:20}]},
  {id:'shellParasite',name:'甲壳寄生',hb:28,hs:4,act:2,mv:[{t:'a',d:8}, {t:'a',d:4,ef:g=>{g.weak=(g.weak||0)+1;}}, {t:'d',b:10}]},

  {id:'twinGremlin',name:'双胞胎哥布林',hb:10,hs:3,act:1,mv:[{t:'m',d:4,n:2},{t:'a',d:7},{t:'d',b:8}]},
  {id:'woundImp',name:'伤口小鬼',hb:14,hs:3,act:2,mv:[{t:'s',sCard:'wound',n:1},{t:'a',d:8},{t:'a',d:6,ef:g=>{g.weak=(g.weak||0)+1;}}]},
  {id:'healerMonk',name:'治愈僧',hb:22,hs:4,act:2,mv:[{t:'h',v:8},{t:'a',d:7},{t:'b',ef:'blk',v:8}]},
  {id:'berserkerOrc',name:'狂战士',hb:30,hs:5,act:3,mv:[{t:'m',d:8,n:3},{t:'b',ef:'str',v:3},{t:'a',d:12}]},
  {id:'nightmareWisp',name:'梦魅之灵',hb:28,hs:4,act:3,mv:[{t:'s',sCard:'burn',n:2},{t:'a',d:10},{t:'db',ef:'vuln',v:2}]},
];

// ===================================================================
//  关卡生成 — 三条路径系统
//  每幕3条路线, 每步3选1, 路线设计有逻辑差异:
//  A=激进(更多精英)  B=平衡(均匀分布)  C=安逸(更多篝火/商店)
//  每路线15步, 共45层=3幕
// ===================================================================
const RM={monster:'⚔️',elite:'💀',rest:'🔥',treasure:'📦',shop:'🏪',boss:'👑',event:'❓'},
  RN={monster:'战斗',elite:'精英',rest:'篝火',treasure:'宝箱',shop:'商店',boss:'BOSS',event:'事件'},
  RD={monster:'普通战斗, 获取金币和卡牌',elite:'精英战斗, 高难度+遗物奖励',rest:'篝火休息, 回复生命或升级卡牌',
       treasure:'打开宝箱, 获得遗物',shop:'购买卡牌和遗物',boss:'BOSS战!',event:'随机事件, 多种可能'};
const ROUTES=[
  // 幕1: 尖塔底层
  [ // A(激进·战斗型)
    ['monster','elite','monster','shop','monster','elite','rest','monster','elite','monster','event','monster','rest','monster','boss'],
    // B(平衡·探索型)
    ['monster','monster','rest','monster','elite','monster','shop','monster','event','rest','monster','elite','monster','rest','boss'],
    // C(安逸·发育型)
    ['monster','rest','shop','monster','event','rest','monster','elite','shop','monster','rest','event','monster','rest','boss'],
  ],
  // 幕2: 尖塔中层
  [ // A(激进·高风险)
    ['monster','elite','shop','monster','elite','monster','rest','monster','elite','event','monster','elite','shop','monster','boss'],
    // B(平衡·探索型)
    ['monster','shop','elite','rest','monster','event','monster','elite','rest','monster','shop','event','monster','elite','boss'],
    // C(安逸·发育型)
    ['shop','monster','rest','monster','shop','event','monster','rest','elite','monster','rest','event','monster','elite','boss'],
  ],
  // 幕3: 尖塔顶层
  [ // A(激进·决战型)
    ['elite','monster','elite','shop','monster','elite','rest','monster','elite','event','monster','elite','shop','elite','boss'],
    // B(平衡·稳健型)
    ['monster','shop','elite','monster','event','monster','rest','elite','shop','monster','event','elite','rest','monster','boss'],
    // C(安逸·休整型)
    ['shop','monster','rest','elite','shop','monster','event','rest','monster','elite','event','rest','shop','monster','boss'],
  ],
];

function act(f){return f<=15?1:f<=30?2:3;}
function room(f){
  // 使用 G 的路由选择系统
  if(typeof G!=='undefined'&&G&&G._routeChoice>=0&&G._actStep>=0){
    const a=act(f);
    return ROUTES[a-1][G._routeChoice][G._actStep]||'monster';
  }
  return 'monster';
}
// ===================================================================
//  随机事件 (EVENTS)
// ===================================================================
const EVENTS=[
  {id:'temple',name:'黄金神殿',desc:'一座金碧辉煌的神殿，中央有祭坛。',
   opts:[{text:'供奉',good:'失去5血,获得125金币',f:g=>{dmgPlayerD(g,5);g.gold+=125;}},
     {text:'祈祷',good:'回复30%生命,放弃金币',f:g=>{g.hp=Math.min(g.maxHp,g.hp+Math.floor(g.maxHp*0.3));g.gold=Math.max(0,g.gold-30);}},
     {text:'离开',good:'什么也没发生',f:g=>{}}]},
  {id:'fountain',name:'遗忘之泉',desc:'泉水能洗去你卡牌上的记忆。',
   opts:[{text:'移除一张牌',good:'从牌组中移除一张牌(保留5张)',f:g=>{G.phase='removeCard';G.shopItems=[];}},
     {text:'离开',good:'什么也没发生',f:g=>{}}]},
  {id:'forge',name:'铁匠铺',desc:'一位矮人铁匠正在打造兵器。',
   opts:[{text:'强化',good:'升级一张随机攻击牌',f:g=>{const pool=g.deck.filter(c=>!c.u&&def(c)&&def(c).type==='attack');if(pool.length){const c=pick(pool);c.u=true;addFX(480,300,'⬆️升级!','#FFD700');}}},
     {text:'锻甲',good:'升级一张随机技能牌',f:g=>{const pool=g.deck.filter(c=>!c.u&&def(c)&&def(c).type==='skill');if(pool.length){const c=pick(pool);c.u=true;addFX(480,300,'⬆️升级!','#FFD700');}}},
     {text:'离开',good:'...',f:g=>{}}]},
  {id:'mirror',name:'深渊之镜',desc:'一面古老魔镜，能复制你的卡牌。',
   opts:[{text:'复制一张牌',good:'复制手牌中最左边的一张加入牌库',f:g=>{if(g.hand.length>0){const c=g.hand[0];g.deck.push({...c,id:c.id+'_mirror',u:false});}}},
     {text:'离开',good:'...',f:g=>{}}]},
  {id:'shadowTrade',name:'暗影交易',desc:'一个暗影商人愿意与你交易。',
   opts:[{text:'交易',good:'失去5血获得1个遗物',f:g=>{dmgPlayerD(g,5);const pool=RELICS.filter(x=>!g.relics.some(h=>h.id===x.id)&&x.id!=='burningBlood'&&x.id!=='ringSnake'&&x.id!=='pureWater'&&x.id!=='runicPyramid'&&x.id!=='tingsha'&&x.id!=='wristBlade'&&x.id!=='singingBowl'&&x.id!=='specimen');if(pool.length){const rel=pick(pool);g.relics.push({...rel});if(rel.onGet)rel.onGet(g);}}},
     {text:'离开',good:'...',f:g=>{}}]},
  {id:'fortune',name:'占卜师',desc:'一位占卜师用水晶球凝视着你。',
   opts:[{text:'占卜',good:'查看抽牌堆顶3张,保留1张弃2张',f:g=>{if(g.draw.length>0){const n=Math.min(3,g.draw.length);const top=g.draw.splice(g.draw.length-n,n);const kept=top[0];const names=top.map(x=>x.name).join(',');for(let i=1;i<top.length;i++)g.discard.push(top[i]);g.draw.push(kept);addFX(480,300,'🔮 查看: '+names,'#FFD700');addLog('🔮 占卜看到: '+names+' 保留:'+kept.name);}}},
     {text:'离开',good:'什么也没发生',f:g=>{}}]},
  {id:'chest',name:'神秘箱子',desc:'一个古老箱子，打开看看？',
   opts:[{text:'打开',good:'获得50-100金币',f:g=>{g.gold+=50+rand(0,50);}},
     {text:'离开',good:'什么也没发生',f:g=>{}}]},
  {id:'spring',name:'疗愈之泉',desc:'清澈的泉水散发着光芒。',
   opts:[{text:'饮用',good:'回复30%生命',f:g=>{g.hp=Math.min(g.maxHp,g.hp+Math.floor(g.maxHp*0.3));}},
     {text:'离开',good:'什么也没发生',f:g=>{}}]},
  {id:'merchant',name:'流浪商人',desc:'一个神秘商人看着你...',
   opts:[{text:'交易',good:'失去15血,获得稀有遗物',f:g=>{dmgPlayerD(g,15);
     const pool=RELICS.filter(x=>!g.relics.some(h=>h.id===x.id)&&x.id!=='burningBlood'&&x.id!=='ringSnake'&&x.id!=='pureWater'&&x.id!=='runicPyramid'&&x.id!=='tingsha'&&x.id!=='wristBlade'&&x.id!=='singingBowl'&&x.id!=='specimen');if(pool.length){const rel=pick(pool);g.relics.push({...rel});if(rel.onGet)rel.onGet(g);}}},
          {text:'离开',good:'什么也没发生',f:g=>{}}]},
  {id:'arena',name:'战斗竞技场',desc:'一个挑战者在等你！',
   opts:[{text:'应战',good:'打精英怪(高额金币)',f:g=>{G._eventFight=true;}},
     {text:'离开',good:'什么也没发生',f:g=>{}}]},
  {id:'statue',name:'神秘雕像',desc:'一座古老雕像，手中捧着一个发光的遗物。',
   opts:[{text:'拿走',good:'失去5血,获得随机遗物',f:g=>{dmgPlayerD(g,5);const pool=RELICS.filter(x=>!g.relics.some(h=>h.id===x.id)&&x.id!=='burningBlood'&&x.id!=='ringSnake'&&x.id!=='pureWater'&&x.id!=='runicPyramid'&&x.id!=='tingsha'&&x.id!=='wristBlade'&&x.id!=='singingBowl'&&x.id!=='specimen');if(pool.length){const rel=pick(pool);g.relics.push({...rel});if(rel.onGet)rel.onGet(g);addFX(480,300,'⚜获得遗物!','#FFD700');}}},
     {text:'离开',good:'...',f:g=>{}}]},
  {id:'healer',name:'流浪医者',desc:'一位游方医者愿意帮你治疗。',
   opts:[{text:'治疗',good:'回复50%生命',f:g=>{g.hp=Math.min(g.maxHp,g.hp+Math.floor(g.maxHp*0.5));}},
     {text:'强化',good:'升级一张随机牌',f:g=>{const unupgraded=g.deck.filter(c=>!c.u);if(unupgraded.length){const c=pick(unupgraded);c.u=true;addFX(480,300,'⬆️升级!','#FFD700');}}},
     {text:'离开',good:'什么也没发生',f:g=>{}}]},
  {id:'enchantress',name:'附魔师',desc:'一位神秘附魔师可以升级你的卡牌。',
   opts:[{text:'升级随机牌',good:'免费升级一张随机卡牌',f:g=>{const pool=g.deck.filter(c=>!c.u);if(pool.length){const c=pick(pool);c.u=true;addFX(480,300,'⬆️升级!','#FFD700');}}},
     {text:'离开',good:'什么也没发生',f:g=>{}}]},
  {id:'torturer',name:'审讯者',desc:'一个冷酷的审讯者挡住了你的路。',
   opts:[{text:'战斗',good:'打精英怪(1.5倍金币)',f:g=>{G._eventFight=true;}},
     {text:'付钱',good:'失去25金离开',f:g=>{if(g.gold>=25)g.gold-=25;}},
     {text:'离开',good:'损失5点生命',f:g=>{dmgPlayerD(g,5);}}]},
  {id:'library',name:'图书馆',desc:'一间古老的图书馆，书架上摆满了发光的卡牌。',
   opts:[{text:'翻阅',good:'免费获得1张卡牌',f:g=>{const pool=getRewardPool();if(pool.length){shuffle(pool);const cards=pool.slice(0,3);G.rewardCards=cards;G.phase='reward';}}},
     {text:'离开',good:'什么也没发生',f:g=>{}}]},
  {id:'dormantGuard',name:'休眠守卫',desc:'一具石像鬼雕像挡在路上，似乎在沉睡...',
   opts:[{text:'悄悄通过',good:'损失3点生命',f:g=>{dmgPlayerD(g,3);}},
     {text:'唤醒战斗',good:'打精英得双倍金币',f:g=>{G._eventFight=true;G._eventFightNoReward=true;}},
     {text:'原路返回',good:'什么也没发生',f:g=>{}}]},
  {id:'mushrooms',name:'蘑菇地',desc:'一片奇怪的蘑菇...',
   opts:[{text:'吃掉',good:'+8血,随机效果',f:g=>{g.hp=Math.min(g.maxHp,g.hp+8);addFX(480,180,'❤️+8','#4CAF50',24);const r=Math.random();if(r<0.4){g.strength+=2;addFX(480,220,'⬆️+2力量!','#FF6B6B',30);addLog('🍄 蘑菇:获得2力量');}else if(r<0.7){g.weak=(g.weak||0)+2;addFX(480,220,'💧+2虚弱!','#64B5F6',30);addLog('🍄 蘑菇:获得2虚弱');}else{g.vulnerable=(g.vulnerable||0)+2;addFX(480,220,'💫+2易伤!','#FF9800',30);addLog('🍄 蘑菇:获得2易伤');}}},
     {text:'采集',good:'获得25金币',f:g=>{g.gold+=25;}},
     {text:'离开',good:'...',f:g=>{}}]},
  {id:'windingHalls',name:'回廊',desc:'无尽回廊中回荡着你的脚步声。',
   opts:[{text:'探索',good:'随机获得50-80金币或失去10血',f:g=>{if(Math.random()<0.5){g.gold+=50+rand(0,30);addFX(480,300,'🪙金币!','#FFD700');}else{dmgPlayerD(g,10);addFX(480,300,'💀陷阱!','#FF4444');}}},
     {text:'原路返回',good:'什么也没发生',f:g=>{}}]},
  {id:'ghostEvent',name:'幽灵',desc:'一个透明的幽灵飘过，低声耳语。',
   opts:[{text:'接受',good:'失去3血上限;随机升级2张牌',f:g=>{g.maxHp=Math.max(20,g.maxHp-3);if(g.hp>g.maxHp)g.hp=g.maxHp;for(let i=0;i<2;i++){const pool=g.deck.filter(c=>!c.u);if(pool.length){pick(pool).u=true;}}}},
     {text:'驱散',good:'获得30金币',f:g=>{g.gold+=30;}},
     {text:'无视',good:'什么也没发生',f:g=>{}}]},
  {id:'transmogrifier',name:'变形器',desc:'一台神秘装置可以将卡牌变形。',
   opts:[{text:'变形一张',good:'随机将1张手牌变成另一张随机牌',f:g=>{if(g.hand.length>0){const idx=Math.floor(Math.random()*g.hand.length);const pool=ALL_CARDS.filter(x=>x.rarity!=='basic'&&x.rarity!=='status');if(pool.length){const r=pick(pool);g.hand[idx]={...r,id:r.id+'_trans',u:false};}}}},
     {text:'离开',good:'...',f:g=>{}}]},
  {id:'gamble',name:'赌桌',desc:'一张古老的赌桌，筹码闪着金光。',
   opts:[{text:'下注50金',good:'50%双倍,50%全输',f:g=>{if(g.gold<50)return;g.gold-=50;if(Math.random()<0.5){g.gold+=100;addFX(480,300,'🎲赢了100金!','#FFD700');}else{addFX(480,300,'😵全输了...','#FF6B6B');}}},
     {text:'离开',good:'什么也没发生',f:g=>{}}]},
];

// ===================================================================
//  游戏状态 (G — 全局状态对象)
//  包含: HP/能量/格挡/卡牌/遗物/楼层/球体/姿态等所有运行时数据
// ===================================================================
let G=null;

function createG(){
  return{
    hp:80,maxHp:80,energy:3,maxEnergy:3,block:0,gold:0,
    difficulty:0,strength:0,dexterity:0,strUp:0,weak:0,vulnerable:0,artifact:0,mantra:0,
    stance:'neutral',barricade:false,metall:0,fnp:0,dForm:0,dt:false,thorns:0,
    de:false,evolve:0,corruption:false,noxiousFumes:0,afterImage:0,orbs:[],maxOrbs:3,focus:0,electro:false,echoForm:false,staticDischarge:0,buffer:0,machineLearning:false,biasedCognition:false,
    orichalcum:false,anchorBonus:0,cardsPlayed:0,totalKills:0,
    hand:[],draw:[],discard:[],exhaust:[],deck:[],
    enemies:[],potion:null,character:'ironclad',
    floor:1,turn:0,phase:'title',firstTurn:false,endingTurn:false,
    rewardCards:[],rewardGold:0,rewardRelic:null,_rewardAnim:0,
    shopItems:[],relics:[],
    codexOpen:false,codexTab:0,codexPage:0,codexPages:[0,0,0,0,0],codexSearch:'',codexFilter:'all',codexRarity:'all',codexCost:'all',_codexSearchActive:false,mapOpen:false,logOpen:false,pileView:null,_discoveryPick:false,mx:0,my:0,_log:[],
    _steamDec:0,_clawCount:0,_geneticLvl:0,_totalFrost:0,heatsinks:0,storm:0,amplify:0,_eventData:null,_roomAnnounce:0,_lastRoom:'monster',_killDelay:0,_killFlash:0,_seekCount:0,_seekPicks:0,_logScroll:0,
    _actStep:0,_routeChoice:0,_pathOptions:[],
  };
}

function initDeck(character){
  if(character==='defect'){
    const d=[];
    for(let i=0;i<4;i++)d.push({...M.strike,id:'strike_'+i,u:false});
    for(let i=0;i<4;i++)d.push({...M.defend,id:'defend_'+i,u:false});
    d.push({...M.zap,id:'zap_0',u:false});
    d.push({...M.dualcast,id:'dualcast_0',u:false});
    return d;
  }
  const d=[];
  if(character==='silent'){
    for(let i=0;i<5;i++)d.push({...M.strike,id:'strike_'+i,u:false});
    for(let i=0;i<4;i++)d.push({...M.defend,id:'defend_'+i,u:false});
    d.push({...M.neutralize,id:'neutralize_0',u:false});
  }else if(character==='watcher'){
    for(let i=0;i<5;i++)d.push({...M.strike,id:'strike_'+i,u:false});
    for(let i=0;i<4;i++)d.push({...M.defend,id:'defend_'+i,u:false});
    d.push({...M.eruption,id:'eruption_0',u:false});
  }else{
    for(let i=0;i<5;i++)d.push({...M.strike,id:'strike_'+i,u:false});
    for(let i=0;i<4;i++)d.push({...M.defend,id:'defend_'+i,u:false});
    d.push({...M.bash,id:'bash_0',u:false});
  }
  return d;
}

function initGame(character){
  G=createG();
  G.character=character||'ironclad';
  G.deck=initDeck(G.character);
  G.floor=1;G._actStep=0;G._routeChoice=0;G.gold=G.difficulty>0?30:45;G.totalKills=0;G.potion=null;G._startFloor=1;
  if(G.character==='silent'){G.hp=75;G.maxHp=75;}
  if(G.character==='watcher'){G.hp=72;G.maxHp=72;}
  if(G.character==='defect'){G.hp=70;G.maxHp=70;}
  G.phase='title';updateUI();
  updateContinueBtn();
}

// ===================================================================
//  存档/读档 (localStorage)
// ===================================================================
function saveGame(){
  try{
    const data={
      hp:G.hp,maxHp:G.maxHp,gold:G.gold,character:G.character,difficulty:G.difficulty||0,
      floor:G.floor,totalKills:G.totalKills,strUp:G.strUp||0,
      enemyIds:G.enemies&&G.enemies.length?G.enemies.map(e=>e.id||(e.tpl?e.tpl.id:null)).filter(x=>x):[],
      deck:G.deck.map(c=>{
        const baseId=c.id.replace(/_\d+$/,'').replace(/[sd]0$/,'strike').replace(/[sd]1$/,'defend');
        // Find actual card id
        const cleanId=c.id.replace(/_\d+$/,'').replace(/^[sd]\d+$/,'');
        let id=c.id;
        if(M[id]){} // already the right id
        else if(M[id.replace(/_\d+$/,'')]) id=id.replace(/_\d+$/,'');
        else if(M.strike&&c.name==='打击') id='strike';
        else if(M.defend&&c.name==='防御') id='defend';
        else if(M.bash&&c.name==='重击') id='bash';
        else id=id.replace(/[sd]\d+$/,'').replace(/_\d+$/,'');
        // Final fallback: check M for the id
        if(!M[id]){
          // Try to find by name
          const found=Object.values(M).find(x=>x.name===c.name);
          id=found?found.id:'strike';
        }
        return{id,u:c.u||false};
      }),
      relics:G.relics.map(r=>r.id),
      potion:G.potion?G.potion.id:null,ga:G._geneticLvl||0,
      route:G._routeChoice||0,
    };
    localStorage.setItem('spireSave',JSON.stringify(data));
  }catch(e){console.warn('Save failed:',e);}
}

function loadGame(){
  try{
    const raw=localStorage.getItem('spireSave');
    if(!raw)return false;
    const data=JSON.parse(raw);
    G=createG();
    G.hp=data.hp;G.maxHp=data.maxHp;G.gold=data.gold;G.character=data.character||'ironclad';
    G.difficulty=data.difficulty||0;
    G.floor=data.floor;G.totalKills=data.totalKills||0;G.strUp=data.strUp||0;G._geneticLvl=data.ga||0;
    G._routeChoice=data.route||0;G._actStep=(G.floor-1)%15;
    // Deck
    G.deck=[];
    (data.deck||[]).forEach((cd,i)=>{
      const d=M[cd.id];
      if(d)G.deck.push({...d,id:cd.id+'_'+i,u:cd.u||false});
      else{// fallback
        G.deck.push({...M.strike,id:'strike_fb'+i,u:false});
      }
    });
    // Relics
    (data.relics||[]).forEach(id=>{
      const r=RELICS.find(x=>x.id===id);
      if(r){G.relics.push({...r});if(r.onGet)r.onGet(G);}
    });
    // Potion
    if(data.potion){const p=POTIONS.find(x=>x.id===data.potion);if(p)G.potion={...p};}
    startScreen.style.display='none';overScreen.classList.remove('show');
    G.phase='';
    const r=room(G.floor);
    if(r==='shop')showShop();else if(r==='rest')showRest();else if(r==='treasure')showTreasure();else if(r==='event')showEvent();
    else{
      // 有存档敌人则恢复(确保BOSS一致)
      if(data.enemyIds&&data.enemyIds.length){
        startCombat(data.enemyIds);
      }else startCombat();
    }
    updateUI();
    return true;
  }catch(e){console.warn('Load failed:',e);return false;}
}

function hasSave(){return localStorage.getItem('spireSave')!==null;}

function updateRecordsDisplay(){
  const el=document.getElementById('recordsDisplay');
  if(!el)return;
  try{
    const records=JSON.parse(localStorage.getItem('spireRecords')||'[]');
    if(!records.length){el.innerHTML='';return;}
    const icons={ironclad:'🔥',silent:'🗡️',watcher:'✨'};
    el.innerHTML='<div style="color:rgba(255,215,0,0.6);margin-bottom:4px">🏆 通关记录</div>';
    records.slice(0,8).forEach(r=>{
      el.innerHTML+='<div style="margin:2px 0;color:rgba(255,255,255,0.3)">'+
        (icons[r.character]||'')+' ❤️'+r.hp+'/'+r.maxHp+' 🪙'+r.gold+' 💀'+r.kills+
        ' 🃏'+r.deckSize+'张 '+(r.relics?r.relics.length:0)+'遗物 <span style="font-size:9px">'+r.time+'</span></div>';
    });
  }catch(e){}
}

// 通关记录系统
function saveRecord(){
  try{
    const records=JSON.parse(localStorage.getItem('spireRecords')||'[]');
    const record={
      character:G.character,
      hp:G.hp,maxHp:G.maxHp,
      gold:G.gold,
      kills:G.totalKills,
      deckSize:G.deck.length,
      relics:G.relics.map(r=>r.name||r.id),
      time:new Date().toLocaleString('zh-CN'),
      turns:G.turn||0,
    };
    records.unshift(record);
    if(records.length>10)records.pop(); // 保留最近10条
    localStorage.setItem('spireRecords',JSON.stringify(records));
  }catch(e){console.warn('Save record failed:',e);}
}

function drawRecords(){
  const records=JSON.parse(localStorage.getItem('spireRecords')||'[]');
  if(!records.length)return;
  ctx.fillStyle='rgba(255,255,255,0.5)';ctx.font='11px Arial';ctx.textAlign='center';ctx.textBaseline='top';
  ctx.fillText('🏆 通关记录',480,82);
  const show=records.slice(0,5);
  show.forEach((r,i)=>{
    const y=104+i*18;
    const icons={ironclad:'🔥',silent:'🗡️',watcher:'✨'};
    ctx.fillStyle='rgba(255,255,255,0.3)';ctx.font='9px Arial';
    ctx.fillText((icons[r.character]||'')+' ❤️'+r.hp+'/'+r.maxHp+' 🪙'+r.gold+' 💀'+r.kills+' 🃏'+r.deckSize+'张 '+(r.relics?r.relics.length:0)+'遗物 '+r.time,480,y);
  });
}

function updateContinueBtn(){
  const btn=document.getElementById('continueBtn');
  if(btn)btn.style.display=hasSave()?'inline-block':'none';
}

// ===================================================================
//  抽牌系统 (drawCards / discard)
//  洗牌·日晷·进化·灼烧·伤痛之力·思绪铠甲·启迪等触发
// ===================================================================
function drawCards(n){
  G._totalDrawnThisTurn=(G._totalDrawnThisTurn||0)+n;
  for(let i=0;i<n;i++){
    if(!G.draw.length){
      if(!G.discard.length){
        if(!G.deck.length)break;
        G.draw=shuffle(G.deck.filter(c=>{const d=def(c);return d&&d.type!=='power';}).map(c=>({...c})));
        if(!G.draw.length)break;
        addFX(480,240,'🔄 重建','#AD8BFF');
      }else{
        G.draw=shuffle(G.discard);
        addFX(480,240,'🔄 洗牌','#FFD700');
      }
      G.discard=[];
      // 日晷: 洗牌计数
      if(G.relics&&G.relics.some(r=>r.id==='sundial')){G._sundialCount=(G._sundialCount||0)+1;if(G._sundialCount>=3){G.energy=Math.min(G.maxEnergy+2,G.energy+2);G._sundialCount=0;addFX(480,240,'☀️日晷!','#FFD700');}}
    }
    const card=G.draw.pop();
    if(!card)break;
    // Burn: take damage on draw
    const cd=def(card);
    if(cd&&cd.id==='burn'){dmgPlayerD(G,2);addFX(480,260,'🔥灼烧!','#FF6600');}
    G.hand.push(card);
    // 龙焰: 抽到时重置费用为5
    if(cd&&cd.id==='dragonFlame')card.c=5;
    // 启迪: 抽到的牌费用-1
    if(G._enlightened&&card.c>0){card.c=Math.max(0,card.c-1);}
    // 无尽痛苦: 抽到时复制一张到手牌
    if(cd&&cd.id==='endlessAgony'){const copy={...card,id:card.id+'_e'};G.hand.push(copy);}
    if(G.thoughtArmor>0){G.block+=G.thoughtArmor;addFX(480,250,'\u{1f9e0}思绪+'+G.thoughtArmor+'甲','#64B5F6');}
    // Evolve: drawing status = draw more
    if(card&&cd&&cd.type==='status'){
      if(G.evolve>0){addFX(480,240,'⚡进化!','#4CAF50');for(let e=0;e<G.evolve;e++)drawCards(1);}
      // Fire Breathing: 抽到状态全体伤害
      if(G.fireBreathing>0){G.enemies.forEach(e=>{if(e.hp>0)dmgEnemy(e,G.fireBreathing,G);});addFX(480,130,'🔥吐息!','#FF6600');}
      // 伤痛之力:抽到状态+力量
      if(G.painPower>0){G.strength+=G.painPower;addFX(480,260,'💪伤痛+'+G.painPower+'力','#FF6B6B');}
    }
  }
  while(G.hand.length>12)G.discard.push(G.hand.pop());
}
function discard(){const n=G.hand.length;G.hand.forEach(c=>{G.discard.push(c);if(G.relics&&G.relics.some(r=>r.id==='tingsha')){const tg=G.enemies.find(e=>e.hp>0);if(tg)dmgEnemy(tg,3,G);}});G._discardedThisTurn=(G._discardedThisTurn||0)+n;G.hand=[];if(G.relics&&G.relics.some(r=>r.id==='toughBandages')&&n>0){G.block+=n*3;addFX(480,240,'🩹绷带+'+(n*3)+'甲','#64B5F6');}}

// ===================================================================
//  敌人创建 (mkEnemy / setI / getPool)
//  根据楼层·难度·精英/BOSS状态生成敌人实例
// ===================================================================
function mkEnemy(t,f){
  const a=act(f);
  const diff=G?G.difficulty||0:0;
  const diffHp=1+diff*0.25; // 困难HP+25%,噩梦+50%
  const diffDmg=1+diff*0.25; // 困难伤+25%,噩梦+50%
  const hpBase=1.0+a*0.25; // 幕基础:1.25/1.5/1.75
  const dScale=a===1?0.4:a===2?0.50:0.58; // 伤害成长
  const bScale=a===1?0.2:a===2?0.25:0.3;
  const hp=Math.floor((t.hb||10)+f*(t.hs||2)*hpBase*0.85*diffHp);
  return{
    id:t.id,name:t.name,hp,maxHp:hp,
    block:0,strength:0,weak:0,vulnerable:0,poison:0,stun:false,
    mi:0,
    mv:t.mv.map(m=>({...m,sD:m.d?Math.floor((m.d+Math.floor(f*dScale))*diffDmg):0,sB:m.b?m.b+Math.floor(f*bScale):0})),
    tpl:t,ci:null,
  };
}
function setI(e){
  if(!e||e.hp<=0)return;
  e.block=0;
  const m=e.mv[e.mi%e.mv.length];
  e.mi++;e.ci=m;
}
function getPool(f,el,boss){
  const a=act(f);
  return ET.filter(e=>{
    if(boss)return e.boss&&e.act===a;
    if(el)return e.elite&&e.act===a;
    return !e.boss&&!e.elite&&e.act===a;
  });
}

// ===================================================================
//  战斗系统 — 战斗开始
//  · 重置战斗状态
//  · 生成敌人
//  · 处理遗物: 裂变核心·冠军腰带·金刚杵·蛇戒·压制昆虫等
//  · 洗牌·固有牌上手·开场格挡
// ===================================================================
function startCombat(savedEnemyIds){
  const isBoss=room(G.floor)==='boss',isElite=room(G.floor)==='elite';
  ['energy','block','weak','vulnerable','thorns','dt','metall','dForm','fnp',
   'barricade','orichalcum','anchorBonus','cardsPlayed','turn','de','evolve','corruption',
   'rage','berserk','bVuln','brutality','juggernaut','flexLoss','rupture','fireBreathing','study','caltrops','mantra','devotion','mentalFortress','_enteredWrath','_enteredCalm','_enteredCalm','likeWater','panache','apotheosis','battleHymn','reprisal','fasting','_blurNextTurn','_sundialCount','envenom','phantasmalKiller','_phantasmalActive','combust','_diffEnemyStr','_vaultTurn','_enlightened','sadisticNature','_bombCounter','_bombDamage',
   'stance','_divCountdown',
   'noxiousFumes','afterImage','sCount','kCount','nunCount','_totalFrost','_clawCount','_steamDec','heatsinks','storm','amplify',
   '_lastXCost','_lastTurnNoAttack','_attacksThisTurn','_redSkullActive','regenPotion','dexterity','penNibCount',
   'artifact',
   '_hpLostCombat','flowerCount','_corpseExplode','focus','_darkPool','tactician','_nextTurnEnergyPenalty','_bellCount','_stoveCount','_inkCount','_centennialReady','_eventFight','_warHornTurns','_shieldGenUsed','_discoveryPick','wristBladeBonus','_letterCount','_akabekoUsed','_inserterCount'].forEach(k=>{
    if(k==='energy')G.energy=G.maxEnergy;else if(k==='block')G.block=0;else G[k]=0;
  });
  G.hand=[];G.draw=[];G.discard=[];G.exhaust=[];G.enemies=[];G._log=[];
  G.barricade=false;G.dt=false;G.orichalcum=false;G.anchorBonus=0;G.endingTurn=false;G.firstTurn=true;
  G.thorns=0;G.de=false;G.evolve=0;G.corruption=false;G.orbs=[];G.maxOrbs=3;G.focus=0;G._darkPool=0;G._stormCount=0;G._hsCount=0;
  // 武装:力量直接跨战斗保留(已在createG中初始化)

  const pool=getPool(G.floor,isElite,isBoss);
  if(!pool.length)return;
  // 使用存档敌人(如存在)确保BOSS一致
  if(savedEnemyIds&&savedEnemyIds.length){
    G.enemies=savedEnemyIds.map(id=>{
      const tpl=ET.find(e=>e.id===id);
      return tpl?mkEnemy(tpl,G.floor):mkEnemy(pick(pool),G.floor);
    }).filter(e=>e);
  }
  if(!G.enemies||!G.enemies.length)G.enemies=[mkEnemy(pick(pool),G.floor)];
  // 部分怪物附加机制
  G.enemies.forEach(e=>{
    const t=e.tpl||{};
    if(t.id==='snakePlant'||t.id==='spikeSlime'||t.id==='spheric')e._thorns=2;
    if(t.id==='shell'||t.id==='golem')e._thorns=1;
    if(t.id==='champ')e._thorns=3;
  });  // 怪物开场格挡(防第一回合被秒)
  var curAct=act(G.floor);G.enemies.forEach(e=>{if(!e.tpl||!e.tpl.ignore)e.block+=Math.max(0,curAct-1)*4+2;});
  // 精英:开场获得格挡 + 独特的挑战感
  // 压制昆虫:精英HP-25%
  if(isElite&&G.relics&&G.relics.some(r=>r.id==='preservedInsect')){G.enemies.forEach(e=>{e.hp=Math.floor(e.hp*0.7);e.maxHp=e.hp;addLog('🦗 压制昆虫:精英HP-30%');});addFX(480,280,'🦗压制昆虫!','#4CAF50');}
  if(isElite){G.enemies.forEach(e=>{e.block+=8;addLog('💀 精英警戒:开场+8格挡');});addFX(480,100,'💀 精英!','#E040FB',36);screenShake(6);}
  if(isBoss){addFX(480,100,'👑 BOSS!','#FFD700',40);screenShake(10);addLog('👑 BOSS战斗开始!');}
  if(!isBoss&&!isElite&&G.floor>5&&Math.random()<0.2){
    const p2=getPool(G.floor,false,false);
    if(p2.length)G.enemies.push(mkEnemy(pick(p2),G.floor));
  }
  // 第三幕: 更高概率多怪
  if(!isBoss&&act(G.floor)>=3&&Math.random()<0.15){
    const p3=getPool(G.floor,false,false);
    if(p3.length&&G.enemies.length<3)G.enemies.push(mkEnemy(pick(p3),G.floor));
  }
  G.draw=shuffle(G.deck.map(c=>({...c,u:(G.apotheosis?true:(c.u||false))})));
  // 固有:模板自带in:true的牌开局上手(不占首回合抽牌)
  let innateCount=0;
  for(let i=G.draw.length-1;i>=0;i--){const d=def(G.draw[i]);if(d&&(d.in||d.innate)){G.hand.push(G.draw.splice(i,1)[0]);innateCount++;}}
  if(innateCount>0){G._innateBonus=innateCount;addLog('⭐ 固有:'+innateCount+'张开局入手');}
  // 精英/首领入场特效
  if(isElite){addFX(480,100,'💀 精英!','#E040FB',36);screenShake(6);addLog('💀 精英战斗开始!');}
  if(isBoss){addFX(480,100,'👑 BOSS!','#FFD700',40);screenShake(10);addLog('👑 BOSS战斗开始!');}
  if(G.relics.some(r=>r.id==='anchor'))G.anchorBonus=10;
  if(G.relics.some(r=>r.id==='polishedArmor'))G.block+=14;
  if(G.relics.some(r=>r.id==='hornCleat'))G.block+=12;
  if(G.relics.some(r=>r.id==='championBelt')){G.enemies.forEach(e=>{if(e.hp>0){e.vulnerable=(e.vulnerable||0)+1;e.weak=(e.weak||0)+1;}});addFX(480,130,'🏆冠军腰带!','#FF9800');}
  // 角色初始遗物(仅首次战斗添加)
  if(G.floor===G._startFloor){
    if(G.character==='silent'&&!G.relics.some(r=>r.id==='ringSnake')){
      G.relics.push({id:'ringSnake',name:'蛇之戒',desc:'首回合+1能+1抽'});addFX(480,300,'🐍蛇戒:首回合+1能+1抽','#64B5F6');}
    if(G.character==='ironclad'&&!G.relics.some(r=>r.id==='burningBlood')){
      G.relics.push({id:'burningBlood',name:'燃烧之血',desc:'战斗后回复8点生命'});addFX(480,300,'🔥燃烧之血:战后+8血','#FF6B6B');}
    if(G.character==='watcher'&&!G.relics.some(r=>r.id==='pureWater')){
      G.relics.push({id:'pureWater',name:'净水',desc:'首回合+1能量'});addFX(480,300,'💧净水:首回合+1能','#64B5F6');}
    if(G.relics&&G.relics.some(r=>r.id==='duVuDoll')){G.strength+=Math.min(3,G.deck.filter(x=>{const d=def(x);return d&&d.rarity==='status';}).length);}if(G.character==='defect'&&!G.relics.some(r=>r.id==='crackedCore')){
      G.relics.push({id:'crackedCore',name:'裂变核心',desc:'战斗开始生成1闪电球'});addFX(480,300,'🔮裂变核心:开局闪电球','#FFD700');}
    // 角色专属被动天赋
    G._classPassive=G.character;
    if(G.character==='ironclad'){addLog('🔥 铁血:每次自残+1力量');addFX(480,260,'🔥铁血:自残得力量','#FF6B6B');}
    else if(G.character==='silent'){addLog('🗡 毒刃:每2攻击全体1毒');addFX(480,260,'🗡毒刃:每3攻击全体1毒','#64B5F6');}
    else if(G.character==='watcher'){addLog('✨ 天人:姿态切换双倍收益');addFX(480,260,'✨天人:姿态切换双倍收益','#FFD700');}
    else if(G.character==='defect'){addLog('🔮 超频:每3球+1集中');addFX(480,260,'🔮超频:每4球+1集中','#AD8BFF');}
  }
  // 裂变核心:在所有战斗开始触发(包括首场)
  if(G.relics&&G.relics.some(r=>r.id==="crackedCore")){channel(G,"lightning",1);channel(G,"lightning",1);addFX(480,280,"🔮裂变核心:启动!","#FFD700");}
  // 弹珠袋: 战斗开始全体易伤
  if(G.relics.some(r=>r.id==='marbles')){G.enemies.forEach(e=>{if(e.hp>0)e.vulnerable=(e.vulnerable||0)+1;});addFX(480,130,'🪷弹珠袋!','#FF9800');}
  // 血瓶: 战斗开始回2血
  if(G.relics.some(r=>r.id==='bloodVial')){G.hp=Math.min(G.maxHp,G.hp+8);addFX(480,290,'🧪血瓶+8','#FF6B6B');}
  // 火焰瓶: 战斗开始+1能
  if(G.relics.some(r=>r.id==='bottledFlame')){G.energy=Math.min(G.energy+1,G.maxEnergy+1);addFX(480,280,'🔥火焰瓶','#FF9800');}
  // 毒药瓶: 战斗开始首个敌人3层毒
  if(G.relics.some(r=>r.id==='poisonBottle')){const tg=G.enemies.find(e=>e.hp>0);if(tg){tg.poison=(tg.poison||0)+7;}addFX(480,130,'🧪毒药瓶!','#9C27B0');}
  // 战争号角: 战斗开始+2力持续2回合
  if(G.relics.some(r=>r.id==='vajra')){G.strength+=2;addFX(480,290,'⚡金刚杵+2力','#FFD700');}if(G.relics.some(r=>r.id==='warHorn')){G.strength+=2;G._warHornTurns=2;addFX(480,280,'📯号角!','#FF6B6B');}
  // 青铜甲: 战斗开始获得3荆棘
  if(G.relics.some(r=>r.id==='bronzeScales')){G.thorns=(G.thorns||0)+3;addFX(480,280,'🛡️青铜甲!','#FF9800');}
  // 化石螺旋: 首次伤害免疫
  if(G.relics.some(r=>r.id==='fossilizedHelix')){G._fossilHelix=true;addFX(480,260,'🧬化石螺旋!','#64B5F6');}
  // 难度: 敌人每3回合获得力量
  if(G.difficulty>=1){G._diffEnemyStr=true;}
  G.enemies.forEach(e=>setI(e));
  G.phase='combat';
  startTurn();updateUI();
}

// ===================================================================
//  战斗系统 — 回合开始
//  · 能量恢复·格挡重置·Buff/Debuff到期
//  · 球体被动·龙焰·铁壁·恶魔·热血·金属化·蒺藜·毒雾等
//  · 抽牌·首回合加成·遗物触发
// ===================================================================
function startTurn(){
  G.turn++;if(G.relics&&G.relics.some(r=>r.id==='iceCream')){const extra=G.energy-G.maxEnergy;G.energy=G.maxEnergy+Math.max(0,extra);if(G.energy<G.maxEnergy)G.energy=G.maxEnergy;}else G.energy=G.maxEnergy;if(G._nextTurnEnergyBonus>0){G.energy=Math.min(G.maxEnergy+G._nextTurnEnergyBonus,G.energy+G._nextTurnEnergyBonus);G._nextTurnEnergyBonus=0;}G._emotionUsed=false;if(G.orbs&&G.orbs.length>0){G._orbDmg=true;orbPassive(G);G._orbDmg=false;}
  // 黏泥: 上回合透支能量惩罚
  if(G._nextTurnEnergyPenalty>0){G.energy=Math.max(0,G.energy-G._nextTurnEnergyPenalty);G._nextTurnEnergyPenalty=0;}
  // 模糊: 保留格挡
  if(G._blurNextTurn){G._blurNextTurn=false;}
  else if(!G.barricade)G.block=0;
  if(G.weak>0)G.weak--;if(G.vulnerable>0)G.vulnerable--;
  // 萝卜/生姜免疫
  if(G.relics&&G.relics.some(r=>r.id==='turnip'))G.weak=0;
  if(G.relics&&G.relics.some(r=>r.id==='ginger'))G.vulnerable=0;
  // 观者: 神格回合末消退
  if(G.stance==='divinity'&&G._divCountdown){G._divCountdown--;if(!G._divCountdown){G.stance='neutral';addFX(480,200,'💫神格消退','rgba(255,255,255,0.4)');
    if(G.samsara>0){G.mantra=(G.mantra||0)+G.samsara;addFX(480,240,'🔄轮回+'+G.samsara+'念力','#FFD700');addLog('🔄 轮回:神格消退+'+G.samsara+'念力');}}}
  // 龙焰: 回合开始重置费用
  G.hand.forEach(c=>{const d=def(c);if(d&&d.id==='dragonFlame')c.c=5;});
  if(G.burningArmor>0){var ba=G.burningArmor;if(G.hand.some(function(x){var d=def(x);return d&&d.id==='burn';}))ba+=G.burningArmor;G.block+=ba;}
  if(G.metall>0)G.block+=G.metall;
  // 铁棘甲:格挡时1伤
  if(G.relics&&G.relics.some(r=>r.id==='ironThorn')&&G.block>0){G.enemies.forEach(e=>{if(e.hp>0)dmgEnemy(e,2,G);})
  // 铁壁之力:格挡+力量
  if(G.ironWallPower>0){G.strength+=G.ironWallPower;addFX(480,260,'🏛铁壁+'+G.ironWallPower+'力','#FF6B6B');};}
  if(G.dForm>0)G.strength+=G.dForm;
  if(G.fervor>0){G.strength+=G.fervor;dmgPlayerD(G,1);addFX(480,260,'🔥热血+'+G.fervor+'力','#FF6B6B');}
  if(G.anchorBonus>0){G.block+=G.anchorBonus;G.anchorBonus=0;}
  if(G.relics.some(r=>r.id==='happyFlower')){
    G.flowerCount=(G.flowerCount||0)+1;
    if(G.flowerCount>=3){G.energy=Math.min(G.energy+1,G.maxEnergy+1);G.flowerCount=0;}
  }
  // Regen potion
  if(G.regenPotion>0){G.hp=Math.min(G.maxHp,G.hp+4);G.regenPotion--;addFX(480,280,'💚再生!','#4CAF50');}
  // Dexterity flat bonus
  if(G.dexterity>0)G.block+=G.dexterity;
  // 铃铛(Bell): 每5回合+1力
  if(G.relics&&G.relics.some(r=>r.id==='bell')){G._bellCount=(G._bellCount||0)+1;if(G._bellCount>=4){G.strength++;G._bellCount=0;addFX(480,280,'🔔铃铛!','#FFD700');}}
  // 暖炉(Stove): 每3回回5血
  if(G.relics&&G.relics.some(r=>r.id==='stove')){G._stoveCount=(G._stoveCount||0)+1;if(G._stoveCount>=3){G.hp=Math.min(G.maxHp,G.hp+8);G._stoveCount=0;addFX(480,280,'🔥暖炉!','#FF6B6B');}}
  // Tough Belt: 每回3甲
  if(G.relics&&G.relics.some(r=>r.id==='toughBelt'))G.block+=6;
  // 插入器:每2回合+1球位
  if(G.relics&&G.relics.some(r=>r.id==='inserter')){G._inserterCount=(G._inserterCount||0)+1;if(G._inserterCount>=2){G._inserterCount=0;G.maxOrbs=(G.maxOrbs||3)+1;addFX(480,240,'🔌插入器!球位+1','#AD8BFF');addLog('🔌 插入器:球位+1,当前'+G.maxOrbs);}}
  // Study: 每回获得临时牌
  if(G.study>0){const pool=ALL_CARDS.filter(x=>x.rarity!=='basic'&&x.rarity!=='status');for(let s=0;s<G.study;s++){if(pool.length){const r=pool[Math.floor(Math.random()*pool.length)];const clone={...r,id:r.id+'_study',u:false};G.hand.push(clone);addFX(480,280,'📚研习!','#FFD700');addLog('📚 研习获得: '+r.name);}}}
  // 战歌: 每回获得随机攻击牌
  if(G.battleHymn){var pool=ALL_CARDS.filter(function(x){return x.type==='attack'&&x.rarity!=='basic'&&x.rarity!=='status';});for(var hh=0;hh<G.battleHymn;hh++){if(pool.length){var rr=pool[Math.floor(Math.random()*pool.length)];var card={...rr,id:rr.id+'_hymn_'+Date.now(),u:false};card.c=Math.max(0,(card.c||0)-1);G.hand.push(card);addFX(480,280,'🎵战歌!','#FF6B6B');addLog('🎵 战歌获得: '+rr.name+'(-1费)');}}}
  // 偏差认识:每回合-1集中
  if(G.biasedCognition&&G.focus>0){G.focus--;addFX(480,260,'⚠偏差认识-1集中','#FF9800');}
  // 磁力: 每回获得随机传说牌
  if(G.magnetism>0){const pool=ALL_CARDS.filter(x=>x.rarity==='rare');for(let m=0;m<G.magnetism;m++){if(pool.length){const r=pick(pool);G.hand.push({...r,id:r.id+'_mag_'+Date.now(),u:false});addFX(480,280,'🧲磁力!','#E040FB');addLog('🧲 磁力获得: '+r.name);}}}
  // 交易工具:回合开始抽1弃1
  if(G.toolsOfTrade){drawCards(1);if(G.hand.length>0){const idx=Math.floor(Math.random()*G.hand.length);G.discard.push(G.hand.splice(idx,1)[0]);addLog('🛠️ 交易工具:抽1弃1');}}
  if(G.foresight>0){const fDraw=G.foresight;drawCards(fDraw);if(G.hand.length>0){const idx=Math.floor(Math.random()*G.hand.length);G.discard.push(G.hand.splice(idx,1)[0]);addLog('🔮 预见:抽'+fDraw+'弃1');}}
  if(G.caltrops>0){G.thorns=(G.thorns||0)+G.caltrops;addFX(480,200,'🌰铁蒺藜!','#FF9800');}
  // Noxious Fumes: 每回合全体中毒
  if(G.noxiousFumes>0){G.enemies.forEach(e=>{if(e.hp>0)e.poison=(e.poison||0)+G.noxiousFumes;});addFX(480,130,'☠️毒雾!','#9C27B0');}
  // 力毒双修:毒雾触发时+力量
  if(G.noxiousFumes>0&&G.toxinStrength>0){G.strength+=G.toxinStrength;addFX(480,260,'💊力毒双修+'+G.toxinStrength+'力','#9C27B0');addLog('💊 力毒双修+'+(G.toxinStrength)+'力');}
  // War Horn: 持续2回合的力量+2消退
  if(G._warHornTurns>0){G._warHornTurns--;if(G._warHornTurns<=0){G.strength=Math.max(0,G.strength-2);addFX(480,280,'📯号角消退','rgba(255,255,255,0.3)');}}
  // 护盾发生器: 重置
  G._shieldGenUsed=false;
  // 炸弹: 倒计时
  if(G._bombCounter>0){G._bombCounter--;if(G._bombCounter<=0){G.enemies.forEach(e=>{if(e.hp>0)dmgEnemy(e,G._bombDamage||30,G);});addFX(480,130,'💣炸弹爆炸!','#FF6B6B',30);addLog('💣 炸弹爆炸! '+(G._bombDamage||30)+'伤害');}else addLog('💣 炸弹倒计时:'+G._bombCounter);}
  // 绝技: 回合重置计数
  if(G.panache&&G.panache.count)G.panache.count=0;
  // 宁静: 每回+1能(辅助运转)
  if(G.stance==='calm'){G.energy=Math.min(G.maxEnergy,G.energy+1);addFX(480,240,'💧宁静+1能','#64B5F6');}
  // 机兵:球体被动
  if(G.relics&&G.relics.some(r=>r.id==='emotionChip')){G._emotionUsed=false;}
  // Red Skull: ≤50%血+3力
  if(G.relics&&G.relics.some(r=>r.id==='redSkull')&&G.hp<=G.maxHp/2){if(!G._redSkullActive){G.strength+=3;G._redSkullActive=true;addFX(480,280,'💀红骷髅!','#FF4444');}}
  // Art of War: 上回无攻击则+1能
  if(G.relics&&G.relics.some(r=>r.id==='artOfWar')&&G._lastTurnNoAttack){G.energy=Math.min(G.energy+1,G.maxEnergy+1);addFX(480,260,'📖兵书!','#FFD700');}
  // 观者: 虔诚(devotion)每回+mantra
  if(G.devotion>0){G.mantra=(G.mantra||0)+G.devotion;addFX(480,240,'🙏虔诚+'+(G.devotion||0),'#FFD700');}if(G.orbResonance>0){var oN=G.orbs?G.orbs.length:0;G.mantra=(G.mantra||0)+oN*G.orbResonance;addFX(480,240,'🔮共鸣+'+(oN*G.orbResonance)+'念力','#FFD700');}
  // 念能转化:念力+能量
  if(G.mantraEnergy>0&&G.devotion>0){G.energy=Math.min(G.maxEnergy+1,G.energy+1);if(G.mantraEnergy>1)addFX(480,260,'⚡念能转化+1能','#AD8BFF');}
  // 观者: 念力≥6进入神格(降低门槛)
  if((G.mantra||0)>=6&&G.stance!=='divinity'){G.mantra=0;setStance(G,'divinity');addFX(480,200,'✨神格降临!','#FFD700',30);}
  // Berserk: +1能+易伤
  if(G.berserk){G.energy=Math.min(G.energy+1,G.maxEnergy+1);addFX(480,280,'⚡狂暴!','#FF6B6B');}
  // Brutality: 抽1自伤1(升级回血)
  if(G.brutality){drawCards(1);dmgPlayerD(G,1);addFX(480,260,'💀残忍!','#E040FB');if(G.brutalityHeal){G.hp=Math.min(G.maxHp,G.hp+1);addFX(480,280,'💚+1','#4CAF50');}}
  // 燃烧: 每回合自伤+全体伤害(改为回合开始触发,避免每张牌触发)
  if(G.combust>0){dmgPlayerD(G,1);G.enemies.forEach(e=>{if(e.hp>0)dmgEnemy(e,G.combust,G);});addFX(480,130,'🔥燃烧!','#FF6B6B');addLog('🔥 燃烧造成'+(G.combust)+'全体伤害');}
  // 无尽刀锋:回合开始获得小刀
  if(G.infiniteBlades>0){for(let i=0;i<G.infiniteBlades;i++)G.hand.push({...M.shiv,id:'shiv_ib_'+Date.now()+'_'+i});addFX(480,280,'🗡️无尽刀锋!','#64B5F6');}
  // 创造性AI:回合开始获得随机能力牌
  if(G.creativeAI){const pool=ALL_CARDS.filter(x=>x.type==='power'&&x.rarity!=='basic'&&x.rarity!=='status');if(pool.length){const r=pick(pool);G.hand.push({...r,id:r.id+'_cai_'+Date.now(),u:false});addFX(480,280,'🤖创造性AI!','#AD8BFF');addLog('🤖 创造性AI获得: '+r.name);}}
  // 你好世界:回合开始获得随机普通卡
  if(G.helloWorld>0){const pool=ALL_CARDS.filter(x=>x.rarity==='common');for(let i=0;i<G.helloWorld;i++){if(pool.length){const r=pick(pool);G.hand.push({...r,id:r.id+'_hw_'+Date.now()+'_'+i,u:false});addFX(480,280,'🌍你好世界!','#64B5F6');addLog('🌍 你好世界获得: '+r.name);}}}
  let dc=5-(G.difficulty>0?1:0); // 困难/噩梦均只少抽1张
  // 固有卡不占首回合抽牌
  if(G.firstTurn&&G._innateBonus>0){dc+=G._innateBonus;G._innateBonus=0;}
  if(G.firstTurn&&G.relics.some(r=>r.id==='bagPrep'))dc+=2;
  // 煤灯: 首回合+1能量
  if(G.firstTurn&&G.relics&&G.relics.some(r=>r.id==='lantern'))G.energy=Math.min(G.energy+1,G.maxEnergy+1);
  if(G.firstTurn&&G.relics&&G.relics.some(r=>r.id==='pureWater'))G.energy=Math.min(G.energy+1,G.maxEnergy+1);
  // 蛇戒: 首回合+1能+1抽
  if(G.relics&&G.relics.some(r=>r.id==='ringSnake')){if(G.firstTurn)G.energy=Math.min(G.energy+1,G.maxEnergy+1);dc+=1;addFX(480,240,'🐍蛇戒+1抽','#64B5F6');}
  // 符文穹顶:永久+1能量
  if(G.relics&&G.relics.some(r=>r.id==='runicDome')&&!G._runicDomeAdded){G.maxEnergy++;G._runicDomeAdded=true;addFX(480,260,'🏛️符文穹顶!','#FFD700');addLog('🏛️ 符文穹顶:最大能量+1');}
  // 经书: 每回合第一次抽牌额外抽1
  if(G.relics&&G.relics.some(r=>r.id==='sutra')){dc+=1;addFX(480,240,'📜经书!','#FFD700');}
  // 百年拼图: 首回额外抽1(一次性)
  if(G._centennialReady&&G.relics&&G.relics.some(r=>r.id==='centennial')){dc+=2;G._centennialReady=false;}
  if(G.machineLearning){dc+=1;addFX(480,240,'🤖机器学习!','#E040FB');}
  if(G.relics&&G.relics.some(r=>r.id==='sneckoEye')){dc+=2;addFX(480,240,'🐍史尼可之眼!','#E040FB');}
  // 怀表:手牌≤3抽到6张
  if(G.relics&&G.relics.some(r=>r.id==='pocketwatch')&&G.hand.length<=3){dc=Math.max(dc,6-G.hand.length);addFX(480,240,'⌚怀表!','#FFD700');}
    // \u8d4c\u535a\u7b79\u7801:\u9996\u56de\u5408\u53ef\u5f03\u724c\u91cd\u62bd
  if(G.firstTurn&&G.relics&&G.relics.some(r=>r.id==='gamblingChip')){addLog('\ud83c\udfb2 \u8d4c\u535a\u7b79\u7801:\u53ef\u5f03\u724c\u91cd\u62bd');addFX(480,240,'\ud83c\udfb2\u8d4c\u535a\u7b79\u7801!','#FFD700');}
  G.firstTurn=false;G._echoUsed=false;G.cardsPlayed=0;G._totalDrawnThisTurn=0;G._discardedThisTurn=0;G.endingTurn=false;G.dt=false;if(G.relics&&G.relics.some(r=>r.id==='frozenCore')){channel(G,'frost',1);addFX(480,280,'\u{1f9ca}\u51b0\u6838:\u751f\u6210\u51b0\u971c\u7403','#64B5F6');}G._silentAttacks=0;
  drawCards(dc);updateUI();
}

// ===================================================================
//  战斗系统 — 出牌逻辑
//  · 费用·腐化·目标·效果执行
//  · 遗物触发: 手里剑·苦无·笔尖·毒囊·死灵书·木乃伊手等
// ===================================================================
function playCard(hi){
  if(G.phase!=='combat'||G.endingTurn)return;
  const card=G.hand[hi];
  if(!card)return;
  const d=def(card);
  // Corruption: skills cost 0 and exhaust
  let cost=card.c;
  if(G.relics&&G.relics.some(r=>r.id==='sneckoEye')){cost=1+Math.floor(Math.random()*3);}
  if(cost===-1){cost=G.energy;G._lastXCost=cost;} // X费: 消耗全部能量
  if(G.corruption&&d&&d.type==='skill'){cost=0;card.c=0;card.ex=true;addLog('💀 腐化: '+card.name+' 0费');}if(G.relics&&G.relics.some(r=>r.id==='medicalKit')&&d&&d.type==='status'){cost=0;card.ex=true;}
  if(G.energy<cost)return;
  if(d&&d.cP&&!d.cP(G))return;
  const alive=G.enemies.filter(e=>e.hp>0);
  if(!alive.length)return;

  G.energy-=cost;
  G.hand.splice(hi,1);
  G.cardsPlayed++;
  addLog('⚡ '+card.name+' ('+cost+'费)');
  // 出牌位置闪光
  G._playedCardFlash=8;G._playedCardX=480;G._playedCardY=400;
  // 腕刃:0费攻击+4伤害
  if(G.relics&&G.relics.some(r=>r.id==='wristBlade')&&card.c===0&&card.type==='attack'){G.wristBladeBonus=4;}else G.wristBladeBonus=0;
  // 赤牛:首攻击+8
  if(G.relics&&G.relics.some(r=>r.id==='akabeko')&&!G._akabekoUsed&&card.type==='attack'){G._akabekoUsed=true;G._akabekoBonus=8;addFX(480,260,'🐮赤牛!+8','#FF9800');}else G._akabekoBonus=0;
  // Shuriken/Kunai: 每3次攻击
  if(card.type==='attack'&&G.relics){
    if(G.relics.some(r=>r.id==='shuriken')){G.sCount=(G.sCount||0)+1;if(G.sCount>=2){G.strength++;G.sCount=0;addFX(480,260,'🌀手里剑!','#E040FB');addLog('🌀 手里剑:力量+1');}}
    if(G.relics.some(r=>r.id==='kunai')){G.kCount=(G.kCount||0)+1;if(G.kCount>=3){G.block+=8;G.kCount=0;addFX(480,260,'🌀苦无!','#64B5F6');}}
    if(G.relics.some(r=>r.id==='nunchaku')){G.nunCount=(G.nunCount||0)+1;if(G.nunCount>=2){G.energy=Math.min(G.maxEnergy,G.energy+1);G.nunCount=0;addFX(480,260,'🥢双节棍!','#FF9800');}}
    // Pen Nib: 每10次攻击伤害翻倍
    if(G.relics&&G.relics.some(r=>r.id==='penNib')){G.penNibCount=(G.penNibCount||0)+1;if(G.penNibCount>=8){G.dt=true;G.penNibCount=0;addFX(480,240,'✒️笔尖!','#FFD700');}}
    // Art of War tracking
    G._attacksThisTurn=(G._attacksThisTurn||0)+1;if(G.relics&&G.relics.some(r=>r.id==='ornamentalFan')){G._fanCount=(G._fanCount||0)+1;if(G._fanCount>=3){G._fanCount=0;G.block+=6;addFX(480,240,'🪭饰品扇!+6甲','#64B5F6');}}if(G._classPassive==='silent'){G._silentAttacks=(G._silentAttacks||0)+1;if(G._silentAttacks>=2){G._silentAttacks=0;G.enemies.forEach(e=>{if(e.hp>0)e.poison=(e.poison||0)+1;});addFX(480,130,'🗡毒刃!','#64B5F6');addLog('🗡 毒刃:全体1毒');}};
  }
  // 出牌特效(按类型)
  if(card.type==='attack'){addPlayEffect('⚔️'+card.name,480,400);screenShake(5);addHitParticles(480,300,'#FF6B6B',8);}
  else if(card.type==='skill'){addPlayEffect('🛡️'+card.name,480,400);addHitParticles(480,300,'#64B5F6',6);}
  else if(card.type==='power'){addPlayEffect('⭐'+card.name,480,400);screenShake(3);addHitParticles(480,300,'#FFD700',15);addFX(480,200,'⚡能力激活!','#FFD700',24);}
  else addPlayEffect(card.name,480,400);

  let times=1;if(G.duplicationPotion){times=2;G.duplicationPotion=false;addFX(480,220,'🧪复制药水!','#E040FB');}
  if(G.dt&&card.type==='attack'){times=2;G.dt=false;}
  if(G.skillDouble&&card.type==='skill'){times=2;G.skillDouble=false;}
  if(G.echoForm&&!G._echoUsed&&!G.firstTurn){times=2;G._echoUsed=true;addFX(480,220,'🔊回响!','#E040FB');}
  if(G.amplify>0&&card.type==='power'){times+=G.amplify;G.amplify=0;addFX(480,220,'🔊增幅!','#E040FB');}const _beforePoison=G.enemies.reduce((s,e)=>s+(e.poison||0),0);for(let t=0;t<times;t++){
    if(card.type==='attack'){
      const tg=G.enemies.filter(e=>e.hp>0);
      if(!tg.length)break;
      if(d&&d.target==='all')d.f(G,tg,card);
      else if(d)d.f(G,[tg[0]],card);
      // 毒囊:攻击牌施加1毒
      if(card.type!=='attack'){G.enemies.forEach(e=>{if(e.hp>0&&e.id==='gNob'){e.strength=(e.strength||0)+1;addFX(480,60,'💢头目激怒+1力','#FF6B6B');}});}
      if(G.relics&&G.relics.some(r=>r.id==='toxinSack')&&tg.length>0){tg[0].poison=(tg[0].poison||0)+1;}
    }else if(d)d.f(G,null,card);
    if(G.enemies.every(e=>e.hp<=0))break;
  }
  // 怒火: 攻击牌获得格挡(生存补偿)
  if(G.stance==='wrath'&&card.type==='attack'){G.block+=3;addFX(480,280,'🔥怒火铁壁+3','#FF6B6B');}
  // 龙焰: 每使用一张牌,手牌中的龙焰费用-1
  G.hand.forEach(c=>{const cd=def(c);if(cd&&cd.id==='dragonFlame'&&c.c>0){c.c--;addFX(480,240,'🐉龙焰费用-1','#FF6B6B');}});
  // 斋戒: 每回+能量
  if(G.fasting>0){G.energy=Math.min(G.maxEnergy+G.fasting,G.energy+G.fasting);addFX(480,280,'🧘斋戒+'+(G.fasting)+'能','#FFD700');}
  // 涂毒: 攻击施加中毒
  if(G.envenom>0&&card.type==='attack'){const tg=G.enemies.find(e=>e.hp>0);if(tg){tg.poison=(tg.poison||0)+G.envenom;addFX(480,130,'☠️涂毒+'+(G.envenom),'#9C27B0');addLog('☠️ 涂毒施加'+G.envenom+'层毒');}}
  // 刀锋淬毒: 攻击牌施加毒
  if(G.bladeVenom>0&&card.type==='attack'){const tg=G.enemies.find(e=>e.hp>0);if(tg){tg.poison=(tg.poison||0)+G.bladeVenom;addFX(480,130,'🗡️刀锋淬毒+'+(G.bladeVenom),'#9C27B0');addLog('🗡️ 刀锋淬毒+'+G.bladeVenom+'毒');}}
  // 幻影杀手: 回合末消失
  if(G.phantasmalKiller&&card.type==='attack'){G._phantasmalActive=G.phantasmalKiller;addFX(480,200,'👻幻影杀手!','#E040FB');}
  // After Image: 每打一张牌得甲
  // 绝技: 计数
  if(G.panache){G.panache.count++;if(G.panache.count>=G.panache.threshold){G.panache.count=0;G.enemies.forEach(e=>{if(e.hp>0)dmgEnemy(e,G.panache.damage,G);});addFX(480,130,'💥绝技!','#FFD700');addLog('💥 绝技触发!全体'+G.panache.damage+'伤');}}
  // 千刀万剐:每打1牌全敌1伤
  if(G.thousandCuts>0){G.enemies.forEach(e=>{if(e.hp>0)dmgEnemy(e,G.thousandCuts,G);});}
  // 开信刀:每3技能全体5伤
  if(card.type==='skill'&&G.relics&&G.relics.some(r=>r.id==='letterOpener')){G._letterCount=(G._letterCount||0)+1;if(G._letterCount>=3){G._letterCount=0;G.enemies.forEach(e=>{if(e.hp>0)dmgEnemy(e,5,G);});addFX(480,130,'✉️开信刀!','#64B5F6');addLog('✉️ 开信刀!全体5伤');}}
  // 墨水(Ink): 每4张牌抽1
  if(G.relics&&G.relics.some(r=>r.id==='ink')){G._inkCount=(G._inkCount||0)+1;if(G._inkCount>=3){G._inkCount=0;drawCards(1);addFX(480,240,'🖋️墨水!','#64B5F6');}}
  // Dark Embrace
  // 死灵书: 消耗得随机牌
  if(card.ex&&G.relics&&G.relics.some(r=>r.id==='deadBranch')){
    const pool=ALL_CARDS.filter(x=>{if(x.rarity==='basic'||x.rarity==='status')return false;
      if(G.relics&&G.relics.some(r=>r.id==='prismatic'))return true;
      if(x.id==='neutralize'||x.id==='quickSlash'||x.id==='bladeDance'||x.id==='cloakDagger'||x.id==='deadlyPoison'||x.id==='noxiousFumes'||x.id==='catalyst'||x.id==='escapePlan'||x.id==='afterImage'||x.id==='acrobatics'||x.id==='dodgeRoll'||x.id==='survivor'||x.id==='calcGamble'||x.id==='backstab'||x.id==='skewer'||x.id==='poisonBlade'||x.id==='shadowStep'||x.id==='thousandCuts'||x.id==='glassKnife'||x.id==='toolsOfTrade'||x.id==='reflex'||
       x.id==='corpseExplosion'||x.id==='eviscerate'||x.id==='infiniteBlades'||x.id==='malaise'||x.id==='wraithForm'||
       x.id==='tactician'||x.id==='expertise'||x.id==='accuracy'||x.id==='bouncingFlask'||x.id==='finisher'||
       x.id==='sneakyStrike')return G.character==='silent';
      if(x.id==='eruption'||x.id==='vigilance'||x.id==='emptyFist'||x.id==='sanctity'||x.id==='fearNoEvil'||x.id==='tantrum'||x.id==='consecrate'||x.id==='meditate'||x.id==='cutThroughFate'||x.id==='study'||x.id==='strikeOfFlurry'||x.id==='emptyBody'||x.id==='wheelKick'||x.id==='pray'||x.id==='worship'||x.id==='prostrate'||x.id==='devotion'||x.id==='brilliance'||x.id==='conclude'||x.id==='rushdown'||x.id==='mentalFortress'||x.id==='indignation'||x.id==='evaluate'||x.id==='likeWater'||x.id==='meditateSimple'||x.id==='battleHymn'||x.id==='sigSoul'||x.id==='innerPeace'||x.id==='crescendo'||x.id==='halt'||x.id==='flyingSleeves'||x.id==='clearMind'||x.id==='justLucky'||x.id==='furyFist'||x.id==='windGuard'||
       x.id==='reachHeaven'||x.id==='carveReality'||x.id==='crushJoints'||x.id==='deceiveReality'||
       x.id==='foreignInfluence'||x.id==='foresight'||x.id==='masterReality')return G.character==='watcher';if(x.id==='zap'||x.id==='dualcast'||x.id==='beamCell'||x.id==='coldSnap'||x.id==='sweepingBeam'||x.id==='rebound'||x.id==='barrage'||x.id==='compileDriver'||x.id==='ballLightning'||x.id==='coolheaded'||x.id==='leap'||x.id==='steamBarrier'||x.id==='recursion'||x.id==='hologram'||x.id==='claw'||x.id==='goForTheEyes'||x.id==='autoShields'||x.id==='recycle'||x.id==='focusShield'||x.id==='superconduct'||x.id==='glacier'||x.id==='capacitor'||x.id==='defragment'||x.id==='tempest'||x.id==='staticDischarge'||x.id==='loop'||x.id==='selfRepair'||x.id==='fusion'||x.id==='streamline'||x.id==='melter'||x.id==='doomAndGloom'||x.id==='chaos'||x.id==='equilibrium'||x.id==='geneticAlgorithm'||x.id==='skim'||x.id==='whiteNoise'||x.id==='heatsinks'||x.id==='storm'||x.id==='consume'||x.id==='bootSequence'||x.id==='orbSurge'||x.id==='overclock'||x.id==='stack'||x.id==='repulse'||x.id==='multiCast'||x.id==='allForOne'||x.id==='hyperbeam'||x.id==='rainbow'||x.id==='electrodynamics'||x.id==='echoForm'||x.id==='machineLearning'||x.id==='buffer'||x.id==='thunderStrike'||x.id==='sunder'||x.id==='amplify'||x.id==='meteorStrike'||x.id==='coreSurge'||x.id==='blizzard'||x.id==='forceField'||x.id==='reboot'||
       x.id==='chill'||x.id==='creativeAI'||x.id==='darkness'||x.id==='fission'||x.id==='helloWorld'||
       x.id==='ripAndTear'||x.id==='turbo'||x.id==='ftl'||x.id==='lockOn'||x.id==='scrape'||
       x.id==='reprogram'||x.id==='redo'||x.id==='biasedCognition')return G.character==='defect';return true;});
    if(c.id==='zap'||c.id==='dualcast'||c.id==='beamCell'||c.id==='coldSnap'||c.id==='sweepingBeam'||c.id==='rebound'||c.id==='barrage'||c.id==='compileDriver'||c.id==='ballLightning'||c.id==='coolheaded'||c.id==='leap'||c.id==='steamBarrier'||c.id==='recursion'||c.id==='hologram'||c.id==='claw'||c.id==='goForTheEyes'||c.id==='autoShields'||c.id==='recycle'||c.id==='focusShield'||c.id==='superconduct'||c.id==='glacier'||c.id==='capacitor'||c.id==='defragment'||c.id==='tempest'||c.id==='staticDischarge'||c.id==='loop'||c.id==='selfRepair'||c.id==='fusion'||c.id==='streamline'||c.id==='melter'||c.id==='doomAndGloom'||c.id==='chaos'||c.id==='equilibrium'||c.id==='geneticAlgorithm'||c.id==='skim'||c.id==='whiteNoise'||c.id==='heatsinks'||c.id==='storm'||c.id==='consume'||c.id==='bootSequence'||c.id==='orbSurge'||c.id==='overclock'||c.id==='stack'||c.id==='repulse'||c.id==='multiCast'||c.id==='allForOne'||c.id==='hyperbeam'||c.id==='rainbow'||c.id==='electrodynamics'||c.id==='echoForm'||c.id==='machineLearning'||c.id==='buffer'||c.id==='thunderStrike'||c.id==='sunder'||c.id==='amplify'||c.id==='meteorStrike'||c.id==='coreSurge'||c.id==='blizzard'||c.id==='forceField'||c.id==='reboot'||
       c.id==='chill'||c.id==='creativeAI'||c.id==='darkness'||c.id==='fission'||c.id==='helloWorld'||
       c.id==='ripAndTear'||c.id==='turbo'||c.id==='ftl'||c.id==='lockOn'||c.id==='scrape'||
       c.id==='reprogram'||c.id==='redo'||c.id==='biasedCognition')
      return G.character==='defect';

    if(pool.length){const rc=pick(pool);G.hand.push({...rc,id:rc.id+'_br'+Date.now()});addFX(480,220,'📖死灵书!','#E040FB');}
  }
  // 力毒双修:施加毒时+力量
  if(G.toxinStrength>0){const _afterPoison=G.enemies.reduce((s,e)=>s+(e.poison||0),0);if(_afterPoison>_beforePoison){G.strength+=G.toxinStrength;addFX(480,260,'💊力毒双修+'+G.toxinStrength+'力','#9C27B0');addLog('💊 力毒双修+'+(G.toxinStrength)+'力');}}
  if(card.ex&&G.de){drawCards(G.de);}
  	  // 木乃伊手: 打出能力减随机牌费
	  if(G.heatsinks>0&&card.type==='power'){G._hsCount=(G._hsCount||0)+1;var hsTh=((G.heatsinks||0)>=2?1:2);if(G._hsCount>=hsTh){G._hsCount=0;drawCards(G.heatsinks);addLog('散热片:抽'+G.heatsinks+'张');}}if(G.storm>0&&card.type==='power'){G._stormCount=(G._stormCount||0)+1;var sTh=((G.storm||0)>=2?1:2);if(G._stormCount>=sTh){G._stormCount=0;for(let s=0;s<G.storm;s++)channel(G,'lightning',1);addLog('⚡ 风暴:生成'+G.storm+'闪电球');}}if(card.type==='power'&&G.relics&&G.relics.some(r=>r.id==='mummyHand')){
    const pool=G.hand.filter(x=>x.c>0);
    if(pool.length){const rc=pick(pool);rc.c=Math.max(0,rc.c-1);addFX(480,260,'🫀木乃伊!','#8D6E63');}
  }
  if(card.ex||card.type==='power'){
    // 神秘勺子:50%概率不消耗
    if(card.ex&&G.relics&&G.relics.some(r=>r.id==='strangeSpoon')&&Math.random()<0.5){G.discard.push(card);}
    else if(card.ex){G.exhaust.push(card);if(G.fnp>0)G.block+=G.fnp;}
  }else G.discard.push(card);

  if(G.enemies.every(e=>e.hp<=0)&&!G._killDelay){combatWin();return;}
  updateUI();
}

// ===================================================================
//  战斗系统 — 回合结束 & 敌人回合
//  先处理保留手牌·Flex消退·如水·山铜·穹顶等,
//  再执行 enemyTurn → 中毒·尸爆·地精角·沙漏·铁壁反击·问手
// ===================================================================
function endTurn(){
  if(G.phase!=='combat'||G.endingTurn)return;
  G.endingTurn=true;G.dt=false;
  // 符文金字塔:自动保留所有手牌
  if(G.relics&&G.relics.some(r=>r.id==='runicPyramid'))G._equilibrium=true;
  // 缜密计划/均衡:保留手牌
  if(G.retainCount>0||G._equilibrium){
    const keep=G._equilibrium?G.hand.length:Math.min(G.retainCount,G.hand.length);
    G._equilibrium=false;G.retainCount=0;
    const retained=[];
    for(let i=0;i<keep&&G.hand.length>0;i++)retained.push(G.hand.pop());
    discard();
    retained.forEach(c=>G.hand.push(c));
    if(keep>0)addLog('📋 保留'+keep+'张手牌');
  }else discard();
  // Art of War track: 记录本回合是否打出攻击
  G._lastTurnNoAttack=G._attacksThisTurn===0;
  G._attacksThisTurn=0;
  // Unceasing Top: 手牌为空则抽1
  if(G.relics&&G.relics.some(r=>r.id==='top')&&G.hand.length===0){drawCards(1);addFX(480,260,'🌀陀螺!','#64B5F6');}
  // Flex: 回合末失去力量
  if(G.flexLoss>0){G.strength=Math.max(0,G.strength-G.flexLoss);G.flexLoss=0;addLog('💪 活动肌肉力量消退(-'+G.flexLoss+')');}
  // 如水: 回合末宁静得甲
  if(G.likeWater>0&&G.stance==='calm'){G.block+=G.likeWater;addFX(480,260,'💧如水+'+(G.likeWater),'#64B5F6');addLog('💧 如水+'+G.likeWater+'格挡');}
  if(G.relics.some(r=>r.id==='orichalcum')&&G.block===0){G.block+=6;addLog('🛡️ 山铜+6格挡');}
  // 穹顶:跳过敌人回合直接额外回合
  if(G._vaultTurn){G._vaultTurn=false;addLog('⏳ 穹顶:额外回合!');G.enemies.forEach(e=>setI(e));startTurn();return;}

  enemyTurn();
  if(G.hp<=0){gameOver();return;}
  G.enemies.forEach(e=>{
    if(e.poison>0&&e.hp>0){const d=e.poison;e.hp-=d;e.poison--;if(e.hp>0&&d>0){addFX(480,130,'-☠️'+d,'#9C27B0');addLog('☠️ '+e.name+'中毒-'+d);}}
    // 尸爆: 中毒死亡炸全体
    if(G.relics&&G.relics.some(r=>r.id==='specimen')&&e.hp<=0&&e.poison>0){const newTg=G.enemies.find(o=>o!==e&&o.hp>0);if(newTg){newTg.poison=(newTg.poison||0)+e.poison;addLog('🧪 样本:中毒转移');e.poison=0;}}if(e.hp<=0&&e._corpseExplode){G.enemies.forEach(o=>{if(o!==e&&o.hp>0){dmgEnemy(o,e.maxHp,G);}});addFX(480,100,'💥尸爆!','#9C27B0');addLog('💥 尸爆! '+e.maxHp+'伤害');}
  });
  // 地精角: 敌人死亡抽1+1能
  const _deadCnt=G.enemies.filter(e=>e.hp<=0).length;
  if(_deadCnt>0&&G.relics&&G.relics.some(r=>r.id==='gremlinHorn')){drawCards(_deadCnt);G.energy=Math.min(G.maxEnergy,G.energy+_deadCnt);addFX(480,220,'🔔地精角!','#FF9800');addLog('🔔 地精角:抽'+_deadCnt+'+'+_deadCnt+'能');}
  // 水银沙漏: 回合末全体3伤
  if(G.relics&&G.relics.some(r=>r.id==='hourglass')){G.enemies.forEach(e=>{if(e.hp>0)dmgEnemy(e,3,G);});addFX(480,100,'⌛沙漏!','#64B5F6');addLog('⌛ 沙漏全体3伤');}
  // Juggernaut: 得甲触发伤害
  if(G.juggernaut>0){const tg=G.enemies.filter(e=>e.hp>0);if(tg.length){dmgEnemy(tg[0],G.juggernaut,G);addFX(480,130,'💥冲锋!','#FF6B6B');addLog('💥 冲锋者造成'+G.juggernaut+'伤');}}
  // 暗缚: 回合末恢复临时降低的力量
  G.enemies.forEach(e=>{if(e._tempStrRed){e.strength+=e._tempStrRed;e._tempStrRed=0;}});
  if(G.enemies.every(e=>e.hp<=0)&&!G._killDelay){combatWin();return;}
  // 穹顶: 额外回合(跳过敌方回合)
  // 铁壁反击:回合开始释放
  if(G._ironCounter>0){const d=G.block;const mult=G._ironCounter;G._ironCounter=0;
    if(d>0)G.enemies.forEach(e=>{if(e.hp>0)dmgEnemy(e,Math.floor(d*mult),G);});addLog('🛡️ 铁壁反击!'+Math.floor(d*mult)+'AOE');}
  // 问手:获得上回合积累的格挡
  if(G._talkHand>0){G.block+=G._talkHand;addFX(480,260,'🖐️问手+'+(G._talkHand)+'甲','#64B5F6');addLog('🖐️ 问手回收'+G._talkHand+'甲');G._talkHand=0;}
  startTurn();
}

// ===================================================================
//  战斗系统 — 敌人行动
//  根据意图执行: 攻击·防御·Buff·Debuff·多连击·塞牌·治疗
//  处理荆棘·虚弱·易伤·人工制品·难度强化
// ===================================================================
function enemyTurn(){
  G.enemies.forEach(enemy=>{
    if(enemy.hp<=0)return;
    const intent=enemy.ci;if(!intent)return;
    if(enemy.stun){enemy.stun=false;addFX(480,60,'\u{1f4ab}\u{772f}\u{665a}','#64B5F6');addLog('\u{1f4ab} '+enemy.name+'\u{88ab}\u{665a}');return;}
    if(typeof intent.ef==='function')intent.ef(G,enemy);
    switch(intent.t){
      case'a':{
        if(G.thorns>0){enemy.hp-=G.thorns;addLog('\u{1f525} \u{53cd}\u{5072}\u{90ae}\u{4f24}'+G.thorns+'\u{7ed9}'+enemy.name);if(enemy.hp<=0)break;}
        const d=dmgPlayer(G,intent.sD,enemy);
        if(d>0){addFX(480,260,'-'+d+'\u{2764}\u{fe0f}','#FF4444');addLog('\u{2694}\u{fe0f} '+enemy.name+'\u{6539}\u{6210}\u{9020}\u{6210}'+d+'\u{4f24}\u{5bb3}');}
        else addLog('\u{1f6e1}\u{fe0f} \u{683c}\u{63a1}\u{4e86}'+enemy.name+'\u{7684}\u{6539}\u{6210}');}
        break;
      case'm':
        const hits=intent.n||2;let totalD=0;
        for(let h=0;h<hits;h++){
          if(enemy.hp<=0)break;if(G.thorns>0){enemy.hp-=G.thorns;if(enemy.hp<=0)break;}
          totalD+=dmgPlayer(G,intent.sD,enemy);
        }
        if(totalD>0){addFX(480,260,'\u{26a1}'+hits+'\u{8fde}\u{51fb}!'+totalD+'\u{2764}\u{fe0f}','#FF4444');addLog('\u{2694}\u{fe0f} '+enemy.name+'\u{8fde}\u{51fb}'+hits+'\u{6b21}\u{5171}'+totalD+'\u{4f24}\u{5bb3}');}
        else addLog('\u{1f6e1}\u{fe0f} \u{683c}\u{63a1}\u{4e86}'+enemy.name+'\u{7684}\u{8fde}\u{51fb}');
        break;
      case'd':enemy.block+=intent.sB||intent.b||0;addFX(480,60,'\u{1f6e1}\u{fe0f}+'+(intent.sB||intent.b||0),'#64B5F6');addLog('\u{1f6e1}\u{fe0f} '+enemy.name+'\u{83b7}\u{5f97}'+(intent.sB||intent.b||0)+'\u{683c}\u{63a1}');break;
      case'db':
        if(G.artifact>0){G.artifact--;addFX(480,260,'\u{2728}\u{4eba}\u{5de5}\u{5401}\u{54c1}\u{6d88}!','#FFD700');addLog('\u{2728} \u{4eba}\u{5de5}\u{5401}\u{54c1}\u{6d88}\u{4e86D}ebuff');break;}
        if(intent.ef==='vuln'){G.vulnerable=(G.vulnerable||0)+(intent.v||1);addFX(480,260,'\u{1f4ab}\u{6613}\u{4f24}+'+(intent.v||1),'#FF9800');addLog('\u{1f4ab} \u{88ab}\u{65bd}\u{52a0}'+(intent.v||1)+'\u{5c42}\u{6613}\u{4f24}');}
        else if(intent.ef==='weak'){G.weak=(G.weak||0)+(intent.v||1);addFX(480,260,'\u{1f4a7}\u{865a}\u{5f31}+'+(intent.v||1),'#64B5F6');addLog('\u{1f4a7} \u{88ab}\u{65bd}\u{52a0}'+(intent.v||1)+'\u{5c42}\u{865a}\u{5f31}');}
        else if(intent.ef==='poison'){const e=G.enemies[0];if(e&&e.hp>0){e.poison=(e.poison||0)+(intent.v||3);addFX(480,260,'\u{2620}\u{4e2d}\u{6bd2}+'+(intent.v||3),'#9C27B0');}}
        break;
      case'b':
        if(intent.ef==='str'){enemy.strength=(enemy.strength||0)+(intent.v||1);addFX(480,60,'\u{2b06}\u{529b}\u{91cf}+'+(intent.v||1),'#FF6B6B');addLog('\u{2b06}\u{529b}\u{91cf} '+enemy.name+'\u{529b}\u{91cf}+'+(intent.v||1));}
        else if(intent.ef==='blk'){enemy.block+=intent.v||10;addFX(480,60,'\u{1f6e1}\u{fe0f}+'+(intent.v||10),'#64B5F6');addLog('\u{1f6e1}\u{fe0f} '+enemy.name+'\u{83b7}\u{5f97}'+(intent.v||10)+'\u{683c}\u{63a1}');}
        break;
      case's':
        const sCard=intent.sCard||'wound';const sN=intent.n||1;
        for(let si=0;si<sN;si++){G.draw.push({...S[sCard],id:sCard+'_enemy'+Date.now()+'_'+si});}
        addFX(480,260,'\u{1f4e8}\u{585e}\u{5165}'+sN+'\u{5f20}'+(S[sCard]?S[sCard].name:sCard),'#FF9800');addLog('\u{1f4e8} '+enemy.name+'\u{585e}\u{5165}'+sN+'\u{5f20}'+(S[sCard]?S[sCard].name:sCard));
        break;
      case'h':
        const healV=intent.v||5;enemy.hp=Math.min(enemy.maxHp,enemy.hp+healV);
        addFX(480,60,'\u{1f49a}+'+healV,'#4CAF50');addLog('\u{1f49a} '+enemy.name+'\u{56de}\u{590d}'+healV+'HP');
        break;
    }
    if(enemy.weak>0)enemy.weak--;if(enemy.vulnerable>0)enemy.vulnerable--;
    if(G._diffEnemyStr&&enemy.hp>0){const rate=G.difficulty>=2?2:3;const amt=G.difficulty>=2?2:1;if(G.turn%rate===0){enemy.strength=(enemy.strength||0)+amt;addFX(480,60,'⬆难度强化!','#FF6B6B');addLog('⬆ 难度:敌人力量+'+amt);}}
  });
}

// ===================================================================
//  战斗胜利 & 奖励系统
// ===================================================================
function combatWin(){
  if(G.phase!=='combat')return;
  G.totalKills+=G.enemies.filter(e=>e.hp<=0).length;if(!G._combatStats)G._combatStats={dmgDealt:0,dmgTaken:0,kills:0,turns:0};G._combatStats.turns=G.turn;G._combatStats.kills=G.enemies.filter(e=>e.hp<=0).length;
  const healAmt=Math.floor(10/(1+(G.difficulty||0)*0.35));if(G.selfRepair>0)G.hp=Math.min(G.maxHp,G.hp+G.selfRepair);addFX(480,340,'🔧自我修复+'+(G.selfRepair||0),'#AD8BFF');//困难-26%,噩梦-41%
  G.hp=Math.min(G.maxHp,G.hp+healAmt);addFX(480,300,'+'+healAmt+'❤️','#4CAF50',22);if(G.relics&&G.relics.some(r=>r.id==='vitalSpring')&&healAmt>0){G.energy=Math.min(G.maxEnergy+1,G.energy+1);addFX(480,280,'💧活力泉+1能','#4CAF50');}
  if(G.relics.some(r=>r.id==='blackBlood')){G.hp=Math.min(G.maxHp,G.hp+12);addFX(480,320,'+12❤️','#FF6B6B',16);}
  else if(G.relics.some(r=>r.id==='burningBlood')){G.hp=Math.min(G.maxHp,G.hp+8);addFX(480,320,'+8❤️','#4CAF50',16);}
  // 骨肉: 低血量额外回复
  if(G.relics.some(r=>r.id==='meatBone')&&G.hp<=G.maxHp/2){G.hp=Math.min(G.maxHp,G.hp+12);addFX(480,340,'🍖骨肉+12','#FF9800',14);}
  const isElite=room(G.floor)==='elite',isBoss=room(G.floor)==='boss';
  G.rewardGold=(isElite?30:isBoss?45:18)+G.floor*4+rand(0,10);
  if(G._eventFight){G.rewardGold=Math.floor(G.rewardGold*1.5);G._eventFight=false;} // 事件战斗1.5倍金币
  G.gold+=G.rewardGold;
  if(!G.potion&&(G.relics.some(r=>r.id==='whiteBeast')||Math.random()<0.45)){G.potion={...pick(POTIONS)};addFX(480,220,'🧪药水!','#4CAF50');}
  const pool=getRewardPool();shuffle(pool);
  var cardCount=G.relics&&G.relics.some(r=>r.id==='questionCard')?6:5;G.rewardCards=pool.slice(0,cardCount);
  if(isElite){const a=RELICS.filter(r=>!G.relics.some(h=>h.id===r.id)&&!r.id.includes('boss'));if(a.length)G.rewardRelic=pick(a);}
  G.phase='reward';G._rewardAnim=1;updateUI();saveGame();
}

// -------- 奖励池(按角色过滤) --------
function getRewardPool(){
  const a=act(G.floor);
  return ALL_CARDS.filter(c=>{
    if(c.rarity==='basic'||c.rarity==='status')return false;
    // 万花筒碎片:无视角色限制
    if(G.relics&&G.relics.some(r=>r.id==='prismatic'))return true;
    // 角色专属卡只出现给对应角色
    if(c.id==='neutralize'||c.id==='quickSlash'||c.id==='bladeDance'||c.id==='cloakDagger'||
       c.id==='deadlyPoison'||c.id==='noxiousFumes'||c.id==='catalyst'||c.id==='escapePlan'||c.id==='afterImage'||
       c.id==='acrobatics'||c.id==='dodgeRoll'||c.id==='survivor'||c.id==='calcGamble'||c.id==='backstab'||c.id==='skewer'||c.id==='endlessAgony'||c.id==='prepared'||c.id==='bane'||c.id==='piercingWail'||c.id==='legSweep'||c.id==='poisonedStab'||c.id==='cripplingCloud'||c.id==='flyingKnee'||c.id==='dash'||c.id==='suckerPunch'||c.id==='daggerSpray'||c.id==='daggerThrow'||c.id==='footwork'||c.id==='caltrops'||c.id==='predator'||c.id==='terror'||c.id==='outmaneuver'||c.id==='riddleHoles'||c.id==='blur'||c.id==='slice'||c.id==='danceKnife'||c.id==='toxinBurst'||c.id==='stormSteel'||c.id==='envenom'||
       c.id==='corpseExplosion'||c.id==='eviscerate'||c.id==='infiniteBlades'||c.id==='malaise'||c.id==='wraithForm'||
       c.id==='tactician'||c.id==='expertise'||c.id==='accuracy'||c.id==='bouncingFlask'||c.id==='finisher'||
       c.id==='sneakyStrike'||c.id==='poisonBlade'||c.id==='shadowStep')
      return G.character==='silent';
    if(c.id==='eruption'||c.id==='vigilance'||c.id==='emptyFist'||c.id==='sanctity'||
       c.id==='fearNoEvil'||c.id==='tantrum'||c.id==='consecrate'||c.id==='meditate'||c.id==='cutThroughFate'||c.id==='study'||c.id==='pray'||c.id==='strikeOfFlurry'||c.id==='emptyBody'||c.id==='wheelKick'||c.id==='pray'||c.id==='worship'||c.id==='prostrate'||c.id==='devotion'||c.id==='brilliance'||c.id==='conclude'||c.id==='rushdown'||c.id==='mentalFortress'||c.id==='indignation'||c.id==='evaluate'||c.id==='likeWater'||c.id==='meditateSimple'||c.id==='battleHymn'||c.id==='sigSoul'||
       c.id==='reachHeaven'||c.id==='carveReality'||c.id==='crushJoints'||c.id==='deceiveReality'||
       c.id==='foreignInfluence'||c.id==='foresight'||c.id==='masterReality')
      return G.character==='watcher';
    if(c.id==='zap'||c.id==='dualcast'||c.id==='beamCell'||c.id==='coldSnap'||c.id==='sweepingBeam'||c.id==='rebound'||c.id==='barrage'||c.id==='compileDriver'||c.id==='ballLightning'||c.id==='coolheaded'||c.id==='leap'||c.id==='steamBarrier'||c.id==='recursion'||c.id==='hologram'||c.id==='claw'||c.id==='goForTheEyes'||c.id==='autoShields'||c.id==='recycle'||c.id==='focusShield'||c.id==='superconduct'||c.id==='glacier'||c.id==='capacitor'||c.id==='defragment'||c.id==='tempest'||c.id==='staticDischarge'||c.id==='loop'||c.id==='selfRepair'||c.id==='fusion'||c.id==='streamline'||c.id==='melter'||c.id==='doomAndGloom'||c.id==='chaos'||c.id==='equilibrium'||c.id==='geneticAlgorithm'||c.id==='skim'||c.id==='whiteNoise'||c.id==='heatsinks'||c.id==='storm'||c.id==='consume'||c.id==='bootSequence'||c.id==='orbSurge'||c.id==='overclock'||c.id==='stack'||c.id==='repulse'||c.id==='multiCast'||c.id==='allForOne'||c.id==='hyperbeam'||c.id==='rainbow'||c.id==='electrodynamics'||c.id==='echoForm'||c.id==='machineLearning'||c.id==='buffer'||c.id==='thunderStrike'||c.id==='sunder'||c.id==='amplify'||c.id==='meteorStrike'||c.id==='coreSurge'||c.id==='blizzard'||c.id==='forceField'||c.id==='reboot'||
       c.id==='chill'||c.id==='creativeAI'||c.id==='darkness'||c.id==='fission'||c.id==='helloWorld'||
       c.id==='ripAndTear'||c.id==='turbo'||c.id==='ftl'||c.id==='lockOn'||c.id==='scrape'||
       c.id==='reprogram'||c.id==='redo'||c.id==='biasedCognition')
      return G.character==='defect';

    // 所有稀有度在各幕均可出现,仅概率不同(鼓励自由混搭)
    const rareW=a===1?0.25:a===2?0.5:1;
    const uncomW=a===1?0.75:a===2?1:1;
    if(c.rarity==='rare')return Math.random()<rareW;
    if(c.rarity==='uncommon')return Math.random()<uncomW;
    return true; // common always appears
  });
}

// -------- 选择奖励 --------
function pickReward(idx){if(G.relics&&G.relics.some(r=>r.id==='singingBowl')){G.maxHp+=2;G.hp+=2;addLog('🎵 歌铃碗:最大生命+2');}
  if(G.phase!=='reward')return;
  if(idx>=0&&idx<G.rewardCards.length){
    const c={...G.rewardCards[idx],id:G.rewardCards[idx].id+'_'+Date.now(),u:false};
    G.deck.push(c);G.draw.push(c);
  }
  G._rewardAnim=0;
  const relic=G.rewardRelic;
  G.rewardCards=[];G.rewardGold=0;G.rewardRelic=null;
  if(relic){G.relics.push({...relic});if(relic.onGet)relic.onGet(G);}
  afterCombat();
}

// -------- 战斗后续 / BOSS遗物 --------
function afterCombat(){
  if(room(G.floor)==='boss')bossReward();
  else nextFloor();
}
function bossReward(){
  const a=RELICS.filter(r=>!G.relics.some(h=>h.id===r.id));
  if(a.length){shuffle(a);G.shopItems=a.slice(0,2).map(r=>({...r,isRelic:true}));G.phase='bossRelic';}
  else nextFloor();
}

// -------- 选择BOSS遗物 --------
function pickRelic(idx){
  if(G.phase!=='bossRelic')return;
  if(idx>=0&&idx<G.shopItems.length){
    const r=G.shopItems[idx];G.relics.push({...r});
    if(r.onGet)r.onGet(G);
    addFX(480,300,'⚜️ '+r.name,'#FFD700');
  }
  G.shopItems=[];nextFloor();
}

// ===================================================================
//  游戏流程 — 下一层 / 路径选择 / 通关判定
//  每步从3条路线中选1, 决定本层房间类型
//  第一层自动战斗, BOSS层自动BOSS
// ===================================================================
function nextFloor(){
  G.floor++;
  G._actStep = (G.floor - 1) % 15;
  const curAct = act(G.floor);
  // 通关判定
  if(G.floor > 45){
    document.querySelector('.over h2').textContent='🏆 通关！';
    document.querySelector('.over h2').style.color='#FFD700';
    finalFloor.textContent=45;finalKills.textContent=G.totalKills;
    saveRecord();
    overScreen.classList.add('show');G.phase='gameover';
    localStorage.removeItem('spireSave');
    return;
  }
  // BOSS层(每幕第15步): 直接进BOSS, 无选择
  if(G._actStep === 14){
    G._routeChoice = 0;
    enterRoom();
    return;
  }
  // 其他层: 展示3条路线选择
  showPathChoice();
}

function showPathChoice(){
  const a = act(G.floor);
  const step = G._actStep;
  G._pathOptions = [
    {type: ROUTES[a-1][0][step], route: 0, label: 'A·激进', desc: '更多精英与挑战'},
    {type: ROUTES[a-1][1][step], route: 1, label: 'B·平衡', desc: '稳扎稳打'},
    {type: ROUTES[a-1][2][step], route: 2, label: 'C·安逸', desc: '更多回复与商店'},
  ];
  G.phase = 'pathChoice';
  G._roomAnnounce = 0;
  updateUI();
}

function pickPath(idx){
  if(G.phase !== 'pathChoice' || !G._pathOptions[idx]) return;
  G._routeChoice = G._pathOptions[idx].route;
  G._pathOptions = [];
  G.phase = '';
  enterRoom();
}

function enterRoom(){
  G._lastRoom = room(G.floor);
  G._roomAnnounce = 80;
  const r = room(G.floor);
  if(r !== 'monster' && r !== 'elite' && r !== 'boss'){
    addFX(480,350,(RM[r]||'')+' '+(RN[r]||''),'#FFD700',28);
    addLog('进入'+(RN[r]||r));
  }
  if(r==='shop') showShop();
  else if(r==='rest') showRest();
  else if(r==='treasure') showTreasure();
  else if(r==='event') showEvent();
  else startCombat();
  updateUI(); saveGame();
}

// ===================================================================
//  游戏流程 — 随机事件
// ===================================================================
function showEvent(){
  G.phase='event';
  G._eventData={...pick(EVENTS)};
  updateUI();
}

function eventChoose(optIdx){
  if(G.phase!=='event'||!G._eventData)return;
  const opt=G._eventData.opts[optIdx];
  if(!opt)return;
  // Special case: elite fight events
  const _fightEvents=['arena','dormantGuard','torturer'];
  const _isFight=(G._eventData.id==='arena'&&optIdx===0)||(G._eventData.id==='dormantGuard'&&optIdx===1);
  if(_isFight){
    G._eventFight=true;
    G._eventData=null;
    // Start an elite fight
    const pool=getPool(G.floor,true,false);
    if(pool.length){
      G.phase='';
      // 完整重置战斗状态(同startCombat)
      ['energy','block','weak','vulnerable','thorns','dt','metall','dForm','fnp',
       'barricade','orichalcum','anchorBonus','cardsPlayed','turn','de','evolve','corruption',
       'rage','berserk','bVuln','brutality','juggernaut','flexLoss','rupture','fireBreathing','study','caltrops','mantra','devotion','mentalFortress','_enteredWrath','likeWater','panache','apotheosis','battleHymn','reprisal','fasting','_blurNextTurn','_sundialCount','envenom','phantasmalKiller','_phantasmalActive','combust','_diffEnemyStr','_vaultTurn','_enlightened','sadisticNature','_bombCounter','_bombDamage',
       'noxiousFumes','afterImage','sCount','kCount','nunCount',
       '_lastXCost','_lastTurnNoAttack','_attacksThisTurn','_redSkullActive',
       'regenPotion','dexterity','penNibCount','_hpLostCombat','_corpseExplode',
       'tactician','_nextTurnEnergyPenalty','_bellCount','_stoveCount','_inkCount',
       '_centennialReady','stance','_divCountdown'].forEach(k=>{
        if(k==='energy')G.energy=G.maxEnergy;else if(k==='block')G.block=0;else G[k]=0;
      });
      G.hand=[];G.draw=[];G.discard=[];G.exhaust=[];G.enemies=[];G._log=[];
      G.endingTurn=false;G.firstTurn=true;
      G.enemies=[mkEnemy(pick(pool),G.floor)];
      G.draw=shuffle(G.deck.map(c=>({...c,u:(G.apotheosis?true:(c.u||false))})));
      G.enemies.forEach(e=>setI(e));
      G.phase='combat';
      startTurn();updateUI();
      G._eventFight=true;
      return;
    }
  }
  opt.f(G);
  addFX(480,300,opt.good,'#FFD700');
  G._eventData=null;
  G.phase='';
  nextFloor();
}

// ===================================================================
//  游戏流程 — 商店 (showShop / buy / removeCard / leaveShop)
// ===================================================================
function showShop(){
  G.phase='shop';
  // 角色卡ID集合(用于快速过滤)
  const SILENT_IDS=new Set(['neutralize','quickSlash','bladeDance','cloakDagger','deadlyPoison',
    'noxiousFumes','catalyst','escapePlan','afterImage','acrobatics','dodgeRoll','survivor',
    'calcGamble','backstab','skewer','endlessAgony','prepared','bane','piercingWail','legSweep',
    'poisonedStab','cripplingCloud','flyingKnee','dash','suckerPunch','daggerSpray','daggerThrow',
    'footwork','caltrops','predator','terror','outmaneuver','riddleHoles','blur','slice',
    'danceKnife','toxinBurst','stormSteel','envenom','phantasmalKiller',
    'corpseExplosion','eviscerate','infiniteBlades','malaise','wraithForm','tactician','expertise',
    'accuracy','bouncingFlask','finisher','sneakyStrike','poisonBlade','shadowStep']);
  const WATCHER_IDS=new Set(['eruption','vigilance','emptyFist','sanctity','fearNoEvil','tantrum',
    'consecrate','meditate','cutThroughFate','study','pray','strikeOfFlurry','emptyBody',
    'wheelKick','worship','prostrate','devotion','brilliance','conclude','rushdown',
    'mentalFortress','indignation','evaluate','likeWater','meditateSimple','battleHymn','sigSoul',
    'innerPeace','crescendo','halt','flyingSleeves','clearMind','justLucky','furyFist','windGuard',
    'reachHeaven','carveReality','crushJoints','deceiveReality','foreignInfluence','foresight','masterReality']);
  const DEFECT_IDS=new Set(['zap','dualcast','beamCell','coldSnap','sweepingBeam','rebound',
    'barrage','compileDriver','ballLightning','coolheaded','leap','steamBarrier','recursion',
    'hologram','claw','goForTheEyes','autoShields','recycle','focusShield','superconduct',
    'glacier','capacitor','defragment','tempest','staticDischarge','loop','selfRepair','fusion',
    'streamline','melter','doomAndGloom','chaos','equilibrium','geneticAlgorithm','skim',
    'whiteNoise','heatsinks','storm','consume','bootSequence','orbSurge','overclock',
    'stack','repulse','multiCast','allForOne','hyperbeam','rainbow','electrodynamics','echoForm',
    'machineLearning','buffer','thunderStrike','sunder','amplify','meteorStrike','coreSurge',
    'blizzard','forceField','reboot',
    'chill','creativeAI','darkness','fission','helloWorld','ripAndTear','turbo',
    'ftl','lockOn','scrape','reprogram','redo','biasedCognition']);

  const pool=ALL_CARDS.filter(c=>{
    if(c.rarity==='basic'||c.rarity==='status')return false;
    if(G.relics&&G.relics.some(r=>r.id==='prismatic'))return true;
    if(SILENT_IDS.has(c.id))return G.character==='silent';
    if(WATCHER_IDS.has(c.id))return G.character==='watcher';
    if(DEFECT_IDS.has(c.id))return G.character==='defect';
    return true;
  });
  shuffle(pool);
  G.shopItems=[];
  const rarityPrice={common:20,uncommon:35,rare:55};
  const memCard=G.relics&&G.relics.some(r=>r.id==='membershipCard');
  for(let i=0;i<5;i++){
    const c=pool[i%pool.length];
    const price=Math.floor(((rarityPrice[c.rarity]||30)*0.8)+G.floor+rand(0,4)*(memCard?0.5:1));
    G.shopItems.push({...c,price});
  }
  G.shopItems.push({id:'potion',name:'生命药水',desc:'20血',price:15+G.floor*2+rand(0,5),isPotion:true});
  const relicPool=RELICS.filter(x=>!G.relics.some(h=>h.id===x.id)&&!x.id.includes('burningBlood')&&!x.id.includes('ringSnake')&&!x.id.includes('pureWater')&&!x.id.includes('runicPyramid')&&!x.id.includes('tingsha')&&!x.id.includes('wristBlade')&&!x.id.includes('singingBowl')&&!x.id.includes('specimen'));
  if(relicPool.length){const r=pick(relicPool);G.shopItems.push({...r,isRelic:true,price:45+G.floor*4+rand(0,8)});}
  G.shopItems.push({id:'remove',name:'移除卡牌',price:50,isRemove:true});
  updateUI();
}
// -------- 购买 / 移除 / 离开 --------
function buy(idx){
  if(G.phase!=='shop')return;
  const item=G.shopItems[idx];if(!item||G.gold<item.price)return;
  if(item.isPotion){G.gold-=item.price;G.hp=Math.min(G.maxHp,G.hp+20);G.shopItems.splice(idx,1);}
  else if(item.isRemove){G.gold-=item.price;G.phase='removeCard';G.shopItems=[];}
  else if(item.isRelic){G.gold-=item.price;G.relics.push({...item});if(item.onGet)item.onGet(G);G.shopItems.splice(idx,1);}
  else{G.gold-=item.price;const c={...item,id:item.id+'_'+Date.now(),u:false};G.deck.push(c);G.draw.push(c);G.shopItems.splice(idx,1);}
  updateUI();
}
function removeCard(idx){
  if(G.deck.length<=5)return;
  G.deck.splice(idx,1);
  G.phase='shop';showShop();
}
function leaveShop(){
  if(G.phase==='shop'){G.shopItems=[];nextFloor();}
  else if(G.phase==='removeCard'){G.phase='shop';showShop();}
}

// ===================================================================
//  游戏流程 — 篝火 (休息 / 升级)
// ===================================================================
function showRest(){G.phase='rest';updateUI();}
function restHeal(){
  if(G.phase!=='rest')return;
  const healPct=G.difficulty>=2?0.25:G.difficulty>=1?0.3:0.35;
  G.hp=Math.min(G.maxHp,G.hp+Math.floor(G.maxHp*healPct));
  addFX(480,300,'❤️休息+'+(G.maxHp*healPct|0),'#FF6B6B');
  G.phase='';nextFloor();
}
function restUpgrade(){if(G.phase==='rest')G.phase='upgradeCard';updateUI();}
function pickUpgrade(idx){
  if(G.phase!=='upgradeCard')return;
  const card=G.deck[idx];if(!card||card.u)return;
  const _d=def(card);
  // 灼伤: 每次升级伤害翻倍(可多次升级)
  if(_d&&_d.id==='searingBlow'){card._searingLevel=(card._searingLevel||0)+1;}
  else card.u=true;
  // 升级费用降低(如爆发2→1)
  if(_d&&_d.uc!==undefined)card.c=_d.uc;
  // 固有:模板自带的in:true 或 升级固有时iu:true
  if(_d&&_d.in)card.in=true;
  if(_d&&_d.iu)card.in=true;
  addFX(480,300,'⬆️'+card.name+'!','#FFD700');
  G.phase='';nextFloor();
}

// ===================================================================
//  游戏流程 — 宝箱
// ===================================================================
function showTreasure(){
  G.phase='treasure';
  const a=RELICS.filter(r=>!G.relics.some(h=>h.id===r.id)&&!r.id.includes('burningBlood'));
  if(a.length){shuffle(a);G.shopItems=a.slice(0,3).map(r=>({...r,isRelic:true}));}else G.shopItems=[];
  G.gold+=25+G.floor*3+rand(0,10);
  updateUI();
}
function pickTreasure(idx){
  if(G.phase!=='treasure')return;
  if(idx>=0&&idx<G.shopItems.length){
    const r=G.shopItems[idx];G.relics.push({...r});if(r.onGet)r.onGet(G);
    addFX(480,300,'⚜️'+r.name,'#FFD700');
  }
  G.shopItems=[];nextFloor();
}

// ===================================================================
//  药水使用
// ===================================================================
function usePotion(){
  if(!G.potion||G.phase!=='combat')return;
  G.potion.f(G);
  addFX(480,280,'🧪'+G.potion.name,'#4CAF50');
  G.potion=null;updateUI();
}

// ===================================================================
//  图鉴 & 游戏结束
// ===================================================================
function toggleCodex(){G.codexOpen=!G.codexOpen;}
function gameOver(){
  G.phase='gameover';
  finalFloor.textContent=G.floor;finalKills.textContent=G.totalKills;
  // 统计
  const statsEl=document.querySelector('.over .stat');
  const deckStr=['攻击','技能','能力','状态'].map(t=>{const n=G.deck.filter(c=>{const d=def(c);return d&&d.type===t;}).length;return t+':'+n;}).join(' · ');
  statsEl.innerHTML='到达 <span id="finalFloor">'+G.floor+'</span>F · 击败 <span id="finalKills">'+G.totalKills+'</span> 个敌人<br><span style="font-size:11px;color:rgba(255,255,255,0.3)">'+deckStr+'</span>';
  document.querySelector('.over h2').textContent='💀 陨落';
  document.querySelector('.over h2').style.color='#FF6B6B';
  overScreen.classList.add('show');
  localStorage.removeItem('spireSave');
  saveRecord();
}

// ===================================================================
//  UI 更新 (顶部 HUD / 房间名)
// ===================================================================
function updateUI(){
  hpEl.textContent=G.hp;mhEl.textContent=G.maxHp;
  epEl.textContent=G.energy;gpEl.textContent=G.gold;
  flEl.textContent=room(G.floor)==='boss'?'BOSS':G.floor;
  dkEl.textContent=G.draw.length;dsEl.textContent=G.discard.length;
  const r=room(G.floor);
  const charNames={ironclad:'🔥铁甲',silent:'🗡️静默',watcher:'✨观者'};
  const cn=charNames[G.character]||'🔥铁甲';
  const stanceText=G.stance&&G.stance!=='neutral'?{wrath:'<怒火>',calm:'<宁静>',divinity:'<神格>'}[G.stance]||'':'';
  const diffNames=['','⚠️困难','💀噩梦'];
  const diffTag=G.difficulty>0?diffNames[G.difficulty]||'':'';
  roomEl.textContent=diffTag+cn+' '+(RM[r]||'')+' '+(RN[r]||'')+stanceText+(G.phase==='combat'?' 🧪'+(G.potion?G.potion.name:'无'):'');
}

// ===================================================================
//  渲染系统 — 战斗日志 (可滚动)
// ===================================================================
function drawCombatLog(){
  if(!G.logOpen||!G._log)return;
  const logX=625,logW=325,startY=200,lineH=14;
  const h=Math.min(16*lineH+26,G._log.length*lineH+26);
  ctx.shadowColor='rgba(0,0,0,0.5)';ctx.shadowBlur=15;
  ctx.fillStyle='rgba(8,8,28,0.85)';ctx.beginPath();ctx.roundRect(logX,startY-10,logW,h,10);ctx.fill();ctx.shadowBlur=0;
  ctx.strokeStyle='rgba(255,215,0,0.08)';ctx.lineWidth=1;ctx.beginPath();ctx.roundRect(logX,startY-10,logW,h,10);ctx.stroke();
  // 标题栏
  ctx.fillStyle='rgba(255,215,0,0.4)';ctx.font='bold 10px Arial';ctx.textAlign='left';ctx.textBaseline='top';ctx.fillText('📋 战斗记录',logX+8,startY-6);
  ctx.fillStyle='rgba(255,255,255,0.45)';ctx.font='8px Arial';ctx.fillText('[回合'+G.turn+'·'+G._log.length+'条]',logX+98,startY-5);
  // 可滚动:让G._logScroll控制偏移
  if(!G._logScroll)G._logScroll=0;
  const maxShow=16;
  const total=G._log.length;
  const startIdx=Math.max(0,Math.min(G._logScroll,total-maxShow));
  const colorMap=[
    {p:['💔'],c:'#FF6666'},{p:['💥','⚔️'],c:'#FF6B6B'},{p:['🛡️','🧱','💧如水'],c:'#64B5F6'},
    {p:['☠️','💉','🧪'],c:'#CE93D8'},{p:['💧'],c:'#64B5F6'},{p:['💫'],c:'#FFB74D'},
    {p:['⬆️','💪'],c:'#FFB74D'},{p:['⚡','🔥','💢'],c:'#FF5252'},{p:['🌀','🔔','👻','💀精'],c:'#E040FB'},
    {p:['💀'],c:'#CE93D8'},{p:['⌛','📖','🖋️','☀️','⏳'],c:'#FFD700'},{p:['💚','❤️','+'],c:'#69F0AE'},
  ];
  G._log.slice(startIdx,startIdx+maxShow).forEach((entry,i)=>{
    let col='rgba(255,255,255,0.5)';
    for(const m of colorMap){if(m.p.some(p=>entry.startsWith(p))){col=m.c;break;}}
    ctx.fillStyle=col;ctx.font='8px Arial';ctx.textAlign='left';ctx.textBaseline='top';
    ctx.fillText(entry,logX+6,startY+8+i*lineH);
  });
  // 滚动指示器
  if(startIdx>0){ctx.fillStyle='rgba(255,215,0,0.2)';ctx.font='9px Arial';ctx.textAlign='center';ctx.fillText('▲ 上翻',logX+logW/2,startY+4);}
  if(startIdx+maxShow<total){ctx.fillStyle='rgba(255,215,0,0.2)';ctx.font='9px Arial';ctx.textAlign='center';ctx.fillText('▼ 下翻',logX+logW/2,startY+h-10);}
}

// ===================================================================
//  渲染系统 — 背景 (渐变·星空·BOSS血量条)
// ===================================================================
function drawBg(){
  // 渐变背景
  const g=ctx.createRadialGradient(W/2,H/2,100,W/2,H/2,500);
  g.addColorStop(0,'#1a1a3e');g.addColorStop(0.4,'#0f0f2a');g.addColorStop(1,'#080818');
  ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  // 动态星空(带闪烁)
  const t=Date.now()/1000;
  for(let i=0;i<45;i++){
    const sx=(i*131.7+t*15*(i%3+1))%W,sy=(i*89.3+t*8*(i%5+1))%(H*0.6);
    const twinkle=0.5+0.5*Math.sin(t*2+i);
    const sz=(0.5+(i%4)*0.6)*twinkle;
    ctx.globalAlpha=0.03*sz*2;
    ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(sx,sy,sz,0,Math.PI*2);ctx.fill();
  }
  ctx.globalAlpha=1;
  // 暗角效果
  const vg=ctx.createRadialGradient(W/2,H/2,200,W/2,H/2,500);
  vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(0,0,0,0.4)');
  ctx.fillStyle=vg;ctx.fillRect(0,0,W,H);
  // BOSS/精英不使用独立顶部血条, 直接看敌人身上HP
}


function getEnemyMechanics(e){
  var m=[];
  var id=e.tpl&&e.tpl.id;
  if(e.strength>0)m.push("⬆️ 力量+"+e.strength+" (伤害+"+e.strength+")");
  if(e.tpl&&e.tpl.boss)m.push("👑 BOSS单位 - 高生命·高伤害");
  if(e.tpl&&e.tpl.elite)m.push("💀 精英单位 - 开场+12格挡");
  if(id==="exploder")m.push("💥 死亡自爆 - 造成8点伤害");
  if(id==="spirit"||id==="naga")m.push("💫 特殊攻击 - 附带Debuff效果");
  if(id==="feedbackMage")m.push("📖 反馈 - 根据手牌数追加伤害");
  if(id==="energyThief")m.push("⚡ 抽能 - 攻击时减少你1能量");
  if(id==="woundImp")m.push("📨 塞牌 - 向你的抽牌堆塞伤口");
  if(id==="nightmareWisp")m.push("🔥 塞牌 - 向你的抽牌堆塞灼烧");
  if(id==="healerMonk")m.push("💚 治疗 - 每回合回复生命");
  if(id==="gNob")m.push("💢 激怒 - 你使用非攻击牌时+1力量");
  if(id==="snakePlant"||id==="spikeSlime")m.push("🌵 护甲 - 减少受到的伤害");
  if(id==="berserkerOrc")m.push("⚡ 连击 - 一回合多次攻击");
  if(m.length===0)m.push("无特殊机制");
  return m;
}
// ===================================================================
//  渲染系统 — 敌人 (HP条·状态·意图·悬浮详情)
// ===================================================================
function drawEnemies(){
  if(!G.enemies)return;
  const alive=G.enemies.filter(e=>e.hp>0);
  if(!alive.length&&G.phase!=='reward'&&G.phase!=='gameover')return;
  const cnt=G.enemies.length,sp=cnt===1?0:160,bx=cnt===1?480:400;
  G.enemies.forEach((e,i)=>{
    if(e.hp<=0)return;
    const cx=(e.x=bx+i*sp),cy=125,r=54;
    const pulse=0.02*Math.sin(Date.now()/500+i);
    ctx.shadowColor='rgba(200,40,40,0.3)';ctx.shadowBlur=25;
    const eColor=e.hp/e.maxHp>0.5?'#8B1A1A':e.hp/e.maxHp>0.25?'#A04000':'#6B1A00';
    ctx.fillStyle=eColor;
    ctx.beginPath();ctx.arc(cx,cy,r+pulse*10,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
    // 敌人外发光圈
    const pulse2=0.3+0.15*Math.sin(Date.now()/400+i);
    ctx.strokeStyle='rgba(200,50,50,'+pulse2+')';ctx.lineWidth=2;ctx.beginPath();ctx.arc(cx,cy,r+2,0,Math.PI*2);ctx.stroke();
    ctx.strokeStyle='rgba(255,255,255,0.35)';ctx.lineWidth=1;ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.stroke();
    ctx.fillStyle='#FFD700';ctx.font='bold 17px Arial';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText(e.name,cx,cy);
    const bw=170,bh=14,by=cy+r+10;
    // HP条背景
    ctx.fillStyle='rgba(0,0,0,0.5)';ctx.beginPath();ctx.roundRect(cx-bw/2,by,bw,bh,4);ctx.fill();
    ctx.strokeStyle='rgba(0,0,0,0.3)';ctx.lineWidth=1;ctx.beginPath();ctx.roundRect(cx-bw/2,by,bw,bh,4);ctx.stroke();
    // HP条前景(带渐变)
    const hr=Math.max(0,e.hp/e.maxHp);
    const hpColor=hr>0.6?'#4CAF50':hr>0.3?'#FF9800':'#F44336';
    if(hr>0){
      const grad=ctx.createLinearGradient(cx-bw/2,by,cx-bw/2,by+bh);
      grad.addColorStop(0,hpColor);grad.addColorStop(1,hpColor+'88');
      ctx.fillStyle=grad;ctx.beginPath();ctx.roundRect(cx-bw/2,by,bw*hr,bh,4);ctx.fill();
    }
    // HP文字(更清晰)
    ctx.shadowColor='rgba(0,0,0,0.8)';ctx.shadowBlur=4;
    ctx.fillStyle='#fff';ctx.font='bold 10px Arial';ctx.fillText(Math.max(0,e.hp)+'/'+e.maxHp,cx,by+bh/2+1);
    ctx.shadowBlur=0;
    // 受伤闪烁效果
    if(enemyFlash>0){ctx.fillStyle='rgba(255,0,0,'+(enemyFlash/8)+')';ctx.beginPath();ctx.arc(cx,cy,54,0,Math.PI*2);ctx.fill();}
    if(e.block>0){ctx.fillStyle='#64B5F6';ctx.font='bold 12px Arial';ctx.textBaseline='middle';ctx.fillText('🛡️'+e.block,cx,by+bh+14);}
    // 敌人状态徽章(放在敌人右侧,垂直排列避免重叠)
    const badges=[];
    if(e.vulnerable>0)badges.push({i:'💫',n:e.vulnerable,c:'#FF9800',t:'vulnerable'});
    if(e.weak>0)badges.push({i:'💧',n:e.weak,c:'#64B5F6',t:'weak'});
    if(e.strength>0)badges.push({i:'⬆️',n:e.strength,c:'#FF6B6B',t:'strength'});
    if(e.poison>0)badges.push({i:'☠️',n:e.poison,c:'#9C27B0',t:'poison'});
    if(badges.length){
      const bGap=2,bH=16,startX=cx+r+8;
      badges.forEach((b,idx)=>{
        const bw=12+(b.n>=10?14:8);
        const bY=cy-r+10+idx*(bH+bGap);
        ctx.fillStyle=b.c+'66';ctx.beginPath();ctx.roundRect(startX,bY-bH/2,bw,bH,4);ctx.fill();
        ctx.fillStyle=b.c;ctx.font='10px Arial';ctx.textAlign='left';ctx.textBaseline='middle';
        ctx.fillText(b.i,startX+2,bY+1);ctx.font='bold 9px Arial';ctx.fillText(b.n,startX+14,bY+1);
        // 状态悬浮提示
        if(G.mx>=startX&&G.mx<=startX+bw&&G.my>=bY-bH/2&&G.my<=bY+bH/2){
          const tips={vulnerable:'受到攻击+50%伤害',weak:'造成的攻击-25%伤害',strength:'增加攻击伤害',poison:'回合末受伤害'};
          ctx.fillStyle='rgba(0,0,0,0.85)';ctx.beginPath();ctx.roundRect(G.mx+10,G.my-20,150,22,5);ctx.fill();
          ctx.fillStyle='#fff';ctx.font='10px Arial';ctx.textAlign='left';ctx.textBaseline='middle';ctx.fillText(tips[b.t]||'',G.mx+16,G.my-9);
        }
      });
    }
    const intent=G.relics&&G.relics.some(r=>r.id==='runicDome')?null:e.ci;
    if(intent&&G.phase==='combat'){
      const iy=cy-r-20;
      let icon='⚔️',color='#FF6B6B';
      if(intent.t==='d'){icon='🛡️';color='#64B5F6';}else if(intent.t==='db'){icon='💫';color='#FF9800';}else if(intent.t==='b'){icon='⬆️';color='#4CAF50';}
      ctx.fillStyle='rgba(0,0,0,0.7)';ctx.beginPath();ctx.roundRect(cx-28,iy,56,24,12);ctx.fill();
      ctx.fillStyle=color;ctx.font='12px Arial';ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.fillText(icon,cx,iy+2);
      // 敌人悬浮详细面板(含全部机制)
      if(G.mx>=cx-r-10&&G.mx<=cx+r+10&&G.my>=cy-r-30&&G.my<=cy+r+10){
        ctx.shadowColor="rgba(0,0,0,0.5)";ctx.shadowBlur=12;
        ctx.fillStyle="rgba(8,8,28,0.95)";ctx.beginPath();ctx.roundRect(12,160,320,180,8);ctx.fill();ctx.shadowBlur=0;
        ctx.strokeStyle="rgba(200,50,50,0.3)";ctx.lineWidth=1;ctx.beginPath();ctx.roundRect(12,160,320,180,8);ctx.stroke();
        ctx.fillStyle="#FFD700";ctx.font="bold 16px Arial";ctx.textAlign="left";ctx.textBaseline="top";ctx.fillText("👾 "+e.name,24,170);
        var hpPct=Math.floor(e.hp/e.maxHp*100);
        ctx.fillStyle=hpPct>60?"#4CAF50":hpPct>30?"#FF9800":"#F44336";ctx.font="12px Arial";ctx.fillText("❤️ "+e.hp+"/"+e.maxHp+" ("+hpPct+"%)",24,194);
        ctx.fillStyle="rgba(255,255,255,0.5)";ctx.font="9px Arial";ctx.fillText("幕"+act(G.floor)+" · "+(e.tpl&&e.tpl.boss?"BOSS":e.tpl&&e.tpl.elite?"精英":"普通"),150,194);
        ctx.fillStyle="rgba(255,255,255,0.7)";ctx.font="10px Arial";ctx.fillText("⚡ 当前意图:",24,216);
        var iMap={a:'⚔️ 攻击 '+intent.sD+'伤',d:'🛡️ 防御 '+(intent.sB||intent.b||0)+'甲',db:'💫 弱化 '+(intent.ef||'')+' '+(intent.v||1)+'层',b:'⬆️ 强化 '+(intent.ef||'')+' +'+(intent.v||1),m:'⚡ 连击 '+(intent.n||2)+'次×'+intent.sD+'伤',s:'📨 塞牌 ('+(intent.sCard||'wound')+')',h:'💚 治疗 +'+(intent.v||5)+'HP'};
        var iName=iMap[intent.t]||"❓ 未知";
        ctx.fillStyle="#eee";ctx.font="10px Arial";ctx.fillText(iName,24,234);
        // 敌人专属机制列表
        ctx.fillStyle="rgba(255,215,0,0.6)";ctx.font="bold 9px Arial";ctx.fillText("▸ 特性",24,256);
        ctx.fillStyle="rgba(255,255,255,0.55)";ctx.font="8px Arial";
        var mech=getEnemyMechanics(e);
        mech.forEach(function(m,i){ctx.fillText(m,36,272+i*14);});
        ctx.fillStyle="rgba(255,255,255,0.2)";ctx.font="7px Arial";ctx.fillText("行动顺序: 每回合随机选择一个意图执行",24,312);
      }
      ctx.fillText(icon+' '+(intent.sD||intent.sB||intent.v||''),cx,iy+12);
      ctx.fillStyle='rgba(255,255,255,0.3)';ctx.font='9px Arial';ctx.fillText(intent.desc||'',cx,iy-9);
    }
    if(e.tpl.boss){ctx.fillStyle='#FFD700';ctx.font='20px Arial';ctx.textBaseline='bottom';ctx.fillText('👑',cx,cy-r-45);}
    if(e.tpl.elite){ctx.fillStyle='#E040FB';ctx.font='16px Arial';ctx.textBaseline='bottom';ctx.fillText('💀',cx-30,cy-r-45);}
  });
}

// ===================================================================
//  渲染系统 — 玩家 (HP·格挡·状态徽章·球体·能量)
// ===================================================================
function drawPlayer(){
  if(G.phase==='gameover'||G.phase==='title')return;
  const y=390;
  // 毛玻璃面板(更精致)
  ctx.shadowColor='rgba(0,0,0,0.4)';ctx.shadowBlur=20;
  ctx.fillStyle='rgba(16,16,45,0.78)';ctx.beginPath();ctx.roundRect(10,y-16,W-20,72,14);ctx.fill();
  ctx.shadowBlur=0;
  ctx.strokeStyle='rgba(255,255,255,0.05)';ctx.lineWidth=1;ctx.beginPath();ctx.roundRect(10,y-16,W-20,72,14);ctx.stroke();
  // HP条(带光泽)
  const hpX=25,hpY=y,hpW=240,hpH=14;
  const pulseHp='rgba(255,255,255,'+(0.06+0.03*Math.sin(Date.now()/600))+')';
  ctx.fillStyle='rgba(0,0,0,0.6)';ctx.beginPath();ctx.roundRect(hpX,hpY,hpW,hpH,8);ctx.fill();
  const hr=Math.max(0,G.hp/G.maxHp);
  if(hr>0){
    const hpGrad=ctx.createLinearGradient(hpX,hpY,hpX,hpY+hpH);
    const hpCol=hr>0.6?'#66BB6A':hr>0.3?'#FFA726':'#EF5350';
    hpGrad.addColorStop(0,hpCol);hpGrad.addColorStop(0.5,hpCol+'cc');hpGrad.addColorStop(1,hpCol+'88');
    ctx.fillStyle=hpGrad;ctx.beginPath();ctx.roundRect(hpX,hpY,Math.max(7,hpW*hr),hpH,7);ctx.fill();
    // 高光
    ctx.fillStyle='rgba(255,255,255,0.45)';ctx.beginPath();ctx.roundRect(hpX+2,hpY+2,Math.max(3,hpW*hr-4),3,2);ctx.fill();
  }
  ctx.fillStyle='#fff';ctx.font='bold 12px Arial';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillText('❤️ '+G.hp+'/'+G.maxHp,hpX+hpW/2,hpY+hpH/2+1);
  // 格挡水晶
  if(G.block>0){
    const blockPulse=0.5+0.3*Math.sin(Date.now()/400);
    ctx.shadowColor='rgba(100,181,246,'+blockPulse*0.8+')';ctx.shadowBlur=22;
    ctx.fillStyle='rgba(100,181,246,0.15)';ctx.beginPath();ctx.roundRect(hpX+hpW+8,hpY-2,48,hpH+4,8);ctx.fill();
    ctx.strokeStyle='rgba(100,181,246,'+(0.4+0.2*blockPulse)+')';ctx.lineWidth=1.5;ctx.beginPath();ctx.roundRect(hpX+hpW+8,hpY-2,52,hpH+6,8);ctx.stroke();
    ctx.shadowBlur=0;
    ctx.fillStyle='#64B5F6';ctx.font='bold 14px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('🛡️'+G.block,hpX+hpW+32,hpY+hpH/2+1);
  }
  // 玩家状态徽章
  const pst=[];
  if(G.weak>0)pst.push({i:'💧',n:G.weak,t:'虚弱',c:'#64B5F6'});
  if(G.vulnerable>0)pst.push({i:'💫',n:G.vulnerable,t:'易伤',c:'#FF9800'});
  if(G.strength>0)pst.push({i:'⬆️',n:G.strength,t:'力',c:'#FF6B6B'});
  if(G.strUp>0)pst.push({i:'🔥',n:G.strUp,t:'战',c:'#FF6B6B'});
  if(G.metall>0)pst.push({i:'⚙️',n:G.metall,t:'铁',c:'#64B5F6'});
  if(G.dForm>0)pst.push({i:'👹',n:G.dForm,t:'魔',c:'#9C27B0'});
  if(G.de)pst.push({i:'🌑',n:'',t:'拥',c:'#E040FB'});
  if(G.corruption)pst.push({i:'💀',n:'',t:'腐',c:'#9C27B0'});
  if(G.afterImage>0)pst.push({i:'👻',n:G.afterImage,t:'影',c:'#64B5F6'});
  if(G.mantra>0)pst.push({i:'🕯️',n:G.mantra,t:'念力',c:'#FFD700'});
  if(G.artifact>0)pst.push({i:'✨',n:G.artifact,t:'制品',c:'#FFD700'});
  if(G.stance==='wrath')pst.push({i:'🔥',n:'',t:'怒火',c:'#FF6B6B'});
  else if(G.stance==='calm')pst.push({i:'💧',n:'',t:'宁静',c:'#64B5F6'});
  else if(G.stance==='divinity')pst.push({i:'✨',n:'',t:'神格',c:'#FFD700'});
  if(pst.length){
    const bGap=3,bH=18;let bX=hpX,bY=hpY+18;
    pst.forEach((b,idx)=>{
      const bw=6+(b.t?b.t.length*8:0)+(b.n?8:0);
      if(bX+bw+10>480){bX=hpX;bY+=bH+3;}
      ctx.fillStyle=b.c+'44';ctx.beginPath();ctx.roundRect(bX,bY,bw,bH,5);ctx.fill();
      ctx.fillStyle=b.c;ctx.font='11px Arial';ctx.textAlign='left';ctx.textBaseline='middle';
      ctx.fillText(b.i,bX+2,bY+bH/2+1);
      if(b.n>0){ctx.font='bold 9px Arial';ctx.fillText(b.n,bX+14,bY+bH/2+1);}
      // 状态悬浮提示
      if(G.mx>=bX&&G.mx<=bX+bw&&G.my>=bY&&G.my<=bY+bH){
        const tips={'虚弱':'造成的攻击伤害-25%','易伤':'受到的攻击伤害+50%','力':'每点力量+1伤害','铁':'每回合+格挡','魔':'每回合+力量','拥':'消耗牌时抽牌','腐':'技能0费并消耗','影':'每打1牌得格挡','念力':'累计6点进入神格','制品':'免疫下一次Debuff','怒火':'伤害×2受伤×1.5','宁静':'每回+1能退出+3能','神格':'伤害×3','战':'武装累计(跨战斗)','集中':'每2点+1球体效果(eff),闪电+eff/+eff×2','球位':'最多同时持有球的上限,满时新球会激发最左侧球'};
        ctx.fillStyle='rgba(0,0,0,0.85)';ctx.beginPath();ctx.roundRect(Math.min(G.mx+10,W-160),G.my-20,150,22,5);ctx.fill();
        ctx.fillStyle='#fff';ctx.font='10px Arial';ctx.textAlign='left';ctx.textBaseline='middle';ctx.fillText(tips[b.t]||b.t,Math.min(G.mx+16,W-150),G.my-9);
      }
      bX+=bw+bGap;
    });
  }
  
  	  // 机兵球体显示
	  if(G.orbs){
	    const orbColors={lightning:'#FFD700',frost:'#64B5F6',dark:'#9C27B0',plasma:'#E040FB'};
	    const orbIcons={lightning:'⚡',frost:'❄',dark:'🌑',plasma:'💎'};
	    const orbX=540,orbY=y+2;
	    for(let i=0;i<G.maxOrbs;i++){
	      const ox=orbX+i*32,oy=orbY;
	      const orb=G.orbs[i];
	      const isActive=!!orb;
	      const pulse=isActive?0.6+0.4*Math.sin(Date.now()/500+i*1.5):0;
	      ctx.shadowColor=isActive?orbColors[orb.type]+'aa':'rgba(0,0,0,0.2)';ctx.shadowBlur=isActive?15:2;
	      ctx.fillStyle=isActive?orbColors[orb.type]+'33':'rgba(80,80,80,0.25)';
	      ctx.strokeStyle=isActive?orbColors[orb.type]+'88':'rgba(160,160,160,0.3)';ctx.lineWidth=isActive?2:1;
	      ctx.beginPath();ctx.arc(ox,oy,14,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.shadowBlur=0;
	      if(isActive){
	        ctx.fillStyle=orbColors[orb.type];ctx.font='bold 13px Arial';ctx.textAlign='center';ctx.textBaseline='middle';
	        ctx.fillText(orbIcons[orb.type],ox,oy+1);
	      }else{
	        ctx.fillStyle='rgba(160,160,160,0.4)';ctx.font='bold 13px Arial';ctx.textAlign='center';ctx.textBaseline='middle';
	        ctx.fillText('○',ox,oy+1);
	      }
	    }
	    // 球体悬浮详细说明
	    const orbHoverY=Math.max(50,y-70);
	    for(let i=0;i<G.maxOrbs;i++){
	      const ox=orbX+i*32,oy=orbY;
	      if(G.mx>=ox-16&&G.mx<=ox+16&&G.my>=oy-16&&G.my<=oy+16&&G.orbs[i]){
	        const orb=G.orbs[i];
	        const eVal=Math.floor((G.focus||0)*0.5);
	        const passMap={lightning:'⚡ 被动:'+(3+eVal)+'伤/回合',frost:'❄ 被动:+'+(2+eVal)+'甲/回合',dark:'🌑 被动:累积'+(6+eVal)+'伤',plasma:'💎 被动:+1能/回合'};
	        const evoMap={lightning:'⚡ 激发:'+(8+eVal*2)+'伤',frost:'❄ 激发:+'+(5+eVal)+'甲',dark:'🌑 激发:'+(G._darkPool||0)+'伤(全体)',plasma:'💎 激发:+2能'};
	        ctx.fillStyle='rgba(0,0,0,0.9)';ctx.beginPath();ctx.roundRect(Math.max(10,Math.min(ox-100,W-280)),orbHoverY-5,260,58,6);ctx.fill();
	        ctx.fillStyle=orbColors[orb.type];ctx.font='bold 10px Arial';ctx.textAlign='left';ctx.textBaseline='top';
	        ctx.fillText('◈ '+orbIcons[orb.type]+' '+orb.type+'球  (集中:'+(G.focus||0)+' → eff:'+eVal+')',Math.max(16,Math.min(ox-90,W-270)),orbHoverY+2);
	        ctx.fillStyle='#eee';ctx.font='9px Arial';
	        ctx.fillText(passMap[orb.type],Math.max(16,Math.min(ox-90,W-270)),orbHoverY+16);
	        ctx.fillStyle='rgba(255,200,100,0.9)';ctx.font='9px Arial';
	        ctx.fillText(evoMap[orb.type],Math.max(16,Math.min(ox-90,W-270)),orbHoverY+30);
	        ctx.fillStyle='rgba(255,255,255,0.4)';ctx.font='7px Arial';
	        ctx.fillText('球位满时生成新球会激发最左侧的球',Math.max(16,Math.min(ox-90,W-270)),orbHoverY+46);
	      }
	    }
	    // 集中显示(悬浮详细说明)
	    const fLabelX=orbX+G.maxOrbs*32+8;
	    ctx.fillStyle=G.focus>0?'#AD8BFF':'rgba(150,150,150,0.7)';ctx.font='9px Arial';ctx.textAlign='left';ctx.textBaseline='middle';
	    ctx.fillText((G.focus>0?'📊':'○')+'集中'+((G.focus||0)>0?'+'+G.focus:':0'),fLabelX,y+10);
	    const fHover=G.mx>=orbX+G.maxOrbs*38-4&&G.mx<=orbX+G.maxOrbs*38+100&&G.my>=y+10-6&&G.my<=y+10+6;
	    if(fHover){ctx.fillStyle='rgba(0,0,0,0.9)';ctx.beginPath();ctx.roundRect(Math.max(10,Math.min(fLabelX-10,W-280)),y-50,260,55,6);ctx.fill();
	      ctx.fillStyle='#AD8BFF';ctx.font='bold 10px Arial';ctx.textAlign='left';ctx.textBaseline='top';
	      ctx.fillText('📊 集中 (Focus) 详解',Math.max(16,Math.min(fLabelX-2,W-270)),y-44);
	      ctx.fillStyle='#eee';ctx.font='9px Arial';
	      ctx.fillText('每2点集中=1点球体效果(eff)',Math.max(16,Math.min(fLabelX-2,W-270)),y-28);
	      ctx.fillStyle='rgba(255,255,255,0.6)';ctx.font='8px Arial';
	      ctx.fillText('闪电:被动+eff/激发+eff×2  冰霜:被动+eff/激发+eff',Math.max(16,Math.min(fLabelX-2,W-270)),y-12);
	      ctx.fillStyle='rgba(255,255,255,0.4)';ctx.font='7px Arial';
	      ctx.fillText('获取:碎片整理·偏差认知·消耗·机兵被动(每3球+1)',Math.max(16,Math.min(fLabelX-2,W-270)),y+2);
	    }
	  }// 能量水晶(更现代化)
  const eX=W-20,eY=hpY+hpH/2;
  for(let i=0;i<G.maxEnergy;i++){
    const ex=eX-25*i-15,active=i<G.energy;
    const ePulse=active?0.6+0.4*Math.sin(Date.now()/300+i):0.3;
    ctx.shadowColor=active?'rgba(173,139,255,'+ePulse*0.5+')':'rgba(0,0,0,0.2)';ctx.shadowBlur=active?12:3;
    ctx.fillStyle=active?`rgba(173,139,255,${0.15+ePulse*0.2})`:'rgba(80,80,80,0.15)';
    ctx.strokeStyle=active?`rgba(173,139,255,${0.4+ePulse*0.3})`:'rgba(160,160,160,0.35)';ctx.lineWidth=1.5;
    ctx.beginPath();ctx.roundRect(ex-11,eY-10,24,20,5);ctx.fill();ctx.stroke();
    ctx.shadowBlur=0;
    ctx.fillStyle=active?'rgba(255,255,255,0.9)':'rgba(100,100,100,0.3)';ctx.font='bold 11px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('⚡',ex,eY+1);
  }
  if(G.relics.length){ctx.fillStyle='rgba(255,215,0,0.7)';ctx.font='9px Arial';ctx.textAlign='left';ctx.textBaseline='top';ctx.fillText('⚜️ '+G.relics.map(r=>r.name).join(' · '),10,y+44);}
  // 遗物悬浮提示(左上角详细显示)
  if(G.relics.length){
    // Check hover on relic names (displayed at y+44, start at x=10)
    const relY=y+44;const relX=10;
    const totalText='⚜️ '+G.relics.map(r=>r.name).join(' · ');
    ctx.font='9px Arial';const textW=ctx.measureText(totalText).width;
    if(G.mx>=relX&&G.mx<=relX+textW&&G.my>=relY&&G.my<=relY+12){
      // Find which relic is hovered based on text position
      const names=G.relics.map(r=>r.name);
      let cumX=relX+30;let rIdx=-1;
      names.forEach((n,i)=>{const w=ctx.measureText((i>0?' · ':'')+n).width;if(G.mx>=cumX&&G.mx<=cumX+w)rIdx=i;cumX+=w;});
      if(rIdx<0)rIdx=Math.floor((G.mx-relX)/Math.max(1,textW)*names.length);
      rIdx=Math.min(rIdx,names.length-1);
      const r=G.relics[rIdx];const rDesc=RELICS.find(x=>x.id===r.id);
      if(rDesc){
        ctx.shadowColor='rgba(0,0,0,0.5)';ctx.shadowBlur=12;
        ctx.fillStyle='rgba(8,8,28,0.95)';ctx.beginPath();ctx.roundRect(12,12,280,50,8);ctx.fill();ctx.shadowBlur=0;
        ctx.strokeStyle='rgba(255,215,0,0.3)';ctx.lineWidth=1;ctx.beginPath();ctx.roundRect(12,12,280,50,8);ctx.stroke();
        ctx.fillStyle='#FFD700';ctx.font='bold 12px Arial';ctx.textAlign='left';ctx.textBaseline='top';ctx.fillText('⚜️ '+rDesc.name||r.name,24,20);
        ctx.fillStyle='rgba(255,255,255,0.8)';ctx.font='9px Arial';ctx.fillText(rDesc.desc||'',24,38);
      }
    }
  }
  if(G.potion&&G.phase==='combat'){const potX=W-130,potW=115;
    const overPotion=G.mx>=potX&&G.mx<=potX+potW&&G.my>=y+16&&G.my<=y+32;
    ctx.fillStyle=overPotion?'rgba(0,200,100,0.35)':'rgba(0,200,100,0.20)';
    ctx.beginPath();ctx.roundRect(potX,y+16,potW,16,8);ctx.fill();
    ctx.fillStyle='#4CAF50';ctx.font='10px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('🧪'+G.potion.name+'[Q]',W-72,y+24);
    if(overPotion){ctx.fillStyle='rgba(0,0,0,0.85)';ctx.beginPath();ctx.roundRect(G.mx+5,G.my-40,160,22,5);ctx.fill();
      ctx.fillStyle='#4CAF50';ctx.font='9px Arial';ctx.textAlign='left';ctx.textBaseline='middle';ctx.fillText(G.potion.desc||'',G.mx+12,G.my-29);}
  }
}

// ===================================================================
//  渲染系统 — 手牌 (卡片·费用·悬浮高亮)
// ===================================================================
function drawHand(){
  if(G.phase!=='combat'||!G.hand.length)return;
  const cy=490,ch=135,gap=5;
  let cw=Math.min(105,(W-30-gap*(G.hand.length-1))/G.hand.length);cw=Math.max(70,cw);
  const tw=G.hand.length*cw+(G.hand.length-1)*gap,sx=(W-tw)/2;
  const pulseGlow=0.5+0.25*Math.sin(Date.now()/500);
  G.hand.forEach((c,i)=>{
    const x=sx+i*(cw+gap),d=def(c),ok=(G.corruption&&d&&d.type==='skill')?true:c.c<=G.energy;
    const hover=G.mx>=x&&G.mx<=x+cw&&G.my>=cy&&G.my<=cy+ch;
    const t=d?d.type:'';
    const lift=hover&&ok?(-10):0;
    // 发光悬浮阴影
    ctx.shadowColor=hover&&ok?{attack:'rgba(255,80,80,0.4)',skill:'rgba(80,130,255,0.4)',power:'rgba(220,200,0,0.4)'}[t]||'rgba(255,215,0,0.25)':'rgba(0,0,0,0.4)';
    ctx.shadowBlur=hover?35:12;
    // 卡片背景(深色毛玻璃)
    const bgGrad=ctx.createRadialGradient(x+cw/2,cy+lift+ch/2,20,x+cw/2,cy+lift+ch/2,ch);
    const cBg={attack:['rgba(180,30,30,0.25)','rgba(60,10,10,0.3)'],skill:['rgba(30,60,180,0.25)','rgba(10,15,60,0.3)'],power:['rgba(180,160,0,0.25)','rgba(50,40,0,0.3)'],status:['rgba(80,80,80,0.1)','rgba(40,40,40,0.15)']};
    const bg=cBg[t]||['rgba(80,80,80,0.1)','rgba(40,40,40,0.15)'];
    bgGrad.addColorStop(0,ok?bg[0]:'rgba(40,40,40,0.1)');bgGrad.addColorStop(1,ok?bg[1]:'rgba(30,30,30,0.15)');
    ctx.fillStyle=ok?bgGrad:'rgba(40,40,40,0.15)';
    ctx.beginPath();ctx.roundRect(x,cy+lift,cw,ch,10);ctx.fill();ctx.shadowBlur=0;
    // 卡片边框(悬浮时高亮)
    const bColors={attack:'rgba(255,80,80,0.6)',skill:'rgba(80,140,255,0.6)',power:'rgba(255,215,0,0.6)',status:'rgba(160,160,160,0.35)'};
    ctx.strokeStyle=hover&&ok?(bColors[t]||'rgba(255,215,0,0.5)'):ok?'rgba(255,255,255,0.1)':'rgba(80,80,80,0.08)';
    ctx.lineWidth=hover?2.5:1;
    ctx.beginPath();ctx.roundRect(x,cy+lift,cw,ch,10);ctx.stroke();
    // 顶部类型色带(更鲜明)
    const bandColors={attack:'rgba(255,60,60,0.45)',skill:'rgba(60,120,255,0.45)',power:'rgba(240,220,0,0.45)',status:'rgba(100,100,100,0.15)'};
    ctx.fillStyle=bandColors[t]||'rgba(255,255,255,0.03)';
    ctx.beginPath();ctx.roundRect(x+1,cy+lift+1,cw-2,20,8);ctx.fill();
    // 费用圆(更精致)
    const cardCost=(G.corruption&&d&&d.type==='skill')?0:c.c;
    ctx.shadowColor=ok?'rgba(173,139,255,'+pulseGlow*0.6+')':'rgba(0,0,0,0.3)';ctx.shadowBlur=ok?10:3;
    ctx.fillStyle=ok?'#AD8BFF':'#555';ctx.beginPath();ctx.arc(x+16,cy+lift+16,13,0,Math.PI*2);ctx.fill();
    ctx.shadowBlur=0;
    ctx.fillStyle='#fff';ctx.font='bold 12px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(cardCost===-1?'X':cardCost,x+16,cy+lift+16);
    // 稀有度标记
    if(d){const gems={common:'rgba(255,255,255,0.45)',uncommon:'rgba(100,180,255,0.35)',rare:'rgba(255,215,0,0.4)'};
      ctx.fillStyle=gems[d.rarity]||'rgba(255,255,255,0.35)';ctx.beginPath();ctx.arc(x+cw-12,cy+lift+10,5,0,Math.PI*2);ctx.fill();}
    // 卡名(加粗清晰)
    const nn=c.name+(c.u?'+':'');
    ctx.shadowColor='rgba(0,0,0,0.6)';ctx.shadowBlur=5;
    ctx.fillStyle=ok?'#fff':'rgba(255,255,255,0.45)';
    ctx.font='bold '+(cw>90?'14':'12')+'px Arial';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText(nn.length>5&&cw<90?nn.slice(0,4)+'..':nn,x+cw/2,cy+lift+42);
    ctx.shadowBlur=0;
    if(d&&d.id==='geneticAlgo'&&G._geneticAlgo>0){ctx.fillStyle='#64B5F6';ctx.font='bold 10px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('🧬+'+G._geneticAlgo,x+cw/2,cy+lift+52);}
    // 描述
    if(d){ctx.fillStyle=ok?'rgba(255,255,255,0.7)':'rgba(255,255,255,0.5)';ctx.font=cw>90?'9px Arial':'8px Arial';
      const txt=c.u&&d.uDesc?d.uDesc:d.desc;const lines=wrap(txt||'',cw-10);lines.forEach((l,li)=>{if(li>2)return;ctx.fillText(l,x+cw/2,cy+lift+64+li*11);});}
    // 类型图标(底部)
    const ti=c.type==='attack'?'⚔️':c.type==='skill'?'🛡️':c.type==='power'?'⭐':'';
    ctx.fillStyle='rgba(255,255,255,0.55)';ctx.font='bold 12px Arial';ctx.textBaseline='bottom';ctx.fillText(ti,x+cw/2,cy+lift+ch-4);
    // 消耗标记
    if(c.ex||(G.corruption&&d&&d.type==='skill')){ctx.fillStyle='rgba(255,100,100,0.15)';ctx.font='7px Arial';ctx.fillText('消耗',x+cw-14,cy+lift+10);}
    // 升级标记
    if(c.u){ctx.fillStyle='rgba(255,215,0,0.8)';ctx.font='bold 10px Arial';ctx.fillText('+',x+14,cy+lift+36);}
    // 稀有度宝石
    if(d){let gc='rgba(255,255,255,0.1)';if(d.rarity==='uncommon')gc='rgba(100,180,255,0.3)';else if(d.rarity==='rare')gc='rgba(255,215,0,0.3)';ctx.fillStyle=gc;ctx.beginPath();ctx.arc(x+cw-10,cy+lift+10,4,0,Math.PI*2);ctx.fill();}
    // 悬浮高亮边框
    if(hover&&ok){ctx.fillStyle='rgba(255,215,0,0.05)';ctx.beginPath();ctx.roundRect(x-3,cy+lift-5,cw+6,ch+8,11);ctx.fill();}
  });
}

function wrap(t){if(!t)return[''];const r=[];let c='';for(const ch of t){c+=ch;if(c.length>12){r.push(c);c='';}}if(c)r.push(c);return r.length?r:[''];}

// ===================================================================
//  渲染系统 — 卡牌悬浮提示 (详细效果·伤害修正)
// ===================================================================
function drawCardTooltip(){
  if(G.phase!=='combat'||!G.hand.length)return;
  const cy=490,ch=135,gap=5;
  let cw=Math.min(105,(W-30-gap*(G.hand.length-1))/G.hand.length);cw=Math.max(70,cw);
  const tw=G.hand.length*cw+(G.hand.length-1)*gap,sx=(W-tw)/2;
  let ci=-1;
  for(let i=0;i<G.hand.length;i++){const x=sx+i*(cw+gap);if(G.mx>=x&&G.mx<=x+cw&&G.my>=cy&&G.my<=cy+ch){ci=i;break;}}
  if(ci<0)return;
  const card=G.hand[ci],d=def(card);if(!d)return;
  const rn={basic:'基础',common:'普通',uncommon:'稀有',rare:'传说'},tn={attack:'⚔️攻击',skill:'🛡️技能',power:'⭐能力',status:'🧊状态'};
  const cost=(G.corruption&&d.type==='skill')?0:(card.c===-1?'X':card.c);
  const desc=d.desc||'';
  const uDesc=d.uDesc||'';
  const isUpgraded=card.u;
  const lines=[];
  // Title line
  const title=card.name+(isUpgraded?'+':'')+'  ['+(rn[d.rarity]||'')+']';
  lines.push({t:title,c:d.type==='attack'?'#FF6B6B':d.type==='skill'?'#64B5F6':d.type==='power'?'#FFD700':'#888',s:15,b:1});
  // Type & cost line
  const typeIcon=tn[d.type]||'未知';
  lines.push({t:typeIcon+'  ⚡'+cost+'费  |  '+(isUpgraded?'已升级':'可升级'),c:isUpgraded?'#4CAF50':'rgba(255,255,255,0.5)',s:10,b:0});
  lines.push(null);
  // Description - both base and upgrade
  if(isUpgraded){
    lines.push({t:'⬆️ 已升级效果:',c:'#4CAF50',s:9,b:1});
    lines.push({t:uDesc,c:'rgba(255,255,255,0.85)',s:10,b:0});
    if(desc!==uDesc){
      lines.push(null);
      lines.push({t:'📖 原版效果:',c:'rgba(255,255,255,0.4)',s:8,b:0});
      lines.push({t:desc,c:'rgba(255,255,255,0.5)',s:9,b:0});
    }
  }else{
    lines.push({t:'📖 效果:',c:'rgba(255,255,255,0.6)',s:9,b:0});
    lines.push({t:desc,c:'rgba(255,255,255,0.85)',s:10,b:0});
    if(uDesc&&uDesc!==desc){
      lines.push(null);
      lines.push({t:'⬆️ 升级后:',c:'#4CAF50',s:8,b:0});
      lines.push({t:uDesc,c:'rgba(255,255,255,0.65)',s:9,b:0});
    }
  }
  // Damage modifiers for attacks
  if(d.type==='attack'){
    const tg=G.enemies.find(e=>e.hp>0);
    lines.push(null);
    lines.push({t:'━ 伤害修正 ━',c:'rgba(255,215,0,0.3)',s:7,b:0});
    if(G.strength>0)lines.push({t:'⬆️力量 +'+G.strength+' (×1.5)',c:'#FF6B6B',s:8,b:0});
    if(G.weak>0)lines.push({t:'💧虚弱 ×0.75',c:'#64B5F6',s:8,b:0});
    if(tg&&tg.vulnerable>0)lines.push({t:'💫易伤(敌) ×1.5',c:'#FF9800',s:8,b:0});
    if(G.stance==='wrath')lines.push({t:'🔥怒火 ×2',c:'#FF6B6B',s:8,b:0});
    if(G.stance==='divinity')lines.push({t:'✨神格 ×3',c:'#FFD700',s:8,b:0});
    if(G._phantasmalActive)lines.push({t:'👻幻影 ×2',c:'#E040FB',s:8,b:0});
  }
  // Card ID tooltip for debug
  if(d.id)lines.push({t:'ID: '+d.id,c:'rgba(255,255,255,0.2)',s:6,b:0});
  // Render
  const lh=15,ph=12+lines.reduce((s,l)=>s+(l?lh:4),0);
  const px=12,py=65,pw=280;
  ctx.shadowColor='rgba(0,0,0,0.5)';ctx.shadowBlur=12;
  ctx.fillStyle='rgba(8,8,28,0.95)';ctx.beginPath();ctx.roundRect(px,py,pw,ph,8);ctx.fill();ctx.shadowBlur=0;
  ctx.strokeStyle=d.type==='attack'?'rgba(255,80,80,0.3)':d.type==='skill'?'rgba(80,130,255,0.3)':d.type==='power'?'rgba(255,215,0,0.3)':'rgba(255,255,255,0.1)';
  ctx.lineWidth=1;ctx.beginPath();ctx.roundRect(px,py,pw,ph,8);ctx.stroke();
  let y=py+10;
  lines.forEach(l=>{if(!l){y+=3;return;}ctx.fillStyle=l.c;ctx.font=(l.b?'bold ':'')+l.s+'px Arial';ctx.textAlign='left';ctx.textBaseline='top';ctx.fillText(l.t,px+12,y);y+=lh;});
}
// ===================================================================
//  渲染系统 — 结束回合按钮 & 功能按钮
// ===================================================================
function drawEndBtn(){
  if(G.phase!=='combat')return;
  const bx=W-110,by=455,bw=90,bh=24;
  const h=G.mx>=bx&&G.mx<=bx+bw&&G.my>=by&&G.my<=by+bh;
  const hasEnergy=G.energy>0;
  const pulse=hasEnergy?0.6+0.4*Math.sin(Date.now()/400):0.5+0.2*Math.sin(Date.now()/600);
  const glowColor=hasEnergy?'rgba(255,200,50,'+pulse*0.6+')':'rgba(138,107,255,'+pulse*0.5+')';
  ctx.shadowColor=glowColor;ctx.shadowBlur=h?30:hasEnergy?20:12;
  ctx.fillStyle=h?'rgba(255,200,50,0.3)':hasEnergy?'rgba(255,200,50,0.12)':'rgba(138,107,255,0.15)';
  ctx.strokeStyle=h?'rgba(255,200,50,0.7)':hasEnergy?'rgba(255,200,50,0.4)':'rgba(138,107,255,0.3)';ctx.lineWidth=hasEnergy?2:1.5;
  ctx.beginPath();ctx.roundRect(bx,by,bw,bh,12);ctx.fill();ctx.stroke();ctx.shadowBlur=0;
  ctx.fillStyle=h?'#fff':hasEnergy?'#FFD700':'rgba(255,255,255,0.8)';ctx.font='bold 13px Arial';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillText(hasEnergy?'⚡结束回合':'⏭ 结束回合',bx+bw/2,by+bh/2+1);
}

function drawCodexBtn(){
  if(G.phase!=='combat')return;
  const btnStyle=(h,active,label,key,x,w)=>{
    const col=active?'rgba(255,215,0,0.25)':h?'rgba(255,255,255,0.1)':'rgba(255,255,255,0.04)';
    const bCol=active?'rgba(255,215,0,0.4)':h?'rgba(255,255,255,0.65)':'rgba(255,255,255,0.35)';
    ctx.fillStyle=col;ctx.strokeStyle=bCol;ctx.lineWidth=1;
    ctx.beginPath();ctx.roundRect(x,460,w,22,8);ctx.fill();ctx.stroke();
    ctx.fillStyle=active?'#FFD700':h?'rgba(255,255,255,0.6)':'rgba(255,255,255,0.25)';
    ctx.font='10px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(label,x+w/2,471);
    ctx.fillStyle='rgba(255,255,255,0.55)';ctx.font='7px Arial';ctx.fillText('['+key+']',x+w-14,460);};
  btnStyle(G.mx>=6&&G.mx<=64&&G.my>=460&&G.my<=482,false,'📖图鉴','B',6,58);
  btnStyle(G.mx>=68&&G.mx<=126&&G.my>=460&&G.my<=482,false,'🗺️地图','M',68,58);
  btnStyle(G.mx>=130&&G.mx<=188&&G.my>=460&&G.my<=482,G.logOpen,'📋日志','L',130,58);
}

// ===================================================================
//  渲染系统 — 底部信息栏 (回合·快捷键·牌堆统计)
// ===================================================================
function drawInfo(){
  if(G.phase!=='combat')return;
  ctx.shadowColor='rgba(0,0,0,0.3)';ctx.shadowBlur=10;
  ctx.fillStyle='rgba(10,10,30,0.8)';ctx.beginPath();ctx.roundRect(5,H-22,W-10,20,6);ctx.fill();ctx.shadowBlur=0;
  ctx.strokeStyle='rgba(255,255,255,0.10)';ctx.lineWidth=1;ctx.beginPath();ctx.roundRect(5,H-22,W-10,18,6);ctx.stroke();
  // 左侧:回合+卡组+快捷键
  ctx.fillStyle='rgba(255,255,255,0.8)';ctx.font='9px Arial';ctx.textAlign='left';ctx.textBaseline='middle';
  ctx.fillStyle='rgba(255,255,255,0.8)';ctx.font='bold 9px Arial';ctx.textAlign='left';ctx.textBaseline='middle';ctx.fillText('⏱ 第'+G.turn+'回合',12,H-13);
  ctx.fillStyle='rgba(255,255,255,0.35)';ctx.font='7px Arial';ctx.fillText('B图鉴 M地图 L日志 Q药水 E结束 D卡组',140,H-13);
  // 中间:手牌数
  ctx.textAlign='center';
  ctx.fillStyle='rgba(255,255,255,0.6)';ctx.font='bold 10px Arial';ctx.fillText('✋'+G.hand.length,W/2,H-13);
  // 右侧:抽牌堆/弃牌堆(可点击)
  const hd=G.mx>=W-90&&G.mx<=W-46&&G.my>=H-22&&G.my<=H-4;
  const hs=G.mx>=W-44&&G.mx<=W-10&&G.my>=H-22&&G.my<=H-4;
  ctx.textAlign='right';
  ctx.fillStyle=hd?'rgba(255,215,0,0.5)':'rgba(255,255,255,0.25)';ctx.fillText('📤'+G.draw.length,W-55,H-13);
  ctx.fillStyle=hs?'rgba(255,215,0,0.5)':'rgba(255,255,255,0.25)';ctx.fillText('📥'+G.discard.length,W-12,H-13);
}

// ===================================================================
//  渲染系统 — 特效 (震动·闪烁·粒子·动画)
// ===================================================================
function drawFX(){
  // 屏幕震动
  if(shakeIntensity>0){shakeX=(Math.random()-0.5)*shakeIntensity;shakeY=(Math.random()-0.5)*shakeIntensity;shakeIntensity*=0.85;if(shakeIntensity<0.5)shakeIntensity=0;}
  if(shakeX||shakeY){ctx.save();ctx.translate(shakeX|0,shakeY|0);}
  // 玩家受伤红闪(全屏)
  if(damageFlash>0){
    ctx.fillStyle='rgba(255,0,0,'+(damageFlash*0.3)+')';ctx.fillRect(0,0,W,H);
    damageFlash*=0.85;if(damageFlash<0.01)damageFlash=0;
  }
  // 终结暗闪
  if(G&&G._killFlash>0){
    ctx.fillStyle='rgba(0,0,0,'+(G._killFlash/20*0.5)+')';ctx.fillRect(0,0,W,H);
    ctx.fillStyle='rgba(80,0,0,'+(G._killFlash/20*0.15)+')';ctx.fillRect(0,0,W,H);
    G._killFlash--;
  }
  // 格挡护盾光晕
  if(G&&G.phase==='combat'&&G.block>0){
    const pulse=0.3+0.15*Math.sin(Date.now()/400);
    ctx.strokeStyle='rgba(100,181,246,'+pulse+')';ctx.lineWidth=2;
    ctx.beginPath();ctx.arc(480,430,60+5*Math.sin(Date.now()/500),0,Math.PI*2);ctx.stroke();
    ctx.strokeStyle='rgba(100,181,246,'+pulse*0.5+')';ctx.lineWidth=1;
    ctx.beginPath();ctx.arc(480,430,70+5*Math.sin(Date.now()/500+1),0,Math.PI*2);ctx.stroke();
  }
  // 观者姿态光晕
  if(G&&G.stance&&G.stance!=='neutral'&&G.phase==='combat'){
    const s=G.stance,p=0.05+0.03*Math.sin(Date.now()/300);
    const c={wrath:'rgba(255,60,60,',calm:'rgba(100,181,246,',divinity:'rgba(255,215,0,'};
    ctx.fillStyle=(c[s]||'rgba(255,255,255,')+p;ctx.fillRect(0,0,W,H);
  }
  // 敌人闪烁(受伤)
  if(enemyFlash>0)enemyFlash--;
  // 玩家闪烁
  if(playerFlash>0)playerFlash--;
  // 额外回合指示
  if(G._vaultTurn){
    const p=0.3+0.15*Math.sin(Date.now()/300);
    ctx.strokeStyle='rgba(255,215,0,'+p+')';ctx.lineWidth=3;ctx.beginPath();ctx.roundRect(5,5,W-10,H-10,16);ctx.stroke();
    ctx.fillStyle='rgba(255,215,0,'+p*0.5+')';ctx.font='bold 18px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('⏳ 额外回合!',W/2,40);
  }
  // 出牌闪光效果
  if(G._playedCardFlash>0){
    ctx.globalAlpha=G._playedCardFlash/8*0.15;
    ctx.fillStyle='#FFD700';ctx.beginPath();ctx.roundRect(G._playedCardX-40,G._playedCardY-20,80,40,10);ctx.fill();
    G._playedCardFlash--;
    ctx.globalAlpha=1;
  }
  // 粒子+文字特效
  for(let i=effects.length-1;i>=0;i--){
    const f=effects[i];
    if(f.particle){f.x+=f.vx||0;f.y+=f.vy||0;f.vy=(f.vy||0)+0.05;}else{f.y+=f.dy||-0.6;}
    f.life--;
    const alpha=Math.max(0,f.life/f.maxLife);
    ctx.globalAlpha=alpha;
    // 粒子大小随生命衰减
    if(f.glow){ctx.shadowColor=f.color;ctx.shadowBlur=20;}
    if(f.particle){
      const sz=f.size*alpha*(0.5+0.5*f.life/f.maxLife);
      ctx.fillStyle=f.color;ctx.beginPath();ctx.arc(f.x,f.y,Math.max(1,sz),0,Math.PI*2);ctx.fill();
    }else{
      ctx.font='bold '+(f.size+(f.maxLife-f.life)/8)+'px Arial';ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.fillStyle=f.color;ctx.fillText(f.text,f.x,f.y);
    }
    ctx.shadowBlur=0;
    if(f.life<=0)effects.splice(i,1);
  }
  ctx.globalAlpha=1;
  if(shakeX||shakeY){ctx.restore();shakeX=0;shakeY=0;}
}

// ===================================================================
//  渲染系统 — 战利品选择 / BOSS遗物选择 / 商店
// ===================================================================
function drawRewards(){
  if(G.phase!=='reward')return;
  ctx.fillStyle='rgba(0,0,0,0.78)';ctx.fillRect(0,0,W,370);
  ctx.fillStyle='#FFD700';ctx.font='bold 24px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('🎁 战利品',480,28);
  ctx.fillStyle='rgba(255,255,255,0.4)';ctx.font='12px Arial';ctx.fillText('🪙 +'+G.rewardGold,480,54);
  if(G.rewardRelic){ctx.fillStyle='#E040FB';ctx.font='11px Arial';ctx.fillText('💀 精英遗物已获得!',480,76);}
  const cW=Math.min(210,(W-40)/G.rewardCards.length-8),gap=(W-G.rewardCards.length*cW)/(G.rewardCards.length+1);
  const typeColors={attack:'#FF6B6B',skill:'#64B5F6',power:'#FFD700'};
  const typeBg={attack:'rgba(200,60,60,0.15)',skill:'rgba(60,100,200,0.15)',power:'rgba(200,180,0,0.15)'};
  const typeBorder={attack:'rgba(255,80,80,0.3)',skill:'rgba(80,130,255,0.3)',power:'rgba(220,200,0,0.3)'};
  G.rewardCards.forEach((c,i)=>{
    const animOff=G._rewardAnim?(1-G._rewardAnim)*60:0;
    const x=gap+i*(cW+gap),y=90+animOff,hover=G.mx>=x&&G.mx<=x+cW&&G.my>=y&&G.my<=y+150;
    const cd=M[c.id];const t=cd?cd.type:'';
    ctx.shadowColor=hover?'rgba(255,215,0,0.25)':'rgba(0,0,0,0.3)';ctx.shadowBlur=hover?30:10;
    ctx.fillStyle=cd?typeBg[t]||'rgba(255,255,255,0.06)':'rgba(255,255,255,0.06)';
    ctx.strokeStyle=hover?'rgba(255,215,0,0.5)':(cd?typeBorder[t]:'rgba(255,255,255,0.35)');ctx.lineWidth=hover?2.5:1.2;
    ctx.beginPath();ctx.roundRect(x,y,cW,150,10);ctx.fill();ctx.stroke();ctx.shadowBlur=0;
    // 顶部色条
    if(cd){ctx.fillStyle={attack:'rgba(255,60,60,0.2)',skill:'rgba(60,100,200,0.2)',power:'rgba(220,200,0,0.2)'}[t]||'rgba(255,255,255,0.04)';
      ctx.beginPath();ctx.roundRect(x+1,y+1,cW-2,16,8);ctx.fill();}
    // 费用圆
    if(cd){ctx.fillStyle='#AD8BFF';ctx.beginPath();ctx.arc(x+18,y+12,9,0,Math.PI*2);ctx.fill();ctx.fillStyle='#fff';ctx.font='bold 10px Arial';ctx.textBaseline='middle';ctx.textAlign='center';ctx.fillText(c.c,x+18,y+12);}
    // 卡名
    ctx.fillStyle='#fff';ctx.font='bold 14px Arial';ctx.textBaseline='middle';ctx.textAlign='center';ctx.fillText(c.name,x+cW/2,y+42);
    // 稀有度+类型
    if(cd){const rn={basic:'基础',common:'普通',uncommon:'稀有',rare:'传说'};const tn={attack:'⚔️',skill:'🛡️',power:'⭐'};
      ctx.fillStyle='rgba(255,255,255,0.25)';ctx.font='9px Arial';ctx.fillText((tn[t]||'')+' '+(rn[cd.rarity]||''),x+cW/2,y+62);}
    // 描述
    if(cd){ctx.fillStyle='rgba(255,255,255,0.55)';ctx.font='9px Arial';const txt=c.u&&cd.uDesc?cd.uDesc:cd.desc;const lines=wrap(txt||'',cW-14);lines.forEach((l,li)=>{if(li>1)return;ctx.fillText(l,x+cW/2,y+82+li*13);});}
    // 费用
    if(cd){ctx.fillStyle='#AD8BFF';ctx.font='bold 10px Arial';ctx.fillText('⚡'+c.c,x+cW/2,y+118);}
    // 悬浮高亮边框
    if(hover){ctx.fillStyle='rgba(255,215,0,0.05)';ctx.beginPath();ctx.roundRect(x-3,y-3,cW+6,156,12);ctx.fill();}
  });
  ctx.fillStyle='rgba(255,255,255,0.45)';ctx.font='10px Arial';ctx.textBaseline='bottom';ctx.textAlign='center';ctx.fillText('点击选择·右键跳过',480,358);
}

// ===================================================================
//  渲染系统 — BOSS遗物选择
// ===================================================================
function drawBossRelic(){
  if(G.phase!=='bossRelic')return;
  ctx.fillStyle='rgba(0,0,0,0.75)';ctx.fillRect(0,0,W,370);
  ctx.fillStyle='#FFD700';ctx.font='bold 22px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('⚜️ 选择遗物',480,40);
  const items=G.shopItems||[],rw=280,gap=40,total=items.length*rw+(items.length-1)*gap,sx=(W-total)/2;
  items.forEach((r,i)=>{
    const x=sx+i*(rw+gap),y=90,hover=G.mx>=x&&G.mx<=x+rw&&G.my>=y&&G.my<=y+160;
    ctx.shadowColor=hover?'rgba(255,215,0,0.2)':'rgba(0,0,0,0.3)';ctx.shadowBlur=hover?20:8;
    ctx.fillStyle='rgba(30,20,10,0.6)';ctx.strokeStyle=hover?'rgba(255,215,0,0.5)':'rgba(255,215,0,0.15)';ctx.lineWidth=hover?2.5:1;
    ctx.beginPath();ctx.roundRect(x,y,rw,160,10);ctx.fill();ctx.stroke();ctx.shadowBlur=0;
    ctx.fillStyle='#FFD700';ctx.font='30px Arial';ctx.textBaseline='middle';ctx.textAlign='center';ctx.fillText('⚜️',x+rw/2,y+55);
    ctx.font='bold 16px Arial';ctx.fillText(r.name,x+rw/2,y+105);
    ctx.fillStyle='rgba(255,255,255,0.45)';ctx.font='12px Arial';const lines=wrap(r.desc);lines.forEach((l,li)=>ctx.fillText(l,x+rw/2,y+130+li*16));
  });
}

// ===================================================================
//  渲染系统 — 商店 / 移除卡牌 / 宝箱
// ===================================================================
function drawShop(){
  if(G.phase!=='shop'&&G.phase!=='removeCard'&&G.phase!=='treasure')return;
  const isTreasure=G.phase==='treasure';

  // 全屏深色背景
  ctx.fillStyle='rgba(5,5,20,0.92)';ctx.fillRect(0,0,W,H);

  // ====== 顶部标题栏 ======
  ctx.shadowColor='rgba(0,0,0,0.3)';ctx.shadowBlur=12;
  ctx.fillStyle='rgba(16,16,45,0.9)';ctx.beginPath();ctx.roundRect(10,8,W-20,52,12);ctx.fill();ctx.shadowBlur=0;
  ctx.strokeStyle='rgba(255,215,0,0.12)';ctx.lineWidth=1;ctx.beginPath();ctx.roundRect(10,8,W-20,52,12);ctx.stroke();
  // 标题图标+文字
  ctx.fillStyle='#FFD700';ctx.font='bold 26px Arial';ctx.textAlign='left';ctx.textBaseline='middle';
  ctx.fillText(isTreasure?'📦 宝箱':'🏪 商店',28,34);
  // 金币显示
  ctx.fillStyle='#FFD700';ctx.font='bold 18px Arial';ctx.textAlign='right';ctx.textBaseline='middle';
  ctx.fillText('🪙 '+G.gold,W-28,34);
  // 幕/层信息
  ctx.fillStyle='rgba(255,255,255,0.2)';ctx.font='9px Arial';ctx.textAlign='right';ctx.textBaseline='middle';
  ctx.fillText('第'+act(G.floor)+'幕 · '+G.floor+'F',W-28,56);

  // ====== 移除卡牌模式 ======
  if(G.phase==='removeCard'){
    ctx.fillStyle='rgba(255,215,0,0.5)';ctx.font='bold 14px Arial';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText('🗑️ 选择要移除的卡牌 (牌组至少保留5张)',480,86);
    const all=G.deck,cw=105,ch=56,per=Math.min(8,all.length);
    all.forEach((c,i)=>{
      const col=i%8,row=Math.floor(i/8),cx=(W-per*cw)/2+col*cw,cy=110+row*66;
      const hover=G.mx>=cx&&G.mx<=cx+cw-5&&G.my>=cy&&G.my<=cy+ch;
      const d=def(c);const t=d?d.type:'';
      const tc={attack:'rgba(200,60,60,0.15)',skill:'rgba(60,100,200,0.15)',power:'rgba(220,200,0,0.15)',status:'rgba(100,100,100,0.08)'};
      ctx.shadowColor=hover?'rgba(255,80,80,0.3)':'rgba(0,0,0,0.1)';ctx.shadowBlur=hover?12:4;
      ctx.fillStyle=hover?tc[t]||'rgba(255,80,80,0.2)':'rgba(255,255,255,0.04)';
      ctx.strokeStyle=hover?'rgba(255,80,80,0.5)':'rgba(255,255,255,0.06)';ctx.lineWidth=hover?1.5:1;
      ctx.beginPath();ctx.roundRect(cx,cy,cw-5,ch,8);ctx.fill();ctx.stroke();ctx.shadowBlur=0;
      // 费用小圆
      if(d){ctx.fillStyle='#AD8BFF';ctx.beginPath();ctx.arc(cx+14,cy+12,8,0,Math.PI*2);ctx.fill();
        ctx.fillStyle='#fff';ctx.font='bold 8px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(c.c===-1?'X':c.c,cx+14,cy+12);}
      ctx.fillStyle=hover?'#FF6B6B':'rgba(255,255,255,0.7)';ctx.font='10px Arial';ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.fillText(c.name+(c.u?'+':''),cx+(cw-5)/2,cy+ch/2);
    });
    ctx.fillStyle='rgba(255,255,255,0.35)';ctx.font='10px Arial';ctx.textBaseline='bottom';ctx.textAlign='center';ctx.fillText('点击移除 · 右键取消',480,370);
    return;
  }

  // ====== 宝箱模式 ======
  if(isTreasure){
    const items=G.shopItems||[];
    if(!items.length){
      ctx.fillStyle='rgba(255,215,0,0.3)';ctx.font='bold 20px Arial';ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.fillText('✨ 获得金币!',480,200);
      ctx.fillStyle='rgba(255,255,255,0.35)';ctx.font='11px Arial';ctx.textBaseline='bottom';ctx.fillText('点击继续探索',480,370);
      return;
    }
    const rw=280,gap=50,total=items.length*rw+(items.length-1)*gap,sx=(W-total)/2;
    items.forEach((r,i)=>{
      const x=sx+i*(rw+gap),y=110,hover=G.mx>=x&&G.mx<=x+rw&&G.my>=y&&G.my<=y+160;
      ctx.shadowColor=hover?'rgba(255,215,0,0.3)':'rgba(0,0,0,0.2)';ctx.shadowBlur=hover?25:8;
      ctx.fillStyle=hover?'rgba(40,30,15,0.7)':'rgba(30,20,10,0.5)';
      ctx.strokeStyle=hover?'rgba(255,215,0,0.5)':'rgba(255,215,0,0.12)';ctx.lineWidth=hover?2.5:1;
      ctx.beginPath();ctx.roundRect(x,y,rw,160,12);ctx.fill();ctx.stroke();ctx.shadowBlur=0;
      ctx.fillStyle='#FFD700';ctx.font='32px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('⚜️',x+rw/2,y+60);
      ctx.font='bold 16px Arial';ctx.fillText(r.name,x+rw/2,y+108);
      ctx.fillStyle='rgba(255,255,255,0.45)';ctx.font='11px Arial';
      const lines=wrap(r.desc);lines.forEach((l,li)=>ctx.fillText(l,x+rw/2,y+130+li*15));
    });
    return;
  }

  // ===================================================================
  //  商店主界面 — 商品展示
  //  布局: 顶部金币栏 | 5张卡牌(3+2) | 右侧特殊商品区
  // ===================================================================
  const si=G.shopItems||[];
  // 分离商品类型
  const cards=si.filter(x=>!x.isPotion&&!x.isRelic&&!x.isRemove);
  const specials=si.filter(x=>x.isPotion||x.isRelic||x.isRemove);

  // ---- 卡牌区 (左侧大区) ----
  const cardW=165,cardH=200,cardGap=14;
  const cardRows=2,cardsPerRow=3;
  const cardAreaW=cardsPerRow*cardW+(cardsPerRow-1)*cardGap;
  const cardSx=(W-cardAreaW-40)/2; // 左侧偏移,留右侧给special

  cards.slice(0,5).forEach((item,i)=>{
    const col=i%cardsPerRow,row=Math.floor(i/cardsPerRow);
    const x=cardSx+col*(cardW+cardGap);
    const y=82+row*(cardH+cardGap);
    const hover=G.mx>=x&&G.mx<=x+cardW&&G.my>=y&&G.my<=y+cardH;
    const can=G.gold>=item.price;
    const d=def(item);
    const t=d?d.type:'';
    const typeColors={attack:'#FF6B6B',skill:'#64B5F6',power:'#FFD700'};
    const typeBg={attack:'rgba(200,60,60,0.12)',skill:'rgba(60,100,200,0.12)',power:'rgba(200,180,0,0.12)'};
    const typeBorder={attack:'rgba(255,80,80,0.25)',skill:'rgba(80,130,255,0.25)',power:'rgba(220,200,0,0.25)'};

    // 卡片背景
    ctx.shadowColor=hover&&can?'rgba(255,215,0,0.25)':'rgba(0,0,0,0.2)';ctx.shadowBlur=hover?20:6;
    ctx.fillStyle=can?(hover?typeBg[t]||'rgba(255,255,255,0.08)':'rgba(255,255,255,0.04)'):'rgba(40,40,40,0.06)';
    ctx.strokeStyle=can?(hover?typeBorder[t]||'rgba(255,215,0,0.4)':'rgba(255,255,255,0.08)'):'rgba(80,80,80,0.1)';
    ctx.lineWidth=hover&&can?2:1;
    ctx.beginPath();ctx.roundRect(x,y,cardW,cardH,10);ctx.fill();ctx.stroke();ctx.shadowBlur=0;

    // 顶部色带(卡牌类型)
    if(d){ctx.fillStyle=typeColors[t]||'rgba(255,255,255,0.05)';ctx.globalAlpha=0.2;
      ctx.beginPath();ctx.roundRect(x+1,y+1,cardW-2,18,8);ctx.fill();ctx.globalAlpha=1;}

    // 费用圆
    if(d){ctx.fillStyle='#AD8BFF';ctx.beginPath();ctx.arc(x+18,y+14,10,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#fff';ctx.font='bold 10px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(item.c===-1?'X':item.c,x+18,y+14);}

    // 卡名
    ctx.fillStyle=can?'#fff':'rgba(255,255,255,0.3)';ctx.font='bold 13px Arial';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText(item.name+(item.u?'+':''),x+cardW/2,y+50);

    // 稀有度标记
    if(d){const gems={common:'rgba(255,255,255,0.25)',uncommon:'rgba(100,180,255,0.35)',rare:'rgba(255,215,0,0.4)'};
      ctx.fillStyle=gems[d.rarity]||'rgba(255,255,255,0.2)';ctx.beginPath();ctx.arc(x+cardW-14,y+14,5,0,Math.PI*2);ctx.fill();}

    // 类型图标
    const typeIcons={attack:'⚔️',skill:'🛡️',power:'⭐'};
    ctx.fillStyle='rgba(255,255,255,0.25)';ctx.font='18px Arial';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText(typeIcons[t]||'',x+cardW/2,y+80);

    // 类型名称
    const typeNames={attack:'攻击',skill:'技能',power:'能力'};
    ctx.fillStyle='rgba(255,255,255,0.15)';ctx.font='9px Arial';ctx.fillText(typeNames[t]||'',x+cardW/2,y+98);

    // 描述
    if(d){ctx.fillStyle=can?'rgba(255,255,255,0.5)':'rgba(255,255,255,0.2)';ctx.font='8px Arial';
      const txt=item.u&&d.uDesc?d.uDesc:d.desc;const lines=wrap(txt||'',cardW-16);
      lines.forEach((l,li)=>{if(li>2)return;ctx.fillText(l,x+cardW/2,y+118+li*10);});}

    // 价格标
    const priceColor=can?'#FFD700':'#FF6B6B';
    ctx.shadowColor=can?'rgba(255,215,0,0.15)':'rgba(0,0,0,0.1)';ctx.shadowBlur=8;
    ctx.fillStyle=can?(hover?priceColor+'33':'rgba(255,215,0,0.1)'):'rgba(255,60,60,0.08)';
    ctx.strokeStyle=can?(hover?priceColor+'66':'rgba(255,215,0,0.2)'):'rgba(255,60,60,0.15)';ctx.lineWidth=1;
    ctx.beginPath();ctx.roundRect(x+20,y+cardH-28,cardW-40,20,10);ctx.fill();ctx.stroke();ctx.shadowBlur=0;
    ctx.fillStyle=priceColor;ctx.font='bold 11px Arial';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText('🪙 '+item.price,x+cardW/2,y+cardH-18);

    // 不可购买遮盖
    if(!can){ctx.fillStyle='rgba(0,0,0,0.25)';ctx.beginPath();ctx.roundRect(x,y,cardW,cardH,10);ctx.fill();}
  });

  // ---- 特殊商品区 (右侧) ----
  const specX=W-170,specW=155,specGap=10;
  specials.forEach((item,i)=>{
    const y=82+i*(120+specGap);
    const hover=G.mx>=specX&&G.mx<=specX+specW&&G.my>=y&&G.my<=y+115;
    const can=G.gold>=item.price;

    ctx.shadowColor=hover&&can?'rgba(255,215,0,0.2)':'rgba(0,0,0,0.15)';ctx.shadowBlur=hover?15:5;
    ctx.fillStyle=can?(hover?'rgba(255,255,255,0.08)':'rgba(255,255,255,0.03)'):'rgba(40,40,40,0.05)';
    ctx.strokeStyle=can?(hover?'rgba(255,215,0,0.3)':'rgba(255,255,255,0.06)'):'rgba(80,80,80,0.08)';ctx.lineWidth=1;
    ctx.beginPath();ctx.roundRect(specX,y,specW,115,10);ctx.fill();ctx.stroke();ctx.shadowBlur=0;

    if(item.isPotion){
      ctx.fillStyle=can?'#4CAF50':'rgba(76,175,80,0.3)';ctx.font='24px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('🧪',specX+specW/2,y+30);
      ctx.fillStyle=can?'#fff':'rgba(255,255,255,0.3)';ctx.font='bold 12px Arial';ctx.fillText('回复药水',specX+specW/2,y+60);
      ctx.fillStyle='rgba(255,255,255,0.35)';ctx.font='9px Arial';ctx.fillText('回复20点生命',specX+specW/2,y+78);
    }else if(item.isRemove){
      ctx.fillStyle=can?'#FF9800':'rgba(255,152,0,0.3)';ctx.font='22px Arial';ctx.fillText('🗑️',specX+specW/2,y+30);
      ctx.fillStyle=can?'#fff':'rgba(255,255,255,0.3)';ctx.font='bold 12px Arial';ctx.fillText('移除卡牌',specX+specW/2,y+60);
      ctx.fillStyle='rgba(255,255,255,0.35)';ctx.font='9px Arial';ctx.fillText('从牌组删除1张',specX+specW/2,y+78);
    }else if(item.isRelic){
      ctx.fillStyle=can?'#FFD700':'rgba(255,215,0,0.3)';ctx.font='22px Arial';ctx.fillText('⚜️',specX+specW/2,y+30);
      ctx.fillStyle=can?'#fff':'rgba(255,255,255,0.3)';ctx.font='bold 12px Arial';ctx.fillText(item.name,specX+specW/2,y+60);
      ctx.fillStyle='rgba(255,255,255,0.35)';ctx.font='8px Arial';
      const lines=wrap(item.desc||'',specW-12);lines.forEach((l,li)=>{if(li>1)return;ctx.fillText(l,specX+specW/2,y+78+li*12);});
    }

    // 价格标
    ctx.fillStyle=can?'#FFD700':'#FF6B6B';ctx.font='bold 11px Arial';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText('🪙 '+item.price,specX+specW/2,y+102);
    if(!can){ctx.fillStyle='rgba(0,0,0,0.2)';ctx.beginPath();ctx.roundRect(specX,y,specW,115,10);ctx.fill();}
  });

  // 底部操作提示
  ctx.fillStyle='rgba(255,255,255,0.15)';ctx.font='10px Arial';ctx.textBaseline='bottom';ctx.textAlign='center';
  ctx.fillText('点击购买 · 右键离开商店',480,370);
}

// ===================================================================
//  渲染系统 — 篝火 (休息 / 升级选择)
// ===================================================================
function drawRest(){
  if(G.phase!=='rest'&&G.phase!=='upgradeCard')return;
  ctx.fillStyle='rgba(5,5,20,0.85)';ctx.fillRect(0,0,W,H);
  const firePulse=0.6+0.4*Math.sin(Date.now()/500);
  ctx.shadowColor='rgba(255,150,0,'+firePulse*0.3+')';ctx.shadowBlur=40;
  ctx.fillStyle='#FF9800';ctx.font='bold 36px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('🔥',480,95);
  ctx.shadowBlur=0;
  ctx.fillStyle='rgba(255,200,100,0.15)';ctx.beginPath();ctx.arc(480,95,40+10*Math.sin(Date.now()/400),0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#FFD700';ctx.font='bold 22px Arial';ctx.fillText('篝火',480,135);
  ctx.fillStyle='rgba(255,255,255,0.55)';ctx.font='11px Arial';ctx.fillText('在此休息或强化',480,160);
  if(G.phase==='rest'){
    const healPct=G.difficulty>=2?0.25:G.difficulty>=1?0.3:0.35;
    const heal=Math.floor(G.maxHp*healPct);
    [{text:'❤️ 休息 +'+heal,sub:'回复'+(healPct*100)+'%生命值',y:220,color:'#FF6B6B',action:restHeal},
     {text:'⬆️ 升级',sub:'升级一张卡牌',y:310,color:'#FFD700',action:restUpgrade}].forEach(opt=>{
      const hov=G.mx>=250&&G.mx<=710&&G.my>=opt.y&&G.my<=opt.y+65;
      ctx.shadowColor=hov?opt.color+'44':'rgba(0,0,0,0.2)';ctx.shadowBlur=hov?20:8;
      ctx.fillStyle=hov?'rgba(255,255,255,0.35)':'rgba(255,255,255,0.03)';
      ctx.strokeStyle=hov?opt.color+'66':'rgba(255,255,255,0.06)';ctx.lineWidth=1.5;
      ctx.beginPath();ctx.roundRect(250,opt.y,460,65,12);ctx.fill();ctx.stroke();ctx.shadowBlur=0;
      ctx.fillStyle=opt.color;ctx.font='bold 18px Arial';ctx.textBaseline='middle';ctx.textAlign='center';ctx.fillText(opt.text,480,opt.y+28);
      ctx.fillStyle='rgba(255,255,255,0.3)';ctx.font='11px Arial';ctx.fillText(opt.sub,480,opt.y+50);
    });
    ctx.fillStyle='rgba(255,255,255,0.55)';ctx.font='12px Arial';ctx.textBaseline='bottom';ctx.textAlign='center';ctx.fillText('❤️ '+G.hp+'/'+G.maxHp,480,465);
  }else{
    // ---- 升级卡牌选择 (美化版) ----
    ctx.fillStyle='rgba(255,215,0,0.5)';ctx.font='bold 16px Arial';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText('⬆️ 选择要升级的卡牌',480,195);
    // 中间提示
    ctx.fillStyle='rgba(255,255,255,0.15)';ctx.font='10px Arial';ctx.textBaseline='top';ctx.textAlign='center';
    ctx.fillText('点击卡牌升级 · 已升级的不可再次升级',480,600);
    const all=G.deck,cw=130,ch=64,per=Math.min(6,all.length);
    const gapX=12,gapY=10,totalW=per*cw+(per-1)*gapX,sx=(W-totalW)/2;
    all.forEach((c,i)=>{
      const col=i%per,row=Math.floor(i/per),x=sx+col*(cw+gapX),y=215+row*(ch+gapY);
      const d=def(c);const t=d?d.type:'';
      const isGray=c.u&&!c._searingLevel;
      const hover=G.mx>=x&&G.mx<=x+cw&&G.my>=y&&G.my<=y+ch;
      // 卡片背景
      const typeColors={attack:'rgba(200,60,60,0.18)',skill:'rgba(60,100,200,0.18)',power:'rgba(220,200,0,0.18)'};
      const typeBorders={attack:'rgba(255,80,80,0.35)',skill:'rgba(80,130,255,0.35)',power:'rgba(220,200,0,0.35)'};
      ctx.shadowColor=hover?'rgba(255,215,0,0.2)':'rgba(0,0,0,0.1)';ctx.shadowBlur=hover?15:4;
      ctx.fillStyle=isGray?'rgba(60,60,60,0.1)':hover?typeColors[t]||'rgba(255,215,0,0.15)':'rgba(255,255,255,0.04)';
      ctx.strokeStyle=isGray?'rgba(60,60,60,0.08)':hover?typeBorders[t]||'rgba(255,215,0,0.4)':'rgba(255,255,255,0.08)';ctx.lineWidth=hover?2:1;
      ctx.beginPath();ctx.roundRect(x,y,cw,ch,10);ctx.fill();ctx.stroke();ctx.shadowBlur=0;
      // 顶部色条
      if(d&&!isGray){ctx.fillStyle=typeColors[t]||'rgba(255,255,255,0.05)';ctx.globalAlpha=0.3;
        ctx.beginPath();ctx.roundRect(x+1,y+1,cw-2,16,8);ctx.fill();ctx.globalAlpha=1;}
      // 费用圆
      if(d){ctx.fillStyle='#AD8BFF';ctx.beginPath();ctx.arc(x+16,y+14,9,0,Math.PI*2);ctx.fill();
        ctx.fillStyle='#fff';ctx.font='bold 9px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(c.c===-1?'X':c.c,x+16,y+14);}
      // 卡名
      ctx.fillStyle=isGray?'rgba(255,255,255,0.4)':'#fff';ctx.font='bold 11px Arial';ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.fillText(c.name+(c.u?'+':''),x+cw/2,y+40);
      // 类型图标
      const icons={attack:'⚔️',skill:'🛡️',power:'⭐'};
      ctx.fillStyle='rgba(255,255,255,0.15)';ctx.font='14px Arial';ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.fillText(icons[t]||'',x+cw/2,y+16);
      // 已升级标记
      if(isGray){ctx.fillStyle='rgba(100,255,100,0.3)';ctx.font='16px Arial';ctx.fillText('✓',x+cw-16,y+16);}
      // 灼热打击等级
      if(c._searingLevel){ctx.fillStyle='rgba(255,100,0,0.5)';ctx.font='8px Arial';ctx.textAlign='right';ctx.textBaseline='bottom';
        ctx.fillText('Lv'+(c._searingLevel+1),x+cw-6,y+ch-4);}
      // ---- 悬浮详情弹窗(左上角) ----
      if(hover&&d){
        const panelX=14,panelY=60,pw=320;
        const lines=[];
        lines.push({t:'⬆️ '+c.name+(c.u?'+':''),c:d.type==='attack'?'#FF6B6B':d.type==='skill'?'#64B5F6':'#FFD700',s:15,b:1});
        const typeNames={attack:'⚔️攻击',skill:'🛡️技能',power:'⭐能力'};
        lines.push({t:typeNames[t]+'  ⚡'+(c.c===-1?'X':c.c)+'费'+(c.u?'  ·  已升级':'  ·  可升级'),c:isGray?'rgba(100,255,100,0.5)':'rgba(255,255,255,0.4)',s:10,b:0});
        lines.push(null);
        if(c.u){
          lines.push({t:'当前效果:',c:'rgba(255,255,255,0.5)',s:9,b:0});
          lines.push({t:(d.uDesc||d.desc||''),c:'rgba(255,255,255,0.8)',s:10,b:0});
          if(d.desc!==d.uDesc){
            lines.push(null);
            lines.push({t:'原版效果:',c:'rgba(255,255,255,0.3)',s:8,b:0});
            lines.push({t:d.desc,c:'rgba(255,255,255,0.4)',s:9,b:0});
          }
        }else{
          lines.push({t:'当前效果:',c:'rgba(255,255,255,0.5)',s:9,b:0});
          lines.push({t:d.desc||'',c:'rgba(255,255,255,0.8)',s:10,b:0});
          if(d.uDesc&&d.uDesc!==d.desc){
            lines.push(null);
            lines.push({t:'⬆️ 升级后:',c:'#4CAF50',s:9,b:0});
            lines.push({t:d.uDesc,c:'rgba(255,255,255,0.6)',s:10,b:0});
          }
        }
        const lh=15,ph=12+lines.reduce((s,l)=>s+(l?lh:4),0);
        ctx.shadowColor='rgba(0,0,0,0.5)';ctx.shadowBlur=12;
        ctx.fillStyle='rgba(8,8,28,0.95)';ctx.beginPath();ctx.roundRect(panelX,panelY,pw,ph,8);ctx.fill();ctx.shadowBlur=0;
        ctx.strokeStyle=typeBorders[t]||'rgba(255,215,0,0.15)';ctx.lineWidth=1;ctx.beginPath();ctx.roundRect(panelX,panelY,pw,ph,8);ctx.stroke();
        let ly=panelY+10;
        lines.forEach(l=>{if(!l){ly+=3;return;}ctx.fillStyle=l.c;ctx.font=(l.b?'bold ':'')+l.s+'px Arial';ctx.textAlign='left';ctx.textBaseline='top';ctx.fillText(l.t,panelX+12,ly);ly+=lh;});
      }
    });
  }
}

// ===================================================================
//  渲染系统 — 随机事件
// ===================================================================
function drawEvent(){
  if(G.phase!=='event'||!G._eventData)return;
  ctx.fillStyle='rgba(5,5,20,0.88)';ctx.fillRect(0,0,W,H);
  ctx.fillStyle='rgba(255,215,0,0.05)';ctx.beginPath();ctx.roundRect(80,50,W-160,180,12);ctx.fill();
  ctx.strokeStyle='rgba(255,215,0,0.08)';ctx.lineWidth=1;ctx.beginPath();ctx.roundRect(80,50,W-160,180,12);ctx.stroke();
  ctx.fillStyle='#FFD700';ctx.font='bold 26px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('❓ '+G._eventData.name,480,90);
  ctx.fillStyle='rgba(255,255,255,0.5)';ctx.font='14px Arial';ctx.fillText(G._eventData.desc,480,140);
  G._eventData.opts.forEach((opt,i)=>{
    const y=250+i*100;
    const hover=G.mx>=180&&G.mx<=780&&G.my>=y&&G.my<=y+75;
    ctx.shadowColor=hover?'rgba(255,215,0,0.15)':'rgba(0,0,0,0.2)';ctx.shadowBlur=hover?15:5;
    ctx.fillStyle=hover?'rgba(255,255,255,0.07)':'rgba(255,255,255,0.03)';
    ctx.strokeStyle=hover?'rgba(255,215,0,0.3)':'rgba(255,255,255,0.06)';ctx.lineWidth=1;
    ctx.beginPath();ctx.roundRect(180,y,600,75,12);ctx.fill();ctx.stroke();ctx.shadowBlur=0;
    ctx.fillStyle='#FFD700';ctx.font='bold 16px Arial';ctx.textBaseline='middle';ctx.textAlign='center';ctx.fillText(opt.text,480,y+30);
    ctx.fillStyle='rgba(255,255,255,0.3)';ctx.font='11px Arial';ctx.fillText(opt.good||'',480,y+55);
  });
}

// ===================================================================
//  渲染系统 — 图鉴 (卡牌·遗物·药水·状态·怪物)
// ===================================================================
function drawCodex(){
  if(!G.codexOpen)return;
  ctx.fillStyle='rgba(0,0,0,0.88)';ctx.fillRect(0,0,W,H);
  ctx.fillStyle='#FFD700';ctx.font='bold 20px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('📖 图鉴',480,22);
  ctx.fillStyle='rgba(255,255,255,0.65)';ctx.font='9px Arial';ctx.fillText('按B关闭',480,42);
  const tabs=['卡牌','遗物','药水','状态','怪物'],tw=100,gap=10,tsx=(W-(tabs.length*tw+(tabs.length-1)*gap))/2;
  tabs.forEach((t,i)=>{
    const tx=tsx+i*(tw+gap),ty=55;
    const hover=G.mx>=tx&&G.mx<=tx+tw&&G.my>=ty&&G.my<=ty+28;
    ctx.fillStyle=i===G.codexTab?'rgba(255,215,0,0.2)':hover?'rgba(255,255,255,0.35)':'rgba(255,255,255,0.03)';
    ctx.strokeStyle=i===G.codexTab?'rgba(255,215,0,0.4)':'rgba(255,255,255,0.35)';ctx.lineWidth=1;
    ctx.beginPath();ctx.roundRect(tx,ty,tw,28,6);ctx.fill();ctx.stroke();
    ctx.fillStyle=i===G.codexTab?'#FFD700':'rgba(255,255,255,0.5)';ctx.font='11px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(t,tx+tw/2,ty+14);
  });
  if(G.codexTab===0){
    // ---- 卡牌标签: 分类筛选 (类型+费用+稀有度) ----
    const f1=[{k:'all',n:'全部'},{k:'attack',n:'⚔️攻击'},{k:'skill',n:'🛡️技能'},{k:'power',n:'⭐能力'}];
    const f2=[{k:'all',n:'全部'},{k:'common',n:'普通'},{k:'uncommon',n:'稀有'},{k:'rare',n:'传说'}];
    const f3=[{k:'all',n:'全部'},{k:'0',n:'0费'},{k:'1',n:'1费'},{k:'2',n:'2费'},{k:'3',n:'3+费'},{k:'X',n:'X费'}];
    const bw=68,bgap=6,by1=88,by2=115,by3=142;
    // 第一行: 类型筛选
    const ft1=f1.length*bw+(f1.length-1)*bgap,fsx1=(W-ft1)/2;
    f1.forEach((t,i)=>{const fx=fsx1+i*(bw+bgap);const act=G.codexFilter===t.k;
      ctx.fillStyle=act?'rgba(255,215,0,0.2)':'rgba(255,255,255,0.04)';ctx.strokeStyle=act?'rgba(255,215,0,0.4)':'rgba(255,255,255,0.12)';ctx.lineWidth=1;
      ctx.beginPath();ctx.roundRect(fx,by1,bw,22,5);ctx.fill();ctx.stroke();
      ctx.fillStyle=act?'#FFD700':'rgba(255,255,255,0.5)';ctx.font='10px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(t.n,fx+bw/2,by1+11);});
    // 第二行: 稀有度筛选
    const ft2=f2.length*bw+(f2.length-1)*bgap,fsx2=(W-ft2)/2;
    f2.forEach((t,i)=>{const fx=fsx2+i*(bw+bgap);const act=G.codexRarity===t.k;
      ctx.fillStyle=act?'rgba(100,180,255,0.2)':'rgba(255,255,255,0.04)';ctx.strokeStyle=act?'rgba(100,180,255,0.4)':'rgba(255,255,255,0.12)';ctx.lineWidth=1;
      ctx.beginPath();ctx.roundRect(fx,by2,bw,22,5);ctx.fill();ctx.stroke();
      ctx.fillStyle=act?'#64B5F6':'rgba(255,255,255,0.5)';ctx.font='10px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(t.n,fx+bw/2,by2+11);});
    // 第三行: 费用筛选
    const ft3=f3.length*bw+(f3.length-1)*bgap,fsx3=(W-ft3)/2;
    f3.forEach((t,i)=>{const fx=fsx3+i*(bw+bgap);const act=G.codexCost===t.k;
      ctx.fillStyle=act?'rgba(173,139,255,0.2)':'rgba(255,255,255,0.04)';ctx.strokeStyle=act?'rgba(173,139,255,0.4)':'rgba(255,255,255,0.12)';ctx.lineWidth=1;
      ctx.beginPath();ctx.roundRect(fx,by3,bw,22,5);ctx.fill();ctx.stroke();
      ctx.fillStyle=act?'#AD8BFF':'rgba(255,255,255,0.5)';ctx.font='10px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(t.n,fx+bw/2,by3+11);});
    // 筛选结果
    const filtered=ALL_CARDS.filter(c=>{
      if(c.rarity==='status')return false;
      if(G.codexFilter!=='all'&&c.type!==G.codexFilter)return false;
      if(G.codexRarity!=='all'&&c.rarity!==G.codexRarity)return false;
      if(G.codexCost!=='all'){
        if(G.codexCost==='X'&&c.c!==-1)return false;
        if(G.codexCost==='0'&&c.c!==0)return false;
        if(G.codexCost==='1'&&c.c!==1)return false;
        if(G.codexCost==='2'&&c.c!==2)return false;
        if(G.codexCost==='3+'&&c.c<3)return false;
      }
      return true;
    });
    const rowH=24,cardsPerPage=Math.floor((H-172)/rowH);
    const totalPages=Math.max(1,Math.ceil(filtered.length/cardsPerPage));
    G.codexPages[G.codexTab]=Math.min(G.codexPages[G.codexTab]||0,totalPages-1);
    const pg=G.codexPages[G.codexTab];const start=pg*cardsPerPage,end=Math.min(start+cardsPerPage,filtered.length);
    let y=172;
    for(let i=start;i<end;i++){
      const c=filtered[i];
      // 交替行背景(更明显)
      ctx.fillStyle=i%2===0?'rgba(255,255,255,0.04)':'rgba(255,255,255,0.01)';
      ctx.beginPath();ctx.roundRect(10,y-2,W-20,rowH-2,4);ctx.fill();
      // 稀有度色条(左侧)
      const rarCol={basic:'#888',common:'#aaa',uncommon:'#64B5F6',rare:'#FFD700'}[c.rarity]||'#888';
      ctx.fillStyle=rarCol;ctx.beginPath();ctx.roundRect(12,y,3,rowH-4,2);ctx.fill();
      // 类型图标
      const tIcon={attack:'⚔️',skill:'🛡️',power:'⭐'}[c.type]||'';
      ctx.fillStyle='rgba(255,255,255,0.4)';ctx.font='13px Arial';ctx.textAlign='left';ctx.textBaseline='middle';ctx.fillText(tIcon,22,y+rowH/2-1);
      // 费用圆
      ctx.fillStyle='#AD8BFF';ctx.beginPath();ctx.arc(52,y+rowH/2-1,9,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#fff';ctx.font='bold 9px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(c.c===-1?'X':c.c,52,y+rowH/2-1);
      // 卡名(加粗)
      ctx.fillStyle='#fff';ctx.font='bold 11px Arial';ctx.textAlign='left';ctx.textBaseline='middle';ctx.fillText(c.name,70,y+rowH/2-1);
      // 稀有度标签
      const rn={basic:'基础',common:'普通',uncommon:'稀有',rare:'传说'}[c.rarity]||'';
      ctx.fillStyle=rarCol+'88';ctx.font='8px Arial';ctx.fillText(rn,195,y+rowH/2-1);
      // 描述(截断)
      ctx.fillStyle='rgba(255,255,255,0.35)';ctx.font='9px Arial';
      const desc=(c.desc||'')+(c.uDesc?' → '+c.uDesc:'');
      ctx.fillText(desc.length>42?desc.slice(0,42)+'…':desc,240,y+rowH/2-1);
      y+=rowH;
    }
    // 底部统计+翻页
    ctx.fillStyle='rgba(255,255,255,0.35)';ctx.font='10px Arial';ctx.textAlign='center';ctx.textBaseline='bottom';
    ctx.fillText('📊 共'+filtered.length+'张  ·  第'+(G.codexPages[G.codexTab]+1)+'/'+totalPages+'页',480,668);
    if(totalPages>1){
      ctx.fillStyle='rgba(255,255,255,0.55)';ctx.font='10px Arial';ctx.textAlign='center';ctx.textBaseline='bottom';
      ctx.fillText('第'+(G.codexPages[G.codexTab]+1)+'/'+totalPages+'页 共'+filtered.length+'张',480,668);
      const prevH=G.mx>=380&&G.mx<=420&&G.my>=642&&G.my<=662;
      const nextH=G.mx>=540&&G.mx<=580&&G.my>=642&&G.my<=662;
      ctx.fillStyle=prevH?'rgba(255,215,0,0.5)':'rgba(255,255,255,0.65)';ctx.font='12px Arial';ctx.fillText('◀ 上一页',400,662);
      ctx.fillStyle=nextH?'rgba(255,215,0,0.5)':'rgba(255,255,255,0.65)';ctx.fillText('下一页 ▶',560,662);
    }
  }else if(G.codexTab===1){
    // ---- 遗物标签: 4列网格+分页 ----
    ctx.fillStyle='rgba(255,255,255,0.8)';ctx.font='bold 12px Arial';ctx.textAlign='left';ctx.textBaseline='top';ctx.fillText('共'+RELICS.length+'件遗物',20,95);
    const perRow=4,relicW=220,relicH=56,gapX=10,gapY=8;
    const totalW=perRow*relicW+(perRow-1)*gapX,startX=(W-totalW)/2;
    const rowsVisible=Math.floor((H-120)/(relicH+gapY));
    const relicsPerPage=perRow*rowsVisible;
    const totalPages=Math.max(1,Math.ceil(RELICS.length/relicsPerPage));
    G.codexPages[G.codexTab]=Math.min(G.codexPages[G.codexTab]||0,totalPages-1);
    const pg=G.codexPages[G.codexTab];const start=pg*relicsPerPage,end=Math.min(start+relicsPerPage,RELICS.length);
    for(let i=start;i<end;i++){
      const r=RELICS[i];
      const col=(i-start)%perRow,row=Math.floor((i-start)/perRow);
      const x=startX+col*(relicW+gapX),y=120+row*(relicH+gapY);
      ctx.fillStyle='rgba(255,255,255,0.04)';ctx.strokeStyle='rgba(255,255,255,0.1)';ctx.lineWidth=1;
      ctx.beginPath();ctx.roundRect(x,y,relicW,relicH,6);ctx.fill();ctx.stroke();
      ctx.fillStyle='#FFD700';ctx.font='14px Arial';ctx.textAlign='left';ctx.textBaseline='middle';ctx.fillText('🔮',x+8,y+relicH/2);
      ctx.fillStyle='rgba(255,255,255,0.8)';ctx.font='bold 10px Arial';ctx.fillText(r.name,x+30,y+relicH/2-6);
      ctx.fillStyle='rgba(255,255,255,0.45)';ctx.font='8px Arial';ctx.fillText((r.desc||'').slice(0,28),x+30,y+relicH/2+8);
    }
    if(totalPages>1){
      ctx.fillStyle='rgba(255,255,255,0.55)';ctx.font='10px Arial';ctx.textAlign='center';ctx.textBaseline='bottom';
      ctx.fillText('第'+(G.codexPages[G.codexTab]+1)+'/'+totalPages+'页 共'+RELICS.length+'件',480,668);
      const prevH=G.mx>=380&&G.mx<=420&&G.my>=642&&G.my<=662;
      const nextH=G.mx>=540&&G.mx<=580&&G.my>=642&&G.my<=662;
      ctx.fillStyle=prevH?'rgba(255,215,0,0.5)':'rgba(255,255,255,0.65)';ctx.font='12px Arial';ctx.fillText('◀ 上一页',400,662);
      ctx.fillStyle=nextH?'rgba(255,215,0,0.5)':'rgba(255,255,255,0.65)';ctx.fillText('下一页 ▶',560,662);
    }
  }else if(G.codexTab===2){
    // ---- 药水标签: 简单列表 ----
    ctx.fillStyle='rgba(255,255,255,0.8)';ctx.font='bold 12px Arial';ctx.textAlign='left';ctx.textBaseline='top';ctx.fillText('共'+POTIONS.length+'种药水',20,95);
    POTIONS.forEach((p,i)=>{
      const y=120+i*34;
      if(y>660)return;
      ctx.fillStyle='rgba(255,255,255,0.04)';ctx.beginPath();ctx.roundRect(40,y,W-80,30,6);ctx.fill();
      ctx.fillStyle='#E040FB';ctx.font='12px Arial';ctx.textAlign='left';ctx.textBaseline='middle';ctx.fillText('🧪',50,y+15);
      ctx.fillStyle='rgba(255,255,255,0.8)';ctx.font='bold 10px Arial';ctx.fillText(p.name,70,y+15);
      ctx.fillStyle='rgba(255,255,255,0.45)';ctx.font='9px Arial';ctx.fillText(p.desc,180,y+15);
    });
  }else if(G.codexTab===3){
    // ---- 状态标签: 分组展示 (基础属性/战斗状态/角色专属) ----
    const groups=[
      {name:'基础属性',color:'#FFD700',items:[
        {name:'力量',desc:'每点+1攻击伤害,多段每段+1',color:'#FF6B6B'},
        {name:'敏捷',desc:'每点+1格挡',color:'#64B5F6'},
        {name:'集中',desc:'每点球位+2伤害/+2格挡',color:'#E040FB'},
        {name:'念力',desc:'每点给所有敌人造成3伤害(回合末)',color:'#9C27B0'},
      ]},
      {name:'战斗状态',color:'#64B5F6',items:[
        {name:'虚弱',desc:'造成攻击-25%,回合末-1',color:'#64B5F6'},
        {name:'易伤',desc:'受到攻击伤害+50%,回合末-1',color:'#FF9800'},
        {name:'中毒',desc:'回合末受层数伤害然后-1',color:'#9C27B0'},
        {name:'格挡',desc:'吸收伤害,回合初清零',color:'#64B5F6'},
        {name:'荆棘',desc:'受到攻击时反伤',color:'#4CAF50'},
        {name:'人工制品',desc:'抵消1次负面效果',color:'#FFD700'},
        {name:'缓冲',desc:'抵消1次伤害',color:'#00BCD4'},
        {name:'金属化',desc:'每回合获得格挡',color:'#78909C'},
        {name:'虚无(wraithForm)',desc:'每回合-1力量',color:'#607D8B'},
        {name:'消耗(Feel No Pain)',desc:'消耗牌时获得格挡',color:'#795548'},
        {name:'进化',desc:'抽到状态牌时抽1张',color:'#FF5722'},
        {name:'涂毒',desc:'攻击时施加中毒',color:'#9C27B0'},
        {name:'幻影杀手',desc:'对易伤敌人额外+50%伤害',color:'#E91E63'},
        {name:'狂暴(Berserk)',desc:'每回合+1力量但+1易伤',color:'#F44336'},
        {name:'残忍(Brutality)',desc:'每回合抽1张,失去1血',color:'#D32F2F'},
        {name:'撕裂(Rupture)',desc:'受伤时+1力量',color:'#C62828'},
        {name:'自燃(Combust)',desc:'每回合失去1血对全体敌人+5伤',color:'#FF5722'},
        {name:'千刀万剐',desc:'每打一张牌对随机敌人+1伤',color:'#FF9800'},
        {name:'残影',desc:'保留所有手牌不弃',color:'#7C4DFF'},
      ]},
      {name:'角色专属',color:'#E040FB',items:[
        {name:'神格姿态',desc:'每回合+2能量,伤害+2倍,3层后真言',color:'#FFD700'},
        {name:'怒火姿态',desc:'伤害翻倍但受到伤害+50%',color:'#FF6B6B'},
        {name:'宁静姿态',desc:'每回合获得2点格挡,退出+2能量',color:'#64B5F6'},
      ]},
    ];
    ctx.fillStyle='rgba(255,255,255,0.8)';ctx.font='bold 14px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('状态效果',480,95);
    let y=120;
    groups.forEach(g=>{
      if(y>660)return;
      ctx.fillStyle=g.color;ctx.font='bold 11px Arial';ctx.textAlign='left';ctx.textBaseline='top';ctx.fillText('■ '+g.name,30,y);
      y+=20;
      g.items.forEach(item=>{
        if(y>660)return;
        ctx.fillStyle='rgba(255,255,255,0.04)';ctx.beginPath();ctx.roundRect(40,y,W-80,24,4);ctx.fill();
        ctx.fillStyle=item.color;ctx.font='bold 10px Arial';ctx.textAlign='left';ctx.textBaseline='middle';ctx.fillText(item.name,55,y+12);
        ctx.fillStyle='rgba(255,255,255,0.5)';ctx.font='9px Arial';ctx.fillText(item.desc,180,y+12);
        y+=26;
      });
      y+=4;
    });
  }else{
    // ---- 怪物标签: 显示全部幕的敌人 + 分页 ----
    const allEnemies=ET;
    const enemiesPerPage=Math.floor((H-120)/36);
    const totalPages=Math.max(1,Math.ceil(allEnemies.length/enemiesPerPage));
    G.codexPages[G.codexTab]=Math.min(G.codexPages[G.codexTab]||0,totalPages-1);
    const pg=G.codexPages[G.codexTab];const start=pg*enemiesPerPage,end=Math.min(start+enemiesPerPage,allEnemies.length);
    ctx.fillStyle='rgba(255,255,255,0.8)';ctx.font='bold 14px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('全部敌人',480,95);
    let y=120;
    for(let i=start;i<end;i++){
      const e=allEnemies[i];
      const color=e.boss?'#FFD700':e.elite?'#E040FB':'rgba(255,255,255,0.6)';
      ctx.fillStyle=color;ctx.font='bold 12px Arial';ctx.textAlign='left';ctx.textBaseline='top';ctx.fillText(e.name,30,y);
      ctx.fillStyle='rgba(255,255,255,0.3)';ctx.font='9px Arial';ctx.fillText('第'+e.act+'幕'+(e.boss?'·BOSS':e.elite?'·精英':''),150,y);
      e.mv.forEach((m,mi)=>{
        let info='';
        if(m.t==='a')info='⚔️'+m.d+'伤';
        else if(m.t==='d')info='🛡️'+m.b+'甲';
        else if(m.t==='db')info='💫'+(m.ef==='vuln'?'易伤':'虚弱')+m.v;
        else if(m.t==='b')info='⬆️'+(m.ef==='str'?'力':'甲')+'+'+m.v;
        else if(m.t==='m')info='🔪'+m.d+'伤x'+m.n;
        else if(m.t==='s')info='📤塞牌:'+(m.sCard||'')+'x'+m.n;
        else if(m.t==='h')info='💚治疗'+m.v;
        ctx.fillStyle='rgba(255,255,255,0.4)';ctx.font='9px Arial';ctx.fillText(info,30+mi*135,y+16);
      });
      y+=36;
    }
    if(totalPages>1){
      ctx.fillStyle='rgba(255,255,255,0.55)';ctx.font='10px Arial';ctx.textAlign='center';ctx.textBaseline='bottom';
      ctx.fillText('第'+(G.codexPages[G.codexTab]+1)+'/'+totalPages+'页 共'+allEnemies.length+'个敌人',480,668);
      const prevH=G.mx>=380&&G.mx<=420&&G.my>=642&&G.my<=662;
      const nextH=G.mx>=540&&G.mx<=580&&G.my>=642&&G.my<=662;
      ctx.fillStyle=prevH?'rgba(255,215,0,0.5)':'rgba(255,255,255,0.65)';ctx.font='12px Arial';ctx.fillText('◀ 上一页',400,662);
      ctx.fillStyle=nextH?'rgba(255,215,0,0.5)':'rgba(255,255,255,0.65)';ctx.fillText('下一页 ▶',560,662);
    }
  }
}

function drawPileView(){
  if(!G.pileView)return;
  ctx.fillStyle='rgba(0,0,0,0.88)';ctx.fillRect(0,0,W,H);
  ctx.fillStyle='#FFD700';ctx.font='bold 20px Arial';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillText(G.pileView==='draw'?'📤 抽牌堆':'📥 弃牌堆',480,22);
  ctx.fillStyle='rgba(255,255,255,0.65)';ctx.font='10px Arial';ctx.fillText('点击空白关闭 · 共'+(G.pileView==='draw'?G.draw:G.discard).length+'张',480,44);
  const pile=G.pileView==='draw'?G.draw:G.discard;
  if(!pile||pile.length===0){ctx.fillStyle='rgba(255,255,255,0.3)';ctx.font='16px Arial';ctx.fillText('(空)',480,300);return;}
  const per=6,cw=130,ch=40,gap=6,sx=(W-per*(cw+gap))/2;
  pile.forEach((c,i)=>{
    const col=i%per,row=Math.floor(i/per),x=sx+col*(cw+gap),y=60+row*(ch+gap);
    if(y>640)return;
    const d=def(c),t=d?d.type:'';
    const colors={attack:'rgba(200,60,60,0.15)',skill:'rgba(60,100,200,0.15)',power:'rgba(220,200,0,0.15)',status:'rgba(160,160,160,0.3)'};
    const borders={attack:'rgba(255,80,80,0.3)',skill:'rgba(80,130,255,0.3)',power:'rgba(220,200,0,0.3)',status:'rgba(160,160,160,0.3)'};
    ctx.fillStyle=colors[t]||'rgba(255,255,255,0.04)';ctx.strokeStyle=borders[t]||'rgba(255,255,255,0.06)';ctx.lineWidth=1.2;
    ctx.beginPath();ctx.roundRect(x,y,cw,ch,6);ctx.fill();ctx.stroke();
    ctx.fillStyle='#AD8BFF';ctx.font='bold 10px Arial';ctx.textAlign='left';ctx.textBaseline='middle';ctx.fillText('⚡'+(c.c===-1?'X':c.c),x+6,y+ch/2);
    ctx.fillStyle='#eee';ctx.font='bold 12px Arial';ctx.textAlign='center';ctx.fillText((c.name+(c.u?'+':'')).slice(0,8),x+cw/2,y+ch/2);
    if(c.u){ctx.fillStyle='rgba(255,215,0,0.4)';ctx.font='9px Arial';ctx.textAlign='right';ctx.fillText('+',x+cw-6,y+ch/2-4);}
    // 悬浮显示描述
    const hover=G.mx>=x&&G.mx<=x+cw&&G.my>=y&&G.my<=y+ch;
    if(hover&&d){ctx.fillStyle='rgba(0,0,0,0.8)';ctx.beginPath();ctx.roundRect(Math.min(x+5,W-210),y-18,200,18,4);ctx.fill();
      ctx.fillStyle='rgba(255,255,255,0.5)';ctx.font='9px Arial';ctx.textAlign='left';ctx.textBaseline='middle';ctx.fillText((d.desc||'')+(c.u&&d.uDesc?' → '+d.uDesc:''),Math.min(x+8,W-202),y-9);}
  });
}

function drawDeckView(){
  if(!G._deckViewOpen)return;
  ctx.fillStyle='rgba(0,0,0,0.88)';ctx.fillRect(0,0,W,H);
  ctx.fillStyle='#FFD700';ctx.font='bold 20px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('📜 卡组 · 共'+G.deck.length+'张',480,20);
  ctx.fillStyle='rgba(255,255,255,0.4)';ctx.font='9px Arial';ctx.fillText('按D关闭',480,36);
  // 卡组统计
  const types=['attack','skill','power','status'];const names=['⚔️ 攻击','🛡️ 技能','⭐ 能力','📦 状态'];const colors=['#FF6B6B','#64B5F6','#FFD700','#888'];
  const counts=types.map(t=>G.deck.filter(c=>{const d=def(c);return d&&d.type===t;}).length);
  ctx.fillStyle='rgba(255,255,255,0.65)';ctx.font='10px Arial';ctx.fillText('共'+G.deck.length+'张 · D关闭',480,44);
  counts.forEach((n,i)=>{if(n>0){ctx.fillStyle=colors[i];ctx.font='9px Arial';ctx.textAlign='center';ctx.textBaseline='top';ctx.fillText(names[i]+n,200+i*140,48);}});
  const per=8,cw=100,ch=42,gap=5,sx=(W-per*(cw+gap))/2;
  G.deck.forEach((c,i)=>{
    const col=i%per,row=Math.floor(i/per),x=sx+col*(cw+gap),y=64+row*(ch+gap);
    if(y>640)return;
    const d=def(c),t=d?d.type:'';
    const colors={attack:'rgba(200,50,50,0.13)',skill:'rgba(50,100,220,0.13)',power:'rgba(220,200,0,0.13)',status:'rgba(100,100,100,0.08)'};
    const borders={attack:'rgba(255,80,80,0.25)',skill:'rgba(80,130,255,0.25)',power:'rgba(220,200,0,0.25)',status:'rgba(100,100,100,0.08)'};
    ctx.fillStyle=colors[t]||'rgba(255,255,255,0.04)';ctx.strokeStyle=borders[t]||'rgba(255,255,255,0.06)';ctx.lineWidth=1.2;
    ctx.beginPath();ctx.roundRect(x,y,cw,ch,6);ctx.fill();ctx.stroke();
    ctx.fillStyle='#AD8BFF';ctx.font='bold 10px Arial';ctx.textAlign='left';ctx.textBaseline='middle';ctx.fillText('⚡'+c.c,x+6,y+ch/2);
    ctx.fillStyle='rgba(255,255,255,0.8)';ctx.font='bold 11px Arial';ctx.textAlign='center';ctx.fillText((c.name+(c.u?'+':'')).slice(0,7),x+cw/2,y+ch/2);
    if(c.u){ctx.fillStyle='rgba(255,215,0,0.5)';ctx.font='10px Arial';ctx.textAlign='right';ctx.fillText('+',x+cw-8,y+ch/2-5);}
    if(t==='status'){ctx.fillStyle='rgba(255,255,255,0.65)';ctx.font='8px Arial';ctx.textAlign='right';ctx.textBaseline='bottom';ctx.fillText('状态',x+cw-6,y+ch-4);}
    // 悬浮显示描述
    const hover=G.mx>=x&&G.mx<=x+cw&&G.my>=y&&G.my<=y+ch;
    if(hover&&d){ctx.fillStyle='rgba(0,0,0,0.8)';ctx.beginPath();ctx.roundRect(Math.min(x+5,W-210),y-18,200,18,4);ctx.fill();
      ctx.fillStyle='rgba(255,255,255,0.5)';ctx.font='9px Arial';ctx.textAlign='left';ctx.textBaseline='middle';ctx.fillText((d.desc||'')+(c.u&&d.uDesc?' → '+d.uDesc:''),Math.min(x+8,W-202),y-9);}
  });
}

function drawSeekPick(){
  if(G.phase!=='seekPick')return;
  const isPool=G._seekSource==='pool';
  const isDiscard=G._seekSource==='discard';
  const sourceName=isPool?'随机池':(isDiscard?'弃牌堆':'抽牌堆');
  const rawPile=isPool?(G._seekCards||[]):(isDiscard?G.discard:G.draw);
  ctx.fillStyle='rgba(0,0,0,0.82)';ctx.fillRect(0,0,W,360);
  ctx.fillStyle='#FFD700';ctx.font='bold 18px Arial';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillText('🔍 从'+sourceName+'选择'+'('+((G._seekCount||1)-(G._seekPicks||0))+'张)',480,28);
  ctx.fillStyle='rgba(255,255,255,0.65)';ctx.font='10px Arial';ctx.fillText('点击选择·右键取消',480,50);
  let displayPile=[];
  if(isPool){displayPile=rawPile;}
  else{displayPile=rawPile.filter(c=>{if(!c)return false;if(G._seekFilter==='any')return true;const d=def(c);return d&&d.type===G._seekFilter;});}
  if(!displayPile||displayPile.length===0){ctx.fillStyle='rgba(255,255,255,0.3)';ctx.font='16px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('(无符合条件的牌)',480,150);return;}
  const per=5,cw=150,ch=36,gap=8,sx=(W-per*(cw+gap))/2;
  displayPile.forEach((c,i)=>{
    const col=i%per,row=Math.floor(i/per),x=sx+col*(cw+gap),y=68+row*(ch+gap);
    if(y>340)return;
    const card=isPool?c:c;const d=isPool?def(c):def(c);const t=d?d.type:'';
    const colors={attack:'rgba(200,60,60,0.15)',skill:'rgba(60,100,200,0.15)',power:'rgba(220,200,0,0.15)',status:'rgba(160,160,160,0.3)'};
    const borders={attack:'rgba(255,80,80,0.3)',skill:'rgba(80,130,255,0.3)',power:'rgba(220,200,0,0.3)',status:'rgba(160,160,160,0.3)'};
    const hover=G.mx>=x&&G.mx<=x+cw&&G.my>=y&&G.my<=y+ch;
    ctx.fillStyle=hover?'rgba(255,215,0,0.35)':(colors[t]||'rgba(255,255,255,0.04)');
    ctx.strokeStyle=hover?'rgba(255,215,0,0.5)':(borders[t]||'rgba(255,255,255,0.06)');ctx.lineWidth=hover?2:1.2;
    ctx.beginPath();ctx.roundRect(x,y,cw,ch,6);ctx.fill();ctx.stroke();
    ctx.fillStyle='#AD8BFF';ctx.font='bold 10px Arial';ctx.textAlign='left';ctx.textBaseline='middle';ctx.fillText('⚡'+c.c,x+8,y+ch/2);
    ctx.fillStyle='#eee';ctx.font='bold 12px Arial';ctx.textAlign='center';ctx.fillText((c.name+(c.u?'+':'')).slice(0,9),x+cw/2,y+ch/2);
    if(hover&&d){ctx.fillStyle='rgba(0,0,0,0.8)';ctx.beginPath();ctx.roundRect(Math.min(x+5,W-210),y-18,200,18,4);ctx.fill();
      ctx.fillStyle='rgba(255,255,255,0.5)';ctx.font='9px Arial';ctx.textAlign='left';ctx.textBaseline='middle';ctx.fillText((d.desc||'')+(c.u&&d.uDesc?' → '+d.uDesc:''),Math.min(x+8,W-202),y-9);}
  });
  ctx.fillStyle='rgba(255,255,255,0.45)';ctx.font='10px Arial';ctx.textAlign='center';ctx.textBaseline='bottom';ctx.fillText('共'+displayPile.length+'张可选',480,355);
}

// ===================================================================
//  渲染系统 — 地图面板
// ===================================================================
// ===================================================================
//  渲染系统 — 路径选择 (三选一)
// ===================================================================
function drawPathChoice(){
  if(G.phase!=='pathChoice'||!G._pathOptions||!G._pathOptions.length)return;
  const opts=G._pathOptions;
  const colors=['#FF6B6B','#64B5F6','#4CAF50'];
  const icons={monster:'⚔️',elite:'💀',rest:'🔥',treasure:'📦',shop:'🏪',boss:'👑',event:'❓'};
  const labels=['A · 激进路','B · 平衡路','C · 安逸路'];
  const tooltips=['更多精英挑战, 高风险高回报','各类型均匀分布, 稳扎稳打','更多篝火商店, 适合发育恢复'];
  // 标题
  ctx.fillStyle='rgba(5,5,20,0.88)';ctx.fillRect(0,0,W,H);
  ctx.fillStyle='#FFD700';ctx.font='bold 26px Arial';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillText('🗺️ 选择前进路线',480,50);
  ctx.fillStyle='rgba(255,255,255,0.4)';ctx.font='12px Arial';ctx.fillText('第 '+(G.floor)+' 层 · 第 '+(act(G.floor))+' 幕',480,78);
  // 三路线卡片
  const cw=250,ch=250,gap=40,total=cw*3+gap*2,sx=(W-total)/2;
  opts.forEach((opt,i)=>{
    const x=sx+i*(cw+gap),y=110;
    const hover=G.mx>=x&&G.mx<=x+cw&&G.my>=y&&G.my<=y+ch;
    // 卡片背景
    ctx.shadowColor=hover?colors[i]+'55':'rgba(0,0,0,0.3)';ctx.shadowBlur=hover?30:10;
    ctx.fillStyle=hover?colors[i]+'18':'rgba(30,30,60,0.6)';
    ctx.strokeStyle=hover?colors[i]+'88':'rgba(255,255,255,0.1)';ctx.lineWidth=hover?2.5:1;
    ctx.beginPath();ctx.roundRect(x,y,cw,ch,12);ctx.fill();ctx.stroke();ctx.shadowBlur=0;
    // 路线标签
    ctx.fillStyle=colors[i];ctx.font='bold 10px Arial';ctx.textAlign='center';ctx.textBaseline='top';
    ctx.fillText(labels[i],x+cw/2,y+10);
    // 分隔线
    ctx.fillStyle=colors[i]+'44';ctx.beginPath();ctx.roundRect(x+20,y+24,cw-40,1,0);ctx.fill();
    // 房间类型大图标
    const ico=icons[opt.type]||'?';
    ctx.fillStyle=colors[i];ctx.font='48px Arial';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText(ico,x+cw/2,y+75);
    // 房间名称
    const rtName=RN[opt.type]||opt.type;
    ctx.fillStyle='#fff';ctx.font='bold 18px Arial';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText(rtName,x+cw/2,y+125);
    // 路线描述
    ctx.fillStyle=colors[i];ctx.font='11px Arial';ctx.fillText(opt.label+' · '+opt.desc,x+cw/2,y+152);
    // 提醒文字
    ctx.fillStyle='rgba(255,255,255,0.3)';ctx.font='9px Arial';ctx.fillText(tooltips[i],x+cw/2,y+175);
    // 看未来功能: 预览这条路接下来的下一个房间
    const nextStep=G._actStep+1;
    const a=act(G.floor);
    if(nextStep<14){
      const nextType=ROUTES[a-1][opt.route][nextStep];
      const nextIco=icons[nextType]||'?';
      const nextNm=RN[nextType]||'?';
      ctx.fillStyle='rgba(255,255,255,0.08)';ctx.beginPath();ctx.roundRect(x+40,y+188,cw-80,22,8);ctx.fill();
      ctx.fillStyle='rgba(255,255,255,0.3)';ctx.font='9px Arial';ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.fillText('下一层: '+nextIco+' '+nextNm,x+cw/2,y+199);
    }
    // 悬浮高亮边框
    if(hover){ctx.fillStyle='rgba(255,255,255,0.03)';ctx.beginPath();ctx.roundRect(x-4,y-4,cw+8,ch+8,14);ctx.fill();}
  });
  ctx.fillStyle='rgba(255,255,255,0.15)';ctx.font='10px Arial';ctx.textAlign='center';ctx.textBaseline='bottom';
  ctx.fillText('点击选择路线 · 每条路线决定本层房间类型',480,370);
}

function drawMap(){
  if(!G.mapOpen)return;
  const routeIdx=G._routeChoice||0;
  const curAct=act(G.floor);
  const step=G._actStep;
  const routeNames=['A·激进','B·平衡','C·安逸'];
  const routeColors=['#FF6B6B','#64B5F6','#4CAF50'];
  ctx.fillStyle='rgba(5,5,20,0.92)';ctx.fillRect(0,0,W,H);
  // 顶部标题
  ctx.fillStyle='rgba(16,16,45,0.9)';ctx.beginPath();ctx.roundRect(10,8,W-20,46,10);ctx.fill();
  ctx.fillStyle='#FFD700';ctx.font='bold 20px Arial';ctx.textAlign='left';ctx.textBaseline='middle';ctx.fillText('🗺️ 第'+curAct+'幕 · 路线 '+(routeIdx+1)+'/'+routeNames[routeIdx],24,31);
  ctx.fillStyle='rgba(255,255,255,0.35)';ctx.font='9px Arial';ctx.textAlign='right';ctx.textBaseline='middle';ctx.fillText('M关闭 · 共15层',W-24,31);
  // 路线状态条
  ctx.fillStyle=routeColors[routeIdx]+'33';ctx.beginPath();ctx.roundRect(10,56,W-20,18,6);ctx.fill();
  ctx.fillStyle='rgba(255,255,255,0.5)';ctx.font='9px Arial';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillText('⚔️战斗 💀精英 🔥篝火 🏪商店 📦宝箱 ❓事件 👑BOSS',480,65);
  // 当前幕所有15步
  const rowH=36,startY=82;
  for(let s=0;s<15;s++){
    const y=startY+s*rowH;
    const f=(curAct-1)*15+s+1;
    const isPast=s<step,isCur=s===step,isFuture=s>step;
    const roomType=ROUTES[curAct-1][routeIdx][s];
    const ico=RM[roomType]||'?',nm=RN[roomType]||'?';
    // 行背景(交替)
    if(s%2===0){ctx.fillStyle='rgba(255,255,255,0.02)';ctx.beginPath();ctx.roundRect(12,y-2,W-24,rowH-2,4);ctx.fill();}
    // 当前层高亮
    if(isCur){ctx.fillStyle='rgba(255,215,0,0.08)';ctx.beginPath();ctx.roundRect(8,y-4,W-16,rowH+2,6);ctx.fill();
      ctx.strokeStyle='rgba(255,215,0,0.2)';ctx.lineWidth=1;ctx.beginPath();ctx.roundRect(8,y-4,W-16,rowH+2,6);ctx.stroke();}
    // 左侧: 楼层号
    const fColor=isCur?'#FFD700':isPast?'rgba(255,255,255,0.35)':'rgba(255,255,255,0.15)';
    ctx.fillStyle=fColor;ctx.font=isCur?'bold 12px Arial':'10px Arial';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText(f+'F',28,y+rowH/2-1);
    // 左侧: 连接线(竖线)
    if(s>0){ctx.strokeStyle=isPast?'rgba(255,255,255,0.1)':'rgba(255,255,255,0.04)';ctx.lineWidth=1;
      ctx.beginPath();ctx.moveTo(28,y-rowH/2);ctx.lineTo(28,y-rowH/2+4);ctx.stroke();}
    // 房间图标(大)
    const icoSize=isCur?32:(isPast?22:18);
    const icoColor=isCur?routeColors[routeIdx]:(isPast?'rgba(255,255,255,0.8)':'rgba(255,255,255,0.25)');
    ctx.fillStyle=icoColor;ctx.font=icoSize+'px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(ico,80,y+rowH/2-1);
    // 房间名称
    ctx.fillStyle=isCur?'#fff':(isPast?'rgba(255,255,255,0.6)':'rgba(255,255,255,0.25)');
    ctx.font=isCur?'bold 14px Arial':(isPast?'12px Arial':'10px Arial');ctx.textAlign='left';ctx.textBaseline='middle';
    ctx.fillText(nm,110,y+rowH/2-1);
    // Boss标注
    if(roomType==='boss'){ctx.fillStyle='rgba(255,215,0,0.3)';ctx.font='9px Arial';ctx.textAlign='left';ctx.fillText('★ BOSS',160,y+rowH/2-1);}
    // 精英标注
    if(roomType==='elite'){ctx.fillStyle='rgba(224,64,251,0.3)';ctx.font='9px Arial';ctx.textAlign='left';ctx.fillText('⚡ 精英',160,y+rowH/2-1);}
    // 已完成标记
    if(isPast){ctx.fillStyle='rgba(100,255,100,0.15)';ctx.font='12px Arial';ctx.textAlign='right';ctx.fillText('✓',W-24,y+rowH/2-1);}
    // 当前位置箭头
    if(isCur){ctx.fillStyle='#FFD700';ctx.font='14px Arial';ctx.textAlign='right';ctx.fillText('◀',W-24,y+rowH/2-1);}
  }
  // 底部: 其他层指示
  const routePalette=['A·激进','B·平衡','C·安逸'];
  ctx.fillStyle='rgba(255,255,255,0.08)';ctx.beginPath();ctx.roundRect(10,630,W-20,24,6);ctx.fill();
  ctx.fillStyle='rgba(255,255,255,0.3)';ctx.font='9px Arial';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillText('当前路线: '+routePalette[routeIdx]+'  |  切换M关闭 · 幕'+curAct+' ('+(step+1)+'/15层)',480,642);
}

// ===================================================================
//  渲染系统 — 主渲染函数 (每帧调用)
// ===================================================================
function draw(){
  if(!G)return;
  drawBg();
  if(G._deckViewOpen){drawDeckView();drawFX();return;}
  if(G.pileView){drawEnemies();drawPlayer();drawHand();drawInfo();drawPileView();drawFX();return;}
  if(G.phase==='rest'||G.phase==='upgradeCard'){drawRest();drawFX();return;}
  if(G.phase==='pathChoice'){drawBg();drawPathChoice();drawFX();return;}
  if(G.phase==='event'){drawEvent();drawFX();return;}
  if(G.mapOpen){drawBg();drawMap();drawFX();return;}
  if(G.codexOpen){drawEnemies();drawPlayer();drawHand();drawCodexBtn();drawCodex();drawFX();return;}
  if(G.phase==='seekPick'){drawEnemies();drawPlayer();drawHand();drawEndBtn();drawCodexBtn();drawInfo();drawSeekPick();drawFX();return;}
  drawEnemies();drawPlayer();drawHand();drawCardTooltip();drawEndBtn();drawCodexBtn();drawInfo();drawFX();
  if(G.logOpen)drawCombatLog();
  if(G.phase==='reward')drawRewards();
  else if(G.phase==='shop'||G.phase==='removeCard'||G.phase==='treasure')drawShop();
  else if(G.phase==='bossRelic')drawBossRelic();
  // 房间进入提示(升级版:大字体+楼层+动态光晕)
  if(G._roomAnnounce>0){
    const alpha=Math.min(1,G._roomAnnounce/40);
    const pulse=0.5+0.5*Math.sin(G._roomAnnounce*0.2);
    ctx.globalAlpha=alpha*0.85;
    ctx.fillStyle='rgba(0,0,0,0.7)';ctx.fillRect(0,155,W,90);
    ctx.strokeStyle='rgba(255,215,0,'+(0.1+0.1*pulse)+')';ctx.lineWidth=2;
    ctx.beginPath();ctx.roundRect(80,155,W-160,90,8);ctx.stroke();
    const icons={monster:'⚔️',elite:'💀',rest:'🔥',treasure:'📦',shop:'🏪',boss:'👑',event:'❓'};
    const ico=icons[G._lastRoom]||'';
    const roomName=RN[G._lastRoom]||'';
    ctx.shadowColor='rgba(255,215,0,'+(0.3*pulse)+')';ctx.shadowBlur=20;
    ctx.fillStyle=G._lastRoom==='boss'?'#FFD700':G._lastRoom==='elite'?'#E040FB':'#FFD700';
    ctx.font='bold 32px Arial';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText(ico+' '+roomName,480,200);
    ctx.shadowBlur=0;
    ctx.fillStyle='rgba(255,255,255,0.3)';ctx.font='12px Arial';ctx.fillText(G.floor+'F',480,230);
    ctx.globalAlpha=1;
  }
}

// ===================================================================
//  输入处理 — 鼠标移动 (更新悬浮坐标)
// ===================================================================
canvas.addEventListener('mousemove',e=>{
  const r=canvas.getBoundingClientRect();
  G.mx=(e.clientX-r.left)*(W/r.width);G.my=(e.clientY-r.top)*(H/r.height);
});
// 战斗日志滚轮 + 图鉴翻页
canvas.addEventListener('wheel',e=>{
  if(!G)return;
  if(G.codexOpen&&[0,1,4].includes(G.codexTab)){const d=e.deltaY>0?1:-1;const max=(()=>{if(G.codexTab===0){const f=ALL_CARDS.filter(c=>{if(c.rarity==='status')return false;if(G.codexFilter!=='all'&&c.type!==G.codexFilter)return false;if(G.codexRarity!=='all'&&c.rarity!==G.codexRarity)return false;if(G.codexCost!=='all'){if(G.codexCost==='X'&&c.c!==-1)return false;if(G.codexCost==='0'&&c.c!==0)return false;if(G.codexCost==='1'&&c.c!==1)return false;if(G.codexCost==='2'&&c.c!==2)return false;if(G.codexCost==='3+'&&c.c<3)return false;}return true;});const cpp=Math.floor((H-172)/24);return Math.max(0,Math.ceil(f.length/cpp)-1);}if(G.codexTab===1){const rpp=8;return Math.max(0,Math.ceil(RELICS.length/rpp)-1);}if(G.codexTab===4){const epp=Math.floor((H-120)/36);return Math.max(0,Math.ceil(ET.length/epp)-1);}return 0;})();G.codexPages[G.codexTab]=Math.max(0,Math.min((G.codexPages[G.codexTab]||0)+d,max));e.preventDefault();return;}
  if(G.phase!=='combat'||!G.logOpen||!G._log)return;
  if(G.mx<620)return;const d=e.deltaY>0?3:-3;
  G._logScroll=Math.max(0,Math.min((G._logScroll||0)+d,Math.max(0,G._log.length-16)));e.preventDefault();},{passive:false});

document.addEventListener('keydown',e=>{
  if(!G)return;
  if(e.key==='d'||e.key==='D'){G._deckViewOpen=!G._deckViewOpen;G.mapOpen=false;G.codexOpen=false;return;}
  if(e.key==='m'||e.key==='M'){G.mapOpen=!G.mapOpen;G.codexOpen=false;if(G.mapOpen)return;}
  if(e.key==='l'||e.key==='L'){if(G.phase==='combat')G.logOpen=!G.logOpen;return;}
  if(e.key==='b'||e.key==='B'){if(G.phase==='combat'){G.codexOpen=!G.codexOpen;G.mapOpen=false;}return;}
  if(e.key==='q'||e.key==='Q'){usePotion();return;}
  if(e.key==='e'||e.key==='E'){if(G.phase==='combat')endTurn();return;}
});

// ===================================================================
//  输入处理 — 鼠标点击
//  根据当前 phase 分发到对应处理函数
// ===================================================================
canvas.addEventListener('click',()=>{
  if(!G||!G.phase)return;
  if(G._deckViewOpen){G._deckViewOpen=false;return;}
  if(G.mapOpen&&G.mx>=840&&G.mx<=930&&G.my>=4&&G.my<=26){G._deckViewOpen=true;G.mapOpen=false;return;}
  if(G.codexOpen){
    const tabs=['卡牌','遗物','药水','状态','怪物'],tw=100,gap=10,tsx=(W-(tabs.length*tw+(tabs.length-1)*gap))/2;
    for(let i=0;i<tabs.length;i++){const tx=tsx+i*(tw+gap);if(G.mx>=tx&&G.mx<=tx+tw&&G.my>=55&&G.my<=83){G.codexTab=i;G.codexPages[i]=0;G._codexSearchActive=false;}}
    // 卡牌标签内: 筛选按钮 + 搜索点击
    if(G.codexTab===0){
      const bw=68,bgap=6;
      // 类型筛选(第1行)
      const f1=['all','attack','skill','power'];const n1=['全部','⚔️攻击','🛡️技能','⭐能力'];
      const ft1=f1.length*bw+(f1.length-1)*bgap,fsx1=(W-ft1)/2;
      f1.forEach((k,i)=>{const fx=fsx1+i*(bw+bgap);if(G.mx>=fx&&G.mx<=fx+bw&&G.my>=88&&G.my<=110){G.codexFilter=k;G.codexPages[0]=0;}});
      // 稀有度筛选(第2行)
      const f2=['all','common','uncommon','rare'];const n2=['全部','普通','稀有','传说'];
      const ft2=f2.length*bw+(f2.length-1)*bgap,fsx2=(W-ft2)/2;
      f2.forEach((k,i)=>{const fx=fsx2+i*(bw+bgap);if(G.mx>=fx&&G.mx<=fx+bw&&G.my>=115&&G.my<=137){G.codexRarity=k;G.codexPages[0]=0;}});
      // 费用筛选(第3行)
      const f3=['all','0','1','2','3+','X'];const n3=['全部','0费','1费','2费','3+费','X费'];
      const ft3=f3.length*bw+(f3.length-1)*bgap,fsx3=(W-ft3)/2;
      f3.forEach((k,i)=>{const fx=fsx3+i*(bw+bgap);if(G.mx>=fx&&G.mx<=fx+bw&&G.my>=142&&G.my<=164){G.codexCost=k;G.codexPages[0]=0;}});
    }
    // 翻页按钮(各标签独立页码)
    const maxPage=(()=>{
      if(G.codexTab===0){const filtered=ALL_CARDS.filter(c=>{if(G.codexFilter!=='all'&&c.type!==G.codexFilter)return false;if(G.codexSearch&&!c.name.includes(G.codexSearch))return false;return true;});const cpp=Math.floor((H-145)/17);return Math.max(0,Math.ceil(filtered.length/cpp)-1);}
      if(G.codexTab===1){const perRow=4,relicH=56,gapY=8;const rowsVis=Math.floor((H-120)/(relicH+gapY));const rpp=perRow*rowsVis;return Math.max(0,Math.ceil(RELICS.length/rpp)-1);}
      if(G.codexTab===4){const epp=Math.floor((H-120)/36);return Math.max(0,Math.ceil(ET.length/epp)-1);}
      return 0;
    })();
    if(G.mx>=380&&G.mx<=420&&G.my>=642&&G.my<=662&&G.codexPages[G.codexTab]>0)G.codexPages[G.codexTab]--;
    if(G.mx>=540&&G.mx<=580&&G.my>=642&&G.my<=662&&G.codexPages[G.codexTab]<maxPage)G.codexPages[G.codexTab]++;
    return;
  }

  // 万金油:点击选牌
  if(G.phase==='seekPick'&&G._seekSource==='pool'){
    const cards=G._seekCards||[];const per=5,cw=150,ch=36,gap=8,sx=(W-per*(cw+gap))/2;
    cards.forEach((c,i)=>{const col=i%5,row=Math.floor(i/5),x=sx+col*(cw+gap),y=68+row*(ch+gap);
      if(G.mx>=x&&G.mx<=x+cw&&G.my>=y&&G.my<=y+ch){
        const picked={...c,id:c.id+'_jack_'+Date.now()};G.hand.push(picked);G._seekPicks=(G._seekPicks||0)+1;
        addLog('🎴 万金油:'+c.name);
        if(G._seekPicks>=(G._seekCount||1)){G.phase='combat';G._seekPicks=0;G._seekCount=0;G._seekFilter='any';G._seekSource='draw';G._seekCards=[];return;}
        return;
      }
    });
    return;
  }
  // 寻找:点击选牌
  if(G.phase==='seekPick'){
    const isDiscard=G._seekSource==='discard';
    const pile=isDiscard?G.discard:G.draw;
    const per=5,cw=150,ch=36,gap=8,sx=(W-per*(cw+gap))/2;
    let filtered=[];
    pile.forEach((c,i)=>{if(!c)return;if(G._seekFilter==='any'){filtered.push({card:c,idx:i});return;}const d=def(c);if(d&&d.type===G._seekFilter)filtered.push({card:c,idx:i});});
    filtered.forEach((f,i)=>{
      const col=i%per,row=Math.floor(i/per),x=sx+col*(cw+gap),y=68+row*(ch+gap);
      if(G.mx>=x&&G.mx<=x+cw&&G.my>=y&&G.my<=y+ch){
        G.hand.push(pile.splice(f.idx,1)[0]);G._seekPicks=(G._seekPicks||0)+1;
        addLog('🔍 选择: '+f.card.name);
        if(G._seekPicks>=(G._seekCount||1)){G.phase='combat';G._seekPicks=0;G._seekCount=0;G._seekFilter='any';G._seekSource='draw';return;}
        return;
      }
    });
    return;
  }
  // PathChoice (三选一)
  if(G.phase==='pathChoice'){
    const cw=250,gap=40,total=cw*3+gap*2,sx=(W-total)/2;
    for(let i=0;i<3;i++){const x=sx+i*(cw+gap);if(G.mx>=x&&G.mx<=x+cw&&G.my>=110&&G.my<=360){pickPath(i);return;}}
    return;
  }
  // Event
  if(G.phase==='event'&&G._eventData){
    G._eventData.opts.forEach((opt,i)=>{const y=250+i*100;if(G.mx>=180&&G.mx<=780&&G.my>=y&&G.my<=y+75)eventChoose(i);});
    return;
  }
  // Rest
  if(G.phase==='rest'){
    if(G.mx>=250&&G.mx<=710){if(G.my>=220&&G.my<=285){restHeal();return;}if(G.my>=310&&G.my<=375){restUpgrade();return;}}
    return;
  }
  if(G.phase==='upgradeCard'){
    const all=G.deck,cw=130,ch=64,per=Math.min(6,all.length);
    const gapX=12,gapY=10,totalW=per*cw+(per-1)*gapX,sx=(W-totalW)/2;
    for(let i=0;i<all.length;i++){const col=i%per,row=Math.floor(i/per),x=sx+col*(cw+gapX),y=215+row*(ch+gapY);if(G.mx>=x&&G.mx<=x+cw&&G.my>=y&&G.my<=y+ch&&(!all[i].u||all[i]._searingLevel)){pickUpgrade(i);return;}}
    return;
  }
  // Reward
  if(G.phase==='reward'){
    const cW=Math.min(220,(W-60)/G.rewardCards.length-10),gap=(W-G.rewardCards.length*cW)/(G.rewardCards.length+1);
    for(let i=0;i<G.rewardCards.length;i++){const x=gap+i*(cW+gap);if(G.mx>=x&&G.mx<=x+cW&&G.my>=95&&G.my<=240){pickReward(i);return;}}
    return;
  }
  if(G.phase==='bossRelic'){
    const items=G.shopItems||[],rw=280,gap=40,total=items.length*rw+(items.length-1)*gap,sx=(W-total)/2;
    for(let i=0;i<items.length;i++){const x=sx+i*(rw+gap);if(G.mx>=x&&G.mx<=x+rw&&G.my>=90&&G.my<=250){pickRelic(i);return;}}
    return;
  }
  if(G.phase==='treasure'){
    const items=G.shopItems||[];
    if(!items.length){nextFloor();return;}
    const rw=250,gap=40,total=items.length*rw+(items.length-1)*gap,sx=(W-total)/2;
    for(let i=0;i<items.length;i++){const x=sx+i*(rw+gap);if(G.mx>=x&&G.mx<=x+rw&&G.my>=120&&G.my<=270){pickTreasure(i);return;}}
    return;
  }
  if(G.phase==='shop'){
    const si=G.shopItems||[];
    const cards=si.filter(x=>!x.isPotion&&!x.isRelic&&!x.isRemove);
    const specials=si.filter(x=>x.isPotion||x.isRelic||x.isRemove);
    // 卡牌区点击 (左: 3列×2行)
    const cardW=165,cardH=200,cardGap=14,cardsPerRow=3;
    const cardAreaW=cardsPerRow*cardW+(cardsPerRow-1)*cardGap;
    const cardSx=(W-cardAreaW-40)/2;
    for(let i=0;i<Math.min(5,cards.length);i++){
      const col=i%cardsPerRow,row=Math.floor(i/cardsPerRow);
      const x=cardSx+col*(cardW+cardGap),y=82+row*(cardH+cardGap);
      if(G.mx>=x&&G.mx<=x+cardW&&G.my>=y&&G.my<=y+cardH){buy(si.indexOf(cards[i]));return;}
    }
    // 特殊商品区点击 (右: 竖排)
    const specX=W-170,specW=155;
    for(let i=0;i<specials.length;i++){
      const y=82+i*(120+10);
      if(G.mx>=specX&&G.mx<=specX+specW&&G.my>=y&&G.my<=y+115){buy(si.indexOf(specials[i]));return;}
    }
    leaveShop();return;
  }
  if(G.phase==='removeCard'){
    const all=G.deck,cw=105,ch=56,per=Math.min(8,all.length);
    for(let i=0;i<all.length;i++){const col=i%8,row=Math.floor(i/8),cx=(W-per*cw)/2+col*cw,cy=110+row*66;if(G.mx>=cx&&G.mx<=cx+cw-5&&G.my>=cy&&G.my<=cy+ch){removeCard(i);return;}}
    return;
  }
  if(G.phase==='combat'){
    if(G.mx>=6&&G.mx<=64&&G.my>=460&&G.my<=482){G.codexOpen=!G.codexOpen;G.mapOpen=false;G.logOpen=false;return;}
    if(G.mx>=68&&G.mx<=126&&G.my>=460&&G.my<=482){G.mapOpen=!G.mapOpen;G.codexOpen=false;G.logOpen=false;return;}
    if(G.mx>=130&&G.mx<=188&&G.my>=460&&G.my<=482){G.logOpen=!G.logOpen;G.codexOpen=false;G.mapOpen=false;return;}
    if(G.hand.length){const cy=475,ch=145,gap=5;let cw=Math.min(105,(W-30-gap*(G.hand.length-1))/G.hand.length);cw=Math.max(70,cw);const tw=G.hand.length*cw+(G.hand.length-1)*gap,sx=(W-tw)/2;
      for(let i=0;i<G.hand.length;i++){const x=sx+i*(cw+gap);if(G.mx>=x&&G.mx<=x+cw&&G.my>=cy&&G.my<=cy+ch){playCard(i);return;}}}
    const bx=W-110,by=455,bw=90,bh=24;if(G.mx>=bx&&G.mx<=bx+bw&&G.my>=by&&G.my<=by+bh){endTurn();return;}
    // 牌堆查看
    if(G.mx>=W-95&&G.mx<=W-55&&G.my>=H-22&&G.my<=H-5){G.pileView=G.pileView==='draw'?null:'draw';return;}
    if(G.mx>=W-50&&G.mx<=W-20&&G.my>=H-22&&G.my<=H-5){G.pileView=G.pileView==='discard'?null:'discard';return;}
  }
  // Pile view close (any click while pile is open)
  if(G.pileView){G.pileView=null;return;}
});

// ===================================================================
//  输入处理 — 右键菜单 (跳过/取消)
// ===================================================================
canvas.addEventListener('contextmenu',e=>{
  e.preventDefault();
  if(!G||!G.phase)return;
  if(G.phase==='reward')pickReward(-1);
  else if(G.phase==='bossRelic'){G.shopItems=[];nextFloor();}
  else if(G.phase==='shop'||G.phase==='removeCard')leaveShop();
  else if(G.phase==='seekPick'){G.phase='combat';G._seekPicks=0;G._seekCount=0;G._seekFilter='any';G._seekSource='draw';addLog('🔍 寻找取消');}
});

// ===================================================================
//  启动 / 继续 / 角色选择
// ===================================================================
function start(character){
  if(!character)character='ironclad';
  initGame(character);G.phase='';
  startScreen.style.display='none';overScreen.classList.remove('show');
  startCombat();updateUI();saveGame();
}

function continueGame(){
  if(!loadGame()){start('ironclad');}
}

let _selectedChar='ironclad';
document.getElementById('charSelectIronclad').addEventListener('click',()=>{
  _selectedChar='ironclad';
  document.querySelectorAll('.char-card').forEach(e=>e.classList.remove('active'));
  document.getElementById('charSelectIronclad').classList.add('active');
});
document.getElementById('charSelectSilent').addEventListener('click',()=>{
  _selectedChar='silent';
  document.querySelectorAll('.char-card').forEach(e=>e.classList.remove('active'));
  document.getElementById('charSelectSilent').classList.add('active');
});
document.getElementById('charSelectWatcher').addEventListener('click',()=>{
  _selectedChar='watcher';
  document.querySelectorAll('.char-card').forEach(e=>e.classList.remove('active'));
  document.getElementById('charSelectWatcher').classList.add('active');
});
document.getElementById('charSelectDefect').addEventListener('click',()=>{
  _selectedChar='defect';
  document.querySelectorAll('.char-card').forEach(e=>e.classList.remove('active'));
  document.getElementById('charSelectDefect').classList.add('active');
});
// 角色悬浮详细介绍
const CHAR_INFO = {
  ironclad: '<div style="color:#FF6B6B;font-size:13px;font-weight:bold;margin-bottom:6px;">🔥 铁甲战士</div>' +
    '<div style="margin-bottom:5px;font-size:10px;">初始遗物: <b style="color:#FF6B6B">燃烧之血</b> — 战斗后回复8血</div>' +
    '<div style="margin-bottom:5px;font-size:10px;">被动: <b style="color:#FF6B6B">铁血</b> — 每次自残+1力量</div>' +
    '<hr style="border-color:rgba(255,255,255,0.1);margin:4px 0;">' +
    '<div style="font-size:9px;color:rgba(255,255,255,0.6);">HP:80 · 特色:力量·消耗·自残·易伤</div>' +
    '<div style="font-size:9px;color:rgba(255,255,255,0.4);margin-top:3px;">初始牌组:打击×5+防御×4+重击(2费8伤+2易伤)</div>',
  silent: '<div style="color:#64B5F6;font-size:13px;font-weight:bold;margin-bottom:6px;">🗡️ 静默猎手</div>' +
    '<div style="margin-bottom:5px;font-size:10px;">初始遗物: <b style="color:#64B5F6">蛇之戒</b> — 首回合+1能量+1抽</div>' +
    '<div style="margin-bottom:5px;font-size:10px;">被动: <b style="color:#64B5F6">毒刃</b> — 每3攻击全体1毒</div>' +
    '<hr style="border-color:rgba(255,255,255,0.1);margin:4px 0;">' +
    '<div style="font-size:9px;color:rgba(255,255,255,0.6);">HP:70 · 特色:中毒·小刀·弃牌·高过牌</div>' +
    '<div style="font-size:9px;color:rgba(255,255,255,0.4);margin-top:3px;">初始牌组:打击×5+防御×4+中和(0费4伤+虚弱)</div>',
  watcher: '<div style="color:#FF9800;font-size:13px;font-weight:bold;margin-bottom:6px;">✨ 观者</div>' +
    '<div style="margin-bottom:5px;font-size:10px;">初始遗物: <b style="color:#FF9800">净水</b> — 最大能量+1</div>' +
    '<div style="margin-bottom:5px;font-size:10px;">被动: <b style="color:#FF9800">天人</b> — 姿态切换双倍收益</div>' +
    '<hr style="border-color:rgba(255,255,255,0.1);margin:4px 0;">' +
    '<div style="font-size:9px;color:rgba(255,255,255,0.6);">HP:68 · 特色:姿态(怒火×2/宁静+1能/神格×3)·念力</div>' +
    '<div style="font-size:9px;color:rgba(255,255,255,0.4);margin-top:3px;">初始:打击×5+防御×4+爆发(1费9伤进怒火)+警惕(1费9甲进宁静)</div>',
  defect: '<div style="color:#AD8BFF;font-size:13px;font-weight:bold;margin-bottom:6px;">🤖 机兵</div>' +
    '<div style="margin-bottom:5px;font-size:10px;">初始遗物: <b style="color:#AD8BFF">裂变核心</b> — 开局生成1闪电球</div>' +
    '<div style="margin-bottom:5px;font-size:10px;">被动: <b style="color:#AD8BFF">超频</b> — 每生成3球+1集中</div>' +
    '<hr style="border-color:rgba(255,255,255,0.1);margin:4px 0;">' +
    '<div style="font-size:9px;color:rgba(255,255,255,0.7);">⚡<b style="color:#FFD700">闪电</b> 被动3伤/激发8伤  ❄<b style="color:#64B5F6">冰霜</b> 被动2甲/激发5甲</div>' +
    '<div style="font-size:9px;color:rgba(255,255,255,0.7);">🌑<b style="color:#9C27B0">暗黑</b> 被动累6伤/激发全伤  💎<b style="color:#E040FB">等离子</b> 被动+1能/激发+2能</div>' +
    '<div style="font-size:9px;color:rgba(255,255,255,0.5);margin-top:2px;">📊 <b style="color:#AD8BFF">集中</b>:每2点+1球体效果 · 球满时新球激发最左侧</div>' +
    '<div style="font-size:9px;color:rgba(255,255,255,0.4);margin-top:3px;">初始:打击×4+防御×4+电击(0费生⚡)+双重释放(1费激发首球×2)</div>'
};
const chEls = ['charSelectIronclad','charSelectSilent','charSelectWatcher','charSelectDefect'];
const chKeys = ['ironclad','silent','watcher','defect'];
chEls.forEach((id, i) => {
  const el = document.getElementById(id);
  el.addEventListener('mouseenter', () => {
    const panel = document.getElementById('charInfoPanel');
    panel.innerHTML = CHAR_INFO[chKeys[i]];
    panel.style.display = 'block';
  });
  el.addEventListener('mouseleave', () => {
    document.getElementById('charInfoPanel').style.display = 'none';
  });
});
// Default select Ironclad
document.getElementById('charSelectIronclad').classList.add('active');

// 难度选择
let _selectedDiff=0;
const diffEls=['diffNormal','diffHard','diffNightmare'];
diffEls.forEach((id,i)=>{
  document.getElementById(id).addEventListener('click',()=>{
    _selectedDiff=i;
    diffEls.forEach(e=>{const el=document.getElementById(e);el.style.borderColor=i===parseInt(el.dataset.diff)?'rgba(255,215,0,0.6)':'rgba(255,255,255,0.1)';el.style.background=i===parseInt(el.dataset.diff)?'rgba(255,215,0,0.1)':'rgba(255,255,255,0.03)';});
  });
});
// Default select Normal
document.getElementById('diffNormal').style.borderColor='rgba(255,215,0,0.6)';
document.getElementById('diffNormal').style.background='rgba(255,215,0,0.1)';

document.getElementById('startButton').addEventListener('click',()=>{start(_selectedChar);G.difficulty=_selectedDiff;});
document.getElementById('retryButton').addEventListener('click',()=>{start(_selectedChar);G.difficulty=_selectedDiff;});
document.getElementById('continueBtn').addEventListener('click',continueGame);
document.addEventListener('DOMContentLoaded',()=>{updateContinueBtn();updateRecordsDisplay();});

// ===================================================================
//  主循环 (requestAnimationFrame)
// ===================================================================
function loop(){
  try{if(G){
    // 奖励动画进度
    if(G._rewardAnim>0&&G._rewardAnim<1)G._rewardAnim=Math.min(1,G._rewardAnim+0.12);
    if(G._roomAnnounce>0)G._roomAnnounce--;
    // 终结延迟:最后一击短暂停顿后结算
    if(G._killDelay>0){G._killDelay--;if(G._killDelay<=0&&G.enemies.every(e=>e.hp<=0))combatWin();}
    updateUI();draw();
  }}catch(e){console.error(e);}
  requestAnimationFrame(loop);
}

// roundRect polyfill
if(!CanvasRenderingContext2D.prototype.roundRect){
  CanvasRenderingContext2D.prototype.roundRect=function(x,y,w,h,r){
    if(typeof r==='number')r=[r];
    const tl=r[0]||0,tr=r[1]||tl,br=r[2]||tl,bl=r[3]||tr;
    this.moveTo(x+tl,y);this.lineTo(x+w-tr,y);this.quadraticCurveTo(x+w,y,x+w,y+tr);
    this.lineTo(x+w,y+h-br);this.quadraticCurveTo(x+w,y+h,x+w-br,y+h);
    this.lineTo(x+bl,y+h);this.quadraticCurveTo(x,y+h,x,y+h-bl);
    this.lineTo(x,y+tl);this.quadraticCurveTo(x,y,x+tl,y);this.closePath();
  };
}

initGame();
loop();
