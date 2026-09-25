# 把 bg.jpg 升级成 Msm 品牌主视觉
#   在原图上叠加「克制的蓝色通信节点 + 连接弧线」，地球保持巨大、人物保持很小
#   输出: src/static/msm/splash-bg.jpg
Add-Type -AssemblyName System.Drawing

$srcPath = "C:\im-local\hx-frontend\src\static\wx\bg.jpg"
$outDir  = "C:\im-local\hx-frontend\src\static\msm"
$outPath = Join-Path $outDir "splash-bg.jpg"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

$img = [System.Drawing.Image]::FromFile($srcPath)
$W = $img.Width; $H = $img.Height
Write-Host ("源图: {0} x {1}" -f $W, $H)

$bmp = New-Object System.Drawing.Bitmap -ArgumentList @([int]$W, [int]$H)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode      = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
$g.DrawImage($img, 0, 0, $W, $H)
$img.Dispose()

# 地球几何（按源图实测比例）
$cx = [double]($W * 0.500)
$cy = [double]($H * 0.492)
$er = [double]($W * 0.328)      # 地球半径

$msmBlue = [System.Drawing.Color]::FromArgb(255, 47, 143, 229)   # #2F8FE5
$cyan    = [System.Drawing.Color]::FromArgb(255, 24, 182, 217)   # #18B6D9

function New-AlphaPen([System.Drawing.Color]$c, [int]$alpha, [single]$w) {
  $col = [System.Drawing.Color]::FromArgb($alpha, $c.R, $c.G, $c.B)
  $pen = New-Object System.Drawing.Pen($col, $w)
  $pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $pen.EndCap   = [System.Drawing.Drawing2D.LineCap]::Round
  return $pen
}

# ---------- 1) 地球周围的柔光（把画面往 Msm Blue 拉一点）----------
$glowR = $er * 1.55
$path = New-Object System.Drawing.Drawing2D.GraphicsPath
$path.AddEllipse([single]($cx - $glowR), [single]($cy - $glowR), [single]($glowR*2), [single]($glowR*2))
$pgr = New-Object System.Drawing.Drawing2D.PathGradientBrush($path)
$pgr.CenterColor = [System.Drawing.Color]::FromArgb(38, $msmBlue.R, $msmBlue.G, $msmBlue.B)
$pgr.SurroundColors = @([System.Drawing.Color]::FromArgb(0, $msmBlue.R, $msmBlue.G, $msmBlue.B))
$g.FillPath($pgr, $path)
$pgr.Dispose(); $path.Dispose()
Write-Host "  1) 地球柔光 OK"

# ---------- 2) 通信轨道弧线（两段，很淡）----------
$orbitR = $er * 1.16
$rect = New-Object System.Drawing.RectangleF(
  [single]($cx - $orbitR), [single]($cy - $orbitR), [single]($orbitR*2), [single]($orbitR*2))
$penArc = New-AlphaPen $msmBlue 90 3.0
$g.DrawArc($penArc, $rect, 196, 52)     # 左上
$g.DrawArc($penArc, $rect, 292, 40)     # 右上
$penArc.Dispose()

$orbit2 = $er * 1.38
$rect2 = New-Object System.Drawing.RectangleF(
  [single]($cx - $orbit2), [single]($cy - $orbit2), [single]($orbit2*2), [single]($orbit2*2))
$penArc2 = New-AlphaPen $cyan 46 2.0
$g.DrawArc($penArc2, $rect2, 205, 34)
$penArc2.Dispose()
Write-Host "  2) 轨道弧线 OK"

# ---------- 3) 通信节点（带辉光的小圆点）+ 细连接线 ----------
function Draw-Node([double]$angDeg, [double]$r, [double]$size, [System.Drawing.Color]$col) {
  $a = $angDeg * [Math]::PI / 180.0
  $x = $cx + $r * [Math]::Cos($a)
  $y = $cy + $r * [Math]::Sin($a)

  # 连接线：由节点指向地球边缘
  $ex = $cx + $er * [Math]::Cos($a)
  $ey = $cy + $er * [Math]::Sin($a)
  $penLine = New-AlphaPen $col 60 1.6
  $g.DrawLine($penLine, [single]$x, [single]$y, [single]$ex, [single]$ey)
  $penLine.Dispose()

  # 辉光：由外到内几层半透明圆
  for ($k = 5; $k -ge 1; $k--) {
    $rr = $size * (1 + $k * 0.9)
    $al = [int](26 / $k)
    $b = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb($al, $col.R, $col.G, $col.B))
    $g.FillEllipse($b, [single]($x - $rr), [single]($y - $rr), [single]($rr*2), [single]($rr*2))
    $b.Dispose()
  }
  # 实心核心
  $core = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(235, $col.R, $col.G, $col.B))
  $g.FillEllipse($core, [single]($x - $size), [single]($y - $size), [single]($size*2), [single]($size*2))
  $core.Dispose()
  Write-Host ("     节点 {0,6:N0}°  r={1:N0}  ({2:N0},{3:N0})" -f $angDeg, $r, $x, $y)
}

Draw-Node -48  ($er*1.16) 9  $msmBlue
Draw-Node -12  ($er*1.16) 7  $cyan
Draw-Node  26  ($er*1.16) 8  $msmBlue
Draw-Node -30  ($er*1.42) 5  $cyan
Write-Host "  3) 通信节点 OK"

# ---------- 4) 顶部与底部的暗色渐变（给品牌文字/按钮让位）----------
$topH = [int]($H * 0.22)
$rectTop = New-Object System.Drawing.Rectangle(0, 0, [int]$W, $topH)
$lgTop = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
  $rectTop,
  [System.Drawing.Color]::FromArgb(190, 4, 10, 18),
  [System.Drawing.Color]::FromArgb(0, 4, 10, 18),
  [System.Drawing.Drawing2D.LinearGradientMode]::Vertical)
$g.FillRectangle($lgTop, $rectTop); $lgTop.Dispose()

$botH = [int]($H * 0.34)
$rectBot = New-Object System.Drawing.Rectangle(0, [int]($H - $botH), [int]$W, $botH)
$lgBot = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
  $rectBot,
  [System.Drawing.Color]::FromArgb(0, 4, 10, 18),
  [System.Drawing.Color]::FromArgb(232, 4, 10, 18),
  [System.Drawing.Drawing2D.LinearGradientMode]::Vertical)
$g.FillRectangle($lgBot, $rectBot); $lgBot.Dispose()
Write-Host "  4) 上下渐变 OK"

$g.Dispose()

# 存成 JPEG，质量 88
$enc = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
$ps = New-Object System.Drawing.Imaging.EncoderParameters(1)
$ps.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [int64]88)
$bmp.Save($outPath, $enc, $ps)
$bmp.Dispose()

Write-Host ("`n输出: {0}  ({1:N0} KB)" -f $outPath, ((Get-Item $outPath).Length / 1KB))
