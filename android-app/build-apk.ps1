<#
  一键构建 APK（需要 JDK 17 + Android SDK，并设置 ANDROID_HOME）
  若提示"禁止运行脚本"，改用：
    powershell -ExecutionPolicy Bypass -File .\build-apk.ps1
  或直接双击 build-apk.cmd
#>
$ErrorActionPreference = 'Stop'
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $here

Write-Output '[1/2] 同步网页端资源…'
node (Join-Path $here 'sync-web.js')

Write-Output '[2/2] 构建 APK…'
if (Get-Command gradle -ErrorAction SilentlyContinue) {
    gradle assembleDebug
} elseif (Test-Path (Join-Path $here 'gradlew.bat')) {
    & (Join-Path $here 'gradlew.bat') assembleDebug
} else {
    Write-Error '未找到 gradle。请安装 Android Studio（自带 Gradle），或使用 GitHub Actions 云端构建（见 README-安装指引.md 路线 2）。'
}

$apk = Join-Path $here 'app\build\outputs\apk\debug\app-debug.apk'
if (Test-Path $apk) {
    Write-Output ('构建成功：' + $apk)
    Write-Output ('大小：' + [math]::Round((Get-Item $apk).Length / 1MB, 2) + ' MB')
} else {
    Write-Error '构建失败，请查看上方日志。'
}
