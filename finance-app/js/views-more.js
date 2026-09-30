/* FlowAtlas · 我的：设置 / 隐私 / 规则 / 备份 */
(function (root) {
  'use strict';
  var FA = root.FA, U = FA.util, UI = FA.ui, S = FA.store, h = UI.h;
  var V = FA.views;

  FA.ui.register('me', {
    tab: 'home', title: '我的与设置',
    render: function (p) {
      var tab = p.tab || 'main';
      var wrap = h('div.page.me');
      var set = S.db.settings;
      /* 头部资料卡 */
      wrap.appendChild(h('div.card.profile-card', {},
        h('div.profile-avatar', {}, set.nickname ? set.nickname.slice(0, 1) : '我'),
        h('div.profile-mid', {},
          h('div.profile-name', { onclick: function () { editProfile(); } }, set.nickname || '点击设置昵称'),
          h('div.profile-sub', {}, S.db.txns.length + ' 笔流水 · ' + S.db.accounts.length + ' 个账户 · 数据仅存本机')),
        h('button.btn.small.ghost', { onclick: editProfile }, UI.icon('edit', 15) + ' 编辑')));

      if (tab === 'rules') return rulesTab(wrap);
      if (tab === 'privacy') return privacyTab(wrap);
      if (tab === 'backup') return backupTab(wrap);

      /* 统计 */
      var nw = S.netWorth();
      wrap.appendChild(h('div.stat-grid', {},
        statCell('净资产', UI.money(nw.net)), statCell('累计交易', S.db.txns.length + ' 笔'),
        statCell('使用天数', Math.max(1, Math.ceil((Date.now() - S.db.createdAt) / 86400000)) + ' 天'),
        statCell('存储占用', (JSON.stringify(S.db).length / 1024).toFixed(0) + ' KB')));

      wrap.appendChild(UI.sectionTitle('数据与账户'));
      wrap.appendChild(setGroup([
        { icon: 'wallet', label: '账户与数据源', desc: S.db.accounts.length + ' 个账户', onTap: function () { UI.go('accounts'); } },
        { icon: 'doc', label: '导入历史', desc: (S.db.imports || []).length + ' 次', onTap: function () { UI.go('import'); }, keep: true },
        { icon: 'sparkle', label: '分类规则与学习', desc: FA.cat.RULES.length + ' 组规则 · ' + (S.db.corrections || []).length + ' 条学习记录', onTap: function () { UI.go('me', { tab: 'rules' }); } },
        { icon: 'upload', label: '备份 / 恢复 / 导出', desc: S.encrypted ? '已开启本地加密' : '未加密', onTap: function () { UI.go('me', { tab: 'backup' }); } }
      ]));

      wrap.appendChild(UI.sectionTitle('偏好设置'));
      wrap.appendChild(setGroup([
        { icon: 'eyeoff', label: '隐藏金额', desc: set.hideAmount ? '已开启' : '关闭', toggle: !!set.hideAmount, onToggle: function (v) { set.hideAmount = v; S.save(true); UI.render(); } },
        { icon: 'bell', label: '提醒通知', desc: set.notify ? '账单到期 / 超支 / 月报' : '已关闭', toggle: !!set.notify, onToggle: function (v) { set.notify = v; S.save(true); } },
        { icon: 'alert', label: '预算预警阈值', desc: Math.round((set.alertPct || 80)) + '% 时提醒', onTap: function () {
          UI.form({ title: '预算预警阈值', fields: [{ key: 'v', label: '百分比', type: 'number', value: set.alertPct || 80 }] }).then(function (r) { if (r) { set.alertPct = r.v; S.save(true); UI.render(); } });
        } },
        { icon: 'image', label: '首页封面图', desc: S.db.settings.coverId ? '已自定义（点击更换或移除）' : '默认插画，可换成自己的照片', onTap: function () { coverSheet(); } },
        { icon: 'repeat', label: '主题外观', desc: { auto: '跟随系统', light: '浅色', dark: '深色' }[set.theme || 'auto'], onTap: function () {
          UI.actions('主题外观', [
            { icon: 'check', label: '跟随系统', onTap: function () { set.theme = 'auto'; S.save(true); UI.applyTheme(); UI.toast('已切换'); } },
            { icon: 'check', label: '浅色', onTap: function () { set.theme = 'light'; S.save(true); UI.applyTheme(); UI.toast('已切换'); } },
            { icon: 'check', label: '深色（丰富的深色主题）', onTap: function () { set.theme = 'dark'; S.save(true); UI.applyTheme(); UI.toast('已切换'); } }
          ]);
        } }
      ]));

      wrap.appendChild(UI.sectionTitle('隐私与安全'));
      wrap.appendChild(setGroup([
        { icon: 'lock', label: '本地加密密码', desc: S.encrypted ? '已开启（AES-256-GCM）' : '未设置', onTap: function () { UI.go('me', { tab: 'privacy' }); } },
        { icon: 'trash', label: '删除全部数据', desc: '不可恢复，请先备份', danger: true, onTap: function () { UI.go('me', { tab: 'privacy' }); } }
      ]));

      wrap.appendChild(UI.sectionTitle('关于'));
      wrap.appendChild(setGroup([
        { icon: 'sparkle', label: 'FlowAtlas 流水图鉴', desc: 'v1.0 · 本地优先 · 不联网、不上传、无广告', onTap: aboutSheet },
        { icon: 'link', label: '安装到手机桌面', desc: '像原生 App 一样使用', onTap: installSheet }
      ]));
      return wrap;
    }
  });

  function statCell(k, v) { return h('div.stat-cell', {}, h('div.stat-k', {}, k), h('div.stat-v', {}, v)); }
  function setGroup(items) {
    var card = h('div.card.set-group');
    items.forEach(function (it) {
      var row = h('div.set-row' + (it.danger ? '.danger' : ''), {
        onclick: function () { if (!it.toggle) it.onTap && it.onTap(); }
      },
        h('span.set-ic', {}, UI.icon(it.icon, 19)),
        h('div.set-mid', {}, h('div.set-label', {}, it.label), it.desc ? h('div.set-desc', {}, it.desc) : null),
        it.toggle != null
          ? h('button.switch' + (it.toggle ? '.on' : ''), { onclick: function (e) { e.stopPropagation(); var v = !it.toggle; it.toggle = v; it.onToggle(v); } }, h('span.switch-knob'))
          : UI.icon('chevron', 17));
      card.appendChild(row);
    });
    return card;
  }
  function coverSheet() {
    UI.actions('首页封面图', [
      { icon: 'image', label: '从相册选择照片', hint: '会压缩到 1080px 后本地保存', onTap: function () {
        var input = document.createElement('input');
        input.type = 'file'; input.accept = 'image/*';
        input.addEventListener('change', function () {
          var f = input.files[0]; if (!f) return;
          UI.toast('正在处理图片…');
          U.downscale(f, 1080, 0.74).then(function (img) {
            if (!img) { UI.toast('图片读取失败', 'error'); return; }
            S.db.settings.coverId = S.putMedia(U.uid('cover'), img.url);
            S.save(true); UI.toast('封面已更新'); UI.go('home');
          });
        });
        document.body.appendChild(input); input.click();
        setTimeout(function () { input.remove(); }, 1500);
      } },
      S.db.settings.coverId ? { icon: 'trash', label: '恢复默认插画', danger: true, onTap: function () {
        S.db.settings.coverId = null; S.save(true); UI.toast('已恢复默认'); UI.render();
      } } : null
    ].filter(Boolean));
  }
  function editProfile() {
    UI.form({ title: '个人资料', fields: [{ key: 'nickname', label: '昵称', value: S.db.settings.nickname || '', placeholder: '会显示在首页问候语' }] }).then(function (v) {
      if (!v) return;
      S.db.settings.nickname = v.nickname; S.save(true); UI.render();
    });
  }

  /* ---------------- 规则 ---------------- */
  function rulesTab(wrap) {
    wrap.appendChild(UI.sectionTitle('关键词规则库', h('span.dim', {}, FA.cat.RULES.length + ' 组 / ' + FA.cat.RULES.reduce(function (a, r) { return a + r.k.length; }, 0) + ' 个关键词')));
    var hits = U.groupBy(S.db.txns, function (t) { return t.auto && t.auto.source; });
    wrap.appendChild(h('div.stat-grid', {},
      statCell('规则命中', (hits.rule || []).length + ' 笔'),
      statCell('模型识别', (hits.model || []).length + ' 笔'),
      statCell('记忆商户', (S.db.corrections || []).length + ' 个'),
      statCell('待确认', (hits.fallback || []).length + ' 笔')));
    var card = h('div.card.rule-list');
    FA.cat.RULES.slice(0, 40).forEach(function (r) {
      card.appendChild(h('div.rule-row', {},
        UI.avatar(S.cat(r.c).icon, S.cat(r.c).color, 34),
        h('div.rule-mid', {}, h('div', {}, S.catName(r.c) + (r.s ? ' / ' + r.s : '')),
          h('div.rule-kw', {}, r.k.slice(0, 6).join('、') + (r.k.length > 6 ? ' 等 ' + r.k.length + ' 个' : '')))));
    });
    wrap.appendChild(card);

    wrap.appendChild(UI.sectionTitle('已学习的商户别名', (S.db.corrections || []).length ? h('span.link', { onclick: function () {
      UI.confirm('清空全部学习记录？自动归类会退回规则库判断。').then(function (ok) { if (ok) { S.db.corrections = []; S.save(true); UI.render(); } });
    } }, '清空') : null));
    wrap.appendChild((S.db.corrections || []).length ? h('div.card', {}, U.sortBy(S.db.corrections, function (c) { return c.n; }, true).map(function (c) {
      return h('div.corr-row', {},
        h('span.corr-key', {}, c.key),
        h('span.corr-arrow', {}, '→'),
        UI.catChip(c.category),
        h('span.dim', {}, c.n + ' 次'));
    })) : UI.empty('rule', '还没有学习记录', '在流水里修改任意一笔的分类，这里会自动记住该商户'));
    return wrap;
  }

  /* ---------------- 隐私 ---------------- */
  function privacyTab(wrap) {
    wrap.appendChild(h('div.card.privacy-note', {},
      h('div.mod-banner', {}, UI.illust('privacy', 54), h('div', {}, h('div.mod-banner-t', {}, '本地优先，数据不出设备'), h('div.mod-banner-d', {}, '无账号 · 无联网 · 无上传'))),
      h('div.pn-title', {}, '🔐 加密存储'),
      h('p', {}, 'FlowAtlas 不需要注册、不联网、不上传。所有账单解析、分类、统计都在你的手机浏览器里完成。'),
      h('p', {}, '开启密码后，数据会用 PBKDF2(15万次) 派生密钥 + AES-256-GCM 加密后保存在本机，即使别人拿到手机也难以读取。'),
      h('p.dim', {}, '⚠️ 密码一旦遗忘无法找回，请务必先导出备份文件。')));
    if (!S.encrypted) {
      wrap.appendChild(h('button.btn.block.primary', { onclick: function () { setPass(); } }, UI.icon('lock', 18) + ' 设置加密密码'));
    } else {
      wrap.appendChild(h('div.card', {}, h('div.set-row', {}, h('span.set-ic', {}, '✅'), h('div.set-mid', {}, h('div.set-label', {}, '本地加密已开启'), h('div.set-desc', {}, 'AES-256-GCM · 密钥由密码派生')))));
      wrap.appendChild(h('div.row-btns', {},
        h('button.btn.ghost.grow', { onclick: function () { setPass(true); } }, '修改密码'),
        h('button.btn.ghost.grow', { onclick: function () { S.save(true); UI.toast('已保存并锁定'); location.reload(); } }, '立即保存并锁定'),
        h('button.btn.danger', { onclick: function () {
          UI.form({ title: '关闭加密', subtitle: '请输入当前密码', fields: [{ key: 'p', label: '密码', type: 'password' }] }).then(function (v) {
            if (!v) return;
            S.removePasscode(v.p).then(function () { UI.toast('已关闭加密'); UI.render(); }).catch(function () { UI.toast('密码错误', 'error'); });
          });
        } }, '关闭')));
    }
    wrap.appendChild(UI.sectionTitle('危险操作'));
    wrap.appendChild(setGroup([
      { icon: 'trash', label: '清空所有交易与账户数据', desc: '保留设置与规则', danger: true, onTap: function () {
        UI.confirm('将删除全部交易、预算、目标、债务、订阅数据，且不可恢复。建议先导出备份。', { danger: true, okText: '继续' }).then(function (ok) {
          if (!ok) return;
          UI.confirm('最后确认：真的要清空吗？', { danger: true, okText: '清空' }).then(function (ok2) {
            if (!ok2) return;
            ['txns', 'budgets', 'goals', 'debts', 'subs', 'imports', 'corrections'].forEach(function (k) { S.db[k] = []; });
            S.save(true); UI.toast('已清空'); UI.go('home');
          });
        });
      } },
      { icon: 'alert', label: '恢复出厂（删除一切）', desc: '包含账户、设置、密码', danger: true, onTap: function () {
        UI.confirm('将彻底删除本机上 FlowAtlas 的所有数据，无法恢复。', { danger: true, okText: '彻底删除' }).then(function (ok) {
          if (ok) { S.reset(); location.hash = '#/home'; location.reload(); }
        });
      } }
    ]));
    return wrap;
  }
  function setPass(isChange) {
    UI.form({
      title: isChange ? '修改密码' : '设置加密密码',
      subtitle: '至少 6 位，请牢记（无法找回）',
      fields: [
        { key: 'p1', label: '新密码', type: 'password', required: true },
        { key: 'p2', label: '确认密码', type: 'password', required: true }
      ]
    }).then(function (v) {
      if (!v) return;
      if (String(v.p1).length < 6) { UI.toast('密码至少 6 位', 'error'); return; }
      if (v.p1 !== v.p2) { UI.toast('两次输入不一致', 'error'); return; }
      var go = function () { S.setPasscode(v.p1).then(function () { UI.toast('🔒 已开启本地加密'); UI.render(); }); };
      if (S.encrypted) S.removePasscode().then(go); else go();
    });
  }

  /* ---------------- 备份 ---------------- */
  function backupTab(wrap) {
    var size = (JSON.stringify(S.db).length / 1024).toFixed(0);
    wrap.appendChild(h('div.card.backup-note', {},
      h('div.mod-banner', {}, UI.illust('backup', 54), h('div', {}, h('div.mod-banner-t', {}, '数据在你手里'), h('div.mod-banner-d', {}, '一键导出，随时迁机'))),
      h('div.pn-title', {}, '💾 备份说明'),
      h('p', {}, '当前账本 ' + S.db.txns.length + ' 笔交易，约 ' + size + ' KB。导出的 JSON 备份包含全部账户、预算、目标、债务、订阅与学习记录，可在新手机上一键恢复。')));
    wrap.appendChild(h('div.row-btns.col', {},
      h('button.btn.block.primary', { onclick: function () {
        U.download('FlowAtlas-backup-' + U.ymd(Date.now()) + '.json', S.exportJSON(), 'application/json');
        UI.toast('备份文件已导出');
      } }, UI.icon('download', 17) + ' 导出 JSON 备份（推荐）'),
      h('button.btn.block', { onclick: function () {
        U.download('FlowAtlas-all-' + U.ymd(Date.now()) + '.csv', FA.report.toCSV(null), 'text/csv;charset=utf-8');
        UI.toast('已导出全部流水 CSV');
      } }, UI.icon('doc', 17) + ' 导出全部流水 CSV'),
      h('button.btn.block', { onclick: function () { restoreFlow(); } }, UI.icon('upload', 17) + ' 从备份恢复 / 合并'),
      h('button.btn.block.ghost', { onclick: function () { dataSourceSheet(); } }, UI.icon('link', 17) + ' 查看原始数据')));

    if ((S.db.imports || []).length) {
      wrap.appendChild(UI.sectionTitle('最近导入'));
      wrap.appendChild(h('div.card', {}, S.db.imports.slice(-6).reverse().map(function (it) {
        return h('div.bs-row', {}, h('span', {}, (P2().SOURCE_META[it.source] || {}).icon + ' ' + (it.files || []).join('、')), h('span.dim', {}, U.fmtDate(it.at, 'md') + ' +' + it.added));
      })));
    }
    return wrap;
  }
  function P2() { return FA.parser; }
  function restoreFlow() {
    var input = h('input', { type: 'file', accept: '.json', style: { display: 'none' } });
    input.addEventListener('change', function () {
      var f = input.files[0];
      if (!f) return;
      f.text().then(function (txt) {
        UI.actions('如何恢复？', [
          { icon: 'plus', label: '合并导入（保留现有数据）', onTap: function () {
            S.importJSON(txt, 'merge').then(function (n) { UI.toast('合并完成，共 ' + n + ' 笔'); UI.render(); }).catch(function (e) { UI.toast(e.message, 'error'); });
          } },
          { icon: 'alert', label: '覆盖恢复（替换现有数据）', danger: true, onTap: function () {
            UI.confirm('将用备份文件完全替换当前数据，确定？', { danger: true, okText: '覆盖恢复' }).then(function (ok) {
              if (!ok) return;
              S.importJSON(txt, 'replace').then(function () { UI.toast('已恢复'); location.reload(); }).catch(function (e) { UI.toast(e.message, 'error'); });
            });
          } }
        ]);
      });
    });
    document.body.appendChild(input);
    input.click();
    setTimeout(function () { input.remove(); }, 1000);
  }
  function dataSourceSheet() {
    var json = S.exportJSON();
    UI.sheet({
      title: '原始数据（只读）', subtitle: '你可以复制后自行处理',
      size: 'full',
      body: h('div', {},
        h('div.row-btns', {}, h('button.btn.grow', { onclick: function () { U.copyToClipboard(json).then(function () { UI.toast('已复制'); }); } }, '复制全部 JSON')),
        h('pre.raw-json', {}, json.slice(0, 20000) + (json.length > 20000 ? '\n…（已截断，导出备份可获取全部）' : '')))
    });
  }

  function aboutSheet() {
    UI.sheet({
      title: 'FlowAtlas 流水图鉴', subtitle: 'v1.0 · 本地优先的个人财务应用',
      body: h('div.about', {},
        h('p', {}, '为华为 nova9 等安卓手机设计的离线记账应用：导入微信/支付宝账单 → 自动识别分类 → 预算、目标、债务、订阅管理 → 每月一份可分享的图文报告。'),
        h('ul', {},
          h('li', {}, '✅ 完全离线：无账号、无网络请求、无广告'),
          h('li', {}, '🔐 可选本地加密：PBKDF2 + AES-256-GCM'),
          h('li', {}, '🧠 越用越准：规则库 + 本地贝叶斯模型学习你的习惯'),
          h('li', {}, '📊 图表优先：环形、趋势、热力图、排行榜'),
          h('li', {}, '🖼 一键分享：导出高清长图或 PDF')),
        h('p.dim', {}, '开源技术栈：原生 JavaScript + Canvas + WebCrypto，无第三方依赖，可离线运行。'))

    });
  }
  function installSheet() {
    UI.sheet({
      title: '安装到桌面',
      body: h('div.about', {},
        h('h4', {}, '华为浏览器 / Chrome'),
        h('ol', {}, h('li', {}, '用浏览器打开这个应用地址'), h('li', {}, '点右下角菜单（三个点或「≡」）'), h('li', {}, '选择「添加到桌面」/「安装应用」'), h('li', {}, '桌面会出现图标，点开即用，可离线运行')),
        h('h4', {}, '微信内打开'),
        h('p', {}, '微信内置浏览器无法安装，请点右上角「···」→「在浏览器打开」后再安装。'),
        h('p.dim', {}, '提示：首次打开后请保持 index.html 与 js/css 目录结构不变，Service Worker 会自动缓存全部资源。'))
    });
  }
  V = FA.views;
})(typeof globalThis !== 'undefined' ? globalThis : this);
