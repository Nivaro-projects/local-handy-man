Add-Type -AssemblyName System.Drawing

$origPath = "C:\Users\lavanya prasad\.gemini\antigravity\brain\1cc4479a-24d0-4cf6-895a-994c79fa4118\handyman_showcase_1792554106331.jpg"
$destPath = "$PSScriptRoot\..\public\handyman-showcase.png"

$bmp = [System.Drawing.Bitmap]::FromFile($origPath)
Write-Host "Width: $($bmp.Width) Height: $($bmp.Height)"

$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

# The metal box front panel is perspective-tilted slightly.
# Let's cover the text: x from 712 to 796, y from 750 to 796
# Sample metal color at x=715, y=745 (above the text)
$metalColor = $bmp.GetPixel(715, 745)
Write-Host "Metal color: R=$($metalColor.R) G=$($metalColor.G) B=$($metalColor.B)"

# Fill a subtle brushed-metal rectangle over the old text
$brush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 182, 192, 198))
$rect = New-Object System.Drawing.Rectangle(710, 750, 88, 48)
$g.FillRectangle($brush, $rect)

# Draw new text: "NIVARO" in bold and "HOME SERVICES" below
$fontTitle = New-Object System.Drawing.Font("Arial", 8.5, [System.Drawing.FontStyle]::Bold)
$fontSub = New-Object System.Drawing.Font("Arial", 5.5, [System.Drawing.FontStyle]::Bold)
$textBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(240, 0x34, 0x2A, 0x24))
$subBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(200, 0x5C, 0x40, 0x33))

$format = New-Object System.Drawing.StringFormat
$format.Alignment = [System.Drawing.StringAlignment]::Center

# Slight angle (or flat centered)
$g.DrawString("NIVARO", $fontTitle, $textBrush, 754, 755, $format)
$g.DrawString("HOME SERVICES", $fontSub, $subBrush, 754, 774, $format)

$g.Dispose()

$bmp.Save($destPath, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()

Write-Host "Cleaned and updated $destPath"
