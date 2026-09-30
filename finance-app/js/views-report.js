/* FlowAtlas · 月度报告页 */
(function (root) {
  'use strict';
  var FA = root.FA, U = FA.util, UI = FA.ui, S = FA.store, h = UI.h;
  var V = FA.views;
  var RPT_YM = null;

  /* 画布宽度 = 视口宽 - 页面左右内边距(32) - 卡片左右内边距(32) */
  function cw() { return Math.max(240, Math.min(document.documentElement.clientWidth - 64, 528)); }

  function exportActions(r) {
    UI.actions('导出 ' + r.label + ' 报告', [
      { icon: 'image', label: '保存为分享长图', hint: '适合发朋友圈/微信群', onTap: function () { saveCard(r); } },
      { icon: 'doc', label: '导出当月明细 CSV', onTap: function () { U.download('FlowAtlas-' + r.ym + '.csv', FA.report.toCSV(r.ym), 'text/csv;charset=utf-8'); UI.toast('已导出 CSV'); } },
      { icon: 'download', label: '打印 / 存为 PDF', onTap: function () { printReport(r); } },
      { icon: 'link', label: '复制文字摘要', onTap: function () { U.copyToClipboard(textSummary(r)).then(function () { UI.toast('摘要已复制'); }); } }
    ]);
  }
  function dataURLtoBlob(d) {
    var parts = String(d).split(','), mime = (parts[0].match(/:(.*?);/) || [])[1] || 'application/octet-stream';
    var bin = atob(parts[1]), arr = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return new Blob([arr], { type: mime });
  }
  function saveCard(r) {
    UI.toast('正在生成高清长图…');
    setTimeout(function () {
      try {
        var t = FA.report.shareCard(r);
        U.download('FlowAtlas-' + r.ym + '-报告.png', dataURLtoBlob(t.dataURL), 'image/png');
        UI.toast(U.native() ? '长图已保存到「下载」目录' : '长图已保存到下载目录');
      } catch (e) { UI.toast('生成失败：' + e.message, 'error'); }
    }, 60);
  }
  function textSummary(r) {
    var lines = ['【' + r.label + ' 财务报告】', '支出 ' + U.money(r.expense) + '｜收入 ' + U.money(r.income) + '｜结余 ' + U.money(r.net), '储蓄率 ' + Math.round(r.savingsRate * 100) + '%｜日均 ' + U.money(r.avgDaily), ''];
    r.cats.slice(0, 5).forEach(function (c, i) { lines.push((i + 1) + '. ' + c.name + ' ' + U.money(c.total) + '（' + Math.round((c.total / (r.expense || 1)) * 100) + '%）'); });
    lines.push('');
    r.insights.slice(0, 4).forEach(function (x) { lines.push(x.icon + ' ' + x.text); });
    lines.push('', '—— 由 FlowAtlas 本地账本生成');
    return lines.join('\n');
  }
  function printReport(r) {
    var w = window.open('', '_blank');
    if (!w) { UI.toast('浏览器拦截了弹窗', 'error'); return; }
    var rows = r.cats.map(function (c) {
      return '<tr><td>' + c.icon + ' ' + U.escapeHtml(c.name) + '</td><td>' + c.count + '</td><td style="text-align:right">' + U.money(c.total) + '</td><td style="text-align:right">' + Math.round((c.total / (r.expense || 1)) * 100) + '%</td></tr>';
    }).join('');
    var mrows = r.topMerchants.slice(0, 8).map(function (m) {
      return '<tr><td>' + U.escapeHtml(m.name) + '</td><td>' + m.count + '</td><td style="text-align:right">' + U.money(m.total) + '</td></tr>';
    }).join('');
    var irows = r.insights.map(function (x) { return '<li>' + x.icon + ' ' + U.escapeHtml(x.text) + '</li>'; }).join('');
    var brows = r.budgets.map(function (b) {
      return '<tr><td>' + b.icon + ' ' + U.escapeHtml(b.name) + '</td><td style="text-align:right">' + U.money(b.spent) + ' / ' + U.money(b.amount) + '</td><td style="text-align:right">' + Math.round(b.pct * 100) + '%</td></tr>';
    }).join('');
    var html = '<!doctype html><html><head><meta charset="utf-8"><title>' + r.label + ' 财务报告</title>' +
      '<style>body{font-family:-apple-system,"PingFang SC","Microsoft YaHei",sans-serif;padding:28px;color:#111}h1{font-size:22px;margin:0 0 4px}.sub{color:#666;font-size:12px;margin-bottom:18px}' +
      '.grid{display:flex;gap:10px;margin:16px 0}.box{flex:1;border:1px solid #eee;border-radius:10px;padding:12px}.box b{display:block;font-size:20px}.box span{font-size:12px;color:#666}' +
      'table{width:100%;border-collapse:collapse;margin:8px 0 18px;font-size:13px}th,td{border-bottom:1px solid #eee;padding:7px 4px;text-align:left}th{color:#666;font-weight:500}' +
      'h2{font-size:15px;margin:20px 0 6px}li{font-size:13px;margin:4px 0}@media print{body{padding:0}}</style></head><body>' +
      '<h1>' + r.label + ' 财务报告</h1><div class="sub">FlowAtlas 本地账本 · 生成于 ' + U.fmtDate(r.generatedAt, 'full') + ' · 共 ' + r.count + ' 笔流水</div>' +
      '<div class="grid"><div class="box"><span>支出</span><b style="color:#d33">' + U.money(r.expense) + '</b></div>' +
      '<div class="box"><span>收入</span><b style="color:#1a9e4b">' + U.money(r.income) + '</b></div>' +
      '<div class="box"><span>结余</span><b style="color:#2563eb">' + U.money(r.net) + '</b></div>' +
      '<div class="box"><span>储蓄率</span><b>' + Math.round(r.savingsRate * 100) + '%</b></div></div>' +
      '<h2>支出构成</h2><table><tr><th>分类</th><th>笔数</th><th style="text-align:right">金额</th><th style="text-align:right">占比</th></tr>' + rows + '</table>' +
      '<h2>消费最多</h2><table><tr><th>商户</th><th>笔数</th><th style="text-align:right">金额</th></tr>' + mrows + '</table>' +
      (brows ? '<h2>预算执行</h2><table><tr><th>预算</th><th style="text-align:right">已用 / 总额</th><th style="text-align:right">进度</th></tr>' + brows + '</table>' : '') +
      '<h2>本月洞察</h2><ul>' + irows + '</ul>' +
      '<h2>资产负债</h2><p>资产 ' + U.money(r.assets) + ' · 负债 ' + U.money(r.debts) + ' · 净资产 <b>' + U.money(r.netWorth) + '</b></p>' +
      '</body></html>';
    w.document.write(html);
    w.document.close();
    setTimeout(function () { try { w.focus(); w.print(); } catch (e) { } }, 400);
  }

  FA.ui.register('report', {
    tab: 'report',
    title: function () { return (RPT_YM ? U.monthLabel(RPT_YM) : U.monthLabel(U.ym(Date.now()))) + ' 报告'; },
    actions: function () {
      var ym = RPT_YM || U.ym(Date.now());
      return [
        { icon: 'image', label: '导出', onTap: function () { exportActions(FA.report.build(ym)); } },
        { icon: 'calendar', label: '选择月份', onTap: function () { V.reportMonthPicker(); } }
      ];
    },
    render: function (p) {
      if (p.m) RPT_YM = p.m;
      var ym = RPT_YM || U.ym(Date.now());
      var r = FA.report.build(ym);
      var wrap = h('div.page.report');

      /* 月份切换 */
      wrap.appendChild(h('div.report-months', {}, FA.report.availableMonths().slice(0, 12).map(function (m) {
        return h('button.chip' + (m === ym ? '.on' : ''), { onclick: function () { RPT_YM = m; UI.go('report', { m: m }, true); } }, U.monthLabel(m).replace('年', '/').replace('月', ''));
      })));

      /* 概览 */
      wrap.appendChild(h('div.card.report-hero', {},
        h('div.rh-grid', {},
          h('div.rh-cell', {}, h('span.rh-k', {}, '支出'), h('span.rh-v.expense', {}, UI.money(r.expense)),
            r.deltaExpense != null ? h('span.rh-d' + (r.deltaExpense > 0 ? '.up' : '.down'), {}, (r.deltaExpense > 0 ? '↑' : '↓') + Math.abs(Math.round(r.deltaExpense * 100)) + '% 环比') : null),
          h('div.rh-cell', {}, h('span.rh-k', {}, '收入'), h('span.rh-v.income', {}, UI.money(r.income)),
            r.deltaIncome != null ? h('span.rh-d' + (r.deltaIncome > 0 ? '.up' : '.down'), {}, (r.deltaIncome > 0 ? '↑' : '↓') + Math.abs(Math.round(r.deltaIncome * 100)) + '% 环比') : null),
          h('div.rh-cell', {}, h('span.rh-k', {}, '结余'), h('span.rh-v.' + (r.net >= 0 ? 'income' : 'expense'), {}, UI.money(r.net)),
            h('span.rh-d', {}, '储蓄率 ' + Math.round(r.savingsRate * 100) + '%')),
          h('div.rh-cell', {}, h('span.rh-k', {}, '日均支出'), h('span.rh-v', {}, UI.money(r.avgDaily)),
            h('span.rh-d', {}, r.activeDays + '/' + r.daysInMonth + ' 天有消费')))));

      /* 洞察 */
      if (r.insights.length) {
        wrap.appendChild(UI.sectionTitle('自动洞察', null, 'insight'));
        wrap.appendChild(h('div.insight-list', {}, r.insights.map(function (x) {
          return h('div.insight-row.' + x.tone, {}, h('span.ins-ic', {}, x.icon), h('span', {}, x.text));
        })));
      }

      /* 支出构成 */
      var donut = h('canvas');
      var trend = h('canvas');
      var heat = h('canvas');
      var rank = h('canvas');
      wrap.appendChild(UI.sectionTitle('支出构成', h('span.link', { onclick: function () { UI.go('txns'); } }, '看流水'), 'report'));
      var catCard = h('div.card.cat-card', {}, h('div.donut-wrap', {}, donut));
      var legend = h('div.legend');
      r.cats.forEach(function (c) {
        legend.appendChild(h('div.legend-row', {
          onclick: function () { V.catDetailSheet(c, ym); }
        },
          h('span.legend-dot', { style: { background: c.color } }),
          h('span.legend-name', {}, c.icon + ' ' + c.name),
          h('span.legend-count', {}, c.count + ' 笔'),
          h('span.legend-amt', {}, UI.money(c.total)),
          h('span.legend-pct', {}, Math.round((c.total / (r.expense || 1)) * 100) + '%')));
      });
      catCard.appendChild(legend);
      wrap.appendChild(catCard);

      /* 趋势 */
      wrap.appendChild(UI.sectionTitle('近 6 个月趋势', null, 'invest'));
      wrap.appendChild(h('div.card', {}, h('div.chart-legend', {},
        h('span', {}, h('i.dot', { style: { background: '#22C55E' } }), '收入'),
        h('span', {}, h('i.dot', { style: { background: '#FF6B6B' } }), '支出')),
        trend));

      /* 热力图 */
      wrap.appendChild(UI.sectionTitle('每日消费热力图', null, 'month'));
      wrap.appendChild(h('div.card', {}, heat, h('div.heat-legend', {}, h('span.dim', {}, '少'), h('i.hl', { style: { background: 'rgba(148,163,184,.15)' } }), h('i.hl', { style: { background: 'hsl(120,85%,72%)' } }), h('i.hl', { style: { background: 'hsl(60,85%,64%)' } }), h('i.hl', { style: { background: 'hsl(0,85%,56%)' } }), h('span.dim', {}, '多'))));

      /* Top 商户 */
      wrap.appendChild(UI.sectionTitle('消费最多的商户', null, 'shopping'));
      wrap.appendChild(h('div.card', {}, rank));

      /* 异常 */
      if (r.anomalies.length) {
        wrap.appendChild(UI.sectionTitle('异常交易提醒 (' + r.anomalies.length + ')', null, 'alert'));
        var ac = h('div.card.list-card');
        r.anomalies.slice(0, 8).forEach(function (a2) {
          ac.appendChild(h('div.anomaly-row', { onclick: function () { V.txnSheet(a2.txn.id, UI.render); } },
            h('span.anomaly-ic', {}, a2.type === 'duplicate' ? '👯' : a2.type === 'night' ? '🌙' : '💥'),
            h('div.anomaly-mid', {}, h('div', {}, (a2.txn.merchant || '').slice(0, 16)), h('div.dim', {}, a2.reason + ' · ' + U.fmtDate(a2.txn.time, 'md'))),
            h('span.money.expense', {}, UI.money(a2.txn.amount))));
        });
        wrap.appendChild(ac);
      }

      /* 预算执行 */
      if (r.budgets.length) {
        wrap.appendChild(UI.sectionTitle('预算执行', h('span.link', { onclick: function () { UI.go('plan', { tab: 'budget' }); } }, '管理'), 'budget'));
        wrap.appendChild(h('div.card', {}, r.budgets.map(function (b) {
          var col = b.pct > 1 ? '#EF4444' : b.pct > 0.8 ? '#F59E0B' : b.color;
          return h('div.bm-row', {},
            h('div.bm-top', {}, h('span', {}, b.icon + ' ' + b.name),
              h('span', { class: b.pct > 1 ? 'neg' : 'dim' }, UI.money(b.spent) + ' / ' + UI.money(b.amount) + ' · ' + Math.round(b.pct * 100) + '%')),
            UI.progressBar(b.pct, col));
        })));
      }

      /* 资产负债 */
      wrap.appendChild(UI.sectionTitle('资产负债', null, 'networth'));
      wrap.appendChild(h('div.card.bs-card', {},
        h('div.bs-row', {}, h('span', {}, '💎 资产'), h('span', {}, UI.money(r.assets))),
        h('div.bs-row', {}, h('span', {}, '💳 负债'), h('span.neg', {}, UI.money(r.debts))),
        h('div.bs-row.total', {}, h('span', {}, '净资产'), h('span', { class: r.netWorth >= 0 ? 'pos' : 'neg' }, UI.money(r.netWorth))),
        h('div.bs-accounts', {}, r.accounts.map(function (a2) {
          return h('span.acc-pill', { style: { borderColor: a2.color } }, a2.icon + ' ' + a2.name + ' ' + UI.money(a2.balance));
        }))));

      /* 目标 / 订阅 / 债务 */
      if (r.goals.length) {
        wrap.appendChild(UI.sectionTitle('储蓄目标', h('span.link', { onclick: function () { UI.go('plan', { tab: 'goal' }); } }, '管理'), 'goal'));
        wrap.appendChild(h('div.card', {}, r.goals.map(function (g) {
          return h('div.bm-row', {}, h('div.bm-top', {}, h('span', {}, (g.icon || '🏆') + ' ' + g.name), h('span.dim', {}, UI.money(g.saved) + ' / ' + UI.money(g.target))), UI.progressBar(g.pct, '#22C55E'));
        })));
      }
      wrap.appendChild(UI.sectionTitle('固定支出与债务', null, 'sub'));
      wrap.appendChild(h('div.card.fixed-card', {},
        h('div.bs-row', {}, h('span', {}, '🔁 订阅月均'), h('span', {}, UI.money(r.subsMonthly) + ' · ' + r.subCount + ' 项')),
        h('div.bs-row', {}, h('span', {}, '💳 债务余额'), h('span.neg', {}, UI.money(r.debtBalance) + ' · ' + r.debtCount + ' 笔')),
        h('div.bs-row', {}, h('span', {}, '月供合计'), h('span', {}, UI.money(r.debtMonthly)))));

      wrap.appendChild(h('div.row-btns', {},
        h('button.btn.primary.grow', { onclick: function () { saveCard(r); } }, UI.icon('image', 16) + ' 保存分享长图'),
        h('button.btn.ghost', { onclick: function () { exportActions(r); } }, '更多导出')));

      /* 图表延迟绘制 */
      var w = cw();
      UI.deferChart(function () {
        FA.chart.donut(donut, {
          w: w, h: 190, data: r.cats.map(function (c) { return { value: c.total, color: c.color }; }),
          center: { value: U.moneyShort(r.expense), label: '总支出' }, centerValueSize: 22
        });
        FA.chart.dualBars(trend, { w: w, h: 170, labels: r.trend.map(function (t) { return t.label; }), a: r.trend.map(function (t) { return t.income; }), b: r.trend.map(function (t) { return t.expense; }) });
        FA.chart.heat(heat, { w: w, h: 170, days: r.heat });
        FA.chart.rank(rank, { w: w, rowH: 36, data: r.topMerchants.slice(0, 6) });
      });
      return wrap;
    }
  });

  V.reportMonthPicker = function () {
    var ms = FA.report.availableMonths();
    UI.sheet({
      title: '选择报告月份',
      body: h('div.chips-input', {}, ms.map(function (m) {
        return h('button.chip' + (m === (RPT_YM || U.ym(Date.now())) ? '.on' : ''), {
          onclick: function () { RPT_YM = m; UI.go('report', { m: m }, true); }
        }, U.monthLabel(m));
      }))
    });
  };

  V.catDetailSheet = function (c, ym) {
    var subs = Object.keys(c.subs || {}).map(function (k) { return { name: k, total: c.subs[k] }; });
    subs.sort(function (a, b) { return b.total - a.total; });
    var list = S.filterTxns({ ym: ym, direction: 'expense', category: c.id }).sort(function (a, b) { return b.time - a.time; });
    UI.sheet({
      title: c.icon + ' ' + c.name + ' · ' + U.money(c.total),
      subtitle: c.count + ' 笔 · 占本月支出 ' + Math.round((c.total / (FA.report.build(ym).expense || 1)) * 100) + '%',
      size: 'full',
      body: h('div', {},
        subs.length > 1 ? h('div.chips-input', {}, subs.map(function (s2) { return h('span.chip', {}, s2.name + ' ' + U.money(s2.total)); })) : null,
        h('div.card.list-card', {}, list.slice(0, 50).map(function (t) { return V.txnRow(t, { after: UI.render }); })))
    });
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
