# 构建干净的 sms 仓库并推送到 GitHub
#   - 排除 node_modules / dist / target / APK / JDK / Maven / nativeplugins
#   - 脱敏：SSH 密码 / 数据库密码 / 证书密码 / AppKey / 密钥库文件
$ErrorActionPreference = 'Stop'

$SRC = 'C:\我的下载\Uniapp+SpringBoot即时通讯APP源码 安卓iOS跨端\_deploy'
$OUT = 'C:\im-local\sms-push'
$utf8 = New-Object System.Text.UTF8Encoding($false)

if (Test-Path $OUT) { Remove-Item $OUT -Recurse -Force }
New-Item -ItemType Directory -Force -Path $OUT | Out-Null

function Copy-Tree($from, $to, $excludeDirs, $excludeExt) {
    if (-not (Test-Path $from)) { Write-Host "    跳过(不存在): $from"; return }
    New-Item -ItemType Directory -Force -Path $to | Out-Null
    $xd = @()
    foreach ($d in $excludeDirs) { $xd += (Join-Path $from $d) }
    Get-ChildItem $from -Force | ForEach-Object {
        if ($_.PSIsContainer) {
            if ($excludeDirs -contains $_.Name) { return }
            Copy-Tree $_.FullName (Join-Path $to $_.Name) $excludeDirs $excludeExt
        } else {
            if ($excludeExt -contains $_.Extension.ToLower()) { return }
            if ($_.Name -like '*.keystore' -or $_.Name -like '*.jks' -or $_.Name -like '*.p12') { return }
            Copy-Item $_.FullName (Join-Path $to $_.Name) -Force
        }
    }
}

Write-Host "=== 1) 复制源码 ==="
Copy-Tree "$SRC\frontend" "$OUT\frontend" @('node_modules','dist','nativeplugins','.git') @('.apk','.jar','.zip')
Copy-Tree "$SRC\backend"  "$OUT\backend"  @('target','logs','.git') @('.apk','.jar','.zip')
Copy-Tree "$SRC\android-webview" "$OUT\android" @('res') @('.apk','.jar','.zip','.keystore')
Copy-Tree "$SRC\privacy"  "$OUT\privacy"  @() @()
Copy-Tree "$SRC\预览截图"   "$OUT\screenshots" @() @()

Write-Host "=== 2) 只复制 tools 里的脚本 ==="
New-Item -ItemType Directory -Force -Path "$OUT\tools" | Out-Null
Get-ChildItem "$SRC\tools" -File | Where-Object { $_.Extension -in '.ps1','.mjs','.xml' } |
    ForEach-Object { Copy-Item $_.FullName "$OUT\tools\" -Force ; Write-Host ("    " + $_.Name) }

Write-Host "=== 3) 复制文档 ==="
New-Item -ItemType Directory -Force -Path "$OUT\docs" | Out-Null
Get-ChildItem $SRC -File -Filter '*.md' | ForEach-Object { Copy-Item $_.FullName "$OUT\docs\" -Force ; Write-Host ("    " + $_.Name) }
Get-ChildItem $SRC -File -Filter '*.cmd' | ForEach-Object { Copy-Item $_.FullName "$OUT\" -Force }

Write-Host "`n=== 4) 脱敏 ==="
$rules = @(
    @{ pat = '<REDACTED_SSH_PASSWORD>?';                     rep = '<REDACTED_SSH_PASSWORD>'; desc = 'SSH root 密码' },
    @{ pat = '<REDACTED_DB_PASSWORD>';                 rep = '<REDACTED_DB_PASSWORD>';  desc = '数据库密码' },
    @{ pat = '<REDACTED_KEYSTORE_PW>';                       rep = '<REDACTED_KEYSTORE_PW>';  desc = '证书密码' },
    @{ pat = '<REDACTED_DCLOUD_APPKEY>'; rep = '<REDACTED_DCLOUD_APPKEY>'; desc = 'DCloud AppKey' },
    @{ pat = '<REDACTED>';                   rep = '<REDACTED>';              desc = '宝塔密码' }
)
$scanned = Get-ChildItem $OUT -Recurse -File -ErrorAction SilentlyContinue |
           Where-Object { $_.Extension -in '.md','.ps1','.mjs','.sh','.txt','.json','.yml','.yaml','.cmd' }
$changed = 0
foreach ($f in $scanned) {
    $t = [System.IO.File]::ReadAllText($f.FullName, [System.Text.Encoding]::UTF8)
    $orig = $t
    foreach ($r in $rules) { $t = $t -replace $r.pat, $r.rep }
    if ($t -ne $orig) {
        [System.IO.File]::WriteAllText($f.FullName, $t, $utf8)
        Write-Host ("    脱敏: " + $f.FullName.Substring($OUT.Length+1))
        $changed++
    }
}
Write-Host ("    共 $changed 个文件")

# application-server.yml 里的 DB 密码（上一轮已按名字替换，这里兜底）
$yml = "$OUT\backend\src\main\resources\application-server.yml"
if (Test-Path $yml) {
    $t = [System.IO.File]::ReadAllText($yml, [System.Text.Encoding]::UTF8)
    $t = $t -replace '(?m)^(\s*password:\s*).*$', '${1}<REDACTED_DB_PASSWORD>'
    [System.IO.File]::WriteAllText($yml, $t, $utf8)
    Write-Host "    脱敏: backend/src/main/resources/application-server.yml (password 字段)"
}

Write-Host "`n=== 5) 复核：还有没有残留密钥 ==="
$left = 0
foreach ($r in $rules) {
    $h = Get-ChildItem $OUT -Recurse -File -ErrorAction SilentlyContinue |
         Select-String -Pattern $r.pat -ErrorAction SilentlyContinue
    if ($h) { Write-Host ("    ⚠ " + $r.desc + " 仍有 " + $h.Count + " 处"); $left++ }
}
$keys = Get-ChildItem $OUT -Recurse -File -Include *.keystore,*.jks,*.p12,*.apk,*.jar -ErrorAction SilentlyContinue
if ($keys) { Write-Host ("    ⚠ 密钥/二进制文件: " + $keys.Count + " 个"); $left++ }
if ($left -eq 0) { Write-Host "    ✔ 干净" } else { throw "仍有敏感内容，停止推送" }

Write-Host "`n=== 6) 体积 ==="
$sz = (Get-ChildItem $OUT -Recurse -File | Measure-Object Length -Sum).Sum
$n  = (Get-ChildItem $OUT -Recurse -File).Count
Write-Host ("    {0} 个文件, {1:N1} MB" -f $n, ($sz/1MB))
Get-ChildItem $OUT -Force | ForEach-Object {
    if ($_.PSIsContainer) {
        $s = (Get-ChildItem $_.FullName -Recurse -File | Measure-Object Length -Sum).Sum
        Write-Host ("      {0,-16} {1,8:N1} MB" -f $_.Name, ($s/1MB))
    }
}
