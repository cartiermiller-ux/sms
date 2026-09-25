# 用本地 App 构建产物替换已打包 APK 内的 H5 资源，再同证书重签
#   —— 绕开 DCloud 每日云打包次数限制，SHA1 保持不变
#
# 用法: .\rebuild-apk-from-app.ps1
param(
    [string]$BaseApk = "C:\我的下载\Uniapp+SpringBoot即时通讯APP源码 安卓iOS跨端\_deploy\android-webview\Msm-正式版-v1.2.0.apk",
    [string]$AppDist = "C:\im-local\hx-frontend\dist\build\app",
    [string]$OutApk  = "C:\im-local\Msm-1.3.0-newui.apk",
    [string]$Keystore = "C:\im-local\app-cert.keystore",
    [string]$Alias    = "__uni__510b38e",
    [string]$StorePass = "<REDACTED_KEYSTORE_PW>",
    [string]$Work     = "C:\im-local\apk-rebuild"
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem

$PREFIX = 'assets/apps/__UNI__510B38E/www/'

# ---------- 0. 前置检查 ----------
if (-not (Test-Path $BaseApk)) { throw "找不到基础 APK: $BaseApk" }
if (-not (Test-Path $AppDist)) { throw "找不到 App 构建产物: $AppDist" }
if (-not (Test-Path $Keystore)) { throw "找不到证书: $Keystore" }

$bt = Get-ChildItem "$env:LOCALAPPDATA\Android\Sdk\build-tools" -Directory |
      Sort-Object Name -Descending | Select-Object -First 1
$zipalign  = Join-Path $bt.FullName "zipalign.exe"
$apksigner = Join-Path $bt.FullName "apksigner.bat"
$btapt     = Join-Path $bt.FullName "aapt2.exe"
Write-Host "[0] build-tools = $($bt.Name)"

if (Test-Path $Work) { Remove-Item $Work -Recurse -Force }
New-Item -ItemType Directory -Force -Path $Work | Out-Null
$raw = Join-Path $Work "rebuilt.apk"
Copy-Item $BaseApk $raw -Force
Write-Host "[1] 基础 APK -> $raw  ($([math]::Round((Get-Item $raw).Length/1MB,1)) MB)"

# ---------- 2. 替换 www 资源 ----------
$zip = [System.IO.Compression.ZipFile]::Open($raw, 'Update')

$old = @($zip.Entries | Where-Object { $_.FullName.StartsWith($PREFIX) })
Write-Host "[2] 删除旧的 www 条目: $($old.Count) 个"
foreach ($e in $old) { $e.Delete() }

$files = Get-ChildItem $AppDist -Recurse -File
Write-Host "[2] 写入新资源: $($files.Count) 个"
$n = 0
foreach ($f in $files) {
    $rel = $f.FullName.Substring($AppDist.Length + 1).Replace('\', '/')
    $entry = $zip.CreateEntry($PREFIX + $rel, [System.IO.Compression.CompressionLevel]::Optimal)
    $s = $entry.Open()
    $bytes = [System.IO.File]::ReadAllBytes($f.FullName)
    $s.Write($bytes, 0, $bytes.Length)
    $s.Close()
    $n++
}
$zip.Dispose()
Write-Host "[2] 完成，共写入 $n 个文件"

# ---------- 3. 复核 ----------
$zip = [System.IO.Compression.ZipFile]::OpenRead($raw)
$now = @($zip.Entries | Where-Object { $_.FullName.StartsWith($PREFIX) -and $_.Length -gt 0 })
Write-Host "[3] 复核: www 现在有 $($now.Count) 个文件"

# 关键新文件在不在
foreach ($k in @('static/msm/tab/chat-on.png', 'static/msm/splash-bg.jpg', 'app-service.js', 'manifest.json')) {
    $hit = $now | Where-Object { $_.FullName -eq ($PREFIX + $k) }
    Write-Host ("      {0,-32} {1}" -f $k, $(if ($hit) { "OK ($($hit.Length) B)" } else { '*** 缺失 ***' }))
}

# 版本号
$mEntry = $zip.Entries | Where-Object { $_.FullName -eq ($PREFIX + 'manifest.json') }
$ms = New-Object System.IO.MemoryStream
$es = $mEntry.Open(); $es.CopyTo($ms); $es.Close()
$mj = [System.Text.Encoding]::UTF8.GetString($ms.ToArray()); $ms.Dispose()
$mobj = $mj | ConvertFrom-Json
Write-Host ("[3] APK 内版本: {0} (code {1})   包名: {2}" -f $mobj.version.name, $mobj.version.code, $mobj.id)
$zip.Dispose()

# ---------- 4. zipalign ----------
$aligned = Join-Path $Work "aligned.apk"
& $zipalign -f 4 $raw $aligned
if (-not (Test-Path $aligned)) { throw "zipalign 失败" }
Write-Host "[4] zipalign 完成"

# ---------- 5. 同证书重签 ----------
if (Test-Path $OutApk) { Remove-Item $OutApk -Force }
& $apksigner sign --ks $Keystore --ks-key-alias $Alias `
    --ks-pass "pass:$StorePass" --key-pass "pass:$StorePass" `
    --v1-signing-enabled true --v2-signing-enabled true `
    --out $OutApk $aligned
if (-not (Test-Path $OutApk)) { throw "签名失败" }
Write-Host "[5] 重签完成"

# ---------- 6. 校验 ----------
Write-Host "`n[6] 最终校验" -ForegroundColor Cyan
$v = & $apksigner verify --print-certs $OutApk 2>&1
$v | Select-String "SHA-1 digest|SHA-256 digest" | ForEach-Object { "    " + $_.Line.Trim() }
& $btapt dump badging $OutApk 2>&1 |
    Select-String "^package:|^application-label:|^native-code" | ForEach-Object { "    " + $_.Line.Trim() }

$sha1line = ($v | Select-String "SHA-1 digest").Line
if ($sha1line -match '255d71275f7753fc049665451bf19e1a2b5ff7f8') {
    Write-Host "`n    OK  SHA1 未变 = 255d71275f7753fc049665451bf19e1a2b5ff7f8" -ForegroundColor Green
    Write-Host "        DCloud AppKey 校验依旧有效" -ForegroundColor Green
} else {
    Write-Host "`n    !! SHA1 变了: $sha1line" -ForegroundColor Red
}

Write-Host "`n产物: $OutApk" -ForegroundColor Green
Write-Host ("大小: {0:N1} MB" -f ((Get-Item $OutApk).Length/1MB)) -ForegroundColor Green
Write-Host ("SHA256: " + (Get-FileHash $OutApk -Algorithm SHA256).Hash) -ForegroundColor Green
