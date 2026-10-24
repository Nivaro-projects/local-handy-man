$sourceDir = "c:\Users\lavanya prasad\Downloads\CLR sarma"
$destZip = "c:\Users\lavanya prasad\Downloads\Local-Handyman-Chirala.zip"

if (Test-Path $destZip) {
    Remove-Item $destZip -Force
}

# Collect all files except secrets (.env*), build output (dist), node_modules, logs, and zip files
$items = Get-ChildItem -Path $sourceDir -Exclude "node_modules", "dist", "*.zip", ".env*", "scratch", "*.log"

Compress-Archive -Path $items.FullName -DestinationPath $destZip -CompressionLevel Optimal

# Also place a copy in the workspace folder for convenience
Copy-Item -Path $destZip -Destination "$sourceDir\Local-Handyman-Chirala.zip" -Force

Get-Item $destZip | Select-Object Name, Length, LastWriteTime
