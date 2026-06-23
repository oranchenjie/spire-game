#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""重画所有表情包+圆形卡面 + 神化 为kingBlade渐变风格"""

import sys, io, re, subprocess, os
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

with open('card.html', 'rb') as f:
    data = f.read()
text = data.decode('utf-8')
NL = '\r\n'

def replace_face(text, cid, new_func):
    marker = f"'{cid}':function(ctx,x,cy,lift,cw,ch,t,d,c,G)"
    idx = text.find(marker)
    if idx < 0:
        # Try with {var _t
        marker2 = f"'{cid}':function(ctx,x,cy,lift,cw,ch,t,d,c,G){{"
        idx = text.find(marker2)
    if idx < 0:
        print(f"  {cid}: NOT FOUND!")
        return text, False
    end = text.find('ctx.shadowBlur=0;ctx.globalAlpha=1;},', idx)
    if end < 0:
        # Some old faces might not end with this pattern
        end = text.find('ctx.globalAlpha=1;ctx.shadowBlur=0;},', idx)
    if end < 0:
        # Try another common ending
        end = text.find('ctx.shadowBlur=0;}', idx)
        if end > 0:
            # Find if it ends with }, or just };
            next_chars = text[end:end+10]
            if next_chars.startswith('ctx.shadowBlur=0;}'):
                end += len('ctx.shadowBlur=0;}')
            else:
                end += len('ctx.shadowBlur=0;}')
        else:
            print(f"  {cid}: END NOT FOUND!")
            return text, False
    else:
        end += len('ctx.shadowBlur=0;ctx.globalAlpha=1;},')
    text = text[:idx] + new_func + text[end:]
    return text, True

faces = {}

# apotheosis 神化: 金色神光+升腾
faces['apotheosis'] = """'apotheosis':function(ctx,x,cy,lift,cw,ch,t,d,c,G){var _t=Date.now()/400;ctx.shadowBlur=0;
var _g=ctx.createRadialGradient(x+cw/2,cy+lift+ch/2,3,x+cw/2,cy+lift+ch/2,ch*0.55);var _r=Math.floor(255),_gv=Math.floor(230+25*Math.sin(_t*0.5)),_b=Math.floor(150+80*Math.sin(_t*0.3+1));
_g.addColorStop(0,'rgba(200,180,60,0.5)');_g.addColorStop(0.5,'rgba(240,220,80,0.55)');_g.addColorStop(1,'rgba('+_r+','+_gv+','+_b+',0.65)');
ctx.fillStyle=_g;ctx.beginPath();ctx.roundRect(x+1,cy+lift+1,cw-2,ch-2,10);ctx.fill();
ctx.shadowColor='rgba(255,240,100,0.5)';ctx.shadowBlur=40;
ctx.strokeStyle='rgba(255,250,150,'+(0.4+0.25*Math.sin(_t*0.3))+')';ctx.lineWidth=2;ctx.beginPath();ctx.roundRect(x-1,cy+lift-1,cw+2,ch+2,12);ctx.stroke();
for(var _ai=0;_ai<5;_ai++){var _ay=cy+lift+15+_ai*((ch-20)/5)+5*Math.sin(_t+_ai);ctx.fillStyle='rgba(255,255,220,'+(0.02+0.015*Math.sin(_t+_ai))+')';ctx.beginPath();ctx.arc(x+cw/2+30*Math.sin(_t*0.7+_ai),_ay,2+Math.sin(_t+_ai),0,Math.PI*2);ctx.fill();}
ctx.shadowBlur=0;ctx.globalAlpha=1;},"""

# roulette 轮盘: 红黑轮盘
faces['roulette'] = """'roulette':function(ctx,x,cy,lift,cw,ch,t,d,c,G){var _t=Date.now()/250;ctx.shadowBlur=0;
var _g=ctx.createRadialGradient(x+cw/2,cy+lift+ch/2,3,x+cw/2,cy+lift+ch/2,ch*0.5);var _r=Math.floor(220+35*Math.sin(_t*0.5));
_g.addColorStop(0,'rgba(120,20,20,0.55)');_g.addColorStop(0.5,'rgba(200,40,30,0.6)');_g.addColorStop(1,'rgba('+_r+',50,30,0.65)');
ctx.fillStyle=_g;ctx.beginPath();ctx.roundRect(x+1,cy+lift+1,cw-2,ch-2,10);ctx.fill();
ctx.shadowColor='rgba(255,60,40,0.45)';ctx.shadowBlur=30;
ctx.strokeStyle='rgba(255,120,80,'+(0.35+0.2*Math.sin(_t*0.4))+')';ctx.lineWidth=2;ctx.beginPath();ctx.roundRect(x-1,cy+lift-1,cw+2,ch+2,12);ctx.stroke();
for(var _ri=0;_ri<8;_ri++){var _ra=_ri*Math.PI/4+_t*0.15;ctx.fillStyle=_ri%2===0?'rgba(255,60,40,0.04)':'rgba(0,0,0,0.04)';
ctx.beginPath();ctx.moveTo(x+cw/2,cy+lift+ch/2);ctx.arc(x+cw/2,cy+lift+ch/2,ch/5,_ra,_ra+Math.PI/4);ctx.closePath();ctx.fill();}
ctx.strokeStyle='rgba(255,200,100,0.03)';ctx.lineWidth=0.5;ctx.beginPath();ctx.arc(x+cw/2,cy+lift+ch/2,ch/5,0,Math.PI*2);ctx.stroke();
ctx.shadowBlur=0;ctx.globalAlpha=1;},"""

# dealer 发牌者: 扑克牌面
faces['dealer'] = """'dealer':function(ctx,x,cy,lift,cw,ch,t,d,c,G){var _t=Date.now()/400;ctx.shadowBlur=0;
var _g=ctx.createLinearGradient(x,cy+lift,x,cy+lift+ch);var _r=Math.floor(200+40*Math.sin(_t*0.5)),_gv=Math.floor(180+40*Math.sin(_t*0.3+1));
_g.addColorStop(0,'rgba(40,60,80,0.5)');_g.addColorStop(0.5,'rgba(60,100,140,0.55)');_g.addColorStop(1,'rgba('+_r+','+_gv+',200,0.6)');
ctx.fillStyle=_g;ctx.beginPath();ctx.roundRect(x+1,cy+lift+1,cw-2,ch-2,10);ctx.fill();
ctx.shadowColor='rgba(100,160,220,0.35)';ctx.shadowBlur=25;
ctx.strokeStyle='rgba(120,180,240,'+(0.25+0.15*Math.sin(_t*0.3))+')';ctx.lineWidth=1.5;ctx.beginPath();ctx.roundRect(x-1,cy+lift-1,cw+2,ch+2,12);ctx.stroke();
ctx.fillStyle='rgba(180,220,255,0.02)';ctx.beginPath();ctx.roundRect(x+cw/2-10,cy+lift+ch/2-12,20,24,3);ctx.fill();
ctx.strokeStyle='rgba(180,220,255,0.04)';ctx.lineWidth=0.5;ctx.beginPath();ctx.roundRect(x+cw/2-10,cy+lift+ch/2-12,20,24,3);ctx.stroke();
ctx.shadowBlur=0;ctx.globalAlpha=1;},"""

# ditto 复刻: 双重重影
faces['ditto'] = """'ditto':function(ctx,x,cy,lift,cw,ch,t,d,c,G){var _t=Date.now()/350;ctx.shadowBlur=0;
var _g=ctx.createRadialGradient(x+cw/2,cy+lift+ch/2,3,x+cw/2,cy+lift+ch/2,ch*0.5);var _b=Math.floor(200+40*Math.sin(_t*0.5));
_g.addColorStop(0,'rgba(60,40,100,0.5)');_g.addColorStop(0.5,'rgba(100,60,160,0.55)');_g.addColorStop(1,'rgba(120,80,'+_b+',0.6)');
ctx.fillStyle=_g;ctx.beginPath();ctx.roundRect(x+1,cy+lift+1,cw-2,ch-2,10);ctx.fill();
ctx.shadowColor='rgba(140,100,220,0.35)';ctx.shadowBlur=25;
ctx.strokeStyle='rgba(160,120,240,'+(0.25+0.15*Math.sin(_t*0.3))+')';ctx.lineWidth=1.5;ctx.beginPath();ctx.roundRect(x-1,cy+lift-1,cw+2,ch+2,12);ctx.stroke();
ctx.strokeStyle='rgba(180,140,255,0.04)';ctx.lineWidth=1;
ctx.beginPath();ctx.ellipse(x+cw/2-6,cy+lift+ch/2,ch/7,ch/9,0,0,Math.PI*2);ctx.stroke();
ctx.beginPath();ctx.ellipse(x+cw/2+6,cy+lift+ch/2,ch/7,ch/9,0,0,Math.PI*2);ctx.stroke();
ctx.shadowBlur=0;ctx.globalAlpha=1;},"""

# weatherRand 随机天气: 晴雨变幻
faces['weatherRand'] = """'weatherRand':function(ctx,x,cy,lift,cw,ch,t,d,c,G){var _t=Date.now()/300;ctx.shadowBlur=0;
var _g=ctx.createLinearGradient(x,cy+lift,x,cy+lift+ch);var _b=Math.floor(200+40*Math.sin(_t*0.5)),_gv=Math.floor(180+40*Math.sin(_t*0.3+1));
_g.addColorStop(0,'rgba(30,60,100,0.5)');_g.addColorStop(0.5,'rgba(50,100,160,0.55)');_g.addColorStop(1,'rgba(60,120,200,0.6)');
ctx.fillStyle=_g;ctx.beginPath();ctx.roundRect(x+1,cy+lift+1,cw-2,ch-2,10);ctx.fill();
ctx.shadowColor='rgba(80,160,220,0.35)';ctx.shadowBlur=25;
ctx.strokeStyle='rgba(100,180,240,'+(0.25+0.15*Math.sin(_t*0.3))+')';ctx.lineWidth=1.5;ctx.beginPath();ctx.roundRect(x-1,cy+lift-1,cw+2,ch+2,12);ctx.stroke();
ctx.strokeStyle='rgba(120,200,255,0.04)';ctx.lineWidth=0.8;
ctx.beginPath();ctx.arc(x+cw/2,cy+lift+ch/2-6,ch/10,Math.PI,0);ctx.stroke();
for(var _wi=0;_wi<3;_wi++){ctx.strokeStyle='rgba(120,200,255,0.03)';ctx.lineWidth=0.5;ctx.beginPath();ctx.moveTo(x+18+_wi*15,cy+lift+ch/2+4);ctx.lineTo(x+18+_wi*15,cy+lift+ch/2+10);ctx.stroke();}
ctx.shadowBlur=0;ctx.globalAlpha=1;},"""

# surpriseBox 惊喜盒: 礼物盒
faces['surpriseBox'] = """'surpriseBox':function(ctx,x,cy,lift,cw,ch,t,d,c,G){var _t=Date.now()/400;ctx.shadowBlur=0;
var _g=ctx.createLinearGradient(x,cy+lift,x,cy+lift+ch);var _r=Math.floor(220+35*Math.sin(_t*0.5));
_g.addColorStop(0,'rgba(120,30,40,0.5)');_g.addColorStop(0.5,'rgba(200,50,60,0.55)');_g.addColorStop(1,'rgba('+_r+',60,70,0.6)');
ctx.fillStyle=_g;ctx.beginPath();ctx.roundRect(x+1,cy+lift+1,cw-2,ch-2,10);ctx.fill();
ctx.shadowColor='rgba(255,80,80,0.35)';ctx.shadowBlur=25;
ctx.strokeStyle='rgba(255,120,120,'+(0.25+0.15*Math.sin(_t*0.3))+')';ctx.lineWidth=1.5;ctx.beginPath();ctx.roundRect(x-1,cy+lift-1,cw+2,ch+2,12);ctx.stroke();
ctx.fillStyle='rgba(255,180,180,0.02)';ctx.beginPath();ctx.roundRect(x+cw/2-12,cy+lift+ch/2-10,24,20,3);ctx.fill();
ctx.strokeStyle='rgba(255,200,200,0.04)';ctx.lineWidth=0.5;ctx.beginPath();ctx.roundRect(x+cw/2-12,cy+lift+ch/2-10,24,20,3);ctx.stroke();
ctx.beginPath();ctx.moveTo(x+cw/2,cy+lift+ch/2-10);ctx.lineTo(x+cw/2,cy+lift+ch/2+10);ctx.stroke();
ctx.beginPath();ctx.moveTo(x+cw/2-12,cy+lift+ch/2);ctx.lineTo(x+cw/2+12,cy+lift+ch/2);ctx.stroke();
ctx.shadowBlur=0;ctx.globalAlpha=1;},"""

# allOrNothing 全有或全无: 硬币两面
faces['allOrNothing'] = """'allOrNothing':function(ctx,x,cy,lift,cw,ch,t,d,c,G){var _t=Date.now()/350;ctx.shadowBlur=0;
var _g=ctx.createRadialGradient(x+cw/2,cy+lift+ch/2,3,x+cw/2,cy+lift+ch/2,ch*0.5);var _r=Math.floor(240+15*Math.sin(_t*0.5)),_gv=Math.floor(200+40*Math.sin(_t*0.3+1));
_g.addColorStop(0,'rgba(160,120,40,0.5)');_g.addColorStop(0.5,'rgba(220,180,60,0.55)');_g.addColorStop(1,'rgba('+_r+','+_gv+',80,0.6)');
ctx.fillStyle=_g;ctx.beginPath();ctx.roundRect(x+1,cy+lift+1,cw-2,ch-2,10);ctx.fill();
ctx.shadowColor='rgba(255,215,0,0.4)';ctx.shadowBlur=30;
ctx.strokeStyle='rgba(255,230,80,'+(0.3+0.2*Math.sin(_t*0.4))+')';ctx.lineWidth=2;ctx.beginPath();ctx.roundRect(x-1,cy+lift-1,cw+2,ch+2,12);ctx.stroke();
ctx.fillStyle='rgba(255,240,100,0.03)';ctx.beginPath();ctx.arc(x+cw/2,cy+lift+ch/2,ch/9,0,Math.PI*2);ctx.fill();
ctx.strokeStyle='rgba(255,240,100,0.05)';ctx.lineWidth=0.8;ctx.beginPath();ctx.arc(x+cw/2,cy+lift+ch/2,ch/9,0,Math.PI*2);ctx.stroke();
ctx.shadowBlur=0;ctx.globalAlpha=1;},"""

# caltrops 蒺藜: 尖刺陷阱
faces['caltrops'] = """'caltrops':function(ctx,x,cy,lift,cw,ch,t,d,c,G){ctx.shadowBlur=0;
var _g=ctx.createRadialGradient(x+cw/2,cy+lift+ch/2,3,x+cw/2,cy+lift+ch/2,ch*0.5);var _gv=Math.floor(180+40*Math.sin(Date.now()/500));
_g.addColorStop(0,'rgba(40,80,40,0.5)');_g.addColorStop(0.5,'rgba(60,140,60,0.55)');_g.addColorStop(1,'rgba(80,180,80,0.6)');
ctx.fillStyle=_g;ctx.beginPath();ctx.roundRect(x+1,cy+lift+1,cw-2,ch-2,10);ctx.fill();
ctx.shadowColor='rgba(80,200,80,0.3)';ctx.shadowBlur=22;
ctx.strokeStyle='rgba(100,220,100,'+(0.25+0.15*Math.sin(Date.now()/400))+')';ctx.lineWidth=1.5;ctx.beginPath();ctx.roundRect(x-1,cy+lift-1,cw+2,ch+2,12);ctx.stroke();
ctx.fillStyle='rgba(120,240,120,0.03)';ctx.beginPath();ctx.moveTo(x+cw/2,cy+lift+12);ctx.lineTo(x+cw/2-6,cy+lift+ch-12);ctx.lineTo(x+cw/2+6,cy+lift+ch-12);ctx.closePath();ctx.fill();
ctx.strokeStyle='rgba(120,240,120,0.04)';ctx.lineWidth=0.8;ctx.stroke();
ctx.shadowBlur=0;ctx.globalAlpha=1;},"""

# capacitor 电容器: 电路板层
faces['capacitor'] = """'capacitor':function(ctx,x,cy,lift,cw,ch,t,d,c,G){ctx.shadowBlur=0;
var _g=ctx.createLinearGradient(x,cy+lift,x,cy+lift+ch);var _b=Math.floor(220+35*Math.sin(Date.now()/500));
_g.addColorStop(0,'rgba(30,40,80,0.5)');_g.addColorStop(0.5,'rgba(40,60,140,0.55)');_g.addColorStop(1,'rgba(50,80,'+_b+',0.6)');
ctx.fillStyle=_g;ctx.beginPath();ctx.roundRect(x+1,cy+lift+1,cw-2,ch-2,10);ctx.fill();
ctx.shadowColor='rgba(80,120,220,0.3)';ctx.shadowBlur=22;
ctx.strokeStyle='rgba(100,140,240,'+(0.2+0.12*Math.sin(Date.now()/400))+')';ctx.lineWidth=1.5;ctx.beginPath();ctx.roundRect(x-1,cy+lift-1,cw+2,ch+2,12);ctx.stroke();
ctx.fillStyle='rgba(120,160,255,0.02)';ctx.beginPath();ctx.roundRect(x+12,cy+lift+ch/2-4,18,8,2);ctx.fill();
ctx.strokeStyle='rgba(120,160,255,0.04)';ctx.lineWidth=0.5;ctx.beginPath();ctx.roundRect(x+12,cy+lift+ch/2-4,18,8,2);ctx.stroke();
ctx.beginPath();ctx.moveTo(x+30,cy+lift+ch/2);ctx.lineTo(x+cw-12,cy+lift+ch/2);ctx.stroke();
ctx.shadowBlur=0;ctx.globalAlpha=1;},"""

# chaos 混沌: 混沌旋涡
faces['chaos'] = """'chaos':function(ctx,x,cy,lift,cw,ch,t,d,c,G){var _t=Date.now()/250;ctx.shadowBlur=0;
var _g=ctx.createRadialGradient(x+cw/2,cy+lift+ch/2,3,x+cw/2,cy+lift+ch/2,ch*0.5);var _r=Math.floor(200+40*Math.sin(_t*0.5)),_b=Math.floor(220+35*Math.sin(_t*0.3+1));
_g.addColorStop(0,'rgba(60,20,80,0.55)');_g.addColorStop(0.5,'rgba(120,40,160,0.6)');_g.addColorStop(1,'rgba('+_r+',60,'+_b+',0.65)');
ctx.fillStyle=_g;ctx.beginPath();ctx.roundRect(x+1,cy+lift+1,cw-2,ch-2,10);ctx.fill();
ctx.shadowColor='rgba(160,60,220,0.4)';ctx.shadowBlur=30;
ctx.strokeStyle='rgba(180,80,240,'+(0.3+0.2*Math.sin(_t*0.4))+')';ctx.lineWidth=2;ctx.beginPath();ctx.roundRect(x-1,cy+lift-1,cw+2,ch+2,12);ctx.stroke();
for(var _ci=0;_ci<4;_ci++){var _cr=ch/10+_ci*(ch/12)+ch/25*Math.sin(_t+_ci);ctx.strokeStyle='rgba(200,100,255,'+(0.03+0.02*Math.sin(_t+_ci))+')';ctx.lineWidth=0.8;
ctx.beginPath();ctx.arc(x+cw/2,cy+lift+ch/2,_cr,_t*0.1+_ci,_t*0.1+_ci+Math.PI*1.2);ctx.stroke();}
ctx.shadowBlur=0;ctx.globalAlpha=1;},"""

# cutThroughFate 斩破命运: 命运线断裂
faces['cutThroughFate'] = """'cutThroughFate':function(ctx,x,cy,lift,cw,ch,t,d,c,G){var _t=Date.now()/350;ctx.shadowBlur=0;
var _g=ctx.createLinearGradient(x,cy+lift,x+cw,cy+lift+ch);var _r=Math.floor(240+15*Math.sin(_t*0.5)),_gv=Math.floor(200+40*Math.sin(_t*0.3+1));
_g.addColorStop(0,'rgba(100,60,20,0.5)');_g.addColorStop(0.5,'rgba(200,120,40,0.55)');_g.addColorStop(1,'rgba('+_r+','+_gv+',60,0.6)');
ctx.fillStyle=_g;ctx.beginPath();ctx.roundRect(x+1,cy+lift+1,cw-2,ch-2,10);ctx.fill();
ctx.shadowColor='rgba(255,200,60,0.35)';ctx.shadowBlur=25;
ctx.strokeStyle='rgba(255,220,80,'+(0.3+0.15*Math.sin(_t*0.3))+')';ctx.lineWidth=1.5;ctx.beginPath();ctx.roundRect(x-1,cy+lift-1,cw+2,ch+2,12);ctx.stroke();
ctx.strokeStyle='rgba(255,240,100,0.06)';ctx.lineWidth=1.2;
ctx.beginPath();ctx.moveTo(x+12,cy+lift+12);ctx.lineTo(x+cw-12,cy+lift+ch-12);ctx.stroke();
ctx.beginPath();ctx.moveTo(x+15,cy+lift+20);ctx.lineTo(x+cw-20,cy+lift+ch-10);ctx.stroke();
ctx.shadowBlur=0;ctx.globalAlpha=1;},"""

# daggerThrow 投匕: 飞旋匕首
faces['daggerThrow'] = """'daggerThrow':function(ctx,x,cy,lift,cw,ch,t,d,c,G){var _t=Date.now()/300;ctx.shadowBlur=0;
var _g=ctx.createLinearGradient(x,cy+lift,x+cw,cy+lift+ch);var _b=Math.floor(200+40*Math.sin(_t*0.5));
_g.addColorStop(0,'rgba(40,40,80,0.5)');_g.addColorStop(0.5,'rgba(60,60,140,0.55)');_g.addColorStop(1,'rgba(50,50,'+_b+',0.6)');
ctx.fillStyle=_g;ctx.beginPath();ctx.roundRect(x+1,cy+lift+1,cw-2,ch-2,10);ctx.fill();
ctx.shadowColor='rgba(100,100,200,0.35)';ctx.shadowBlur=25;
ctx.strokeStyle='rgba(120,120,220,'+(0.25+0.15*Math.sin(_t*0.3))+')';ctx.lineWidth=1.5;ctx.beginPath();ctx.roundRect(x-1,cy+lift-1,cw+2,ch+2,12);ctx.stroke();
ctx.strokeStyle='rgba(140,140,240,0.05)';ctx.lineWidth=1;
ctx.beginPath();ctx.moveTo(x+12,cy+lift+ch-14);ctx.lineTo(x+cw/2,cy+lift+14);ctx.stroke();
ctx.beginPath();ctx.moveTo(x+cw/2,cy+lift+14);ctx.lineTo(x+cw-12,cy+lift+ch-14);ctx.stroke();
ctx.shadowBlur=0;ctx.globalAlpha=1;},"""

# darkness 黑暗: 暗黑吸纳
faces['darkness'] = """'darkness':function(ctx,x,cy,lift,cw,ch,t,d,c,G){var _t=Date.now()/350;ctx.shadowBlur=0;
var _g=ctx.createRadialGradient(x+cw/2,cy+lift+ch/2,3,x+cw/2,cy+lift+ch/2,ch*0.5);var _b=Math.floor(100+40*Math.sin(_t*0.5));
_g.addColorStop(0,'rgba(10,5,30,0.55)');_g.addColorStop(0.5,'rgba(20,10,50,0.6)');_g.addColorStop(1,'rgba(30,20,'+_b+',0.65)');
ctx.fillStyle=_g;ctx.beginPath();ctx.roundRect(x+1,cy+lift+1,cw-2,ch-2,10);ctx.fill();
ctx.shadowColor='rgba(40,20,100,0.4)';ctx.shadowBlur=30;
ctx.strokeStyle='rgba(60,40,120,'+(0.3+0.2*Math.sin(_t*0.3))+')';ctx.lineWidth=2;ctx.beginPath();ctx.roundRect(x-1,cy+lift-1,cw+2,ch+2,12);ctx.stroke();
for(var _di=0;_di<3;_di++){var _dr=ch/8+_di*(ch/10)+ch/25*Math.sin(_t+_di);ctx.strokeStyle='rgba(80,60,160,'+(0.03+0.02*Math.sin(_t+_di))+')';ctx.lineWidth=0.8;
ctx.beginPath();ctx.arc(x+cw/2,cy+lift+ch/2,_dr,0,Math.PI*2);ctx.stroke();}
ctx.shadowBlur=0;ctx.globalAlpha=1;},"""

# defragment 碎片整理: 方块归位
faces['defragment'] = """'defragment':function(ctx,x,cy,lift,cw,ch,t,d,c,G){var _t=Date.now()/400;ctx.shadowBlur=0;
var _g=ctx.createLinearGradient(x,cy+lift,x,cy+lift+ch);var _b=Math.floor(220+35*Math.sin(_t*0.5));
_g.addColorStop(0,'rgba(30,60,100,0.5)');_g.addColorStop(0.5,'rgba(40,100,160,0.55)');_g.addColorStop(1,'rgba(50,140,'+_b+',0.6)');
ctx.fillStyle=_g;ctx.beginPath();ctx.roundRect(x+1,cy+lift+1,cw-2,ch-2,10);ctx.fill();
ctx.shadowColor='rgba(80,160,220,0.35)';ctx.shadowBlur=25;
ctx.strokeStyle='rgba(100,180,240,'+(0.25+0.15*Math.sin(_t*0.3))+')';ctx.lineWidth=1.5;ctx.beginPath();ctx.roundRect(x-1,cy+lift-1,cw+2,ch+2,12);ctx.stroke();
for(var _di=0;_di<3;_di++){ctx.fillStyle='rgba(120,200,255,'+(0.015+0.01*Math.sin(_t+_di))+')';ctx.beginPath();ctx.roundRect(x+14+_di*20,cy+lift+ch/3+_di*12,10,8,2);ctx.fill();
ctx.strokeStyle='rgba(120,200,255,0.03)';ctx.lineWidth=0.5;ctx.beginPath();ctx.roundRect(x+14+_di*20,cy+lift+ch/3+_di*12,10,8,2);ctx.stroke();}
ctx.shadowBlur=0;ctx.globalAlpha=1;},"""

# doomAndGloom 末日: 骷髅辐射
faces['doomAndGloom'] = """'doomAndGloom':function(ctx,x,cy,lift,cw,ch,t,d,c,G){var _t=Date.now()/300;ctx.shadowBlur=0;
var _g=ctx.createRadialGradient(x+cw/2,cy+lift+ch/2,3,x+cw/2,cy+lift+ch/2,ch*0.5);var _gv=Math.floor(100+40*Math.sin(_t*0.5)),_b=Math.floor(180+50*Math.sin(_t*0.3+1));
_g.addColorStop(0,'rgba(20,10,40,0.55)');_g.addColorStop(0.5,'rgba(40,20,80,0.6)');_g.addColorStop(1,'rgba(60,40,120,0.65)');
ctx.fillStyle=_g;ctx.beginPath();ctx.roundRect(x+1,cy+lift+1,cw-2,ch-2,10);ctx.fill();
ctx.shadowColor='rgba(80,40,160,0.4)';ctx.shadowBlur=30;
ctx.strokeStyle='rgba(100,60,180,'+(0.3+0.2*Math.sin(_t*0.4))+')';ctx.lineWidth=2;ctx.beginPath();ctx.roundRect(x-1,cy+lift-1,cw+2,ch+2,12);ctx.stroke();
ctx.fillStyle='rgba(120,80,200,0.03)';ctx.beginPath();ctx.arc(x+cw/2,cy+lift+ch/2-3,ch/11,0,Math.PI*2);ctx.fill();
ctx.strokeStyle='rgba(120,80,200,0.04)';ctx.lineWidth=0.8;ctx.beginPath();ctx.arc(x+cw/2,cy+lift+ch/2-3,ch/11,0,Math.PI*2);ctx.stroke();
ctx.shadowBlur=0;ctx.globalAlpha=1;},"""

# emptyFist 空手: 拳风轨迹
faces['emptyFist'] = """'emptyFist':function(ctx,x,cy,lift,cw,ch,t,d,c,G){var _t=Date.now()/250;ctx.shadowBlur=0;
var _g=ctx.createRadialGradient(x+cw/2,cy+lift+ch/2,3,x+cw/2,cy+lift+ch/2,ch*0.5);var _r=Math.floor(240+15*Math.sin(_t*0.5));
_g.addColorStop(0,'rgba(180,80,20,0.5)');_g.addColorStop(0.5,'rgba(240,120,30,0.55)');_g.addColorStop(1,'rgba('+_r+',160,40,0.6)');
ctx.fillStyle=_g;ctx.beginPath();ctx.roundRect(x+1,cy+lift+1,cw-2,ch-2,10);ctx.fill();
ctx.shadowColor='rgba(255,180,50,0.4)';ctx.shadowBlur=30;
ctx.strokeStyle='rgba(255,220,80,'+(0.3+0.2*Math.sin(_t*0.4))+')';ctx.lineWidth=2;ctx.beginPath();ctx.roundRect(x-1,cy+lift-1,cw+2,ch+2,12);ctx.stroke();
ctx.strokeStyle='rgba(255,240,100,0.05)';ctx.lineWidth=1.5;
ctx.beginPath();ctx.moveTo(x+12,cy+lift+ch-12);ctx.quadraticCurveTo(x+cw/2,cy+lift+12,x+cw-12,cy+lift+ch-12);ctx.stroke();
ctx.shadowBlur=0;ctx.globalAlpha=1;},"""

# escapePlan 逃脱计划: 箭头逃脱
faces['escapePlan'] = """'escapePlan':function(ctx,x,cy,lift,cw,ch,t,d,c,G){var _t=Date.now()/350;ctx.shadowBlur=0;
var _g=ctx.createLinearGradient(x,cy+lift,x+cw,cy+lift+ch);var _gv=Math.floor(200+40*Math.sin(_t*0.5));
_g.addColorStop(0,'rgba(30,80,40,0.5)');_g.addColorStop(0.5,'rgba(40,140,60,0.55)');_g.addColorStop(1,'rgba(60,180,'+_gv+',0.6)');
ctx.fillStyle=_g;ctx.beginPath();ctx.roundRect(x+1,cy+lift+1,cw-2,ch-2,10);ctx.fill();
ctx.shadowColor='rgba(80,220,100,0.3)';ctx.shadowBlur=22;
ctx.strokeStyle='rgba(100,240,120,'+(0.2+0.12*Math.sin(_t*0.3))+')';ctx.lineWidth=1.5;ctx.beginPath();ctx.roundRect(x-1,cy+lift-1,cw+2,ch+2,12);ctx.stroke();
ctx.strokeStyle='rgba(120,255,140,0.05)';ctx.lineWidth=1.2;
ctx.beginPath();ctx.moveTo(x+10,cy+lift+ch-10);ctx.lineTo(x+cw-10,cy+lift+10);ctx.stroke();
ctx.beginPath();ctx.moveTo(x+cw-10,cy+lift+10);ctx.lineTo(x+cw-18,cy+lift+15);ctx.stroke();
ctx.beginPath();ctx.moveTo(x+cw-10,cy+lift+10);ctx.lineTo(x+cw-15,cy+lift+8);ctx.stroke();
ctx.shadowBlur=0;ctx.globalAlpha=1;},"""

# fearNoEvil 无畏: 狮头威严
faces['fearNoEvil'] = """'fearNoEvil':function(ctx,x,cy,lift,cw,ch,t,d,c,G){var _t=Date.now()/400;ctx.shadowBlur=0;
var _g=ctx.createRadialGradient(x+cw/2,cy+lift+ch/2,3,x+cw/2,cy+lift+ch/2,ch*0.5);var _r=Math.floor(240+15*Math.sin(_t*0.5)),_gv=Math.floor(220+30*Math.sin(_t*0.3+1));
_g.addColorStop(0,'rgba(180,140,40,0.5)');_g.addColorStop(0.5,'rgba(240,200,60,0.55)');_g.addColorStop(1,'rgba('+_r+','+_gv+',80,0.6)');
ctx.fillStyle=_g;ctx.beginPath();ctx.roundRect(x+1,cy+lift+1,cw-2,ch-2,10);ctx.fill();
ctx.shadowColor='rgba(255,230,80,0.4)';ctx.shadowBlur=30;
ctx.strokeStyle='rgba(255,240,120,'+(0.3+0.2*Math.sin(_t*0.4))+')';ctx.lineWidth=2;ctx.beginPath();ctx.roundRect(x-1,cy+lift-1,cw+2,ch+2,12);ctx.stroke();
ctx.fillStyle='rgba(255,250,140,0.03)';ctx.beginPath();ctx.arc(x+cw/2,cy+lift+ch/2-3,ch/9,0,Math.PI*2);ctx.fill();
ctx.strokeStyle='rgba(255,250,140,0.04)';ctx.lineWidth=0.8;ctx.beginPath();ctx.arc(x+cw/2,cy+lift+ch/2-3,ch/9,0,Math.PI*2);ctx.stroke();
ctx.shadowBlur=0;ctx.globalAlpha=1;},"""

# footwork 步法: 脚印交错
faces['footwork'] = """'footwork':function(ctx,x,cy,lift,cw,ch,t,d,c,G){var _t=Date.now()/400;ctx.shadowBlur=0;
var _g=ctx.createLinearGradient(x,cy+lift,x,cy+lift+ch);var _b=Math.floor(200+40*Math.sin(_t*0.5));
_g.addColorStop(0,'rgba(40,50,100,0.5)');_g.addColorStop(0.5,'rgba(60,80,160,0.55)');_g.addColorStop(1,'rgba(50,70,'+_b+',0.6)');
ctx.fillStyle=_g;ctx.beginPath();ctx.roundRect(x+1,cy+lift+1,cw-2,ch-2,10);ctx.fill();
ctx.shadowColor='rgba(80,120,220,0.3)';ctx.shadowBlur=22;
ctx.strokeStyle='rgba(100,140,240,'+(0.2+0.12*Math.sin(_t*0.3))+')';ctx.lineWidth=1.5;ctx.beginPath();ctx.roundRect(x-1,cy+lift-1,cw+2,ch+2,12);ctx.stroke();
for(var _fi=0;_fi<3;_fi++){ctx.fillStyle='rgba(120,160,255,'+(0.015+0.01*Math.sin(_t+_fi))+')';ctx.beginPath();ctx.ellipse(x+15+_fi*20,cy+lift+ch/3+_fi*15,7,4,0,0,Math.PI*2);ctx.fill();}
ctx.shadowBlur=0;ctx.globalAlpha=1;},"""

# geneticAlgorithm 遗传算法: DNA双螺
faces['geneticAlgorithm'] = """'geneticAlgorithm':function(ctx,x,cy,lift,cw,ch,t,d,c,G){var _t=Date.now()/350;ctx.shadowBlur=0;
var _g=ctx.createLinearGradient(x,cy+lift,x,cy+lift+ch);var _b=Math.floor(220+35*Math.sin(_t*0.5)),_gv=Math.floor(180+40*Math.sin(_t*0.3+1));
_g.addColorStop(0,'rgba(30,60,80,0.5)');_g.addColorStop(0.5,'rgba(40,100,140,0.55)');_g.addColorStop(1,'rgba(50,140,180,0.6)');
ctx.fillStyle=_g;ctx.beginPath();ctx.roundRect(x+1,cy+lift+1,cw-2,ch-2,10);ctx.fill();
ctx.shadowColor='rgba(80,180,220,0.35)';ctx.shadowBlur=25;
ctx.strokeStyle='rgba(100,200,240,'+(0.25+0.15*Math.sin(_t*0.3))+')';ctx.lineWidth=1.5;ctx.beginPath();ctx.roundRect(x-1,cy+lift-1,cw+2,ch+2,12);ctx.stroke();
ctx.strokeStyle='rgba(120,220,255,0.04)';ctx.lineWidth=0.8;
ctx.beginPath();ctx.moveTo(x+12,cy+lift+15);ctx.lineTo(x+cw-12,cy+lift+ch-15);ctx.stroke();
ctx.beginPath();ctx.moveTo(x+12,cy+lift+ch-15);ctx.lineTo(x+cw-12,cy+lift+15);ctx.stroke();
ctx.beginPath();ctx.moveTo(x+cw/2,cy+lift+15);ctx.lineTo(x+cw/2,cy+lift+ch-15);ctx.stroke();
ctx.shadowBlur=0;ctx.globalAlpha=1;},"""

# goForTheEyes 攻击眼部: 瞄准十字
faces['goForTheEyes'] = """'goForTheEyes':function(ctx,x,cy,lift,cw,ch,t,d,c,G){var _t=Date.now()/350;ctx.shadowBlur=0;
var _g=ctx.createRadialGradient(x+cw/2,cy+lift+ch/2,3,x+cw/2,cy+lift+ch/2,ch*0.5);var _r=Math.floor(220+35*Math.sin(_t*0.5)),_gv=Math.floor(200+30*Math.sin(_t*0.3+1));
_g.addColorStop(0,'rgba(120,80,20,0.5)');_g.addColorStop(0.5,'rgba(200,140,40,0.55)');_g.addColorStop(1,'rgba('+_r+','+_gv+',60,0.6)');
ctx.fillStyle=_g;ctx.beginPath();ctx.roundRect(x+1,cy+lift+1,cw-2,ch-2,10);ctx.fill();
ctx.shadowColor='rgba(255,200,60,0.35)';ctx.shadowBlur=25;
ctx.strokeStyle='rgba(255,220,80,'+(0.25+0.15*Math.sin(_t*0.3))+')';ctx.lineWidth=1.5;ctx.beginPath();ctx.roundRect(x-1,cy+lift-1,cw+2,ch+2,12);ctx.stroke();
ctx.strokeStyle='rgba(255,240,100,0.05)';ctx.lineWidth=0.8;
ctx.beginPath();ctx.arc(x+cw/2,cy+lift+ch/2,ch/10,0,Math.PI*2);ctx.stroke();
ctx.beginPath();ctx.moveTo(x+cw/2-8,cy+lift+ch/2);ctx.lineTo(x+cw/2+8,cy+lift+ch/2);ctx.stroke();
ctx.beginPath();ctx.moveTo(x+cw/2,cy+lift+ch/2-8);ctx.lineTo(x+cw/2,cy+lift+ch/2+8);ctx.stroke();
ctx.shadowBlur=0;ctx.globalAlpha=1;},"""

# helloWorld 你好世界: 代码符号
faces['helloWorld'] = """'helloWorld':function(ctx,x,cy,lift,cw,ch,t,d,c,G){var _t=Date.now()/400;ctx.shadowBlur=0;
var _g=ctx.createLinearGradient(x,cy+lift,x,cy+lift+ch);var _b=Math.floor(200+40*Math.sin(_t*0.5)),_gv=Math.floor(180+40*Math.sin(_t*0.3+1));
_g.addColorStop(0,'rgba(20,40,60,0.5)');_g.addColorStop(0.5,'rgba(30,60,100,0.55)');_g.addColorStop(1,'rgba(40,80,'+_b+',0.6)');
ctx.fillStyle=_g;ctx.beginPath();ctx.roundRect(x+1,cy+lift+1,cw-2,ch-2,10);ctx.fill();
ctx.shadowColor='rgba(60,120,200,0.3)';ctx.shadowBlur=22;
ctx.strokeStyle='rgba(80,140,220,'+(0.2+0.12*Math.sin(_t*0.3))+')';ctx.lineWidth=1.5;ctx.beginPath();ctx.roundRect(x-1,cy+lift-1,cw+2,ch+2,12);ctx.stroke();
ctx.strokeStyle='rgba(100,160,240,0.04)';ctx.lineWidth=0.8;
ctx.beginPath();ctx.moveTo(x+12,cy+lift+15);ctx.lineTo(x+cw-12,cy+lift+15);ctx.stroke();
ctx.beginPath();ctx.moveTo(x+12,cy+lift+ch/2);ctx.lineTo(x+cw-12,cy+lift+ch/2);ctx.stroke();
ctx.beginPath();ctx.moveTo(x+12,cy+lift+ch-15);ctx.lineTo(x+cw-12,cy+lift+ch-15);ctx.stroke();
ctx.shadowBlur=0;ctx.globalAlpha=1;},"""

print("=== 重画21张表情包卡面 + 神化 ===")
ok = 0
for cid, new_func in faces.items():
    text, success = replace_face(text, cid, new_func)
    if success:
        ok += 1
    # else: already printed by replace_face

print(f"{ok}/{len(faces)} replaced")

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
