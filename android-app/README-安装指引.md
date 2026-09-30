# 安装到华为手机（nova9）· 三条路线

按你的情况选一条即可。**推荐路线 2**：一次配置，之后手机上就是一个真正的 App 图标。

---

## 路线 0 · 单文件离线版（零安装，30 秒）

不需要服务器、不需要 APK，适合"先看看效果"。

1. 把 `dist/FlowAtlas-离线版.html`（约 324 KB）传到手机：微信发给自己 / QQ 传文件 / 数据线拷贝都行。
2. 用**华为浏览器**打开它（微信里点开的话，右上角「…」→「在浏览器打开」）。
3. 直接能用：导入账单、记账、看报告全部正常，数据存在浏览器本地。

> 缺点：不会生成桌面图标，清浏览器数据会丢账本（记得在「我的 → 备份」导出）。

---

## 路线 1 · PWA 添加到桌面（有电脑/有网络时最快）

1. 把 `finance-app/` 整个目录放到任意静态托管，或者用电脑做局域网服务器：
   ```powershell
   cd finance-app
   python -m http.server 8899
   ```
2. 手机连同一个 Wi-Fi，浏览器访问 `http://电脑IP:8899`。
3. 浏览器菜单 →「添加到桌面」/「安装应用」。
4. 桌面出现图标即可全屏运行。

> 注意：普通 http 域名下浏览器不给开 Service Worker，**离线缓存与"安装应用"提示会失效**（只能当快捷方式）。
> 想完全离线请用 HTTPS 托管，或走路线 2 的 APK。

---

## 路线 2 · 真正安装 APK（云端一键构建，推荐）

本机不需要 Android Studio，也不需要 Java —— 编译在 GitHub 的免费服务器上完成。

**第 1 步：建仓库**
1. 打开 github.com，注册/登录。
2. 右上角 ➕ → New repository，名字随便（例如 `flowatlas`），可以选 **Private**，创建。

**第 2 步：上传文件**
把当前这一整个工作目录（**必须同时包含 `finance-app/` 和 `android-app/` 两个文件夹**）上传上去：

- 网页方式：仓库页 → Add file → Upload files → 把两个文件夹拖进去 → Commit changes。
- 或者命令行：
  ```bash
  git init && git add . && git commit -m "FlowAtlas"
  git branch -M main
  git remote add origin https://github.com/你的用户名/flowatlas.git
  git push -u origin main
  ```

**第 3 步：让它自动编译**
推送完成后，仓库上方 **Actions** 标签 → 左侧「构建 APK」→ 右边 **Run workflow** → 绿色按钮。
等待 3～6 分钟，出现绿色 ✅ 后：

**第 4 步：下载 APK**
点进这次运行 → 页面底部 **Artifacts** → 下载 `FlowAtlas-APK`（是个 zip）→ 解压得到 `app-debug.apk`。

**第 5 步：装到手机**
1. 把 `app-debug.apk` 传到手机（微信/QQ 发文件，或数据线）。
2. 手机上点这个 APK → 系统提示"未知来源" → 允许本次安装。
3. 华为还有一道 **纯净模式** 拦截：设置 → 系统和更新 → 纯净模式 → 退出（或"允许本次安装"）。
4. 安装完成，桌面出现「**流水图鉴**」图标，**完全离线可用**。

---

## 路线 3 · 本机构建（已装 Android Studio 的人）

```powershell
# 需要 JDK 17 + Android SDK（ANDROID_HOME 指向 SDK 目录）
cd android-app
.\build-apk.cmd        # 自动同步网页资源 + gradle assembleDebug（推荐）
# 或：  node sync-web.js   然后   gradle assembleDebug
```

产物：`android-app\app\build\outputs\apk\debug\app-debug.apk`

---

## 安装后怎么用

1. 先在微信/支付宝里导出账单 CSV（见 README 的导出路径）。
2. 把 CSV 存到手机任意位置（下载目录、微信文件都行）。
3. 打开「流水图鉴」→ 底部 ➕ → 选择来源 → **点击选择账单文件** → 系统文件选择器里挑 CSV → 自动解析 → 确认导入。
4. 导出报告图片、备份 JSON 时，文件会写到 **「下载/FlowAtlas/」** 目录，文件管理器里能看到。

---

## 这个 APK 里做了什么

| 能力 | 实现 |
| --- | --- |
| 安全上下文 | `WebViewAssetLoader` 把本地资源挂在 `https://appassets.androidplatform.net`，因此 localStorage、WebCrypto 加密、Service Worker 全部可用 |
| 完全离线 | 代码里拦截一切非本地请求并返回 403；同时声明 `cleartextTrafficPermitted=false`，不信任任何明文流量 |
| 选账单文件 | `WebChromeClient.onShowFileChooser` → 系统文件选择器（支持多选 CSV/XLSX） |
| 导出图片/备份 | JS 桥 `FlowAtlasNative.saveFile()` → 通过 MediaStore 写入「下载/FlowAtlas/」，无需存储权限 |
| 返回键 | 网页内可后退则后退，否则退出应用 |
| 状态栏 | 与应用浅色主题一致的浅色状态栏 |

---

## 常见问题

**Q：提示"解析包时出现问题" / "应用未安装"**
APK 没下完整。重新下载 Artifact，或在手机上用支持 zip 的解压工具解压。

**Q：安装时被系统拦截**
设置 → 安全 → 更多安全设置 → 安装外部来源应用 → 允许"文件管理"或你用的浏览器；
再关掉 设置 → 系统和更新 → 纯净模式。

**Q：装完打开是空白页**
多半是 `app/src/main/assets/www/` 没同步。删掉这个目录重新跑 `sync-web.ps1`，或重新触发一次 Actions。

**Q：数据存在哪？卸载会丢吗？**
存在应用私有目录（WebView 的 localStorage）。**卸载即清空**。请定期「我的 → 备份 / 恢复 / 导出」导出 JSON，换机时用"覆盖恢复"。

**Q：能上架华为应用市场吗？**
需要正式签名证书 + 隐私声明。当前产物是 debug 签名，仅供自己和朋友安装；要上架请自行生成 keystore 并在 `app/build.gradle` 里配置 `signingConfigs`。
