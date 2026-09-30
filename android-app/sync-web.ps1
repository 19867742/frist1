# 已迁移到 Node 版（不受 PowerShell 执行策略限制），保留此文件仅为兼容旧命令
# 请使用： node sync-web.js   或双击 sync-web.cmd
node (Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) 'sync-web.js')
