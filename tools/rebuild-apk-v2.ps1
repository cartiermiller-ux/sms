# 正确重建 APK：
#   1) 用本地 App 构建产物替换 www 资源
#   2) 【关键】把 manifest.json 换成「云端运行时格式」，只更新版本号和 tabBar
#      —— 本地 uni build -p app 产出的是源码格式，原生侧读不懂，会导致 tabBar/launch_path 丢失
#   3) 同证书重签（SHA1 不变）
param(
    [string]$BaseApk  = "C:\我的下载\Uniapp+SpringBoot即时通讯APP源码 安卓iOS跨端\_deploy\android-webview\Msm-1.3.0-Compact.apk",
    [string]$RuntimeManifestSrc = "C:\我的下载\Uniapp+SpringBoot即时通讯APP源码 安卓iOS跨端\_deploy\android-webview\Msm-正式版-v1.2.0.apk",
    [string]$AppDist   = "C:\im-local\hx-frontend\dist\build\app",
    [string]$OutApk    = "C:\im-local\Msm-1.3.1.apk",
    [string]$Keystore  = "C:\im-local\app-cert.keystore",
    [string]$Alias     = "__uni__510b38e",
    [string]$StorePass = "<REDACTED_KEYSTORE_PW>",
    [string]$Work      = "C:\im-local\apk-rebuild2"
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem
$PREFIX = 'assets/apps/__UNI__510B38E/www/'
$utf8 = New-Object System.Text.UTF8Encoding($false)

function Read-ZipText($apk, $name) {
    $zip = [System.IO.Compression.ZipFile]::OpenRead($apk)
    $e = $zip.Entries | Where-Object { $_.FullName -eq $name }
    if (-not $e) { $zip.Dispose(); return $null }
    $ms = New-Object System.IO.MemoryStream
    $s = $e.Open(); $s.CopyTo($ms); $s.Close(); $zip.Dispose()
    $t = [System.Text.Encoding]::UTF8.GetString($ms.ToArray()); $ms.Dispose()
    return $t
}

$bt = Get-ChildItem "$env:LOCALAPPDATA\Android\Sdk\build-tools" -Directory |
      Sort-Object Name -Descending | Select-Object -First 1
$zipalign  = Join-Path $bt.FullName "zipalign.exe"
$apksigner = Join-Path $bt.FullName "apksigner.bat"
$btapt     = Join-Path $bt.FullName "aapt2.exe"

if (Test-Path $Work) { Remove-Item $Work -Recurse -Force }
New-Item -ItemType Directory -Force -Path $Work | Out-Null
$raw = Join-Path $Work "rebuilt.apk"
Copy-Item $BaseApk $raw -Force
Write-Host "[1] 基础 APK -> $raw"

# ---------- 2. 构造正确的运行时 manifest ----------
Write-Host "[2] 读取云端运行时 manifest ..."
$mtxt = Read-ZipText $RuntimeManifestSrc ($PREFIX + 'manifest.json')
if (-not $mtxt) { throw "没找到运行时 manifest 模板" }
$m = $mtxt | ConvertFrom-Json

$m.version.name = '1.3.0'
$m.version.code = 130

$tb = $m.'plus'.tabBar
$tb.color         = '#667781'
$tb.selectedColor = '#2F8FE5'
$tb.borderStyle   = 'rgba(0,0,0,0.06)'
$tb.height        = '56px'
$tb.iconWidth     = '24px'
$tb.fontSize      = '10px'

$newIcons = @(
    @{ p = 'wx/tabbar1/index'; i = '/static/msm/tab/chat.png';     s = '/static/msm/tab/chat-on.png' },
    @{ p = 'wx/tabbar2/index'; i = '/static/msm/tab/contacts.png'; s = '/static/msm/tab/contacts-on.png' },
    @{ p = 'wx/tabbar3/index'; i = '/static/msm/tab/discover.png'; s = '/static/msm/tab/discover-on.png' },
    @{ p = 'wx/tabbar4/index'; i = '/static/msm/tab/me.png';       s = '/static/msm/tab/me-on.png' }
)
for ($k = 0; $k -lt $tb.list.Count; $k++) {
    $item = $tb.list[$k]
    $match = $newIcons | Where-Object { $_.p -eq $item.pagePath }
    if ($match) { $item.iconPath = $match.i; $item.selectedIconPath = $match.s }
}

# 统一使用深色状态栏文字（页面都是浅色）
$m.'plus'.statusbar.background = '#FFFFFF'
$m.'plus'.statusbar.style = 'dark'

$fixedJson = $m | ConvertTo-Json -Depth 12 -Compress
$fixedPath = Join-Path $Work 'manifest.json'
[System.IO.File]::WriteAllText($fixedPath, $fixedJson, $utf8)
Write-Host "[2] 运行时 manifest 已构造："
Write-Host ("      version = {0} (code {1})" -f $m.version.name, $m.version.code)
Write-Host ("      tabBar  = color {0} / selected {1} / height {2}" -f $tb.color, $tb.selectedColor, $tb.height)
$tb.list | ForEach-Object { Write-Host ("        {0,-22} {1}" -f $_.pagePath, $_.iconPath) }

# ---------- 3. 替换 www ----------
$zip = [System.IO.Compression.ZipFile]::Open($raw, 'Update')
$old = @($zip.Entries | Where-Object { $_.FullName.StartsWith($PREFIX) })
Write-Host "[3] 删除旧 www 条目: $($old.Count)"
foreach ($e in $old) { $e.Delete() }

$files = Get-ChildItem $AppDist -Recurse -File
$n = 0
foreach ($f in $files) {
    $rel = $f.FullName.Substring($AppDist.Length + 1).Replace('\', '/')
    # manifest.json 跳过，稍后写入正确的运行时版本
    if ($rel -eq 'manifest.json') { continue }
    $entry = $zip.CreateEntry($PREFIX + $rel, [System.IO.Compression.CompressionLevel]::Optimal)
    $s = $entry.Open()
    $bytes = [System.IO.File]::ReadAllBytes($f.FullName)
    $s.Write($bytes, 0, $bytes.Length); $s.Close()
    $n++
}
Write-Host "[3] 写入 $n 个文件（manifest.json 除外）"

# 写入修正后的运行时 manifest
$me = $zip.CreateEntry($PREFIX + 'manifest.json', [System.IO.Compression.CompressionLevel]::Optimal)
$ms2 = $me.Open()
$mb = [System.IO.File]::ReadAllBytes($fixedPath)
$ms2.Write($mb, 0, $mb.Length); $ms2.Close()
Write-Host "[3] 已写入运行时 manifest.json ($($mb.Length) 字节)"
$zip.Dispose()

# ---------- 4. 复核 ----------
$zip = [System.IO.Compression.ZipFile]::OpenRead($raw)
$now = @($zip.Entries | Where-Object { $_.FullName.StartsWith($PREFIX) -and $_.Length -gt 0 })
Write-Host "[4] 复核：www 现在 $($now.Count) 个文件"
$me = $zip.Entries | Where-Object { $_.FullName -eq ($PREFIX + 'manifest.json') }
$ms3 = New-Object System.IO.MemoryStream; $es3 = $me.Open(); $es3.CopyTo($ms3); $es3.Close()
$chk = [System.Text.Encoding]::UTF8.GetString($ms3.ToArray()); $ms3.Dispose(); $zip.Dispose()
$ck = $chk | ConvertFrom-Json
Write-Host ("      id={0}  name={1}  version={2}({3})" -f $ck.id, $ck.name, $ck.version.name, $ck.version.code)
Write-Host ("      plus.tabBar 存在: " + [bool]$ck.'plus'.tabBar)
Write-Host ("      launch_path: " + $ck.launch_path)
Write-Host ("      tabBar 首个图标: " + $ck.'plus'.tabBar.list[0].iconPath)
if ($chk -match '09C160') { Write-Host "      ⚠ manifest 里仍有微信绿" } else { Write-Host "      ✔ manifest 无微信绿" }

# ---------- 5. zipalign + 重签 ----------
$aligned = Join-Path $Work "aligned.apk"
& $zipalign -f 4 $raw $aligned
if (Test-Path $OutApk) { Remove-Item $OutApk -Force }
& $apksigner sign --ks $Keystore --ks-key-alias $Alias `
    --ks-pass "pass:$StorePass" --key-pass "pass:$StorePass" `
    --v1-signing-enabled true --v2-signing-enabled true --out $OutApk $aligned
Write-Host "[5] zipalign + 重签完成"

# ---------- 6. 校验 ----------
Write-Host "`n[6] 最终校验" -ForegroundColor Cyan
$v = & $apksigner verify --print-certs $OutApk 2>&1
$v | Select-String "SHA-1 digest" | ForEach-Object { "    " + $_.Line.Trim() }
& $btapt dump badging $OutApk 2>&1 | Select-String "^package:|^application-label:" | ForEach-Object { "    " + $_.Line.Trim() }
$sha1 = ($v | Select-String "SHA-1 digest").Line
if ($sha1 -match '255d71275f7753fc049665451bf19e1a2b5ff7f8') { Write-Host "    OK SHA1 未变" -ForegroundColor Green }
else { Write-Host "    !! SHA1 变了: $sha1" -ForegroundColor Red }

Write-Host ("`n产物: {0}  ({1:N1} MB)" -f $OutApk, ((Get-Item $OutApk).Length/1MB)) -ForegroundColor Green
Write-Host ("SHA256: " + (Get-FileHash $OutApk -Algorithm SHA256).Hash) -ForegroundColor Green
