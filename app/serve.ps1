# ============================================================================
#  serve.ps1 — server statis sederhana untuk menjalankan aplikasi EXOCLEAN
#  Dipakai bila Node.js belum terpasang. Jalankan:
#      powershell -ExecutionPolicy Bypass -File serve.ps1
#  lalu buka http://localhost:8080 di browser.
# ============================================================================
param([int]$Port = 8080)

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$listener = New-Object System.Net.HttpListener
# Keduanya loopback — TIDAK terbuka ke jaringan. 127.0.0.1 ditambahkan karena
# peramban memperlakukannya sebagai asal (origin) yang berbeda dari localhost,
# dan itu satu-satunya cara menguji dua "perangkat" pada satu komputer:
# penyimpanan browser dipisah per asal, persis seperti dua mesin sungguhan.
$listener.Prefixes.Add("http://localhost:$Port/")
$listener.Prefixes.Add("http://127.0.0.1:$Port/")

try { $listener.Start() }
catch { Write-Host "Gagal membuka port $Port. Coba port lain: serve.ps1 -Port 8081"; exit 1 }

Write-Host "EXOCLEAN berjalan di http://localhost:$Port/  (Ctrl+C untuk berhenti)"

$mime = @{
  '.html' = 'text/html; charset=utf-8'
  '.css'  = 'text/css; charset=utf-8'
  '.js'   = 'application/javascript; charset=utf-8'
  '.json' = 'application/json; charset=utf-8'
  '.png'  = 'image/png'
  '.jpg'  = 'image/jpeg'
  '.svg'  = 'image/svg+xml'
  '.ico'  = 'image/x-icon'
}

# ----------------------------------------------------------------------------
#  YANG TIDAK PERNAH DILAYANI
#
#  Folder server/ berada di dalam app/, dan di dalamnya ada .env yang memuat
#  Server Key Midtrans, sandi agen Darmawisata, API key Biteship, dan token
#  mail. Tanpa penjaga ini, seluruhnya bisa diunduh siapa pun yang menjangkau
#  port ini — cukup dengan membuka /server/.env di peramban.
#
#  Diblokir per SEGMEN jalur, bukan per akhiran nama berkas: memblokir '.env'
#  saja akan melewatkan '.env.bak', 'server/data/exoclean.db', dan seisi
#  node_modules.
# ----------------------------------------------------------------------------
# 'data' TIDAK ada di daftar ini: app/data/wilayah berisi data negara,
#  provinsi dan kabupaten yang memang harus bisa diambil peramban. Basis data
#  SQLite duduk di app/server/data, dan segmen 'server' sudah menutupnya.
$terlarang = @('server', 'node_modules')

function Jalur-Aman([string]$jalur) {
  foreach ($seg in ($jalur -split '[\\/]+')) {
    if ($seg -eq '') { continue }
    if ($seg.StartsWith('.')) { return $false }        # .env, .git, dan sejenisnya
    if ($terlarang -contains $seg.ToLower()) { return $false }
  }
  return $true
}

while ($listener.IsListening) {
  $ctx = $listener.GetContext()
  $path = [System.Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath)
  if ($path -eq '/') { $path = '/index.html' }
  $rel = $path.TrimStart('/') -replace '/', '\'

  # Jalur dinormalkan DULU, baru diperiksa masih di dalam root. Memeriksa
  # sebelum normalisasi membuat '..\..\' lolos karena teksnya memang diawali
  # root sebelum sistem berkas menyelesaikannya.
  $file = $null
  if (Jalur-Aman $rel) {
    try {
      $gabung = [System.IO.Path]::Combine($root, $rel)
      $penuh = [System.IO.Path]::GetFullPath($gabung)
      if ($penuh.StartsWith($root, [System.StringComparison]::OrdinalIgnoreCase)) { $file = $penuh }
    } catch { $file = $null }
  }

  if ($file -and (Test-Path $file -PathType Leaf)) {
    $ext = [System.IO.Path]::GetExtension($file).ToLower()
    $ctx.Response.ContentType = if ($mime.ContainsKey($ext)) { $mime[$ext] } else { 'application/octet-stream' }
    $bytes = [System.IO.File]::ReadAllBytes($file)
    $ctx.Response.ContentLength64 = $bytes.Length
    $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
  } else {
    $ctx.Response.StatusCode = 404
    $msg = [System.Text.Encoding]::UTF8.GetBytes('404 - berkas tidak ditemukan')
    $ctx.Response.OutputStream.Write($msg, 0, $msg.Length)
  }
  $ctx.Response.OutputStream.Close()
}
