/* FlowAtlas · 自动识别与分类引擎
   规则引擎 + 商户别名 + 本地朴素贝叶斯（中文 bigram）+ 周期性/转账/退款识别 */
(function (root) {
  'use strict';
  var FA = root.FA, U = FA.util;
  var C = (FA.cat = {});

  /* ---------------- 商户名清洗 ---------------- */
  var NOISE = [
    '微信支付', '微信', '支付宝（中国）', '支付宝', '财付通', 'tenpay', 'alipay', 'wechat pay',
    '银联', '云闪付', '快捷支付', '网上银行', '手机银行', '扫码支付', '收款方', '付款方',
    '（中国）', '(中国)', '有限责任公司', '股份有限公司', '有限公司', '分公司', '公司', '集团',
    '官方旗舰店', '旗舰店', '官方店', '专营店', '专卖店', '直营店', '分店', '门店'
  ];
  var BRACKET = /[\(（][^\)）]{0,20}[\)）]/g;

  C.normalizeMerchant = function (raw) {
    var s = String(raw == null ? '' : raw).trim();
    if (!s) return '';
    s = s.replace(BRACKET, ' ');
    NOISE.forEach(function (n) { s = s.split(n).join(' '); });
    s = s.replace(/[*·•\-—_/\\|]+/g, ' ').replace(/\s+/g, ' ').trim();
    s = s.replace(/^\d+[\s:：]+/, '');
    return s.slice(0, 40);
  };
  /* 归并键：用于去重、订阅识别、别名学习 */
  C.merchantKey = function (t) {
    var s = C.normalizeMerchant(t.merchant) || C.normalizeMerchant(t.item) || '未知';
    return s.toLowerCase().replace(/\s+/g, '');
  };

  /* ---------------- 商户别名（同一商户的不同写法归并） ---------------- */
  C.ALIAS = {
    'kfc': '肯德基', '肯德基': '肯德基', 'kfc宅急送': '肯德基',
    'mcdonalds': '麦当劳', '麦当劳': '麦当劳', '麦当劳中国': '麦当劳',
    'starbucks': '星巴克', '星巴克': '星巴克', '星巴克咖啡': '星巴克',
    'luckin': '瑞幸咖啡', '瑞幸': '瑞幸咖啡', '瑞幸咖啡': '瑞幸咖啡',
    '7-eleven': '7-11便利店', '711': '7-11便利店', '7eleven': '7-11便利店',
    '美团点评': '美团', '美团平台商户': '美团', '北京三快': '美团',
    '滴滴出行': '滴滴', '滴滴': '滴滴', '滴滴打车': '滴滴',
    '哈啰出行': '哈啰', '哈啰': '哈啰', 'hellobike': '哈啰',
    '中国移动': '中国移动', '中国联通': '中国联通', '中国电信': '中国电信',
    'netflix': 'Netflix', 'spotify': 'Spotify', 'steam': 'Steam',
    'apple': 'Apple', 'icloud': 'Apple', 'apple.com': 'Apple'
  };
  C.aliasOf = function (name) {
    var k = String(name || '').toLowerCase().replace(/\s+/g, '');
    if (C.ALIAS[k]) return C.ALIAS[k];
    var ks = Object.keys(C.ALIAS), i;
    for (i = 0; i < ks.length; i++) if (k.indexOf(ks[i]) >= 0) return C.ALIAS[ks[i]];
    return name;
  };

  /* ---------------- 关键词规则库 ---------------- */
  function R(c, s, k) { return { c: c, s: s, k: k }; }
  C.RULES = [
    /* 餐饮 */
    R('food', '快餐', ['肯德基', 'kfc', '麦当劳', 'mcdonald', '汉堡王', '德克士', '华莱士', '塔斯汀', '必胜客', '赛百味', '老乡鸡', '真功夫', '吉野家', '食其家', '沙县小吃', '兰州拉面', '杨国福', '张亮麻辣烫', '犟骨头', '和府捞面', '萨莉亚', '味千拉面']),
    R('food', '正餐', ['海底捞', '西贝', '太二', '外婆家', '呷哺', '九毛九', '绿茶餐厅', '火锅', '烤肉', '串串', '小龙虾', '饭店', '餐厅', '酒楼', '食府', '菜馆', '烤鱼', '酸菜鱼']),
    R('food', '咖啡饮品', ['瑞幸', 'luckin', '星巴克', 'starbucks', '蜜雪冰城', '一点点', 'coco', '都可', '茶百道', '书亦', '沪上阿姨', '古茗', '喜茶', '奈雪', '霸王茶姬', '库迪', '挪瓦', '咖啡', '奶茶', '茶饮']),
    R('food', '外卖', ['美团外卖', '饿了么', 'ele.me', '外卖', '美团平台商户', '餐饮配送']),
    R('food', '零食', ['零食', '良品铺子', '三只松鼠', '百草味', '来伊份', '坚果', '面包', '烘焙', '蛋糕', '甜品', '冰淇淋']),
    /* 交通 */
    R('transport', '打车', ['滴滴', 'didi', '高德打车', '曹操出行', 't3出行', '花小猪', '首汽约车', '出租车', '网约车', '如祺出行', '享道']),
    R('transport', '公交地铁', ['地铁', '公交', '轨道交通', '一卡通', '乘车码', '城市通', '交通卡']),
    R('transport', '火车高铁', ['12306', '铁路', '火车票', '高铁', '动车']),
    R('transport', '飞机', ['航空', 'airlines', '机票', '航班', '机场', '春秋航空', '南方航空', '东方航空']),
    R('transport', '加油', ['加油', '石化', '石油', '壳牌', 'shell', '中油', 'bp', '加气']),
    R('transport', '停车', ['停车', '泊车', '停车场', '捷停车', 'etc', '高速', '过路费']),
    R('transport', '单车', ['哈啰', 'hellobike', '青桔', '美团单车', '摩拜', '共享单车', '松果']),
    /* 购物 */
    R('shopping', '服饰', ['优衣库', 'uniqlo', 'zara', 'h&m', 'hm', '耐克', 'nike', '阿迪达斯', 'adidas', '李宁', '安踏', '彪马', 'puma', '斐乐', '太平鸟', '海澜之家', '服饰', '服装', '鞋', '运动鞋', '内衣']),
    R('shopping', '数码', ['小米', '华为', '荣耀', 'oppo', 'vivo', '一加', '苹果', 'apple store', '京东自营', '数码', '电脑', '手机', '耳机', '相机', '显卡', '西部数据', '绿联', '安克']),
    R('shopping', '家居', ['宜家', 'ikea', '家居', '家具', '床垫', '家纺', '收纳', '五金', '厨具', '餐具']),
    R('shopping', '美妆', ['屈臣氏', '丝芙兰', 'sephora', '美妆', '化妆品', '护肤', '口红', '面膜', '香水', '理发', '美发', '美容', '美甲', '洗脸', 'spa']),
    R('shopping', '母婴', ['母婴', '奶粉', '尿不湿', '纸尿裤', '婴儿', '宝宝', '儿童', '玩具', '童装']),
    R('shopping', '图书文具', ['图书', '书店', '当当', '文具', '晨光', '得力', '钢笔', '笔记本']),
    R('shopping', '综合电商', ['淘宝', '天猫', '京东', '拼多多', '唯品会', '苏宁', '国美', '抖音商城', '快手小店', '严选', '山姆', 'costco', '盒马']),
    /* 日用 */
    R('daily', '超市', ['超市', '永辉', '大润发', '沃尔玛', 'walmart', '家乐福', '华润万家', '物美', '联华', '中百', '步步高', '山姆会员']),
    R('daily', '便利店', ['全家', 'familymart', '罗森', 'lawson', '便利蜂', '美宜佳', '喜士多', '7-11', '711', '天福', '十足']),
    R('daily', '生鲜', ['生鲜', '菜市场', '菜场', '叮咚买菜', '每日优鲜', '多多买菜', '美团优选', '盒马鲜生', '钱大妈', '水果', '蔬菜', '肉铺']),
    R('daily', '洗护', ['洗衣', '干洗', '洗护', '清洁用品', '纸巾', '洗洁精']),
    R('daily', '药品', ['药房', '药店', '大药房', '医药', '药品', '叮当快药']),
    R('daily', '快递', ['顺丰', 'sf express', '菜鸟', '中通', '圆通', '申通', '韵达', '极兔', '京东物流', '快递', '邮费', '运费']),
    /* 居住 */
    R('housing', '房租', ['房租', '租金', '房东', '寓见', '自如', '蛋壳', '公寓', '物业管理费']),
    R('housing', '物业', ['物业', '物业费', '小区']),
    R('housing', '水电燃气', ['电费', '水费', '燃气', '煤气', '天然气', '供暖', '暖气', '国家电网', '供电局', '自来水']),
    R('housing', '家政', ['家政', '保洁', '搬家', '开锁', '维修', '疏通']),
    R('housing', '装修', ['装修', '建材', '瓷砖', '油漆', '门窗', '五金建材']),
    /* 通讯 */
    R('telecom', '话费', ['话费', '充值中心', '手机充值', '流量包', '中国移动', '中国联通', '中国电信', '通信']),
    R('telecom', '宽带', ['宽带', '广电网络', '有线电视', '上网费']),
    R('telecom', '软件会员', ['icloud', 'apple.com', '百度网盘', '夸克', 'wps', 'office365', '微软', 'microsoft', 'dropbox', '坚果云', '语雀', 'notion', 'github', '阿里云', '腾讯云', '程序员', '域名', '服务器', 'vpn', '会员服务']),
    /* 娱乐 */
    R('fun', '电影演出', ['电影', '影城', '影院', '万达', 'cgv', '猫眼', '淘票票', '剧场', '音乐会', 'livehouse', '演唱会', '展览', '博物馆', '景区', '门票', '剧本杀', '密室', 'ktv', '酒吧', '棋牌', '台球', '网咖']),
    R('fun', '游戏', ['游戏', 'steam', 'playstation', 'xbox', 'nintendo', '王者荣耀', '和平精英', '米哈游', '网易游戏', '腾讯游戏', '点券', '皮肤', '充值点券', 'epic']),
    R('fun', '旅行', ['酒店', '民宿', '携程', '飞猪', '去哪儿', 'airbnb', '途家', 'booking', 'agoda', '青旅', '度假', '旅游', '门票预订', '高铁管家']),
    R('fun', '运动健身', ['健身', 'keep', '游泳', '球馆', '瑜伽', '普拉提', '跑步', '体育', '乐刻', '超级猩猩', '登山', '骑行']),
    R('fun', '订阅服务', ['netflix', 'spotify', 'youtube', '爱奇艺', 'iqiyi', '腾讯视频', '优酷', '芒果tv', '哔哩哔哩', 'bilibili', '网易云音乐', 'qq音乐', '酷狗', '喜马拉雅', '得到', '知乎盐选', '连续包月', '自动续费', '会员订阅', '订阅']),
    /* 医疗 */
    R('health', '门诊', ['医院', '门诊', '诊所', '卫生服务', '挂号', '急诊', '牙科', '口腔', '眼科', '中医']),
    R('health', '体检', ['体检', '健康管理', '医学检验']),
    R('health', '保健', ['保健', '按摩', '推拿', '康复', '养生', '艾灸']),
    R('health', '住院', ['住院', '手术', '医疗费']),
    /* 教育 */
    R('edu', '学费', ['学费', '学校', '大学', '幼儿园', '教育机构', '义务教育']),
    R('edu', '培训', ['培训', '课程', '新东方', '学而思', '猿辅导', '驾校', '教练', '网课', '知识付费', '语言']),
    R('edu', '考试', ['考试', '报名费', '准考证', '认证', '雅思', '托福', '四六级', '考研']),
    R('edu', '书籍', ['书籍', '教材', '当当', 'kindle', '微信读书', '樊登']),
    /* 人情 */
    R('social', '红包', ['红包', '压岁钱', '利是', '拼手气']),
    R('social', '礼物', ['礼物', '鲜花', '花店', '蛋糕店', '礼盒']),
    R('social', '请客', ['请客', '聚餐', 'aa', '代付']),
    R('social', '捐赠', ['捐赠', '公益', '水滴筹', '慈善', '爱心', '捐款', '寺庙', '功德']),
    /* 金融 */
    R('finance', '手续费', ['手续费', '服务费', '工本费', '年费', '罚息', '违约金']),
    R('finance', '利息', ['利息', '贷款利息', '分期手续费']),
    R('finance', '保险', ['保险', '平安保险', '人寿', '太平洋保险', '众安', '车险', '社保', '医保缴费']),
    R('finance', '税费', ['税', '税务', '个税', '公积金']),
    R('finance', '还款', ['还款', '花呗', '借呗', '微粒贷', '京东白条', '信用卡', '分期']),
    R('finance', '投资', ['基金', '股票', '证券', '理财', '黄金', '定期', '余额宝', '零钱通', '国债', '信托']),
    /* 宠物 */
    R('pet', '宠物食品', ['宠物', '猫粮', '狗粮', 'pet', '小佩', '疯狂的小狗']),
    R('pet', '宠物医疗', ['宠物医院', '宠物诊所', '兽药', '疫苗']),
    /* 收入 */
    R('salary', '工资', ['工资', '薪资', '薪酬', '代发', '劳务费', '薪金', '月薪', '岗位工资', '补助']),
    R('bonus', '年终奖', ['年终奖', '奖金', '绩效', '提成', '分红奖']),
    R('parttime', '外快', ['兼职', '外快', '稿费', '讲座费', '咨询费', '接单', '佣金']),
    R('reimburse', '报销', ['报销', '差旅', '补助报销', '费用报销']),
    R('refund', '退款', ['退款', '退货', '退单', '已退', '撤销']),
    R('giftin', '红包收入', ['红包', '转账红包', '礼金']),
    R('interest', '利息', ['利息', '活期结息', '存款利息', '收益发放']),
    R('invest', '投资收益', ['基金赎回', '股票卖出', '分红', '理财赎回', '收益']),
    /* 转账/资金类 */
    R('transfer', '内部转账', ['转账', '转入', '转出', '零钱通', '余额宝', '提现', '充值', '还款', '信用卡还款', '银行卡转入', '资金归集'])
  ];

  /* 方向修正词 */
  var KW_INCOME = ['工资', '薪资', '薪酬', '代发', '报销', '退款', '退税', '利息', '收益', '分红', '奖金', '红包', '收款', '转入', '退款成功', '结息', '退货'];
  var KW_TRANSFER = ['转账', '提现', '充值', '还款', '余额宝', '零钱通', '资金归集', '信用卡还款', '自动转入'];
  var KW_REFUND = ['退款', '退货', '退单', '已退款', '退款成功'];

  C._ruleIndex = null;
  C.buildIndex = function () {
    var idx = [];
    C.RULES.forEach(function (r) {
      r.k.forEach(function (kw) { idx.push({ kw: kw.toLowerCase(), c: r.c, s: r.s, len: kw.length }); });
    });
    idx.sort(function (a, b) { return b.len - a.len; });
    C._ruleIndex = idx;
    return idx;
  };

  /* 单条交易分类：返回 {category, sub, tags, source, confidence} */
  C.classify = function (t, opt) {
    opt = opt || {};
    var merchant = C.normalizeMerchant(t.merchant) || '';
    var item = String(t.item || '');
    var rawCat = String(t.rawCategory || '');
    var note = String(t.note || '');
    var hay = (merchant + ' ' + item + ' ' + rawCat + ' ' + note).toLowerCase();
    var tags = [];

    /* 1) 用户纠正优先（记忆） */
    var key = C.merchantKey(t);
    var corr = (opt.corrections || []).filter(function (x) { return x.key === key; })[0];
    if (corr && corr.category) {
      return { category: corr.category, sub: corr.sub || '', source: 'memory', confidence: 0.99, tags: tags };
    }
    /* 2) 精确别名规则 */
    var alias = C.aliasOf(merchant);
    if (alias !== merchant && opt.aliasRules && opt.aliasRules[alias]) {
      var ar = opt.aliasRules[alias];
      return { category: ar.c, sub: ar.s || '', source: 'alias', confidence: 0.95, tags: tags };
    }
    /* 3) 关键词规则：先匹配「商户名+交易类型」（高精度），再退到全文 */
    if (!C._ruleIndex) C.buildIndex();
    var primary = (merchant + ' ' + rawCat).toLowerCase();
    var scan = function (h2) {
      for (var i = 0; i < C._ruleIndex.length; i++) {
        if (h2.indexOf(C._ruleIndex[i].kw) >= 0) return C._ruleIndex[i];
      }
      return null;
    };
    var best = scan(primary) || scan(hay);
    if (best) {
      tags.push('规则:' + best.kw);
      return { category: best.c, sub: best.s, source: 'rule', confidence: 0.9, tags: tags, hit: best.kw };
    }
    /* 4) 本地贝叶斯（用户历史学习） */
    if (opt.model) {
      var g = C.predict(opt.model, merchant + ' ' + item + ' ' + rawCat);
      if (g && g.confidence >= 0.55) {
        return { category: g.category, sub: g.sub || '', source: 'model', confidence: g.confidence, tags: ['模型'] };
      }
    }
    /* 5) 兜底 */
    var dir = C.guessDirection(hay, t);
    var fallback = t.direction === 'income' ? (dir.income || 'incother') : (dir.expense || 'other');
    return { category: fallback, sub: '', source: 'fallback', confidence: 0.3, tags: tags };
  };

  C.guessDirection = function (hay, t) {
    var has = function (arr) { return arr.some(function (k) { return hay.indexOf(k.toLowerCase()) >= 0; }); };
    return {
      income: has(KW_INCOME) ? 'incother' : 'incother',
      expense: has(KW_TRANSFER) ? 'finance' : 'other',
      isTransfer: has(KW_TRANSFER),
      isRefund: has(KW_REFUND)
    };
  };

  /* ---------------- 本地朴素贝叶斯 ---------------- */
  var STOP = { '有限公司': 1, '有限': 1, '公司': 1, '科技': 1, '网络': 1, '服务': 1, '支付': 1, '中国': 1, '北京': 1, '上海': 1, '广州': 1, '深圳': 1, '杭州市': 1, '杭州': 1 };
  C.tokenize = function (s) {
    s = String(s == null ? '' : s).toLowerCase();
    var out = [], re = /[\u4e00-\u9fa5]+|[a-z0-9.]+/g, m;
    while ((m = re.exec(s))) {
      var w = m[0];
      if (/^[\u4e00-\u9fa5]+$/.test(w)) {
        if (w.length <= 4) out.push(w);
        for (var i = 0; i < w.length - 1; i++) out.push(w.substr(i, 2));
        if (w.length > 4) { out.push(w.substr(0, 2)); out.push(w.substr(-2)); }
      } else if (w.length > 1) out.push(w);
    }
    return out.filter(function (x) { return !STOP[x]; });
  };

  C.train = function (samples) {
    var m = { cats: {}, total: {}, docCount: {}, vocab: {}, n: 0 };
    samples.forEach(function (s) {
      var text = s.text || ((s.merchant || '') + ' ' + (s.item || '') + ' ' + (s.rawCategory || ''));
      if (!text.trim() || !s.category) return;
      var toks = C.tokenize(text);
      if (!toks.length) return;
      m.n++;
      m.cats[s.category] = m.cats[s.category] || { sub: s.sub || '', tok: {}, count: 0 };
      var bucket = m.cats[s.category];
      bucket.count++;
      if (s.sub) bucket.sub = s.sub;
      toks.forEach(function (tok) {
        bucket.tok[tok] = (bucket.tok[tok] || 0) + 1;
        m.total[tok] = (m.total[tok] || 0) + 1;
        m.vocab[tok] = 1;
      });
    });
    m.V = Object.keys(m.vocab).length || 1;
    return m;
  };

  C.predict = function (model, text) {
    if (!model || !model.n) return null;
    var toks = C.tokenize(text), cats = Object.keys(model.cats);
    if (!toks.length || !cats.length) return null;
    var best = null, i, tok, c;
    for (i = 0; i < cats.length; i++) {
      c = cats[i];
      var b = model.cats[c];
      var score = Math.log((b.count + 0.5) / (model.n + model.n * 0.5));
      var denom = b.count + model.V;
      var hits = 0;
      for (var j = 0; j < toks.length; j++) {
        tok = toks[j];
        var cnt = b.tok[tok] || 0;
        if (cnt) hits++;
        score += Math.log((cnt + 0.4) / denom);
      }
      score = score / Math.sqrt(toks.length || 1);
      if (hits === 0) score -= 4; /* 完全没命中词，强力降权 */
      if (!best || score > best.score) best = { category: c, sub: b.sub, score: score, hits: hits };
    }
    if (!best) return null;
    /* softmax 置信度 */
    var scores = cats.map(function (c) {
      var b = model.cats[c], sc = Math.log((b.count + 0.5) / (model.n + 0.5)), denom = b.count + model.V;
      for (var j = 0; j < toks.length; j++) sc += Math.log(((b.tok[toks[j]] || 0) + 0.4) / denom);
      return sc / Math.sqrt(toks.length || 1);
    });
    var mx = Math.max.apply(null, scores);
    var exps = scores.map(function (s) { return Math.exp(s - mx); });
    var sum = U.sum(exps);
    best.confidence = U.clamp((exps[cats.indexOf(best.category)] / sum), 0, 1);
    if (best.hits === 0) best.confidence = Math.min(best.confidence, 0.4);
    return best;
  };

  C.buildModel = function (db) {
    if (!db) return null;
    var strong = [], weak = [];
    (db.txns || []).forEach(function (t) {
      if (t.excluded || !t.category || t.direction === 'transfer') return;
      var s2 = t.auto && t.auto.source;
      var sample = { text: (t.merchant || '') + ' ' + (t.item || '') + ' ' + (t.rawCategory || ''), category: t.category, sub: t.sub };
      if (s2 === 'memory' || s2 === 'user') strong.push(sample);       /* 人工确认：最高可信 */
      else if (s2 === 'rule') weak.push(sample);                        /* 规则命中：冷启动用 */
    });
    (db.corrections || []).forEach(function (x) {
      strong.push({ text: x.key, category: x.category, sub: x.sub });
    });
    /* 人工样本不足 12 条时，掺入规则样本让模型开箱可用；随着用户纠正增多自动转向个性化 */
    var samples = strong.length >= 12 ? strong : strong.concat(weak.slice(0, 400));
    return samples.length >= 8 ? C.train(samples) : null;
  };

  /* 批量自动分类：只处理未分类或来源为自动的交易 */
  C.autoLabel = function (db, limit) {
    var model = C.buildModel(db);
    var aliasRules = (db.rules || []).reduce(function (m, r) {
      if (r.type === 'alias' && r.merchant) m[r.merchant] = { c: r.category, s: r.sub };
      return m;
    }, {});
    var opt = { corrections: db.corrections || [], model: model, aliasRules: aliasRules };
    var n = 0;
    (db.txns || []).forEach(function (t) {
      var manual = t.auto && (t.auto.source === 'user' || t.auto.source === 'memory');
      if (manual) return;
      if (limit && n >= limit) return;
      var r = C.classify(t, opt);
      t.category = r.category; t.sub = r.sub;
      t.auto = { source: r.source, confidence: r.confidence, at: Date.now() };
      if (r.tags && r.tags.length) t.tags = U.uniq((t.tags || []).concat(r.tags));
      n++;
    });
    return { labeled: n, model: !!model };
  };

  /* ---------------- 内部转账 / 退款 识别 ---------------- */
  C.detectTransfers = function (db) {
    var aliases = (db.settings.ownerAliases || []).slice();
    db.accounts.forEach(function (a) { aliases.push(a.name); if (a.holder) aliases.push(a.holder); });
    var hits = [];
    var list = (db.txns || []).filter(function (t) { return !t.excluded; });
    var byTime = list.slice().sort(function (a, b) { return a.time - b.time; });
    var usedOut = {}, usedIn = {};

    /* A. 关键词判定：转账/提现/充值/还款 且对方是本人账户昵称 */
    list.forEach(function (t) {
      var hay = (t.merchant || '') + (t.item || '') + (t.rawCategory || '');
      var isKw = KW_TRANSFER.some(function (k) { return hay.indexOf(k) >= 0; });
      if (!isKw) return;
      if (t.direction === 'transfer') return;
      var isSelf = aliases.some(function (a) { return a && a.length > 1 && hay.indexOf(a) >= 0; });
      if (isSelf || /零钱通|余额宝|提现|信用卡还款|资金归集/.test(hay)) {
        hits.push({ txn: t, reason: '关键词:' + (isSelf ? '本人账户' : '资金划转'), confidence: 0.9 });
      }
    });
    /* B. 配对判定：账户 A 支出 ↔ 账户 B 收入，金额一致、2 天内 */
    for (var i = 0; i < byTime.length; i++) {
      var a = byTime[i];
      if (a.direction !== 'expense' || usedOut[a.id]) continue;
      for (var j = i + 1; j < byTime.length; j++) {
        var b = byTime[j];
        if (b.time - a.time > 2 * 86400000) break;
        if (b.direction !== 'income' || usedIn[b.id]) continue;
        if (b.accountId === a.accountId) continue;
        if (Math.abs(b.amount - a.amount) > 0.02) continue;
        hits.push({ txn: a, pair: b.id, reason: '跨账户等额配对', confidence: 0.85 });
        hits.push({ txn: b, pair: a.id, reason: '跨账户等额配对', confidence: 0.85 });
        usedOut[a.id] = usedIn[b.id] = 1;
        break;
      }
    }
    return hits;
  };

  C.detectRefunds = function (db) {
    var out = [];
    var list = (db.txns || []).filter(function (t) { return !t.excluded; });
    list.forEach(function (t) {
      var hay = (t.merchant || '') + (t.item || '') + (t.rawCategory || '');
      if (!KW_REFUND.some(function (k) { return hay.indexOf(k) >= 0; })) return;
      if (t.direction !== 'income') return;
      var orig = list.filter(function (x) {
        return x.id !== t.id && x.direction === 'expense' && Math.abs(x.amount - t.amount) < 0.02 &&
          Math.abs(x.time - t.time) < 90 * 86400000 && C.merchantKey(x) === C.merchantKey(t);
      })[0];
      out.push({ txn: t, original: orig ? orig.id : null, confidence: orig ? 0.9 : 0.6 });
    });
    return out;
  };

  /* ---------------- 周期性交易 / 订阅识别 ---------------- */
  C.detectSubscriptions = function (txns, opt) {
    opt = opt || {};
    var groups = {};
    (txns || []).forEach(function (t) {
      if (t.direction !== 'expense' || t.excluded) return;
      var k = C.merchantKey(t);
      (groups[k] = groups[k] || []).push(t);
    });
    var subs = [];
    Object.keys(groups).forEach(function (k) {
      var raw = U.sortBy(groups[k], function (t) { return t.time; });
      /* 同一计费周期内的重复扣款（补扣/重复导入）先折叠，避免污染间隔方差 */
      var g = [];
      raw.forEach(function (x) {
        var last = g[g.length - 1];
        if (!last || (x.time - last.time) > 10 * 86400000) g.push(x);
        else if (x.amount > last.amount) g[g.length - 1] = x;
      });
      if (g.length < 3) return;
      var amounts = g.map(function (t) { return t.amount; });
      var amtMed = U.median(amounts);
      var amtTol = amtMed * (opt.amtTol || 0.25);
      /* 金额需相对稳定，或呈知名订阅涨幅 */
      var stable = amounts.every(function (a) { return Math.abs(a - amtMed) <= amtTol + 0.5; });
      var intervals = [];
      for (var i = 1; i < g.length; i++) intervals.push((g[i].time - g[i - 1].time) / 86400000);
      var medI = U.median(intervals);
      var cv = medI > 0 ? U.stdev(intervals) / medI : 9;
      var cycle = null;
      if (medI >= 5 && medI <= 9) cycle = 'weekly';
      else if (medI >= 25 && medI <= 35) cycle = 'monthly';
      else if (medI >= 85 && medI <= 98) cycle = 'quarterly';
      else if (medI >= 330 && medI <= 400) cycle = 'yearly';
      if (!cycle || cv > (opt.cvTol || 0.35)) return;
      if (!stable && cycle !== 'monthly') return;
      var last = g[g.length - 1];
      var next = last.time + medI * 86400000;
      subs.push({
        key: k, merchant: C.aliasOf(C.normalizeMerchant(last.merchant) || last.merchant),
        amount: U.round2(amtMed), cycle: cycle, intervalDays: Math.round(medI),
        count: g.length, category: last.category, sub: last.sub,
        accountId: last.accountId, lastDate: last.time, nextDate: next,
        confidence: U.clamp(1 - cv, 0, 1) * (stable ? 1 : 0.8),
        months: Math.round((last.time - g[0].time) / 86400000 / 30.4) + 1
      });
    });
    return U.sortBy(subs, function (s) { return s.confidence; }, true);
  };

  /* ---------------- 异常检测 ---------------- */
  C.detectAnomalies = function (txns, opt) {
    opt = opt || {};
    var list = (txns || []).filter(function (t) { return !t.excluded && t.direction !== 'transfer'; });
    var byCat = U.groupBy(list, function (t) { return t.category || 'other'; });
    var out = [];
    Object.keys(byCat).forEach(function (c) {
      var g = byCat[c];
      if (g.length < 6) return;
      var amounts = g.map(function (t) { return t.amount; });
      var med = U.median(amounts), mad = U.mad(amounts);
      var threshold = Math.max(med + 5 * (mad || med * 0.5), med * 4, 100);
      g.forEach(function (t) {
        if (t.amount > threshold) out.push({ txn: t, type: 'big', reason: '远超该类日常水平(' + U.money(med) + ')', score: t.amount / (med || 1) });
      });
    });
    /* 同一商户同额同方向 24h 内多笔 -> 重复扣款嫌疑 */
    var byKey = U.groupBy(list, function (t) { return C.merchantKey(t) + '|' + t.amount + '|' + t.direction; });
    Object.keys(byKey).forEach(function (k) {
      var g = U.sortBy(byKey[k], function (t) { return t.time; });
      for (var i = 1; i < g.length; i++) {
        if (g[i].time - g[i - 1].time < 24 * 3600000) {
          out.push({ txn: g[i], type: 'duplicate', reason: '与上一笔同商户同金额，疑似重复扣款', score: 2 });
        }
      }
    });
    /* 深夜大额 */
    list.forEach(function (t) {
      var h = new Date(t.time).getHours();
      if (t.amount >= 500 && (h >= 1 && h <= 5)) out.push({ txn: t, type: 'night', reason: '凌晨大额支出', score: 1.5 });
    });
    return U.sortBy(out, function (o) { return o.txn.time; }, true);
  };

  /* ---------------- 去重 ---------------- */
  C.fingerprint = function (t) {
    return [t.accountId, Math.round(t.time / 60000), U.round2(t.amount), t.direction, C.merchantKey(t)].join('|');
  };
  C.findDuplicate = function (t, all) {
    if (t.orderNo) {
      var hit = all.filter(function (x) { return x.orderNo && x.orderNo === t.orderNo; })[0];
      if (hit) return { hit: hit, kind: 'orderNo' };
    }
    var fp = C.fingerprint(t);
    var hit2 = all.filter(function (x) { return C.fingerprint(x) === fp; })[0];
    if (hit2) return { hit: hit2, kind: 'fuzzy' };
    return null;
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
