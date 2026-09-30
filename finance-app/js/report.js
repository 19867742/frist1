/* FlowAtlas · 月度报告：统计建模 + 洞察生成 + 分享长图导出 */
(function (root) {
  'use strict';
  var FA = root.FA, U = FA.util;
  var Rp = (FA.report = {});

  Rp.availableMonths = function () {
    var S = FA.store, set = {};
    S.db.txns.forEach(function (t) { set[U.ym(t.time)] = 1; });
    var arr = Object.keys(set).sort().reverse();
    var cur = U.ym(Date.now());
    if (arr.indexOf(cur) < 0) arr.unshift(cur);
    return arr;
  };

  function monthBudgetExec(ym) {
    var S = FA.store;
    return S.db.budgets.map(function (b) {
      var cats = b.categories && b.categories.length ? b.categories : null;
      var list = S.filterTxns({ ym: ym, direction: 'expense' });
      var scope = cats ? list.filter(function (t) { return cats.indexOf(t.category) >= 0; }) : list;
      var spent = U.sum(scope, function (t) { return t.amount; });
      var days = new Date(U.monthRange(ym).end - 1).getDate();
      var now = new Date();
      var elapsed = U.ym(now) === ym ? now.getDate() : days;
      var expected = (b.amount * elapsed) / days;
      return {
        id: b.id, name: b.name, icon: b.icon || '🎯', color: b.color || '#4D96FF',
        amount: b.amount, spent: U.round2(spent), left: U.round2(b.amount - spent),
        pct: b.amount > 0 ? spent / b.amount : 0, pace: expected > 0 ? spent / expected : 0,
        dailyAllowance: U.round2(Math.max(0, (b.amount - spent) / Math.max(1, days - elapsed + 1))),
        categories: cats, period: b.period || 'monthly'
      };
    });
  }

  Rp.build = function (ym) {
    var S = FA.store;
    ym = ym || U.ym(Date.now());
    var cur = S.summary({ ym: ym });
    var prevYm = U.addMonths(ym, -1);
    var prev = S.summary({ ym: prevYm });
    var cats = S.catBreakdown({ ym: ym }, 'expense');
    var incCats = S.catBreakdown({ ym: ym }, 'income');
    var byMerchant = {};
    cur.list.forEach(function (t) {
      if (t.direction !== 'expense') return;
      var k = FA.cat.aliasOf(FA.cat.normalizeMerchant(t.merchant)) || t.merchant;
      byMerchant[k] = byMerchant[k] || { name: k, total: 0, count: 0, category: t.category, icon: S.cat(t.category).icon, color: S.cat(t.category).color };
      byMerchant[k].total += t.amount; byMerchant[k].count++;
    });
    var top = U.sortBy(Object.keys(byMerchant).map(function (k) { return byMerchant[k]; }), function (x) { return x.total; }, true);
    top.forEach(function (x) { x.total = U.round2(x.total); });

    var range = U.monthRange(ym), daysInMonth = new Date(range.end - 1).getDate();
    var perDay = [], heat = [];
    for (var d = 1; d <= daysInMonth; d++) {
      var day = new Date(range.start); day.setDate(d);
      var ts = day.getTime(), t2 = ts + 86400000;
      var dayList = cur.list.filter(function (t) { return t.time >= ts && t.time < t2; });
      var exp = U.sum(dayList.filter(function (t) { return t.direction === 'expense'; }), function (t) { return t.amount; });
      var inc = U.sum(dayList.filter(function (t) { return t.direction === 'income'; }), function (t) { return t.amount; });
      perDay.push({ day: d, date: U.ymd(day), expense: U.round2(exp), income: U.round2(inc), weekend: day.getDay() === 0 || day.getDay() === 6 });
      heat.push({ date: U.ymd(day), value: exp });
    }
    var trend = [];
    for (var i = 5; i >= 0; i--) {
      var m = U.addMonths(ym, -i), s2 = S.summary({ ym: m });
      trend.push({ ym: m, label: (+m.split('-')[1]) + '月', income: s2.income, expense: s2.expense, net: s2.net });
    }
    var budgets = monthBudgetExec(ym);
    var anomalies = FA.cat.detectAnomalies(cur.list, {});
    var nw = S.netWorth();
    var subsMonthly = 0;
    S.db.subs.forEach(function (s2) {
      if (s2.status === 'cancelled') return;
      var f = s2.cycle === 'yearly' ? 1 / 12 : s2.cycle === 'quarterly' ? 1 / 3 : s2.cycle === 'weekly' ? 4.33 : 1;
      subsMonthly += (s2.amount || 0) * f;
    });
    var dueDebts = S.db.debts.filter(function (x) { return x.status !== 'closed'; });
    var activeDays = perDay.filter(function (p) { return p.expense > 0; }).length;

    var r = {
      ym: ym, label: U.monthLabel(ym), generatedAt: Date.now(),
      income: cur.income, expense: cur.expense, net: cur.net, count: cur.count,
      savingsRate: cur.savingsRate,
      prevYm: prevYm, prev: { income: prev.income, expense: prev.expense, net: prev.net },
      deltaExpense: prev.expense > 0 ? (cur.expense - prev.expense) / prev.expense : null,
      deltaIncome: prev.income > 0 ? (cur.income - prev.income) / prev.income : null,
      cats: cats, incomeCats: incCats, topMerchants: top.slice(0, 10),
      perDay: perDay, heat: heat, trend: trend, budgets: budgets, anomalies: anomalies,
      assets: nw.assets, debts: nw.debts, netWorth: nw.net,
      avgDaily: U.round2(cur.expense / Math.max(1, daysInMonth)),
      activeDays: activeDays, daysInMonth: daysInMonth,
      biggest: U.sortBy(cur.list.filter(function (t) { return t.direction === 'expense'; }), function (t) { return t.amount; }, true).slice(0, 5),
      subsMonthly: U.round2(subsMonthly),
      subCount: S.db.subs.filter(function (x) { return x.status !== 'cancelled'; }).length,
      debtCount: dueDebts.length,
      debtBalance: U.round2(U.sum(dueDebts, function (x) { return x.balance || 0; })),
      debtMonthly: U.round2(U.sum(dueDebts, function (x) { return x.minPayment || 0; })),
      upcomingDebts: U.sortBy(dueDebts.filter(function (x) { return x.dueDay; }), function (x) { return x.dueDay; }),
      goals: S.db.goals.map(function (g) {
        var pct = g.targetAmount > 0 ? (g.saved || 0) / g.targetAmount : 0;
        return { id: g.id, name: g.name, icon: g.icon, target: g.targetAmount, saved: g.saved || 0, pct: pct, deadline: g.deadline, remain: U.round2(Math.max(0, g.targetAmount - (g.saved || 0))) };
      }),
      accounts: S.db.accounts.map(function (a) { return { id: a.id, name: a.name, icon: a.icon, color: a.color, balance: S.accountBalance(a) }; })
    };
    r.insights = Rp.insights(r);
    return r;
  };

  /* ---------------- 自动洞察 ---------------- */
  Rp.insights = function (r) {
    var out = [];
    if (r.deltaExpense != null) {
      var d = Math.round(Math.abs(r.deltaExpense) * 100);
      if (r.deltaExpense > 0.1) out.push({ icon: '📈', tone: 'warn', text: '本月支出比上月增加 ' + d + '%，多花了 ' + U.money(r.expense - r.prev.expense) });
      else if (r.deltaExpense < -0.1) out.push({ icon: '📉', tone: 'good', text: '本月支出比上月减少 ' + d + '%，省下 ' + U.money(r.prev.expense - r.expense) });
      else out.push({ icon: '⚖️', tone: 'flat', text: '支出与上月基本持平（波动 ' + d + '%）' });
    }
    if (r.savingsRate > 0) {
      out.push({ icon: '🐷', tone: r.savingsRate > 0.3 ? 'good' : 'flat', text: '储蓄率 ' + Math.round(r.savingsRate * 100) + '%，本月结余 ' + U.money(r.net) });
    } else if (r.income > 0) {
      out.push({ icon: '🚨', tone: 'warn', text: '本月入不敷出，赤字 ' + U.money(-r.net) });
    }
    if (r.cats.length) {
      var top = r.cats[0], share = r.expense > 0 ? top.total / r.expense : 0;
      out.push({ icon: top.icon, tone: share > 0.4 ? 'warn' : 'flat', text: top.name + ' 占比最高 ' + Math.round(share * 100) + '%，共 ' + U.money(top.total) });
      /* 增速最快的分类 */
      var prevCats = FA.store.catBreakdown({ ym: r.prevYm }, 'expense'), m = {};
      prevCats.forEach(function (c) { m[c.id] = c.total; });
      var growth = r.cats.map(function (c) { return { c: c, g: (c.total - (m[c.id] || 0)) / ((m[c.id] || 0) || Math.max(c.total, 1)) }; })
        .filter(function (x) { return x.c.total > 100 && (m[x.c.id] || 0) > 50; }).sort(function (a, b) { return b.g - a.g; })[0];
      if (growth && growth.g > 0.5) out.push({ icon: '🔺', tone: 'warn', text: growth.c.name + ' 比上月增长 ' + Math.round(growth.g * 100) + '%，注意控制' });
    }
    r.budgets.forEach(function (b) {
      if (b.pct > 1) out.push({ icon: '💥', tone: 'warn', text: '「' + b.name + '」已超预算 ' + U.money(b.spent - b.amount) + '（' + Math.round(b.pct * 100) + '%）' });
      else if (b.pct > 0.8) out.push({ icon: '⚠️', tone: 'warn', text: '「' + b.name + '」预算已用 ' + Math.round(b.pct * 100) + '%，剩余 ' + U.money(b.left) });
    });
    if (r.subsMonthly > 0) out.push({ icon: '🔁', tone: 'flat', text: '订阅固定支出约 ' + U.money(r.subsMonthly) + '/月，全年 ' + U.money(r.subsMonthly * 12) });
    if (r.anomalies.length) out.push({ icon: '🔍', tone: 'warn', text: '发现 ' + r.anomalies.length + ' 笔异常交易，最大一笔 ' + U.money(r.anomalies[0].txn ? r.anomalies[0].txn.amount : (r.biggest[0] ? r.biggest[0].amount : 0)) });
    if (r.topMerchants.length && r.expense > 0) {
      var t0 = r.topMerchants[0];
      out.push({ icon: '🏪', tone: 'flat', text: '最常消费的商户是「' + t0.name + '」，共 ' + t0.count + ' 笔 ' + U.money(t0.total) });
    }
    if (r.netWorth < 0) out.push({ icon: '⚠️', tone: 'warn', text: '净资产为负（' + U.money(r.netWorth) + '），债务 ' + U.money(r.debts) });
    else if (r.assets > 0) out.push({ icon: '🏦', tone: 'good', text: '净资产 ' + U.money(r.netWorth) + '（资产 ' + U.money(r.assets) + ' / 负债 ' + U.money(r.debts) + '）' });
    return out;
  };

  /* ---------------- 导出 CSV ---------------- */
  Rp.toCSV = function (ym) {
    var S = FA.store;
    var list = S.filterTxns({ ym: ym, includeExcluded: true }).sort(function (a, b) { return a.time - b.time; });
    var head = ['时间', '类型', '账户', '分类', '子分类', '商户', '商品', '金额', '方向', '支付方式', '状态', '交易单号', '备注', '标签'];
    var dirCN = { expense: '支出', income: '收入', transfer: '转账' };
    var lines = [head.join(',')];
    list.forEach(function (t) {
      var acc = S.account(t.accountId);
      var row = [U.fmtDate(t.time, 'full'), t.source, acc.name, S.catName(t.category), t.sub || '', t.merchant, t.item, t.amount, dirCN[t.direction] || '', t.payMethod, t.status, t.orderNo, t.note, (t.tags || []).join(' ')];
      lines.push(row.map(function (c) { var s = String(c == null ? '' : c); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }).join(','));
    });
    return '\uFEFF' + lines.join('\r\n');
  };

  /* ---------------- 分享长图 ---------------- */
  function rrect(g, x, y, w, h, r) { FA.chart.roundRect(g, x, y, w, h, r); }
  function F(g, size, weight) { FA.chart.font(g, size, weight); }

  Rp.shareCard = function (r) {
    var W = 1080, H = 1720;
    var c = document.createElement('canvas');
    c.width = W; c.height = H;
    var g = c.getContext('2d');
    /* 背景 */
    var bg = g.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, '#0B1220'); bg.addColorStop(0.5, '#131C31'); bg.addColorStop(1, '#0E1626');
    g.fillStyle = bg; g.fillRect(0, 0, W, H);
    var blobs = [[120, 120, 360, '#FF6B6B'], [W - 90, 260, 320, '#4D96FF'], [W - 160, H - 300, 380, '#8E7CFF'], [180, H - 200, 300, '#2ED3B7']];
    g.globalAlpha = 0.22;
    blobs.forEach(function (b) {
      var rad = g.createRadialGradient(b[0], b[1], 0, b[0], b[1], b[2]);
      rad.addColorStop(0, b[3]); rad.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = rad; g.beginPath(); g.arc(b[0], b[1], b[2], 0, 7); g.fill();
    });
    g.globalAlpha = 1;

    /* 头部 */
    g.textAlign = 'left';
    F(g, 30, 800); g.fillStyle = '#ffffff';
    g.fillText(r.label + ' 财务报告', 64, 108);
    F(g, 22, 500); g.fillStyle = 'rgba(255,255,255,.55)';
    g.fillText('FlowAtlas · 共 ' + r.count + ' 笔流水 · ' + U.fmtDate(r.generatedAt, 'md') + ' 生成', 64, 148);

    /* 三大数字 */
    var cardY = 200, cardH = 250;
    g.fillStyle = 'rgba(255,255,255,.06)';
    rrect(g, 64, cardY, W - 128, cardH, 32); g.fill();
    g.strokeStyle = 'rgba(255,255,255,.08)'; g.lineWidth = 2; g.stroke();
    var cols = [
      { t: '支出', v: r.expense, c: '#FF6B6B', d: r.deltaExpense },
      { t: '收入', v: r.income, c: '#22C55E', d: r.deltaIncome },
      { t: '结余', v: r.net, c: '#4D96FF', d: null }
    ];
    cols.forEach(function (x, i) {
      var cx = 64 + (W - 128) * (i / 3) + (W - 128) / 6;
      g.textAlign = 'center';
      F(g, 26, 600); g.fillStyle = 'rgba(255,255,255,.6)'; g.fillText(x.t, cx, cardY + 60);
      F(g, 52, 800); g.fillStyle = x.c;
      g.fillText(U.money(x.v, { dec: 0 }), cx, cardY + 130);
      if (x.d != null && isFinite(x.d)) {
        F(g, 24, 600);
        g.fillStyle = x.d > 0 ? '#FF9F9F' : '#7BE0A5';
        g.fillText((x.d > 0 ? '▲ ' : '▼ ') + Math.abs(Math.round(x.d * 100)) + '% 环比', cx, cardY + 180);
      }
    });

    /* 环形分类 */
    var secY = cardY + cardH + 60;
    g.textAlign = 'left';
    F(g, 30, 700); g.fillStyle = '#fff'; g.fillText('支出构成', 64, secY);
    var donutCx = 300, donutCy = secY + 230, R = 150, rr = 92;
    var total = r.expense || 1, a0 = -Math.PI / 2;
    g.lineWidth = R - rr;
    r.cats.slice(0, 7).forEach(function (cat, i) {
      var ang = (cat.total / total) * Math.PI * 2;
      g.beginPath(); g.arc(donutCx, donutCy, (R + rr) / 2, a0 + 0.012, a0 + ang - 0.012);
      g.strokeStyle = cat.color || FA.chart.color(i); g.stroke();
      a0 += ang;
    });
    F(g, 40, 800); g.textAlign = 'center'; g.fillStyle = '#fff';
    g.fillText(U.money(r.expense, { dec: 0 }), donutCx, donutCy + 6);
    F(g, 22, 500); g.fillStyle = 'rgba(255,255,255,.55)';
    g.fillText('本月总支出', donutCx, donutCy + 42);
    /* 图例 */
    var lx = 540, ly = secY + 70;
    g.textAlign = 'left';
    r.cats.slice(0, 6).forEach(function (cat, i) {
      var y = ly + i * 62;
      g.fillStyle = cat.color || FA.chart.color(i);
      rrect(g, lx, y - 20, 26, 26, 8); g.fill();
      F(g, 26, 600); g.fillStyle = 'rgba(255,255,255,.92)';
      g.fillText((cat.icon || '') + ' ' + cat.name, lx + 44, y);
      F(g, 24, 700); g.textAlign = 'right'; g.fillStyle = '#fff';
      g.fillText(U.money(cat.total, { dec: 0 }) + '  ' + Math.round((cat.total / total) * 100) + '%', W - 70, y);
      g.textAlign = 'left';
    });

    /* 趋势 */
    var tY = donutCy + 250;
    F(g, 30, 700); g.fillStyle = '#fff'; g.fillText('近 6 个月走势', 64, tY);
    var gx = 84, gy = tY + 40, gw = W - 200, gh = 210;
    var allv = r.trend.map(function (t) { return Math.max(t.income, t.expense); }).concat([1]);
    var maxv = Math.max.apply(null, allv) * 1.15;
    var n = r.trend.length;
    var X = function (i) { return gx + (gw * i) / (n - 1 || 1); };
    var Y = function (v) { return gy + gh - (gh * v) / maxv; };
    [[r.trend.map(function (t) { return t.expense; }), '#FF6B6B'], [r.trend.map(function (t) { return t.income; }), '#22C55E']].forEach(function (pair) {
      var d = pair[0], col = pair[1];
      g.beginPath();
      d.forEach(function (v, i) { i ? g.lineTo(X(i), Y(v)) : g.moveTo(X(i), Y(v)); });
      g.strokeStyle = col; g.lineWidth = 5; g.lineJoin = 'round'; g.stroke();
      d.forEach(function (v, i) { g.beginPath(); g.arc(X(i), Y(v), 7, 0, 7); g.fillStyle = '#0B1220'; g.fill(); g.strokeStyle = col; g.lineWidth = 4; g.stroke(); });
      g.textAlign = 'center';
      r.trend.forEach(function (t, i) {
        F(g, 22, 500); g.fillStyle = 'rgba(255,255,255,.55)';
        g.fillText(t.label, X(i), gy + gh + 34);
      });
    });

    /* Top 商户 + 预算 */
    var pY = gy + gh + 90;
    F(g, 30, 700); g.fillStyle = '#fff'; g.textAlign = 'left'; g.fillText('消费最多', 64, pY);
    r.topMerchants.slice(0, 4).forEach(function (m, i) {
      var y = pY + 50 + i * 58;
      F(g, 26, 600); g.fillStyle = 'rgba(255,255,255,.9)';
      g.textAlign = 'left';
      g.fillText((i + 1) + '. ' + (m.icon || '') + ' ' + String(m.name).slice(0, 12), 64, y);
      F(g, 26, 700); g.fillStyle = '#FFB020'; g.textAlign = 'right';
      g.fillText(U.money(m.total, { dec: 0 }) + ' ×' + m.count, W - 70, y);
    });
    g.textAlign = 'left';
    /* 预算 */
    if (r.budgets.length) {
      F(g, 30, 700); g.fillStyle = '#fff'; g.fillText('预算执行', 64, pY + 300);
      r.budgets.slice(0, 3).forEach(function (b, i) {
        var y = pY + 350 + i * 62;
        var col = b.pct > 1 ? '#EF4444' : b.pct > 0.8 ? '#F59E0B' : '#22C55E';
        F(g, 24, 600); g.fillStyle = 'rgba(255,255,255,.88)';
        g.fillText(b.icon + ' ' + b.name, 64, y);
        g.fillStyle = 'rgba(255,255,255,.12)';
        rrect(g, 64, y + 14, W - 300, 12, 6); g.fill();
        g.fillStyle = col;
        rrect(g, 64, y + 14, Math.max(12, Math.min(1, b.pct) * (W - 300)), 12, 6); g.fill();
        F(g, 22, 700); g.fillStyle = col; g.textAlign = 'right';
        g.fillText(Math.round(b.pct * 100) + '%', W - 70, y + 5);
        g.textAlign = 'left';
      });
    }

    /* 页脚 */
    var fy = H - 96;
    g.fillStyle = 'rgba(255,255,255,.07)';
    rrect(g, 64, fy - 44, W - 128, 80, 24); g.fill();
    F(g, 24, 600); g.fillStyle = 'rgba(255,255,255,.8)'; g.textAlign = 'center';
    g.fillText('储蓄率 ' + Math.round(r.savingsRate * 100) + '%   ·   日均 ' + U.money(r.avgDaily) + '   ·   订阅 ' + U.money(r.subsMonthly) + '/月   ·   FlowAtlas 本地账本', W / 2, fy);

    return { dataURL: c.toDataURL('image/png'), width: W, height: H };
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
