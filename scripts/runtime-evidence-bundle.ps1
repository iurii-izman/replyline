param()

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$runtimeDir = Join-Path $root "reports\runtime"
if (-not (Test-Path $runtimeDir)) {
  throw "Runtime reports not found. Run pnpm probe:runtime or pnpm probe:bench first."
}

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$bundleDir = Join-Path $root "reports\runtime-evidence-$timestamp"
New-Item -ItemType Directory -Force -Path $bundleDir | Out-Null

$files = Get-ChildItem -Path $runtimeDir -File | Where-Object {
  $_.Extension -in @(".json", ".md", ".txt")
}
if (-not $files -or $files.Count -eq 0) {
  throw "No runtime artifacts found in $runtimeDir. Run pnpm probe:runtime first."
}

$runtimeJson = $files | Where-Object { $_.Extension -eq ".json" -and $_.Name -notlike "latency-comparison.json" }
if (-not $runtimeJson -or $runtimeJson.Count -eq 0) {
  throw "No runtime JSON report found (excluding comparison summary). Run pnpm probe:runtime first."
}

foreach ($file in $files) {
  Copy-Item -Path $file.FullName -Destination (Join-Path $bundleDir $file.Name) -Force
}

$manifest = [ordered]@{
  generatedAtLocal = (Get-Date).ToString("s")
  sourceRuntimeDir = $runtimeDir
  bundleDir = $bundleDir
  runtimeReportCount = $runtimeJson.Count
  copiedFileCount = $files.Count
  files = @($files | ForEach-Object { $_.Name })
  benchmarkLabels = @{
    target = "intended design goal without local runtime artifact"
    measured = "supported by local runtime artifact in this bundle or reports/runtime"
    pending_verification = "path exists but proof is incomplete, noisy, stale, or missing"
  }
  honesty = @{
    proves = @(
      "local provider path worked",
      "local capture->transcript->card timing was recorded"
    )
    does_not_prove = @(
      "same behavior on every workstation",
      "same behavior in every call app",
      "product-market fit"
    )
  }
}

$manifest | ConvertTo-Json -Depth 6 | Set-Content -Path (Join-Path $bundleDir "manifest.json") -Encoding utf8

Write-Host "Runtime evidence bundle created:" -ForegroundColor Green
Write-Host $bundleDir
