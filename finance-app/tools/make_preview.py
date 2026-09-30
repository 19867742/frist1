# -*- coding: utf-8 -*-
"""FlowAtlas 界面设计预览图（与 app 内同一套配色 / 布局参数）"""
import os
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'docs'); os.makedirs(OUT, exist_ok=True)
FD = 'C:/Windows/Fonts/'
_fc = {}
def font(sz, bold=False, emoji=False):
    k = (sz, bold, emoji)
    if k not in _fc: _fc[k] = ImageFont.truetype(FD + ('seguiemj.ttf' if emoji else ('msyhbd.ttc' if bold else 'msyh.ttc')), sz)
    return _fc[k]

ACCENT, ACCENT2 = (77,150,255), (142,124,255)
EXPENSE, INCOME = (255,107,107), (34,197,94)
TEXT, DIM, LINE = (22,32,58), (124,139,161), (232,237,245)
PAL = [(255,107,107),(77,150,255),(244,115,185),(255,176,32),(46,211,183),(142,124,255),(255,138,61),(62,193,211),(34,197,94),(234,179,8)]

def blend(c, a, bg):
    return tuple(int(bg[i] + (c[i]-bg[i])*a) for i in range(3))

def rr(d, box, r, fill=None, outline=None, width=1):
    d.rounded_rectangle(box, radius=r, fill=fill, outline=outline, width=width)

def grad_layer(box, c1, c2=None, c3=None):
    x0,y0,x1,y1 = box; w = max(1,x1-x0); h = max(1,y1-y0)
    lay = Image.new('RGB', (w,h)); dl = ImageDraw.Draw(lay)
    for i in range(h):
        t = i/(h-1) if h>1 else 0
        if c2 is None: c = c1
        elif c3 is None: c = tuple(int(c1[k]+(c2[k]-c1[k])*t) for k in range(3))
        elif t < 0.5: c = tuple(int(c1[k]+(c2[k]-c1[k])*(t*2)) for k in range(3))
        else: c = tuple(int(c2[k]+(c3[k]-c2[k])*((t-0.5)*2)) for k in range(3))
        dl.line([(0,i),(w,i)], fill=c)
    return lay

def paste_rr(img, box, r, c1, c2=None, c3=None):
    x0,y0,x1,y1 = box
    lay = grad_layer(box, c1, c2, c3).convert('RGBA')
    m = Image.new('L', lay.size, 0)
    ImageDraw.Draw(m).rounded_rectangle([0,0,x1-x0-1,y1-y0-1], radius=r, fill=255)
    img.paste(lay, (x0,y0), m)

_ILL = {}
def ill(name, size):
    p = os.path.join(ROOT, 'assets', 'png', name + '.png')
    if name not in _ILL: _ILL[name] = Image.open(p).convert('RGBA')
    return _ILL[name].resize((int(size), int(size)), Image.LANCZOS)
def paste_ill(img, name, x, y, size):
    im = ill(name, size); img.paste(im, (int(x), int(y)), im)

def txt(d, xy, s, sz, color, bold=False, anchor='la'):
    d.text(xy, s, font=font(sz, bold), fill=color, anchor=anchor)

def emo(d, xy, s, sz, color=(120,130,150), anchor='la'):
    d.text(xy, s, font=font(sz, False, True), fill=color, anchor=anchor, embedded_color=True)

def arc(d, cx, cy, r, a0, a1, color, w):
    d.arc([cx-r, cy-r, cx+r, cy+r], a0, a1, fill=color, width=w)

# ================= 1. 首页 =================
W, H = 900, 1800
img = Image.new('RGB', (W, H), (244,246,251)); d = ImageDraw.Draw(img)
for i in range(560):
    t = i/560
    d.line([(0,i),(W,i)], fill=(int(244-16*t), int(246-14*t), int(251-1*t)))
txt(d, (36, 46), '早上好，账本主人', 26, DIM)
txt(d, (36, 82), '2024年3月', 52, TEXT, True)
rr(d, (W-104, 48, W-40, 112), 22, (255,255,255)); emo(d, (W-72, 80), '🔔', 28, DIM, 'mm')
rr(d, (W-168, 48, W-116, 112), 22, (255,255,255)); emo(d, (W-142, 80), '👁', 28, DIM, 'mm')

paste_rr(img, (32,160,W-32,462), 34, (43,58,103), (77,93,187), (142,124,255))
txt(d, (66, 200), '净资产', 26, (200,208,235))
txt(d, (66, 232), '¥128,640.50', 62, (255,255,255), True)
rr(d, (W-164, 204, W-66, 250), 23, blend((255,255,255), 0.22, (86,100,175)))
txt(d, (W-115, 227), '健康', 24, (255,255,255), True, 'mm')
paste_ill(img, 'networth', W-162, 264, 88)
emo(d, (66, 322), '💎', 24, (255,255,255)); txt(d, (100, 322), '资产', 24, (200,208,235))
txt(d, (66, 356), '¥141,580.50', 32, (255,255,255), True)
emo(d, (356, 322), '💳', 24, (255,255,255)); txt(d, (390, 322), '负债', 24, (200,208,235))
txt(d, (356, 356), '¥12,940.00', 32, (255,255,255), True)
for i, m in enumerate(['12月','1月','2月','3月']):
    x = 66 + i*116; on = (m == '3月')
    rr(d, (x, 404, x+100, 448), 22, (255,255,255) if on else blend((255,255,255), 0.22, (86,100,175)))
    txt(d, (x+50, 426), m, 24, (43,58,103) if on else (255,255,255), True, 'mm')

# 本月收支卡
rr(d, (32, 486, W-32, 750), 30, (255,255,255))
for i,(k,v,c) in enumerate([('支出','¥8,432.60',EXPENSE),('收入','¥12,800.00',INCOME),('结余','¥4,367.40',INCOME)]):
    y = 518 + i*66
    txt(d, (66, y), k, 24, DIM); txt(d, (66, y+26), v, 38, c, True)
cx, cy = W-140, 616
arc(d, cx, cy, 67, 0, 360, LINE, 15)
arc(d, cx, cy, 67, -90, -90+int(360*0.68), ACCENT, 15)
txt(d, (cx, cy-10), '68%', 34, TEXT, True, 'mm'); txt(d, (cx, cy+30), '预算使用', 20, DIM, False, 'mm')
d.line([(66, 700), (W-66, 700)], fill=LINE)
txt(d, (66, 720), '共 146 笔 · 日均 ¥272.02', 22, DIM)
txt(d, (W-66, 720), '月报 →', 22, ACCENT, True, 'ra')

# 快捷宫格
quick = [('预算','budget'),('目标','goal'),('债务','debt'),('订阅','sub'),
         ('账户','account'),('报告','report'),('导入','import'),('设置','rule')]
gw = (W-64-3*18)/4
for i,(name,illname) in enumerate(quick):
    x = 32 + (i%4)*(gw+18); y = 770 + (i//4)*146
    rr(d, (x, y, x+gw, y+130), 26, (255,255,255))
    paste_ill(img, illname, x+gw/2-29, y+16, 58)
    txt(d, (x+gw/2, y+98), name, 24, DIM, True, 'mm')

# 提醒
rr(d, (32, 1074, W-32, 1156), 26, (255,243,224))
paste_ill(img, 'sub', 52, 1097, 36)
txt(d, (114, 1094), '腾讯视频 即将扣款', 26, TEXT, True)
txt(d, (114, 1126), '¥19.00 · 3月20日 前后自动续费', 22, DIM)
rr(d, (W-120, 1102, W-54, 1138), 18, EXPENSE); txt(d, (W-87, 1120), '+2', 22, (255,255,255), True, 'mm')

# 洞察
paste_ill(img, 'insight', 32, 1202, 34); txt(d, (74, 1206), '本月洞察', 30, TEXT, True)
for i,(il,t,c) in enumerate([('invest','本月支出比上月减少 12%，省下 ¥1,150.00',INCOME),('food','餐饮 占比最高 26%，共 ¥2,180.00',(255,176,32))]):
    y = 1240 + i*80
    rr(d, (32, y, W-32, y+68), 22, (255,255,255), outline=LINE, width=2)
    paste_ill(img, il, 52, y+19, 32)
    txt(d, (100, y+34), t, 23, TEXT, False, 'lm')

# 预算快览
paste_ill(img, 'budget', 32, 1428, 34); txt(d, (74, 1432), '预算快览', 30, TEXT, True); txt(d, (W-32, 1434), '管理', 24, ACCENT, True, 'ra')
rr(d, (32, 1464, W-32, 1668), 30, (255,255,255))
for i,(nm,vv,p,c) in enumerate([('餐饮月预算','¥1,842 / ¥2,200',0.84,(245,158,11)),('交通出行','¥312 / ¥600',0.52,ACCENT),('购物娱乐','¥1,690 / ¥1,500',1.13,EXPENSE)]):
    y = 1490 + i*64
    txt(d, (66, y), nm, 25, TEXT, True); txt(d, (W-66, y), vv, 24, c if p>1 else DIM, p>1, 'ra')
    rr(d, (66, y+32, W-66, y+44), 6, LINE); rr(d, (66, y+32, 66+min(1,p)*(W-132), y+44), 6, c)

# 底部标签栏
rr(d, (0, H-110, W, H), 0, (255,255,255)); d.line([(0,H-110),(W,H-110)], fill=LINE)
for i,(nm,em,on) in enumerate([('首页','🏠',True),('流水','📋',False),('','',None),('规划','🎯',False),('报告','📊',False)]):
    x = W*(i+0.5)/5
    if on is None:
        paste_rr(img, (int(x-44), H-146, int(x+44), H-58), 28, ACCENT, ACCENT2, (244,115,185))
        txt(d, (x, H-104), '＋', 46, (255,255,255), True, 'mm'); continue
    emo(d, (x, H-86), em, 30, ACCENT if on else (148,163,184), 'mm')
    txt(d, (x, H-44), nm, 21, ACCENT if on else (148,163,184), on, 'mm')
img.save(os.path.join(OUT, 'preview-home.png'))
print('home ok')

# ================= 2. 月报长图 =================
W2, H2 = 1080, 1900
DARK_BG, CARD_BG = (16,25,44), (34,46,70)
r = Image.new('RGB', (W2, H2), DARK_BG); d = ImageDraw.Draw(r)
r.paste(grad_layer((0,0,W2,H2), (11,18,32), (19,28,49), (14,22,38)), (0,0))
base = r.convert('RGBA')
for (cx, cy, rad, col) in [(120,120,380,(255,107,107)),(W2-80,260,340,(77,150,255)),(W2-160,H2-300,400,(142,124,255)),(180,H2-180,320,(46,211,183))]:
    lay = Image.new('RGBA', (W2,H2), (0,0,0,0)); dl = ImageDraw.Draw(lay)
    for i in range(46, 0, -1):
        ri = rad*i/46; a = int(60*(1-i/46)**1.5)
        dl.ellipse([cx-ri, cy-ri, cx+ri, cy+ri], fill=col+(a,))
    base = Image.alpha_composite(base, lay)
r = base.convert('RGB'); d = ImageDraw.Draw(r)

txt(d, (64, 80), '2024年3月 财务报告', 46, (255,255,255), True)
txt(d, (64, 144), 'FlowAtlas · 共 146 笔流水 · 04月01日 生成', 26, (155,168,195))
rr(d, (64, 200, W2-64, 452), 32, CARD_BG)
d.rounded_rectangle([64,200,W2-64,452], radius=32, outline=(52,66,94), width=2)
for i,(t,v,c,note,nc) in enumerate([('支出','¥8,432',EXPENSE,'▲ 12% 环比',(255,159,159)),('收入','¥12,800',INCOME,'▲ 8% 环比',(123,224,165)),('结余','¥4,367',ACCENT,'储蓄率 34%',(155,168,195))]):
    cx = 64 + (W2-128)*(i/3) + (W2-128)/6
    txt(d, (cx, 262), t, 30, (170,182,205), False, 'mm')
    txt(d, (cx, 332), v, 62, c, True, 'mm')
    txt(d, (cx, 402), note, 25, nc, True, 'mm')

txt(d, (64, 522), '支出构成', 34, (255,255,255), True)
cats = [('餐饮',2180,PAL[0]),('购物',1890,PAL[2]),('居住',1200,PAL[5]),('交通',860,PAL[1]),('娱乐',720,PAL[6]),('通讯',458,PAL[4]),('其他',1124,PAL[9])]
tot = sum(c[1] for c in cats)
cx, cy = 300, 740
a0 = -90
for name, v, c in cats:
    sweep = 360*v/tot
    arc(d, cx, cy, 115, a0+1.2, a0+sweep-1.2, c, 56)
    a0 += sweep
txt(d, (cx, cy-8), '¥8,432', 44, (255,255,255), True, 'mm'); txt(d, (cx, cy+42), '本月总支出', 21, (165,178,205), False, 'mm')
for i,(name, v, c) in enumerate(cats[:6]):
    y = 610 + i*62
    rr(d, (540, y-20, 566, y+6), 8, c)
    txt(d, (588, y-6), name, 28, (240,244,255), True, 'lm')
    txt(d, (W2-70, y-6), '¥%s  %d%%' % (format(v,','), round(v*100/tot)), 26, (255,255,255), True, 'rm')

ty = 960
txt(d, (64, ty), '近 6 个月走势', 34, (255,255,255), True)
gx, gy, gw, gh = 110, ty+52, W2-240, 170
inc = [9800,11200,12800,12800,12800,12800]; exp = [7400,9600,11200,9100,9580,8432]
mx = max(inc+exp)*1.15
XY = lambda i,v: (gx+gw*i/5, gy+gh-gh*v/mx)
for series, col in [(exp,EXPENSE),(inc,INCOME)]:
    pts = [XY(i,v) for i,v in enumerate(series)]
    d.line(pts, fill=col, width=5, joint='curve')
    for p in pts: d.ellipse([p[0]-7,p[1]-7,p[0]+7,p[1]+7], fill=DARK_BG, outline=col, width=4)
for i, lb in enumerate(['10月','11月','12月','1月','2月','3月']):
    txt(d, (XY(i,0)[0], gy+gh+30), lb, 23, (155,168,195), False, 'mm')

py = gy+gh+90
txt(d, (64, py), '消费最多', 34, (255,255,255), True)
for i,(nm,v,cnt) in enumerate([('海底捞',486,2),('京东',399,1),('永辉超市',342,3)]):
    y = py+48+i*54
    txt(d, (64, y), '%d. %s' % (i+1, nm), 27, (232,238,250))
    txt(d, (W2-70, y), '¥%d  ×%d' % (v,cnt), 27, (255,176,32), True, 'ra')

by = py+48+3*54+46
txt(d, (64, by), '预算执行', 34, (255,255,255), True)
for i,(nm,p,c) in enumerate([('餐饮月预算',0.84,(245,158,11)),('交通出行',0.52,INCOME),('购物娱乐',1.13,(239,68,68))]):
    y = by+46+i*54
    txt(d, (64, y), nm, 26, (232,238,250))
    rr(d, (64, y+30, W2-300, y+43), 6, (52,66,94))
    rr(d, (64, y+30, 64+min(1,p)*(W2-364), y+43), 6, c)
    txt(d, (W2-70, y+8), '%d%%' % round(p*100), 25, c, True, 'ra')

rr(d, (64, H2-118, W2-64, H2-46), 22, blend((255,255,255), 0.09, DARK_BG))
txt(d, (W2/2, H2-82), '储蓄率 34%   ·   日均 ¥272   ·   订阅 ¥21/月   ·   FlowAtlas 本地账本', 24, (205,215,235), False, 'mm')
r.save(os.path.join(OUT, 'preview-report.png'))
print('report ok')
