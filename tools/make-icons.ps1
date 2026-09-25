<#
    从一张字标图片生成 App 所需的全套图标
    用法: powershell -ExecutionPolicy Bypass -File make-icons.ps1 -Source <图片> [-Ratio 0.72]

    做法:
      1. 按亮度阈值找出字标的实际包围盒（排除渐变背景）
      2. 采样紧贴字标外侧的背景色，作为正方形画布的底色
      3. 把字标按指定比例居中缩放绘制到画布上（默认占宽度 72%，留出安全边距）
      4. 导出 manifest.json 引用的全部 17 个尺寸
#>
param(
    [Parameter(Mandatory = $true)][string]$Source,
    [double]$Ratio = 0.72,
    [string]$OutDir,
    [string]$FaviconOut
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

# 默认输出路径要在函数体内计算：Windows PowerShell 5.1 在 param() 默认值里读不到 $PSScriptRoot
$DeployRoot = Split-Path -Parent $PSScriptRoot
if (-not $OutDir) { $OutDir = Join-Path $DeployRoot 'frontend\src\unpackage\res\icons' }
if (-not $FaviconOut) { $FaviconOut = Join-Path $DeployRoot 'frontend\src\static\msm-icon.png' }

if (-not (Test-Path $Source)) { throw "找不到源图片: $Source" }

$bmp = New-Object System.Drawing.Bitmap($Source)
$W = $bmp.Width
$H = $bmp.Height
Write-Host "源图片: ${W} x ${H}"

# ---- 1) 找字标包围盒（亮度阈值，背景约 245）----
$thr = 200
$minX = $W; $maxX = -1; $minY = $H; $maxY = -1
for ($y = 0; $y -lt $H; $y++) {
    for ($x = 0; $x -lt $W; $x++) {
        $c = $bmp.GetPixel($x, $y)
        $lum = 0.299 * $c.R + 0.587 * $c.G + 0.114 * $c.B
        if ($lum -lt $thr) {
            if ($x -lt $minX) { $minX = $x }
            if ($x -gt $maxX) { $maxX = $x }
            if ($y -lt $minY) { $minY = $y }
            if ($y -gt $maxY) { $maxY = $y }
        }
    }
}
if ($maxX -lt 0) { throw "没有在图片里找到任何深色内容，请检查亮度阈值" }

$cw = $maxX - $minX + 1
$ch = $maxY - $minY + 1
Write-Host "字标包围盒: X $minX..$maxX (宽 $cw), Y $minY..$maxY (高 $ch)"

# ---- 2) 采样字标外侧一圈的背景色 ----
$sumR = 0; $sumG = 0; $sumB = 0; $n = 0
$yTop = $minY - 12
$yBot = $maxY + 12
for ($x = $minX; $x -le $maxX; $x += 2) {
    foreach ($yy in @($yTop, $yBot)) {
        if ($yy -ge 0 -and $yy -lt $H) {
            $c = $bmp.GetPixel($x, $yy)
            $sumR += $c.R; $sumG += $c.G; $sumB += $c.B; $n++
        }
    }
}
$xL = $minX - 12
$xR = $maxX + 12
for ($y = $minY; $y -le $maxY; $y += 2) {
    foreach ($xx in @($xL, $xR)) {
        if ($xx -ge 0 -and $xx -lt $W) {
            $c = $bmp.GetPixel($xx, $y)
            $sumR += $c.R; $sumG += $c.G; $sumB += $c.B; $n++
        }
    }
}
if ($n -eq 0) { throw "背景采样失败" }
$bgR = [int]($sumR / $n); $bgG = [int]($sumG / $n); $bgB = [int]($sumB / $n)
Write-Host "采样 $n 点，画布底色 = R$bgR G$bgG B$bgB"

# ---- 3) 生成 1024 主图 ----
$S = 1024
$master = New-Object System.Drawing.Bitmap($S, $S)
$g = [System.Drawing.Graphics]::FromImage($master)
$g.Clear([System.Drawing.Color]::FromArgb($bgR, $bgG, $bgB))
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality

$logoW = [int]($S * $Ratio)
$logoH = [int]($ch * $logoW / $cw)
$dstX = [int](($S - $logoW) / 2)
$dstY = [int](($S - $logoH) / 2)
$dstRect = New-Object System.Drawing.Rectangle($dstX, $dstY, $logoW, $logoH)
$srcRect = New-Object System.Drawing.Rectangle($minX, $minY, $cw, $ch)
$g.DrawImage($bmp, $dstRect, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)
$g.Dispose()
Write-Host "字标绘制: ${logoW} x ${logoH} @ (${dstX},${dstY})"

# ---- 4) 导出全部尺寸 ----
if (-not (Test-Path $OutDir)) { New-Item -ItemType Directory -Force -Path $OutDir | Out-Null }
$sizes = @(20, 29, 40, 58, 60, 72, 76, 80, 87, 96, 120, 144, 152, 167, 180, 192, 1024)
foreach ($sz in $sizes) {
    $out = New-Object System.Drawing.Bitmap($sz, $sz)
    $g2 = [System.Drawing.Graphics]::FromImage($out)
    $g2.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g2.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g2.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g2.DrawImage($master, 0, 0, $sz, $sz)
    $g2.Dispose()
    $name = if ($sz -eq 1024) { '1024x1024.png' } else { "${sz}x${sz}.png" }
    $out.Save((Join-Path $OutDir $name), [System.Drawing.Imaging.ImageFormat]::Png)
    $out.Dispose()
}
Write-Host "已导出 $($sizes.Count) 个图标 -> $OutDir"

if ($FaviconOut) {
    $master.Save($FaviconOut, [System.Drawing.Imaging.ImageFormat]::Png)
    Write-Host "favicon -> $FaviconOut"
}

$master.Dispose()
$bmp.Dispose()
Write-Host "完成"
