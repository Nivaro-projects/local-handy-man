Add-Type -AssemblyName System.Drawing

$srcPath = "C:\Users\lavanya prasad\.gemini\antigravity\brain\1cc4479a-24d0-4cf6-895a-994c79fa4118\.user_uploaded\media_1792588058691_67cf3899.png"
$bmp = [System.Drawing.Bitmap]::FromFile($srcPath)
Write-Host "Nivaro Logo Width: $($bmp.Width) Height: $($bmp.Height)"

$destPath = "$PSScriptRoot\..\public\logo.png"

# Create a square 512x512 brand icon
$squareSize = 512
$outBmp = New-Object System.Drawing.Bitmap($squareSize, $squareSize)
$g = [System.Drawing.Graphics]::FromImage($outBmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic

# Background: Walnut Deep #4A251D rounded rect or circle
$walnutBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 0x4A, 0x25, 0x1D))
$amberBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 0xE5, 0x98, 0x38))
$creamBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 0xFD, 0xF6, 0xE4))

# Fill background with Deep Walnut
$rect = New-Object System.Drawing.Rectangle(0, 0, $squareSize, $squareSize)
$g.FillRectangle($walnutBrush, $rect)

# Draw subtle gold / amber accent border
$pen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 0xE5, 0x98, 0x38), 6)
$g.DrawRectangle($pen, 3, 3, $squareSize - 6, $squareSize - 6)

# Scale Nivaro wordmark to fit nicely centered with padding
# Original wordmark is 1024 x 342. Aspect ratio is ~3:1.
$targetWidth = 440
$targetHeight = [int]($targetWidth * ($bmp.Height / $bmp.Width))
$posX = [int](($squareSize - $targetWidth) / 2)
$posY = [int](($squareSize - $targetHeight) / 2)

$destRect = New-Object System.Drawing.Rectangle($posX, $posY, $targetWidth, $targetHeight)
$srcRect = New-Object System.Drawing.Rectangle(0, 0, $bmp.Width, $bmp.Height)

$g.DrawImage($bmp, $destRect, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)

$g.Dispose()
$bmp.Dispose()

# Save to public/logo.png
$outBmp.Save($destPath, [System.Drawing.Imaging.ImageFormat]::Png)
$outBmp.Dispose()

Write-Host "Successfully saved new 512x512 Nivaro brand logo to $destPath"
