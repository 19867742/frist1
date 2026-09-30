/* FlowAtlas · 解析/分类/报告 自测（Node 环境，无需浏览器） */
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
['js/util.js', 'js/store.js', 'js/categorize.js', 'js/parsers.js'].forEach(f => {
  vm.runInThisContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), { filename: f });
});
const FA = globalThis.FA, U = FA.util, S = FA.store, P = FA.parser, C = FA.cat;
let pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log('  ✅ ' + name + (extra ? '  ' + extra : '')); }
  else { fail++; console.log('  ❌ ' + name + (extra ? '  ' + extra : '')); }
}
function section(t) { console.log('\n=== ' + t + ' ==='); }

section('1. 微信账单解析');
const wbuf = fs.readFileSync(path.join(ROOT, 'samples/wechat_sample.csv'));
const wdec = U.decodeBuffer(wbuf);
ok('编码识别', wdec.encoding === 'utf-8', wdec.encoding);
const wrows = P.parseCSV(wdec.text);
ok('CSV 行数(空行被自动忽略)', wrows.length === 29, wrows.length + ' 行(含表头)');
const wsheet = P.sniffHeader(wrows);
ok('表头自动定位（前12行为账单说明）', wsheet.rowIndex === 11, 'index=' + wsheet.rowIndex + ' score=' + wsheet.score);
ok('字段映射完整', wsheet.map.time === 0 && wsheet.map.amount === 5 && wsheet.map.orderNo === 8, JSON.stringify(wsheet.map));
ok('来源识别=wechat', P.detectSource(wdec.text, 'x.csv') === 'wechat');
const wsp = P.SOURCE_META.wechat;
const wr = P.rowsToTxns(wrows, wsheet, { source: 'wechat', accountId: 'acc_wechat', fileName: 'wechat_sample.csv' });
ok('解析出 16 笔交易', wr.txns.length === 16, wr.txns.length + ' 笔');
ok('跳过 1 笔已关闭订单', wr.skipped.some(s => /关闭/.test(s.reason)), JSON.stringify(wr.skipped));
const refund = wr.txns.find(t => t.status === 'refunded');
ok('退款状态识别', !!refund, refund && refund.merchant);
const transfer = wr.txns.find(t => t.direction === 'transfer');
ok('不计收支→转账并自动排除', !!transfer && transfer.excluded === true, transfer && transfer.merchant);
ok('金额去符号正确', wr.txns.filter(t => t.merchant.indexOf('肯德基') >= 0)[0].amount === 18.5);
ok('收入方向正确', wr.txns.filter(t => t.merchant.indexOf('某某科技') >= 0)[0].direction === 'income');
ok('交易单号唯一键已取', wr.txns.every(t => t.orderNo && t.orderNo.length > 10));

section('1b. GBK 编码回退');
const gbuf = fs.readFileSync(path.join(ROOT, 'samples/wechat_sample_gbk.csv'));
const gdec = U.decodeBuffer(gbuf);
ok('GBK 文件被识别为 gbk', gdec.encoding === 'gbk', gdec.encoding);
const grows = P.parseCSV(gdec.text);
const gsheet = P.sniffHeader(grows);
const gr = P.rowsToTxns(grows, gsheet, { source: 'wechat', accountId: 'acc_wechat' });
ok('GBK 文件解析结果与 UTF-8 一致', gr.txns.length === wr.txns.length && gr.txns[0].merchant === wr.txns[0].merchant,
  gr.txns.length + ' 笔 / 首笔商户=' + gr.txns[0].merchant);
ok('GBK 中文未乱码', /肯德基/.test(gr.txns[0].merchant));

section('2. 去重');
const dupRow = wr.txns.filter(t => t.merchant === '京东商城');
ok('同一文件内重复行被识别', dupRow.length === 2 && !!C.findDuplicate(dupRow[1], [dupRow[0]]), '共' + dupRow.length + '笔');
const fuzzy = Object.assign({}, wr.txns[0], { id: 'x1', orderNo: '' });
ok('模糊指纹去重(同账户同分钟同金额)', !!C.findDuplicate(fuzzy, [wr.txns[0]]));

section('3. 支付宝账单解析');
const abuf = fs.readFileSync(path.join(ROOT, 'samples/alipay_sample.csv'));
const adec = U.decodeBuffer(abuf);
const arows = P.parseCSV(adec.text);
const asheet = P.sniffHeader(arows);
ok('表头定位第5行(index4)', asheet.rowIndex === 4, 'index=' + asheet.rowIndex);
ok('来源识别=alipay', P.detectSource(adec.text, 'a.csv') === 'alipay');
const ar = P.rowsToTxns(arows, asheet, { source: 'alipay', accountId: 'acc_alipay' });
ok('解析出 17 笔', ar.txns.length === 17, ar.txns.length + ' 笔, 跳过' + ar.skipped.length);
ok('非法金额行被跳过并给出原因', ar.skipped.some(s => /金额无法解析/.test(s.reason)), JSON.stringify(ar.skipped));
ok('收入/退款方向', ar.txns.filter(t => t.merchant === '京东商城')[0].direction === 'income');
ok('不计收支的资金归集=transfer', ar.txns.filter(t => /余额宝/.test(t.merchant)).every(t => t.direction === 'transfer'));

section('4. Excel(.xlsx) 解析');
const xb = fs.readFileSync(path.join(ROOT, 'samples/bank_sample.xlsx'));
P.parseXlsx(xb.buffer.slice(xb.byteOffset, xb.byteOffset + xb.byteLength)).then(sheets => {
  ok('读取到工作表(xlsx 解压成功)', sheets.length >= 1 && sheets[0].rows.length >= 11, '行数=' + sheets[0].rows.length);
  const rows = sheets[0].rows;
  const sh = P.sniffHeader(rows);
  ok('银行表头自动定位', sh.rowIndex === 2, 'index=' + sh.rowIndex + ' map=' + JSON.stringify(sh.map));
  const br = P.rowsToTxns(rows, sh, { source: 'bank', accountId: 'acc_bank' });
  ok('解析出 8 笔银行流水', br.txns.length === 8, br.txns.length + ' 笔');
  const wage = br.txns.find(t => /工资/.test(t.item + t.rawCategory));
  ok('借贷标志→收入', !!wage && wage.direction === 'income', wage && (wage.merchant + ' ' + wage.amount));
  const interest = br.txns.find(t => /结息/.test(t.item));
  ok('小数金额（利息 12.35）', !!interest && interest.amount === 12.35, interest && String(interest.amount));
  runClassifierTests(wr.txns.concat(ar.txns, br.txns));
});

section('5. 自动分类');
function runClassifierTests(all) {
  S.db = {
    version: 1, createdAt: Date.now(), settings: { ownerAliases: ['我'] }, accounts: [
      { id: 'acc_wechat', type: 'wechat', name: '微信零钱', icon: '💚', color: '#07C160', initial: 0 },
      { id: 'acc_alipay', type: 'alipay', name: '支付宝余额', icon: '💙', color: '#1677FF', initial: 0 },
      { id: 'acc_bank', type: 'bank', name: '招商银行(1234)', icon: '💳', color: '#E8474B', initial: 0 }
    ],
    txns: all.map(t => Object.assign({}, t)), budgets: [], goals: [], debts: [], subs: [], rules: [], corrections: [], imports: [], notifications: []
  };
  const res = C.autoLabel(S.db);
  ok('自动标注执行', res.labeled > 0, res.labeled + ' 笔');
  const dist = {};
  S.db.txns.forEach(t => { dist[S.catName(t.category)] = (dist[S.catName(t.category)] || 0) + 1; });
  console.log('     分类分布: ' + Object.keys(dist).map(k => k + '×' + dist[k]).join(', '));
  const kfc = S.db.txns.find(t => /肯德基/.test(t.merchant));
  ok('肯德基 → 餐饮/快餐', kfc.category === 'food' && kfc.sub === '快餐', kfc.category + '/' + kfc.sub);
  const netflix = S.db.txns.find(t => /Netflix/.test(t.merchant));
  ok('Netflix → 娱乐/订阅服务', netflix.category === 'fun' && netflix.sub === '订阅服务', netflix.category + '/' + netflix.sub);
  const rent = S.db.txns.find(t => /房租/.test(t.item));
  ok('房租 → 居住/房租', rent.category === 'housing' && rent.sub === '房租', rent.category + '/' + rent.sub);
  const yd = S.db.txns.find(t => /中国移动/.test(t.merchant));
  ok('中国移动 → 通讯/话费', yd.category === 'telecom' && yd.sub === '话费', yd.category + '/' + yd.sub);
  const dxyh = S.db.txns.find(t => /永辉/.test(t.merchant));
  ok('永辉超市 → 日用/超市', dxyh.category === 'daily' && dxyh.sub === '超市', dxyh.category + '/' + dxyh.sub);
  const xdf = S.db.txns.find(t => /新东方/.test(t.merchant));
  ok('新东方 → 教育/培训', xdf.category === 'edu' && xdf.sub === '培训', xdf.category + '/' + xdf.sub);
  const fund = S.db.txns.find(t => /天弘基金/.test(t.merchant));
  ok('天弘基金 → 金融/投资', fund.category === 'finance' && fund.sub === '投资', fund.category + '/' + fund.sub);

  /* 记忆学习 */
  const t0 = S.db.txns.find(t => /全家便利/.test(t.merchant));
  S.correction(C.merchantKey(t0), 'daily', '便利店');
  const again = C.classify(Object.assign({}, t0), { corrections: S.db.corrections });
  ok('用户纠正被记忆', again.source === 'memory' && again.category === 'daily', again.source);
  const model = C.buildModel(S.db);
  ok('贝叶斯模型可训练', !!model, model ? Object.keys(model.cats).length + ' 个类别 / ' + model.n + ' 样本' : '样本不足');
  if (model) {
    const g = C.predict(model, '美团平台商户 外卖午餐');
    ok('模型可给出预测', !!g && !!g.category, g ? g.category + ' ' + Math.round(g.confidence * 100) + '%' : '');
  }

  /* 内部转账识别 */
  S.db.txns.push({ id: 'tr1', time: Date.now(), amount: 500, direction: 'expense', accountId: 'acc_wechat', merchant: '转账到银行卡', item: '提现', category: 'transfer', excluded: false });
  S.db.txns.push({ id: 'tr2', time: Date.now() + 60000, amount: 500, direction: 'income', accountId: 'acc_bank', merchant: '微信转入', item: '转账', category: 'other', excluded: false });
  const trs = C.detectTransfers(S.db);
  ok('跨账户等额配对识别为内部转账', trs.some(x => x.reason.indexOf('配对') >= 0), trs.length + ' 组命中');

  /* 订阅识别：构造 4 个月固定扣款 */
  const subTx = [];
  for (let k = 3; k >= 0; k--) {
    const d = new Date(2024, 2 - k, 15, 8, 0, 0);
    subTx.push({ id: 'sub' + k, time: d.getTime(), amount: 25, direction: 'expense', accountId: 'acc_alipay', merchant: 'Netflix', item: '会员订阅', category: 'fun', sub: '订阅服务', excluded: false });
  }
  const subs = C.detectSubscriptions(S.db.txns.concat(subTx));
  const netflixSub = subs.find(s => /netflix/i.test(s.merchant));
  ok('周期性订阅识别(Netflix 每月)', !!netflixSub && netflixSub.cycle === 'monthly', JSON.stringify(netflixSub && { m: netflixSub.merchant, c: netflixSub.cycle, n: netflixSub.count, conf: Math.round(netflixSub.confidence * 100) }));
  ok('下次扣款日已推算', !!netflixSub && netflixSub.nextDate > netflixSub.lastDate);

  /* 异常检测 */
  const anom = C.detectAnomalies(S.db.txns, {});
  ok('异常检测可运行', Array.isArray(anom), anom.length + ' 笔异常');

  /* 票据文本抽取 */
  const receipt = ['某某便利店', '2024-03-28 19:22', '可乐 3.50', '薯片 8.00', '合计 11.50', '微信支付', '订单号：420000199920240328001122'].join('\n');
  const cands = P.parseReceiptText(receipt);
  ok('OCR 文本抽取金额', cands.length > 0 && cands[0].amount === 11.5, JSON.stringify(cands[0]));
  ok('OCR 抽取商户', cands[0].merchant === '某某便利店', cands[0].merchant);
  ok('OCR 抽取日期', !!cands[0].time, U.fmtDate(cands[0].time, 'full'));
  ok('OCR 抽取支付方式', cands[0].payMethod === '微信支付', cands[0].payMethod);
  ok('OCR 抽取订单号', cands[0].orderNo === '420000199920240328001122', cands[0].orderNo);

  /* 金额/日期解析边界 */
  ok('parseAmount 处理 ¥1,234.56', P.parseAmount('¥1,234.56') === 1234.56);
  ok('parseAmount 处理 (88.00)', P.parseAmount('(88.00)') === -88);
  ok('parseDate 处理 2024年3月5日', U.parseDate('2024年3月5日 12:33') === new Date(2024, 2, 5, 12, 33).getTime());
  ok('parseDate 处理 20240305', U.parseDate('20240305') === new Date(2024, 2, 5).getTime());
  ok('money 格式化', U.money(1234567.891) === '¥1,234,567.89', U.money(1234567.891));
  ok('moneyShort', U.moneyShort(12800) === '1.28万', U.moneyShort(12800));

  /* 账务计算 */
  S.db.txns = S.db.txns.filter(t => !t.excluded);
  const bal = S.accountBalance(S.db.accounts[0]);
  ok('账户余额可计算', typeof bal === 'number', '微信余额 ' + U.money(bal));
  const sum = S.summary({});
  ok('收支汇总', sum.income > 0 && sum.expense > 0, '收 ' + U.money(sum.income) + ' 支 ' + U.money(sum.expense));
  const cats = S.catBreakdown({}, 'expense');
  ok('分类聚合排序', cats.length > 3 && cats[0].total >= cats[1].total, cats.slice(0, 3).map(c => c.name + U.money(c.total)).join(' '));
  const nw = S.netWorth();
  ok('净资产计算', typeof nw.net === 'number', U.money(nw.net));

  console.log('\n==============================');
  console.log('通过 ' + pass + ' / 失败 ' + fail);
  console.log('==============================');
  process.exit(fail ? 1 : 0);
}
