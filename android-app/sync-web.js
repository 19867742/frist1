/* 把网页端（PWA）同步进安卓工程的 assets/www —— 用 Node 实现，不受 PowerShell 执行策略限制 */
const fs = require('fs'), path = require('path');
const HERE = __dirname;
const SRC = path.join(path.dirname(HERE), 'finance-app');
const DST = path.join(HERE, 'app', 'src', 'main', 'assets', 'www');
const ITEMS = ['index.html', 'manifest.webmanifest', 'sw.js', 'css', 'js', 'icons'];

function rm(p) { if (fs.existsSync(p)) fs.rmSync(p, { recursive: true, force: true }); }
function copy(src, dst) {
  const st = fs.statSync(src);
  if (st.isDirectory()) {
    fs.mkdirSync(dst, { recursive: true });
    for (const f of fs.readdirSync(src)) copy(path.join(src, f), path.join(dst, f));
  } else {
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.copyFileSync(src, dst);
  }
}
function walk(p, out = []) {
  const st = fs.statSync(p);
  if (st.isDirectory()) { for (const f of fs.readdirSync(p)) walk(path.join(p, f), out); }
  else out.push(p);
  return out;
}

rm(DST);
let files = 0, bytes = 0;
for (const i of ITEMS) {
  const s = path.join(SRC, i);
  if (!fs.existsSync(s)) { console.warn('跳过（不存在）: ' + i); continue; }
  copy(s, path.join(DST, i));
}
for (const f of walk(DST)) { files++; bytes += fs.statSync(f).size; }
console.log('已同步 ' + files + ' 个文件（' + (bytes / 1024).toFixed(0) + ' KB）到 app/src/main/assets/www');
console.log('提示：改完 finance-app/ 里的代码后，重新执行 node sync-web.js 即可。');
