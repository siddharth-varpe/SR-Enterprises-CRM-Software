Add-Type -AssemblyName System.Drawing

$sourcePath = "C:\Users\shara\.gemini\antigravity-ide\brain\90cf69ab-849e-40d1-95fd-56277433115c\.user_uploaded\media_1787822687925.jpg"
$destDir = "d:\Desktop\CRM-SR-Enterprices\apps\web\src\assets"
$destFull = "$destDir\sr-enterprises-upi-qr-card.jpg"
$destCrop = "$destDir\sr-enterprises-upi-qr.png"

# Copy original high-res image
Copy-Item -Path $sourcePath -Destination $destFull -Force

$bmp = [System.Drawing.Bitmap]::FromFile($sourcePath)
Write-Output "Original Size: $($bmp.Width) x $($bmp.Height)"

# Let's crop the exact QR code square
# In the 768 x 1024 or similar image, find the bounding box of the QR code
# Let's inspect coordinates or crop the exact square around the QR code
# The QR code is centered horizontally, located in the middle vertical area

# Let's find the black square corners
$minX = $bmp.Width
$maxX = 0
$minY = $bmp.Height
$maxY = 0

# Check pixels to find the QR code bounding box (black pixels)
# We sample between y: 200 to 800 and x: 100 to 700
for ($y = [int]($bmp.Height * 0.2); $y -lt [int]($bmp.Height * 0.8); $y++) {
    for ($x = [int]($bmp.Width * 0.15); $x -lt [int]($bmp.Width * 0.85); $x++) {
        $pixel = $bmp.GetPixel($x, $y)
        # Black pixel in QR code has low R, G, B
        if ($pixel.R -lt 60 -and $pixel.G -lt 60 -and $pixel.B -lt 60) {
            if ($x -lt $minX) { $minX = $x }
            if ($x -gt $maxX) { $maxX = $x }
            if ($y -lt $minY) { $minY = $y }
            if ($y -gt $maxY) { $maxY = $y }
        }
    }
}

Write-Output "QR Bounding Box: X=[$minX, $maxX], Y=[$minY, $maxY], Width=$($maxX - $minX), Height=$($maxY - $minY)"

# Add a small 8px padding around the QR code for a clean white border
$pad = 8
$cropX = [Math]::Max(0, $minX - $pad)
$cropY = [Math]::Max(0, $minY - $pad)
$cropW = [Math]::Min($bmp.Width - $cropX, ($maxX - $minX) + ($pad * 2))
$cropH = [Math]::Min($bmp.Height - $cropY, ($maxY - $minY) + ($pad * 2))

# Make it a perfect square
$maxDim = [Math]::Max($cropW, $cropH)
$rect = New-Object System.Drawing.Rectangle($cropX, $cropY, $cropW, $cropH)

$croppedBmp = $bmp.Clone($rect, $bmp.PixelFormat)
$croppedBmp.Save($destCrop, [System.Drawing.Imaging.ImageFormat]::Png)
$croppedBmp.Dispose()
$bmp.Dispose()

Write-Output "Cropped QR saved to: $destCrop"
