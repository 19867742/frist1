/* 把整个应用打包成「单文件 HTML」：双击即用、可离线、可直接拷进手机 */
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, '..', 'dist');
fs.mkdirSync(DIST, { recursive: true });

let html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const used = [];

/* 内联 CSS */
html = html.replace(/<link rel="stylesheet" href="([^"]+)">/g, (m, href) => {
  const css = fs.readFileSync(path.join(ROOT, href), 'utf8');
  used.push(href);
  return '<style>\n' + css + '\n</style>';
});
/* 内联 JS（保持加载顺序） */
html = html.replace(/<script src="([^"]+)"><\/script>/g, (m, src) => {
  let js = fs.readFileSync(path.join(ROOT, src), 'utf8');
  js = js.replace(/<\/script/gi, '<\\/script');
  used.push(src);
  return '<script>/* ==== ' + src + ' ==== */\n' + js + '\n</script>';
});
/* 单文件版不需要 manifest / 图标链接 */
html = html.replace(/<link rel="manifest"[^>]*>\n?/g, '');
html = html.replace(/<link rel="(apple-touch-icon|icon)"[^>]*>\n?/g, '');
html = html.replace('<title>', '<!-- FlowAtlas 单文件离线版 · 由 tools/build_offline.js 生成 -->\n<title>');

const out = path.join(DIST, 'FlowAtlas-离线版.html');
fs.writeFileSync(out, html, 'utf8');
const kb = (Buffer.byteLength(html, 'utf8') / 1024).toFixed(0);
console.log('已生成: ' + out);
console.log('大小: ' + kb + ' KB, 内联文件: ' + used.length + ' 个');
console.log(used.join(', '));
