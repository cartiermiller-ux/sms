<#
    用 Android SDK 自带的 build-tools 直接打包 APK（不需要 Gradle、不需要 DCloud 账号）
    产物：C:\im-local\msm-android\build\Msm.apk

    注意：本文件必须保存为 UTF-8 with BOM，否则 PowerShell 5.1 会把中文路径读成乱码。
#>
$ErrorActionPreference = 'Stop'

# 原生工具会把警告写到 stderr，若 ErrorActionPreference=Stop 会被当成致命错误，
# 所以统一用这个函数执行原生命令，只看退出码
function Invoke-Native {
    param([string]$Exe, [string[]]$Arguments)
    $prev = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    $output = & $Exe @Arguments 2>&1
    $code = $LASTEXITCODE
    $ErrorActionPreference = $prev
    return [pscustomobject]@{ Code = $code; Output = @($output) }
}

function Show-Fail {
    param($Result, [string]$What)
    Write-Host "  [$What 失败] 退出码 $($Result.Code)"
    $Result.Output | Select-Object -First 30 | ForEach-Object { "      $_" }
    throw "$What 失败"
}

$SRC   = "C:\我的下载\Uniapp+SpringBoot即时通讯APP源码 安卓iOS跨端\_deploy\android-webview"
$ICONS = "C:\我的下载\Uniapp+SpringBoot即时通讯APP源码 安卓iOS跨端\_deploy\frontend\src\unpackage\res\icons"
$JDK   = "C:\我的下载\Uniapp+SpringBoot即时通讯APP源码 安卓iOS跨端\_deploy\tools\jdk8u504-b01"
$SDK   = "$env:LOCALAPPDATA\Android\Sdk"
$WORK  = "C:\im-local\msm-android"

$BT = (Get-ChildItem "$SDK\build-tools" -Directory | Sort-Object { [version]$_.Name } -Descending | Select-Object -First 1).FullName
$PL = (Get-ChildItem "$SDK\platforms" -Directory | Where-Object { Test-Path "$($_.FullName)\android.jar" } | Sort-Object Name -Descending | Select-Object -First 1).FullName
$ANDROID_JAR = "$PL\android.jar"

Write-Host "build-tools : $BT"
Write-Host "platform    : $PL"
Write-Host "work        : $WORK"
Write-Host ""

# ---------- 1) 准备纯 ASCII 工作目录 ----------
if (Test-Path $WORK) { Remove-Item $WORK -Recurse -Force }
New-Item -ItemType Directory -Force -Path $WORK | Out-Null
Copy-Item "$SRC\AndroidManifest.xml" $WORK
Copy-Item "$SRC\src" $WORK -Recurse
Copy-Item "$SRC\res" $WORK -Recurse

# ---------- 2) 生成各密度图标 ----------
Add-Type -AssemblyName System.Drawing
$master = [System.Drawing.Image]::FromFile("$ICONS\1024x1024.png")
$map = [ordered]@{ 'mipmap-mdpi' = 48; 'mipmap-hdpi' = 72; 'mipmap-xhdpi' = 96; 'mipmap-xxhdpi' = 144; 'mipmap-xxxhdpi' = 192 }
foreach ($k in $map.Keys) {
    $dir = Join-Path "$WORK\res" $k
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
    $sz = $map[$k]
    $bmp = New-Object System.Drawing.Bitmap($sz, $sz)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.DrawImage($master, 0, 0, $sz, $sz)
    $g.Dispose()
    $bmp.Save((Join-Path $dir 'ic_launcher.png'), [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
}
$master.Dispose()
Write-Host "[1/8] 工程已复制到 ASCII 路径，图标已生成"

$outDir = "$WORK\build"
New-Item -ItemType Directory -Force -Path $outDir, "$outDir\gen", "$outDir\classes", "$outDir\dex" | Out-Null

# ---------- 3) aapt2 编译资源 ----------
$r = Invoke-Native "$BT\aapt2.exe" @('compile', '--dir', "$WORK\res", '-o', "$outDir\res.zip"); if ($r.Code -ne 0) { Show-Fail $r "aapt2 compile" }
Write-Host "[2/8] 资源编译完成"

# ---------- 4) aapt2 链接 ----------
$linkArgs = @(
    'link', '-o', "$outDir\base.apk",
    '-I', $ANDROID_JAR,
    '--manifest', "$WORK\AndroidManifest.xml",
    '-R', "$outDir\res.zip",
    '--java', "$outDir\gen",
    '--min-sdk-version', '21',
    '--target-sdk-version', '34',
    '--version-code', '120',
    '--version-name', '1.2.0',
    '--auto-add-overlay'
)
$r = Invoke-Native "$BT\aapt2.exe" $linkArgs; if ($r.Code -ne 0) { Show-Fail $r "aapt2 link" }
Write-Host "[3/8] 资源链接完成，已生成 R.java"

# ---------- 5) 编译 Java ----------
$srcFiles = @()
$srcFiles += (Get-ChildItem "$WORK\src" -Recurse -Filter *.java | ForEach-Object { $_.FullName })
$srcFiles += (Get-ChildItem "$outDir\gen" -Recurse -Filter *.java | ForEach-Object { $_.FullName })
Write-Host "      源文件 $($srcFiles.Count) 个"

$javacArgs = @('-source', '1.8', '-target', '1.8', '-nowarn', '-bootclasspath', $ANDROID_JAR, '-encoding', 'UTF-8', '-d', "$outDir\classes") + $srcFiles
$r = Invoke-Native "$JDK\bin\javac.exe" $javacArgs; if ($r.Code -ne 0) { Show-Fail $r "javac" }
Write-Host "[4/8] Java 编译完成"

# ---------- 6) d8 生成 dex ----------
$classFiles = Get-ChildItem "$outDir\classes" -Recurse -Filter *.class | ForEach-Object { $_.FullName }
[System.IO.File]::WriteAllLines("$outDir\classes.txt", $classFiles, [System.Text.Encoding]::ASCII)
$r = Invoke-Native "$BT\d8.bat" @('--lib', $ANDROID_JAR, '--min-api', '21', '--output', "$outDir\dex", "@$outDir\classes.txt"); if ($r.Code -ne 0) { Show-Fail $r "d8" }
Write-Host "[5/8] dex 生成完成"

# ---------- 7) 组装 APK ----------
Copy-Item "$outDir\base.apk" "$outDir\unsigned.apk" -Force
Push-Location "$outDir\dex"
$r = Invoke-Native "$BT\aapt.exe" @('add', '-f', "$outDir\unsigned.apk", 'classes.dex'); $addCode = $r.Code
Pop-Location
if ($addCode -ne 0) { throw "写入 classes.dex 失败" }

$r = Invoke-Native "$BT\zipalign.exe" @('-f', '-p', '4', "$outDir\unsigned.apk", "$outDir\aligned.apk"); if ($r.Code -ne 0) { Show-Fail $r "zipalign" }
Write-Host "[6/8] 已对齐"

# ---------- 8) 签名 ----------
# 签名密码从环境变量读取，切勿写死在脚本里：
#     $env:MSM_KS_PASSWORD = '你的证书密码'
# 未设置时用占位值，仅够本地跑通流程；正式发布请务必自行设置。
$ksPass = if ($env:MSM_KS_PASSWORD) { $env:MSM_KS_PASSWORD } else { 'CHANGE_ME_KS_PASSWORD' }
$ks = "$WORK\msm.keystore"
if (-not (Test-Path $ks)) {
    $ktArgs = @('-genkeypair', '-keystore', $ks, '-alias', 'msm', '-keyalg', 'RSA', '-keysize', '2048',
                '-validity', '10000', '-storepass', $ksPass, '-keypass', $ksPass,
                '-dname', 'CN=Msm, OU=Dev, O=Msm, L=Lincang, ST=Yunnan, C=CN')
    $r = Invoke-Native "$JDK\bin\keytool.exe" $ktArgs; if ($r.Code -ne 0) { Show-Fail $r "keytool" }
}
$signArgs = @('sign', '--ks', $ks, '--ks-pass', "pass:$ksPass", '--key-pass', "pass:$ksPass",
              '--ks-key-alias', 'msm', '--out', "$outDir\Msm.apk", "$outDir\aligned.apk")
$r = Invoke-Native "$BT\apksigner.bat" $signArgs; if ($r.Code -ne 0) { Show-Fail $r "apksigner" }
Write-Host "[7/8] 签名完成"

# ---------- 9) 校验 ----------
Write-Host ""
Write-Host "===== 签名校验 ====="
$prev = $ErrorActionPreference; $ErrorActionPreference = 'Continue'
& "$BT\apksigner.bat" verify --verbose "$outDir\Msm.apk" 2>&1 | Select-Object -First 4 | ForEach-Object { "  $_" }
$ErrorActionPreference = $prev

Write-Host ""
Write-Host "===== APK 信息 ====="
$apk = Get-Item "$outDir\Msm.apk"
Write-Host "  路径: $($apk.FullName)"
Write-Host "  大小: $([math]::Round($apk.Length/1KB,1)) KB"

$prev = $ErrorActionPreference; $ErrorActionPreference = 'Continue'
& "$BT\aapt.exe" dump badging "$outDir\Msm.apk" 2>&1 |
    Select-String -Pattern "^package:|application-label:|sdkVersion:|targetSdkVersion:|uses-permission" |
    Select-Object -First 16 | ForEach-Object { "  $_" }
$ErrorActionPreference = $prev
Write-Host "[8/8] 完成"
