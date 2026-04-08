param(
  [switch]$IncludeNano,
  [ValidateRange(1, 10)]
  [int]$Repeats = 1
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$reportDir = Join-Path $root "reports\runtime"
New-Item -ItemType Directory -Force -Path $reportDir | Out-Null

$shortText = "Есть риск сдвига на два дня. Если сегодня согласуем приоритеты, срок удержим."
$longText = "У нас есть риск сдвига на два дня. Если сегодня согласуем приоритеты, срок удержим. Нужно быстро определить, что критично в первую очередь."

$scenarios = @(
  @{
    Name = "baseline-batch-gpt4o-mini-long"
    SttMode = "batch"
    Model = "openai/gpt-4o-mini"
    CaptureCap = 30
    Text = $longText
    Report = "baseline-batch-gpt4o-mini-long.json"
  },
  @{
    Name = "short-batch-gpt4o-mini"
    SttMode = "batch"
    Model = "openai/gpt-4o-mini"
    CaptureCap = 30
    Text = $shortText
    Report = "short-batch-gpt4o-mini.json"
  },
  @{
    Name = "short-streaming-gpt4o-mini"
    SttMode = "streaming"
    Model = "openai/gpt-4o-mini"
    CaptureCap = 30
    Text = $shortText
    Report = "short-streaming-gpt4o-mini.json"
  },
  @{
    Name = "short-batch-claude-haiku-4.5"
    SttMode = "batch"
    Model = "anthropic/claude-haiku-4.5"
    CaptureCap = 30
    Text = $shortText
    Report = "short-batch-claude-haiku-4.5.json"
  },
  @{
    Name = "short-streaming-claude-haiku-4.5"
    SttMode = "streaming"
    Model = "anthropic/claude-haiku-4.5"
    CaptureCap = 30
    Text = $shortText
    Report = "short-streaming-claude-haiku-4.5.json"
  }
)

if ($IncludeNano) {
  $scenarios += @{
    Name = "short-streaming-gpt-5.4-nano"
    SttMode = "streaming"
    Model = "openai/gpt-5.4-nano"
    CaptureCap = 30
    Text = $shortText
    Report = "short-streaming-gpt-5.4-nano.json"
  }
}

$results = @()
$scenarioStats = @()

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

foreach ($scenario in $scenarios) {
  $perScenario = @()
  for ($run = 1; $run -le $Repeats; $run++) {
    $scenarioName = if ($Repeats -gt 1) { "$($scenario.Name)-r$run" } else { $scenario.Name }
    $reportName = if ($Repeats -gt 1) {
      $base = [System.IO.Path]::GetFileNameWithoutExtension($scenario.Report)
      "$base-r$run.json"
    } else {
      $scenario.Report
    }

    Write-Host ""
    Write-Host "=== $scenarioName ===" -ForegroundColor Cyan
    $env:REPLYLINE_SCENARIO = $scenarioName
    $env:REPLYLINE_STT_MODE = $scenario.SttMode
    $env:REPLYLINE_LLM_MODEL = $scenario.Model
    $env:REPLYLINE_PROBE_TEXT = $scenario.Text
    $env:REPLYLINE_REPORT_FILE = $reportName
    $env:REPLYLINE_CAPTURE_MAX_SECONDS = [string]$scenario.CaptureCap

    try {
      $probeOutput = @(& pnpm probe:runtime 2>&1)
      if ($LASTEXITCODE -ne 0) {
        $failureMessage = Get-ProbeFailureMessage -OutputLines $probeOutput -FallbackMessage "pnpm probe:runtime failed with exit code $LASTEXITCODE."
        throw $failureMessage
      }
      $reportPath = Join-Path $reportDir $reportName
      $report = Get-Content -Raw -Path $reportPath | ConvertFrom-Json
      $results += $report
      $perScenario += $report
    } catch {
      $results += [pscustomobject]@{
        scenario = $scenarioName
        captureMaxSeconds = $scenario.CaptureCap
        sttMode = $scenario.SttMode
        llmModel = $scenario.Model
        capturedAudioMs = $null
        sttMs = $null
        llmMs = $null
        releaseToCardMs = $null
        status = "error"
        transcript = "ERROR: $($_.Exception.Message)"
      }
    }
  }
  $scenarioStats += [pscustomobject]@{
    scenario = $scenario.Name
    sttMode = $scenario.SttMode
    llmModel = $scenario.Model
    releaseToCardMs = New-Stats @($perScenario | ForEach-Object { [double]$_.releaseToCardMs })
    sttMs = New-Stats @($perScenario | ForEach-Object { [double]$_.sttMs })
    llmMs = New-Stats @($perScenario | ForEach-Object { [double]$_.llmMs })
  }
}

$summaryPath = Join-Path $reportDir "latency-comparison.json"
$summaryMdPath = Join-Path $reportDir "latency-comparison.md"

$errorCount = @($results | Where-Object { ($_.transcript ?? "") -like "ERROR:*" }).Count
$hasSuccessfulRuns = @($results | Where-Object { $_.releaseToCardMs -ne $null }).Count -gt 0
$canMarkMeasured = ($Repeats -ge 2) -and $hasSuccessfulRuns -and ($errorCount -eq 0)

$summary = [ordered]@{
  generatedAtLocal = (Get-Date).ToString("s")
  lane = "runtime-bench"
  repeats = $Repeats
  claimLabel = if ($canMarkMeasured) { "measured" } else { "pending verification" }
  claimNote = if ($canMarkMeasured) {
    "Repeated local benchmark runs without script-level errors. Still workstation-scoped."
  } elseif ($Repeats -ge 2) {
    "Repeated runs exist, but errors/noisy output prevent measured status."
  } else {
    "Single run per scenario."
  }
  errorCount = $errorCount
  stats = $scenarioStats
  runs = $results
}

$summary | ConvertTo-Json -Depth 8 | Set-Content -Path $summaryPath -Encoding utf8

$md = @()
$md += "# Runtime benchmark comparison"
$md += ""
$md += "- repeats per scenario: $Repeats"
$md += "- claim label: $($summary.claimLabel)"
$md += ""
$md += "## Stats (mean / min / max ms)"
$md += ""
$md += "| scenario | stt mode | llm model | release->card | stt | llm | runs |"
$md += "|---|---|---|---:|---:|---:|---:|"
foreach ($item in $scenarioStats) {
  $md += "| $($item.scenario) | $($item.sttMode) | $($item.llmModel) | $($item.releaseToCardMs.mean) / $($item.releaseToCardMs.min) / $($item.releaseToCardMs.max) | $($item.sttMs.mean) / $($item.sttMs.min) / $($item.sttMs.max) | $($item.llmMs.mean) / $($item.llmMs.min) / $($item.llmMs.max) | $($item.releaseToCardMs.count) |"
}
$md += ""
$md += "## Raw runs"
$md += ""
$md += "| scenario | cap s | stt mode | llm model | audio ms | stt ms | llm ms | release->card ms | transcript |"
$md += "|---|---:|---|---|---:|---:|---:|---:|---|"
foreach ($item in $results) {
  $transcript = (($item.transcript ?? "") -replace '\|', '/' -replace "`r?`n", " ").Trim()
  $md += "| $($item.scenario) | $($item.captureMaxSeconds) | $($item.sttMode) | $($item.llmModel) | $($item.capturedAudioMs) | $($item.sttMs) | $($item.llmMs) | $($item.releaseToCardMs) | $transcript |"
}
$md -join "`n" | Set-Content -Path $summaryMdPath -Encoding utf8

Write-Host ""
Write-Host "Saved:" -ForegroundColor Green
Write-Host "  $summaryPath"
Write-Host "  $summaryMdPath"
