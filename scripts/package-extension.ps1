param(
  [ValidateSet("development", "production")]
  [string]$Target = "production"
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
$source = Join-Path $repoRoot "extension"
$manifest = Get-Content -Raw (Join-Path $source "manifest.json") | ConvertFrom-Json
$buildRoot = Join-Path $repoRoot "build"
$output = Join-Path $buildRoot "reelmark-extension-$Target"
$files = @(
  "auth.js",
  "config.js",
  "content.js",
  "coverage.js",
  "manifest.json",
  "netflix-metadata.js",
  "popup.css",
  "popup.html",
  "popup.js",
  "service-worker.js",
  "sync.js"
)

if (Test-Path -LiteralPath $output) {
  Remove-Item -LiteralPath $output -Recurse -Force
}
New-Item -ItemType Directory -Path $output | Out-Null
New-Item -ItemType Directory -Path (Join-Path $output "icons") | Out-Null

foreach ($file in $files) {
  Copy-Item -LiteralPath (Join-Path $source $file) -Destination (Join-Path $output $file)
}
Copy-Item -Path (Join-Path $source "icons\*") -Destination (Join-Path $output "icons")

$utf8 = [Text.UTF8Encoding]::new($false)
if ($Target -eq "production") {
  $productionOrigin = "https://reelmark.afana.id"
  $manifest.name = "Reelmark Watch Detector"
  $manifest.host_permissions = @(
    @(
      $manifest.host_permissions | Where-Object { $_ -ne "http://localhost:3000/*" }
    ) + "$productionOrigin/*" | Select-Object -Unique
  )
  [IO.File]::WriteAllText(
    (Join-Path $output "manifest.json"),
    ($manifest | ConvertTo-Json -Depth 10),
    $utf8
  )
  [IO.File]::WriteAllText(
    (Join-Path $output "config.js"),
    "(function exposeConfig(root) {`n  root.ReelConfig = Object.freeze({ apiBase: `"$productionOrigin`" });`n})(globalThis);`n",
    $utf8
  )

  $localhostMatch = Get-ChildItem -Path $output -Recurse -File | Select-String -SimpleMatch "localhost"
  if ($localhostMatch) {
    throw "Build production masih mengandung localhost."
  }

  $zip = Join-Path $repoRoot "public\downloads\reelmark-extension-$($manifest.version).zip"
  Compress-Archive -Path (Join-Path $output "*") -DestinationPath $zip -CompressionLevel Optimal -Force
  Write-Host "Production: $zip"
} else {
  $developmentOrigin = "http://localhost:3000"
  [IO.File]::WriteAllText(
    (Join-Path $output "config.js"),
    "(function exposeConfig(root) {`n  root.ReelConfig = Object.freeze({ apiBase: `"$developmentOrigin`" });`n})(globalThis);`n",
    $utf8
  )
  Write-Host "Development (Load unpacked): $output"
}
