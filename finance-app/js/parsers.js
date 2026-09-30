/* FlowAtlas · 账单导入与解析引擎
   CSV / Excel(.xlsx 原生解压) / 截图OCR / 手动补录 -> 结构化交易 */
(function (root) {
  'use strict';
  var FA = root.FA, U = FA.util;
  var P = (FA.parser = {});

  /* ---------------- CSV ---------------- */
  P.parseCSV = function (text, delim) {
    text = String(text).replace(/^\uFEFF/, '');
    var rows = [], row = [], field = '', inQ = false, i = 0, ch, d = delim;
    var candidates = [',', '\t', ';', '|'];
    if (!d) {
      var head = text.slice(0, 4000);
      var best = 0, bestCount = -1;
      candidates.forEach(function (c) {
        var n = (head.split('\n')[0] || '').split(c).length;
        if (n > bestCount) { bestCount = n; best = c; }
      });
      d = bestCount > 1 ? best : ',';
    }
    while (i < text.length) {
      ch = text[i];
      if (inQ) {
        if (ch === '"') {
          if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
          inQ = false; i++; continue;
        }
        field += ch; i++; continue;
      }
      if (ch === '"') { inQ = true; i++; continue; }
      if (ch === d) { row.push(field); field = ''; i++; continue; }
      if (ch === '\r') { i++; continue; }
      if (ch === '\n') { row.push(field); rows.push(row); row = []; field = ''; i++; continue; }
      field += ch; i++;
    }
    if (field !== '' || row.length) { row.push(field); rows.push(row); }
    return rows.filter(function (r) { return r.some(function (c) { return String(c).trim() !== ''; }); });
  };

  /* ---------------- 表头识别 ---------------- */
  var FIELD_ALIASES = {
    time: ['交易时间', '交易创建时间', '付款时间', '交易日期', '时间', '记账日期', '发生时间', '交易发生时间'],
    merchant: ['交易对方', '对方', '商户名称', '交易对象', '收款方', '付款方', '对方户名'],
    item: ['商品', '商品说明', '商品名称', '交易内容', '摘要', '用途', '备注说明'],
    direction: ['收/支', '收支', '收/支类型', '资金方向', '收支类型', '借贷标志'],
    amount: ['金额(元)', '金额', '发生金额', '交易金额', '金额（元）', '收支金额'],
    payMethod: ['支付方式', '收/付款方式', '付款方式', '结算方式', '账户'],
    status: ['当前状态', '交易状态', '订单状态', '状态'],
    orderNo: ['交易单号', '交易订单号', '订单号', '流水号', '交易流水号'],
    merchantNo: ['商户单号', '商家订单号', '商户订单号'],
    rawCategory: ['交易分类', '交易类型', '类型', '分类'],
    note: ['备注', '说明', '附言', '摘要备注'],
    currency: ['币种', '货币'],
    balance: ['余额', '账户余额', '可用余额']
  };
  var HEADER_HINTS = ['交易时间', '金额', '收/支', '交易对方', '商品', '交易单号', '交易订单号', '商户单号', '收支', '交易状态', '当前状态', '交易类型'];

  P.sniffHeader = function (rows) {
    var best = { index: -1, score: 0, map: {} };
    var limit = Math.min(rows.length, 40);
    for (var i = 0; i < limit; i++) {
      var cells = rows[i].map(function (c) { return String(c).replace(/\s/g, ''); });
      var score = 0, map = {};
      HEADER_HINTS.forEach(function (h) { if (cells.indexOf(h) >= 0) score += 2; });
      Object.keys(FIELD_ALIASES).forEach(function (f) {
        for (var j = 0; j < cells.length; j++) {
          if (FIELD_ALIASES[f].indexOf(cells[j]) >= 0) { map[f] = j; score += 1; break; }
        }
      });
      if (score > best.score) best = { index: i, score: score, map: map };
    }
    /* 表头必须至少能定位时间与金额，否则认为失败 */
    var ok = best.map.time != null && best.map.amount != null && best.score >= 6;
    return { rowIndex: ok ? best.index : -1, map: best.map, score: best.score };
  };

  /* ---------------- 来源识别 ---------------- */
  P.detectSource = function (text, filename) {
    var head = String(text || '').slice(0, 3000);
    var fn = String(filename || '');
    var has = function (re) { return re.test(head) || re.test(fn); };
    if (has(/微信支付账单|微信昵称|微信支付|财付通|零钱|weixin|wechat/i)) return 'wechat';
    if (has(/支付宝|alipay|余额宝|花呗|蚂蚁|交易记录明细/i)) return 'alipay';
    if (has(/银行|储蓄卡|借记卡|信用卡|中国银行|工商银行|建设银行|招商银行|abc|icbc|ccb|cmb/i)) return 'bank';
    return 'generic';
  };
  P.SOURCE_META = {
    wechat: { name: '微信支付', icon: '💚', color: '#07C160', accountType: 'wechat' },
    alipay: { name: '支付宝', icon: '💙', color: '#1677FF', accountType: 'alipay' },
    bank: { name: '银行流水', icon: '💳', color: '#E8474B', accountType: 'bank' },
    generic: { name: '通用表格', icon: '📄', color: '#7C8BA1', accountType: 'other' }
  };

  /* ---------------- 金额 / 方向 ---------------- */
  P.parseAmount = function (v) {
    if (v == null) return NaN;
    if (typeof v === 'number') return v;
    var s = String(v).trim();
    if (!s) return NaN;
    var neg = /^-/.test(s) || /\((.*)\)/.test(s);
    s = s.replace(/[¥￥$€,，\s元]/g, '').replace(/[()]/g, '');
    s = s.replace(/[^\d.\-]/g, '');
    var n = parseFloat(s);
    if (!isFinite(n)) return NaN;
    return neg ? -Math.abs(n) : n;
  };
  P.parseDirection = function (raw, amount, rawCategory) {
    var s = String(raw == null ? '' : raw).trim();
    /* 「不计收支 / 中性交易」必须最先判定，否则会被单个「支」字误判为支出 */
    if (/不计收支|不计入|中性|其他收支/.test(s)) {
      var cat = String(rawCategory || '') + s;
      if (/转账|还款|充值|提现|理财|余额宝|零钱通|资金归集|划转/.test(cat)) return 'transfer';
      return amount < 0 ? 'expense' : amount > 0 ? 'income' : 'transfer';
    }
    if (/支出|付款|消费|转出|借|付/.test(s) && !/收入/.test(s)) return 'expense';
    if (/收入|收款|转入|贷/.test(s) && !/支出/.test(s)) return 'income';
    if (isFinite(amount)) return amount < 0 ? 'expense' : amount > 0 ? 'income' : 'transfer';
    return 'expense';
  };
  P.STATUS = {
    ok: /交易成功|支付成功|已收钱|已存入零钱|朋友已收钱|已到账|成功|完成|已转账|充值成功|提现已到账|已退款成功|退款成功|部分退款/,
    bad: /交易关闭|已关闭|已撤销|失败|未支付|取消/,
    refund: /已全额退款|已退款|退款/
  };
  P.parseStatus = function (raw) {
    var s = String(raw == null ? '' : raw).trim();
    if (!s) return 'success';
    if (P.STATUS.bad.test(s)) return 'closed';
    if (P.STATUS.refund.test(s)) return 'refunded';
    if (P.STATUS.ok.test(s)) return 'success';
    return 'other';
  };
  P.payMethodToAccountHint = function (pay) {
    var s = String(pay || '');
    if (/零钱|微信/.test(s)) return 'wechat';
    if (/余额|支付宝|花呗|余额宝/.test(s)) return 'alipay';
    if (/银行|储蓄卡|借记卡|信用卡|银联|一卡通|工商|建设|招商|农业|中国银行|交通银行|邮储|中信|民生|兴业|光大|浦发|平安银行/.test(s)) return 'bank';
    if (/现金/.test(s)) return 'cash';
    return null;
  };

  /* ---------------- 行 -> 交易 ---------------- */
  P.rowsToTxns = function (rows, sheet, ctx) {
    ctx = ctx || {};
    var map = sheet.map, out = [], skipped = [];
    var source = ctx.source || 'generic';
    for (var i = sheet.rowIndex + 1; i < rows.length; i++) {
      var r = rows[i];
      if (!r || !r.length) continue;
      var get = function (f) { var j = map[f]; return j == null ? '' : String(r[j] == null ? '' : r[j]).trim(); };
      var timeRaw = get('time'), amtRaw = get('amount');
      if (!timeRaw && !amtRaw) continue;
      if (/^合计|^总计|^小计|^以上|说明/.test(timeRaw) || /^合计/.test(get('merchant'))) { skipped.push({ row: i, reason: '汇总行' }); continue; }
      var time = U.parseDate(timeRaw);
      if (isNaN(time)) { skipped.push({ row: i, reason: '时间无法解析：' + timeRaw }); continue; }
      var amt = P.parseAmount(amtRaw);
      if (!isFinite(amt) || amt === 0) { skipped.push({ row: i, reason: '金额无法解析：' + amtRaw }); continue; }
      var rawCat = get('rawCategory');
      var dir = P.parseDirection(get('direction'), amt, rawCat);
      var status = P.parseStatus(get('status'));
      if (status === 'closed') { skipped.push({ row: i, reason: '订单已关闭' }); continue; }
      var merchant = get('merchant') || get('item') || '未知商户';
      var t = {
        id: U.uid('tx'), time: time, amount: U.round2(Math.abs(amt)), direction: dir,
        accountId: ctx.accountId || null, merchant: merchant, item: get('item'),
        rawCategory: rawCat, payMethod: get('payMethod'), status: status,
        orderNo: get('orderNo') || '', merchantNo: get('merchantNo') || '',
        note: get('note') || '', currency: get('currency') || 'CNY',
        source: source, sourceFile: ctx.fileName || '', row: i,
        tags: rawCat ? [rawCat] : [], excluded: false, category: '', sub: '',
        raw: r.slice(0, 14)
      };
      if (dir === 'transfer') t.excluded = true;
      if (status === 'refunded') t.tags.push('退款');
      out.push(t);
    }
    return { txns: out, skipped: skipped };
  };

  /* ---------------- 通用表格入口 ---------------- */
  P.parseTable = function (rows, ctx) {
    ctx = ctx || {};
    var sheet = P.sniffHeader(rows);
    if (sheet.rowIndex < 0) {
      return { ok: false, txns: [], skipped: [], error: '未能自动识别表头（需要包含「交易时间」和「金额」列）。请检查文件或使用手动补录。', header: null };
    }
    var res = P.rowsToTxns(rows, sheet, ctx);
    return {
      ok: true, txns: res.txns, skipped: res.skipped, header: sheet,
      headerNames: rows[sheet.rowIndex].map(function (c) { return String(c).replace(/\s/g, ''); })
    };
  };

  /* ---------------- XLSX（原生 ZIP + DecompressionStream） ---------------- */
  function u16(dv, p) { return dv.getUint16(p, true); }
  function u32(dv, p) { return dv.getUint32(p, true); }

  function inflate(bytes, method) {
    if (method === 0) return Promise.resolve(bytes);
    if (typeof DecompressionStream === 'undefined') return Promise.reject(new Error('当前浏览器不支持解压，请将 Excel 另存为 CSV 后导入'));
    var ds = new DecompressionStream('deflate-raw');
    var stream = new Blob([bytes]).stream().pipeThrough(ds);
    return new Response(stream).arrayBuffer().then(function (b) { return new Uint8Array(b); });
  }
  P.unzip = function (buffer) {
    var bytes = new Uint8Array(buffer), dv = new DataView(buffer);
    var eocd = -1, i;
    for (i = bytes.length - 22; i >= Math.max(0, bytes.length - 70000); i--) {
      if (u32(dv, i) === 0x06054b50) { eocd = i; break; }
    }
    if (eocd < 0) return Promise.reject(new Error('不是有效的 xlsx（zip）文件'));
    var count = u16(dv, eocd + 10), cdOff = u32(dv, eocd + 16);
    var tasks = [], files = {};
    var p = cdOff;
    for (i = 0; i < count; i++) {
      if (u32(dv, p) !== 0x02014b50) break;
      var method = u16(dv, p + 10);
      var csize = u32(dv, p + 20);
      var nameLen = u16(dv, p + 28), extraLen = u16(dv, p + 30), commentLen = u16(dv, p + 32);
      var lho = u32(dv, p + 42);
      var name = new TextDecoder('utf-8').decode(bytes.subarray(p + 46, p + 46 + nameLen));
      /* 本地文件头 -> 数据起点 */
      var lnameLen = u16(dv, lho + 26), lextraLen = u16(dv, lho + 28);
      var dataStart = lho + 30 + lnameLen + lextraLen;
      var data = bytes.subarray(dataStart, dataStart + csize);
      if (/\.xml$|\.rels$/.test(name)) {
        (function (nm, dt, me) {
          tasks.push(inflate(dt, me).then(function (out) {
            files[nm] = new TextDecoder('utf-8').decode(out);
          }));
        })(name, data, method);
      }
      p += 46 + nameLen + extraLen + commentLen;
    }
    return Promise.all(tasks).then(function () { return files; });
  };

  function xmlUnescape(s) {
    return String(s).replace(/&#x([0-9a-fA-F]+);/g, function (m, h) { return String.fromCharCode(parseInt(h, 16)); })
      .replace(/&#(\d+);/g, function (m, d) { return String.fromCharCode(+d); })
      .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
  }
  function colIndex(ref) {
    var m = String(ref).match(/^([A-Z]+)/), s = m ? m[1] : 'A', n = 0;
    for (var i = 0; i < s.length; i++) n = n * 26 + (s.charCodeAt(i) - 64);
    return n - 1;
  }
  P.parseSheetXML = function (xml, shared) {
    var rows = [], rowRe = /<row[^>]*>([\s\S]*?)<\/row>/g, rm;
    while ((rm = rowRe.exec(xml))) {
      var inner = rm[1], cells = [], cRe = /<c([^>]*)>([\s\S]*?)<\/c>|<c([^>]*)\/>/g, cm;
      while ((cm = cRe.exec(inner))) {
        var attrs = cm[1] || cm[3] || '', body = cm[2] || '';
        var refM = attrs.match(/r="([A-Z]+\d+)"/);
        var idx = refM ? colIndex(refM[1]) : cells.length;
        var tM = attrs.match(/t="([^"]+)"/);
        var type = tM ? tM[1] : 'n';
        var val = '';
        if (type === 'inlineStr') {
          var isM = body.match(/<t[^>]*>([\s\S]*?)<\/t>/g);
          val = isM ? isM.map(function (x) { return xmlUnescape(x.replace(/<[^>]+>/g, '')); }).join('') : '';
        } else {
          var vM = body.match(/<v[^>]*>([\s\S]*?)<\/v>/);
          if (vM) {
            val = xmlUnescape(vM[1]);
            if (type === 's') val = shared[+val] != null ? shared[+val] : '';
          }
        }
        cells[idx] = val;
      }
      for (var k = 0; k < cells.length; k++) if (cells[k] === undefined) cells[k] = '';
      rows.push(cells);
    }
    return rows;
  };
  P.parseXlsx = function (buffer) {
    return P.unzip(buffer).then(function (files) {
      var ssXml = files['xl/sharedStrings.xml'] || '';
      var shared = [];
      var siRe = /<si>([\s\S]*?)<\/si>/g, sm;
      while ((sm = siRe.exec(ssXml))) {
        var ts = sm[1].match(/<t[^>]*>([\s\S]*?)<\/t>/g);
        shared.push(ts ? ts.map(function (x) { return xmlUnescape(x.replace(/<[^>]+>/g, '')); }).join('') : '');
      }
      var sheetNames = [], files2 = Object.keys(files).filter(function (f) { return /^xl\/worksheets\/sheet\d+\.xml$/.test(f); });
      files2.sort();
      var out = [];
      files2.forEach(function (f, i) {
        out.push({ name: sheetNames[i] || ('工作表' + (i + 1)), rows: P.parseSheetXML(files[f], shared) });
      });
      return out;
    });
  };

  /* ---------------- 统一文件读取 ---------------- */
  P.readFile = function (file) {
    return U.readArrayBuffer(file).then(function (buf) {
      var name = (file.name || '').toLowerCase();
      if (/\.xlsx?$/.test(name)) {
        return P.parseXlsx(buf).then(function (sheets) {
          var best = sheets.reduce(function (a, b) { return (b.rows.length > (a ? a.rows.length : 0)) ? b : a; }, null);
          if (!best) throw new Error('Excel 中没有可读取的工作表');
          return { kind: 'xlsx', sheets: sheets, rows: best.rows, sheetName: best.name, encoding: 'xlsx' };
        });
      }
      var dec = U.decodeBuffer(buf);
      return { kind: 'csv', rows: P.parseCSV(dec.text), text: dec.text, encoding: dec.encoding, sheets: null };
    });
  };

  /* ---------------- 导入流水线 ---------------- */
  P.ingest = function (files, opt) {
    opt = opt || {};
    var results = [];
    var chain = Promise.resolve();
    Array.prototype.forEach.call(files, function (f) {
      chain = chain.then(function () {
        return P.readFile(f).then(function (rd) {
          var text = rd.text || (rd.rows || []).slice(0, 30).map(function (r) { return r.join(','); }).join('\n');
          var source = opt.source && opt.source !== 'auto' ? opt.source : P.detectSource(text, f.name);
          var res = P.parseTable(rd.rows, { source: source, accountId: opt.accountId, fileName: f.name });
          results.push(Object.assign({
            file: f.name, size: f.size, encoding: rd.encoding, kind: rd.kind, source: source,
            sheetName: rd.sheetName
          }, res));
        }).catch(function (e) {
          results.push({ file: f.name, ok: false, error: String(e.message || e), txns: [], skipped: [] });
        });
      });
    });
    return chain.then(function () { return { files: results }; });
  };

  /* ---------------- 截图 OCR 通道 ---------------- */
  /* 优先使用本地 Tesseract（若用户放入离线包），否则降级为「图像 + 手工快录」 */
  P.ocrAvailable = function () { return typeof root.Tesseract !== 'undefined' && root.Tesseract.recognize; };
  P.ocrImage = function (fileOrUrl) {
    if (!P.ocrAvailable()) return Promise.resolve({ engine: 'none', text: '', candidates: [] });
    var src = typeof fileOrUrl === 'string' ? fileOrUrl : URL.createObjectURL(fileOrUrl);
    return root.Tesseract.recognize(src, 'chi_sim+eng').then(function (r) {
      var text = (r && r.data && r.data.text) || '';
      return { engine: 'tesseract', text: text, candidates: P.parseReceiptText(text) };
    }).catch(function (e) {
      return { engine: 'error', text: '', candidates: [], error: String(e) };
    });
  };
  /* 从票据文字里抽取候选金额/商户/时间 —— 纯函数，可单测 */
  P.parseReceiptText = function (text) {
    var lines = String(text || '').split(/\r?\n/).map(function (s) { return s.trim(); }).filter(Boolean);
    var cands = [];
    var amountRe = /(?:¥|￥|RMB|人民币)?\s*(\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?)\s*元?/g;
    var keyLine = /合计|实付|应付|总计|金额|支付|付款|订单金额|优惠后/;
    var strong = [], weak = [];
    lines.forEach(function (ln) {
      var m, vals = [];
      while ((m = amountRe.exec(ln))) {
        var v = parseFloat(m[1].replace(/,/g, ''));
        if (isFinite(v) && v > 0 && v < 1000000) vals.push(v);
      }
      if (!vals.length) return;
      var pick = Math.max.apply(null, vals);
      (keyLine.test(ln) ? strong : weak).push({ amount: pick, line: ln });
    });
    var pool = strong.length ? strong : weak;
    var seen = {};
    pool.forEach(function (x) {
      if (seen[x.amount]) return;
      seen[x.amount] = 1;
      cands.push({ amount: x.amount, evidence: x.line, confidence: strong.length ? 0.85 : 0.4 });
    });
    var date = null;
    for (var i = 0; i < lines.length && !date; i++) {
      var dm = lines[i].match(/(20\d{2})[-/年.](\d{1,2})[-/月.](\d{1,2})/);
      if (dm) date = U.parseDate(dm[0]);
      else {
        var dm2 = lines[i].match(/(\d{1,2})[-/月](\d{1,2})\s*日?\s*(\d{1,2}:\d{2})?/);
        if (dm2) date = U.parseDate(dm2[0]);
      }
    }
    var merchant = null;
    var skipWords = /合计|实付|应付|总计|金额|支付方式|订单号|商户单号|欢迎|谢谢|小票|发票|电子|时间|收银|服务员|台号|打印/;
    for (var j = 0; j < Math.min(lines.length, 6); j++) {
      var ln2 = lines[j];
      if (ln2.length >= 2 && ln2.length <= 20 && !skipWords.test(ln2) && !/^[\d\s:.\-¥￥]+$/.test(ln2)) { merchant = ln2; break; }
    }
    var payMatch = null, pm = String(text).match(/(微信支付|支付宝|云闪付|银行卡|现金|花呗|信用卡|零钱)/);
    if (pm) payMatch = pm[1];
    var orderMatch = null, om = String(text).match(/(?:订单号|交易单号|流水号|单号)[:：]?\s*([A-Za-z0-9\-]{6,40})/);
    if (om) orderMatch = om[1];
    return cands.map(function (c) {
      return { amount: c.amount, merchant: merchant, time: date, payMethod: payMatch, orderNo: orderMatch, confidence: c.confidence, evidence: c.evidence };
    });
  };

  /* ---------------- 手动补录 ---------------- */
  P.manualTxn = function (o) {
    return {
      id: U.uid('tx'), time: o.time || Date.now(), amount: U.round2(Math.abs(U.num(o.amount))),
      direction: o.direction || 'expense', accountId: o.accountId || null,
      merchant: o.merchant || '手动记录', item: o.item || '', rawCategory: '',
      payMethod: o.payMethod || '', status: 'success', orderNo: o.orderNo || '',
      merchantNo: '', note: o.note || '', currency: 'CNY', source: 'manual', sourceFile: '',
      tags: o.tags || [], excluded: false, category: o.category || '', sub: o.sub || '',
      auto: { source: 'user', confidence: 1, at: Date.now() }
    };
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
