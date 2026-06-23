with open('card.html','r',encoding='utf-8') as f:
    c = f.read()

# Replace the entire initDeck function
old_init = """function initDeck(character,deckChoice){
  function strikes(n,m){var a=[];for(var i=0;i<n;i++)a.push({...M.strike,id:'strike_'+m+'_'+i,u:false});return a;}
  function defends(n,m){var a=[];for(var i=0;i<n;i++)a.push({...M.defend,id:'defend_'+m+'_'+i,u:false});return a;}
  var d=[];
  if(character==='defect'){
    if(deckChoice===1){d=strikes(3,1).concat(defends(4,1));d.push({...M.zap,id:'zap_10',u:false});d.push({...M.ballLightning,id:'ballLightning_10',u:false});d.push({...M.coldSnap,id:'coldSnap_10',u:false});}
    else if(deckChoice===2){d=strikes(4,2).concat(defends(3,2));d.push({...M.zap,id:'zap_20',u:false});d.push({...M.coolheaded,id:'coolheaded_20',u:false});d.push({...M.leap,id:'leap_20',u:false});}
    else if(deckChoice===3){d=strikes(4,3).concat(defends(4,3));d.push({...M.zap,id:'zap_30',u:false});d.push({...M.doomAndGloom,id:'doomAndGloom_30',u:false});d.push({...M.darkness,id:'darkness_30',u:false});}
    else{d=strikes(4,0).concat(defends(4,0));d.push({...M.zap,id:'zap_0',u:false});d.push({...M.dualcast,id:'dualcast_0',u:false});}
  }else if(character==='silent'){
    if(deckChoice===1){d=strikes(4,1).concat(defends(4,1));d.push({...M.neutralize,id:'neutralize_40',u:false});d.push({...M.deadlyPoison,id:'deadlyPoison_40',u:false});d.push({...M.noxiousFumes,id:'noxiousFumes_40',u:false});}
    else if(deckChoice===2){d=strikes(4,2).concat(defends(4,2));d.push({...M.neutralize,id:'neutralize_50',u:false});d.push({...M.bladeDance,id:'bladeDance_50',u:false});d.push({...M.cloakDagger,id:'cloakDagger_50',u:false});}
    else if(deckChoice===3){d=strikes(4,3).concat(defends(3,3));d.push({...M.neutralize,id:'neutralize_60',u:false});d.push({...M.acrobatics,id:'acrobatics_60',u:false});d.push({...M.daggerThrow,id:'daggerThrow_60',u:false});d.push({...M.sneakyStrike,id:'sneakyStrike_60',u:false});}
    else{d=strikes(5,0).concat(defends(4,0));d.push({...M.neutralize,id:'neutralize_0',u:false});}
  }else if(character==='watcher'){
    if(deckChoice===1){d=strikes(4,1).concat(defends(4,1));d.push({...M.eruption,id:'eruption_70',u:false});d.push({...M.vigilance,id:'vigilance_70',u:false});d.push({...M.crescendo,id:'crescendo_70',u:false});d.push({...M.emptyFist,id:'emptyFist_70',u:false});}
    else if(deckChoice===2){d=strikes(4,2).concat(defends(4,2));d.push({...M.eruption,id:'eruption_80',u:false});d.push({...M.worship,id:'worship_80',u:false});d.push({...M.prostrate,id:'prostrate_80',u:false});d.push({...M.mantraEnergy,id:'mantraEnergy_80',u:false});}
    else if(deckChoice===3){d=strikes(4,3).concat(defends(4,3));d.push({...M.vigilance,id:'vigilance_90',u:false});d.push({...M.pray,id:'pray_90',u:false});d.push({...M.meditate,id:'meditate_90',u:false});d.push({...M.sanctity,id:'sanctity_90',u:false});}
    else{d=strikes(5,0).concat(defends(4,0));d.push({...M.eruption,id:'eruption_0',u:false});d.push({...M.vigilance,id:'vigilance_0',u:false});}
  }else{
    if(deckChoice===1){d=strikes(4,1).concat(defends(4,1));d.push({...M.bash,id:'bash_100',u:false});d.push({...M.inflame,id:'inflame_100',u:false});d.push({...M.heavyBlade,id:'heavyBlade_100',u:false});}
    else if(deckChoice===2){d=strikes(4,2).concat(defends(4,2));d.push({...M.bash,id:'bash_110',u:false});d.push({...M.trueGrit,id:'trueGrit_110',u:false});d.push({...M.feelNoPain,id:'feelNoPain_110',u:false});}
    else if(deckChoice===3){d=strikes(3,3).concat(defends(5,3));d.push({...M.bash,id:'bash_120',u:false});d.push({...M.bodySlam,id:'bodySlam_120',u:false});d.push({...M.shrug,id:'shrug_120',u:false});}
    else{d=strikes(5,0).concat(defends(4,0));d.push({...M.bash,id:'bash_0',u:false});}
  }
  return d;
}"""

new_init = """function initDeck(character,deckChoice){
  function st(n,m){var a=[];for(var i=0;i<n;i++)a.push({...M.strike,id:'st_'+m+'_'+i,u:false});return a;}
  function df(n,m){var a=[];for(var i=0;i<n;i++)a.push({...M.defend,id:'df_'+m+'_'+i,u:false});return a;}
  var d=[];
  if(character==='defect'){
    if(deckChoice===1){d=st(3,1).concat(df(3,1));d.push({...M.zap,id:'zp_10',u:false});d.push({...M.dualcast,id:'dc_10',u:false});d.push({...M.ballLightning,id:'bl_10',u:false});d.push({...M.coldSnap,id:'cs_10',u:false});d.push({...M.sweepingBeam,id:'sw_10',u:false});}
    else if(deckChoice===2){d=st(3,2).concat(df(3,2));d.push({...M.zap,id:'zp_20',u:false});d.push({...M.coolheaded,id:'ch_20',u:false});d.push({...M.leap,id:'lp_20',u:false});d.push({...M.glacier,id:'gl_20',u:false});d.push({...M.barrage,id:'br_20',u:false});}
    else if(deckChoice===3){d=st(3,3).concat(df(3,3));d.push({...M.zap,id:'zp_30',u:false});d.push({...M.doomAndGloom,id:'dg_30',u:false});d.push({...M.darkness,id:'dk_30',u:false});d.push({...M.chaos,id:'ch_30',u:false});d.push({...M.dualcast,id:'dc_30',u:false});}
    else{d=st(3,0).concat(df(3,0));d.push({...M.zap,id:'zp_0',u:false});d.push({...M.dualcast,id:'dc_0',u:false});d.push({...M.ballLightning,id:'bl_0',u:false});d.push({...M.coolheaded,id:'ch_0',u:false});}
  }else if(character==='silent'){
    if(deckChoice===1){d=st(3,1).concat(df(3,1));d.push({...M.neutralize,id:'nt_10',u:false});d.push({...M.deadlyPoison,id:'dp_10',u:false});d.push({...M.noxiousFumes,id:'nf_10',u:false});d.push({...M.cripplingCloud,id:'cc_10',u:false});d.push({...M.daggerThrow,id:'dt_10',u:false});}
    else if(deckChoice===2){d=st(3,2).concat(df(3,2));d.push({...M.neutralize,id:'nt_20',u:false});d.push({...M.bladeDance,id:'bd_20',u:false});d.push({...M.cloakDagger,id:'cd_20',u:false});d.push({...M.finisher,id:'fn_20',u:false});d.push({...M.slice,id:'sl_20',u:false});}
    else if(deckChoice===3){d=st(3,3).concat(df(3,3));d.push({...M.neutralize,id:'nt_30',u:false});d.push({...M.acrobatics,id:'ac_30',u:false});d.push({...M.daggerThrow,id:'dt_30',u:false});d.push({...M.sneakyStrike,id:'ss_30',u:false});d.push({...M.eviscerate,id:'ev_30',u:false});}
    else{d=st(3,0).concat(df(3,0));d.push({...M.neutralize,id:'nt_0',u:false});d.push({...M.bladeDance,id:'bd_0',u:false});d.push({...M.cloakDagger,id:'cd_0',u:false});d.push({...M.suckerPunch,id:'sp_0',u:false});}
  }else if(character==='watcher'){
    if(deckChoice===1){d=st(3,1).concat(df(3,1));d.push({...M.eruption,id:'er_10',u:false});d.push({...M.vigilance,id:'vg_10',u:false});d.push({...M.emptyFist,id:'ef_10',u:false});d.push({...M.justLucky,id:'jl_10',u:false});d.push({...M.cutThroughFate,id:'ct_10',u:false});}
    else if(deckChoice===2){d=st(3,2).concat(df(3,2));d.push({...M.eruption,id:'er_20',u:false});d.push({...M.vigilance,id:'vg_20',u:false});d.push({...M.crescendo,id:'cr_20',u:false});d.push({...M.emptyFist,id:'ef_20',u:false});d.push({...M.tantrum,id:'tt_20',u:false});}
    else if(deckChoice===3){d=st(3,3).concat(df(3,3));d.push({...M.eruption,id:'er_30',u:false});d.push({...M.worship,id:'wo_30',u:false});d.push({...M.prostrate,id:'pr_30',u:false});d.push({...M.mantraEnergy,id:'me_30',u:false});d.push({...M.collect,id:'cl_30',u:false});}
    else{d=st(3,0).concat(df(3,0));d.push({...M.eruption,id:'er_0',u:false});d.push({...M.vigilance,id:'vg_0',u:false});d.push({...M.sanctity,id:'sn_0',u:false});d.push({...M.flyingSleeves,id:'fs_0',u:false});}
  }else{
    if(deckChoice===1){d=st(3,1).concat(df(3,1));d.push({...M.bash,id:'bh_10',u:false});d.push({...M.inflame,id:'if_10',u:false});d.push({...M.heavyBlade,id:'hb_10',u:false});d.push({...M.pummel,id:'pm_10',u:false});d.push({...M.shrug,id:'sg_10',u:false});}
    else if(deckChoice===2){d=st(3,2).concat(df(3,2));d.push({...M.bash,id:'bh_20',u:false});d.push({...M.trueGrit,id:'tg_20',u:false});d.push({...M.feelNoPain,id:'fn_20',u:false});d.push({...M.powerThrough,id:'pt_20',u:false});d.push({...M.ghostlyArmor,id:'ga_20',u:false});}
    else if(deckChoice===3){d=st(3,3).concat(df(3,3));d.push({...M.bash,id:'bh_30',u:false});d.push({...M.bodySlam,id:'bs_30',u:false});d.push({...M.shrug,id:'sg_30',u:false});d.push({...M.ironWave,id:'iw_30',u:false});d.push({...M.sentinel,id:'st_30',u:false});}
    else{d=st(3,0).concat(df(3,0));d.push({...M.bash,id:'bh_0',u:false});d.push({...M.shrug,id:'sg_0',u:false});d.push({...M.heavyBlade,id:'hb_0',u:false});d.push({...M.ironWave,id:'iw_0',u:false});}
  }
  return d;
}"""

c = c.replace(old_init, new_init)
print("initDeck replaced")

# Update deck descriptions
descs = [
    ("{n:'⚔️ 经典铁壁',d:'5打击+4防御+重击',c:0},{n:'💪 力量粉碎',d:'4打击+4防御+重击+燃烧+厚重之刃',c:1},{n:'♻️ 消耗铁壁',d:'4打击+4防御+重击+坚毅+无惧疼痛',c:2},{n:'🛡️ 格挡反击',d:'3打击+5防御+重击+摔绊+耸肩',c:3}",
     "{n:'⚔️ 经典铁壁',d:'3打击+3防御+重击+耸肩+厚重之刃+铁斩波',c:0},{n:'💪 力量粉碎',d:'3打击+3防御+重击+燃烧+厚重之刃+连打+耸肩',c:1},{n:'♻️ 消耗铁壁',d:'3打击+3防御+重击+坚毅+无惧疼痛+力量突破+幽魂甲',c:2},{n:'🛡️ 格挡反击',d:'3打击+3防御+重击+摔绊+耸肩+铁斩波+哨卫',c:3}"),
    ("{n:'🗡️ 经典暗杀',d:'5打击+4防御+中和',c:0},{n:'☠️ 毒药大师',d:'4打击+4防御+中和+致命毒药+毒雾',c:1},{n:'🔪 小刀风暴',d:'4打击+4防御+中和+刀舞+斗篷匕首',c:2},{n:'♠️ 弃牌循环',d:'4打击+3防御+中和+杂技+投匕+偷袭',c:3}",
     "{n:'🗡️ 经典暗杀',d:'3打击+3防御+中和+刀舞+斗篷+偷袭',c:0},{n:'☠️ 毒药大师',d:'3打击+3防御+中和+致命毒药+毒雾+致残毒云+投匕',c:1},{n:'🔪 小刀风暴',d:'3打击+3防御+中和+刀舞+斗篷+终结技+切割',c:2},{n:'♠️ 弃牌循环',d:'3打击+3防御+中和+杂技+投匕+偷袭+剔骨',c:3}"),
    ("{n:'✨ 经典姿态',d:'打击×4+防御×4+爆发+警惕',c:0},{n:'🔄 姿态切换',d:'打击×4+防御×4+爆发+警惕+渐强+空手',c:1},{n:'👑 神格之路',d:'打击×4+防御×4+爆发+崇拜+伏地+念力驱动',c:2},{n:'🕯️ 念力掌控',d:'打击×4+防御×4+警惕+祈祷+冥想+神圣',c:3}",
     "{n:'✨ 经典姿态',d:'3打击+3防御+爆发+警惕+斩破命运+只靠运气',c:0},{n:'🔄 姿态切换',d:'3打击+3防御+爆发+警惕+渐强+空手+暴怒',c:1},{n:'👑 神格之路',d:'3打击+3防御+爆发+崇拜+伏地+念力驱动+收集念力',c:2},{n:'🕯️ 念力掌控',d:'3打击+3防御+警惕+祈祷+冥想+神圣+内心宁静',c:3}"),
    ("{n:'🤖 经典放电',d:'打击×4+防御×4+电击+双重释放',c:0},{n:'⚡ 闪电轰鸣',d:'打击×3+防御×4+电击+球形闪电+寒冰',c:1},{n:'❄️ 冰霜壁垒',d:'打击×4+防御×3+电击+冷静头脑+跳跃',c:2},{n:'🌑 暗影蓄力',d:'打击×4+防御×4+电击+末日+黑暗',c:3}",
     "{n:'🤖 经典放电',d:'3打击+3防御+电击+双重释放+球形闪电+冷静头脑',c:0},{n:'⚡ 闪电轰鸣',d:'3打击+3防御+电击+双重释放+球形闪电+寒冰+扫射光束',c:1},{n:'❄️ 冰霜壁垒',d:'3打击+3防御+电击+冷静头脑+跳跃+冰川+弹幕',c:2},{n:'🌑 暗影蓄力',d:'3打击+3防御+电击+双重释放+末日+黑暗+混沌',c:3}"),
]

for old, new in descs:
    if old in c:
        c = c.replace(old, new)
        print(f"Replaced: {old[:40]}...")
    else:
        print(f"NOT FOUND: {old[:40]}...")

with open('card.html','w',encoding='utf-8') as f:
    f.write(c)
print("DONE")
