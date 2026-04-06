param(
  [ValidateSet("teams", "meet", "zoom", "telemost", "browser", "manual-live-source")]
  [string]$SourceName = "manual-live-source",
  [ValidateSet("manual-wait", "external-command")]
  [string]$AudioMode = "manual-wait",
  [string]$AudioCommand = "",
  [int[]]$Durations = @(15, 30, 60),
  [string]$DurationsCsv = "",
  [ValidateRange(1, 10)]
  [int]$Repeats = 1
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$reportDir = Join-Path $root "reports\runtime"
New-Item -ItemType Directory -Force -Path $reportDir | Out-Null

if (-not [string]::IsNullOrWhiteSpace($DurationsCsv)) {
  $Durations = @(
    $DurationsCsv.Split(",") |
      ForEach-Object { $_.Trim() } |
      Where-Object { $_ -ne "" } |
      ForEach-Object { [int]$_ }
  )
}

$runResults = @()

function New-Stats([double[]]$values) {
  if (-not $values -or $values.Count -eq 0) {
    return [pscustomobject]@{
      mean = $null
      min = $null
      max = $null
      count = 0
    }
  }
  $measure = $values | Measure-Object -Average -Minimum -Maximum
  return [pscustomobject]@{
    mean = [math]::Round($measure.Average, 1)
    min = [math]::Round($measure.Minimum, 1)
    max = [math]::Round($measure.Maximum, 1)
    count = $values.Count
  }
}

foreach ($duration in $Durations) {
  for ($run = 1; $run -le $Repeats; $run++) {
    $scenarioName = "$SourceName-$duration" + "s-r$run"
    $reportName = "$scenarioName.json"

    Write-Host ""
    Write-Host "=== $scenarioName ===" -ForegroundColor Cyan
    Write-Host "Source: $SourceName"
    Write-Host "Mode: $AudioMode"

    $env:REPLYLINE_SCENARIO = $scenarioName
    $env:REPLYLINE_AUDIO_MODE = $AudioMode
    $env:REPLYLINE_AUDIO_SOURCE_LABEL = $SourceName
    $env:REPLYLINE_STT_MODE = "batch"
    $env:REPLYLINE_LLM_MODEL = "openai/gpt-4o-mini"
    $env:REPLYLINE_CAPTURE_MAX_SECONDS = [string]$duration
    $env:REPLYLINE_MANUAL_WAIT_MS = [string]($duration * 1000)
    $env:REPLYLINE_REPORT_FILE = $reportName

    if ($AudioMode -eq "external-command") {
      if ([string]::IsNullOrWhiteSpace($AudioCommand)) {
        throw "AudioCommand is required for external-command mode."
      }
      $env:REPLYLINE_AUDIO_COMMAND = $AudioCommand
    } else {
      Remove-Item Env:REPLYLINE_AUDIO_COMMAND -ErrorAction SilentlyContinue
      Write-Host "Prepare live source audio first, then press Enter to start capture."
      Read-Host | Out-Null
    }

    try {
      pnpm probe:runtime
      if ($LASTEXITCODE -ne 0) {
        throw "pnpm probe:runtime failed with exit code $LASTEXITCODE."
      }
      $reportPath = Join-Path $reportDir $reportName
      $report = Get-Content -Raw -Path $reportPath | ConvertFrom-Json
      $runResults += [pscustomobject]@{
        duration = $duration
        run = $run
        scenario = $report.scenario
        source = $SourceName
        audioMode = $AudioMode
        captureMaxSeconds = $report.captureMaxSeconds
        capturedAudioMs = $report.capturedAudioMs
        sttMs = $report.sttMs
        llmMs = $report.llmMs
        releaseToCardMs = $report.releaseToCardMs
        status = "ok"
        error = $null
      }
    } catch {
      $runResults += [pscustomobject]@{
        duration = $duration
        run = $run
        scenario = $scenarioName
        source = $SourceName
        audioMode = $AudioMode
        captureMaxSeconds = $duration
        capturedAudioMs = $null
        sttMs = $null
        llmMs = $null
        releaseToCardMs = $null
        status = "error"
        error = $_.Exception.Message
      }
      Write-Warning "Run failed: $($scenarioName) :: $($_.Exception.Message)"
    }
  }
}

$durationStats = @()
foreach ($duration in $Durations) {
  $rows = @($runResults | Where-Object { $_.duration -eq $duration -and $_.status -eq "ok" })
  $durationStats += [pscustomobject]@{
    duration = $duration
    releaseToCardMs = New-Stats @($rows | ForEach-Object { [double]$_.releaseToCardMs })
    sttMs = New-Stats @($rows | ForEach-Object { [double]$_.sttMs })
    llmMs = New-Stats @($rows | ForEach-Object { [double]$_.llmMs })
    capturedAudioMs = New-Stats @($rows | ForEach-Object { [double]$_.capturedAudioMs })
  }
}

$summaryPath = Join-Path $reportDir "$SourceName-live-comparison.json"
$summaryMdPath = Join-Path $reportDir "$SourceName-live-comparison.md"

$errorCount = @($runResults | Where-Object { $_.status -eq "error" }).Count
$summary = [ordered]@{
  generatedAtLocal = (Get-Date).ToString("s")
  lane = "runtime-live-source-bench"
  source = $SourceName
  audioMode = $AudioMode
  durations = $Durations
  repeats = $Repeats
  runCount = $runResults.Count
  errorCount = $errorCount
  claimLabel = "pending verification"
  claimNote = "Live-source results require operator setup and prove only this workstation/session."
  stats = $durationStats
  runs = $runResults
}

$summary | ConvertTo-Json -Depth 8 | Set-Content -Path $summaryPath -Encoding utf8

$md = @()
$md += "# Live-source comparison"
$md += ""
$md += "- source: $SourceName"
$md += "- audio mode: $AudioMode"
$md += "- repeats per duration: $Repeats"
$md += "- claim label: pending verification"
$md += "- note: operator-provided live session required; no cross-platform guarantee."
$md += ""
$md += "## Stats (mean / min / max ms)"
$md += ""
$md += "| duration s | release->card | stt | llm | captured audio | runs |"
$md += "|---:|---:|---:|---:|---:|---:|"
foreach ($item in $durationStats) {
  $md += "| $($item.duration) | $($item.releaseToCardMs.mean) / $($item.releaseToCardMs.min) / $($item.releaseToCardMs.max) | $($item.sttMs.mean) / $($item.sttMs.min) / $($item.sttMs.max) | $($item.llmMs.mean) / $($item.llmMs.min) / $($item.llmMs.max) | $($item.capturedAudioMs.mean) / $($item.capturedAudioMs.min) / $($item.capturedAudioMs.max) | $($item.releaseToCardMs.count) |"
}
$md += ""
$md += "## Raw runs"
$md += ""
$md += "| scenario | source | mode | duration s | run | release->card ms | stt ms | llm ms | status | error |"
$md += "|---|---|---|---:|---:|---:|---:|---:|---|---|"
foreach ($item in $runResults) {
  $errorText = (($item.error ?? "") -replace '\|', '/' -replace "`r?`n", " ").Trim()
  $md += "| $($item.scenario) | $($item.source) | $($item.audioMode) | $($item.duration) | $($item.run) | $($item.releaseToCardMs) | $($item.sttMs) | $($item.llmMs) | $($item.status) | $errorText |"
}

$md -join "`n" | Set-Content -Path $summaryMdPath -Encoding utf8

Write-Host ""
Write-Host "Saved:" -ForegroundColor Green
Write-Host "  $summaryPath"
Write-Host "  $summaryMdPath"
