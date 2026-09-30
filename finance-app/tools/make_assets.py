# -*- coding: utf-8 -*-
import os, math
from PIL import Image, ImageDraw
from openpyxl import Workbook
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
icons = os.path.join(root, 'icons')
os.makedirs(icons, exist_ok=True)

def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))

def make(size, path):
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    c1, c2, c3 = (77, 150, 255), (142, 124, 255), (244, 115, 185)
    for y in range(size):
        t = y / max(1, size - 1)
        col = lerp(c1, c2, t * 2) if t < 0.5 else lerp(c2, c3, (t - 0.5) * 2)
        d.line([(0, y), (size, y)], fill=col + (255,))
    # 圆角遮罩
    mask = Image.new('L', (size, size), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, size - 1, size - 1], radius=int(size * 0.24), fill=255)
    img.putalpha(mask)
    # 白色彩色柱状图 + 上升折线
    bar_w = size * 0.11
    base = size * 0.74
    heights = [0.20, 0.34, 0.27, 0.46]
    xs = [size * 0.22, size * 0.38, size * 0.54, size * 0.70]
    for i, h in enumerate(heights):
        hh = size * h
        d.rounded_rectangle([xs[i], base - hh, xs[i] + bar_w, base], radius=bar_w * 0.42,
                            fill=(255, 255, 255, 235 if i % 2 == 0 else 165))
    pts = [(xs[i] + bar_w / 2, base - size * heights[i] - size * 0.07) for i in range(4)]
    d.line(pts, fill=(255, 236, 120, 255), width=max(2, int(size * 0.035)), joint='curve')
    r = size * 0.032
    for (px, py) in pts:
        d.ellipse([px - r, py - r, px + r, py + r], fill=(255, 255, 255, 255))
    d.ellipse([size * 0.30, size * 0.26, size * 0.44, size * 0.40], outline=(255, 255, 255, 200), width=max(2, int(size * 0.03)))
    d.line([size * 0.44, size * 0.40, size * 0.52, size * 0.47], fill=(255, 255, 255, 200), width=max(2, int(size * 0.03)))
    img.save(path)

make(192, os.path.join(icons, 'icon-192.png'))
make(512, os.path.join(icons, 'icon-512.png'))
make(180, os.path.join(icons, 'apple-touch-icon.png'))

# 银行流水示例 xlsx
wb = Workbook()
ws = wb.active
ws.title = '交易明细'
ws.append(['中国某某银行 交易明细清单'])
ws.append(['账号：6222****8888', '', '导出时间', '2024-04-01'])
ws.append([])
ws.append(['交易日期', '交易时间', '摘要', '对方户名', '发生金额', '余额', '借贷标志', '交易流水号', '币种', '备注'])
rows = [
    ('2024-03-01', '09:15:22', '消费', '星巴克咖啡', -35.00, 8600.00, '借', 'B20240301001', 'CNY', ''),
    ('2024-03-05', '10:00:00', '转账', '房东王先生', -3200.00, 5400.00, '借', 'B20240305002', 'CNY', '三月房租'),
    ('2024-03-10', '09:12:00', '代发工资', '某某科技有限公司', 12800.00, 18200.00, '贷', 'B20240310003', 'CNY', '3月工资'),
    ('2024-03-15', '20:30:11', '消费', '京东商城', -1299.00, 16901.00, '借', 'B20240315004', 'CNY', '数码'),
    ('2024-03-18', '08:00:00', '自动扣款', '中国移动', -58.00, 16843.00, '借', 'B20240318005', 'CNY', ''),
    ('2024-03-22', '12:41:07', '退款', '京东商城', 1299.00, 18142.00, '贷', 'B20240322006', 'CNY', '退货'),
    ('2024-03-25', '10:00:00', '信用卡还款', '招商银行信用卡', -3000.00, 15142.00, '借', 'B20240325007', 'CNY', '自动还款'),
    ('2024-03-28', '18:20:00', '利息结息', '某某银行', 12.35, 15154.35, '贷', 'B20240328008', 'CNY', '季度结息'),
]
for r in rows:
    ws.append(list(r))
wb.save(os.path.join(root, 'samples', 'bank_sample.xlsx'))
print('OK')
