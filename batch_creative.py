#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""19张全新思路卡面 - 不雷同"""

import sys, io, re, subprocess, os
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

with open('card.html', 'rb') as f:
    data = f.read()
text = data.decode('utf-8')
LF = chr(10)

faces = []

# allOrNothing 孤注一掷: 硬币抛起
faces.append("""'allOrNothing':function(ctx,x,cy,lift,cw,ch,t,d,c,G){var _t=Date.now()/250;ctx.shadowBlur=0;
var _g=ctx.createRadialGradient(x+cw/2,cy+lift+ch/2,3,x+cw/2,cy+lift+ch/2,ch*0.55);
_g.addColorStop(0,'rgba(100,60,10,0.55)');_g.addColorStop(0.5,'rgba(200,120,20,0.6)');_g.addColorStop(1,'rgba(255,180,30,0.65)');
ctx.fillStyle=_g;ctx.beginPath();ctx.roundRect(x+1,cy+lift+1,cw-2,ch-2,10);ctx.fill();
ctx.shadowColor='rgba(255,215,0,0.45)';ctx.shadowBlur=35;
// 硬币(椭圆旋转)
ctx.strokeStyle='rgba(255,240,100,0.08)';ctx.lineWidth=1.5;
ctx.beginPath();ctx.ellipse(x+cw/2,cy+lift+ch/2-8+4*Math.sin(_t),ch/9,ch/12+ch/30*Math.sin(_t*0.5),0,0,Math.PI*2);ctx.stroke();
ctx.fillStyle='rgba(255,240,100,0.02)';ctx.beginPath();ctx.ellipse(x+cw/2,cy+lift+ch/2-8+4*Math.sin(_t),ch/9,ch/12,0,0,Math.PI*2);ctx.fill();
ctx.shadowBlur=0;ctx.globalAlpha=1;},""")

# timeRift 时间裂隙: 裂纹+碎块
faces.append("""'timeRift':function(ctx,x,cy,lift,cw,ch,t,d,c,G){var _t=Date.now()/350;ctx.shadowBlur=0;
var _g=ctx.createRadialGradient(x+cw/2,cy+lift+ch/2,3,x+cw/2,cy+lift+ch/2,ch*0.55);
_g.addColorStop(0,'rgba(20,20,40,0.55)');_g.addColorStop(0.5,'rgba(30,30,80,0.6)');_g.addColorStop(1,'rgba(40,40,120,0.65)');
ctx.fillStyle=_g;ctx.beginPath();ctx.roundRect(x+1,cy+lift+1,cw-2,ch-2,10);ctx.fill();
ctx.shadowColor='rgba(80,80,200,0.35)';ctx.shadowBlur=25;
// 裂痕
ctx.strokeStyle='rgba(120,120,255,0.06)';ctx.lineWidth=1.5;
ctx.beginPath();ctx.moveTo(x+12,cy+lift+15);ctx.lineTo(x+cw/2,cy+lift+ch/3);ctx.lineTo(x+25,cy+lift+ch/2);ctx.lineTo(x+cw-15,cy+lift+ch-12);ctx.stroke();
// 碎片
ctx.fillStyle='rgba(140,140,255,0.02)';ctx.beginPath();ctx.moveTo(x+30,cy+lift+20);ctx.lineTo(x+38,cy+lift+15);ctx.lineTo(x+36,cy+lift+25);ctx.closePath();ctx.fill();
ctx.fillStyle='rgba(160,160,255,0.02)';ctx.beginPath();ctx.moveTo(x+cw-25,cy+lift+ch-28);ctx.lineTo(x+cw-18,cy+lift+ch-35);ctx.lineTo(x+cw-20,cy+lift+ch-22);ctx.closePath();ctx.fill();
ctx.shadowBlur=0;ctx.globalAlpha=1;},""")

# mirrorRealm 镜像空间: 碎片反射
faces.append("""'mirrorRealm':function(ctx,x,cy,lift,cw,ch,t,d,c,G){var _t=Date.now()/400;ctx.shadowBlur=0;
var _g=ctx.createRadialGradient(x+cw/2,cy+lift+ch/2,3,x+cw/2,cy+lift+ch/2,ch*0.55);
_g.addColorStop(0,'rgba(20,15,40,0.55)');_g.addColorStop(0.5,'rgba(50,35,90,0.6)');_g.addColorStop(1,'rgba(80,55,140,0.65)');
ctx.fillStyle=_g;ctx.beginPath();ctx.roundRect(x+1,cy+lift+1,cw-2,ch-2,10);ctx.fill();
ctx.shadowColor='rgba(120,80,200,0.35)';ctx.shadowBlur=25;
// 菱形镜面碎片
for(var _mi=0;_mi<4;_mi++){var _mx=x+12+_mi*28;var _my=cy+lift+15+(_mi%2)*30;
ctx.strokeStyle='rgba(160,120,240,'+(0.025+0.015*Math.sin(_t+_mi))+')';ctx.lineWidth=0.8;
ctx.beginPath();ctx.moveTo(_mx,_my-6);ctx.lineTo(_mx+8,_my);ctx.lineTo(_mx,_my+6);ctx.lineTo(_mx-8,_my);ctx.closePath();ctx.stroke();}
ctx.shadowBlur=0;ctx.globalAlpha=1;},""")

# voidNova 虚空新星: 辐射爆发
faces.append("""'voidNova':function(ctx,x,cy,lift,cw,ch,t,d,c,G){var _t=Date.now()/250;ctx.shadowBlur=0;
var _g=ctx.createRadialGradient(x+cw/2,cy+lift+ch/2,3,x+cw/2,cy+lift+ch/2,ch*0.55);
_g.addColorStop(0,'rgba(10,5,20,0.6)');_g.addColorStop(0.4,'rgba(30,10,60,0.65)');_g.addColorStop(1,'rgba(60,20,120,0.7)');
ctx.fillStyle=_g;ctx.beginPath();ctx.roundRect(x+1,cy+lift+1,cw-2,ch-2,10);ctx.fill();
ctx.shadowColor='rgba(80,30,180,0.45)';ctx.shadowBlur=35;
// 辐射线
for(var _vi=0;_vi<8;_vi++){var _va=_vi*Math.PI/4+_t*0.1;ctx.strokeStyle='rgba(120,50,220,'+(0.025+0.015*Math.sin(_t+_vi))+')';ctx.lineWidth=0.8;
ctx.beginPath();ctx.moveTo(x+cw/2,cy+lift+ch/2);ctx.lineTo(x+cw/2+ch/4*Math.cos(_va),cy+lift+ch/2+ch/4*Math.sin(_va));ctx.stroke();}
ctx.shadowBlur=0;ctx.globalAlpha=1;},""")

# chaosVortex 混沌漩涡: 缠绕螺旋
faces.append("""'chaosVortex':function(ctx,x,cy,lift,cw,ch,t,d,c,G){var _t=Date.now()/250;ctx.shadowBlur=0;
var _g=ctx.createRadialGradient(x+cw/2,cy+lift+ch/2,3,x+cw/2,cy+lift+ch/2,ch*0.55);
_g.addColorStop(0,'rgba(40,10,40,0.55)');_g.addColorStop(0.5,'rgba(80,20,80,0.6)');_g.addColorStop(1,'rgba(140,30,140,0.65)');
ctx.fillStyle=_g;ctx.beginPath();ctx.roundRect(x+1,cy+lift+1,cw-2,ch-2,10);ctx.fill();
ctx.shadowColor='rgba(200,40,200,0.35)';ctx.shadowBlur=25;
for(var _ci=0;_ci<3;_ci++){ctx.strokeStyle='rgba(255,60,220,'+(0.02+0.015*Math.sin(_t+_ci))+')';ctx.lineWidth=0.6;
ctx.beginPath();for(var _cj=0;_cj<=12;_cj++){var _cp=_cj/12*Math.PI*2+_t*0.2+_ci;var _cr=ch/10+_ci*ch/12+ch/30*Math.sin(_cp+_t);var _cx2=x+cw/2+_cr*Math.cos(_cp+_t*0.1),_cy2=cy+lift+ch/2+_cr*Math.sin(_cp+_t*0.1);_cj===0?ctx.moveTo(_cx2,_cy2):ctx.lineTo(_cx2,_cy2);}ctx.stroke();}
ctx.shadowBlur=0;ctx.globalAlpha=1;},""")

# gammaBurst 伽马爆破: 十字星爆发
faces.append("""'gammaBurst':function(ctx,x,cy,lift,cw,ch,t,d,c,G){var _t=Date.now()/180;ctx.shadowBlur=0;
var _g=ctx.createRadialGradient(x+cw/2,cy+lift+ch/2,3,x+cw/2,cy+lift+ch/2,ch*0.55);
_g.addColorStop(0,'rgba(60,50,10,0.55)');_g.addColorStop(0.5,'rgba(180,160,20,0.6)');_g.addColorStop(1,'rgba(255,250,60,0.65)');
ctx.fillStyle=_g;ctx.beginPath();ctx.roundRect(x+1,cy+lift+1,cw-2,ch-2,10);ctx.fill();
ctx.shadowColor='rgba(255,255,100,0.5)';ctx.shadowBlur=40;
for(var _gi=0;_gi<4;_gi++){var _ga=_gi*Math.PI/2+_t*0.15;ctx.strokeStyle='rgba(255,255,200,'+(0.03+0.02*Math.sin(_t+_gi))+')';ctx.lineWidth=1.2;
ctx.beginPath();ctx.moveTo(x+cw/2,cy+lift+ch/2);ctx.lineTo(x+cw/2+ch/4*Math.cos(_ga),cy+lift+ch/2+ch/4*Math.sin(_ga));ctx.stroke();}
ctx.shadowBlur=0;ctx.globalAlpha=1;},""")

# starVortex 星系漩涡: 星臂
faces.append("""'starVortex':function(ctx,x,cy,lift,cw,ch,t,d,c,G){var _t=Date.now()/350;ctx.shadowBlur=0;
var _g=ctx.createRadialGradient(x+cw/2,cy+lift+ch/2,3,x+cw/2,cy+lift+ch/2,ch*0.55);
_g.addColorStop(0,'rgba(10,10,30,0.6)');_g.addColorStop(0.5,'rgba(20,20,60,0.65)');_g.addColorStop(1,'rgba(30,30,100,0.7)');
ctx.fillStyle=_g;ctx.beginPath();ctx.roundRect(x+1,cy+lift+1,cw-2,ch-2,10);ctx.fill();
ctx.shadowColor='rgba(60,60,180,0.35)';ctx.shadowBlur=25;
for(var _si=0;_si<2;_si++){ctx.strokeStyle='rgba(100,100,220,'+(0.02+0.015*Math.sin(_t+_si))+')';ctx.lineWidth=0.8;
ctx.beginPath();for(var _sj=0;_sj<=20;_sj++){var _sp=_sj/20*Math.PI*6+_t*0.1+_si*Math.PI;var _sr=ch/20+_sj*(ch/30);var _sx2=x+cw/2+_sr*Math.cos(_sp),_sy2=cy+lift+ch/2+_sr*Math.sin(_sp);_sj===0?ctx.moveTo(_sx2,_sy2):ctx.lineTo(_sx2,_sy2);}ctx.stroke();}
ctx.shadowBlur=0;ctx.globalAlpha=1;},""")

# starForge 星辰熔炉: 锤+星
faces.append("""'starForge':function(ctx,x,cy,lift,cw,ch,t,d,c,G){var _t=Date.now()/300;ctx.shadowBlur=0;
var _g=ctx.createLinearGradient(x,cy+lift,x,cy+lift+ch);
_g.addColorStop(0,'rgba(40,20,10,0.55)');_g.addColorStop(0.5,'rgba(100,50,20,0.6)');_g.addColorStop(1,'rgba(180,80,30,0.65)');
ctx.fillStyle=_g;ctx.beginPath();ctx.roundRect(x+1,cy+lift+1,cw-2,ch-2,10);ctx.fill();
ctx.shadowColor='rgba(255,120,40,0.35)';ctx.shadowBlur=25;
// 铁砧
ctx.fillStyle='rgba(120,80,40,0.03)';ctx.beginPath();ctx.roundRect(x+cw/2-14,cy+lift+ch/2-4,28,14,3);ctx.fill();
ctx.strokeStyle='rgba(255,180,80,0.05)';ctx.lineWidth=1;ctx.beginPath();ctx.roundRect(x+cw/2-14,cy+lift+ch/2-4,28,14,3);ctx.stroke();
// 锤
ctx.strokeStyle='rgba(255,200,100,0.04)';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(x+cw/2,cy+lift+ch/2-4);ctx.lineTo(x+cw/2,cy+lift+12);ctx.stroke();
// 火星
ctx.fillStyle='rgba(255,220,80,'+(0.02+0.015*Math.sin(_t*1.5))+')';ctx.beginPath();ctx.arc(x+cw/2+4,cy+lift+14,2+Math.sin(_t),0,Math.PI*2);ctx.fill();
ctx.shadowBlur=0;ctx.globalAlpha=1;},""")

# undercurrent 暗流涌动: 波浪线
faces.append("""'undercurrent':function(ctx,x,cy,lift,cw,ch,t,d,c,G){var _t=Date.now()/350;ctx.shadowBlur=0;
var _g=ctx.createLinearGradient(x,cy+lift,x,cy+lift+ch);
_g.addColorStop(0,'rgba(10,30,50,0.55)');_g.addColorStop(0.5,'rgba(15,60,80,0.6)');_g.addColorStop(1,'rgba(20,90,120,0.65)');
ctx.fillStyle=_g;ctx.beginPath();ctx.roundRect(x+1,cy+lift+1,cw-2,ch-2,10);ctx.fill();
ctx.shadowColor='rgba(40,140,180,0.3)';ctx.shadowBlur=22;
ctx.strokeStyle='rgba(60,180,220,0.04)';ctx.lineWidth=1;
for(var _ui=0;_ui<3;_ui++){ctx.beginPath();ctx.moveTo(x+8,cy+lift+15+_ui*20);
for(var _uj=0;_uj<=15;_uj++){ctx.lineTo(x+8+_uj*(cw-16)/15,cy+lift+15+_ui*20+6*Math.sin(_uj*0.8+_t*0.3+_ui));}
ctx.stroke();}
ctx.shadowBlur=0;ctx.globalAlpha=1;},""")

# spinningTop 旋转陀螺: 旋转体
faces.append("""'spinningTop':function(ctx,x,cy,lift,cw,ch,t,d,c,G){var _t=Date.now()/250;ctx.shadowBlur=0;
var _g=ctx.createRadialGradient(x+cw/2,cy+lift+ch/2,3,x+cw/2,cy+lift+ch/2,ch*0.55);
_g.addColorStop(0,'rgba(40,30,60,0.5)');_g.addColorStop(0.5,'rgba(80,50,120,0.55)');_g.addColorStop(1,'rgba(120,70,180,0.6)');
ctx.fillStyle=_g;ctx.beginPath();ctx.roundRect(x+1,cy+lift+1,cw-2,ch-2,10);ctx.fill();
ctx.shadowColor='rgba(160,100,220,0.35)';ctx.shadowBlur=25;
// 陀螺(尖端向下)
ctx.strokeStyle='rgba(200,140,255,0.05)';ctx.lineWidth=1;
ctx.beginPath();ctx.moveTo(x+cw/2-10,cy+lift+20);ctx.lineTo(x+cw/2+10,cy+lift+20);ctx.lineTo(x+cw/2,cy+lift+ch-15);ctx.closePath();ctx.stroke();
// 旋转弧线
ctx.strokeStyle='rgba(220,160,255,'+(0.02+0.015*Math.sin(_t))+')';ctx.lineWidth=0.6;
ctx.beginPath();ctx.arc(x+cw/2,cy+lift+22,12,0,Math.PI);ctx.stroke();
ctx.shadowBlur=0;ctx.globalAlpha=1;},""")

# luckyStar 幸运星: 五角星
faces.append("""'luckyStar':function(ctx,x,cy,lift,cw,ch,t,d,c,G){var _t=Date.now()/300;ctx.shadowBlur=0;
var _g=ctx.createRadialGradient(x+cw/2,cy+lift+ch/2,3,x+cw/2,cy+lift+ch/2,ch*0.55);
_g.addColorStop(0,'rgba(60,40,10,0.5)');_g.addColorStop(0.5,'rgba(180,120,20,0.55)');_g.addColorStop(1,'rgba(240,200,30,0.6)');
ctx.fillStyle=_g;ctx.beginPath();ctx.roundRect(x+1,cy+lift+1,cw-2,ch-2,10);ctx.fill();
ctx.shadowColor='rgba(255,230,60,0.45)';ctx.shadowBlur=35;
// 五角星
ctx.strokeStyle='rgba(255,250,120,0.06)';ctx.lineWidth=1;
ctx.beginPath();
for(var _li=0;_li<5;_li++){var _la=_li*Math.PI*2/5-Math.PI/2;var _lr=ch/6;var _lx=x+cw/2+_lr*Math.cos(_la),_ly=cy+lift+ch/2+_lr*Math.sin(_la);
_li===0?ctx.moveTo(_lx,_ly):ctx.lineTo(_lx,_ly);
_la+=Math.PI*2/10;var _lr2=ch/12;ctx.lineTo(x+cw/2+_lr2*Math.cos(_la),cy+lift+ch/2+_lr2*Math.sin(_la));}
ctx.closePath();ctx.stroke();
ctx.shadowBlur=0;ctx.globalAlpha=1;},""")

# overcharge 电能过载: 电池
faces.append("""'overcharge':function(ctx,x,cy,lift,cw,ch,t,d,c,G){var _t=Date.now()/200;ctx.shadowBlur=0;
var _g=ctx.createLinearGradient(x,cy+lift,x,cy+lift+ch);
_g.addColorStop(0,'rgba(30,30,10,0.55)');_g.addColorStop(0.5,'rgba(80,80,15,0.6)');_g.addColorStop(1,'rgba(160,160,20,0.65)');
ctx.fillStyle=_g;ctx.beginPath();ctx.roundRect(x+1,cy+lift+1,cw-2,ch-2,10);ctx.fill();
ctx.shadowColor='rgba(255,255,40,0.4)';ctx.shadowBlur=30;
// 电池轮廓
ctx.strokeStyle='rgba(255,255,80,0.06)';ctx.lineWidth=1.2;
ctx.beginPath();ctx.roundRect(x+cw/2-10,cy+lift+15,20,ch-35,4);ctx.stroke();
ctx.beginPath();ctx.roundRect(x+cw/2-5,cy+lift+12,10,5,2);ctx.stroke();
// 充电条脉动
ctx.fillStyle='rgba(255,255,100,'+(0.02+0.015*Math.sin(_t))+')';ctx.beginPath();ctx.roundRect(x+cw/2-7,cy+lift+ch-28,14,8+6*Math.sin(_t*1.5),2);ctx.fill();
ctx.shadowBlur=0;ctx.globalAlpha=1;},""")

# desperateStrike 绝境打击: 破碎拳
faces.append("""'desperateStrike':function(ctx,x,cy,lift,cw,ch,t,d,c,G){var _t=Date.now()/250;ctx.shadowBlur=0;
var _g=ctx.createRadialGradient(x+cw/2,cy+lift+ch/2,3,x+cw/2,cy+lift+ch/2,ch*0.55);
_g.addColorStop(0,'rgba(60,10,10,0.55)');_g.addColorStop(0.5,'rgba(140,20,15,0.6)');_g.addColorStop(1,'rgba(220,30,20,0.65)');
ctx.fillStyle=_g;ctx.beginPath();ctx.roundRect(x+1,cy+lift+1,cw-2,ch-2,10);ctx.fill();
ctx.shadowColor='rgba(255,40,30,0.4)';ctx.shadowBlur=30;
// 裂纹
ctx.strokeStyle='rgba(255,120,100,0.05)';ctx.lineWidth=1;
ctx.beginPath();ctx.moveTo(x+15,cy+lift+15);ctx.lineTo(x+cw/2,cy+lift+ch/2);ctx.lineTo(x+cw-15,cy+lift+ch-10);ctx.stroke();
ctx.beginPath();ctx.moveTo(x+20,cy+lift+ch-15);ctx.lineTo(x+cw/2-5,cy+lift+ch/2+5);ctx.lineTo(x+cw-20,cy+lift+20);ctx.stroke();
ctx.shadowBlur=0;ctx.globalAlpha=1;},""")

# bloodForBlood 以血还血: 血滴
faces.append("""'bloodForBlood':function(ctx,x,cy,lift,cw,ch,t,d,c,G){var _t=Date.now()/250;ctx.shadowBlur=0;
var _g=ctx.createRadialGradient(x+cw/2,cy+lift+ch/2,3,x+cw/2,cy+lift+ch/2,ch*0.55);
_g.addColorStop(0,'rgba(60,5,5,0.55)');_g.addColorStop(0.5,'rgba(140,10,8,0.6)');_g.addColorStop(1,'rgba(220,15,10,0.65)');
ctx.fillStyle=_g;ctx.beginPath();ctx.roundRect(x+1,cy+lift+1,cw-2,ch-2,10);ctx.fill();
ctx.shadowColor='rgba(255,20,15,0.45)';ctx.shadowBlur=35;
// 血滴下落
ctx.fillStyle='rgba(255,60,40,0.03)';ctx.beginPath();ctx.arc(x+cw/2-10,cy+lift+ch/3+5*Math.sin(_t*0.3),3+2*Math.sin(_t),0,Math.PI*2);ctx.fill();
ctx.fillStyle='rgba(255,80,50,0.02)';ctx.beginPath();ctx.arc(x+cw/2+12,cy+lift+ch/1.5+5*Math.cos(_t*0.4),2+1.5*Math.sin(_t*0.7+1),0,Math.PI*2);ctx.fill();
ctx.strokeStyle='rgba(255,60,40,0.03)';ctx.lineWidth=0.8;
ctx.beginPath();ctx.moveTo(x+cw/2-8,cy+lift+18);ctx.quadraticCurveTo(x+cw/2+5,cy+lift+ch/2,x+cw/2+8,cy+lift+ch-18);ctx.stroke();
ctx.shadowBlur=0;ctx.globalAlpha=1;},""")

# mirrorForm 镜之形: 菱形排列
faces.append("""'mirrorForm':function(ctx,x,cy,lift,cw,ch,t,d,c,G){var _t=Date.now()/400;ctx.shadowBlur=0;
var _g=ctx.createRadialGradient(x+cw/2,cy+lift+ch/2,3,x+cw/2,cy+lift+ch/2,ch*0.55);
_g.addColorStop(0,'rgba(30,20,60,0.5)');_g.addColorStop(0.5,'rgba(60,40,120,0.55)');_g.addColorStop(1,'rgba(90,60,180,0.6)');
ctx.fillStyle=_g;ctx.beginPath();ctx.roundRect(x+1,cy+lift+1,cw-2,ch-2,10);ctx.fill();
ctx.shadowColor='rgba(130,80,220,0.35)';ctx.shadowBlur=25;
for(var _fi=0;_fi<3;_fi++){ctx.strokeStyle='rgba(180,120,255,'+(0.025+0.015*Math.sin(_t+_fi))+')';ctx.lineWidth=0.8;
ctx.beginPath();ctx.moveTo(x+20+_fi*25,cy+lift+10);ctx.lineTo(x+30+_fi*25,cy+lift+ch/2);ctx.lineTo(x+20+_fi*25,cy+lift+ch-10);ctx.stroke();}
ctx.shadowBlur=0;ctx.globalAlpha=1;},""")

# stoneForm 石化形态: 岩石层
faces.append("""'stoneForm':function(ctx,x,cy,lift,cw,ch,t,d,c,G){var _t=Date.now()/350;ctx.shadowBlur=0;
var _g=ctx.createLinearGradient(x,cy+lift,x,cy+lift+ch);
_g.addColorStop(0,'rgba(40,35,30,0.55)');_g.addColorStop(0.5,'rgba(80,70,60,0.6)');_g.addColorStop(1,'rgba(120,100,80,0.65)');
ctx.fillStyle=_g;ctx.beginPath();ctx.roundRect(x+1,cy+lift+1,cw-2,ch-2,10);ctx.fill();
ctx.shadowColor='rgba(160,140,120,0.3)';ctx.shadowBlur=22;
ctx.strokeStyle='rgba(180,160,140,0.04)';ctx.lineWidth=0.8;
// 岩石纹理(折线)
ctx.beginPath();ctx.moveTo(x+10,cy+lift+20);ctx.lineTo(x+25,cy+lift+35);ctx.lineTo(x+18,cy+lift+50);ctx.lineTo(x+35,cy+lift+65);ctx.stroke();
ctx.beginPath();ctx.moveTo(x+cw-10,cy+lift+25);ctx.lineTo(x+cw-25,cy+lift+40);ctx.lineTo(x+cw-18,cy+lift+55);ctx.lineTo(x+cw-30,cy+lift+70);ctx.stroke();
// 符文裂纹
ctx.strokeStyle='rgba(200,180,160,0.02)';ctx.lineWidth=0.5;
ctx.beginPath();ctx.moveTo(x+cw/2-5,cy+lift+20);ctx.lineTo(x+cw/2,cy+lift+ch/2);ctx.lineTo(x+cw/2+5,cy+lift+ch-20);ctx.stroke();
ctx.shadowBlur=0;ctx.globalAlpha=1;},""")

# Insert all faces
all_faces = LF + LF.join(faces) + LF
old_marker = LF + '};' + LF + 'function drawHand(){'
new_marker = all_faces + LF + '};' + LF + 'function drawHand(){'

if old_marker in text:
    text = text.replace(old_marker, new_marker, 1)
    print(f"✅ {len(faces)} faces inserted")
else:
    print("⚠ Marker not found!")
    sys.exit(1)

# Add to preview
idx = text.find('function startCardPreview')
ids_idx = text.find('var _ids=[', idx)
close_idx = text.find('];', ids_idx)
ids_list = re.findall(r'\"([a-zA-Z]+)\"', text[ids_idx:close_idx+2])

new_ids = ['allOrNothing','timeRift','mirrorRealm','voidNova','chaosVortex','gammaBurst','starVortex','starForge','undercurrent','spinningTop','luckyStar','overcharge','desperateStrike','bloodForBlood','mirrorForm','stoneForm']

added = 0
for nid in new_ids:
    if nid not in ids_list:
        text = text[:close_idx] + f',\"{nid}\"' + text[close_idx:]
        close_idx += len(nid) + 3
        added += 1
print(f"✅ {added} new IDs added to preview")

data = text.encode('utf-8')
with open('card.html', 'wb') as f:
    f.write(data)

m = re.search(rb'<script>(.*?)</script>', data, re.DOTALL)
with open('_tc.js', 'wb') as out:
    out.write(m.group(1))
r = subprocess.run(['node', '--check', '_tc.js'], capture_output=True)
os.remove('_tc.js')
if r.returncode == 0:
    print("✅ JS OK")
else:
    err = r.stderr.decode('utf-8', errors='replace')[:300]
    print(f"❌ JS Error: {err}")
