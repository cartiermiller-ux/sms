# 生成 Msm 底部 Tab 图标（24px 线性风格，81×81 输出）
#   V2EX 配色：未选中 #999999  /  选中 #333333
#   （旧配色为 #667781 / #2F8FE5 的 Msm Blue 方案，已废弃）
Add-Type -AssemblyName System.Drawing

$out = "C:\我的下载\Uniapp+SpringBoot即时通讯APP源码 安卓iOS跨端\_deploy\frontend\src\static\msm\tab"
New-Item -ItemType Directory -Force -Path $out | Out-Null

$SIZE   = 81
$DESIGN = 24.0
$SCALE  = $SIZE / $DESIGN
$STROKE = 2.0 * $SCALE      # 2px 描边 @24 栅格

function P([double]$v) { [single]($v * $SCALE) }

# GDI+ 的 AddLine 必须给 4 个坐标，这里统一封装
function L($path, [double]$x1, [double]$y1, [double]$x2, [double]$y2) {
  $path.AddLine((P $x1), (P $y1), (P $x2), (P $y2))
}
function A($path, [double]$x, [double]$y, [double]$w, [double]$h, [double]$s, [double]$sw) {
  $path.AddArc((P $x), (P $y), (P $w), (P $h), [single]$s, [single]$sw)
}
function E($path, [double]$x, [double]$y, [double]$w, [double]$h) {
  $path.AddEllipse((P $x), (P $y), (P $w), (P $h))
}

function Path-Chat {
  # 圆角聊天气泡 + 左下尾巴
  $p = New-Object System.Drawing.Drawing2D.GraphicsPath
  $p.StartFigure()
  A $p 3   3    7 7 180 90      # 左上圆角 -> (6.5, 3)
  L $p 6.5 3    17.5 3          # 上边
  A $p 14  3    7 7 270 90      # 右上圆角 -> (21, 6.5)
  L $p 21  6.5  21   14.5       # 右边
  A $p 14  11   7 7 0   90      # 右下圆角 -> (17.5, 18)
  L $p 17.5 18  10   18         # 下边（到尾巴根部）
  L $p 10  18   5    22.5       # 尾巴斜下
  L $p 5   22.5 6.5  18         # 尾巴斜上
  A $p 3   11   7 7 90  90      # 左下圆角
  $p.CloseFigure()
  return $p
}

function Path-Contacts {
  # 一个人：头 + 肩（开口弧）
  $p = New-Object System.Drawing.Drawing2D.GraphicsPath
  E $p 8.6 3.2 6.8 6.8                    # 头
  $p.StartFigure()
  A $p 3.6 13.2 16.8 16.8 200 140         # 肩
  return $p
}

function Path-Discover {
  # 指南针：外圆 + 指针
  $p = New-Object System.Drawing.Drawing2D.GraphicsPath
  E $p 2.6 2.6 18.8 18.8                  # 外圆
  $p.StartFigure()
  L $p 15.9 8.1  13.4 13.4                # 罗盘指针：四条边构成菱形
  L $p 13.4 13.4 8.1  15.9
  L $p 8.1  15.9 10.6 10.6
  L $p 10.6 10.6 15.9 8.1
  $p.CloseFigure()
  return $p
}

function Path-Me {
  # 圆内一个人
  $p = New-Object System.Drawing.Drawing2D.GraphicsPath
  E $p 2.6 2.6 18.8 18.8                  # 外圆
  $p.StartFigure()
  E $p 9.0 7.2 6.0 6.0                    # 头
  $p.StartFigure()
  A $p 6.0 14.2 12.0 9.0 200 140          # 肩
  return $p
}

function Path-Settings {
  # 齿轮：外圆 + 内圆 + 6 根轮齿
  # （三栏结构里的「设置」tab）
  $p = New-Object System.Drawing.Drawing2D.GraphicsPath
  E $p 5.6 5.6 12.8 12.8                  # 外圆 r=6.4
  $p.StartFigure()
  E $p 9.8 9.8 4.4 4.4                    # 内圆 r=2.2
  for ($i = 0; $i -lt 6; $i++) {
    $a  = $i * 60 * [Math]::PI / 180
    $x1 = 12 + 6.4 * [Math]::Cos($a); $y1 = 12 + 6.4 * [Math]::Sin($a)
    $x2 = 12 + 9.2 * [Math]::Cos($a); $y2 = 12 + 9.2 * [Math]::Sin($a)
    $p.StartFigure()
    L $p $x1 $y1 $x2 $y2
  }
  return $p
}

# 三栏结构：消息 / 通讯录 / 设置
$icons = @(
  @{ Name = 'chat';     Fn = 'Path-Chat'     },
  @{ Name = 'contacts'; Fn = 'Path-Contacts' },
  @{ Name = 'settings'; Fn = 'Path-Settings' }
)
$variants = @(
  @{ Suffix = '';    Color = '#8696A0' },
  @{ Suffix = '-on'; Color = '#2F8FE5' }
)

$results = @()
foreach ($ic in $icons) {
  foreach ($v in $variants) {
    $bmp = New-Object System.Drawing.Bitmap($SIZE, $SIZE, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode      = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.PixelOffsetMode    = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)

    $col = [System.Drawing.ColorTranslator]::FromHtml($v.Color)
    $pen = New-Object System.Drawing.Pen($col, [single]$STROKE)
    $pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $pen.EndCap   = [System.Drawing.Drawing2D.LineCap]::Round
    $pen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round

    $path = & $ic.Fn
    $g.DrawPath($pen, $path)

    $pen.Dispose(); $path.Dispose(); $g.Dispose()
    $file = Join-Path $out "$($ic.Name)$($v.Suffix).png"
    $bmp.Save($file, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    $results += [pscustomobject]@{ File = "$($ic.Name)$($v.Suffix).png"; Color = $v.Color; Bytes = (Get-Item $file).Length }
  }
}

Write-Host "=== 生成结果 ==="
foreach ($r in $results) { Write-Host ("  {0,-18} {1,-10} {2} bytes" -f $r.File, $r.Color, $r.Bytes) }
