/* FlowAtlas · 主视图：首页仪表盘 / 流水明细 / 交易详情 */
(function (root) {
  'use strict';
  var FA = root.FA, U = FA.util, UI = FA.ui, S = FA.store, h = UI.h;
  var V = (FA.views = FA.views || {});

  /* ================= 共用：交易行 ================= */
  V.txnRow = function (t, opt) {
    opt = opt || {};
    var cat = S.cat(t.category), acc = S.account(t.accountId);
    var row = h('div.txn-row' + (t.excluded ? '.excluded' : '') + (opt.selected ? '.selected' : ''), {
      onclick: function () { opt.onTap ? opt.onTap(t) : V.txnSheet(t.id, opt.after); }
    },
      h('div.txn-icon', {}, UI.catIllust(t.category, 42)),
      h('div.txn-main', {},
        h('div.txn-title', {}, FA.cat.aliasOf(FA.cat.normalizeMerchant(t.merchant)) || t.merchant || '未知商户'),
        h('div.txn-sub', {}, [
          U.fmtDate(t.time, 'time'),
          t.sub || cat.name,
          acc.icon + acc.name,
          (t.tags || []).length ? (t.tags || []).slice(0, 2).join('·') : null
        ].filter(Boolean).join(' · '))),
      h('div.txn-amount', {},
        h('div.money.' + UI.dirClass(t), {}, (opt.selMode ? '' : UI.dirSign(t)) + UI.money(t.amount)),
        t.auto && t.auto.source === 'fallback' && !t.excluded ? h('div.txn-badge', {}, '待确认') : null));
    if (opt.selMode) {
      row.insertBefore(h('div.sel-check' + (opt.selected ? '.on' : ''), {}, opt.selected ? UI.icon('check', 16) : null), row.firstChild);
    }
    UI.longPress(row, function () { opt.onLong ? opt.onLong(t) : V.quickActions(t, opt.after); });
    return row;
  };

  V.quickActions = function (t, after) {
    UI.actions('快速操作', [
      { icon: 'edit', label: '编辑这笔', onTap: function () { V.editTxn(t, after); } },
      { icon: 'grid', label: '修改分类', onTap: function () { V.pickCategory(t.direction, t.category, t.sub, function (c, s2) { V.applyCategory(t, c, s2); after && after(); }); } },
      { icon: 'swap', label: '标记为内部转账', onTap: function () { S.updateTxn(t.id, { direction: 'transfer', category: 'transfer', excluded: true }); UI.toast('已标记为转账并从收支中排除'); after && after(); } },
      { icon: 'link', label: '添加标签', onTap: function () { V.addTag(t, after); } },
      { icon: 'trash', label: '删除', danger: true, onTap: function () { UI.confirm('删除后不可恢复，确定删除这笔交易？', { danger: true, okText: '删除' }).then(function (ok) { if (ok) { S.removeTxn(t.id); UI.toast('已删除'); after && after(); } }); } }
    ]);
  };

  V.applyCategory = function (t, category, sub) {
    S.updateTxn(t.id, { category: category, sub: sub || '', auto: { source: 'user', confidence: 1, at: Date.now() } });
    S.correction(FA.cat.merchantKey(t), category, sub);
    UI.toast('已记住：' + S.catName(category) + (sub ? '/' + sub : ''));
  };

  V.addTag = function (t, after) {
    UI.form({ title: '标签', fields: [{ key: 'tag', label: '标签（多个用空格分隔）', value: (t.tags || []).join(' ') }] }).then(function (v) {
      if (!v) return;
      S.updateTxn(t.id, { tags: U.uniq(String(v.tag).split(/\s+/).filter(Boolean)) });
      after && after();
    });
  };

  V.pickCategory = function (dir, curCat, curSub, cb) {
    var tab = dir === 'income' ? 'income' : dir === 'transfer' ? 'transfer' : 'expense';
    var body = h('div.cat-picker');
    var tabsRow = h('div.seg');
    var listWrap = h('div.cat-grid');
    function draw() {
      UI.clear(listWrap);
      S.catList(tab).forEach(function (c) {
        var btn = h('button.cat-cell' + (c.id === curCat ? '.on' : ''), {
          onclick: function () {
            if (c.subs && c.subs.length > 1) { subWrap.style.display = ''; drawSubs(c); }
            else { close(); cb(c.id, c.subs ? c.subs[0] : ''); }
          }
        }, h('span.cat-cell-ic', {}, UI.catIllust(c.id, 40)), h('span', {}, c.name));
        listWrap.appendChild(btn);
      });
    }
    var subWrap = h('div.sub-wrap', { style: { display: 'none' } });
    function drawSubs(c) {
      UI.clear(subWrap);
      subWrap.appendChild(h('div.section-title', {}, c.name + ' · 子分类'));
      var row = h('div.chips-input');
      (c.subs || []).forEach(function (s2) {
        row.appendChild(h('button.chip' + (s2 === curSub ? '.on' : ''), { onclick: function () { close(); cb(c.id, s2); } }, s2));
      });
      subWrap.appendChild(row);
    }
    [['expense', '支出'], ['income', '收入'], ['transfer', '转账/资金']].forEach(function (p) {
      tabsRow.appendChild(h('button' + (p[0] === tab ? '.on' : ''), { onclick: function (e) { tab = p[0]; UI.$$('button', tabsRow).forEach(function (b) { b.classList.remove('on'); }); e.target.classList.add('on'); subWrap.style.display = 'none'; draw(); } }, p[1]));
    });
    body.appendChild(tabsRow); body.appendChild(listWrap); body.appendChild(subWrap);
    draw();
    var s = UI.sheet({ title: '选择分类', subtitle: '选择后会自动记住该商户', body: body, size: 'full' });
    var close = s.close;
  };

  V.editTxn = function (t, after) {
    var accs = S.db.accounts.map(function (a) { return { v: a.id, label: a.icon + ' ' + a.name }; });
    UI.form({
      title: '编辑交易',
      fields: [
        { key: 'amount', label: '金额', type: 'number', value: t.amount, required: true },
        { key: 'direction', label: '方向', type: 'select', value: t.direction, options: [{ v: 'expense', label: '支出' }, { v: 'income', label: '收入' }, { v: 'transfer', label: '转账' }] },
        { key: 'merchant', label: '商户 / 对方', value: t.merchant },
        { key: 'item', label: '商品说明', value: t.item },
        { key: 'time', label: '时间', type: 'date', value: U.ymd(t.time) },
        { key: 'accountId', label: '账户', type: 'select', value: t.accountId, options: accs },
        { key: 'category', label: '分类', type: 'select', value: t.category, options: S.catList(t.direction === 'income' ? 'income' : 'expense').map(function (c) { return { v: c.id, label: c.icon + ' ' + c.name }; }) },
        { key: 'note', label: '备注', value: t.note },
        { key: 'excluded', label: '不计入收支统计', type: 'switch', value: !!t.excluded }
      ]
    }).then(function (v) {
      if (!v) return;
      var ts = U.parseDate(v.time);
      S.updateTxn(t.id, {
        amount: U.round2(Math.abs(v.amount)), direction: v.direction, merchant: v.merchant, item: v.item,
        time: isNaN(ts) ? t.time : ts, accountId: v.accountId, category: v.category, note: v.note, excluded: v.excluded
      });
      UI.toast('已保存'); after && after();
    });
  };

  /* 交易详情 */
  V.txnSheet = function (id, after) {
    var t = S.txn(id);
    if (!t) return;
    var cat = S.cat(t.category), acc = S.account(t.accountId);
    function line(k, v, cls) { return h('div.detail-line', {}, h('span.detail-k', {}, k), h('span.detail-v' + (cls ? '.' + cls : ''), {}, v)); }
    var body = h('div.txn-detail', {},
      h('div.detail-hero', { style: { background: 'linear-gradient(135deg,' + cat.color + '33,' + cat.color + '11)' } },
        h('div.detail-cat', {}, UI.catIllust(t.category, 58)),
        h('div.detail-amount.' + UI.dirClass(t), {}, UI.dirSign(t) + UI.money(t.amount)),
        h('div.detail-merchant', {}, t.merchant || '未知商户'),
        h('div.detail-tags', {}, UI.catChip(t.category), t.sub ? h('span.chip.mini', {}, t.sub) : null,
          (t.tags || []).map(function (x) { return h('span.chip.mini', {}, x); }), t.excluded ? h('span.chip.mini.warn', {}, '已排除') : null)),
      h('div.detail-lines', {},
        line('时间', U.fmtDate(t.time, 'full')),
        line('账户', acc.icon + ' ' + acc.name),
        line('商品说明', t.item || '—'),
        line('支付方式', t.payMethod || '—'),
        line('订单状态', t.status === 'success' ? '交易成功' : t.status === 'refunded' ? '已退款' : t.status),
        line('交易单号', t.orderNo || '—'),
        line('来源', (FA.parser.SOURCE_META[t.source] || {}).name || t.source || '手动'),
        line('自动分类', t.auto ? (t.auto.source + ' · ' + Math.round((t.auto.confidence || 0) * 100) + '%') : '—'),
        line('备注', t.note || '—')),
      h('div.quick-btns', {},
        h('button.qbtn', { onclick: function () { close(); setTimeout(function () { V.editTxn(t, after); }, 200); } }, UI.icon('edit', 18), h('span', {}, '编辑')),
        h('button.qbtn', { onclick: function () { close(); setTimeout(function () { V.pickCategory(t.direction, t.category, t.sub, function (c, s2) { V.applyCategory(t, c, s2); after && after(); }); }, 200); } }, UI.icon('grid', 18), h('span', {}, '改分类')),
        h('button.qbtn', { onclick: function () { close(); setTimeout(function () { V.addTag(t, after); }, 200); } }, UI.icon('tag', 18), h('span', {}, '标签')),
        h('button.qbtn', { onclick: function () { close(); setTimeout(function () { V.splitTxn(t, after); }, 200); } }, UI.icon('split', 18), h('span', {}, '拆分')),
        h('button.qbtn', { onclick: function () { S.updateTxn(t.id, { excluded: !t.excluded }); close(); UI.toast(t.excluded ? '已恢复统计' : '已排除统计'); after && after(); } }, UI.icon('eyeoff', 18), h('span', {}, t.excluded ? '恢复' : '排除')),
        h('button.qbtn.danger', { onclick: function () { UI.confirm('确定删除这笔交易？', { danger: true, okText: '删除' }).then(function (ok) { if (ok) { S.removeTxn(t.id); close(); UI.toast('已删除'); after && after(); } }); } }, UI.icon('trash', 18), h('span', {}, '删除'))));
    var s = UI.sheet({ title: '交易详情', body: body });
    var close = s.close;
  };

  V.splitTxn = function (t, after) {
    UI.form({
      title: '拆分交易',
      subtitle: '把 ' + UI.money(t.amount) + ' 拆成若干笔，便于分开归类',
      fields: [
        { key: 'a', label: '第一笔金额', type: 'number', value: U.round2(t.amount / 2), required: true },
        { key: 'ca', label: '第一笔分类', type: 'select', value: t.category, options: S.catList('expense').map(function (c) { return { v: c.id, label: c.icon + ' ' + c.name }; }) },
        { key: 'ia', label: '第一笔说明', value: t.item },
        { key: 'cb', label: '第二笔分类', type: 'select', value: 'other', options: S.catList('expense').map(function (c) { return { v: c.id, label: c.icon + ' ' + c.name }; }) },
        { key: 'ib', label: '第二笔说明', value: '' }
      ]
    }).then(function (v) {
      if (!v) return;
      var a = U.round2(v.a), b = U.round2(t.amount - a);
      if (a <= 0 || b <= 0) { UI.toast('拆分金额不合法', 'error'); return; }
      S.updateTxn(t.id, { amount: a, category: v.ca, item: v.ia, note: (t.note || '') + ' [拆分1/2]' });
      S.addTxn(Object.assign({}, t, { id: U.uid('tx'), amount: b, category: v.cb, item: v.ib, note: (t.note || '') + ' [拆分2/2]', orderNo: (t.orderNo || '') + '-S2', auto: { source: 'user', confidence: 1 } }));
      UI.toast('已拆分'); after && after();
    });
  };

  /* ================= 首页 ================= */
  var HOME_YM = null;
  FA.ui.register('home', {
    tab: 'home', header: 'home',
    title: function () { return U.monthLabel(HOME_YM || U.ym(Date.now())); },
    greet: function () {
      var hr = new Date().getHours();
      var g = hr < 6 ? '夜深了' : hr < 11 ? '早上好' : hr < 14 ? '中午好' : hr < 18 ? '下午好' : '晚上好';
      return g + (S.db.settings.nickname ? '，' + S.db.settings.nickname : '');
    },
    actions: function () {
      return [
        { icon: UI.hidden() ? 'eyeoff' : 'eye', label: '隐藏金额', onTap: function () { S.db.settings.hideAmount = !S.db.settings.hideAmount; S.save(true); UI.render(); } },
        { icon: 'bell', label: '提醒', onTap: function () { V.notificationsSheet(); } }
      ];
    },
    render: function () {
      var ym = HOME_YM || U.ym(Date.now());
      var cur = S.summary({ ym: ym });
      var nw = S.netWorth();
      var rp = FA.report.build(ym);
      var budgetTotal = 0, budgetSpent = 0;
      rp.budgets.forEach(function (b) { budgetTotal += b.amount; budgetSpent += b.spent; });
      var wrap = h('div.page.home');

      /* 净资产卡（支持自定义封面图） */
      var coverUrl = S.db.settings.coverId ? S.getMedia(S.db.settings.coverId) : null;
      wrap.appendChild(h('div.hero-card' + (coverUrl ? '.has-cover' : ''), {
        style: coverUrl ? { backgroundImage: 'url(' + coverUrl + ')' } : {}
      },
        coverUrl ? h('div.hero-veil') : null,
        h('div.hero-bg'),
        h('div.hero-art', {}, UI.illust('networth', 104)),
        h('div.hero-top', {},
          h('div', {}, h('div.hero-label', {}, '净资产'), h('div.hero-net', {}, UI.money(nw.net))),
          h('div.hero-badge', { class: nw.net >= 0 ? 'up' : 'down' }, nw.net >= 0 ? '健康' : '负债')),
        h('div.hero-split', {},
          h('div', {}, h('span.hero-k', {}, '💎 资产'), h('span.hero-v', {}, UI.money(nw.assets))),
          h('div', {}, h('span.hero-k', {}, '💳 负债'), h('span.hero-v', {}, UI.money(nw.debts)))),
        h('div.hero-months', {}, FA.report.availableMonths().slice(0, 6).map(function (m) {
          return h('button.chip.mini' + (m === ym ? '.on' : ''), { onclick: function () { HOME_YM = m; UI.render(); } }, (+m.split('-')[1]) + '月');
        }))));

      /* 本月收支 */
      var ringCanvas = h('canvas');
      wrap.appendChild(h('div.card.month-card', {},
        h('div.mcard-left', {},
          h('div.mc-item', {}, h('span.mc-k', {}, '支出'), h('span.mc-v.expense', {}, UI.money(cur.expense))),
          h('div.mc-item', {}, h('span.mc-k', {}, '收入'), h('span.mc-v.income', {}, UI.money(cur.income))),
          h('div.mc-item', {}, h('span.mc-k', {}, '结余'), h('span.mc-v.' + (cur.net >= 0 ? 'income' : 'expense'), {}, UI.money(cur.net)))),
        h('div.mcard-right', {}, ringCanvas, h('div.ring-cap', {}, budgetTotal ? '预算使用' : '本月储蓄率')),
        h('div.mcard-foot', {},
          h('span', {}, '共 ' + cur.count + ' 笔 · 日均 ' + UI.money(rp.avgDaily)),
          h('span.link', { onclick: function () { UI.go('report', { m: ym }); } }, '月报 →'))));
      UI.deferChart(function () {
        FA.chart.ring(ringCanvas, {
          w: 96, h: 96, lw: 8,
          value: budgetTotal ? budgetSpent / budgetTotal : Math.max(0, cur.savingsRate),
          label: budgetTotal ? Math.round((budgetSpent / budgetTotal) * 100) + '%' : Math.round(Math.max(0, cur.savingsRate) * 100) + '%'
        });
      });

      /* 快捷宫格 */
      var quick = [
        { i: 'budget', n: '预算', go: ['plan', { tab: 'budget' }] },
        { i: 'goal', n: '目标', go: ['plan', { tab: 'goal' }] },
        { i: 'debt', n: '债务', go: ['plan', { tab: 'debt' }] },
        { i: 'sub', n: '订阅', go: ['plan', { tab: 'sub' }] },
        { i: 'account', n: '账户', go: ['accounts'] },
        { i: 'report', n: '报告', go: ['report', {}] },
        { i: 'import', n: '导入', go: ['import'] },
        { i: 'rule', n: '设置', go: ['me'] }
      ];
      wrap.appendChild(h('div.quick-grid', {}, quick.map(function (q) {
        return h('button.quick-cell', { onclick: function () { UI.go(q.go[0], q.go[1]); } },
          h('span.quick-ic', {}, UI.illust(q.i, 42)), h('span.quick-name', {}, q.n));
      })));

      /* 提醒 */
      var notes = V.buildNotifications();
      if (notes.length) {
        wrap.appendChild(h('div.alert-strip', { onclick: function () { V.notificationsSheet(); } },
          h('span.alert-ic', {}, notes[0].icon),
          h('div', {}, h('div.alert-title', {}, notes[0].title), h('div.alert-desc', {}, notes[0].desc)),
          notes.length > 1 ? h('span.alert-count', {}, '+' + (notes.length - 1)) : null));
      }

      /* 洞察 */
      if (rp.insights.length) {
        wrap.appendChild(UI.sectionTitle('本月洞察', h('span.link', { onclick: function () { UI.go('report', { m: ym }); } }, '全部'), 'insight'));
        wrap.appendChild(h('div.insight-scroll', {}, rp.insights.slice(0, 4).map(function (x) {
          return h('div.insight-chip.' + x.tone, {}, h('span.ins-ic', {}, x.icon), h('span', {}, x.text));
        })));
      }

      /* 预算快览 */
      if (rp.budgets.length) {
        wrap.appendChild(UI.sectionTitle('预算快览', h('span.link', { onclick: function () { UI.go('plan', { tab: 'budget' }); } }, '管理'), 'budget'));
        wrap.appendChild(h('div.card.budget-mini', {}, rp.budgets.slice(0, 3).map(function (b) {
          return h('div.bm-row', {},
            h('div.bm-top', {}, h('span', {}, b.icon + ' ' + b.name), h('span', { class: b.pct > 1 ? 'neg' : 'dim' }, UI.money(b.spent) + ' / ' + UI.money(b.amount))),
            UI.progressBar(b.pct, b.pct > 1 ? '#EF4444' : b.pct > 0.8 ? '#F59E0B' : b.color));
        })));
      }

      /* 最近交易 */
      var recent = U.sortBy(S.db.txns.filter(function (t) { return !t.excluded; }), function (t) { return t.time; }, true).slice(0, 6);
      wrap.appendChild(UI.sectionTitle('最近流水', h('span.link', { onclick: function () { UI.go('txns'); } }, '全部'), 'transfer'));
      wrap.appendChild(h('div.card.list-card', {}, recent.length ? recent.map(function (t) { return V.txnRow(t); }) : UI.empty('welcome', '还没有交易', '从「导入」开始，或手动记一笔')));
      return wrap;
    },
    mount: function () { }
  });

  /* ================= 提醒 ================= */
  V.buildNotifications = function () {
    var out = [], now = Date.now(), ym = U.ym(now);
    S.db.subs.forEach(function (s2) {
      if (s2.status === 'cancelled') return;
      if (s2.nextDate && s2.nextDate - now < 5 * 86400000 && s2.nextDate - now > -2 * 86400000) {
        out.push({ icon: '🔁', title: s2.name + ' 即将扣款', desc: UI.money(s2.amount) + ' · ' + U.fmtDate(s2.nextDate, 'md') + ' 前后自动续费' });
      }
    });
    S.db.debts.forEach(function (d) {
      if (d.status === 'closed' || !d.dueDay) return;
      var d2 = new Date(); d2.setDate(d.dueDay);
      var diff = U.dayStart(d2.getTime()) - U.dayStart(now);
      if (diff >= 0 && diff < 5 * 86400000) out.push({ icon: '💳', title: d.name + ' 账单日临近', desc: '每月 ' + d.dueDay + ' 日 · 最低还款 ' + UI.money(d.minPayment || 0) });
    });
    FA.report.build(ym).budgets.forEach(function (b) {
      if (b.pct > 1) out.push({ icon: '💥', title: b.name + ' 已超预算', desc: '超支 ' + UI.money(b.spent - b.amount) });
      else if (b.pace > 1.15) out.push({ icon: '⚠️', title: b.name + ' 花得比计划快', desc: '已用 ' + Math.round(b.pct * 100) + '%，建议日均 ' + UI.money(b.dailyAllowance) });
    });
    var lastImport = S.db.imports.length ? S.db.imports[S.db.imports.length - 1] : null;
    if (!lastImport || now - lastImport.at > 7 * 86400000) {
      out.push({ icon: '📥', title: '该导入新账单了', desc: lastImport ? '上次导入 ' + U.relTime(lastImport.at) : '还没有导入过任何账单' });
    }
    var curM = FA.report.build(ym);
    if (curM.count > 0) out.push({ icon: '📊', title: U.monthLabel(ym) + ' 月报已可查看', desc: '支出 ' + UI.money(curM.expense) + ' · 储蓄率 ' + Math.round(curM.savingsRate * 100) + '%' });
    return out;
  };
  V.notificationsSheet = function () {
    var notes = V.buildNotifications();
    UI.sheet({
      title: '提醒中心', subtitle: notes.length ? notes.length + ' 条待处理' : '暂无提醒',
      body: notes.length ? h('div.notif-list', {}, notes.map(function (n) {
        return h('div.notif-item', {}, h('span.notif-ic', {}, n.icon), h('div', {}, h('div.notif-title', {}, n.title), h('div.notif-desc', {}, n.desc)));
      })) : UI.empty('remind', '一切正常', '没有需要处理的提醒')
    });
  };

  /* ================= 流水 ================= */
  var TX = { q: '', dir: 'all', cat: '', acc: '', from: '', to: '', selMode: false, sel: {} };
  FA.ui.register('txns', {
    tab: 'txns', title: '全部流水',
    actions: function () {
      return [
        { icon: 'filter', label: '筛选', onTap: function () { V.filterSheet(); } },
        { icon: 'plus', label: '记一笔', onTap: function () { V.manualSheet(); } }
      ];
    },
    render: function () {
      var page = h('div.page.txns');
      var search = h('input.search-input', { placeholder: '搜索商户 / 商品 / 备注 / 单号', value: TX.q });
      var listWrap = h('div.txn-list-wrap');
      var sumBar = h('div.tx-sum-bar');
      var selBar = h('div.sel-bar');
      var deb = U.debounce(function () { TX.q = search.value; redraw(); }, 220);
      search.addEventListener('input', deb);
      page.appendChild(h('div.search-row', {}, h('span.search-ic', {}, UI.icon('search', 18)), search,
        TX.q ? h('button.icon-btn', { onclick: function () { TX.q = ''; search.value = ''; redraw(); } }, UI.icon('close', 16)) : null));
      var chips = h('div.chip-row');
      [['all', '全部'], ['expense', '支出'], ['income', '收入'], ['transfer', '转账']].forEach(function (p) {
        chips.appendChild(h('button.chip' + (TX.dir === p[0] ? '.on' : ''), { onclick: function () { TX.dir = p[0]; redraw(); UI.$$('.chip-row .chip', page).forEach(function (c, i) { c.classList.toggle('on', ['all', 'expense', 'income', 'transfer'][i] === TX.dir); }); } }, p[1]));
      });
      chips.appendChild(h('button.chip.ghost', { onclick: function () { V.filterSheet(); } }, UI.icon('filter', 14) + ' 高级'));
      if (TX.cat) chips.appendChild(h('button.chip.on', { onclick: function () { TX.cat = ''; redraw(); } }, S.catName(TX.cat) + ' ✕'));
      if (TX.acc) chips.appendChild(h('button.chip.on', { onclick: function () { TX.acc = ''; redraw(); } }, S.account(TX.acc).name + ' ✕'));
      page.appendChild(chips);
      page.appendChild(sumBar);
      page.appendChild(listWrap);
      page.appendChild(selBar);
      function redraw() {
        var list = S.filterTxns({ q: TX.q, direction: TX.dir === 'all' ? '' : TX.dir, category: TX.cat, accountId: TX.acc, from: TX.from ? U.parseDate(TX.from) : 0, to: TX.to ? U.parseDate(TX.to) + 86400000 : 0, includeExcluded: true });
        if (TX.dir !== 'transfer') list = list.filter(function (t) { return true; });
        list.sort(function (a, b) { return b.time - a.time; });
        var inc = 0, exp = 0;
        list.forEach(function (t) { if (t.direction === 'income') inc += t.amount; else if (t.direction === 'expense') exp += t.amount; });
        UI.clear(sumBar);
        sumBar.appendChild(h('span', {}, '筛选结果 ' + list.length + ' 笔'));
        sumBar.appendChild(h('span', {}, h('span.income', {}, '收 ' + UI.money(inc)), '  ', h('span.expense', {}, '支 ' + UI.money(exp))));
        UI.clear(listWrap);
        if (!list.length) { listWrap.appendChild(UI.empty('empty', '没有匹配的交易', '换个关键词或清除筛选条件')); return; }
        var groups = U.groupBy(list, function (t) { return U.ymd(t.time); });
        Object.keys(groups).sort().reverse().forEach(function (day) {
          var g = groups[day];
          var dayExp = U.sum(g.filter(function (t) { return t.direction === 'expense'; }), function (t) { return t.amount; });
          var dayInc = U.sum(g.filter(function (t) { return t.direction === 'income'; }), function (t) { return t.amount; });
          listWrap.appendChild(h('div.day-head', {},
            h('span', {}, U.relDay(g[0].time)),
            h('span.day-sum', {}, (dayInc ? '收 ' + UI.money(dayInc) + ' ' : '') + (dayExp ? '支 ' + UI.money(dayExp) : ''))));
          var card = h('div.card.list-card');
          g.forEach(function (t) {
            card.appendChild(V.txnRow(t, {
              selMode: TX.selMode, selected: !!TX.sel[t.id],
              onTap: function (tx) {
                if (TX.selMode) { TX.sel[tx.id] = !TX.sel[tx.id]; redraw(); updateSelBar(); }
                else V.txnSheet(tx.id, redraw);
              },
              onLong: function (tx) { TX.selMode = true; TX.sel[tx.id] = true; redraw(); updateSelBar(); }
            }));
          });
          listWrap.appendChild(card);
        });
        updateSelBar();
      }
      function updateSelBar() {
        UI.clear(selBar);
        if (!TX.selMode) return;
        var ids = Object.keys(TX.sel).filter(function (k) { return TX.sel[k]; });
        selBar.appendChild(h('span', {}, '已选 ' + ids.length + ' 笔'));
        selBar.appendChild(h('div.sel-acts', {},
          h('button.btn.small', { onclick: function () { batchCategory(ids); } }, '改分类'),
          h('button.btn.small', { onclick: function () { batchAccount(ids); } }, '改账户'),
          h('button.btn.small', { onclick: function () { batchTag(ids); } }, '加标签'),
          h('button.btn.small.danger', { onclick: function () { UI.confirm('删除选中的 ' + ids.length + ' 笔交易？', { danger: true, okText: '删除' }).then(function (ok) { if (ok) { ids.forEach(function (id) { S.removeTxn(id); }); TX.sel = {}; TX.selMode = false; UI.toast('已删除 ' + ids.length + ' 笔'); redraw(); } }); } }, '删除'),
          h('button.btn.small.ghost', { onclick: function () { TX.sel = {}; TX.selMode = false; redraw(); } }, '退出')));
      }
      function batchCategory(ids) {
        V.pickCategory('expense', '', '', function (c, s2) {
          ids.forEach(function (id) { var t = S.txn(id); S.updateTxn(id, { category: c, sub: s2, auto: { source: 'user', confidence: 1 } }); if (t) S.correction(FA.cat.merchantKey(t), c, s2); });
          TX.sel = {}; TX.selMode = false; UI.toast('已批量修改分类'); redraw();
        });
      }
      function batchAccount(ids) {
        UI.form({ title: '移动到账户', fields: [{ key: 'acc', label: '目标账户', type: 'select', options: S.db.accounts.map(function (a) { return { v: a.id, label: a.icon + ' ' + a.name }; }) }] }).then(function (v) {
          if (!v) return;
          ids.forEach(function (id) { S.updateTxn(id, { accountId: v.acc }); });
          TX.sel = {}; TX.selMode = false; UI.toast('已移动'); redraw();
        });
      }
      function batchTag(ids) {
        UI.form({ title: '批量标签', fields: [{ key: 'tag', label: '标签（空格分隔）' }] }).then(function (v) {
          if (!v) return;
          var tags = String(v.tag).split(/\s+/).filter(Boolean);
          ids.forEach(function (id) { var t = S.txn(id); S.updateTxn(id, { tags: U.uniq((t.tags || []).concat(tags)) }); });
          TX.sel = {}; TX.selMode = false; UI.toast('已添加标签'); redraw();
        });
      }
      redraw();
      return page;
    }
  });

  V.filterSheet = function () {
    UI.form({
      title: '高级筛选',
      fields: [
        { key: 'cat', label: '分类', type: 'select', value: TX.cat, options: [{ v: '', label: '不限' }].concat(S.CATS.expense.concat(S.CATS.income).map(function (c) { return { v: c.id, label: c.icon + ' ' + c.name }; })) },
        { key: 'acc', label: '账户', type: 'select', value: TX.acc, options: [{ v: '', label: '不限' }].concat(S.db.accounts.map(function (a) { return { v: a.id, label: a.icon + ' ' + a.name }; })) },
        { key: 'from', label: '起始日期', type: 'date', value: TX.from },
        { key: 'to', label: '结束日期', type: 'date', value: TX.to },
        { key: 'amountMin', label: '金额下限', type: 'number', value: '' },
        { key: 'tags', label: '标签包含', value: '' }
      ],
      submitText: '应用筛选'
    }).then(function (v) {
      if (!v) return;
      TX.cat = v.cat || ''; TX.acc = v.acc || ''; TX.from = v.from || ''; TX.to = v.to || '';
      UI.toast('已应用筛选'); UI.render();
    });
  };

  V.manualSheet = function (after) {
    var now = new Date();
    UI.form({
      title: '手动记一笔',
      subtitle: '截图 OCR 失败时的快速补录通道',
      fields: [
        { key: 'amount', label: '金额', type: 'number', required: true, placeholder: '0.00' },
        { key: 'direction', label: '方向', type: 'select', value: 'expense', options: [{ v: 'expense', label: '支出' }, { v: 'income', label: '收入' }, { v: 'transfer', label: '转账' }] },
        { key: 'merchant', label: '商户 / 对方', placeholder: '例如：楼下便利店' },
        { key: 'item', label: '商品说明' },
        { key: 'category', label: '分类', type: 'select', options: S.catList('expense').map(function (c) { return { v: c.id, label: c.icon + ' ' + c.name }; }) },
        { key: 'accountId', label: '账户', type: 'select', options: S.db.accounts.map(function (a) { return { v: a.id, label: a.icon + ' ' + a.name }; }) },
        { key: 'time', label: '日期', type: 'date', value: U.ymd(now) },
        { key: 'note', label: '备注' }
      ],
      submitText: '保存'
    }).then(function (v) {
      if (!v) return;
      var t = FA.parser.manualTxn(Object.assign(v, { time: U.parseDate(v.time) }));
      S.addTxn(t);
      var cl = FA.cat.classify(t, { corrections: S.db.corrections, model: FA.cat.buildModel(S.db) });
      if (!v.category || v.category === 'other') S.updateTxn(t.id, { category: cl.category, sub: cl.sub, auto: { source: cl.source, confidence: cl.confidence } });
      UI.toast('已记一笔 ' + UI.money(t.amount));
      after && after();
    });
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
