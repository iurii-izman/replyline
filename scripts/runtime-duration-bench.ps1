param(
  [int[]]$Durations = @(5, 15, 30, 60),
  [string]$DurationsCsv = "",
  [ValidateRange(1, 10)]
  [int]$Repeats = 1,
  [switch]$Include120,
  [switch]$Include180
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$reportDir = Join-Path $root "reports\runtime"
New-Item -ItemType Directory -Force -Path $reportDir | Out-Null

function Join-Text([int]$repeat) {
  $parts = @()
  for ($i = 0; $i -lt $repeat; $i++) {
    $parts += "Есть риск сдвига на два дня. Если сегодня согласуем приоритеты, срок удержим."
  }
  return ($parts -join " ")
}

function Get-ProbeTextForDuration([int]$duration) {
  if ($duration -le 5) {
    return "Есть риск сдвига на два дня."
  }
  if ($duration -le 15) {
    return Join-Text 1
  }
  if ($duration -le 30) {
    return Join-Text 3
  }
  if ($duration -le 60) {
    return Join-Text 6
  }
  if ($duration -le 120) {
    return Join-Text 12
  }
  return Join-Text 18
}

if ($Include120) {
  $Durations += 120
}

if ($Include180) {
  $Durations += 180
}

if (-not [string]::IsNullOrWhiteSpace($DurationsCsv)) {
  $Durations = @(
    $DurationsCsv.Split(",") |
      ForEach-Object { $_.Trim() } |
      Where-Object { $_ -ne "" } |
      ForEach-Object { [int]$_ }
  )
}

$Durations = @($Durations | Sort-Object -Unique)
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

function Get-ProbeFailureMessage([object[]]$OutputLines, [string]$FallbackMessage) {
  $lines = @(
    $OutputLines |
      ForEach-Object { "$_".Trim() } |
      Where-Object { $_ -ne "" }
  )

  if ($lines.Count -eq 0) {
    return $FallbackMessage
  }

  $preferred = @(
    $lines | Where-Object {
      $_ -match 'Deepgram .*empty transcript' -or
      $_ -match 'Card output invalid:' -or
      $_ -match 'analysis_failed' -or
      $_ -match 'Analysis failed:' -or
      $_ -match 'User-safe error:' -or
      $_ -match 'pipeline error' -or
      $_ -match 'error'
    }
  )

  if ($preferred.Count -gt 0) {
    return $preferred[-1]
  }

  $tail = @($lines | Select-Object -Last 3) -join " "
  return "$FallbackMessage Output tail: $tail"
}

foreach ($duration in $Durations) {
  for ($run = 1; $run -le $Repeats; $run++) {
    $scenarioName = "duration-${duration}s-r$run"
    $reportName = "$scenarioName.json"

    Write-Host ""
    Write-Host "=== $scenarioName ===" -ForegroundColor Cyan
    $env:REPLYLINE_SCENARIO = $scenarioName
    $env:REPLYLINE_STT_MODE = "batch"
    $env:REPLYLINE_LLM_MODEL = "openai/gpt-4o-mini"
    $env:REPLYLINE_PROBE_TEXT = Get-ProbeTextForDuration $duration
    $env:REPLYLINE_REPORT_FILE = $reportName
    $env:REPLYLINE_CAPTURE_MAX_SECONDS = [string]$duration

    try {
      $probeOutput = @(& pnpm probe:runtime 2>&1)
      if ($LASTEXITCODE -ne 0) {
        $failureMessage = Get-ProbeFailureMessage -OutputLines $probeOutput -FallbackMessage "pnpm probe:runtime failed with exit code $LASTEXITCODE."
        throw $failureMessage
      }

      $reportPath = Join-Path $reportDir $reportName
      $report = Get-Content -Raw -Path $reportPath | ConvertFrom-Json
      $runResults += [pscustomobject]@{
        duration = $duration
        run = $run
        scenario = $report.scenario
        captureMaxSeconds = $report.captureMaxSeconds
        capturedAudioMs = $report.capturedAudioMs
        sttMs = $report.sttMs
        llmMs = $report.llmMs
        releaseToCardMs = $report.releaseToCardMs
        error = $null
        status = "ok"
      }
    } catch {
      $runResults += [pscustomobject]@{
        duration = $duration
        run = $run
        scenario = $scenarioName
        captureMaxSeconds = $duration
        capturedAudioMs = $null
        sttMs = $null
        llmMs = $null
        releaseToCardMs = $null
        error = $_.Exception.Message
        status = "error"
      }
    }
  }
}

$summaryPath = Join-Path $reportDir "duration-comparison.json"
$summaryMdPath = Join-Path $reportDir "duration-comparison.md"

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

$errorCount = @($runResults | Where-Object { $_.status -eq "error" }).Count

$summary = [ordered]@{
  generatedAtLocal = (Get-Date).ToString("s")
  lane = "runtime-duration-bench"
  sttMode = "batch"
  llmModel = "openai/gpt-4o-mini"
  repeats = $Repeats
  durations = $Durations
  runCount = $runResults.Count
  errorCount = $errorCount
  stats = $durationStats
  runs = $runResults
  claimLabel = if (($Repeats -ge 2) -and ($runResults.Count -gt 0) -and ($errorCount -eq 0)) { "measured" } else { "pending verification" }
  claimNote = if (($Repeats -ge 2) -and ($errorCount -eq 0)) {
    "Repeated local runs available without script-level errors. Still workstation-scoped."
  } elseif ($Repeats -ge 2) {
    "Repeated runs exist, but errors/noisy output prevent measured status."
  } else {
    "Single-run data only. Repeat runs recommended before strong claims."
  }
}

$summary | ConvertTo-Json -Depth 8 | Set-Content -Path $summaryPath -Encoding utf8

$md = @()
$md += "# Duration comparison"
$md += ""
$md += "- stt mode: batch"
$md += "- llm model: openai/gpt-4o-mini"
$md += "- repeats per duration: $Repeats"
$md += "- claim label: $($summary.claimLabel)"
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
$md += "| scenario | duration s | run | captured audio ms | stt ms | llm ms | release->card ms | status | error |"
$md += "|---|---:|---:|---:|---:|---:|---:|---|---|"
foreach ($item in $runResults) {
  $errorText = (($item.error ?? "") -replace '\|', '/' -replace "`r?`n", " ").Trim()
  $md += "| $($item.scenario) | $($item.duration) | $($item.run) | $($item.capturedAudioMs) | $($item.sttMs) | $($item.llmMs) | $($item.releaseToCardMs) | $($item.status) | $errorText |"
}
$md -join "`n" | Set-Content -Path $summaryMdPath -Encoding utf8

Write-Host ""
Write-Host "Saved:" -ForegroundColor Green
Write-Host "  $summaryPath"
Write-Host "  $summaryMdPath"
