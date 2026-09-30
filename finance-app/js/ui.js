/* FlowAtlas · UI 框架：hyperscript / 路由 / 弹层 / 表单 / 提示 */
(function (root) {
  'use strict';
  var FA = root.FA, U = FA.util;
  var UI = (FA.ui = {});
  var doc = root.document;

  /* ---------------- hyperscript ---------------- */
  function setAttrs(el, attrs) {
    if (!attrs) return;
    Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v == null || v === false) return;
      if (k === 'class' || k === 'className') el.className = (el.className ? el.className + ' ' : '') + v;
      else if (k === 'text') el.textContent = v;
      else if (k === 'html') el.innerHTML = v;
      else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
      else if (k === 'dataset') Object.keys(v).forEach(function (d) { el.dataset[d] = v[d]; });
      else if (k.indexOf('on') === 0 && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
      else if (k === 'value') el.value = v;
      else el.setAttribute(k, v);
    });
  }
  function append(el, kid) {
    if (kid == null || kid === false || kid === true) return;
    if (Array.isArray(kid)) { kid.forEach(function (k) { append(el, k); }); return; }
    if (kid instanceof root.Node) { el.appendChild(kid); return; }
    el.appendChild(doc.createTextNode(String(kid)));
  }
  UI.h = function (tag, attrs) {
    var m = /^([a-zA-Z0-9-]*)((?:[.#][\w-]+)*)$/.exec(String(tag));
    var name = (m && m[1]) || 'div';
    var el = doc.createElement(name);
    var rest = (m && m[2]) || '';
    var id = /#([\w-]+)/.exec(rest);
    if (id) el.id = id[1];
    var cls = (rest.match(/\.[\w-]+/g) || []).map(function (c) { return c.slice(1); });
    if (cls.length) el.className = cls.join(' ');
    if (attrs && (attrs.nodeType || typeof attrs === 'string' || Array.isArray(attrs))) {
      for (var i = 1; i < arguments.length; i++) append(el, arguments[i]);
      return el;
    }
    setAttrs(el, attrs);
    for (var j = 2; j < arguments.length; j++) append(el, arguments[j]);
    return el;
  };
  UI.frag = function () {
    var f = doc.createDocumentFragment();
    for (var i = 0; i < arguments.length; i++) append(f, arguments[i]);
    return f;
  };
  UI.clear = function (el) { while (el.firstChild) el.removeChild(el.firstChild); return el; };
  UI.$ = function (sel, r) { return (r || doc).querySelector(sel); };
  UI.$$ = function (sel, r) { return Array.prototype.slice.call((r || doc).querySelectorAll(sel)); };

  /* ---------------- 图标 ---------------- */
  var ICONS = {
    home: 'M3 10.6 12 3.3l9 7.3V20a1 1 0 0 1-1 1h-4.6v-6H8.6v6H4a1 1 0 0 1-1-1z',
    list: 'M4 6h16M4 12h16M4 18h10',
    plus: 'M12 5v14M5 12h14',
    chart: 'M4 20V10m5 10V4m5 16v-7m5 7V8',
    user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8m0 2.2c-3.9 0-7 2.1-7 4.8v1h14v-1c0-2.7-3.1-4.8-7-4.8',
    search: 'M11 4.5a7 7 0 1 0 0 14 7 7 0 0 0 0-14m5.2 12.2L21 21.5',
    back: 'M15 4.5 8 12l7 7.5',
    close: 'M6 6l12 12M18 6 6 18',
    chevron: 'M9.5 5 16 12l-6.5 7',
    edit: 'M4 20.2h4.2L20.4 8 16.2 3.8 4 16z',
    trash: 'M5 7h14M9.5 7V4.6h5V7m-8 0 1 13h9l1-13',
    target: 'M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17m0 4.2a4.3 4.3 0 1 0 0 8.6 4.3 4.3 0 0 0 0-8.6m0 3.4a.9.9 0 1 0 0 1.8.9.9 0 0 0 0-1.8',
    card: 'M3 6.5h18v11H3zM3 10.5h18M6.5 15h3',
    repeat: 'M5 10a5 5 0 0 1 5-5h5m0 0-2.2-2M15 5l-2.2 2M19 14a5 5 0 0 1-5 5H9m0 0 2.2 2M9 19l2.2-2',
    bell: 'M6.5 17.5V11a5.5 5.5 0 1 1 11 0v6.5l1.6 1.6H4.9zM10 21.2h4',
    lock: 'M6 11h12v9.5H6zM9 11V8a3 3 0 0 1 6 0v3',
    download: 'M12 4v11m0 0-4-4m4 4 4-4M5 20h14',
    upload: 'M12 20V9m0 0-4 4m4-4 4 4M5 4h14',
    camera: 'M4 8.2h3.2L9 6h6l1.8 2.2H20v11H4zM12 10.4a3.2 3.2 0 1 0 0 6.4 3.2 3.2 0 0 0 0-6.4',
    image: 'M4 5h16v14H4zM4 15.5l4-4 4 4 2-2 6 6',
    check: 'M5 12.8 9 17 19 6.6',
    calendar: 'M4 6.5h16V21H4zM8 3v4M16 3v4M4 11h16',
    filter: 'M4 5h16l-6.2 7.4V20l-3.6-2v-5.6z',
    tag: 'M3.5 12 12 3.5h8.5V12L12 20.5zM16 8.2h.01',
    sparkle: 'M12 3.5l1.9 5.6 5.6 1.9-5.6 1.9L12 18.5l-1.9-5.6L4.5 11l5.6-1.9z',
    more: 'M6 12h.01M12 12h.01M18 12h.01',
    wallet: 'M3.5 7h15a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-15zM3.5 7V6a2 2 0 0 1 2-2h11M17 12.8h.01',
    swap: 'M7 8h13l-3-3M17 16H4l3 3',
    eye: 'M2.5 12S6 6.5 12 6.5 21.5 12 21.5 12 18 17.5 12 17.5 2.5 12 2.5 12m9.5-2.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5',
    eyeoff: 'M4 4l16 16M9.5 9.7A2.5 2.5 0 0 0 12 14.5M6.4 6.7C4.2 8.3 2.5 12 2.5 12s3.5 5.5 9.5 5.5c1.5 0 2.8-.4 3.9-1M14.6 5.3C13.8 5.1 12.9 5 12 5',
    alert: 'M12 3.5 21 20H3zM12 10v4m0 3h.01',
    doc: 'M6 3.5h8L19 8.5V20.5H6zM14 3.5V9h5',
    link: 'M9.5 14.5 14.5 9.5M8 8l1.8-1.8a3.8 3.8 0 1 1 5.4 5.4L13.4 13.4M10.6 9.6 8.8 11.4a3.8 3.8 0 1 0 5.4 5.4L16 15',
    split: 'M12 4v7m0 0-6 6m6-6 6 6',
    grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z'
  };
  UI.icon = function (name, size) {
    var d = ICONS[name] || ICONS.doc;
    var s = size || 22;
    return UI.h('svg', { class: 'ic', viewBox: '0 0 24 24', width: s, height: s, fill: 'none', stroke: 'currentColor', 'stroke-width': 1.8, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, UI.h('path', { d: d }));
  };

  /* ---------------- 金额 / 通用片段 ---------------- */
  UI.hidden = function () { return !!(FA.store.db.settings && FA.store.db.settings.hideAmount); };
  UI.money = function (v, opt) {
    if (UI.hidden() && !(opt && opt.force)) return '¥ ••••';
    return U.money(v, opt);
  };
  UI.moneyNode = function (v, opt) {
    opt = opt || {};
    var cls = 'money ' + (opt.cls || '');
    if (opt.signed) {
      var s = v > 0 ? '+' : v < 0 ? '-' : '';
      return UI.h('span', { class: cls + ' ' + (v > 0 ? 'pos' : v < 0 ? 'neg' : '') }, s + UI.money(Math.abs(v), opt));
    }
    return UI.h('span', { class: cls }, UI.money(v, opt));
  };
  UI.dirClass = function (t) { return t.direction === 'income' ? 'pos' : t.direction === 'transfer' ? 'dim' : ''; };
  UI.dirSign = function (t) { return t.direction === 'income' ? '+' : t.direction === 'expense' ? '-' : ''; };

  /* ---------------- 插图 ---------------- */
  UI.illust = function (name, size, cls) {
    var el = FA.illust.img(name, size);
    if (cls) el.className += ' ' + cls;
    return el;
  };
  /** 分类插图（数据里的分类 id 与插图名一一对应） */
  UI.catIllust = function (catId, size) {
    return UI.illust(FA.illust.svg[catId] ? catId : 'other', size);
  };
  /** 区块标题：左侧可带插图 */
  UI.sectionTitle = function (title, right, illust) {
    var left = illust
      ? h('span.sec-head', {}, UI.illust(illust, 26), h('span', {}, title))
      : h('span', {}, title);
    return h('div.section-title', {}, left, right || null);
  };

  UI.catChip = function (catId, size) {
    var c = FA.store.cat(catId);
    return UI.h('span', { class: 'cat-chip', style: { background: c.color + '22', color: c.color, fontSize: (size || 13) + 'px' } }, c.icon + ' ' + c.name);
  };

  /* ---------------- 提示 / 弹层 ---------------- */
  UI.toast = function (msg, type) {
    var r = UI.$('#toast-root') || doc.body;
    var el = UI.h('div.toast' + (type ? '.' + type : ''), {}, msg);
    r.appendChild(el);
    setTimeout(function () { el.classList.add('out'); setTimeout(function () { el.remove(); }, 260); }, type === 'error' ? 3200 : 2000);
  };

  UI.sheet = function (opt) {
    var rootEl = UI.$('#sheet-root');
    var closed = false;
    var panel = UI.h('div.sheet-panel' + (opt.size === 'full' ? '.full' : ''), {},
      UI.h('div.sheet-head', {},
        UI.h('div.sheet-grab'),
        UI.h('div.sheet-title-row', {},
          UI.h('div', {}, UI.h('div.sheet-title', {}, opt.title || ''),
            opt.subtitle ? UI.h('div.sheet-sub', {}, opt.subtitle) : null),
          UI.h('button.icon-btn', { onclick: close, 'aria-label': '关闭' }, UI.icon('close', 20)))),
      UI.h('div.sheet-body', {}, opt.body));
    var overlay = UI.h('div.sheet-overlay', { onclick: function (e) { if (e.target === overlay && opt.dismissable !== false) close(); } }, panel);
    rootEl.appendChild(overlay);
    rootEl.classList.add('active');
    requestAnimationFrame(function () { overlay.classList.add('in'); });
    function close() {
      if (closed) return; closed = true;
      overlay.classList.remove('in');
      setTimeout(function () { overlay.remove(); if (!rootEl.children.length) rootEl.classList.remove('active'); }, 240);
      if (opt.onClose) opt.onClose();
    }
    panel.close = close;
    if (opt.onMount) opt.onMount(panel, close);
    return { el: panel, close: close };
  };

  UI.confirm = function (msg, opt) {
    opt = opt || {};
    return new Promise(function (res) {
      var s = UI.sheet({
        title: opt.title || '请确认', body: UI.h('div.confirm-body', {}, UI.h('p', {}, msg)),
        onMount: function (panel, close) {
          panel.querySelector('.sheet-body').appendChild(UI.h('div.sheet-actions', {},
            UI.h('button.btn.ghost', { onclick: function () { close(); res(false); } }, opt.cancelText || '取消'),
            UI.h('button.btn' + (opt.danger ? '.danger' : '.primary'), { onclick: function () { close(); res(true); } }, opt.okText || '确定')));
        }
      });
    });
  };

  /* ---------------- 通用表单弹层 ---------------- */
  UI.form = function (opt) {
    return new Promise(function (res) {
      var fields = opt.fields.map(function (f) { return Object.assign({}, f); });
      var body = UI.h('div.form');
      fields.forEach(function (f) {
        if (f.type === 'hidden') return;
        var wrap = UI.h('label.field' + (f.half ? '.half' : ''));
        wrap.appendChild(UI.h('span.field-label', {}, f.label + (f.required ? ' *' : '')));
        var input;
        if (f.type === 'select') {
          input = UI.h('select.field-input');
          (f.options || []).forEach(function (o) {
            input.appendChild(UI.h('option', { value: o.v, selected: String(o.v) === String(f.value) }, o.label));
          });
        } else if (f.type === 'textarea') {
          input = UI.h('textarea.field-input', { rows: 3, placeholder: f.placeholder || '' }, f.value || '');
        } else if (f.type === 'chips') {
          input = UI.h('div.chips-input');
          var sel = Array.isArray(f.value) ? f.value.slice() : [];
          (f.options || []).forEach(function (o) {
            var on = sel.indexOf(o.v) >= 0;
            var chip = UI.h('button.chip' + (on ? '.on' : ''), {
              type: 'button', onclick: function () {
                var i = sel.indexOf(o.v);
                if (i >= 0) { sel.splice(i, 1); chip.classList.remove('on'); }
                else { sel.push(o.v); chip.classList.add('on'); }
              }
            }, (o.icon ? o.icon + ' ' : '') + o.label);
            input.appendChild(chip);
          });
          f._get = function () { return sel; };
        } else if (f.type === 'switch') {
          input = UI.h('button.switch' + (f.value ? '.on' : ''), { type: 'button', onclick: function () { input.classList.toggle('on'); } }, UI.h('span.switch-knob'));
          f._get = function () { return input.classList.contains('on'); };
        } else {
          input = UI.h('input.field-input', {
            type: f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : f.type === 'time' ? 'time' : 'text',
            inputmode: f.type === 'number' ? 'decimal' : null,
            step: f.step || (f.type === 'number' ? '0.01' : null),
            placeholder: f.placeholder || '', value: f.value == null ? '' : f.value
          });
        }
        f._el = input;
        wrap.appendChild(input);
        if (f.hint) wrap.appendChild(UI.h('span.field-hint', {}, f.hint));
        body.appendChild(wrap);
      });
      var s = UI.sheet({
        title: opt.title, subtitle: opt.subtitle, size: opt.size,
        body: body,
        onMount: function (panel, close) {
          panel.querySelector('.sheet-body').appendChild(UI.h('div.sheet-actions', {},
            UI.h('button.btn.ghost', { onclick: function () { close(); res(null); } }, '取消'),
            UI.h('button.btn.primary', {
              onclick: function () {
                var vals = {}, bad = null;
                fields.forEach(function (f) {
                  var v = f._get ? f._get() : (f._el ? f._el.value : f.value);
                  if (f.type === 'number') v = v === '' ? null : parseFloat(v);
                  if (f.required && (v === '' || v == null)) bad = bad || f.label;
                  vals[f.key] = v;
                });
                if (bad) { UI.toast('请填写：' + bad, 'error'); return; }
                close(); res(vals);
              }
            }, opt.submitText || '保存')));
          var first = body.querySelector('input,select,textarea');
          if (first && opt.autofocus !== false) setTimeout(function () { try { first.focus(); } catch (e) { } }, 260);
        }
      });
    });
  };

  /* 底部动作菜单 */
  UI.actions = function (title, items) {
    var body = UI.h('div.action-list');
    items.forEach(function (it) {
      if (!it) return;
      body.appendChild(UI.h('button.action-item' + (it.danger ? '.danger' : ''), {
        onclick: function () { close(); setTimeout(function () { it.onTap && it.onTap(); }, 120); }
      }, UI.h('span.action-icon', {}, it.icon ? UI.icon(it.icon) : it.emoji || ''), UI.h('span', {}, it.label),
        it.hint ? UI.h('span.action-hint', {}, it.hint) : null));
    });
    var s = UI.sheet({ title: title, body: body });
    var close = s.close;
    return s;
  };

  /* ---------------- 长按 ---------------- */
  UI.longPress = function (el, fn, ms) {
    var timer = null, moved = false;
    var start = function () { moved = false; timer = setTimeout(function () { if (!moved) { U.vibrate(12); fn(); } }, ms || 480); };
    var cancel = function () { clearTimeout(timer); };
    el.addEventListener('touchstart', start, { passive: true });
    el.addEventListener('touchmove', function () { moved = true; cancel(); }, { passive: true });
    el.addEventListener('touchend', cancel);
    el.addEventListener('touchcancel', cancel);
    el.addEventListener('mousedown', start);
    el.addEventListener('mouseup', cancel);
    el.addEventListener('mouseleave', cancel);
  };

  /* ---------------- 路由 ---------------- */
  var routes = {}, current = null;
  UI.register = function (name, def) { routes[name] = def; };
  function parseHash() {
    var m = String(location.hash || '').replace(/^#\/?/, '');
    var qi = m.indexOf('?'), params = {};
    var name = qi >= 0 ? m.slice(0, qi) : m;
    var qs = qi >= 0 ? m.slice(qi + 1) : '';
    qs.split('&').filter(Boolean).forEach(function (kv) {
      var i = kv.indexOf('=');
      params[decodeURIComponent(kv.slice(0, i))] = decodeURIComponent(kv.slice(i + 1));
    });
    return { name: name || 'home', params: params };
  }
  UI.go = function (name, params, replace) {
    var qs = Object.keys(params || {}).filter(function (k) { return params[k] != null && params[k] !== ''; })
      .map(function (k) { return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]); }).join('&');
    var hash = '#/' + name + (qs ? '?' + qs : '');
    if (location.hash === hash) { UI.render(); return; }
    if (replace) location.replace(hash); else location.hash = hash;
  };
  UI.back = function () { if (history.length > 1) history.back(); else UI.go('home'); };

  UI.render = function () {
    var r = parseHash(), def = routes[r.name] || routes.home;
    if (current && current.unmount) { try { current.unmount(); } catch (e) { } }
    var view = UI.$('#view');
    UI.clear(view);
    UI._chartQueue = [];
    window.scrollTo(0, 0);
    var node;
    try {
      node = def.render(r.params);
    } catch (e) {
      console.error(e);
      node = UI.h('div.page', {}, UI.h('div.empty', {}, UI.h('div.empty-emoji', {}, '😵'), UI.h('p', {}, '页面出错：' + e.message)));
    }
    view.appendChild(node);
    UI.buildTopbar(def, r.params);
    UI.buildTabbar(def.tab);
    document.body.dataset.page = r.name;
    current = def;
    if (def.mount) def.mount(view, r.params);
    UI.renderCharts();
  };
  /* 图表需在 DOM 插入后才能测量尺寸，统一延迟绘制 */
  UI._chartQueue = [];
  UI.deferChart = function (fn) { UI._chartQueue.push(fn); };
  UI.renderCharts = function () {
    var q = UI._chartQueue; UI._chartQueue = [];
    q.forEach(function (fn) { try { fn(); } catch (e) { console.warn('chart', e); } });
  };
  window.addEventListener('hashchange', UI.render);

  UI.buildTopbar = function (def, params) {
    var bar = UI.$('#topbar');
    UI.clear(bar);
    if (def.header === 'none') { bar.style.display = 'none'; return; }
    bar.style.display = '';
    var actions = typeof def.actions === 'function' ? def.actions(params) : (def.actions || []);
    bar.appendChild(UI.h('div.topbar-inner', {},
      def.tab && def.tab !== 'home' ? null : UI.h('div.topbar-title', {},
        UI.h('div.topbar-greet', {}, def.greet || ''),
        UI.h('div.topbar-name', {}, typeof def.title === 'function' ? def.title(params) : (def.title || ''))),
      def.tab && def.tab !== 'home' ? UI.h('div.topbar-title.simple', {}, UI.h('div.topbar-name', {}, typeof def.title === 'function' ? def.title(params) : (def.title || ''))) : null,
      UI.h('div.topbar-actions', {}, actions.map(function (a) {
        return UI.h('button.icon-btn', { onclick: a.onTap, 'aria-label': a.label || '' }, a.emoji ? UI.h('span', {}, a.emoji) : UI.icon(a.icon || 'more', 21));
      }), UI.h('button.icon-btn.avatar', { onclick: function () { UI.go('me'); }, 'aria-label': '我的' },
        UI.h('span', {}, FA.store.db.settings.nickname ? FA.store.db.settings.nickname.slice(0, 1) : '我')))));
  };

  var TABS = [
    { id: 'home', label: '首页', icon: 'home' },
    { id: 'txns', label: '流水', icon: 'list' },
    { id: 'import', label: '', icon: 'plus', fab: true },
    { id: 'plan', label: '规划', icon: 'target' },
    { id: 'report', label: '报告', icon: 'chart' }
  ];
  UI.buildTabbar = function (active) {
    var bar = UI.$('#tabbar');
    UI.clear(bar);
    TABS.forEach(function (t) {
      if (t.fab) {
        bar.appendChild(UI.h('button.tab.fab', { onclick: function () { UI.go('import'); }, 'aria-label': '导入账单' }, UI.icon('plus', 28)));
        return;
      }
      bar.appendChild(UI.h('button.tab' + (active === t.id ? '.on' : ''), { onclick: function () { UI.go(t.id); } },
        UI.icon(t.icon, 22), UI.h('span', {}, t.label)));
    });
  };

  /* ---------------- 常用片段 ---------------- */
  UI.empty = function (emoji, title, desc, action) {
    var art = (FA.illust && FA.illust.svg[emoji]) ? UI.illust(emoji, 92) : UI.h('div.empty-emoji', {}, emoji || '📭');
    return UI.h('div.empty', {}, art,
      UI.h('div.empty-title', {}, title || '暂无数据'),
      desc ? UI.h('div.empty-desc', {}, desc) : null,
      action ? UI.h('button.btn.primary.mt', { onclick: action.onTap }, action.label) : null);
  };
  UI.card = function (cls, kids) {
    return UI.h('div.card' + (cls ? '.' + cls : ''), {}, kids);
  };
  UI.sectionTitle = function (title, right) {
    return UI.h('div.section-title', {}, UI.h('span', {}, title), right || null);
  };
  UI.progressBar = function (pct, color) {
    return UI.h('div.pbar', {}, UI.h('div.pbar-fill', { style: { width: Math.min(100, Math.max(0, pct * 100)) + '%', background: color || 'var(--accent)' } }));
  };
  UI.avatar = function (emoji, color, size) {
    return UI.h('span.avatar-ic', { style: { background: (color || '#888') + '22', color: color || '#888', width: (size || 40) + 'px', height: (size || 40) + 'px', fontSize: ((size || 40) * 0.5) + 'px' } }, emoji || '📦');
  };
  UI.monthPicker = function (ym, onChange) {
    var sel = UI.h('select.month-picker');
    FA.report.availableMonths().forEach(function (m) {
      sel.appendChild(UI.h('option', { value: m, selected: m === ym }, U.monthLabel(m)));
    });
    sel.addEventListener('change', function () { onChange(sel.value); });
    return sel;
  };
  UI.relTime = function (ts) {
    var d = (Date.now() - ts) / 1000;
    if (d < 60) return '刚刚';
    if (d < 3600) return Math.floor(d / 60) + ' 分钟前';
    if (d < 86400) return Math.floor(d / 3600) + ' 小时前';
    return Math.floor(d / 86400) + ' 天前';
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
