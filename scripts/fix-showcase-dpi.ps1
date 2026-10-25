Add-Type -AssemblyName System.Drawing

$origPath = "C:\Users\lavanya prasad\.gemini\antigravity\brain\1cc4479a-24d0-4cf6-895a-994c79fa4118\handyman_showcase_1792554106331.jpg"
$destPath = "$PSScriptRoot\..\public\handyman-showcase.png"

$source = [System.Drawing.Bitmap]::FromFile($origPath)
Write-Host "Source DpiX: $($source.HorizontalResolution) DpiY: $($source.VerticalResolution) W: $($source.Width) H: $($source.Height)"

$bmp = New-Object System.Drawing.Bitmap($source.Width, $source.Height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$bmp.SetResolution($source.HorizontalResolution, $source.VerticalResolution)

$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.DrawImage($source, 0, 0, $source.Width, $source.Height)

# Now let's find where the text is:
# On the 1200x896 image, the text SUNDARAM HANDYMAN SERVICES is at:
# Let's find the exact pixel by sampling
# Let's find pixels where text is dark on the toolbox
Write-Host "Scanning for dark pixels on toolbox..."

# In the actual image, the toolbox text:
# Let's find the average color of the metal panel around x=860, y=780
# Wait! Let's check: Where is the text SUNDARAM?
# Let's check with a red dot at x=860, y=780, x=750, y=770, x=720, y=780
$redBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::Red)
$blueBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::Blue)
$greenBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::Lime)

# Let's draw test markers to find the exact location:
$g.FillEllipse($redBrush, 720, 780, 10, 10)
$g.FillEllipse($blueBrush, 750, 780, 10, 10)
$g.FillEllipse($greenBrush, 850, 780, 10, 10)

$g.Dispose()
$source.Dispose()

$bmp.Save($destPath, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()
Write-Host "Markers drawn at (720,780), (750,780), (850,780)"
