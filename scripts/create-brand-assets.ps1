Add-Type -AssemblyName System.Drawing

$srcPath = "C:\Users\lavanya prasad\.gemini\antigravity\brain\1cc4479a-24d0-4cf6-895a-994c79fa4118\.user_uploaded\media_1792588058691_67cf3899.png"
$rawBmp = [System.Drawing.Bitmap]::FromFile($srcPath)
$srcW = $rawBmp.Width
$srcH = $rawBmp.Height

# Step 1: Create a transparent version of the wordmark (remove black background, keep white antialiased text)
$transparentWordmark = New-Object System.Drawing.Bitmap($srcW, $srcH, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)

for ($y = 0; $y -lt $srcH; $y++) {
    for ($x = 0; $x -lt $srcW; $x++) {
        $c = $rawBmp.GetPixel($x, $y)
        $brightness = [int](($c.R + $c.G + $c.B) / 3)
        if ($brightness -gt 25) {
            # Antialiased white with proportional alpha
            $alpha = [Math]::Min(255, [int]($brightness * 1.15))
            $newColor = [System.Drawing.Color]::FromArgb($alpha, 255, 255, 255)
            $transparentWordmark.SetPixel($x, $y, $newColor)
        } else {
            $transparentWordmark.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(0, 0, 0, 0))
        }
    }
}

$rawBmp.Dispose()

# Step 2: Crop to content bounding box
# We know the content bounding box is minX: 68, maxX: 954, minY: 74, maxY: 231
$minX = 66
$maxX = 956
$minY = 72
$maxY = 233
$croppedW = $maxX - $minX + 1
$croppedH = $maxY - $minY + 1

$croppedWordmark = New-Object System.Drawing.Bitmap($croppedW, $croppedH, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$cg = [System.Drawing.Graphics]::FromImage($croppedWordmark)
$cg.DrawImage($transparentWordmark, (New-Object System.Drawing.Rectangle(0, 0, $croppedW, $croppedH)), $minX, $minY, $croppedW, $croppedH, [System.Drawing.GraphicsUnit]::Pixel)
$cg.Dispose()

# Save transparent wordmark to public/nivaro-wordmark.png
$wordmarkDest = "$PSScriptRoot\..\public\nivaro-wordmark.png"
$croppedWordmark.Save($wordmarkDest, [System.Drawing.Imaging.ImageFormat]::Png)
Write-Host "Saved transparent wordmark to $wordmarkDest"

# Step 3: Create square app/brand icon logo (512x512)
# Round-cornered / circular emblem in brand Walnut (#4A251D) with Amber border and centered white Nivaro logo
$size = 512
$iconBmp = New-Object System.Drawing.Bitmap($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g = [System.Drawing.Graphics]::FromImage($iconBmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

# Clear with transparent
$g.Clear([System.Drawing.Color]::Transparent)

# Draw rounded walnut badge or circle
$walnutColor = [System.Drawing.Color]::FromArgb(255, 0x4A, 0x25, 0x1D)
$amberColor = [System.Drawing.Color]::FromArgb(255, 0xE5, 0x98, 0x38)
$walnutBrush = New-Object System.Drawing.SolidBrush($walnutColor)
$amberPen = New-Object System.Drawing.Pen($amberColor, 8)

# Circular badge (looks amazing as favicon, app icon, and header avatar)
$circleMargin = 12
$circleRect = New-Object System.Drawing.Rectangle($circleMargin, $circleMargin, $size - ($circleMargin * 2), $size - ($circleMargin * 2))
$g.FillEllipse($walnutBrush, $circleRect)
$g.DrawEllipse($amberPen, $circleRect)

# Draw centered Nivaro wordmark inside the circle
$targetW = 390
$targetH = [int]($targetW * ($croppedH / $croppedW))
$targetX = [int](($size - $targetW) / 2)
$targetY = [int](($size - $targetH) / 2)

$g.DrawImage($croppedWordmark, (New-Object System.Drawing.Rectangle($targetX, $targetY, $targetW, $targetH)))

$g.Dispose()

# Save as public/logo.png
$logoDest = "$PSScriptRoot\..\public\logo.png"
$iconBmp.Save($logoDest, [System.Drawing.Imaging.ImageFormat]::Png)
Write-Host "Saved circular Nivaro badge to $logoDest"

# Step 4: Inspect & Clean up the toolbox in public/handyman-showcase.png
$showcasePath = "$PSScriptRoot\..\public\handyman-showcase.png"
if (Test-Path $showcasePath) {
    $scBmp = [System.Drawing.Bitmap]::FromFile($showcasePath)
    Write-Host "Showcase Image Width: $($scBmp.Width) Height: $($scBmp.Height)"
    
    # The toolbox is in the bottom right around x: 620..810, y: 700..850 on a 1024x768 image
    # Let's paint a clean brushed metallic plate over 'SUNDARAM HANDYMAN SERVICES'
    # and write 'NIVARO HOME SERVICES' cleanly
    $sg = [System.Drawing.Graphics]::FromImage($scBmp)
    $sg.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $sg.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
    
    # Coordinates of text on the metal toolbox: around x=695, y=748, w=100, h=40
    # Let's sample the metal color from the toolbox
    $metalBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 195, 204, 210))
    $metalRect = New-Object System.Drawing.Rectangle(692, 742, 108, 48)
    $sg.FillRectangle($metalBrush, $metalRect)
    
    # Draw dark engraved text "NIVARO" and "HOME SERVICES"
    $fontTitle = New-Object System.Drawing.Font("Arial", 10, [System.Drawing.FontStyle]::Bold)
    $fontSub = New-Object System.Drawing.Font("Arial", 6.5, [System.Drawing.FontStyle]::Bold)
    $engravedBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 0x4A, 0x25, 0x1D))
    $subBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 0x71, 0x67, 0x5D))
    
    $format = New-Object System.Drawing.StringFormat
    $format.Alignment = [System.Drawing.StringAlignment]::Center
    
    $sg.DrawString("NIVARO", $fontTitle, $engravedBrush, 746, 748, $format)
    $sg.DrawString("HOME SERVICES", $fontSub, $subBrush, 746, 768, $format)
    
    $sg.Dispose()
    
    $tempShowcase = "$PSScriptRoot\..\public\temp-showcase.png"
    $scBmp.Save($tempShowcase, [System.Drawing.Imaging.ImageFormat]::Png)
    $scBmp.Dispose()
    
    Move-Item -Path $tempShowcase -Destination $showcasePath -Force
    Write-Host "Updated showcase image toolbox to NIVARO HOME SERVICES"
}

$croppedWordmark.Dispose()
$transparentWordmark.Dispose()
$iconBmp.Dispose()
