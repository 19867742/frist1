/* FlowAtlas · 基础工具层 */
(function (root) {
  'use strict';
  var FA = (root.FA = root.FA || {});
  var U = (FA.util = {});

  U.uid = function (p) {
    return (p || 'id') + '_' + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);
  };
  U.clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  U.pad2 = function (n) { return (n < 10 ? '0' : '') + n; };
  U.round2 = function (n) { return Math.round((Number(n) || 0) * 100) / 100; };
  U.num = function (v, d) { var n = parseFloat(v); return isFinite(n) ? n : (d || 0); };

  /* ---------- 金额 / 日期 ---------- */
  U.money = function (n, opt) {
    opt = opt || {};
    var v = Number(n) || 0, neg = v < 0;
    v = Math.abs(v);
    var s = v.toFixed(opt.dec == null ? 2 : opt.dec);
    var parts = s.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    s = parts.join('.');
    if (opt.symbol !== false) s = '¥' + s;
    return (neg ? '-' : '') + s;
  };
  U.moneyShort = function (n) {
    var v = Math.abs(Number(n) || 0), s;
    if (v >= 1e8) s = (v / 1e8).toFixed(2) + '亿';
    else if (v >= 1e4) s = (v / 1e4).toFixed(v >= 1e5 ? 1 : 2) + '万';
    else s = v.toFixed(0);
    return (Number(n) < 0 ? '-' : '') + s;
  };

  U.ym = function (d) { d = new Date(d); return d.getFullYear() + '-' + U.pad2(d.getMonth() + 1); };
  U.ymd = function (d) { d = new Date(d); return d.getFullYear() + '-' + U.pad2(d.getMonth() + 1) + '-' + U.pad2(d.getDate()); };
  U.dayStart = function (d) { var x = new Date(d); x.setHours(0, 0, 0, 0); return x.getTime(); };
  U.monthRange = function (ym) {
    var p = String(ym).split('-'), y = +p[0], m = +p[1];
    return { start: new Date(y, m - 1, 1, 0, 0, 0, 0).getTime(), end: new Date(y, m, 1, 0, 0, 0, 0).getTime() };
  };
  U.addMonths = function (ym, n) {
    var p = String(ym).split('-'), d = new Date(+p[0], +p[1] - 1 + n, 1);
    return U.ym(d);
  };
  U.monthLabel = function (ym) { var p = String(ym).split('-'); return p[0] + '年' + (+p[1]) + '月'; };
  U.weekCN = ['日', '一', '二', '三', '四', '五', '六'];

  U.fmtDate = function (ts, style) {
    var d = new Date(ts);
    if (style === 'time') return U.pad2(d.getHours()) + ':' + U.pad2(d.getMinutes());
    if (style === 'full') return U.ymd(d) + ' ' + U.pad2(d.getHours()) + ':' + U.pad2(d.getMinutes());
    if (style === 'md') return U.pad2(d.getMonth() + 1) + '月' + U.pad2(d.getDate()) + '日';
    return U.ymd(d);
  };
  U.relDay = function (ts) {
    var today = U.dayStart(Date.now()), day = U.dayStart(ts), diff = Math.round((today - day) / 86400000);
    if (diff === 0) return '今天';
    if (diff === 1) return '昨天';
    if (diff === 2) return '前天';
    var d = new Date(ts);
    return U.pad2(d.getMonth() + 1) + '月' + U.pad2(d.getDate()) + '日 周' + U.weekCN[d.getDay()];
  };

  /* 兼容微信 / 支付宝 / 银行 / 手工的多种时间写法 */
  U.parseDate = function (s) {
    if (s == null || s === '') return NaN;
    if (typeof s === 'number') return s < 1e12 ? s * 1000 : s;
    if (s instanceof Date) return s.getTime();
    var t = String(s).trim().replace(/[年月]/g, '-').replace(/日/g, ' ').replace(/\//g, '-').replace(/\./g, '-');
    t = t.replace(/\s+/g, ' ').trim();
    var m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
    if (m) return new Date(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0)).getTime();
    m = t.match(/^(\d{4})(\d{2})(\d{2})(\d{2})?(\d{2})?(\d{2})?$/);
    if (m) return new Date(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0)).getTime();
    m = t.match(/^(\d{1,2})-(\d{1,2})\s+(\d{1,2}):(\d{1,2})/);
    if (m) return new Date(new Date().getFullYear(), +m[1] - 1, +m[2], +m[3], +m[4]).getTime();
    var d = new Date(t);
    return isNaN(d.getTime()) ? NaN : d.getTime();
  };

  /* ---------- 统计 ---------- */
  U.sum = function (a, f) { return a.reduce(function (s, x) { return s + (f ? f(x) : x); }, 0); };
  U.mean = function (a) { return a.length ? U.sum(a) / a.length : 0; };
  U.median = function (a) {
    if (!a.length) return 0;
    var b = a.slice().sort(function (x, y) { return x - y; }), i = b.length >> 1;
    return b.length % 2 ? b[i] : (b[i - 1] + b[i]) / 2;
  };
  U.stdev = function (a) {
    if (a.length < 2) return 0;
    var m = U.mean(a);
    return Math.sqrt(U.sum(a, function (x) { return (x - m) * (x - m); }) / (a.length - 1));
  };
  U.mad = function (a) {
    if (!a.length) return 0;
    var m = U.median(a);
    return U.median(a.map(function (x) { return Math.abs(x - m); }));
  };
  U.quantile = function (a, q) {
    if (!a.length) return 0;
    var b = a.slice().sort(function (x, y) { return x - y; });
    var pos = (b.length - 1) * q, lo = Math.floor(pos), hi = Math.ceil(pos);
    return b[lo] + (b[hi] - b[lo]) * (pos - lo);
  };
  U.groupBy = function (arr, fn) {
    var m = {};
    arr.forEach(function (x) { var k = fn(x); (m[k] = m[k] || []).push(x); });
    return m;
  };
  U.uniq = function (a) { return a.filter(function (x, i) { return a.indexOf(x) === i; }); };
  U.sortBy = function (arr, fn, desc) {
    return arr.slice().sort(function (a, b) { var x = fn(a), y = fn(b); return (x < y ? -1 : x > y ? 1 : 0) * (desc ? -1 : 1); });
  };
  U.escapeHtml = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  U.debounce = function (fn, ms) {
    var t; return function () { var a = arguments, self = this; clearTimeout(t); t = setTimeout(function () { fn.apply(self, a); }, ms); };
  };
  U.hashStr = function (s) {
    var h = 5381, i = s.length;
    while (i) h = (h * 33) ^ s.charCodeAt(--i);
    return (h >>> 0).toString(36);
  };
  U.similar = function (a, b) { /* 简单编辑距离，用于商户名归并 */
    a = String(a || ''); b = String(b || '');
    if (a === b) return 0;
    var m = a.length, n = b.length;
    if (!m || !n) return m || n;
    if (Math.abs(m - n) > 4) return 99;
    var prev = [], cur = [], i, j;
    for (j = 0; j <= n; j++) prev[j] = j;
    for (i = 1; i <= m; i++) {
      cur[0] = i;
      for (j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = cur.slice();
    }
    return prev[n];
  };

  /* ---------- 文件 / 图像 ---------- */
  U.readArrayBuffer = function (file) {
    return new Promise(function (res, rej) {
      var r = new FileReader();
      r.onload = function () { res(r.result); };
      r.onerror = function () { rej(r.error); };
      r.readAsArrayBuffer(file);
    });
  };
  U.readDataURL = function (file) {
    return new Promise(function (res, rej) {
      var r = new FileReader();
      r.onload = function () { res(r.result); };
      r.onerror = function () { rej(r.error); };
      r.readAsDataURL(file);
    });
  };
  /* 先按 UTF-8 严格解码，失败回退 GBK（微信/支付宝导出常为 GBK） */
  U.decodeBuffer = function (buf, forced) {
    var bytes = new Uint8Array(buf);
    if (bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF) bytes = bytes.subarray(3);
    var enc = forced;
    if (!enc) {
      try {
        new TextDecoder('utf-8', { fatal: true }).decode(bytes);
        enc = 'utf-8';
      } catch (e) {
        var u = 0, i;
        for (i = 0; i < Math.min(bytes.length, 4096); i++) if (bytes[i] >= 0x80) u++;
        enc = u > 0 && bytes.length > u ? 'gbk' : 'utf-8';
        try { new TextDecoder(enc, { fatal: true }).decode(bytes); } catch (e2) { enc = 'utf-8'; }
      }
    }
    return { text: new TextDecoder(enc).decode(bytes), encoding: enc };
  };
  U.downscale = function (file, maxW, quality) {
    maxW = maxW || 720;
    return U.readDataURL(file).then(function (url) {
      return new Promise(function (res) {
        var img = new Image();
        img.onload = function () {
          var scale = Math.min(1, maxW / img.width);
          var c = document.createElement('canvas');
          c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
          var g = c.getContext('2d');
          g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
          g.drawImage(img, 0, 0, c.width, c.height);
          res({ url: c.toDataURL('image/jpeg', quality || 0.62), w: c.width, h: c.height });
        };
        img.onerror = function () { res(null); };
        img.src = url;
      });
    });
  };
  /* 安卓壳（WebView）环境下，交给原生保存到「下载」目录 */
  U.native = function () { return root.FlowAtlasNative || (root.AndroidNative) || null; };
  U.download = function (name, data, mime) {
    var blob = data instanceof Blob ? data : new Blob([data], { type: mime || 'text/plain;charset=utf-8' });
    var nat = U.native();
    if (nat && nat.saveFile) {
      var fr = new FileReader();
      fr.onload = function () {
        var s = String(fr.result), b64 = s.slice(s.indexOf(',') + 1);
        try { nat.saveFile(name, b64, mime || blob.type || 'application/octet-stream'); }
        catch (e) { console.warn(e); }
      };
      fr.readAsDataURL(blob);
      return;
    }
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  };
  U.copyToClipboard = function (text) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
    var ta = document.createElement('textarea');
    ta.value = text; document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); } catch (e) { }
    ta.remove();
    return Promise.resolve();
  };
  U.vibrate = function (ms) { if (navigator.vibrate) { try { navigator.vibrate(ms || 8); } catch (e) { } } };
})(typeof globalThis !== 'undefined' ? globalThis : this);
