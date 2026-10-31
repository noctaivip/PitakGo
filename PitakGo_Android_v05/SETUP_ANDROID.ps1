$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot
if (!(Test-Path "android")) { npx cap add android; if ($LASTEXITCODE -ne 0) { throw "cap add android failed" } }
npx cap sync android
if ($LASTEXITCODE -ne 0) { throw "cap sync android failed" }
Get-ChildItem "assets\android-icons" -Directory | ForEach-Object {
  $target = Join-Path "android\app\src\main\res" $_.Name
  New-Item -ItemType Directory -Force -Path $target | Out-Null
  Copy-Item (Join-Path $_.FullName "ic_launcher.png") (Join-Path $target "ic_launcher.png") -Force
  Copy-Item (Join-Path $_.FullName "ic_launcher_round.png") (Join-Path $target "ic_launcher_round.png") -Force
  Copy-Item (Join-Path $_.FullName "ic_launcher_foreground.png") (Join-Path $target "ic_launcher_foreground.png") -Force
}
# Disable default adaptive launcher XML so the full supplied icon displays without clipping.
foreach ($folder in @("android\app\src\main\res\mipmap-anydpi-v26", "android\app\src\main\res\mipmap-anydpi")) {
  if (Test-Path $folder) { Remove-Item (Join-Path $folder "ic_launcher.xml") -ErrorAction SilentlyContinue; Remove-Item (Join-Path $folder "ic_launcher_round.xml") -ErrorAction SilentlyContinue }
}
Write-Host "PitakGo synchronized and launcher icon installed." -ForegroundColor Green
npx cap open android
