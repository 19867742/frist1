/* FlowAtlas · 规划模块：预算 / 储蓄目标 / 债务 / 订阅 + 账户管理 */
(function (root) {
  'use strict';
  var FA = root.FA, U = FA.util, UI = FA.ui, S = FA.store, h = UI.h;
  var V = FA.views;

  function catOptions() {
    return S.CATS.expense.concat(S.CATS.income).map(function (c) { return { v: c.id, label: c.icon + ' ' + c.name }; });
  }
  function banner(illust, title, desc) {
    return h('div.mod-banner', {}, UI.illust(illust, 54),
      h('div', {}, h('div.mod-banner-t', {}, title), h('div.mod-banner-d', {}, desc)));
  }
  function accIllust(a) {
    return UI.illust({ wechat: 'wechat', alipay: 'alipay', bank: 'bank', cash: 'cash' }[a.type] || 'account', 42);
  }
  var ICON_CHOICES = ['🎯', '🏆', '✈️', '🏠', '🚗', '💻', '📱', '🎓', '💍', '🐶', '🎁', '🏥', '🧳', '🎮', '📷', '⌚️', '💰', '🛟'];
  var COLOR_CHOICES = ['#FF6B6B', '#4D96FF', '#22C55E', '#F59E0B', '#8E7CFF', '#2ED3B7', '#F473B9', '#EF4444'];

  /* ================= 规划页 ================= */
  FA.ui.register('plan', {
    tab: 'plan', title: '财务规划',
    actions: function () { return [{ icon: 'chart', label: '月度报告', onTap: function () { UI.go('report'); } }]; },
    render: function (p) {
      var tab = p.tab || 'budget';
      var wrap = h('div.page.plan');
      var tabs = [['budget', '预算', '🎯'], ['goal', '目标', '🏆'], ['debt', '债务', '💳'], ['sub', '订阅', '🔁']];
      wrap.appendChild(h('div.seg.big', {}, tabs.map(function (t) {
        return h('button' + (tab === t[0] ? '.on' : ''), { onclick: function () { UI.go('plan', { tab: t[0] }, true); } }, t[2] + ' ' + t[1]);
      })));
      var body = h('div.plan-body');
      wrap.appendChild(body);
      ({ budget: budgetTab, goal: goalTab, debt: debtTab, sub: subTab })[tab](body);
      return wrap;
    }
  });

  /* ---------------- 预算 ---------------- */
  function budgetTab(body) {
    body.appendChild(banner('budget', '预算控制', '分类预算 + 总预算，超支前就会提醒你'));
    var ym = U.ym(Date.now());
    var list = S.db.budgets;
    var total = U.sum(list, function (b) { return b.amount; });
    var spent = 0, spentByBudget = {};
    list.forEach(function (b) {
      var cats = b.categories && b.categories.length ? b.categories : null;
      var scope = S.filterTxns({ ym: ym, direction: 'expense' });
      if (cats) scope = scope.filter(function (t) { return cats.indexOf(t.category) >= 0; });
      else scope = scope.filter(function (t) { return !list.some(function (x) { return x.id !== b.id && x.categories && x.categories.indexOf(t.category) >= 0; }); });
      var s2 = U.sum(scope, function (t) { return t.amount; });
      spentByBudget[b.id] = s2;
      if (!list.some(function (x) { return x.id !== b.id && x.categories && x.categories.indexOf('__all__') >= 0; })) spent += 0;
    });
    /* 总预算口径：所有预算覆盖的支出（不重复计算） */
    var allExp = S.summary({ ym: ym }).expense;
    var coveredCats = {};
    list.forEach(function (b) { (b.categories || []).forEach(function (c) { coveredCats[c] = 1; }); });
    var hasUnscoped = list.some(function (b) { return !b.categories || !b.categories.length; });
    var coveredSpent = U.sum(S.filterTxns({ ym: ym, direction: 'expense' }).filter(function (t) {
      return hasUnscoped || coveredCats[t.category];
    }), function (t) { return t.amount; });
    var days = new Date(U.monthRange(ym).end - 1).getDate();
    var today = new Date().getDate();

    body.appendChild(h('div.card.budget-hero', {},
      h('div.bh-row', {},
        h('div', {}, h('div.bh-label', {}, U.monthLabel(ym) + ' 总预算'), h('div.bh-total', {}, UI.money(total))),
        h('div.bh-right', {}, h('div.bh-label', {}, '已使用'), h('div.bh-spent.' + (coveredSpent > total ? 'neg' : ''), {}, UI.money(coveredSpent)))),
      UI.progressBar(total ? coveredSpent / total : 0, coveredSpent > total ? '#EF4444' : '#4D96FF'),
      h('div.bh-foot', {},
        h('span', {}, '剩余 ' + UI.money(Math.max(0, total - coveredSpent))),
        h('span', {}, '日均可用 ' + UI.money(Math.max(0, (total - coveredSpent) / Math.max(1, days - today + 1)))),
        h('span', {}, '本月支出 ' + UI.money(allExp)))));

    if (!list.length) {
      body.appendChild(UI.empty('budget', '还没有预算', '设置分类预算，超支会主动提醒你', { label: '新建预算', onTap: function () { budgetForm(); } }));
    } else {
      list.forEach(function (b) {
        var s2 = spentByBudget[b.id] || 0;
        var pct = b.amount > 0 ? s2 / b.amount : 0;
        var col = pct > 1 ? '#EF4444' : pct > 0.8 ? '#F59E0B' : (b.color || '#4D96FF');
        var left = Math.max(0, b.amount - s2);
        var daily = left / Math.max(1, days - today + 1);
        body.appendChild(h('div.card.budget-card', {
          onclick: function () {
            UI.actions(b.name, [
              { icon: 'edit', label: '编辑预算', onTap: function () { budgetForm(b); } },
              { icon: 'chart', label: '查看该分类流水', onTap: function () { UI.go('txns'); } },
              { icon: 'trash', label: '删除预算', danger: true, onTap: function () { UI.confirm('删除预算「' + b.name + '」？', { danger: true }).then(function (ok) { if (ok) { S.remove('budgets', b.id); UI.render(); } }); } }
            ]);
          }
        },
          h('div.bc-head', {},
            UI.avatar(b.icon || '🎯', col, 40),
            h('div.bc-title', {}, h('div', {}, b.name), h('div.bc-sub', {}, (b.categories || []).length ? b.categories.map(function (c) { return S.catName(c); }).join(' · ') : '全部支出')),
            h('div.bc-num', {}, h('div', { class: pct > 1 ? 'neg' : '' }, UI.money(s2)), h('div.dim', {}, '/ ' + UI.money(b.amount)))),
          UI.progressBar(pct, col),
          h('div.bc-foot', {},
            h('span', { class: pct > 1 ? 'neg' : 'dim' }, pct > 1 ? '超支 ' + UI.money(s2 - b.amount) : '剩余 ' + UI.money(left) + ' · ' + Math.round(pct * 100) + '%'),
            h('span.dim', {}, '日均可用 ' + UI.money(daily)))));
      });
    }
    body.appendChild(h('button.btn.block', { onclick: function () { budgetForm(); } }, UI.icon('plus', 18) + ' 新建预算'));

    function budgetForm(b) {
      b = b || {};
      UI.form({
        title: b.id ? '编辑预算' : '新建预算',
        fields: [
          { key: 'name', label: '名称', value: b.name || '', required: true, placeholder: '例如：餐饮月预算' },
          { key: 'amount', label: '预算金额', type: 'number', value: b.amount || '', required: true },
          { key: 'categories', label: '覆盖分类（不选=全部支出）', type: 'chips', value: b.categories || [], options: catOptions() },
          { key: 'icon', label: '图标', type: 'chips', value: [b.icon || '🎯'], options: ICON_CHOICES.map(function (i) { return { v: i, label: i }; }) },
          { key: 'color', label: '颜色', type: 'chips', value: [b.color || '#4D96FF'], options: COLOR_CHOICES.map(function (c) { return { v: c, label: '●' }; }) }
        ],
        submitText: '保存'
      }).then(function (v) {
        if (!v) return;
        var payload = { name: v.name, amount: U.round2(v.amount), categories: v.categories || [], icon: (v.icon && v.icon[0]) || '🎯', color: (v.color && v.color[0]) || '#4D96FF', period: 'monthly' };
        if (b.id) S.update('budgets', b.id, payload); else S.add('budgets', payload);
        UI.toast('预算已保存'); UI.render();
      });
    }
  }

  /* ---------------- 储蓄目标 ---------------- */
  function goalTab(body) {
    body.appendChild(banner('goal', '储蓄目标', '把大目标拆成每月要存的钱'));
    var goals = S.db.goals;
    var totalTarget = U.sum(goals, function (g) { return g.targetAmount; });
    var totalSaved = U.sum(goals, function (g) { return g.saved || 0; });
    body.appendChild(h('div.card.goal-hero', {},
      h('div', {}, h('div.bh-label', {}, '目标总进度'), h('div.bh-total', {}, UI.money(totalSaved) + ' / ' + UI.money(totalTarget))),
      UI.progressBar(totalTarget ? totalSaved / totalTarget : 0, '#22C55E')));
    if (!goals.length) {
      body.appendChild(UI.empty('goal', '还没有储蓄目标', '例如：旅行基金、应急金、新手机', { label: '新建目标', onTap: function () { goalForm(); } }));
    }
    goals.forEach(function (g) {
      var pct = g.targetAmount > 0 ? (g.saved || 0) / g.targetAmount : 0;
      var daysLeft = g.deadline ? Math.ceil((g.deadline - Date.now()) / 86400000) : null;
      var monthsLeft = daysLeft != null ? Math.max(1, Math.round(daysLeft / 30.4)) : null;
      var perMonth = monthsLeft ? Math.max(0, (g.targetAmount - (g.saved || 0)) / monthsLeft) : null;
      body.appendChild(h('div.card.goal-card', {
        onclick: function () {
          UI.actions(g.name, [
            { icon: 'plus', label: '存入一笔', onTap: function () { goalDeposit(g); } },
            { icon: 'edit', label: '编辑目标', onTap: function () { goalForm(g); } },
            { icon: 'chart', label: '从账户转入并记账', onTap: function () { goalDeposit(g, true); } },
            { icon: 'trash', label: '删除目标', danger: true, onTap: function () { UI.confirm('删除目标「' + g.name + '」？', { danger: true }).then(function (ok) { if (ok) { S.remove('goals', g.id); UI.render(); } }); } }
          ]);
        }
      },
        h('div.gc-top', {},
          UI.avatar(g.icon || '🏆', g.color || '#22C55E', 44),
          h('div.gc-mid', {}, h('div.gc-name', {}, g.name),
            h('div.gc-sub', {}, UI.money(g.saved || 0) + ' / ' + UI.money(g.targetAmount) +
              (daysLeft != null ? ' · ' + (daysLeft > 0 ? '剩 ' + daysLeft + ' 天' : '已到期') : ''))),
          h('div.gc-pct', { style: { color: g.color || '#22C55E' } }, Math.round(pct * 100) + '%')),
        UI.progressBar(pct, g.color || '#22C55E'),
        h('div.gc-foot', {},
          h('span.dim', {}, '还差 ' + UI.money(Math.max(0, g.targetAmount - (g.saved || 0)))),
          perMonth != null ? h('span.dim', {}, '每月存 ' + UI.money(perMonth) + ' 可达成') : null)));
    });
    body.appendChild(h('button.btn.block', { onclick: function () { goalForm(); } }, UI.icon('plus', 18) + ' 新建目标'));

    function goalForm(g) {
      g = g || {};
      UI.form({
        title: g.id ? '编辑目标' : '新建储蓄目标',
        fields: [
          { key: 'name', label: '目标名称', value: g.name || '', required: true, placeholder: '例如：日本旅行基金' },
          { key: 'targetAmount', label: '目标金额', type: 'number', value: g.targetAmount || '', required: true },
          { key: 'saved', label: '已存金额', type: 'number', value: g.saved || 0 },
          { key: 'deadline', label: '目标日期', type: 'date', value: g.deadline ? U.ymd(g.deadline) : '' },
          { key: 'icon', label: '图标', type: 'chips', value: [g.icon || '🏆'], options: ICON_CHOICES.map(function (i) { return { v: i, label: i }; }) },
          { key: 'color', label: '颜色', type: 'chips', value: [g.color || '#22C55E'], options: COLOR_CHOICES.map(function (c) { return { v: c, label: '●' }; }) }
        ]
      }).then(function (v) {
        if (!v) return;
        var payload = {
          name: v.name, targetAmount: U.round2(v.targetAmount), saved: U.round2(v.saved || 0),
          deadline: v.deadline ? U.parseDate(v.deadline) : null,
          icon: (v.icon && v.icon[0]) || '🏆', color: (v.color && v.color[0]) || '#22C55E'
        };
        if (g.id) S.update('goals', g.id, payload); else S.add('goals', Object.assign({ contributions: [] }, payload));
        UI.toast('目标已保存'); UI.render();
      });
    }
    function goalDeposit(g, withTxn) {
      UI.form({
        title: '存入「' + g.name + '」',
        fields: [
          { key: 'amount', label: '存入金额', type: 'number', required: true, value: 100 },
          { key: 'from', label: '从账户扣款并记一笔转账', type: 'select', options: [{ v: '', label: '仅更新目标进度' }].concat(S.db.accounts.map(function (a) { return { v: a.id, label: a.icon + ' ' + a.name }; })), value: withTxn ? (S.db.accounts[0] || {}).id : '' },
          { key: 'note', label: '备注' }
        ]
      }).then(function (v) {
        if (!v) return;
        var saved = U.round2((g.saved || 0) + v.amount);
        S.update('goals', g.id, { saved: saved, contributions: (g.contributions || []).concat([{ at: Date.now(), amount: v.amount, note: v.note }]) });
        if (v.from) {
          S.addTxn(FA.parser.manualTxn({
            amount: v.amount, direction: 'transfer', accountId: v.from, merchant: '储蓄目标：' + g.name,
            item: '目标储蓄', category: 'transfer', note: v.note || '', time: Date.now()
          }));
        }
        UI.toast('已存入 ' + UI.money(v.amount)); UI.render();
      });
    }
  }

  /* ---------------- 债务 ---------------- */
  function debtTab(body) {
    body.appendChild(banner('debt', '债务管理', '年化、月供、还清期数一目了然'));
    var debts = S.db.debts;
    var totalBal = U.sum(debts.filter(function (d) { return d.status !== 'closed'; }), function (d) { return d.balance || 0; });
    var monthly = U.sum(debts.filter(function (d) { return d.status !== 'closed'; }), function (d) { return d.minPayment || 0; });
    var avgApr = 0, wsum = 0;
    debts.forEach(function (d) { if (d.status !== 'closed') { avgApr += (d.apr || 0) * (d.balance || 0); wsum += (d.balance || 0); } });
    avgApr = wsum ? avgApr / wsum : 0;
    body.appendChild(h('div.card.debt-hero', {},
      h('div.bh-row', {},
        h('div', {}, h('div.bh-label', {}, '总负债'), h('div.bh-total.neg', {}, UI.money(totalBal))),
        h('div.bh-right', {}, h('div.bh-label', {}, '月供合计'), h('div.bh-spent', {}, UI.money(monthly)))),
      h('div.bh-foot', {},
        h('span', {}, '加权年化 ' + (avgApr * 100).toFixed(2) + '%'),
        h('span', {}, debts.length + ' 个债务'),
        h('span', {}, '预计 ' + (monthly > 0 ? Math.ceil(totalBal / monthly) : '—') + ' 个月还清'))));
    if (!debts.length) {
      body.appendChild(UI.empty('debt', '还没有登记债务', '信用卡、花呗、房贷、车贷都可以登记', { label: '添加债务', onTap: function () { debtForm(); } }));
    }
    debts.forEach(function (d) {
      var closed = d.status === 'closed';
      var paidPct = d.principal > 0 ? 1 - (d.balance || 0) / d.principal : 0;
      var r = (d.apr || 0) / 12, payoff = '—';
      if (r > 0 && d.minPayment > 0) {
        if (d.minPayment <= r * d.balance) payoff = '月供不足以覆盖利息';
        else payoff = Math.ceil(-Math.log(1 - (r * d.balance) / d.minPayment) / Math.log(1 + r)) + ' 个月';
      } else if (d.minPayment > 0) payoff = Math.ceil(d.balance / d.minPayment) + ' 个月';
      body.appendChild(h('div.card.debt-card' + (closed ? '.closed' : ''), {
        onclick: function () {
          UI.actions(d.name, [
            closed ? null : { icon: 'card', label: '记录还款', onTap: function () { repayForm(d); } },
            { icon: 'edit', label: '编辑', onTap: function () { debtForm(d); } },
            { icon: closed ? 'repeat' : 'check', label: closed ? '重新启用' : '标记已还清', onTap: function () { S.update('debts', d.id, { status: closed ? 'active' : 'closed', balance: closed ? d.balance : 0 }); UI.render(); } },
            { icon: 'trash', label: '删除', danger: true, onTap: function () { UI.confirm('删除债务「' + d.name + '」？', { danger: true }).then(function (ok) { if (ok) { S.remove('debts', d.id); UI.render(); } }); } }
          ]);
        }
      },
        h('div.dc-top', {},
          UI.avatar(d.icon || '💳', d.color || '#EF4444', 42),
          h('div.dc-mid', {}, h('div.dc-name', {}, d.name + (closed ? ' （已还清）' : '')),
            h('div.dc-sub', {}, (d.type || '信用卡') + ' · 年化 ' + ((d.apr || 0) * 100).toFixed(2) + '%' + (d.dueDay ? ' · 每月 ' + d.dueDay + ' 日账单' : ''))),
          h('div.dc-bal', {}, h('div.neg', {}, UI.money(d.balance || 0)), h('div.dim', {}, '本金 ' + UI.money(d.principal || 0)))),
        UI.progressBar(paidPct, '#22C55E'),
        h('div.dc-foot', {},
          h('span.dim', {}, '已还 ' + Math.round(paidPct * 100) + '%'),
          h('span.dim', {}, '最低还款 ' + UI.money(d.minPayment || 0)),
          h('span.dim', {}, closed ? '已结清' : '预计还清：' + payoff))));
    });
    body.appendChild(h('button.btn.block', { onclick: function () { debtForm(); } }, UI.icon('plus', 18) + ' 添加债务'));
    body.appendChild(h('div.tips', {}, '💡 建议优先偿还年化利率最高的债务（雪崩法）；若现金流紧张，先清掉余额最小的债务获得正反馈（雪球法）。'));

    function debtForm(d) {
      d = d || {};
      UI.form({
        title: d.id ? '编辑债务' : '添加债务',
        fields: [
          { key: 'name', label: '名称', value: d.name || '', required: true, placeholder: '例如：招商银行信用卡' },
          { key: 'type', label: '类型', type: 'select', value: d.type || '信用卡', options: ['信用卡', '花呗/白条', '消费贷', '房贷', '车贷', '亲友借款', '其他'].map(function (x) { return { v: x, label: x }; }) },
          { key: 'principal', label: '原始本金', type: 'number', value: d.principal || '' },
          { key: 'balance', label: '当前剩余', type: 'number', value: d.balance == null ? '' : d.balance, required: true },
          { key: 'apr', label: '年化利率（0.18 = 18%）', type: 'number', value: d.apr == null ? 0.18 : d.apr, step: '0.001' },
          { key: 'minPayment', label: '每月还款额', type: 'number', value: d.minPayment || '' },
          { key: 'dueDay', label: '每月账单日', type: 'number', value: d.dueDay || '', step: '1' },
          { key: 'icon', label: '图标', type: 'chips', value: [d.icon || '💳'], options: ICON_CHOICES.map(function (i) { return { v: i, label: i }; }) }
        ]
      }).then(function (v) {
        if (!v) return;
        var payload = { name: v.name, type: v.type, principal: U.round2(v.principal || v.balance), balance: U.round2(v.balance), apr: v.apr || 0, minPayment: U.round2(v.minPayment || 0), dueDay: v.dueDay || null, icon: (v.icon && v.icon[0]) || '💳', status: d.status || 'active' };
        if (d.id) S.update('debts', d.id, payload); else S.add('debts', Object.assign({ payments: [] }, payload));
        UI.toast('已保存'); UI.render();
      });
    }
    function repayForm(d) {
      UI.form({
        title: '还款：' + d.name,
        fields: [
          { key: 'amount', label: '还款金额', type: 'number', required: true, value: d.minPayment || '' },
          { key: 'accountId', label: '从账户扣款', type: 'select', options: [{ v: '', label: '不记账，仅更新负债' }].concat(S.db.accounts.map(function (a) { return { v: a.id, label: a.icon + ' ' + a.name }; })) },
          { key: 'date', label: '日期', type: 'date', value: U.ymd(Date.now()) }
        ]
      }).then(function (v) {
        if (!v) return;
        var bal = U.round2(Math.max(0, (d.balance || 0) - v.amount));
        S.update('debts', d.id, { balance: bal, status: bal <= 0 ? 'closed' : 'active', payments: (d.payments || []).concat([{ at: U.parseDate(v.date), amount: v.amount }]) });
        if (v.accountId) {
          S.addTxn(FA.parser.manualTxn({
            amount: v.amount, direction: 'transfer', accountId: v.accountId, merchant: d.name + ' 还款',
            item: '债务还款', category: 'transfer', time: U.parseDate(v.date), excluded: true
          }));
        }
        UI.toast(bal <= 0 ? '🎉 债务已结清！' : '已还 ' + UI.money(v.amount) + '，剩余 ' + UI.money(bal));
        UI.render();
      });
    }
  }

  /* ---------------- 订阅 ---------------- */
  function subTab(body) {
    body.appendChild(banner('sub', '订阅管家', '自动发现定期扣款，别让它们悄悄变贵'));
    var subs = S.db.subs;
    var monthly = 0;
    subs.forEach(function (s2) {
      if (s2.status === 'cancelled') return;
      var f = s2.cycle === 'yearly' ? 1 / 12 : s2.cycle === 'quarterly' ? 1 / 3 : s2.cycle === 'weekly' ? 4.33 : 1;
      monthly += (s2.amount || 0) * f;
    });
    body.appendChild(h('div.card.sub-hero', {},
      h('div.bh-row', {},
        h('div', {}, h('div.bh-label', {}, '订阅月均支出'), h('div.bh-total', {}, UI.money(monthly))),
        h('div.bh-right', {}, h('div.bh-label', {}, '全年'), h('div.bh-spent', {}, UI.money(monthly * 12)))),
      h('div.bh-foot', {}, h('span', {}, '共 ' + subs.filter(function (s2) { return s2.status !== 'cancelled'; }).length + ' 项订阅'))));

    /* 自动检测 */
    var detected = FA.cat.detectSubscriptions(S.db.txns, {}).filter(function (d) {
      return !subs.some(function (s2) { return s2.key === d.key || FA.cat.aliasOf(FA.cat.normalizeMerchant(s2.name || s2.merchant || '')) === d.merchant; });
    });
    if (detected.length) {
      body.appendChild(UI.sectionTitle('自动检测到 ' + detected.length + ' 项可能的订阅'));
      var card = h('div.card');
      detected.forEach(function (d) {
        card.appendChild(h('div.detect-row', {},
          UI.catIllust(d.category || 'sub', 38),
          h('div.detect-mid', {}, h('div', {}, d.merchant), h('div.dim', {}, d.cycle === 'monthly' ? '每月' : d.cycle === 'yearly' ? '每年' : d.cycle === 'quarterly' ? '每季' : '每周' + ' ' + UI.money(d.amount) + ' · 已出现 ' + d.count + ' 次 · 置信度 ' + Math.round(d.confidence * 100) + '%')),
          h('button.btn.small.primary', {
            onclick: function () {
              S.add('subs', {
                name: d.merchant, amount: d.amount, cycle: d.cycle, category: d.category || 'fun', sub: d.sub || '订阅服务',
                accountId: d.accountId, nextDate: d.nextDate, lastDate: d.lastDate, status: 'active', key: d.key, autoDetected: true, icon: '🔁', color: '#8E7CFF'
              });
              UI.toast('已加入订阅'); UI.render();
            }
          }, '添加')));
      });
      body.appendChild(card);
    }

    if (!subs.length) body.appendChild(UI.empty('sub', '还没有订阅', '把自动续费的项目集中管理，避免忘记取消'));
    U.sortBy(subs, function (s2) { return s2.nextDate || 0; }).forEach(function (s2) {
      var days = s2.nextDate ? Math.ceil((s2.nextDate - Date.now()) / 86400000) : null;
      var overdue = days != null && days < 0;
      body.appendChild(h('div.card.sub-card' + (s2.status === 'cancelled' ? '.closed' : ''), {
        onclick: function () {
          UI.actions(s2.name, [
            { icon: 'edit', label: '编辑', onTap: function () { subForm(s2); } },
            { icon: 'check', label: '记录一次扣款', onTap: function () { subCharge(s2); } },
            { icon: 'repeat', label: s2.status === 'cancelled' ? '恢复订阅' : '暂停订阅', onTap: function () { S.update('subs', s2.id, { status: s2.status === 'cancelled' ? 'active' : 'cancelled' }); UI.render(); } },
            { icon: 'trash', label: '删除', danger: true, onTap: function () { UI.confirm('删除订阅「' + s2.name + '」？', { danger: true }).then(function (ok) { if (ok) { S.remove('subs', s2.id); UI.render(); } }); } }
          ]);
        }
      },
        h('div.sc-top', {},
          UI.avatar(s2.icon || '🔁', s2.color || '#8E7CFF', 42),
          h('div.sc-mid', {}, h('div.sc-name', {}, s2.name),
            h('div.sc-sub', {}, { monthly: '每月', yearly: '每年', quarterly: '每季', weekly: '每周' }[s2.cycle] + ' · ' +
              (s2.nextDate ? (overdue ? '已于 ' + U.fmtDate(s2.nextDate, 'md') + ' 扣款' : days + ' 天后扣款（' + U.fmtDate(s2.nextDate, 'md') + '）') : '未设置下次扣款') +
              (s2.autoDetected ? ' · 自动识别' : ''))),
          h('div.sc-amt', {}, h('div', {}, UI.money(s2.amount)), h('div.dim', {}, s2.status === 'cancelled' ? '已暂停' : '在用')))));
    });
    body.appendChild(h('button.btn.block', { onclick: function () { subForm(); } }, UI.icon('plus', 18) + ' 添加订阅'));

    function subForm(s2) {
      s2 = s2 || {};
      UI.form({
        title: s2.id ? '编辑订阅' : '添加订阅',
        fields: [
          { key: 'name', label: '名称', value: s2.name || '', required: true, placeholder: '例如：网易云音乐会员' },
          { key: 'amount', label: '金额', type: 'number', value: s2.amount || '', required: true },
          { key: 'cycle', label: '周期', type: 'select', value: s2.cycle || 'monthly', options: [{ v: 'monthly', label: '每月' }, { v: 'quarterly', label: '每季' }, { v: 'yearly', label: '每年' }, { v: 'weekly', label: '每周' }] },
          { key: 'nextDate', label: '下次扣款日', type: 'date', value: s2.nextDate ? U.ymd(s2.nextDate) : U.ymd(Date.now() + 30 * 86400000) },
          { key: 'category', label: '分类', type: 'select', value: s2.category || 'fun', options: catOptions() },
          { key: 'icon', label: '图标', type: 'chips', value: [s2.icon || '🔁'], options: ICON_CHOICES.map(function (i) { return { v: i, label: i }; }) }
        ]
      }).then(function (v) {
        if (!v) return;
        var payload = { name: v.name, amount: U.round2(v.amount), cycle: v.cycle, nextDate: U.parseDate(v.nextDate), category: v.category, icon: (v.icon && v.icon[0]) || '🔁', color: '#8E7CFF', status: s2.status || 'active', key: FA.cat.merchantKey({ merchant: v.name }) };
        if (s2.id) S.update('subs', s2.id, payload); else S.add('subs', payload);
        UI.toast('已保存'); UI.render();
      });
    }
    function subCharge(s2) {
      S.addTxn(FA.parser.manualTxn({
        amount: s2.amount, direction: 'expense', accountId: s2.accountId || (S.db.accounts[0] || {}).id,
        merchant: s2.name, item: '订阅扣款', category: s2.category || 'fun', sub: s2.sub || '订阅服务',
        time: Date.now(), tags: ['订阅']
      }));
      var next = s2.nextDate || Date.now();
      var days = { monthly: 30, quarterly: 91, yearly: 365, weekly: 7 }[s2.cycle] || 30;
      while (next < Date.now()) next += days * 86400000;
      S.update('subs', s2.id, { lastDate: Date.now(), nextDate: next });
      UI.toast('已记录扣款并顺延下次日期');
      UI.render();
    }
  }

  /* ================= 账户管理 ================= */
  FA.ui.register('accounts', {
    tab: 'home', title: '账户与数据源',
    actions: function () { return [{ icon: 'plus', label: '新增账户', onTap: function () { accountForm(); } }]; },
    render: function () {
      var wrap = h('div.page.accounts');
      var nw = S.netWorth();
      wrap.appendChild(h('div.card.account-hero', {},
        h('div.bh-row', {},
          h('div', {}, h('div.bh-label', {}, '账户资产合计'), h('div.bh-total', {}, UI.money(nw.assets))),
          h('div.bh-right', {}, h('div.bh-label', {}, '净资产'), h('div.bh-spent', {}, UI.money(nw.net))))));
      S.db.accounts.forEach(function (a) {
        var bal = S.accountBalance(a);
        var cnt = S.db.txns.filter(function (t) { return t.accountId === a.id; }).length;
        wrap.appendChild(h('div.card.account-card', {
          onclick: function () {
            UI.actions(a.name, [
              { icon: 'edit', label: '编辑账户', onTap: function () { accountForm(a); } },
              { icon: 'swap', label: '余额校准', onTap: function () { calibrate(a, bal); } },
              { icon: 'list', label: '查看该账户流水', onTap: function () { UI.go('txns', { acc: a.id }); } },
              { icon: 'trash', label: '删除账户', danger: true, onTap: function () { UI.confirm('删除账户「' + a.name + '」？该账户下的 ' + cnt + ' 笔交易会保留但失去归属。', { danger: true, okText: '删除' }).then(function (ok) { if (ok) { S.remove('accounts', a.id); UI.render(); } }); } }
            ]);
          }
        },
          accIllust(a),
          h('div.ac-mid', {}, h('div.ac-name', {}, a.name),
            h('div.ac-sub', {}, (S.ACCOUNT_TYPES.filter(function (t) { return t.id === a.type; })[0] || {}).name + ' · ' + cnt + ' 笔' + (a.include === false ? ' · 不计入净资产' : ''))),
          h('div.ac-bal', {}, h('div', {}, UI.money(bal)))));
      });
      wrap.appendChild(h('button.btn.block', { onclick: function () { accountForm(); } }, UI.icon('plus', 18) + ' 新增账户'));
      wrap.appendChild(h('div.tips', {}, '💡 微信、支付宝、银行卡、现金、其他都可以作为独立账户；导入账单时选择对应账户，余额会自动结算。'));
      return wrap;
    }
  });

  function accountForm(a) {
    a = a || {};
    UI.form({
      title: a.id ? '编辑账户' : '新增账户',
      fields: [
        { key: 'name', label: '账户名称', value: a.name || '', required: true, placeholder: '例如：招商银行储蓄卡' },
        { key: 'type', label: '类型', type: 'select', value: a.type || 'bank', options: S.ACCOUNT_TYPES.map(function (t) { return { v: t.id, label: t.icon + ' ' + t.name }; }) },
        { key: 'icon', label: '图标', type: 'chips', value: [a.icon || '💳'], options: ['💚', '💙', '💳', '💵', '🪙', '🏦', '📈', '🐷'].map(function (i) { return { v: i, label: i }; }) },
        { key: 'color', label: '颜色', type: 'chips', value: [a.color || '#4D96FF'], options: COLOR_CHOICES.map(function (c) { return { v: c, label: '●' }; }) },
        { key: 'initial', label: '当前余额（作为起始余额）', type: 'number', value: a.initial != null ? a.initial : (a.balance || 0) },
        { key: 'holder', label: '户名/尾号（用于识别本人转账）', value: a.holder || '', placeholder: '例如：招行****8888 或 我的名字' },
        { key: 'include', label: '计入净资产', type: 'switch', value: a.include !== false }
      ]
    }).then(function (v) {
      if (!v) return;
      var payload = { name: v.name, type: v.type, icon: (v.icon && v.icon[0]) || '💳', color: (v.color && v.color[0]) || '#4D96FF', initial: U.round2(v.initial || 0), balance: U.round2(v.initial || 0), holder: v.holder || '', include: v.include };
      if (a.id) S.update('accounts', a.id, payload); else S.add('accounts', payload);
      UI.toast('已保存'); UI.render();
    });
  }
  function calibrate(a, cur) {
    UI.form({
      title: '余额校准：' + a.name,
      subtitle: '当前账本余额 ' + UI.money(cur) + '，输入银行/微信里的真实余额，差额会记为「余额调整」',
      fields: [{ key: 'real', label: '真实余额', type: 'number', required: true, value: cur }, { key: 'asTxn', label: '同时记一笔调整交易', type: 'switch', value: true }]
    }).then(function (v) {
      if (!v) return;
      var diff = U.round2(v.real - cur);
      S.update('accounts', a.id, { initial: U.round2((a.initial || 0) + diff) });
      if (v.asTxn && Math.abs(diff) >= 0.01) {
        S.addTxn(FA.parser.manualTxn({
          amount: Math.abs(diff), direction: diff > 0 ? 'income' : 'expense', accountId: a.id,
          merchant: '余额校准调整', item: '对账差额', category: 'other', note: '校准差额 ' + U.money(diff), time: Date.now()
        }));
        var t = S.db.txns[S.db.txns.length - 1];
        S.updateTxn(t.id, { excluded: true });
      }
      UI.toast('已校准'); UI.render();
    });
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
