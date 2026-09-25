# 把高德 Android Key 换进已经打好的 APK（等长替换 + 重签，SHA1 不变）
#
# 用法:
#   .\apply-amap-key.ps1 -Key <REDACTED_AMAP_KEY>
#
# 原理:
#   云打包时 DCloud 把 appkey_android 以 UTF-16LE 写进 AndroidManifest.xml 的
#   <meta-data android:name="com.amap.api.v2.apikey" android:value="..."/>
#   高德 Android Key 固定 32 位十六进制，所以新旧等长，
#   直接替换字节不会影响 AXML 字符串池的任何偏移，无需解码/编码二进制 XML。
#
#   替换后必须重新签名（签名覆盖整个 APK）。这里用同一张 DCloud 证书重签，
#   所以 SHA1 保持不变，DCloud 离线打包 AppKey 校验依旧通过。

param(
    [Parameter(Mandatory = $true)][string]$Key,
    [string]$SrcApk   = "C:\我的下载\Uniapp+SpringBoot即时通讯APP源码 安卓iOS跨端\_deploy\android-webview\Msm-云打包正式版-v1.2.0.apk",
    [string]$OutApk   = "C:\im-local\Msm-amap.apk",
    [string]$Keystore = "C:\im-local\app-cert.keystore",
    [string]$Alias    = "__uni__510b38e",
    [string]$StorePass = "<REDACTED_KEYSTORE_PW>",
    [string]$OldKey   = "81cc6c72aeb6a1946510cc1e9f87ee80",
    [string]$Work     = "C:\im-local\amap-patch"
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem

function Get-Bytes([string]$s, $enc) { return $enc.GetBytes($s) }
function Find-Pattern([byte[]]$hay, [byte[]]$needle) {
    $hits = @()
    for ($i = 0; $i -le $hay.Length - $needle.Length; $i++) {
        $ok = $true
        for ($j = 0; $j -lt $needle.Length; $j++) { if ($hay[$i + $j] -ne $needle[$j]) { $ok = $false; break } }
        if ($ok) { $hits += $i; $i += $needle.Length - 1 }
    }
    return $hits
}

# ---------- 0. 校验 ----------
$Key = $Key.Trim()
if ($Key -notmatch '^[0-9a-fA-F]{32}$') { throw "高德 Key 必须是 32 位十六进制，当前 '$Key'（长度 $($Key.Length)）" }
if ($Key -eq $OldKey) { throw "新旧 Key 相同，无需替换" }
Write-Host "[0] 新 Key = $Key  ✓ 32 位" -ForegroundColor Green
if (-not (Test-Path $SrcApk)) { throw "找不到源 APK: $SrcApk" }

# ---------- 1. build-tools ----------
$bt = Get-ChildItem "$env:LOCALAPPDATA\Android\Sdk\build-tools" -Directory |
      Sort-Object Name -Descending | Select-Object -First 1
if (-not $bt) { throw "找不到 Android build-tools" }
$zipalign  = Join-Path $bt.FullName "zipalign.exe"
$apksigner = Join-Path $bt.FullName "apksigner.bat"
Write-Host "[1] build-tools = $($bt.Name)"

# ---------- 2. 复制 ----------
if (Test-Path $Work) { Remove-Item $Work -Recurse -Force }
New-Item -ItemType Directory -Force -Path $Work | Out-Null
$raw = Join-Path $Work "patched.apk"
Copy-Item $SrcApk $raw -Force
Write-Host "[2] 复制 -> $raw"

# ---------- 3. 读出 AndroidManifest.xml，打补丁 ----------
$zip = [System.IO.Compression.ZipFile]::OpenRead($raw)
$entry = $zip.Entries | Where-Object { $_.FullName -eq 'AndroidManifest.xml' }
if (-not $entry) { $zip.Dispose(); throw "APK 里没有 AndroidManifest.xml" }
$ms = New-Object System.IO.MemoryStream
$es = $entry.Open(); $es.CopyTo($ms); $es.Close(); $zip.Dispose()
$man = $ms.ToArray(); $ms.Dispose()
Write-Host "[3] AndroidManifest.xml = $($man.Length) 字节"

# 3a. 确认这是二进制 AXML，且含高德 meta-data 名
$u16 = [System.Text.Encoding]::Unicode
$nameBytes = Get-Bytes 'com.amap.api.v2.apikey' $u16
$nameHits = Find-Pattern $man $nameBytes
Write-Host "    含 'com.amap.api.v2.apikey' 于偏移: $($nameHits -join ', ')"
if ($nameHits.Count -eq 0) { throw "没找到 com.amap.api.v2.apikey，可能不是高德配置的包" }

# 3b. 定位旧 key（UTF-16LE）并等长替换
$oldBytes = Get-Bytes $OldKey $u16
$newBytes = Get-Bytes $Key    $u16
$oldHits = Find-Pattern $man $oldBytes
Write-Host "    旧 Key '$OldKey' 出现位置: $($oldHits -join ', ')"
if ($oldHits.Count -eq 0) {
    throw "没找到旧 Key。如果已经换过一次，请用 -OldKey 指定当前 Key"
}
foreach ($off in $oldHits) {
    # 校验前面是长度前缀 20 00
    $prefix = if ($off -ge 2) { "{0:X2} {1:X2}" -f $man[$off-2], $man[$off-1] } else { '??' }
    Write-Host ("    @{0}  前缀字节 = {1} {2}" -f $off, $prefix, $(if ($prefix -eq '20 00') { '(=32，符合预期 ✓)' } else { '(非预期 ⚠)' }))
    [Array]::Copy($newBytes, 0, $man, $off, 64)
}
Write-Host "[3] 已等长替换 $($oldHits.Count) 处（每处 64 字节，文件长度不变: $($man.Length)）" -ForegroundColor Green

# ---------- 4. 写回 zip ----------
$zip = [System.IO.Compression.ZipFile]::Open($raw, 'Update')
$e = $zip.Entries | Where-Object { $_.FullName -eq 'AndroidManifest.xml' }
$e.Delete()
$ne = $zip.CreateEntry('AndroidManifest.xml', [System.IO.Compression.CompressionLevel]::Optimal)
$s = $ne.Open(); $s.Write($man, 0, $man.Length); $s.Close()
$zip.Dispose()
Write-Host "[4] 已写回 APK"

# ---------- 5. 复核 ----------
$zip = [System.IO.Compression.ZipFile]::OpenRead($raw)
$e = $zip.Entries | Where-Object { $_.FullName -eq 'AndroidManifest.xml' }
$ms = New-Object System.IO.MemoryStream; $s = $e.Open(); $s.CopyTo($ms); $s.Close(); $zip.Dispose()
$chk = [System.Text.Encoding]::Unicode.GetString($ms.ToArray()); $ms.Dispose()
$hasNew = $chk.Contains($Key); $hasOld = $chk.Contains($OldKey)
Write-Host "[5] 复核: 含新 Key = $hasNew ; 含旧 Key = $hasOld"
if (-not $hasNew -or $hasOld) { throw "复核失败" }
Write-Host "    复核通过 ✓" -ForegroundColor Green

# ---------- 6. zipalign ----------
$aligned = Join-Path $Work "aligned.apk"
& $zipalign -f 4 $raw $aligned
if (-not (Test-Path $aligned)) { throw "zipalign 失败" }
Write-Host "[6] zipalign 完成"

# ---------- 7. 重签 ----------
if (-not (Test-Path $Keystore)) { throw "找不到证书 $Keystore" }
if (Test-Path $OutApk) { Remove-Item $OutApk -Force }
& $apksigner sign --ks $Keystore --ks-key-alias $Alias `
    --ks-pass "pass:$StorePass" --key-pass "pass:$StorePass" `
    --v1-signing-enabled true --v2-signing-enabled true `
    --out $OutApk $aligned
if (-not (Test-Path $OutApk)) { throw "签名失败" }
Write-Host "[7] 重签完成 -> $OutApk"

# ---------- 8. 校验 ----------
Write-Host "`n[8] 最终校验" -ForegroundColor Cyan
$v = & $apksigner verify --print-certs $OutApk 2>&1
$v | Select-String "SHA-1 digest|SHA-256 digest" | ForEach-Object { "    " + $_.Line.Trim() }
& (Join-Path $bt.FullName "aapt2.exe") dump badging $OutApk 2>&1 |
    Select-String "^package:|^application-label:" | ForEach-Object { "    " + $_.Line.Trim() }

$sha1line = ($v | Select-String "SHA-1 digest").Line
if ($sha1line -match '255d71275f7753fc049665451bf19e1a2b5ff7f8') {
    Write-Host "`n    ✅ SHA1 未变 = 255d71275f7753fc049665451bf19e1a2b5ff7f8" -ForegroundColor Green
    Write-Host "       DCloud AppKey 校验依旧有效" -ForegroundColor Green
} else {
    Write-Host "`n    ❌ SHA1 变了！$sha1line" -ForegroundColor Red
}

Write-Host "`n产物: $OutApk" -ForegroundColor Green
Write-Host "APK SHA256: $((Get-FileHash $OutApk -Algorithm SHA256).Hash)" -ForegroundColor Green
Write-Host "`n别忘了同步源码 manifest.json 里的 appkey_android。" -ForegroundColor Yellow
