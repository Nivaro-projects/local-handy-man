Add-Type -AssemblyName System.Drawing
$bmp = [System.Drawing.Bitmap]::FromFile('C:\Users\lavanya prasad\.gemini\antigravity\brain\1cc4479a-24d0-4cf6-895a-994c79fa4118\handyman_showcase_1792554106331.jpg')

# Scan for dark letters (R < 60, G < 60, B < 60) on light metal background in region x: 750..960, y: 720..840
$minX = 1200; $maxX = 0; $minY = 896; $maxY = 0; $count = 0

for ($y = 720; $y -lt 850; $y++) {
    for ($x = 750; $x -lt 980; $x++) {
        $c = $bmp.GetPixel($x, $y)
        # Dark black text
        if ($c.R -lt 70 -and $c.G -lt 70 -and $c.B -lt 70) {
            if ($x -lt $minX) { $minX = $x }
            if ($x -gt $maxX) { $maxX = $x }
            if ($y -lt $minY) { $minY = $y }
            if ($y -gt $maxY) { $maxY = $y }
            $count++
        }
    }
}

Write-Host "Found $count dark text pixels in bounds: minX=$minX, maxX=$maxX, minY=$minY, maxY=$maxY"
$bmp.Dispose()
