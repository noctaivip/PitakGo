# PitakGo: Android status and navigation bars, preserving existing app files.
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
$root = Join-Path $PSScriptRoot 'android\app\src\main'
if (-not (Test-Path $root)) { throw 'Android folder not found. Run npx cap add android first.' }
$res = Join-Path $root 'res'
$colorPath = Join-Path $res 'values\colors.xml'
if (-not (Test-Path $colorPath)) {
  New-Item -ItemType Directory -Force -Path (Split-Path $colorPath) | Out-Null
  [System.IO.File]::WriteAllText($colorPath, '<?xml version="1.0" encoding="utf-8"?><resources></resources>', [System.Text.UTF8Encoding]::new($false))
}
[xml]$colors = Get-Content -Raw -Encoding UTF8 $colorPath
if ($null -eq $colors.resources) { throw 'Unexpected colors.xml format.' }
foreach ($name in @('pitakgo_system_bar')) {
  $existing = $colors.resources.SelectSingleNode("color[@name='$name']")
  if ($null -eq $existing) {
    $existing = $colors.CreateElement('color')
    $existing.SetAttribute('name', $name)
    [void]$colors.resources.AppendChild($existing)
  }
  $existing.InnerText = '#F4F6FB'
}
$colors.Save($colorPath)
# Add safe native window colors to the app theme (without replacing any other styles).
$stylePaths = @((Join-Path $res 'values\styles.xml'),(Join-Path $res 'values-v31\styles.xml'))
foreach ($stylePath in $stylePaths) {
 if (-not (Test-Path $stylePath)) { continue }
 [xml]$styles = Get-Content -Raw -Encoding UTF8 $stylePath
 foreach ($style in @($styles.resources.style)) {
   if ($null -eq $style) { continue }
   $items = @{
     'android:statusBarColor'='@color/pitakgo_system_bar'
     'android:navigationBarColor'='@color/pitakgo_system_bar'
     'android:windowLightStatusBar'='true'
     'android:windowLightNavigationBar'='true'
     'android:enforceNavigationBarContrast'='false'
   }
   foreach ($key in $items.Keys) {
     $item = @($style.item | Where-Object { $_.name -eq $key }) | Select-Object -First 1
     if ($null -eq $item) {
       $item = $styles.CreateElement('item')
       $item.SetAttribute('name',$key)
       [void]$style.AppendChild($item)
     }
     $item.InnerText=$items[$key]
   }
 }
 $styles.Save($stylePath)
}
# Android 15: preserve the original style definitions and append opt-out only.
$baseStyles = Join-Path $res 'values\styles.xml'
$api35 = Join-Path $res 'values-v35\styles.xml'
if (Test-Path $baseStyles) {
  New-Item -ItemType Directory -Force -Path (Split-Path $api35) | Out-Null
  [xml]$base = Get-Content -Raw -Encoding UTF8 $baseStyles
  foreach ($style in @($base.resources.style)) {
    if ($null -eq $style) { continue }
    $item = @($style.item | Where-Object { $_.name -eq 'android:windowOptOutEdgeToEdgeEnforcement' }) | Select-Object -First 1
    if ($null -eq $item) {
      $item = $base.CreateElement('item')
      $item.SetAttribute('name','android:windowOptOutEdgeToEdgeEnforcement')
      [void]$style.AppendChild($item)
    }
    $item.InnerText='true'
  }
  $base.Save($api35)
}
Write-Host 'PitakGo: Android status/navigation bars configured with opaque light background.' -ForegroundColor Green
