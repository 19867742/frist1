# -*- coding: utf-8 -*-
"""FlowAtlas 插图生成器：同一份图元规格同时产出 SVG（真图文件 + 内联副本）与 PNG 预览"""
import os, math, json
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(ROOT, 'assets'); os.makedirs(ASSETS, exist_ok=True)
DOCS = os.path.join(ROOT, 'docs'); os.makedirs(DOCS, exist_ok=True)

W = 96
WHITE = '#FFFFFF'
YEL = '#FFD75E'

def R(x, y, w, h, rad, color, op=1.0): return ('r', x, y, w, h, rad, color, op)
def C(cx, cy, r, color, op=1.0): return ('c', cx, cy, r, color, op)
def RING(cx, cy, r, w, color, op=1.0): return ('ring', cx, cy, r, w, color, op)
def ARC(cx, cy, r, a0, a1, w, color, op=1.0): return ('arc', cx, cy, r, a0, a1, w, color, op)
def P(pts, color, w, op=1.0, close=False, fill=None): return ('p', pts, color, w, op, close, fill)
def PATH(d, color, w, op=1.0, fill=None): return ('path', d, color, w, op, fill)

# ---- 配色 ----
C_FOOD=(255,107,107); C_TRA=(77,150,255); C_SHOP=(244,115,185); C_DAILY=(255,176,32)
C_HOME=(142,124,255); C_TEL=(46,211,183); C_FUN=(255,138,61); C_HEALTH=(62,193,211)
C_EDU=(108,92,231); C_SOC=(255,92,138); C_FIN=(91,107,140); C_PET=(160,193,90)
C_GREY=(154,165,177); C_INC=(34,197,94); C_WARN=(234,179,8); C_ACC=(77,150,255)
C_ACC2=(142,124,255); C_PINK=(244,115,185)

def scene(name, c1, c2, prims):
    return {'name': name, 'c1': c1, 'c2': c2, 'prims': prims}

S = []
# ---------- 模块插图 ----------
S.append(scene('networth', C_ACC, C_ACC2, [
    R(20,34,52,34,9,WHITE,.95), R(20,34,52,10,9,WHITE,.55),
    R(56,44,20,16,5,WHITE,.95), C(70,52,4,YEL,1),
    C(30,28,7,WHITE,.35), C(44,24,4,WHITE,.3), C(58,29,3,WHITE,.25)]))
S.append(scene('month', C_ACC, C_TEL, [
    R(22,24,52,50,10,WHITE,.95), R(22,24,52,12,10,WHITE,.6), R(22,32,52,5,0,WHITE,.6),
    R(33,17,5,10,2.5,WHITE,.95), R(58,17,5,10,2.5,WHITE,.95),
    R(30,44,10,9,3,C_ACC,.85), R(44,44,10,9,3,C_ACC,.3), R(58,44,10,9,3,C_ACC,.3),
    R(30,58,10,9,3,C_ACC,.3), R(44,58,10,9,3,C_ACC,.85), R(58,58,10,9,3,C_ACC,.3)]))
S.append(scene('budget', C_FOOD, C_DAILY, [
    RING(48,48,25,11,WHITE,.25), ARC(48,48,25,-90,60,11,YEL,1), ARC(48,48,25,60,180,11,WHITE,.95),
    C(48,48,6,WHITE,1), R(66,30,18,12,6,WHITE,.95)]))
S.append(scene('goal', C_INC, C_TEL, [
    P([(24,72),(44,40),(56,54),(72,24)],WHITE,5,.9), P([(66,22),(74,22),(74,30)],YEL,5,1),
    C(72,24,5,YEL,1), C(24,72,5,WHITE,.95), R(20,70,56,4,2,WHITE,.35)]))
S.append(scene('debt', (239,68,68), C_PINK, [
    R(18,34,58,36,8,WHITE,.95), R(18,42,58,7,0,WHITE,.55), R(22,56,18,7,3.5,WHITE,.45),
    P([(68,64),(68,78)],YEL,4,.95), P([(62,73),(68,79),(74,73)],YEL,4,.95)]))
S.append(scene('sub', C_ACC2, C_PINK, [
    ARC(48,46,20,-40,200,7,WHITE,.95), P([(24,26),(24,40),(38,40)],WHITE,5,.95),
    C(48,46,6,YEL,1), R(60,64,20,14,4,WHITE,.9)]))
S.append(scene('report', C_TEL, C_ACC, [
    R(20,20,56,56,10,WHITE,.95), R(30,52,8,16,3,C_ACC,.9), R(44,40,8,28,3,C_ACC2,.9), R(58,30,8,38,3,C_TEL,.9),
    P([(28,42),(42,32),(56,36),(68,22)],YEL,4,.95)]))
S.append(scene('import', C_FUN, C_DAILY, [
    P([(48,22),(48,52)],WHITE,6,.95), P([(38,43),(48,54),(58,43)],WHITE,6,.95),
    R(24,60,48,16,7,WHITE,.55), R(24,60,48,6,3,YEL,.9)]))
S.append(scene('account', C_DAILY, C_FUN, [
    R(24,28,48,14,5,WHITE,.45), R(20,36,56,16,6,WHITE,.7), R(16,46,64,26,8,WHITE,.95),
    R(62,54,12,8,4,YEL,1), C(30,59,4,WHITE,.5)]))
S.append(scene('rule', C_GREY, C_ACC, [
    C(48,48,13,WHITE,.95), RING(48,48,13,5,WHITE,.35),
    P([(48,20),(48,30)],WHITE,5,.8), P([(48,66),(48,76)],WHITE,5,.8),
    P([(20,48),(30,48)],WHITE,5,.8), P([(66,48),(76,48)],WHITE,5,.8),
    C(48,48,5,YEL,1)]))
S.append(scene('privacy', C_ACC2, C_ACC, [
    RING(48,38,15,8,WHITE,.95), R(22,46,52,30,9,WHITE,.95), C(48,58,6,C_ACC2,.9), R(45,58,6,12,3,C_ACC2,.9)]))
S.append(scene('backup', C_TEL, C_ACC2, [
    C(34,44,11,WHITE,.95), C(50,38,14,WHITE,.95), C(64,46,10,WHITE,.95), R(30,44,38,14,7,WHITE,.95),
    P([(48,20),(48,36)],YEL,5,.95), P([(41,29),(48,37),(55,29)],YEL,5,.95)]))
S.append(scene('remind', C_WARN, C_FUN, [
    C(34,44,7,WHITE,.95), C(62,44,7,WHITE,.95), R(28,44,40,15,0,WHITE,.95), R(30,42,36,10,5,WHITE,.95),
    R(23,57,50,7,3.5,WHITE,.8), C(48,32,4,WHITE,.8), C(48,69,6,YEL,1)]))
S.append(scene('insight', C_WARN, C_INC, [
    C(48,42,20,WHITE,.95), R(41,58,14,10,4,WHITE,.8), R(43,68,10,5,2.5,WHITE,.6),
    P([(48,32),(48,44)],YEL,4,.9), C(48,50,3,YEL,1)]))
S.append(scene('empty', C_GREY, C_ACC, [
    R(22,36,52,36,8,WHITE,.35), P([(22,44),(48,60),(74,44)],WHITE,5,.7),
    C(48,32,8,YEL,.85)]))
S.append(scene('welcome', C_ACC2, C_PINK, [
    P([(48,18),(56,40),(78,46),(58,54),(50,76),(40,54),(20,46),(40,40)],WHITE,3,.95,True),
    C(48,46,7,YEL,1), C(74,24,4,WHITE,.7), C(24,70,4,WHITE,.6)]))
S.append(scene('ocr', C_ACC, C_TEL, [
    R(22,30,52,38,9,WHITE,.95), R(33,24,14,8,3,WHITE,.8), C(48,50,11,WHITE,.3), RING(48,50,11,4,YEL,1),
    R(26,64,44,3,1.5,WHITE,.35)]))
S.append(scene('export', C_FUN, C_PINK, [
    P([(48,74),(48,42)],WHITE,6,.95), P([(38,52),(48,40),(58,52)],WHITE,6,.95),
    R(24,20,48,12,5,WHITE,.5), C(66,26,4,YEL,1)]))

# ---------- 分类插图 ----------
S.append(scene('food', C_FOOD, (255,170,120), [
    ARC(46,44,20,0,180,8,WHITE,.95), R(24,44,44,6,3,WHITE,.95), P([(70,28),(60,58)],YEL,5,.9), P([(76,30),(66,58)],YEL,5,.7)]))
S.append(scene('transport', C_TRA, C_TEL, [
    R(22,42,52,20,8,WHITE,.95), R(32,30,32,14,7,WHITE,.7), C(34,64,7,WHITE,.95), C(62,64,7,WHITE,.95)]))
S.append(scene('shopping', C_SHOP, C_ACC2, [
    R(26,38,44,36,8,WHITE,.95), RING(48,40,12,6,WHITE,.7), C(48,56,5,YEL,1)]))
S.append(scene('daily', C_DAILY, C_FUN, [
    R(36,30,24,46,9,WHITE,.95), R(42,20,12,10,4,WHITE,.65), R(40,48,16,4,2,C_DAILY,.5), R(40,58,16,4,2,C_DAILY,.5)]))
S.append(scene('housing', C_HOME, C_ACC, [
    P([(48,24),(76,48),(20,48)],WHITE,3,.95,True), R(28,46,40,30,4,WHITE,.95), R(42,60,12,16,3,C_HOME,.85)]))
S.append(scene('telecom', C_TEL, C_ACC, [
    R(34,26,28,48,8,WHITE,.95), R(40,32,16,26,3,WHITE,.4), C(48,66,3,YEL,1),
    RING(24,44,10,4,WHITE,.45), RING(16,44,18,4,WHITE,.28)]))
S.append(scene('fun', C_FUN, C_PINK, [
    R(24,36,48,28,12,WHITE,.95), C(37,50,5,WHITE,.35), C(60,50,5,YEL,1),
    P([(52,42),(52,58)],WHITE,4,.5), P([(44,50),(60,50)],WHITE,4,.5)]))
S.append(scene('health', C_HEALTH, C_TEL, [
    R(24,38,48,34,10,WHITE,.95), R(43,44,10,22,3,C_HEALTH,.9), R(37,50,22,10,3,C_HEALTH,.9)]))
S.append(scene('edu', C_EDU, C_ACC2, [
    P([(20,30),(46,24),(46,68),(20,74)],WHITE,3,.95,True), P([(76,30),(50,24),(50,68),(76,74)],WHITE,3,.8,True),
    R(45,24,6,44,3,WHITE,.5), R(26,38,14,3,1.5,C_EDU,.55), R(26,46,14,3,1.5,C_EDU,.4), R(56,38,14,3,1.5,C_EDU,.4)]))
S.append(scene('social', C_SOC, C_PINK, [
    R(24,40,48,32,6,WHITE,.95), R(44,40,8,32,0,YEL,.9), R(24,44,48,7,0,YEL,.9),
    RING(38,36,8,6,WHITE,.8), RING(58,36,8,6,WHITE,.8)]))
S.append(scene('finance', C_FIN, C_ACC, [
    P([(48,20),(74,34),(22,34)],WHITE,3,.9,True), R(26,38,6,24,2,WHITE,.8), R(45,38,6,24,2,WHITE,.8),
    R(64,38,6,24,2,WHITE,.8), R(20,64,56,7,3,YEL,.95)]))
S.append(scene('pet', C_PET, C_TEL, [
    C(36,38,7,WHITE,.95), C(54,34,7,WHITE,.95), C(24,50,6,WHITE,.8), C(66,48,6,WHITE,.8),
    C(45,58,12,WHITE,.95), C(41,56,3,C_PET,.5), C(49,56,3,C_PET,.5)]))
S.append(scene('other', C_GREY, C_ACC, [
    R(24,42,48,30,6,WHITE,.95), R(24,42,48,10,6,WHITE,.5), P([(24,48),(48,60),(72,48)],WHITE,4,.5)]))
S.append(scene('salary', C_INC, C_TEL, [
    R(20,42,56,26,6,WHITE,.95), C(48,55,9,WHITE,.45), R(28,48,8,5,2,YEL,.9), R(60,56,8,5,2,YEL,.9)]))
S.append(scene('bonus', C_WARN, C_FUN, [
    R(34,44,28,26,5,WHITE,.95), P([(34,44),(48,34),(62,44)],WHITE,4,.9),
    R(44,34,8,36,0,WHITE,.6), R(24,40,12,10,4,WHITE,.75), R(60,40,12,10,4,WHITE,.75)]))
S.append(scene('parttime', C_TEL, C_INC, [
    R(22,40,52,32,7,WHITE,.95), R(38,32,20,10,4,WHITE,.7), R(44,48,10,4,2,YEL,1), R(22,50,52,4,0,WHITE,.35)]))
S.append(scene('reimburse', C_ACC, C_TEL, [
    R(28,20,40,56,6,WHITE,.95), P([(34,32),(56,32)],WHITE,.01,0),
    R(34,32,22,4,2,C_ACC,.45), R(34,42,22,4,2,C_ACC,.3), R(34,52,14,4,2,C_ACC,.3),
    C(62,66,9,YEL,.95)]))
S.append(scene('refund', C_GREY, C_TEL, [
    ARC(48,48,20,120,390,7,WHITE,.95), C(48,48,7,YEL,.9),
    P([(26,56),(38,52),(34,66)],YEL,2,.95,True)]))
S.append(scene('giftin', (239,68,68), C_SOC, [
    R(26,34,44,42,5,WHITE,.95), R(26,34,44,9,0,WHITE,.55),
    R(44,34,8,42,0,YEL,.9), C(48,50,7,YEL,1)]))
S.append(scene('interest', C_INC, C_WARN, [
    C(36,38,12,WHITE,.9), C(60,58,12,WHITE,.9), P([(24,68),(72,24)],YEL,6,.95),
    C(36,38,4,C_INC,.6), C(60,58,4,C_INC,.6)]))
S.append(scene('invest', C_ACC2, C_INC, [
    R(18,52,8,20,3,WHITE,.4), R(32,42,8,30,3,WHITE,.55), R(46,34,8,38,3,WHITE,.7), R(60,24,8,48,3,WHITE,.9),
    P([(22,46),(38,34),(52,26),(68,16)],YEL,5,.95)]))
S.append(scene('incother', C_FUN, C_WARN, [
    RING(48,40,17,8,WHITE,.95), C(48,40,5,YEL,1), R(30,60,36,8,4,WHITE,.6), R(36,70,24,8,4,WHITE,.4)]))
S.append(scene('transfer', C_GREY, C_ACC, [
    P([(24,36),(72,36)],WHITE,6,.95), P([(62,26),(72,36),(62,46)],WHITE,6,.95),
    P([(72,62),(24,62)],YEL,6,.95), P([(34,52),(24,62),(34,72)],YEL,6,.95)]))

# ---------- 账户来源 / 提示 插图 ----------
S.append(scene('wechat', (7,193,96), (46,211,183), [
    R(22,26,52,36,13,WHITE,.95), P([(34,60),(30,72),(46,60)],WHITE,2,.95,True),
    C(37,42,3.5,(7,193,96),.9), C(59,42,3.5,(7,193,96),.9), ARC(48,46,9,20,160,3.5,(7,193,96),.9)]))
S.append(scene('alipay', (22,119,255), (77,150,255), [
    R(24,24,48,48,14,WHITE,.95), R(34,36,28,5,2.5,(22,119,255),.9),
    R(45,30,6,36,3,(22,119,255),.9), P([(32,54),(64,54)],(22,119,255),5,.75), P([(34,62),(44,70)],(22,119,255),4,.6)]))
S.append(scene('bank', (232,71,75), (255,138,61), [
    R(20,32,56,34,8,WHITE,.95), R(20,40,56,7,0,WHITE,.5), R(26,54,14,7,3,WHITE,.45),
    C(62,58,8,YEL,.95), P([(62,54),(62,62)],(232,71,75),2.5,.9), P([(58,57),(66,57)],(232,71,75),2.5,.9)]))
S.append(scene('cash', (245,166,35), (255,215,94), [
    R(18,38,60,22,5,WHITE,.6), R(22,42,52,22,5,WHITE,.95), C(48,53,7,WHITE,.4),
    R(30,47,8,4,2,(245,166,35),.9), R(58,56,8,4,2,(245,166,35),.9)]))
S.append(scene('manual', (142,124,255), (244,115,185), [
    R(22,28,44,42,8,WHITE,.35), R(26,32,36,5,2.5,WHITE,.6), R(26,42,28,4,2,WHITE,.5), R(26,50,20,4,2,WHITE,.4),
    P([(62,64),(78,34),(86,38),(70,68)],WHITE,2,.95,True), P([(60,72),(64,62),(70,68)],YEL,2,1,True)]))
S.append(scene('alert', (245,158,11), (239,68,68), [
    P([(48,20),(80,74),(16,74)],WHITE,4,.95,True), R(45,38,6,20,3,(245,158,11),1), C(48,64,3.5,(245,158,11),1)]))

print('illustrations:', len(S))

# ---------- SVG 渲染 ----------
def hexc(c):
    if isinstance(c, str): return c
    return '#%02X%02X%02X' % c

def svg_of(s):
    uid = 'g_' + s['name']
    parts = ['<defs><linearGradient id="%s" x1="0" y1="0" x2="1" y2="1">' % uid,
             '<stop offset="0" stop-color="%s"/><stop offset="1" stop-color="%s"/></linearGradient></defs>' % (hexc(s['c1']), hexc(s['c2'])),
             '<rect width="96" height="96" rx="24" fill="url(#%s)"/>' % uid]
    for pr in s['prims']:
        k = pr[0]
        if k == 'r':
            _, x, y, w, h, rad, col, op = pr
            parts.append('<rect x="%g" y="%g" width="%g" height="%g" rx="%g" fill="%s" opacity="%g"/>' % (x, y, w, h, rad, hexc(col), op))
        elif k == 'c':
            _, cx, cy, r, col, op = pr
            parts.append('<circle cx="%g" cy="%g" r="%g" fill="%s" opacity="%g"/>' % (cx, cy, r, hexc(col), op))
        elif k == 'ring':
            _, cx, cy, r, w, col, op = pr
            parts.append('<circle cx="%g" cy="%g" r="%g" fill="none" stroke="%s" stroke-width="%g" opacity="%g"/>' % (cx, cy, r, hexc(col), w, op))
        elif k == 'arc':
            _, cx, cy, r, a0, a1, w, col, op = pr
            def pt(a): return (cx + r*math.cos(math.radians(a)), cy + r*math.sin(math.radians(a)))
            x0, y0 = pt(a0); x1, y1 = pt(a1)
            large = 1 if (a1 - a0) % 360 > 180 else 0
            parts.append('<path d="M%g %g A%g %g 0 %d 1 %g %g" fill="none" stroke="%s" stroke-width="%g" stroke-linecap="round" opacity="%g"/>'
                         % (x0, y0, r, r, large, x1, y1, hexc(col), w, op))
        elif k == 'p':
            _, pts, col, w, op, close, fill = pr
            d = ' '.join('%g,%g' % (x, y) for x, y in pts)
            if close:
                parts.append('<polygon points="%s" fill="%s" opacity="%g"/>' % (d, hexc(fill or col), op))
            parts.append('<polyline points="%s" fill="none" stroke="%s" stroke-width="%g" stroke-linecap="round" stroke-linejoin="round" opacity="%g"/>' % (d, hexc(col), w, op))
        elif k == 'path':
            _, d, col, w, op, fill = pr
            parts.append('<path d="%s" fill="%s" stroke="%s" stroke-width="%g" opacity="%g"/>' % (d, hexc(fill) if fill else 'none', hexc(col), w, op))
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" width="96" height="96">' + ''.join(parts) + '</svg>'

for s in S:
    open(os.path.join(ASSETS, 'illust-%s.svg' % s['name']), 'w', encoding='utf-8').write(svg_of(s))

# 内联副本（离线 / 单文件版本用，避免额外请求）
lines = ["/* FlowAtlas · 插图库（由 tools/make_illustrations.py 生成，勿手改） */",
         "(function (root) {", "  'use strict';",
         "  var FA = (root.FA = root.FA || {});", "  var SVG = {"]
for s in S:
    lines.append('    %s: %s,' % (s['name'], json.dumps(svg_of(s), ensure_ascii=False)))
lines.append("  };")
lines.append("  FA.illust = {")
lines.append("    names: Object.keys(SVG),")
lines.append("    svg: SVG,")
lines.append("    /** 返回 data URI，可作为 <img src> 使用，离线可用 */")
lines.append("    uri: function (name) { return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(SVG[name] || SVG.other); },")
lines.append("    img: function (name, size) {")
lines.append("      var el = root.document.createElement('img');")
lines.append("      el.className = 'illust illust-' + name;")
lines.append("      el.src = FA.illust.uri(name);")
lines.append("      el.alt = name;")
lines.append("      el.width = size || 32; el.height = size || 32;")
lines.append("      el.setAttribute('loading', 'lazy');")
lines.append("      return el;")
lines.append("    }")
lines.append("  };")
lines.append("})(typeof globalThis !== 'undefined' ? globalThis : this);")
js = '\n'.join(lines) + '\n'
open(os.path.join(ROOT, 'js', 'illustrations.js'), 'w', encoding='utf-8').write(js)

# ---------- PNG 预览（同一份图元，双渲染器） ----------
def hex2rgb(h):
    h = h.lstrip('#'); return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))
def with_op(c, op, bg):
    cc = hex2rgb(hexc(c)) if isinstance(c, str) else tuple(c)
    return tuple(int(bg[i] + (cc[i]-bg[i])*op) for i in range(3))
def blend_grad(size, c1, c2):
    im = Image.new('RGB', (size, size)); dd = ImageDraw.Draw(im)
    a = hex2rgb(hexc(c1)); b = hex2rgb(hexc(c2))
    for y in range(size):
        t = y/(size-1)
        for_x = tuple(int(a[i]+(b[i]-a[i])*t) for i in range(3))
        dd.line([(0,y),(size,y)], fill=for_x)
    return im
def draw_one(s, size=96, scale=3):
    px = size*scale
    img = Image.new('RGBA', (px, px), (0,0,0,0))
    bg = blend_grad(px, s['c1'], s['c2'])
    mask = Image.new('L', (px,px), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0,0,px-1,px-1], radius=24*scale, fill=255)
    img.paste(bg, (0,0), mask)
    d = ImageDraw.Draw(img)
    # 背景基色（用于透明度混合）
    base = tuple(int((hex2rgb(hexc(s['c1']))[i]+hex2rgb(hexc(s['c2']))[i])/2) for i in range(3))
    k = scale
    for pr in s['prims']:
        t = pr[0]
        if t == 'r':
            _, x,y,w,h,rad,col,op = pr
            d.rounded_rectangle([x*k,y*k,(x+w)*k,(y+h)*k], radius=rad*k, fill=with_op(col,op,base))
        elif t == 'c':
            _, cx,cy,r,col,op = pr
            d.ellipse([(cx-r)*k,(cy-r)*k,(cx+r)*k,(cy+r)*k], fill=with_op(col,op,base))
        elif t == 'ring':
            _, cx,cy,r,w,col,op = pr
            d.ellipse([(cx-r)*k,(cy-r)*k,(cx+r)*k,(cy+r)*k], outline=with_op(col,op,base), width=int(w*k))
        elif t == 'arc':
            _, cx,cy,r,a0,a1,w,col,op = pr
            d.arc([(cx-r)*k,(cy-r)*k,(cx+r)*k,(cy+r)*k], a0, a1, fill=with_op(col,op,base), width=int(w*k))
        elif t == 'p':
            _, pts, col, w, op, close, fill = pr
            pp = [(x*k,y*k) for x,y in pts]
            if close: d.polygon(pp, fill=with_op(fill or col, op, base))
            d.line(pp + ([pp[0]] if close else []), fill=with_op(col,op,base), width=int(w*k), joint='curve')
            for p in pp: d.ellipse([p[0]-w*k/2,p[1]-w*k/2,p[0]+w*k/2,p[1]+w*k/2], fill=with_op(col,op,base))
    return img

# 导出 PNG 版插图（供预览图合成 / 用户取用）
PNGDIR = os.path.join(ASSETS, 'png'); os.makedirs(PNGDIR, exist_ok=True)
for s in S:
    draw_one(s, 96, 3).resize((288, 288), Image.LANCZOS).save(os.path.join(PNGDIR, s['name'] + '.png'))

cols = 8
rows = (len(S)+cols-1)//cols
cell = 132
sheet = Image.new('RGB', (cols*cell, rows*cell), (245,247,252))
sd = ImageDraw.Draw(sheet)
f = ImageFont.truetype('C:/Windows/Fonts/msyh.ttc', 15)
for i, s in enumerate(S):
    im = draw_one(s, 96, 2).resize((104,104), Image.LANCZOS)
    x = (i % cols)*cell + 14; y = (i//cols)*cell + 8
    sheet.paste(im, (x, y), im)
    sd.text((x+52, y+108), s['name'], font=f, fill=(90,100,120), anchor='mm')
sheet.save(os.path.join(DOCS, 'illustrations-sheet.png'))
kb = os.path.getsize(os.path.join(ROOT, 'js', 'illustrations.js'))/1024
print('svg files: %d, illustrations.js: %.1f KB, sheet: %s' % (len(S), kb, os.path.join(DOCS, 'illustrations-sheet.png')))
