Add-Type -AssemblyName System.Drawing

$origPath = "C:\Users\lavanya prasad\.gemini\antigravity\brain\1cc4479a-24d0-4cf6-895a-994c79fa4118\handyman_showcase_1792554106331.jpg"
$destPath = "$PSScriptRoot\..\public\handyman-showcase.png"

$source = [System.Drawing.Bitmap]::FromFile($origPath)
$bmp = New-Object System.Drawing.Bitmap($source.Width, $source.Height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$bmp.SetResolution($source.HorizontalResolution, $source.VerticalResolution)

$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

$g.DrawImage($source, 0, 0, $source.Width, $source.Height)

$pt1 = New-Object System.Drawing.Point(712, 780)
$pt2 = New-Object System.Drawing.Point(803, 755)
$pt3 = New-Object System.Drawing.Point(803, 825)
$pt4 = New-Object System.Drawing.Point(712, 848)

[System.Drawing.Point[]]$pts = @($pt1, $pt2, $pt3, $pt4)

$brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    $pt1,
    $pt3,
    [System.Drawing.Color]::FromArgb(255, 218, 226, 232),
    [System.Drawing.Color]::FromArgb(255, 172, 182, 192)
)

$path = New-Object System.Drawing.Drawing2D.GraphicsPath
$path.AddPolygon($pts)
$g.FillPath($brush, $path)

# Draw clean engraved "NIVARO" text rotated by ~ -14.2 degrees to match the toolbox perspective
$state = $g.Save()
$centerX = 757
$centerY = 801
$g.TranslateTransform($centerX, $centerY)
$g.RotateTransform(-14.2)

$fontTitle = New-Object System.Drawing.Font("Arial", 10.5, [System.Drawing.FontStyle]::Bold)
$fontSub = New-Object System.Drawing.Font("Arial", 5.5, [System.Drawing.FontStyle]::Bold)
$textBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(240, 0x22, 0x1A, 0x18))
$subBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(200, 0x4A, 0x25, 0x1D))

$format = New-Object System.Drawing.StringFormat
$format.Alignment = [System.Drawing.StringAlignment]::Center

$g.DrawString("NIVARO", $fontTitle, $textBrush, 0, -9, $format)
$g.DrawString("HOME SERVICES", $fontSub, $subBrush, 0, 6, $format)

$g.Restore($state)

$g.Dispose()
$source.Dispose()

$bmp.Save($destPath, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()

Write-Host "Successfully applied perspective-aligned Nivaro branding to toolbox"
