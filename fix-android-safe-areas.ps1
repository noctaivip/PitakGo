# PitakGo v0.27: enforce real Android system-bar insets at native WebView boundary.
# Safe to rerun. Does not touch user data, app navigation, or any JS business logic.
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
$mainDir = Join-Path $PSScriptRoot 'android\app\src\main'
if (!(Test-Path $mainDir)) { throw 'Android project not found. Run npx cap add android first.' }
$main = Get-ChildItem (Join-Path $mainDir 'java') -Recurse -Filter MainActivity.java | Where-Object { (Get-Content $_.FullName -Raw) -match 'extends BridgeActivity' } | Select-Object -First 1
if (!$main) { throw 'Capacitor MainActivity.java not found. No changes applied.' }
$src = [System.IO.File]::ReadAllText($main.FullName)
if ($src -notmatch 'PITAKGO_SYSTEM_INSETS_V027') {
  if ($src -match 'void\s+onCreate\s*\(') { throw 'MainActivity already has a custom onCreate. Stopped to avoid overwriting existing code.' }
  $imports = @'
import android.os.Bundle;
import android.graphics.Color;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowManager;
import androidx.core.view.WindowCompat;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
'@
  $src = [regex]::Replace($src, '(?m)^(package\s+[^;]+;)', ('$1' + "`r`n" + $imports), 1)
  $method = @'
    // PITAKGO_SYSTEM_INSETS_V027: Android 15/16 and older Android with 3-button or gesture navigation.
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setStatusBarColor(Color.rgb(244, 246, 251));
        getWindow().setNavigationBarColor(Color.rgb(244, 246, 251));
        if (android.os.Build.VERSION.SDK_INT >= 29) {
            getWindow().setNavigationBarContrastEnforced(false);
        }
        getWindow().getDecorView().setSystemUiVisibility(
            View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR | View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR);
        // Consistently use edge-to-edge at the window layer, then subtract actual system-bar insets
        // from the WebView itself. The page can never paint behind Android clock or navigation keys.
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        final View web = getBridge().getWebView();
        ViewCompat.setOnApplyWindowInsetsListener(web, (view, windowInsets) -> {
            androidx.core.graphics.Insets bars = windowInsets.getInsets(
                WindowInsetsCompat.Type.statusBars() | WindowInsetsCompat.Type.navigationBars() |
                WindowInsetsCompat.Type.displayCutout());
            ViewGroup.LayoutParams lp = view.getLayoutParams();
            if (lp instanceof ViewGroup.MarginLayoutParams) {
                ViewGroup.MarginLayoutParams margins = (ViewGroup.MarginLayoutParams) lp;
                if (margins.topMargin != bars.top || margins.bottomMargin != bars.bottom ||
                    margins.leftMargin != bars.left || margins.rightMargin != bars.right) {
                    margins.setMargins(bars.left, bars.top, bars.right, bars.bottom);
                    view.setLayoutParams(margins);
                }
            }
            return windowInsets;
        });
        ViewCompat.requestApplyInsets(web);
    }
'@
  $idx = $src.LastIndexOf('}')
  if ($idx -lt 0) { throw 'Malformed MainActivity.java. No changes applied.' }
  $src = $src.Insert($idx, $method + "`r`n")
  [System.IO.File]::WriteAllText($main.FullName, $src, [System.Text.UTF8Encoding]::new($false))
}
# On Android 15+ keep native bar background opaque, while Java margins prevent overlap.
$colorsPath = Join-Path $mainDir 'res\values\colors.xml'
if (!(Test-Path $colorsPath)) {
  New-Item -ItemType Directory -Force (Split-Path $colorsPath) | Out-Null
  [System.IO.File]::WriteAllText($colorsPath, '<?xml version="1.0" encoding="utf-8"?><resources></resources>')
}
# Explicit XmlDocument: PowerShell's $xml.resources property may unwrap to a string
# when <resources/> is empty, causing both SelectSingleNode and AppendChild failures.
$colors = New-Object System.Xml.XmlDocument
$colors.Load($colorsPath)
$resources = $colors.DocumentElement
if ($null -eq $resources -or $resources.LocalName -ne 'resources') {
  throw 'Invalid Android colors.xml: expected <resources> root. File was not changed.'
}
$node = $resources.SelectSingleNode("color[@name='pitakgo_system_bar']")
if ($null -eq $node) {
  $node = $colors.CreateElement('color')
  $node.SetAttribute('name','pitakgo_system_bar')
  [void]$resources.AppendChild($node)
}
$node.InnerText = '#F4F6FB'
$colors.Save($colorsPath)
Write-Host 'PitakGo: native Android status and navigation insets installed successfully.' -ForegroundColor Green
