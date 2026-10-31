$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
npm install
npx cap sync android
$res = Join-Path $PSScriptRoot 'android\app\src\main\res'
if (-not (Test-Path $res)) { throw 'Android project missing. Run npx cap add android and retry.' }
Get-ChildItem (Join-Path $PSScriptRoot 'android_icon_fix') -Directory | ForEach-Object {
  $target = Join-Path $res $_.Name
  New-Item -ItemType Directory -Force -Path $target | Out-Null
  Copy-Item (Join-Path $_.FullName '*') -Destination $target -Force
}
Write-Host 'New Пятак Go Android launcher icons installed. Rebuild and reinstall via Android Studio Run.' -ForegroundColor Green
npx cap open android
