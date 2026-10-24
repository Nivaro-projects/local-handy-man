Add-Type -AssemblyName System.Drawing
$bmp = [System.Drawing.Bitmap]::FromFile('C:\Users\lavanya prasad\.gemini\antigravity\brain\1cc4479a-24d0-4cf6-895a-994c79fa4118\handyman_showcase_1792554106331.jpg')

$minX = 1200; $maxX = 0; $minY = 896; $maxY = 0; $count = 0

for ($y = 740; $y -lt 830; $y++) {
    for ($x = 700; $x -lt 805; $x++) {
        $c = $bmp.GetPixel($x, $y)
        if ($c.R -lt 65 -and $c.G -lt 65 -and $c.B -lt 65) {
            if ($x -lt $minX) { $minX = $x }
            if ($x -gt $maxX) { $maxX = $x }
            if ($y -lt $minY) { $minY = $y }
            if ($y -gt $maxY) { $maxY = $y }
            $count++
        }
    }
}

Write-Host "Toolbox text exact bounds: minX=$minX, maxX=$maxX, minY=$minY, maxY=$maxY (count=$count)"
$bmp.Dispose()
