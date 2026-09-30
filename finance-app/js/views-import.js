/* FlowAtlas · 账单导入：文件解析 / 预览 / 去重 / OCR / 历史 */
(function (root) {
  'use strict';
  var FA = root.FA, U = FA.util, UI = FA.ui, S = FA.store, h = UI.h, P = FA.parser;
  var V = FA.views;

  var IMP = { source: 'auto', accountId: null, files: [], results: null, busy: false, step: 1, ocr: [] };

  function defaultAccount() {
    if (IMP.accountId && S.byId('accounts', IMP.accountId)) return IMP.accountId;
    var a = S.db.accounts[0];
    return a ? a.id : null;
  }
  function accountForSource(src) {
    var meta = P.SOURCE_META[src];
    if (!meta) return defaultAccount();
    var hit = S.db.accounts.filter(function (a) { return a.type === meta.accountType; })[0];
    return hit ? hit.id : defaultAccount();
  }

  FA.ui.register('import', {
    tab: 'import', title: '导入账单',
    actions: function () { return [{ icon: 'doc', label: '导入历史', onTap: historySheet }]; },
    render: function () {
      var wrap = h('div.page.import');

      /* 步骤条 */
      wrap.appendChild(h('div.steps', {}, [
        ['1', '选择来源'], ['2', '上传文件'], ['3', '预览确认']
      ].map(function (s2, i) {
        return h('div.step' + (IMP.step >= i + 1 ? '.on' : ''), {}, h('span.step-n', {}, s2[0]), h('span', {}, s2[1]));
      })));

      /* 来源 */
      wrap.appendChild(UI.sectionTitle('1. 账单来源'));
      var srcRow = h('div.source-grid');
      [['auto', 'rule', '自动识别'], ['wechat', 'wechat', '微信支付'], ['alipay', 'alipay', '支付宝'], ['bank', 'bank', '银行卡'], ['cash', 'cash', '现金'], ['manual', 'manual', '手动补录']].forEach(function (s2) {
        srcRow.appendChild(h('button.source-cell' + (IMP.source === s2[0] ? '.on' : ''), {
          onclick: function () {
            if (s2[0] === 'manual') { V.manualSheet(function () { UI.render(); }); return; }
            IMP.source = s2[0];
            if (s2[0] !== 'auto') IMP.accountId = accountForSource(s2[0]);
            UI.render();
          }
        }, h('span.source-ic', {}, UI.illust(s2[1], 42)), h('span.source-name', {}, s2[2])));
      });
      wrap.appendChild(srcRow);

      /* 账户 */
      var accSel = h('select.field-input');
      S.db.accounts.forEach(function (a) {
        accSel.appendChild(h('option', { value: a.id, selected: a.id === defaultAccount() }, a.icon + ' ' + a.name));
      });
      accSel.addEventListener('change', function () { IMP.accountId = accSel.value; });
      wrap.appendChild(h('div.card.inline-form', {},
        h('div.field', {}, h('span.field-label', {}, '导入到账户'), accSel),
        h('div.field-hint', {}, '导入后该账户余额会自动结算。微信/支付宝账单建议对应各自的账户。')));

      /* 文件 */
      wrap.appendChild(UI.sectionTitle('2. 上传账单文件'));
      var fileInput = h('input', { type: 'file', multiple: true, accept: '.csv,.txt,.xlsx,.xls', style: { display: 'none' } });
      fileInput.addEventListener('change', function () { pickFiles(Array.prototype.slice.call(fileInput.files)); });
      var drop = h('div.drop-zone', { onclick: function () { fileInput.click(); } },
        UI.illust('import', 76),
        h('div.drop-title', {}, '点击选择账单文件'),
        h('div.drop-desc', {}, '支持微信支付账单 CSV、支付宝账单 CSV、银行流水 CSV/Excel（.xlsx）'),
        h('div.drop-desc.small', {}, '文件只在本机解析，不会上传到任何服务器'));
      ['dragover', 'dragenter'].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add('over'); }); });
      ['dragleave', 'drop'].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove('over'); }); });
      drop.addEventListener('drop', function (e) { pickFiles(Array.prototype.slice.call(e.dataTransfer.files)); });
      wrap.appendChild(fileInput);
      wrap.appendChild(drop);

      wrap.appendChild(h('div.row-btns', {},
        h('button.btn.ghost', { onclick: function () { V.manualSheet(function () { UI.render(); }); } }, UI.icon('edit', 16) + ' 手动补录'),
        h('button.btn.ghost', { onclick: ocrSheet }, UI.icon('camera', 16) + ' 截图导入'),
        h('button.btn.ghost', { onclick: function () { UI.go('me', { tab: 'rules' }); } }, UI.icon('sparkle', 16) + ' 规则库')));

      /* 已选文件 */
      if (IMP.files.length) {
        var fl = h('div.card.file-list');
        IMP.files.forEach(function (f, i) {
          fl.appendChild(h('div.file-row', {},
            h('span', {}, '📄'),
            h('div.file-mid', {}, h('div', {}, f.name), h('div.dim', {}, (f.size / 1024).toFixed(1) + ' KB')),
            h('button.icon-btn', { onclick: function () { IMP.files.splice(i, 1); IMP.results = null; UI.render(); } }, UI.icon('close', 16))));
        });
        wrap.appendChild(fl);
        if (!IMP.results) {
          wrap.appendChild(h('button.btn.block.primary', { onclick: doParse }, IMP.busy ? '解析中…' : '开始解析 ' + IMP.files.length + ' 个文件'));
        }
      }

      /* 解析结果 */
      if (IMP.results) {
        wrap.appendChild(UI.sectionTitle('3. 解析结果预览'));
        var totalNew = 0, totalDup = 0, totalSkip = 0, totalEx = 0;
        IMP.results.files.forEach(function (r) {
          var card = h('div.card.parse-card');
          var meta = P.SOURCE_META[r.source] || P.SOURCE_META.generic;
          card.appendChild(h('div.parse-head', {},
            h('span.parse-src', { style: { background: meta.color + '22', color: meta.color } }, meta.icon + ' ' + meta.name),
            h('span.parse-file', {}, r.file)));
          if (!r.ok) {
            card.appendChild(h('div.parse-error', {}, '❌ ' + r.error));
            wrap.appendChild(card);
            return;
          }
          var dup = 0, ex = 0;
          r.txns.forEach(function (t) {
            if (P.SOURCE_META && t.direction === 'transfer') ex++;
            if (FA.cat.findDuplicate(t, S.db.txns)) dup++;
          });
          totalNew += r.txns.length - dup; totalDup += dup; totalSkip += r.skipped.length; totalEx += ex;
          card.appendChild(h('div.parse-stats', {},
            h('div.ps', {}, h('b', {}, String(r.txns.length)), h('span', {}, '笔交易')),
            h('div.ps', {}, h('b', {}, String(r.txns.length - dup)), h('span', {}, '笔可新增')),
            h('div.ps', {}, h('b', {}, String(dup)), h('span', {}, '笔重复(将跳过)')),
            h('div.ps', {}, h('b', {}, String(r.skipped.length)), h('span', {}, '行跳过'))));
          card.appendChild(h('div.parse-meta', {},
            h('span', {}, '编码 ' + (r.encoding || '—')),
            h('span', {}, '表头第 ' + ((r.header ? r.header.rowIndex : 0) + 1) + ' 行'),
            r.sheetName ? h('span', {}, '工作表 ' + r.sheetName) : null,
            h('span', {}, '识别字段 ' + Object.keys(r.header ? r.header.map : {}).length + '/13')));
          /* 字段映射 */
          var mapRow = h('div.map-row');
          Object.keys(r.header.map).forEach(function (f) {
            mapRow.appendChild(h('span.map-chip', {}, (r.headerNames[r.header.map[f]] || f) + ' → ' + f));
          });
          card.appendChild(mapRow);
          /* 交易预览 */
          var prev = h('div.preview-list');
          r.txns.slice(0, 8).forEach(function (t) {
            var cl = FA.cat.classify(t, { corrections: S.db.corrections, model: FA.cat.buildModel(S.db) });
            prev.appendChild(h('div.preview-row', {},
              h('span.pr-time', {}, U.fmtDate(t.time, 'md')),
              h('span.pr-merchant', {}, (t.merchant || '').slice(0, 12)),
              h('span.pr-cat', { style: { color: S.cat(cl.category).color } }, S.cat(cl.category).icon + ' ' + S.catName(cl.category)),
              h('span.pr-amt.' + (t.direction === 'income' ? 'pos' : 'dim'), {}, (t.direction === 'income' ? '+' : '-') + UI.money(t.amount))));
          });
          if (r.txns.length > 8) prev.appendChild(h('div.dim.more', {}, '还有 ' + (r.txns.length - 8) + ' 笔…'));
          card.appendChild(prev);
          if (r.skipped.length) {
            card.appendChild(h('details.skip-detail', {}, h('summary', {}, '跳过的 ' + r.skipped.length + ' 行原因'),
              h('div.skip-list', {}, r.skipped.slice(0, 12).map(function (s2) {
                return h('div.skip-line', {}, '第 ' + (s2.row + 1) + ' 行：' + s2.reason);
              }))));
          }
          wrap.appendChild(card);
        });
        wrap.appendChild(h('div.card.import-summary', {},
          h('div', {}, '共解析 ' + IMP.results.files.reduce(function (a, r) { return a + (r.txns || []).length; }, 0) + ' 笔，可新增 ' + totalNew + ' 笔'),
          h('div.dim', {}, '重复忽略 ' + totalDup + ' 笔 · 行异常 ' + totalSkip + ' 行 · 转账/资金划转 ' + totalEx + ' 笔（不计入收支）')));
        wrap.appendChild(h('div.row-btns', {},
          h('button.btn.ghost', { onclick: function () { IMP.results = null; UI.render(); } }, '重新选择'),
          h('button.btn.primary.grow', { onclick: doImport }, '确认导入 ' + totalNew + ' 笔')));
      }

      /* 说明 */
      wrap.appendChild(h('div.tips', {},
        h('b', {}, '📖 如何导出账单'),
        h('div', {}, '微信：我 → 服务 → 钱包 → 账单 → 常见问题 → 下载账单 → 用于个人对账 → 选择时间范围，收到邮件后解压得到 CSV。'),
        h('div', {}, '支付宝：我的 → 账单 → 右上角 … → 开具交易流水证明 → 用于个人对账 → 选择时间范围，邮件里下载 CSV。'),
        h('div', {}, '银行：手机银行 App → 交易明细 → 导出（Excel/CSV）。')));

      return wrap;
    }
  });

  function pickFiles(files) {
    if (!files || !files.length) return;
    files.forEach(function (f) { IMP.files.push(f); });
    IMP.results = null;
    UI.render();
    doParse();
  }
  function doParse() {
    if (!IMP.files.length || IMP.busy) return;
    IMP.busy = true;
    IMP.step = 3;
    UI.render();
    P.ingest(IMP.files, { source: IMP.source, accountId: defaultAccount() }).then(function (res) {
      IMP.results = res;
      IMP.busy = false;
      if (res.files.every(function (f) { return !f.ok; })) UI.toast('没有解析出交易，请检查文件格式', 'error');
      else UI.toast('解析完成');
      UI.render();
    }).catch(function (e) {
      IMP.busy = false;
      UI.toast('解析失败：' + e.message, 'error');
      UI.render();
    });
  }

  function doImport() {
    var added = 0, dup = 0, transferred = 0, adjusted = 0;
    var incoming = [];
    IMP.results.files.forEach(function (r) {
      (r.txns || []).forEach(function (t) { incoming.push(t); });
    });
    var model = FA.cat.buildModel(S.db);
    incoming.forEach(function (t) {
      var d = FA.cat.findDuplicate(t, S.db.txns.concat(incoming.filter(function (x) { return x._done; })));
      if (d) { dup++; return; }
      t.accountId = t.accountId || defaultAccount();
      var cl = FA.cat.classify(t, { corrections: S.db.corrections, model: model });
      t.category = cl.category; t.sub = cl.sub;
      t.auto = { source: cl.source, confidence: cl.confidence, at: Date.now() };
      if (cl.tags && cl.tags.length) t.tags = U.uniq((t.tags || []).concat(cl.tags));
      t._done = 1;
      S.db.txns.push(t);
      added++;
      if (t.direction === 'transfer') { t.excluded = true; transferred++; }
    });
    /* 自动识别内部转账与退款关联 */
    var tr = FA.cat.detectTransfers(S.db);
    tr.forEach(function (x) {
      if (!x.txn.excluded && x.confidence >= 0.85) {
        x.txn.excluded = true; x.txn.direction = 'transfer'; x.txn.category = 'transfer';
        x.txn.auto = Object.assign({}, x.txn.auto, { transfer: x.reason });
        adjusted++;
      }
    });
    S.add('imports', {
      at: Date.now(), files: IMP.files.map(function (f) { return f.name; }), source: IMP.source,
      accountId: defaultAccount(), added: added, dup: dup, transferred: transferred + adjusted, adjusted: adjusted
    });
    S.save(true);
    FA.cat.autoLabel(S.db);
    UI.sheet({
      title: '导入完成 🎉',
      body: h('div.import-done', {},
        h('div.done-stats', {},
          h('div.ds', {}, h('b.income', {}, String(added)), h('span', {}, '笔新增')),
          h('div.ds', {}, h('b.dim', {}, String(dup)), h('span', {}, '笔重复跳过')),
          h('div.ds', {}, h('b', {}, String(transferred + adjusted)), h('span', {}, '笔转账已排除'))),
        h('div.tips', {}, '已按规则库 + 你的历史习惯自动分类。在「流水」里长按可批量修改，修改后会自动记住该商户。'),
        h('div.row-btns', {},
          h('button.btn.ghost', { onclick: function () { IMP.files = []; IMP.results = null; IMP.step = 1; UI.go('txns'); } }, '查看流水'),
          h('button.btn.primary.grow', { onclick: function () { IMP.files = []; IMP.results = null; IMP.step = 1; UI.go('report'); } }, '看月度报告'))),
      onClose: function () { IMP.files = []; IMP.results = null; IMP.step = 1; UI.render(); }
    });
  }

  function historySheet() {
    var list = (S.db.imports || []).slice().reverse();
    UI.sheet({
      title: '导入历史', subtitle: list.length + ' 次导入',
      body: list.length ? h('div.notif-list', {}, list.map(function (it) {
        return h('div.notif-item', {},
          h('span.notif-ic', {}, (P.SOURCE_META[it.source] || {}).icon || '📄'),
          h('div', {}, h('div.notif-title', {}, (it.files || []).join('、') || '手动导入'),
            h('div.notif-desc', {}, U.fmtDate(it.at, 'full') + ' · 新增 ' + it.added + ' 笔 · 跳过重复 ' + it.dup + ' 笔' + (it.transferred ? ' · 转账 ' + it.transferred + ' 笔' : ''))));
      })) : UI.empty('import', '还没有导入记录')
    });
  }

  /* ---------------- 截图 OCR ---------------- */
  function ocrSheet() {
    var input = h('input', { type: 'file', multiple: true, accept: 'image/*', style: { display: 'none' } });
    var area = h('div.ocr-area');
    var engineNote = h('div.tips', {}, P.ocrAvailable()
      ? '✅ 已检测到本地 OCR 引擎（Tesseract），识别在设备上完成，图片不会外传。'
      : 'ℹ️ 未安装离线 OCR 模型：仍可导入截图并快速手工补录（金额、商户、日期会尽量预填）。若要开启文字识别，可把 Tesseract.js 的离线包放入 js/vendor/ 并在 index.html 中引入。');
    var body = h('div', {},
      h('div.drop-zone', { onclick: function () { input.click(); } },
        UI.illust('ocr', 76), h('div.drop-title', {}, '选择微信/支付宝的支付截图'),
        h('div.drop-desc', {}, '可一次选择多张，逐张确认后入账')),
      input, engineNote, area);
    input.addEventListener('change', function () {
      var files = Array.prototype.slice.call(input.files);
      if (!files.length) return;
      area.appendChild(h('div.dim', {}, '正在处理 ' + files.length + ' 张图片…'));
      files.reduce(function (chain, f, i) {
        return chain.then(function () {
          return U.downscale(f, 640, 0.6).then(function (img) {
            var mid = U.uid('img');
            if (img) S.putMedia(mid, img.url);
            return P.ocrImage(f).then(function (r) {
              var cand = (r.candidates && r.candidates[0]) || {};
              addOcrCard(area, { file: f, mediaId: mid, text: r.text, engine: r.engine, cand: cand });
            });
          });
        });
      }, Promise.resolve());
    });
    UI.sheet({ title: '截图导入 / OCR', subtitle: '本地处理，不上传', body: body, size: 'full' });
  }
  function addOcrCard(area, o) {
    var amtEl = h('input.field-input', { type: 'number', inputmode: 'decimal', placeholder: '金额', value: o.cand.amount || '' });
    var merEl = h('input.field-input', { placeholder: '商户', value: o.cand.merchant || '' });
    var dateEl = h('input.field-input', { type: 'date', value: o.cand.time ? U.ymd(o.cand.time) : U.ymd(Date.now()) });
    var catSel = h('select.field-input');
    S.catList('expense').forEach(function (c) { catSel.appendChild(h('option', { value: c.id }, c.icon + ' ' + c.name)); });
    var accSel = h('select.field-input');
    S.db.accounts.forEach(function (a) { accSel.appendChild(h('option', { value: a.id, selected: a.id === defaultAccount() }, a.icon + ' ' + a.name)); });
    var url = S.getMedia(o.mediaId);
    var card = h('div.card.ocr-card', {},
      url ? h('img.ocr-img', { src: url, onclick: function () { UI.sheet({ title: '截图凭证', body: h('img', { src: url, style: { width: '100%', borderRadius: '16px' } }) }); } }) : null,
      h('div.ocr-fields', {},
        amtEl, merEl, dateEl, catSel, accSel),
      h('div.ocr-evidence', {}, '识别依据：' + (o.cand.evidence || (o.engine === 'none' ? '未启用 OCR，请手动填写' : '—'))),
      h('div.row-btns', {},
        h('button.btn.ghost', { onclick: function () { card.remove(); } }, '丢弃'),
        h('button.btn.primary.grow', {
          onclick: function () {
            var amt = parseFloat(amtEl.value);
            if (!isFinite(amt) || amt <= 0) { UI.toast('请填写金额', 'error'); return; }
            var t = FA.parser.manualTxn({
              amount: amt, direction: 'expense', merchant: merEl.value || '截图导入', item: '截图补录',
              accountId: accSel.value, category: catSel.value, time: U.parseDate(dateEl.value), tags: ['OCR']
            });
            t.mediaId = o.mediaId;
            S.addTxn(t);
            S.correction(FA.cat.merchantKey(t), catSel.value, '');
            card.classList.add('done');
            card.querySelector('.row-btns').replaceWith(h('div.done-tag', {}, '✅ 已入账 ' + UI.money(amt)));
            UI.toast('已入账');
          }
        }, '确认入账')));
    area.appendChild(card);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
