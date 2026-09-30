# -*- coding: utf-8 -*-
"""从 finance-app/icons/icon-512.png 生成安卓各密度启动图标"""
import os
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
APP = os.path.dirname(HERE)
SRC = os.path.join(os.path.dirname(APP), 'finance-app', 'icons', 'icon-512.png')
SIZES = {'mdpi': 48, 'hdpi': 72, 'xhdpi': 96, 'xxhdpi': 144, 'xxxhdpi': 192}

img = Image.open(SRC).convert('RGBA')
for d, px in SIZES.items():
    out = os.path.join(APP, 'app', 'src', 'main', 'res', 'mipmap-' + d)
    os.makedirs(out, exist_ok=True)
    img.resize((px, px), Image.LANCZOS).save(os.path.join(out, 'ic_launcher.png'))
    print('mipmap-%s/ic_launcher.png %dx%d' % (d, px, px))
print('OK')
