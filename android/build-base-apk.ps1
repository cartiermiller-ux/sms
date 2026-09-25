<#
    把 uni-app 安卓标准基座"灌"成独立 App APK
    ────────────────────────────────────────────
    原理：基座从 assets/apps/<appid>/www/ 加载项目，dcloud_control.xml 是应用清单。
          我们的 dist/build/app 正好就是那个 www 目录的内容。

    产物：C:\im-local\msm-base-apk\Msm-base.apk

    注意：
      · resources.arsc 在基座里是 STORED（未压缩），重打包后必须仍是 STORED，否则装不上
      · 本脚本只做「替换控制文件 + 塞入项目资源」，不动 resources.arsc 和 dex
      · 本文件必须保存为 UTF-8 with BOM
#>
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem

function Invoke-Native {
    param([string]$Exe, [string[]]$Arguments)
    $prev = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    $output = & $Exe @Arguments 2>&1
    $code = $LASTEXITCODE
    $ErrorActionPreference = $prev
    return [pscustomobject]@{ Code = $code; Output = @($output) }
}
function Show-Fail { param($r, [string]$what) Write-Host "  [$what 失败] 退出码 $($r.Code)"; $r.Output | Select-Object -First 30 | ForEach-Object { "      $_" }; throw "$what 失败" }

$HB    = "C:\Program Files (x86)\HBuilder X"
$BASE  = "$HB\plugins\launcher\base\android_base.apk"
$APP   = "C:\我的下载\Uniapp+SpringBoot即时通讯APP源码 安卓iOS跨端\_deploy\frontend\dist\build\app"
$JDK   = "C:\我的下载\Uniapp+SpringBoot即时通讯APP源码 安卓iOS跨端\_deploy\tools\jdk8u504-b01"
$SDK   = "$env:LOCALAPPDATA\Android\Sdk"
$WORK  = "C:\im-local\msm-base-apk"
$BT    = (Get-ChildItem "$SDK\build-tools" -Directory | Sort-Object { [version]$_.Name } -Descending | Select-Object -First 1).FullName

$APPID = "__UNI__CA19A2D"
$APPVER = "1.2.0"

Write-Host "基座   : $BASE"
Write-Host "项目   : $APP"
Write-Host "appid  : $APPID"
Write-Host "工作区 : $WORK"
Write-Host ""

if (Test-Path $WORK) { Remove-Item $WORK -Recurse -Force }
New-Item -ItemType Directory -Force -Path $WORK | Out-Null

# ---------- 1) 复制基座 ----------
$apkPath = "$WORK\unsigned.apk"
Copy-Item $BASE $apkPath -Force
Write-Host "[1/6] 已复制基座 ($([math]::Round((Get-Item $apkPath).Length/1MB,1)) MB)"

# ---------- 2) 生成新的 dcloud_control.xml（只把 apps 换成我们的）----------
$zip = [System.IO.Compression.ZipFile]::OpenRead($apkPath)
$e = $zip.Entries | Where-Object { $_.FullName -eq 'assets/data/dcloud_control.xml' }
$sr = New-Object System.IO.StreamReader($e.Open())
$ctrl = $sr.ReadToEnd(); $sr.Close()
$zip.Dispose()

Write-Host "      原控制文件: $ctrl"

# 保留除 <apps> 以外的全部内容（含 lia 校验串）
$newApps = "<apps><app appid=`"$APPID`" appver=`"$APPVER`"/></apps>"
$ctrlNew = [regex]::Replace($ctrl, '<apps>.*?</apps>', $newApps)
Write-Host "      新控制文件: $ctrlNew"
[System.IO.File]::WriteAllText("$WORK\dcloud_control.xml", $ctrlNew, (New-Object System.Text.UTF8Encoding($false)))

# ---------- 3) 把项目文件写进 APK ----------
$files = Get-ChildItem $APP -Recurse -File
Write-Host "[2/6] 待写入项目文件 $($files.Count) 个"

$zip = [System.IO.Compression.ZipFile]::Open($apkPath, [System.IO.Compression.ZipArchiveMode]::Update)

# 3a) 替换控制文件
$old = $zip.Entries | Where-Object { $_.FullName -eq 'assets/data/dcloud_control.xml' }
if ($old) { $old.Delete() }
$entry = $zip.CreateEntry('assets/data/dcloud_control.xml', [System.IO.Compression.CompressionLevel]::Optimal)
$sw = New-Object System.IO.StreamWriter($entry.Open(), (New-Object System.Text.UTF8Encoding($false)))
$sw.Write($ctrlNew); $sw.Close()

# 3b) 写入项目资源到 assets/apps/<appid>/www/
$prefix = "assets/apps/$APPID/www/"
$i = 0
foreach ($f in $files) {
    $rel = $f.FullName.Substring($APP.Length + 1).Replace('\', '/')
    $name = $prefix + $rel
    $ex = $zip.Entries | Where-Object { $_.FullName -eq $name }
    if ($ex) { $ex.Delete() }
    $ne = $zip.CreateEntry($name, [System.IO.Compression.CompressionLevel]::Optimal)
    $os = $ne.Open()
    $bytes = [System.IO.File]::ReadAllBytes($f.FullName)
    $os.Write($bytes, 0, $bytes.Length)
    $os.Close()
    $i++
    if ($i % 50 -eq 0) { Write-Host "      已写入 $i / $($files.Count)" }
}
$zip.Dispose()
Write-Host "[3/6] 项目资源已写入 APK"

# ---------- 4) 校验 resources.arsc 仍是 STORED ----------
$zip = [System.IO.Compression.ZipFile]::OpenRead($apkPath)
$arsc = $zip.Entries | Where-Object { $_.FullName -eq 'resources.arsc' }
$stored = ($arsc.CompressedLength -eq $arsc.Length)
Write-Host "      resources.arsc: $($arsc.Length)B  压缩后 $($arsc.CompressedLength)B  -> $(if($stored){'STORED 正常'}else{'被压缩了！Android 可能装不上'})"
$appEntries = ($zip.Entries | Where-Object { $_.FullName -like "$prefix*" }).Count
Write-Host "      assets/apps 下写入条目数: $appEntries"
$zip.Dispose()
if (-not $stored) { throw "resources.arsc 被重新压缩，需要换打包方式" }

# ---------- 5) 对齐 ----------
$r = Invoke-Native "$BT\zipalign.exe" @('-f', '-p', '4', $apkPath, "$WORK\aligned.apk")
if ($r.Code -ne 0) { Show-Fail $r "zipalign" }
Write-Host "[4/6] 已对齐"

# ---------- 6) 签名 ----------
$ks = "$WORK\msm.keystore"
if (-not (Test-Path $ks)) {
    $r = Invoke-Native "$JDK\bin\keytool.exe" @('-genkeypair','-keystore',$ks,'-alias','msm','-keyalg','RSA','-keysize','2048',
        '-validity','10000','-storepass','CHANGE_ME_KS_PASSWORD','-keypass','CHANGE_ME_KS_PASSWORD',
        '-dname','CN=Msm, OU=Dev, O=Msm, L=Lincang, ST=Yunnan, C=CN')
    if ($r.Code -ne 0) { Show-Fail $r "keytool" }
}
$r = Invoke-Native "$BT\apksigner.bat" @('sign','--ks',$ks,'--ks-pass','pass:CHANGE_ME_KS_PASSWORD','--key-pass','pass:CHANGE_ME_KS_PASSWORD',
    '--ks-key-alias','msm','--out',"$WORK\Msm-base.apk","$WORK\aligned.apk")
if ($r.Code -ne 0) { Show-Fail $r "apksigner" }
Write-Host "[5/6] 签名完成"

# ---------- 7) 校验 ----------
Write-Host ""
Write-Host "===== 签名校验 ====="
$prev = $ErrorActionPreference; $ErrorActionPreference = 'Continue'
& "$BT\apksigner.bat" verify --verbose "$WORK\Msm-base.apk" 2>&1 | Select-Object -First 4 | ForEach-Object { "  $_" }
$ErrorActionPreference = $prev

Write-Host ""
Write-Host "===== APK 信息 ====="
$apk = Get-Item "$WORK\Msm-base.apk"
Write-Host "  路径: $($apk.FullName)"
Write-Host "  大小: $([math]::Round($apk.Length/1MB,1)) MB"
$prev = $ErrorActionPreference; $ErrorActionPreference = 'Continue'
& "$BT\aapt.exe" dump badging "$WORK\Msm-base.apk" 2>&1 | Select-String -Pattern "^package:|application-label:|launchable-activity" | ForEach-Object { "  $_" }
$ErrorActionPreference = $prev
Write-Host "[6/6] 完成"
