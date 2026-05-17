param()

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$runtimeDir = Join-Path $root "reports\runtime"
$logPath = Join-Path $env:LOCALAPPDATA "com.replyline.app\logs\app.log"

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$bundleDir = Join-Path $root "reports\runtime-evidence-$timestamp"
New-Item -ItemType Directory -Force -Path $bundleDir | Out-Null

$files = @()
if (Test-Path $runtimeDir) {
  $files += Get-ChildItem -Path $runtimeDir -File | Where-Object {
    $_.Extension -in @(".json", ".md", ".txt")
  }
}

if (Test-Path $logPath) {
  $files += Get-Item -Path $logPath
}

if (-not $files -or $files.Count -eq 0) {
  throw "No runtime artifacts or local app log found. Run pnpm probe:runtime or launch the app once first."
}

$files = @($files | Sort-Object FullName -Unique)
$runtimeJson = @($files | Where-Object {
  $_.FullName.StartsWith($runtimeDir) -and $_.Extension -eq ".json" -and $_.Name -notlike "latency-comparison.json"
})

$latencySummaryGenerated = $false
$latencySummaryPath = Join-Path $runtimeDir "pipeline-latency-summary.json"
if (Test-Path $logPath) {
  try {
    $parseResult = & node --no-warnings (Join-Path $root "scripts\parse-pipeline-latency.mjs") 2>&1
    if ($LASTEXITCODE -eq 0 -and (Test-Path $latencySummaryPath)) {
      $latencySummaryGenerated = $true
      $files += Get-Item -Path $latencySummaryPath
    } else {
      Write-Host "Latency parser note: $parseResult" -ForegroundColor DarkGray
    }
  } catch {
    Write-Host "Latency parser skipped." -ForegroundColor DarkGray
  }
}
$files = @($files | Sort-Object FullName -Unique)

foreach ($file in $files) {
  Copy-Item -Path $file.FullName -Destination (Join-Path $bundleDir $file.Name) -Force
}

$manifest = [ordered]@{
  generatedAtLocal = (Get-Date).ToString("s")
  sourceRuntimeDir = if (Test-Path $runtimeDir) { $runtimeDir } else { $null }
  sourceLogPath = if (Test-Path $logPath) { $logPath } else { $null }
  bundleDir = $bundleDir
  runtimeReportCount = $runtimeJson.Count
  copiedFileCount = $files.Count
  logIncluded = (Test-Path $logPath)
  runtimeArtifactsOptional = $true
  latencySummaryGenerated = $latencySummaryGenerated
  files = @($files | ForEach-Object { $_.Name })
  provenanceNotes = @(
    "Runtime artifacts are copied only from a detected local Replyline workspace reports/runtime directory."
    "App log is included when available, even if no nearby repo runtime artifacts exist."
    "Bundle location may fall back to the installed app support-bundles directory outside the repo."
    "Pipeline latency summary is auto-generated from app_log pipeline_timing events when app.log is available."
  )
  benchmarkLabels = @{
    target = "intended design goal without local runtime artifact"
    measured = "supported by local runtime artifact in this bundle or reports/runtime"
    pending_verification = "path exists but proof is incomplete, noisy, stale, or missing"
  }
  honesty = @{
    proves = @(
      "local provider path worked",
      "local capture->transcript->card timing was recorded",
      "pipeline stage latency summary exists when parser succeeded"
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
if ($latencySummaryGenerated) {
  Write-Host "  (pipeline latency summary included)" -ForegroundColor Green
}
