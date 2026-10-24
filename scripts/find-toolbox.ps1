Add-Type -AssemblyName System.Drawing
$bmp = [System.Drawing.Bitmap]::FromFile('C:\Users\lavanya prasad\.gemini\antigravity\brain\1cc4479a-24d0-4cf6-895a-994c79fa4118\handyman_showcase_1792554106331.jpg')
Write-Host "Width: $($bmp.Width) Height: $($bmp.Height)"

# Scan for where the grey metallic surface is:
for ($y = 660; $y -lt 880; $y += 15) {
    $line = ""
    for ($x = 600; $x -lt 980; $x += 15) {
        $c = $bmp.GetPixel($x, $y)
        # Toolbox metal is bright greyish-blue: R in 160..225, G in 170..235, B in 170..240
        if ($c.R -gt 150 -and $c.G -gt 160 -and $c.B -gt 165 -and [Math]::Abs($c.R - $c.G) -lt 30) {
            $line += "#"
        } else {
            $line += "."
        }
    }
    Write-Host ("y=$y (x 600..980): $line")
}

$bmp.Dispose()
