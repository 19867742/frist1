/* FlowAtlas · 启动：主题 / 锁屏 / 首次运行 / 示例数据 / Service Worker */
(function (root) {
  'use strict';
  var FA = root.FA, U = FA.util, UI = FA.ui, S = FA.store, h = UI.h;

  /* ---------------- 主题 ---------------- */
  UI.applyTheme = function () {
    var t = (S.db.settings && S.db.settings.theme) || 'auto';
    var dark = t === 'dark' || (t === 'auto' && root.matchMedia && root.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', dark ? '#0B1220' : '#F4F6FB');
  };

  /* ---------------- 示例数据 ---------------- */
  var DEMO = [
    ['肯德基', 24, 58, 'food', '快餐', 6], ['麦当劳', 22, 55, 'food', '快餐', 5],
    ['星巴克', 28, 45, 'food', '咖啡饮品', 4], ['瑞幸咖啡', 12, 22, 'food', '咖啡饮品', 8],
    ['蜜雪冰城', 6, 15, 'food', '咖啡饮品', 5], ['海底捞', 120, 320, 'food', '正餐', 1],
    ['美团外卖', 18, 48, 'food', '外卖', 7], ['饿了么', 16, 45, 'food', '外卖', 4],
    ['永辉超市', 45, 210, 'daily', '超市', 3], ['全家便利店', 8, 40, 'daily', '便利店', 6],
    ['叮咚买菜', 35, 120, 'daily', '生鲜', 4], ['菜鸟驿站', 2, 15, 'daily', '快递', 3],
    ['滴滴出行', 12, 68, 'transport', '打车', 5], ['北京地铁', 3, 8, 'transport', '公交地铁', 10],
    ['哈啰出行', 1.5, 4, 'transport', '单车', 6], ['中国石化', 200, 400, 'transport', '加油', 1],
    ['淘宝', 30, 380, 'shopping', '综合电商', 4], ['京东', 50, 600, 'shopping', '数码', 2],
    ['优衣库', 99, 399, 'shopping', '服饰', 1], ['屈臣氏', 40, 160, 'shopping', '美妆', 1],
    ['万达影城', 35, 90, 'fun', '电影演出', 2], ['Steam', 30, 200, 'fun', '游戏', 1],
    ['Keep 会员', 25, 25, 'fun', '运动健身', 1], ['携程酒店', 200, 800, 'fun', '旅行', 0.4],
    ['中国移动', 58, 128, 'telecom', '话费', 1], ['中国联通', 39, 99, 'telecom', '宽带', 1],
    ['协和医院', 50, 500, 'health', '门诊', 0.5], ['叮当快药', 25, 90, 'health', '药品', 1],
    ['新东方在线', 200, 800, 'edu', '培训', 0.4], ['当当网', 30, 120, 'edu', '书籍', 0.6],
    ['物业费', 180, 260, 'housing', '物业', 1], ['国家电网', 80, 220, 'housing', '水电燃气', 1],
    ['礼物鲜花店', 60, 260, 'social', '礼物', 0.7] ];
  var ACCS = ['acc_wechat', 'acc_alipay', 'acc_bank'];

  FA.demo = {
    seed: function () {
      var now = Date.now();
      var accIds = S.db.accounts.map(function (a) { return a.id; });
      var pick = function () { return accIds[Math.floor(Math.random() * accIds.length)] || 'acc_wechat'; };
      var rnd = function (a, b) { return a + Math.random() * (b - a); };
      var n = 0;
      var push = function (t) { t.id = U.uid('tx'); t.time = t.time || now; t.status = 'success'; t.excluded = !!t.excluded; t.tags = t.tags || []; S.db.txns.push(t); n++; };
      for (var back = 3; back >= 0; back--) {
        var base = new Date();
        base.setDate(1); base.setMonth(base.getMonth() - back);
        var y = base.getFullYear(), m = base.getMonth(), days = new Date(y, m + 1, 0).getDate();
        /* 固定收支 */
        push({ time: new Date(y, m, 10, 9, 30).getTime(), amount: Math.round(rnd(11800, 15200)), direction: 'income', accountId: 'acc_bank', merchant: '某某科技有限公司', item: '工资', category: 'salary', sub: '工资', source: 'bank', orderNo: 'SAL' + y + m });
        if (back > 0) push({ time: new Date(y, m, 5, 10, 0).getTime(), amount: 3200, direction: 'expense', accountId: 'acc_bank', merchant: '房东王先生', item: '房租', category: 'housing', sub: '房租', source: 'bank', orderNo: 'RENT' + y + m });
        push({ time: new Date(y, m, 15, 8, 0).getTime(), amount: 25, direction: 'expense', accountId: 'acc_alipay', merchant: 'Netflix', item: '会员订阅', category: 'fun', sub: '订阅服务', source: 'alipay', orderNo: 'NFLX' + y + m, tags: ['订阅'] });
        push({ time: new Date(y, m, 15, 8, 5).getTime(), amount: 15, direction: 'expense', accountId: 'acc_alipay', merchant: '网易云音乐', item: '会员订阅', category: 'fun', sub: '订阅服务', source: 'alipay', orderNo: 'NETEASE' + y + m, tags: ['订阅'] });
        push({ time: new Date(y, m, 20, 8, 0).getTime(), amount: 19, direction: 'expense', accountId: 'acc_wechat', merchant: '腾讯视频', item: '会员订阅', category: 'fun', sub: '订阅服务', source: 'wechat', orderNo: 'TXSP' + y + m, tags: ['订阅'] });
        push({ time: new Date(y, m, 12, 20, 0).getTime(), amount: 68, direction: 'expense', accountId: 'acc_wechat', merchant: '中国移动', item: '话费充值', category: 'telecom', sub: '话费', source: 'wechat', orderNo: 'YD' + y + m });
        /* 日常随机 */
        for (var d = 1; d <= days; d++) {
          var isFuture = back === 0 && d > new Date().getDate();
          if (isFuture) break;
          var cnt = Math.random() < 0.22 ? 0 : Math.ceil(rnd(0.7, 2.6));
          for (var i = 0; i < cnt; i++) {
            var mch = DEMO[Math.floor(Math.random() * DEMO.length)];
            if (Math.random() > (mch[5] == null ? 1 : Math.min(1, mch[5] / 2))) continue;
            var amt = Math.round(rnd(mch[1], mch[2]) * 100) / 100;
            push({
              time: new Date(y, m, d, Math.floor(rnd(7, 22)), Math.floor(rnd(0, 59))).getTime(),
              amount: amt, direction: 'expense', accountId: pick(), merchant: mch[0],
              item: mch[4], category: mch[3], sub: mch[4], source: Math.random() < 0.5 ? 'wechat' : 'alipay',
              orderNo: 'D' + y + m + d + i + Math.floor(Math.random() * 9999)
            });
          }
        }
        /* 少量大额 + 一个异常 */
        if (back === 1 || back === 2) push({ time: new Date(y, m, 18, 21, 0).getTime(), amount: Math.round(rnd(800, 2600)), direction: 'expense', accountId: 'acc_bank', merchant: '京东', item: '笔记本电脑配件', category: 'shopping', sub: '数码', source: 'bank', orderNo: 'BIG' + y + m });
        if (back === 1) push({ time: new Date(y, m, 22, 2, 30).getTime(), amount: 1280, direction: 'expense', accountId: 'acc_alipay', merchant: '某某数码旗舰店', item: '耳机', category: 'shopping', sub: '数码', source: 'alipay', orderNo: 'NIGHT' + y + m });
        push({ time: new Date(y, m, 25, 12, 0).getTime(), amount: Math.round(rnd(120, 400)), direction: 'income', accountId: 'acc_wechat', merchant: '朋友转账', item: 'AA收款', category: 'reimburse', sub: 'AA收款', source: 'wechat', orderNo: 'AA' + y + m });
      }
      /* 内部转账示例：零钱提现到银行卡 */
      push({ time: now - 3 * 86400000, amount: 500, direction: 'transfer', accountId: 'acc_wechat', transferTo: 'acc_bank', merchant: '零钱提现', item: '提现到银行卡', category: 'transfer', sub: '提现', source: 'wechat', excluded: true, orderNo: 'WD001' });
      /* 初始余额 */
      S.db.accounts.forEach(function (a) {
        if (a.type === 'bank') a.initial = 8600;
        else if (a.type === 'wechat') a.initial = 420;
        else if (a.type === 'alipay') a.initial = 1250;
        else a.initial = 300;
      });
      /* 预算 / 目标 / 债务 / 订阅 */
      S.db.budgets = [
        { id: 'b1', name: '餐饮月预算', amount: 2200, categories: ['food'], icon: '🍜', color: '#FF6B6B', period: 'monthly' },
        { id: 'b2', name: '交通出行', amount: 600, categories: ['transport'], icon: '🚕', color: '#4D96FF', period: 'monthly' },
        { id: 'b3', name: '购物娱乐', amount: 1500, categories: ['shopping', 'fun'], icon: '🛍️', color: '#F473B9', period: 'monthly' },
        { id: 'b4', name: '生活总预算', amount: 6000, categories: [], icon: '🏠', color: '#2ED3B7', period: 'monthly' }
      ];
      S.db.goals = [
        { id: 'g1', name: '应急备用金', targetAmount: 30000, saved: 12500, icon: '🛟', color: '#22C55E', deadline: Date.now() + 300 * 86400000, contributions: [] },
        { id: 'g2', name: '日本旅行基金', targetAmount: 15000, saved: 4200, icon: '✈️', color: '#4D96FF', deadline: Date.now() + 240 * 86400000, contributions: [] },
        { id: 'g3', name: '换新手机', targetAmount: 6000, saved: 3100, icon: '📱', color: '#8E7CFF', deadline: Date.now() + 120 * 86400000, contributions: [] }
      ];
      S.db.debts = [
        { id: 'd1', name: '招商银行信用卡', type: '信用卡', principal: 20000, balance: 6840, apr: 0.1825, minPayment: 700, dueDay: 18, icon: '💳', color: '#EF4444', status: 'active', payments: [] },
        { id: 'd2', name: '花呗分期', type: '花呗/白条', principal: 6000, balance: 2100, apr: 0.088, minPayment: 520, dueDay: 9, icon: '💙', color: '#4D96FF', status: 'active', payments: [] },
        { id: 'd3', name: '消费贷', type: '消费贷', principal: 50000, balance: 32000, apr: 0.0435, minPayment: 1800, dueDay: 25, icon: '🏦', color: '#8E7CFF', status: 'active', payments: [] }
      ];
      S.db.subs = [
        { id: 's1', name: 'Netflix', amount: 25, cycle: 'monthly', category: 'fun', sub: '订阅服务', nextDate: now + 5 * 86400000, lastDate: now - 25 * 86400000, status: 'active', icon: '🎬', color: '#EF4444' },
        { id: 's2', name: '网易云音乐', amount: 15, cycle: 'monthly', category: 'fun', sub: '订阅服务', nextDate: now + 12 * 86400000, lastDate: now - 18 * 86400000, status: 'active', icon: '🎵', color: '#F473B9' },
        { id: 's3', name: '腾讯视频', amount: 19, cycle: 'monthly', category: 'fun', sub: '订阅服务', nextDate: now + 2 * 86400000, lastDate: now - 28 * 86400000, status: 'active', icon: '📺', color: '#4D96FF' },
        { id: 's4', name: '百度网盘超级会员', amount: 178, cycle: 'yearly', category: 'telecom', sub: '软件会员', nextDate: now + 90 * 86400000, lastDate: now - 275 * 86400000, status: 'active', icon: '☁️', color: '#2ED3B7' }
      ];
      FA.cat.autoLabel(S.db);
      S.save(true);
      return n;
    }
  };

  /* ---------------- 首次运行 ---------------- */
  function firstRun() {
    S.db.settings.onboarded = true;
    S.save(true);
    UI.sheet({
      title: '欢迎使用 FlowAtlas 🎉',
      subtitle: '本地优先的账单管家 · 数据只存在你的手机里',
      dismissable: false,
      body: h('div.about', {},
        h('p', {}, '三步开始：'),
        h('ol', {},
          h('li', {}, '在微信/支付宝里导出账单（CSV）'),
          h('li', {}, '点底部 ➕ 选择文件，自动识别、自动分类'),
          h('li', {}, '设置预算、目标、债务、订阅，每月自动生成报告')),
        h('div.row-btns.col', {},
          h('button.btn.primary.block', { onclick: function () { close(); UI.go('import'); } }, '📥 立即导入真实账单'),
          h('button.btn.block', { onclick: function () { var n = FA.demo.seed(); close(); UI.toast('已载入 ' + n + ' 笔示例数据'); UI.render(); } }, '🎲 先载入示例数据体验'),
          h('button.btn.ghost.block', { onclick: function () { close(); FA.views.manualSheet(); } }, '✍️ 手动记一笔')))
    });
    var close = UI.$('.sheet-panel') ? function () { var o = UI.$('#sheet-root .sheet-overlay'); if (o) o.querySelector('.sheet-panel').close(); } : function () { };
  }

  /* ---------------- 锁屏 ---------------- */
  function showLock() {
    var input = h('input.field-input.lock-input', { type: 'password', placeholder: '••••••', autocomplete: 'current-password' });
    var err = h('div.lock-err');
    var lock = h('div#lock', {},
      h('div.lock-logo', {}, '🔐'),
      h('div.lock-title', {}, 'FlowAtlas 已锁定'),
      h('div.lock-sub', {}, '输入密码解锁本地账本（数据以 AES-256-GCM 加密存储）'),
      input, err,
      h('button.btn.primary', { onclick: tryUnlock, style: { width: 'min(300px,78vw)' } }, '解锁'));
    document.body.appendChild(lock);
    setTimeout(function () { input.focus(); }, 200);
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') tryUnlock(); });
    function tryUnlock() {
      var p = input.value;
      if (!p) return;
      err.textContent = '正在解密…';
      S.unlock(p).then(function () {
        lock.remove();
        UI.applyTheme();
        start();
        UI.toast('欢迎回来');
      }).catch(function () {
        err.textContent = '密码不正确，请重试';
        input.value = '';
        if (navigator.vibrate) { try { navigator.vibrate([40, 60, 40]); } catch (e) { } }
      });
    }
  }

  /* ---------------- 启动 ---------------- */
  function start() {
    UI.render();
    if (!S.db.txns.length && !S.db.settings.onboarded) setTimeout(firstRun, 400);
    if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) {
      navigator.serviceWorker.register('./sw.js').catch(function () { });
    }
    window.addEventListener('beforeunload', function () { S.flush(); });
    document.addEventListener('visibilitychange', function () { if (document.hidden) S.flush(); });
  }

  function boot() {
    var st = S.load();
    UI.applyTheme();
    if (root.matchMedia) {
      try {
        root.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () {
          if ((S.db.settings.theme || 'auto') === 'auto') UI.applyTheme();
        });
      } catch (e) { }
    }
    if (st.locked) showLock(); else start();
    /* 支持 ?demo=1 快速载入示例 */
    if (/[?&]demo=1/.test(location.search) && !S.db.txns.length) {
      FA.demo.seed(); UI.toast('已载入示例数据'); UI.render();
    }
  }

  FA.app = { boot: boot, firstRun: firstRun };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})(typeof globalThis !== 'undefined' ? globalThis : this);
