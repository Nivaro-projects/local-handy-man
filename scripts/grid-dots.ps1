Add-Type -AssemblyName System.Drawing

$origPath = "C:\Users\lavanya prasad\.gemini\antigravity\brain\1cc4479a-24d0-4cf6-895a-994c79fa4118\handyman_showcase_1792554106331.jpg"
$destPath = "$PSScriptRoot\..\public\handyman-showcase.png"

$source = [System.Drawing.Bitmap]::FromFile($origPath)
$bmp = New-Object System.Drawing.Bitmap($source.Width, $source.Height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$bmp.SetResolution($source.HorizontalResolution, $source.VerticalResolution)

$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.DrawImage($source, 0, 0, $source.Width, $source.Height)

# Test dots
$g.FillEllipse((New-Object System.Drawing.SolidBrush([System.Drawing.Color]::Yellow)), 780, 810, 12, 12)
$g.FillEllipse((New-Object System.Drawing.SolidBrush([System.Drawing.Color]::Orange)), 800, 810, 12, 12)
$g.FillEllipse((New-Object System.Drawing.SolidBrush([System.Drawing.Color]::Cyan)), 820, 810, 12, 12)
$g.FillEllipse((New-Object System.Drawing.SolidBrush([System.Drawing.Color]::Magenta)), 800, 835, 12, 12)

$g.Dispose()
$source.Dispose()

$bmp.Save($destPath, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()
Write-Host "Grid dots drawn"
