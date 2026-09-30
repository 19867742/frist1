/* FlowAtlas · 界面渲染烟测：用极简 DOM 垫片在 Node 中跑通所有页面，捕捉运行时错误 */
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');

/* ---------- 极简 DOM ---------- */
class ClassList {
  constructor(el) { this.el = el; }
  get set() { return (this.el.className || '').split(/\s+/).filter(Boolean); }
  _w(v) { this.el.className = v.join(' '); }
  add(...c) { const s = this.set; c.forEach(x => { if (s.indexOf(x) < 0) s.push(x); }); this._w(s); }
  remove(...c) { this._w(this.set.filter(x => c.indexOf(x) < 0)); }
  toggle(c, f) { const has = this.set.indexOf(c) >= 0; const on = f === undefined ? !has : !!f; on ? this.add(c) : this.remove(c); return on; }
  contains(c) { return this.set.indexOf(c) >= 0; }
}
class El {
  constructor(tag) {
    this.tagName = String(tag).toUpperCase(); this.nodeType = 1; this.childNodes = [];
    this.className = ''; this.id = ''; this.style = {}; this.dataset = {}; this.attrs = {};
    this._text = ''; this._html = ''; this.value = ''; this.parentNode = null;
    this.classList = new ClassList(this); this._events = {};
  }
  get children() { return this.childNodes.filter(n => n.nodeType === 1); }
  get firstChild() { return this.childNodes[0] || null; }
  get lastChild() { return this.childNodes[this.childNodes.length - 1] || null; }
  get textContent() { return this._text || this.childNodes.map(c => c.textContent || '').join(''); }
  set textContent(v) { this._text = String(v); this.childNodes = []; }
  get innerHTML() { return this._html; }
  set innerHTML(v) { this._html = String(v); }
  appendChild(n) { if (n && n.nodeType === 11) { n.childNodes.slice().forEach(c => this.appendChild(c)); n.childNodes = []; return n; } if (n) { n.parentNode = this; this.childNodes.push(n); } return n; }
  insertBefore(n, ref) { const i = this.childNodes.indexOf(ref); n.parentNode = this; if (i < 0) this.childNodes.push(n); else this.childNodes.splice(i, 0, n); return n; }
  removeChild(n) { const i = this.childNodes.indexOf(n); if (i >= 0) this.childNodes.splice(i, 1); return n; }
  remove() { if (this.parentNode) this.parentNode.removeChild(this); }
  replaceWith(n) { const p = this.parentNode; if (!p) return; const i = p.childNodes.indexOf(this); p.childNodes[i] = n; n.parentNode = p; }
  setAttribute(k, v) { this.attrs[k] = String(v); if (k === 'class') this.className = v; if (k === 'id') this.id = v; if (k === 'value') this.value = v; }
  getAttribute(k) { return this.attrs[k] === undefined ? null : this.attrs[k]; }
  addEventListener(t, fn) { (this._events[t] = this._events[t] || []).push(fn); }
  removeEventListener() { }
  dispatch(t, ev) { (this._events[t] || []).forEach(f => f(ev || { target: this, stopPropagation() { } })); }
  click() { this.dispatch('click', { target: this, stopPropagation() { } }); }
  focus() { }
  getContext() { return CTX; }
  toDataURL() { return 'data:image/png;base64,AAAA'; }
  getBoundingClientRect() { return { width: 390, height: 120, top: 0, left: 0 }; }
  get clientWidth() { return 390; }
  get clientHeight() { return 200; }
  _match(sel) {
    return sel.split(',').map(s => s.trim()).some(s => {
      if (!s) return false;
      if (s[0] === '.') return this.classList.contains(s.slice(1));
      if (s[0] === '#') return this.id === s.slice(1);
      if (s.indexOf('[') === 0) return false;
      const tag = s.split('[')[0];
      const attr = s.match(/\[([\w-]+)(?:="([^"]*)")?\]/);
      if (attr) { if (this.getAttribute(attr[1]) === null) return false; if (attr[2] !== undefined && this.getAttribute(attr[1]) !== attr[2]) return false; }
      return this.tagName === tag.toUpperCase();
    });
  }
  _walk(out) { this.childNodes.forEach(c => { if (c.nodeType === 1) { out.push(c); c._walk(out); } }); return out; }
  querySelector(sel) { return this._walk([]).filter(e => e._match(sel))[0] || null; }
  querySelectorAll(sel) { return this._walk([]).filter(e => e._match(sel)); }
}
const CTX = new Proxy({}, { get: (t, k) => (k in t ? t[k] : (typeof k === 'string' && /^[a-z]/.test(k) ? (t[k] = (() => CTX)) : undefined)), set: () => true });
CTX.createLinearGradient = () => ({ addColorStop() { } });
CTX.createRadialGradient = () => ({ addColorStop() { } });
CTX.measureText = () => ({ width: 30 });

const body = new El('body');
const doc = {
  nodeType: 9, body, readyState: 'complete', documentElement: new El('html'), _events: {},
  createElement: t => new El(t),
  createDocumentFragment: () => new El('fragment'),
  createTextNode: t => ({ nodeType: 3, textContent: String(t), parentNode: null }),
  querySelector: s => body.querySelector(s),
  querySelectorAll: s => body.querySelectorAll(s),
  addEventListener(t, fn) { (this._events[t] = this._events[t] || []).push(fn); },
  hidden: false
};
doc.documentElement.dataset = {};
['topbar', 'view', 'tabbar', 'sheet-root', 'toast-root'].forEach(id => { const e = new El('div'); e.id = id; body.appendChild(e); });
const store = {};
const win = {
  document: doc, devicePixelRatio: 2, innerWidth: 390, innerHeight: 844,
  location: { hash: '#/home', search: '', protocol: 'file:', href: 'file:///index.html', replace(h) { this.hash = h; } },
  history: { length: 3, back() { } },
  localStorage: { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } },
  matchMedia: () => ({ matches: false, addEventListener() { }, addListener() { } }),
  addEventListener() { }, removeEventListener() { }, scrollTo() { }, requestAnimationFrame: fn => setTimeout(fn, 0),
  getComputedStyle: () => ({ getPropertyValue: () => '#16203A' }),
  navigator: { vibrate() { }, clipboard: null, userAgent: 'node' },
  setTimeout, clearTimeout, console, TextDecoder, TextEncoder, Blob, URL, crypto, btoa, atob, Image: class { },
  Promise, Math, JSON, Date, Array, Object, String, Number, isFinite, parseFloat, parseInt, RegExp, Error
};
win.window = win; win.globalThis = win; win.self = win;
globalThis.document = doc; globalThis.window = win; globalThis.location = win.location;
globalThis.history = win.history; globalThis.localStorage = win.localStorage;
globalThis.matchMedia = win.matchMedia; globalThis.navigator = win.navigator;
globalThis.getComputedStyle = win.getComputedStyle; globalThis.devicePixelRatio = 2;
globalThis.requestAnimationFrame = win.requestAnimationFrame;
globalThis.scrollTo = () => { }; globalThis.addEventListener = () => { };
globalThis.Image = win.Image; globalThis.self = globalThis; globalThis.Node = El; win.Node = El;

/* ---------- 载入应用 ---------- */
const FILES = ['js/util.js', 'js/illustrations.js', 'js/store.js', 'js/categorize.js', 'js/parsers.js', 'js/charts.js', 'js/report.js',
  'js/ui.js', 'js/views-main.js', 'js/views-plan.js', 'js/views-import.js', 'js/views-report.js', 'js/views-more.js', 'js/app.js'];
FILES.forEach(f => vm.runInThisContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), { filename: f }));
const FA = globalThis.FA, UI = FA.ui, S = FA.store;

let pass = 0, fail = 0;
const errs = [];
function route(hash, label) {
  try {
    win.location.hash = hash;
    UI.render();
    const view = doc.querySelector('#view');
    const nodes = view._walk([]).length;
    if (!view.firstChild) throw new Error('页面为空');
    pass++; console.log('  ✅ ' + label + '  (' + nodes + ' 个节点)');
  } catch (e) { fail++; errs.push(label + ': ' + e.message); console.log('  ❌ ' + label + ' → ' + e.message + '\n     ' + String(e.stack).split('\n')[1]); }
}
console.log('=== 界面渲染烟测 ===');
route('#/home', '首页(空数据)');
const n = FA.demo.seed();
console.log('  · 载入示例数据 ' + n + ' 笔');
UI.applyTheme();
route('#/home', '首页(仪表盘+图表)');
route('#/txns', '流水明细');
route('#/txns?dir=expense', '流水-仅支出');
route('#/plan?tab=budget', '规划-预算');
route('#/plan?tab=goal', '规划-目标');
route('#/plan?tab=debt', '规划-债务');
route('#/plan?tab=sub', '规划-订阅');
route('#/accounts', '账户管理');
route('#/import', '导入页');
route('#/report', '月度报告(全套图表)');
route('#/me', '我的-设置');
route('#/me?tab=rules', '我的-规则库');
route('#/me?tab=privacy', '我的-隐私');
route('#/me?tab=backup', '我的-备份');

console.log('\n=== 交互烟测 ===');
function act(label, fn) {
  try { fn(); pass++; console.log('  ✅ ' + label); }
  catch (e) { fail++; errs.push(label + ': ' + e.message); console.log('  ❌ ' + label + ' → ' + e.message + '\n     ' + String(e.stack).split('\n')[1]); }
}
act('打开交易详情弹层', () => FA.views.txnSheet(S.db.txns[5].id));
act('打开提醒中心', () => FA.views.notificationsSheet());
act('打开高级筛选表单', () => FA.views.filterSheet());
act('打开手动补录表单', () => FA.views.manualSheet());
act('打开分类选择器', () => FA.views.pickCategory('expense', 'food', '快餐', () => { }));
act('打开导出动作菜单', () => UI.actions('导出', [{ icon: 'image', label: '保存长图', onTap() { } }]));
act('记一笔(手动)', () => { const t = FA.parser.manualTxn({ amount: 12.5, direction: 'expense', merchant: '测试商户', accountId: S.db.accounts[0].id, category: 'food' }); S.addTxn(t); FA.cat.autoLabel(S.db); });
act('修改分类并学习', () => { const t = S.db.txns[3]; FA.views.applyCategory(t, 'daily', '便利店'); });
act('生成分享长图', () => { const r = FA.report.build(); const img = FA.report.shareCard(r); if (!img.dataURL) throw new Error('无图'); });
act('导出 CSV', () => { const csv = FA.report.toCSV(null); if (csv.length < 100) throw new Error('CSV 过短'); });
act('设置加密密码(异步)', () => { S.setPasscode('test1234'); });
act('JSON 备份往返', () => { const b = S.exportJSON(); const before = S.db.txns.length; S.importJSON(JSON.stringify({ app: 'FlowAtlas', data: JSON.parse(b).data }), 'replace'); if (S.encrypted) return; if (S.db.txns.length !== before) throw new Error('往返数量不一致 ' + S.db.txns.length + '/' + before); });
act('月度报告统计字段完整', () => {
  const r = FA.report.build();
  ['income', 'expense', 'net', 'savingsRate', 'cats', 'topMerchants', 'trend', 'heat', 'budgets', 'anomalies', 'insights', 'netWorth']
    .forEach(k => { if (r[k] === undefined) throw new Error('缺少字段 ' + k); });
  if (r.trend.length !== 6) throw new Error('趋势应为6个月');
  if (r.heat.length < 28) throw new Error('热力图天数不足');
});

console.log('\n==============================');
console.log('界面烟测：通过 ' + pass + ' / 失败 ' + fail);
if (errs.length) console.log('失败清单:\n - ' + errs.join('\n - '));
console.log('==============================');
process.exit(fail ? 1 : 0);
