param([string]$Source = 'C:\Users\Lenovo\Downloads\UNITY')
$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent $PSScriptRoot
$lab = Join-Path $repo 'game\internal\unity-model-lab'
$raw = Join-Path $lab 'source'
$tuned = Join-Path $lab 'tuned'
New-Item -ItemType Directory -Path $raw,(Join-Path $raw 'textures'),$tuned,(Join-Path $tuned 'textures') -Force | Out-Null
foreach ($name in @('scene.gltf','scene.bin','license.txt')) { Copy-Item -LiteralPath (Join-Path $Source $name) -Destination (Join-Path $raw $name) }
Copy-Item -LiteralPath (Join-Path $Source 'Block Island.stl') -Destination (Join-Path $lab 'block-island.stl')
Add-Type -AssemblyName System.Drawing
$encoder = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object MimeType -eq 'image/jpeg'
$quality = [System.Drawing.Imaging.EncoderParameters]::new(1)
$quality.Param[0] = [System.Drawing.Imaging.EncoderParameter]::new([System.Drawing.Imaging.Encoder]::Quality, [long]78)
$textureBytes = 0L; $sourcePixels = 0L; $tunedPixels = 0L
foreach ($file in Get-ChildItem -LiteralPath (Join-Path $Source 'textures') -File) {
  Copy-Item -LiteralPath $file.FullName -Destination (Join-Path $raw ('textures\' + $file.Name))
  $image = [System.Drawing.Image]::FromFile($file.FullName)
  try {
    $factor = [Math]::Min(1.0, 512.0 / [Math]::Max($image.Width,$image.Height))
    $w = [int]($image.Width * $factor); $h = [int]($image.Height * $factor)
    $bitmap = [System.Drawing.Bitmap]::new($w,$h)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    try {
      $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
      $graphics.DrawImage($image,0,0,$w,$h)
      $bitmap.Save((Join-Path $tuned ('textures\' + $file.Name)),$encoder,$quality)
    } finally { $graphics.Dispose(); $bitmap.Dispose() }
    $sourcePixels += [long]$image.Width * $image.Height; $tunedPixels += [long]$w * $h
    $textureBytes += $file.Length
  } finally { $image.Dispose() }
}
$quality.Dispose()
$gltf = Get-Content -LiteralPath (Join-Path $raw 'scene.gltf') -Raw | ConvertFrom-Json -AsHashtable
$gltf.buffers[0].uri = '../source/scene.bin'
foreach ($material in $gltf.materials) {
  # The original uses baked, unlit materials. A separate lit variant lets the
  # scene's Mars sun, night lighting and shadows affect the building.
  $material.Remove('extensions'); $material.Remove('emissiveTexture')
  $material.pbrMetallicRoughness.roughnessFactor = 0.92
  $material.pbrMetallicRoughness.metallicFactor = 0.05
}
$gltf.extensionsUsed = @($gltf.extensionsUsed | Where-Object { $_ -ne 'KHR_materials_unlit' })
$gltf.extensionsRequired = @($gltf.extensionsRequired | Where-Object { $_ -ne 'KHR_materials_unlit' })
$gltf | ConvertTo-Json -Depth 100 | Set-Content -LiteralPath (Join-Path $tuned 'scene.gltf') -Encoding utf8
$tunedBytes = (Get-ChildItem -LiteralPath (Join-Path $tuned 'textures') -File | Measure-Object Length -Sum).Sum
$stats = @{
  sourceFolder = $Source; sourceTextureBytes = $textureBytes; tunedTextureBytes = $tunedBytes
  sourceTextureRGBABytesWithMipmaps = [long]($sourcePixels * 4 * 4/3)
  tunedTextureRGBABytesWithMipmaps = [long]($tunedPixels * 4 * 4/3)
  geometryBytes = (Get-Item -LiteralPath (Join-Path $raw 'scene.bin')).Length
  note = 'Texture memory is an RGBA8+mipmap estimate, not a measured GPU allocation. Geometry unchanged. Source files untouched.'
}
$stats | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $lab 'asset-stats.json') -Encoding utf8
Write-Output ($stats | ConvertTo-Json)
& python (Join-Path $PSScriptRoot 'pack-unity-lab.py') $tuned
if ($LASTEXITCODE -ne 0) { throw 'Model repacking failed' }
