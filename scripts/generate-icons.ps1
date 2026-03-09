Add-Type -AssemblyName System.Drawing

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$iconDir = Join-Path $projectRoot "public\icons"
$appDir = Join-Path $projectRoot "src\app"
New-Item -ItemType Directory -Force $iconDir | Out-Null
New-Item -ItemType Directory -Force $appDir | Out-Null

$palette = @{
  Background = [System.Drawing.Color]::FromArgb(0x2F, 0x6C, 0x4F)
  Surface = [System.Drawing.Color]::FromArgb(0xF4, 0xEF, 0xE3)
  Ink = [System.Drawing.Color]::FromArgb(0x1E, 0x2A, 0x20)
  SoftGreen = [System.Drawing.Color]::FromArgb(0xE1, 0xF0, 0xE7)
  SoftRed = [System.Drawing.Color]::FromArgb(0xF7, 0xE3, 0xDF)
  Accent = [System.Drawing.Color]::FromArgb(0x2F, 0x6C, 0x4F)
  Danger = [System.Drawing.Color]::FromArgb(0xA2, 0x40, 0x38)
  Line = [System.Drawing.Color]::FromArgb(0x9F, 0x8F, 0x70)
  Muted = [System.Drawing.Color]::FromArgb(0xD9, 0xCC, 0xB3)
}

function New-RoundedRectPath([float]$x, [float]$y, [float]$w, [float]$h, [float]$r) {
  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $d = $r * 2
  $path.AddArc($x, $y, $d, $d, 180, 90)
  $path.AddArc($x + $w - $d, $y, $d, $d, 270, 90)
  $path.AddArc($x + $w - $d, $y + $h - $d, $d, $d, 0, 90)
  $path.AddArc($x, $y + $h - $d, $d, $d, 90, 90)
  $path.CloseFigure()
  return $path
}

function Draw-Icon([int]$size, [string]$outputPath, [bool]$maskable = $false) {
  $bitmap = New-Object System.Drawing.Bitmap $size, $size
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $graphics.Clear([System.Drawing.Color]::Transparent)

  $outerMargin = if ($maskable) { [int]($size * 0.04) } else { [int]($size * 0.06) }
  $innerMargin = if ($maskable) { [int]($size * 0.12) } else { [int]($size * 0.16) }
  $outerRadius = [int]($size * 0.22)
  $innerRadius = [int]($size * 0.16)

  $outerPath = New-RoundedRectPath $outerMargin $outerMargin ($size - $outerMargin * 2) ($size - $outerMargin * 2) $outerRadius
  $innerPath = New-RoundedRectPath $innerMargin $innerMargin ($size - $innerMargin * 2) ($size - $innerMargin * 2) $innerRadius

  $graphics.FillPath((New-Object System.Drawing.SolidBrush $palette.Background), $outerPath)
  $graphics.FillPath((New-Object System.Drawing.SolidBrush $palette.Surface), $innerPath)

  $sheetX = [int]($size * 0.215)
  $sheetY = [int]($size * 0.24)
  $sheetW = [int]($size * 0.57)
  $headerH = [int]($size * 0.12)
  $headerRadius = [int]($size * 0.045)
  $headerPath = New-RoundedRectPath $sheetX $sheetY $sheetW $headerH $headerRadius
  $graphics.FillPath((New-Object System.Drawing.SolidBrush $palette.Ink), $headerPath)

  $pinBrush = New-Object System.Drawing.SolidBrush $palette.Surface
  $pinR = [int]($size * 0.018)
  $graphics.FillEllipse($pinBrush, $sheetX + [int]($size * 0.05), $sheetY + [int]($size * 0.035), $pinR * 2, $pinR * 2)
  $graphics.FillEllipse($pinBrush, $sheetX + $sheetW - [int]($size * 0.085), $sheetY + [int]($size * 0.035), $pinR * 2, $pinR * 2)

  $boxSize = [int]($size * 0.17)
  $gapY = [int]($size * 0.07)
  $leftColX = [int]($size * 0.22)
  $topBoxY = [int]($size * 0.41)
  $bottomBoxY = $topBoxY + $boxSize + $gapY
  $boxRadius = [int]($size * 0.045)

  $topBox = New-RoundedRectPath $leftColX $topBoxY $boxSize $boxSize $boxRadius
  $bottomBox = New-RoundedRectPath $leftColX $bottomBoxY $boxSize $boxSize $boxRadius
  $graphics.FillPath((New-Object System.Drawing.SolidBrush $palette.SoftGreen), $topBox)
  $graphics.FillPath((New-Object System.Drawing.SolidBrush $palette.SoftRed), $bottomBox)

  $checkPen = New-Object System.Drawing.Pen -ArgumentList $palette.Accent, ([int]($size * 0.045))
  $checkPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $checkPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $checkPen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
  $graphics.DrawLine($checkPen, [int]($size * 0.30), [int]($size * 0.50), [int]($size * 0.36), [int]($size * 0.56))
  $graphics.DrawLine($checkPen, [int]($size * 0.36), [int]($size * 0.56), [int]($size * 0.50), [int]($size * 0.43))

  $crossPen = New-Object System.Drawing.Pen -ArgumentList $palette.Danger, ([int]($size * 0.038))
  $crossPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $crossPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $graphics.DrawLine($crossPen, [int]($size * 0.305), [int]($size * 0.72), [int]($size * 0.375), [int]($size * 0.79))
  $graphics.DrawLine($crossPen, [int]($size * 0.375), [int]($size * 0.72), [int]($size * 0.305), [int]($size * 0.79))

  $lineBrush = New-Object System.Drawing.SolidBrush $palette.Line
  $mutedBrush = New-Object System.Drawing.SolidBrush $palette.Muted
  $lineH = [int]($size * 0.035)
  $lineRadius = [int]($size * 0.017)
  $line1 = New-RoundedRectPath ([int]($size * 0.51)) ([int]($size * 0.44)) ([int]($size * 0.21)) $lineH $lineRadius
  $line2 = New-RoundedRectPath ([int]($size * 0.51)) ([int]($size * 0.51)) ([int]($size * 0.16)) $lineH $lineRadius
  $line3 = New-RoundedRectPath ([int]($size * 0.51)) ([int]($size * 0.68)) ([int]($size * 0.21)) $lineH $lineRadius
  $line4 = New-RoundedRectPath ([int]($size * 0.51)) ([int]($size * 0.75)) ([int]($size * 0.18)) $lineH $lineRadius
  $graphics.FillPath($lineBrush, $line1)
  $graphics.FillPath($mutedBrush, $line2)
  $graphics.FillPath($lineBrush, $line3)
  $graphics.FillPath($mutedBrush, $line4)

  $bitmap.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)

  $crossPen.Dispose()
  $checkPen.Dispose()
  $lineBrush.Dispose()
  $mutedBrush.Dispose()
  $pinBrush.Dispose()
  $outerPath.Dispose()
  $innerPath.Dispose()
  $headerPath.Dispose()
  $topBox.Dispose()
  $bottomBox.Dispose()
  $line1.Dispose()
  $line2.Dispose()
  $line3.Dispose()
  $line4.Dispose()
  $graphics.Dispose()
  $bitmap.Dispose()
}

function Save-Favicon([int]$size, [string]$outputPath) {
  $bitmap = New-Object System.Drawing.Bitmap $size, $size
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $graphics.Clear([System.Drawing.Color]::Transparent)

  $outerMargin = [int]($size * 0.06)
  $innerMargin = [int]($size * 0.16)
  $outerRadius = [int]($size * 0.22)
  $innerRadius = [int]($size * 0.16)

  $outerPath = New-RoundedRectPath $outerMargin $outerMargin ($size - $outerMargin * 2) ($size - $outerMargin * 2) $outerRadius
  $innerPath = New-RoundedRectPath $innerMargin $innerMargin ($size - $innerMargin * 2) ($size - $innerMargin * 2) $innerRadius

  $graphics.FillPath((New-Object System.Drawing.SolidBrush $palette.Background), $outerPath)
  $graphics.FillPath((New-Object System.Drawing.SolidBrush $palette.Surface), $innerPath)

  $checkPen = New-Object System.Drawing.Pen -ArgumentList $palette.Accent, ([int]($size * 0.08))
  $checkPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $checkPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $checkPen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
  $graphics.DrawLine($checkPen, [int]($size * 0.28), [int]($size * 0.56), [int]($size * 0.43), [int]($size * 0.70))
  $graphics.DrawLine($checkPen, [int]($size * 0.43), [int]($size * 0.70), [int]($size * 0.72), [int]($size * 0.34))

  $icon = [System.Drawing.Icon]::FromHandle($bitmap.GetHicon())
  $stream = [System.IO.File]::Open($outputPath, [System.IO.FileMode]::Create)
  $icon.Save($stream)
  $stream.Dispose()

  $icon.Dispose()
  $checkPen.Dispose()
  $outerPath.Dispose()
  $innerPath.Dispose()
  $graphics.Dispose()
  $bitmap.Dispose()
}

Draw-Icon -size 192 -outputPath (Join-Path $iconDir "icon-192.png")
Draw-Icon -size 512 -outputPath (Join-Path $iconDir "icon-512.png")
Draw-Icon -size 512 -outputPath (Join-Path $iconDir "icon-maskable-512.png") -maskable $true
Draw-Icon -size 180 -outputPath (Join-Path $iconDir "apple-touch-icon.png")
Save-Favicon -size 64 -outputPath (Join-Path $appDir "favicon.ico")
