/* FlowAtlas · 数据层：模型 / 分类 / 持久化 / 本地加密 */
(function (root) {
  'use strict';
  var FA = root.FA, U = FA.util;
  var KEY = 'flowatlas.data.v1', VAULT = 'flowatlas.vault.v1', MEDIA = 'flowatlas.media.v1';

  /* ---------------- 分类体系 ---------------- */
  var CATS = {
    expense: [
      { id: 'food', name: '餐饮', icon: '🍜', color: '#FF6B6B', subs: ['正餐', '快餐', '外卖', '咖啡饮品', '早餐', '零食'] },
      { id: 'transport', name: '交通', icon: '🚕', color: '#4D96FF', subs: ['打车', '公交地铁', '火车高铁', '飞机', '加油', '停车', '单车'] },
      { id: 'shopping', name: '购物', icon: '🛍️', color: '#F473B9', subs: ['服饰', '数码', '家居', '美妆', '母婴', '图书文具'] },
      { id: 'daily', name: '日用', icon: '🧴', color: '#FFB020', subs: ['超市', '便利店', '生鲜', '洗护', '药品'] },
      { id: 'housing', name: '居住', icon: '🏠', color: '#8E7CFF', subs: ['房租', '物业', '水电燃气', '家政', '装修'] },
      { id: 'telecom', name: '通讯', icon: '📶', color: '#2ED3B7', subs: ['话费', '宽带', '软件会员'] },
      { id: 'fun', name: '娱乐', icon: '🎮', color: '#FF8A3D', subs: ['电影演出', '游戏', '旅行', '运动健身', '订阅服务', '酒吧KTV'] },
      { id: 'health', name: '医疗', icon: '💊', color: '#3EC1D3', subs: ['门诊', '住院', '体检', '保健'] },
      { id: 'edu', name: '教育', icon: '📚', color: '#6C5CE7', subs: ['学费', '培训', '书籍', '考试'] },
      { id: 'social', name: '人情', icon: '🎁', color: '#FF5C8A', subs: ['红包', '礼物', '请客', '捐赠'] },
      { id: 'finance', name: '金融', icon: '🏦', color: '#5B6B8C', subs: ['手续费', '利息', '保险', '税费', '还款', '投资'] },
      { id: 'pet', name: '宠物', icon: '🐾', color: '#A0C15A', subs: ['宠物食品', '宠物医疗'] },
      { id: 'other', name: '其他', icon: '📦', color: '#9AA5B1', subs: ['未分类'] }
    ],
    income: [
      { id: 'salary', name: '工资', icon: '💼', color: '#22C55E', subs: ['工资', '补贴'] },
      { id: 'bonus', name: '奖金', icon: '🏆', color: '#EAB308', subs: ['年终奖', '提成'] },
      { id: 'parttime', name: '兼职', icon: '🧰', color: '#14B8A6', subs: ['外快', '接单'] },
      { id: 'reimburse', name: '报销', icon: '🧾', color: '#0EA5E9', subs: ['报销', 'AA收款', '代付'] },
      { id: 'refund', name: '退款', icon: '↩️', color: '#94A3B8', subs: ['退款', '退货'] },
      { id: 'giftin', name: '红包', icon: '🧧', color: '#EF4444', subs: ['红包收入', '礼金'] },
      { id: 'interest', name: '利息', icon: '📈', color: '#10B981', subs: ['利息', '收益'] },
      { id: 'invest', name: '投资', icon: '💹', color: '#8B5CF6', subs: ['基金', '股票', '分红'] },
      { id: 'incother', name: '其他收入', icon: '🪙', color: '#F59E0B', subs: ['其他'] }
    ],
    transfer: [{ id: 'transfer', name: '转账', icon: '🔄', color: '#64748B', subs: ['内部转账', '还款', '充值', '提现', '信用卡还款'] }]
  };
  var ACCOUNT_TYPES = [
    { id: 'wechat', name: '微信', icon: '💚', color: '#07C160', defaultName: '微信零钱' },
    { id: 'alipay', name: '支付宝', icon: '💙', color: '#1677FF', defaultName: '支付宝余额' },
    { id: 'bank', name: '银行卡', icon: '💳', color: '#E8474B', defaultName: '银行卡' },
    { id: 'cash', name: '现金', icon: '💵', color: '#F5A623', defaultName: '现金钱包' },
    { id: 'other', name: '其他', icon: '🪙', color: '#7C8BA1', defaultName: '其他账户' }
  ];

  var S = (FA.store = {});
  S.CATS = CATS;
  S.ACCOUNT_TYPES = ACCOUNT_TYPES;

  S.catList = function (dir) { return CATS[dir === 'income' ? 'income' : dir === 'transfer' ? 'transfer' : 'expense']; };
  S.cat = function (id, dir) {
    var list = CATS.expense.concat(CATS.income, CATS.transfer);
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return CATS.expense[CATS.expense.length - 1];
  };
  S.catName = function (id) { return S.cat(id).name; };

  /* ---------------- 数据库 ---------------- */
  function blankDB() {
    return {
      version: 1,
      createdAt: Date.now(),
      settings: {
        currency: 'CNY', theme: 'auto', startDay: 1, alertPct: 80,
        reportDay: 1, notify: true, excludeTransfer: true, hideAmount: false,
        nickname: '', ownerAliases: ['我', '本人']
      },
      accounts: [
        { id: 'acc_cash', type: 'cash', name: '现金钱包', icon: '💵', color: '#F5A623', balance: 0, initial: 0, include: true, note: '', createdAt: Date.now() },
        { id: 'acc_wechat', type: 'wechat', name: '微信零钱', icon: '💚', color: '#07C160', balance: 0, initial: 0, include: true, note: '', createdAt: Date.now() },
        { id: 'acc_alipay', type: 'alipay', name: '支付宝余额', icon: '💙', color: '#1677FF', balance: 0, initial: 0, include: true, note: '', createdAt: Date.now() },
        { id: 'acc_bank', type: 'bank', name: '主要银行卡', icon: '💳', color: '#E8474B', balance: 0, initial: 0, include: true, note: '', createdAt: Date.now() }
      ],
      txns: [], budgets: [], goals: [], debts: [], subs: [], rules: [], corrections: [],
      imports: [], notifications: []
    };
  }

  S.db = blankDB();
  S.encrypted = false;
  S._key = null;

  /* ---------------- 加解密 ---------------- */
  function b64(buf) { var b = new Uint8Array(buf), s = ''; for (var i = 0; i < b.length; i++) s += String.fromCharCode(b[i]); return btoa(s); }
  function unb64(str) { var s = atob(str), b = new Uint8Array(s.length); for (var i = 0; i < s.length; i++) b[i] = s.charCodeAt(i); return b; }

  function deriveKey(pass, salt) {
    var enc = new TextEncoder();
    return crypto.subtle.importKey('raw', enc.encode(pass), 'PBKDF2', false, ['deriveKey']).then(function (base) {
      return crypto.subtle.deriveKey(
        { name: 'PBKDF2', salt: salt, iterations: 150000, hash: 'SHA-256' },
        base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
    });
  }
  S.encryptJSON = function (obj, pass) {
    var salt = crypto.getRandomValues(new Uint8Array(16));
    var iv = crypto.getRandomValues(new Uint8Array(12));
    return deriveKey(pass, salt).then(function (k) {
      return crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, k, new TextEncoder().encode(JSON.stringify(obj)));
    }).then(function (ct) {
      return JSON.stringify({ v: 1, kdf: 'PBKDF2-150k', salt: b64(salt), iv: b64(iv), ct: b64(ct) });
    });
  };
  S.decryptJSON = function (envStr, pass) {
    var env = JSON.parse(envStr);
    return deriveKey(pass, unb64(env.salt)).then(function (k) {
      return crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(env.iv) }, k, unb64(env.ct));
    }).then(function (pt) { return JSON.parse(new TextDecoder().decode(pt)); });
  };

  /* ---------------- 读写 ---------------- */
  S.hasVault = function () { try { return !!localStorage.getItem(VAULT); } catch (e) { return false; } };
  S.load = function () {
    try {
      var env = S.hasVault() ? localStorage.getItem(VAULT) : null;
      if (env) { S.encrypted = true; return { locked: true }; }
      var raw = localStorage.getItem(KEY);
      S.db = raw ? Object.assign(blankDB(), JSON.parse(raw)) : blankDB();
      S.encrypted = false;
      return { locked: false };
    } catch (e) {
      S.db = blankDB();
      return { locked: false, error: String(e) };
    }
  };
  S.unlock = function (pass) {
    return S.decryptJSON(localStorage.getItem(VAULT), pass).then(function (obj) {
      S.db = Object.assign(blankDB(), obj);
      S.encrypted = true; S._key = pass;
      return true;
    });
  };
  S.setPasscode = function (pass) {
    return S.encryptJSON(S.db, pass).then(function (env) {
      localStorage.setItem(VAULT, env);
      try { localStorage.removeItem(KEY); } catch (e) { }
      S.encrypted = true; S._key = pass;
      return true;
    });
  };
  S.removePasscode = function (pass) {
    var p = pass || S._key;
    return S.decryptJSON(localStorage.getItem(VAULT), p).then(function (obj) {
      S.db = Object.assign(blankDB(), obj);
      localStorage.removeItem(VAULT);
      S.encrypted = false; S._key = null;
      return S.save(true);
    });
  };

  var _dirty = false;
  S.save = function (immediate) {
    if (typeof localStorage === 'undefined') return Promise.resolve(false);
    if (!S.encrypted) {
      try { localStorage.setItem(KEY, JSON.stringify(S.db)); } catch (e) { console.warn('保存失败', e); }
      return Promise.resolve(true);
    }
    _dirty = true;
    if (S._saveTimer) clearTimeout(S._saveTimer);
    S._saveTimer = setTimeout(function () { S.flush(); }, immediate ? 0 : 500);
    return Promise.resolve(true);
  };
  S.flush = function () {
    if (!S.encrypted || !S._key) return Promise.resolve(false);
    var snapshot = JSON.stringify(S.db);
    return S.encryptJSON(JSON.parse(snapshot), S._key).then(function (env) {
      localStorage.setItem(VAULT, env); _dirty = false; return true;
    }).catch(function (e) { console.warn('加密保存失败', e); return false; });
  };
  S.reset = function () {
    try { localStorage.removeItem(KEY); localStorage.removeItem(VAULT); localStorage.removeItem(MEDIA); } catch (e) { }
    S.db = blankDB(); S.encrypted = false; S._key = null;
  };
  S.exportJSON = function () { return JSON.stringify({ app: 'FlowAtlas', version: 1, exportedAt: Date.now(), data: S.db }, null, 1); };
  S.importJSON = function (text, mode) {
    var o = JSON.parse(text);
    var d = o && o.data ? o.data : o;
    if (!d || !Array.isArray(d.txns)) throw new Error('不是有效的 FlowAtlas 备份文件');
    if (mode === 'replace') { S.db = Object.assign(blankDB(), d); }
    else {
      var cur = S.db, seen = {};
      cur.txns.forEach(function (t) { seen[t.id] = 1; });
      d.txns.forEach(function (t) { if (!seen[t.id]) cur.txns.push(t); });
      ['accounts', 'budgets', 'goals', 'debts', 'subs', 'rules', 'corrections', 'imports'].forEach(function (k) {
        if (!Array.isArray(d[k])) return;
        var have = {};
        cur[k].forEach(function (x) { have[x.id] = 1; });
        d[k].forEach(function (x) { if (!have[x.id]) cur[k].push(x); });
      });
    }
    return S.save(true).then(function () { return S.db.txns.length; });
  };

  /* ---------------- 媒体（截图凭证） ---------------- */
  function mediaAll() { try { return JSON.parse(localStorage.getItem(MEDIA) || '{}'); } catch (e) { return {}; } }
  function mediaSave(all) {
    var keys = Object.keys(all), size = 0;
    keys.forEach(function (k) { size += (all[k].url || '').length; });
    while (size > 3.5e6 && keys.length > 1) { var k0 = keys.shift(); size -= (all[k0].url || '').length; delete all[k0]; }
    try { localStorage.setItem(MEDIA, JSON.stringify(all)); } catch (e) { }
  }
  S.putMedia = function (id, url) { var a = mediaAll(); a[id] = { url: url, at: Date.now() }; mediaSave(a); return id; };
  S.getMedia = function (id) { return (mediaAll()[id] || {}).url || null; };

  /* ---------------- 增删改 ---------------- */
  var MUT = ['accounts', 'txns', 'budgets', 'goals', 'debts', 'subs', 'rules', 'corrections', 'imports', 'notifications'];
  S.add = function (coll, obj) {
    if (MUT.indexOf(coll) < 0) throw new Error('unknown collection ' + coll);
    obj.id = obj.id || U.uid(coll.slice(0, 3));
    obj.createdAt = obj.createdAt || Date.now();
    S.db[coll].push(obj); S.save(); return obj;
  };
  S.update = function (coll, id, patch) {
    var a = S.db[coll], i;
    for (i = 0; i < a.length; i++) if (a[i].id === id) { Object.assign(a[i], patch, { updatedAt: Date.now() }); S.save(); return a[i]; }
    return null;
  };
  S.remove = function (coll, id) {
    var a = S.db[coll], i;
    for (i = 0; i < a.length; i++) if (a[i].id === id) { a.splice(i, 1); S.save(); return true; }
    return false;
  };
  S.byId = function (coll, id) {
    var a = S.db[coll] || [];
    for (var i = 0; i < a.length; i++) if (a[i].id === id) return a[i];
    return null;
  };
  S.account = function (id) { return S.byId('accounts', id) || { id: id, name: '未知账户', icon: '❔', color: '#94A3B8', include: false }; };

  S.addTxn = function (t) { return S.add('txns', t); };
  S.txn = function (id) { return S.byId('txns', id); };
  S.updateTxn = function (id, patch) { return S.update('txns', id, patch); };
  S.removeTxn = function (id) { return S.remove('txns', id); };

  S.accountOwnerAliases = function () {
    var names = (S.db.settings.ownerAliases || []).slice();
    S.db.accounts.forEach(function (a) { names.push(a.name); if (a.holder) names.push(a.holder); });
    S.db.goals.forEach(function (g) { });
    return U.uniq(names.filter(Boolean));
  };

  /* ---------------- 账务计算 ---------------- */
  S.inMonth = function (ts, ym) {
    var r = U.monthRange(ym);
    return ts >= r.start && ts < r.end;
  };
  S.filterTxns = function (opt) {
    opt = opt || {};
    return S.db.txns.filter(function (t) {
      if (opt.from && t.time < opt.from) return false;
      if (opt.to && t.time >= opt.to) return false;
      if (opt.ym && !S.inMonth(t.time, opt.ym)) return false;
      if (opt.accountId && t.accountId !== opt.accountId) return false;
      if (opt.accounts && opt.accounts.length && opt.accounts.indexOf(t.accountId) < 0) return false;
      if (opt.direction && t.direction !== opt.direction) return false;
      if (opt.category && t.category !== opt.category) return false;
      if (opt.tag && (t.tags || []).indexOf(opt.tag) < 0) return false;
      if (opt.q) {
        var q = String(opt.q).toLowerCase(), hay = [t.merchant, t.item, t.note, t.category, t.sub, (t.tags || []).join(' '), t.orderNo, t.payMethod].join(' ').toLowerCase();
        if (hay.indexOf(q) < 0) return false;
      }
      if (opt.includeExcluded !== true && t.excluded) return false;
      return true;
    });
  };
  S.summary = function (opt) {
    var list = S.filterTxns(opt), inc = 0, exp = 0, trIn = 0, trOut = 0, cnt = 0;
    list.forEach(function (t) {
      if (t.direction === 'income') inc += t.amount;
      else if (t.direction === 'expense') exp += t.amount;
      else if (t.direction === 'transfer') trOut += t.amount;
      cnt++;
    });
    return { list: list, income: U.round2(inc), expense: U.round2(exp), net: U.round2(inc - exp), transfer: U.round2(trOut), count: cnt, savingsRate: inc > 0 ? (inc - exp) / inc : 0 };
  };
  /* 账户余额 = 初始余额 + 收入 - 支出 ± 转账 */
  S.accountBalance = function (acc) {
    var bal = Number(acc.initial != null ? acc.initial : acc.balance) || 0;
    S.db.txns.forEach(function (t) {
      if (t.excluded) return;
      if (t.direction === 'income' && t.accountId === acc.id) bal += t.amount;
      else if (t.direction === 'expense' && t.accountId === acc.id) bal -= t.amount;
      else if (t.direction === 'transfer') {
        if (t.accountId === acc.id) bal -= t.amount;
        if (t.transferTo === acc.id) bal += t.amount;
      }
    });
    return U.round2(bal);
  };
  S.netWorth = function () {
    var assets = 0, i;
    S.db.accounts.forEach(function (a) { if (a.include !== false && a.type !== 'credit') assets += S.accountBalance(a); });
    var debts = 0;
    S.db.debts.forEach(function (d) { if (d.status !== 'closed') debts += Number(d.balance) || 0; });
    return { assets: U.round2(assets), debts: U.round2(debts), net: U.round2(assets - debts) };
  };
  S.catBreakdown = function (opt, dir) {
    dir = dir || 'expense';
    var list = S.filterTxns(Object.assign({}, opt, { direction: dir }));
    var m = {};
    list.forEach(function (t) {
      var k = t.category || 'other';
      m[k] = m[k] || { id: k, name: S.catName(k), icon: S.cat(k).icon, color: S.cat(k).color, total: 0, count: 0, subs: {} };
      m[k].total += t.amount; m[k].count++;
      var s = t.sub || '未分类';
      m[k].subs[s] = (m[k].subs[s] || 0) + t.amount;
    });
    var out = Object.keys(m).map(function (k) { return m[k]; });
    out.forEach(function (x) { x.total = U.round2(x.total); });
    return U.sortBy(out, function (x) { return x.total; }, true);
  };
  S.correction = function (merchantKey, category, sub) {
    if (!merchantKey) return;
    var i, hit = null;
    for (i = 0; i < S.db.corrections.length; i++) if (S.db.corrections[i].key === merchantKey) hit = S.db.corrections[i];
    if (hit) { hit.category = category; hit.sub = sub || hit.sub; hit.n++; hit.at = Date.now(); S.save(); return hit; }
    return S.add('corrections', { key: merchantKey, category: category, sub: sub, n: 1, at: Date.now() });
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
