param(
  [string]$DurationsMinutesCsv = "30,60,120",
  [int]$ProbeEverySeconds = 90,
  [ValidateRange(1, 20)]
  [int]$RetryPerProbe = 2
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$runtimeDir = Join-Path $root "reports\runtime"
New-Item -ItemType Directory -Force -Path $runtimeDir | Out-Null

$durations = @(
  $DurationsMinutesCsv.Split(",") |
    ForEach-Object { $_.Trim() } |
    Where-Object { $_ -ne "" } |
    ForEach-Object { [int]$_ }
)

$allRuns = @()
$soaks = @()

function Classify-Failure([string]$m) {
  $s = ($m ?? "").ToLowerInvariant()
  if ($s -match "timeout|timed out") { return "timeout" }
  if ($s -match "connect|dns|network") { return "network" }
  if ($s -match "stt") { return "stt" }
  if ($s -match "llm") { return "llm" }
  if ($s -match "card output invalid") { return "card_invalid" }
  return "other"
}

foreach ($minutes in $durations) {
  $scenarioName = "soak-${minutes}m"
  $iterations = [Math]::Max(1, [Math]::Ceiling(($minutes * 60) / $ProbeEverySeconds))
  Write-Host "`n=== $scenarioName ($iterations probes) ===" -ForegroundColor Cyan
  $runRows = @()
  for ($i = 1; $i -le $iterations; $i++) {
    $attempt = 0
    $done = $false
    $lastError = ""
    while (-not $done -and $attempt -le $RetryPerProbe) {
      $attempt += 1
      $reportName = "${scenarioName}-i${i}-a${attempt}.json"
      $env:REPLYLINE_SCENARIO = "${scenarioName}-i${i}"
      $env:REPLYLINE_REPORT_FILE = $reportName
      $env:REPLYLINE_CAPTURE_MAX_SECONDS = "30"
      $start = Get-Date
      $out = @(& pnpm probe:runtime 2>&1)
      $elapsedMs = [int]((Get-Date) - $start).TotalMilliseconds
      if ($LASTEXITCODE -eq 0) {
        $reportPath = Join-Path $runtimeDir $reportName
        $report = Get-Content -Raw -Path $reportPath | ConvertFrom-Json
        $row = [pscustomobject]@{
          durationMinutes = $minutes
          probe = $i
          attempt = $attempt
          success = $true
          retryUsed = ($attempt - 1)
          failClass = $null
          message = $null
          releaseToCardMs = $report.releaseToCardMs
          sttMs = $report.sttMs
          llmMs = $report.llmMs
          probeElapsedMs = $elapsedMs
        }
        $runRows += $row
        $allRuns += $row
        $done = $true
      } else {
        $lastError = ($out | Select-Object -Last 3) -join " "
        if ($attempt -gt $RetryPerProbe) {
          $row = [pscustomobject]@{
            durationMinutes = $minutes
            probe = $i
            attempt = $attempt
            success = $false
            retryUsed = ($attempt - 1)
            failClass = (Classify-Failure $lastError)
            message = $lastError
            releaseToCardMs = $null
            sttMs = $null
            llmMs = $null
            probeElapsedMs = $elapsedMs
          }
          $runRows += $row
          $allRuns += $row
          $done = $true
        } else {
          Start-Sleep -Seconds 3
        }
      }
    }
    if ($i -lt $iterations) {
      Start-Sleep -Seconds $ProbeEverySeconds
    }
  }

  $okRows = @($runRows | Where-Object { $_.success })
  $first = $okRows | Select-Object -First 1
  $last = $okRows | Select-Object -Last 1
  $latencyDrift = if ($first -and $last) { [int]($last.releaseToCardMs - $first.releaseToCardMs) } else { $null }
  $totalRetries = ($runRows | Measure-Object -Property retryUsed -Sum).Sum

  $soaks += [pscustomobject]@{
    durationMinutes = $minutes
    probeCount = $runRows.Count
    successCount = $okRows.Count
    successRate = if ($runRows.Count -gt 0) { [math]::Round(($okRows.Count / $runRows.Count) * 100, 2) } else { 0 }
    retryCount = [int]$totalRetries
    retryRate = if ($runRows.Count -gt 0) { [math]::Round(($totalRetries / $runRows.Count) * 100, 2) } else { 0 }
    failClasses = @($runRows | Where-Object { -not $_.success } | Group-Object failClass | ForEach-Object { [pscustomobject]@{ class = $_.Name; count = $_.Count } })
    latencyDriftMs = $latencyDrift
  }
}

$summary = [ordered]@{
  generatedAtLocal = (Get-Date).ToString("s")
  lane = "runtime-soak"
  durationsMinutes = $durations
  probeEverySeconds = $ProbeEverySeconds
  retryPerProbe = $RetryPerProbe
  scenarios = $soaks
  runs = $allRuns
}

$jsonPath = Join-Path $runtimeDir "soak-summary.json"
$mdPath = Join-Path $runtimeDir "soak-summary.md"
$summary | ConvertTo-Json -Depth 8 | Set-Content -Path $jsonPath -Encoding utf8

$md = @()
$md += "# Runtime soak summary"
$md += ""
$md += "| duration min | probes | success rate % | retry rate % | latency drift ms |"
$md += "|---:|---:|---:|---:|---:|"
foreach ($item in $soaks) {
  $md += "| $($item.durationMinutes) | $($item.probeCount) | $($item.successRate) | $($item.retryRate) | $($item.latencyDriftMs) |"
}
$md -join "`n" | Set-Content -Path $mdPath -Encoding utf8

Write-Host "Saved:" -ForegroundColor Green
Write-Host "  $jsonPath"
Write-Host "  $mdPath"
