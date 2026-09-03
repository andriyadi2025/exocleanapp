# ============================================================================
#  bangun.ps1 — membangun APK EXOCLEAN App (pelanggan + mitra) dari PowerShell
# ----------------------------------------------------------------------------
#  Kenapa skrip ini ada: Android Studio 2026.1 membawa JBR 25, sedangkan
#  Gradle 8.14 (yang dipakai template Capacitor 8) hanya berjalan sampai
#  Java 24. Karena itu JDK 21 portabel disimpan di ../alat dan dipakai HANYA
#  untuk build ini — tidak ada pengaturan sistem yang diubah.
#
#  Pakai:   .\bangun.ps1            → APK debug (untuk uji di ponsel)
#           .\bangun.ps1 -Rilis     → AAB rilis (perlu keystore, lihat BACA-DULU)
#           .\bangun.ps1 -Sync      → susun ulang www/ dari ../app dulu
# ============================================================================
param([switch]$Rilis, [switch]$Sync)

$akar = Split-Path -Parent $MyInvocation.MyCommand.Path
$jdk = Get-ChildItem -Path (Join-Path $akar "..\alat") -Directory -Filter "jdk-21*" -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $jdk) { Write-Error "JDK 21 tidak ditemukan di ..\alat. Unduh Temurin 21 (zip) dan ekstrak ke sana."; exit 1 }
$sdk = if ($env:ANDROID_HOME) { $env:ANDROID_HOME } else { "$env:LOCALAPPDATA\Android\Sdk" }
if (-not (Test-Path $sdk)) { Write-Error "Android SDK tidak ditemukan: $sdk"; exit 1 }

$env:JAVA_HOME = $jdk.FullName
$env:ANDROID_HOME = $sdk
$env:ANDROID_SDK_ROOT = $sdk
$env:Path = "$($jdk.FullName)\bin;$env:Path"

if ($Sync) {
  Set-Location $akar
  node siapkan-www.js; if ($LASTEXITCODE -ne 0) { exit 1 }
  npx cap sync android; if ($LASTEXITCODE -ne 0) { exit 1 }
}

Set-Location (Join-Path $akar "android")
$tugas = if ($Rilis) { "bundleRelease" } else { "assembleDebug" }
& .\gradlew.bat $tugas --console=plain
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

if ($Rilis) { Write-Host "`nAAB: android\app\build\outputs\bundle\release\app-release.aab" }
else { Write-Host "`nAPK: android\app\build\outputs\apk\debug\app-debug.apk" }
