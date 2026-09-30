/* FlowAtlas · 图表库（原生 Canvas，无依赖，可导出高清图） */
(function (root) {
  'use strict';
  var FA = root.FA, U = FA.util;
  var Ch = (FA.chart = {});
  var PALETTE = ['#FF6B6B', '#4D96FF', '#F473B9', '#FFB020', '#2ED3B7', '#8E7CFF', '#FF8A3D', '#3EC1D3', '#22C55E', '#EAB308', '#EF4444', '#6C5CE7', '#14B8A6', '#A0C15A'];
  Ch.PALETTE = PALETTE;
  Ch.color = function (i) { return PALETTE[i % PALETTE.length]; };

  Ch.setup = function (canvas, opt) {
    opt = opt || {};
    var dpr = Math.min(root.devicePixelRatio || 1, 3);
    var w = opt.w || canvas.clientWidth || 320;
    var h = opt.h || canvas.clientHeight || 180;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    /* 必须显式设置 CSS 尺寸，否则高分屏下 canvas 会按物理像素撑破容器 */
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    var g = canvas.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, w, h);
    return { g: g, w: w, h: h, dpr: dpr };
  };
  Ch.roundRect = function (g, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  };
  Ch.font = function (g, size, weight) {
    g.font = (weight || 600) + ' ' + size + 'px -apple-system, "HarmonyOS Sans SC", "PingFang SC", "Microsoft YaHei", system-ui, sans-serif';
  };
  Ch.textColor = function () {
    return getComputedStyle(document.documentElement).getPropertyValue('--text').trim() || '#1f2937';
  };
  Ch.subColor = function () {
    return getComputedStyle(document.documentElement).getPropertyValue('--text-dim').trim() || '#94a3b8';
  };

  /* ---------- 环形图 ---------- */
  Ch.donut = function (canvas, opt) {
    var s = Ch.setup(canvas, opt), g = s.g, w = s.w, h = s.h;
    var data = (opt.data || []).filter(function (d) { return d.value > 0; });
    var total = U.sum(data, function (d) { return d.value; });
    var cx = w / 2, cy = h / 2, R = Math.min(w, h) / 2 - 6, r = R * (opt.inner || 0.62);
    if (!total) {
      g.strokeStyle = 'rgba(148,163,184,.25)'; g.lineWidth = R - r;
      g.beginPath(); g.arc(cx, cy, (R + r) / 2, 0, Math.PI * 2); g.stroke();
      Ch.font(g, 12, 500); g.fillStyle = Ch.subColor(); g.textAlign = 'center';
      g.fillText('暂无数据', cx, cy + 4);
      return;
    }
    var a0 = -Math.PI / 2, gap = data.length > 1 ? 0.02 : 0;
    data.forEach(function (d, i) {
      var ang = (d.value / total) * Math.PI * 2;
      g.beginPath();
      g.arc(cx, cy, (R + r) / 2, a0 + gap, a0 + ang - gap);
      g.strokeStyle = d.color || Ch.color(i);
      g.lineWidth = R - r;
      g.lineCap = 'butt';
      g.stroke();
      a0 += ang;
    });
    if (opt.center) {
      g.textAlign = 'center';
      Ch.font(g, opt.centerValueSize || 20, 700);
      g.fillStyle = Ch.textColor();
      g.fillText(opt.center.value, cx, cy + (opt.centerLabel ? 2 : 7));
      if (opt.centerLabel) {
        Ch.font(g, 11, 500); g.fillStyle = Ch.subColor();
        g.fillText(opt.center.label, cx, cy + 18);
      }
    }
  };

  /* ---------- 纵向柱状 ---------- */
  Ch.bars = function (canvas, opt) {
    var s = Ch.setup(canvas, opt), g = s.g, w = s.w, h = s.h;
    var labels = opt.labels || [], values = opt.values || [];
    var padB = 20, padT = opt.padT == null ? 18 : opt.padT;
    var max = Math.max.apply(null, values.concat([1]));
    var n = values.length || 1;
    var bw = (w - 8) / n, inner = Math.min(bw * 0.58, 26);
    g.textAlign = 'center';
    for (var i = 0; i < n; i++) {
      var v = values[i] || 0;
      var bh = Math.max(2, ((h - padB - padT) * v) / max);
      var x = 4 + i * bw + (bw - inner) / 2, y = h - padB - bh;
      var col = (opt.colors && opt.colors[i]) || Ch.color(i);
      var grad = g.createLinearGradient(0, y, 0, h - padB);
      grad.addColorStop(0, col); grad.addColorStop(1, col + '66');
      g.fillStyle = grad;
      Ch.roundRect(g, x, y, inner, bh, Math.min(6, inner / 2)); g.fill();
      if (opt.showValue && v > 0) {
        Ch.font(g, 9, 600); g.fillStyle = Ch.subColor();
        g.fillText(U.moneyShort(v), x + inner / 2, y - 4);
      }
      Ch.font(g, 10, 500); g.fillStyle = Ch.subColor();
      g.fillText(labels[i] || '', x + inner / 2, h - 6);
    }
  };

  /* ---------- 折线 / 面积 ---------- */
  Ch.line = function (canvas, opt) {
    var s = Ch.setup(canvas, opt), g = s.g, w = s.w, h = s.h;
    var labels = opt.labels || [], series = opt.series || [];
    var padL = opt.padL == null ? 34 : opt.padL, padR = 6, padT = 10, padB = 20;
    var all = [];
    series.forEach(function (se) { all = all.concat(se.data || []); });
    var max = Math.max.apply(null, all.concat([1])) * 1.15, min = 0;
    var iw = w - padL - padR, ih = h - padT - padB;
    var X = function (i) { return padL + (labels.length <= 1 ? iw / 2 : (iw * i) / (labels.length - 1)); };
    var Y = function (v) { return padT + ih - ((v - min) / (max - min || 1)) * ih; };
    g.strokeStyle = 'rgba(148,163,184,.18)'; g.lineWidth = 1;
    g.textAlign = 'right';
    for (var k = 0; k <= 3; k++) {
      var yv = min + ((max - min) * k) / 3, y = Y(yv);
      g.beginPath(); g.moveTo(padL, y); g.lineTo(w - padR, y); g.stroke();
      Ch.font(g, 9, 500); g.fillStyle = Ch.subColor();
      g.fillText(U.moneyShort(yv), padL - 5, y + 3);
    }
    series.forEach(function (se, si) {
      var d = se.data || [], col = se.color || Ch.color(si);
      if (se.fill !== false) {
        var grad = g.createLinearGradient(0, padT, 0, padT + ih);
        grad.addColorStop(0, col + '55'); grad.addColorStop(1, col + '00');
        g.beginPath();
        d.forEach(function (v, i) { i ? g.lineTo(X(i), Y(v)) : g.moveTo(X(i), Y(v)); });
        g.lineTo(X(d.length - 1), padT + ih); g.lineTo(X(0), padT + ih); g.closePath();
        g.fillStyle = grad; g.fill();
      }
      g.beginPath();
      d.forEach(function (v, i) { i ? g.lineTo(X(i), Y(v)) : g.moveTo(X(i), Y(v)); });
      g.strokeStyle = col; g.lineWidth = 2.2; g.lineJoin = 'round'; g.stroke();
      d.forEach(function (v, i) {
        g.beginPath(); g.arc(X(i), Y(v), 2.6, 0, 7); g.fillStyle = '#fff'; g.fill();
        g.strokeStyle = col; g.lineWidth = 1.8; g.stroke();
      });
    });
    g.textAlign = 'center';
    labels.forEach(function (lb, i) {
      Ch.font(g, 9, 500); g.fillStyle = Ch.subColor();
      g.fillText(lb, X(i), h - 6);
    });
  };

  /* ---------- 横向排行 ---------- */
  Ch.rank = function (canvas, opt) {
    var rows = opt.data || [];
    var rowH = opt.rowH || 34;
    var s = Ch.setup(canvas, Object.assign({}, opt, { h: opt.h || rows.length * rowH + 6 }));
    var g = s.g, w = s.w;
    var max = Math.max.apply(null, rows.map(function (r) { return r.value; }).concat([1]));
    rows.forEach(function (r, i) {
      var y = i * rowH + 4;
      var bw = (w - 4) * (r.value / max);
      g.fillStyle = 'rgba(148,163,184,.14)';
      Ch.roundRect(g, 2, y, w - 4, rowH - 12, (rowH - 12) / 2); g.fill();
      var col = r.color || Ch.color(i);
      var grad = g.createLinearGradient(0, 0, w, 0);
      grad.addColorStop(0, col + 'cc'); grad.addColorStop(1, col);
      g.fillStyle = grad;
      Ch.roundRect(g, 2, y, Math.max(bw, 8), rowH - 12, (rowH - 12) / 2); g.fill();
      Ch.font(g, 12, 600); g.fillStyle = '#fff'; g.textAlign = 'left';
      g.fillText((r.icon ? r.icon + ' ' : '') + r.name, 12, y + rowH - 17);
      Ch.font(g, 12, 700); g.textAlign = 'right';
      g.fillStyle = 'rgba(255,255,255,.96)';
      g.fillText(U.money(r.value), w - 10, y + rowH - 17);
    });
    return s.h;
  };

  /* ---------- 日历热力图 ---------- */
  Ch.heat = function (canvas, opt) {
    var days = opt.days || [];   /* [{date:'2024-03-01', value:n}] */
    var s = Ch.setup(canvas, opt), g = s.g, w = s.w, h = s.h;
    if (!days.length) return;
    var first = new Date(U.parseDate(days[0].date + ' 00:00'));
    var lead = first.getDay();
    var cols = Math.ceil((lead + days.length) / 7);
    var gap = 2;
    var cell = Math.min((w - 2) / cols - gap, (h - 12) / 7 - gap);
    var max = Math.max.apply(null, days.map(function (d) { return d.value; }).concat([1]));
    var startX = (w - (cols * (cell + gap) - gap)) / 2;
    days.forEach(function (d, i) {
      var idx = lead + i, col = Math.floor(idx / 7), row = idx % 7;
      var x = startX + col * (cell + gap), y = 8 + row * (cell + gap);
      var t = d.value / max;
      var col2 = t <= 0 ? 'rgba(148,163,184,.12)' : 'hsl(' + (170 - t * 170) + ',85%,' + (88 - t * 42) + '%)';
      g.fillStyle = col2;
      Ch.roundRect(g, x, y, cell, cell, Math.min(3, cell / 3)); g.fill();
    });
  };

  /* ---------- 预算进度环 ---------- */
  Ch.ring = function (canvas, opt) {
    var s = Ch.setup(canvas, opt), g = s.g, w = s.w, h = s.h;
    var pct = U.clamp(opt.value || 0, 0, 1.5), cx = w / 2, cy = h / 2;
    var R = Math.min(w, h) / 2 - 5, lw = opt.lw || 7;
    g.lineCap = 'round';
    g.beginPath(); g.arc(cx, cy, R - lw / 2, 0, Math.PI * 2);
    g.strokeStyle = 'rgba(148,163,184,.2)'; g.lineWidth = lw; g.stroke();
    var col = opt.color || (pct > 1 ? '#EF4444' : pct > 0.8 ? '#F59E0B' : '#22C55E');
    g.beginPath();
    g.arc(cx, cy, R - lw / 2, -Math.PI / 2, -Math.PI / 2 + Math.min(pct, 1) * Math.PI * 2);
    g.strokeStyle = col; g.lineWidth = lw; g.stroke();
    g.textAlign = 'center';
    Ch.font(g, opt.fontSize || 13, 700); g.fillStyle = Ch.textColor();
    g.fillText(opt.label != null ? opt.label : Math.round(pct * 100) + '%', cx, cy + 5);
  };

  /* ---------- 走势双柱（收入/支出对比） ---------- */
  Ch.dualBars = function (canvas, opt) {
    var s = Ch.setup(canvas, opt), g = s.g, w = s.w, h = s.h;
    var labels = opt.labels || [], a = opt.a || [], b = opt.b || [];
    var padB = 20, padT = 12, iw = w - 8, ih = h - padB - padT;
    var max = Math.max.apply(null, a.concat(b).concat([1]));
    var n = labels.length || 1, bw = iw / n;
    labels.forEach(function (lb, i) {
      var x0 = 4 + i * bw + bw * 0.18, bwid = bw * 0.28;
      var ha = (ih * (a[i] || 0)) / max, hb = (ih * (b[i] || 0)) / max;
      g.fillStyle = opt.colorA || '#22C55E';
      Ch.roundRect(g, x0, padT + ih - ha, bwid, Math.max(ha, 1.5), 3); g.fill();
      g.fillStyle = opt.colorB || '#FF6B6B';
      Ch.roundRect(g, x0 + bwid + 2, padT + ih - hb, bwid, Math.max(hb, 1.5), 3); g.fill();
      g.textAlign = 'center'; Ch.font(g, 9.5, 500); g.fillStyle = Ch.subColor();
      g.fillText(lb, x0 + bwid + 1, h - 6);
    });
    g.textAlign = 'right';
    for (var k = 0; k <= 2; k++) {
      var yv = (max * k) / 2, y = padT + ih - (ih * k) / 2;
      g.strokeStyle = 'rgba(148,163,184,.16)'; g.beginPath(); g.moveTo(4, y); g.lineTo(w, y); g.stroke();
      Ch.font(g, 9, 500); g.fillStyle = Ch.subColor(); g.fillText(U.moneyShort(yv), w - 2, y - 3);
    }
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
