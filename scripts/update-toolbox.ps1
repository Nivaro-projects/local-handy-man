Add-Type -AssemblyName System.Drawing

$origPath = "C:\Users\lavanya prasad\.gemini\antigravity\brain\1cc4479a-24d0-4cf6-895a-994c79fa4118\handyman_showcase_1792554106331.jpg"
$destPath = "$PSScriptRoot\..\public\handyman-showcase.png"

$bmp = [System.Drawing.Bitmap]::FromFile($origPath)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

# The metal box panel:
# Let's sample the clean metal color right above the text at (x=750, y=745)
# and right below at (x=750, y=825)
$topColor = $bmp.GetPixel(750, 745)
$bottomColor = $bmp.GetPixel(750, 825)

# Fill a gradient/solid over the old text region (x: 708..802, y: 752..818)
$metalRect = New-Object System.Drawing.Rectangle(708, 752, 94, 66)
$metalBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    $metalRect,
    [System.Drawing.Color]::FromArgb(255, 210, 218, 224),
    [System.Drawing.Color]::FromArgb(255, 186, 196, 204),
    [System.Drawing.Drawing2D.LinearGradientMode]::Vertical
)
$g.FillRectangle($metalBrush, $metalRect)

# Write "NIVARO" and "HOME REPAIRS" cleanly engraved
$fontTitle = New-Object System.Drawing.Font("Arial", 11, [System.Drawing.FontStyle]::Bold)
$fontSub = New-Object System.Drawing.Font("Arial", 6.5, [System.Drawing.FontStyle]::Bold)
$textBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(230, 0x34, 0x2A, 0x24))
$subBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(190, 0x5C, 0x40, 0x33))

$format = New-Object System.Drawing.StringFormat
$format.Alignment = [System.Drawing.StringAlignment]::Center

$g.DrawString("NIVARO", $fontTitle, $textBrush, 755, 762, $format)
$g.DrawString("HOME REPAIRS", $fontSub, $subBrush, 755, 786, $format)

$g.Dispose()

$bmp.Save($destPath, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()

Write-Host "Updated showcase image toolbox to NIVARO HOME REPAIRS at $destPath"
