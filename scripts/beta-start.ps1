[CmdletBinding()]
param(
  [switch]$Strict,
  [switch]$SkipDoctor,
  [switch]$ReportOnFail,
  [switch]$NoLaunch,
  [switch]$Force
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$rootDir = Split-Path -Parent $scriptDir
$pnpmCommand = $null

function Write-Heading {
  param([string]$Text)

  Write-Host ""
  Write-Host "== $Text ==" -ForegroundColor Cyan
}

function Get-CommandPath {
  param([string]$Name)

  $command = Get-Command $Name -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($null -eq $command) {
    return $null
  }
  return $command.Source
}

function Invoke-CapturedCommand {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Command,
    [Parameter(Mandatory = $true)]
    [string[]]$Arguments
  )

  $stdoutFile = New-TemporaryFile
  $stderrFile = New-TemporaryFile
  try {
    & $Command @Arguments 1> $stdoutFile.FullName 2> $stderrFile.FullName
    $exitCode = $LASTEXITCODE
    return [pscustomobject]@{
      ExitCode = if ($null -eq $exitCode) { 0 } else { $exitCode }
      Stdout = Get-Content -LiteralPath $stdoutFile.FullName -Raw
      Stderr = Get-Content -LiteralPath $stderrFile.FullName -Raw
    }
  } finally {
    Remove-Item -LiteralPath $stdoutFile.FullName, $stderrFile.FullName -Force -ErrorAction SilentlyContinue
  }
}

function Invoke-SmokeReport {
  Write-Host ""
  if (-not $ReportOnFail) {
    Write-Host "Suggested diagnostic report: pnpm beta:smoke-report" -ForegroundColor Yellow
    Write-Host "Add -ReportOnFail to generate it automatically after a blocked start."
    return
  }

  Write-Host "Generating sanitized smoke report..." -ForegroundColor Yellow
  & $pnpmCommand "beta:smoke-report"
  $reportExitCode = $LASTEXITCODE
  if ($reportExitCode -eq 0) {
    Write-Host "Sanitized smoke report generated." -ForegroundColor Green
  } else {
    Write-Host "Smoke report command exited with code $reportExitCode. Review its output above." -ForegroundColor Yellow
  }
}

function Write-DoctorIssues {
  param(
    [object[]]$Checks,
    [Parameter(Mandatory = $true)]
    [string]$Status
  )

  $matching = @($Checks | Where-Object { $_.status -eq $Status })
  if ($matching.Count -eq 0) {
    return
  }

  $label = if ($Status -eq "FAIL") { "Blocking issues" } else { "Warnings" }
  Write-Host ""
  Write-Host "${label}:" -ForegroundColor $(if ($Status -eq "FAIL") { "Red" } else { "Yellow" })
  foreach ($check in $matching) {
    Write-Host "- $($check.check): $($check.evidence)"
    if (-not [string]::IsNullOrWhiteSpace([string]$check.nextAction)) {
      Write-Host "  Next: $($check.nextAction)"
    }
  }
}

function Stop-BetaStart {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Message,
    [switch]$OfferReport
  )

  Write-Host $Message -ForegroundColor Red
  if ($OfferReport) {
    Invoke-SmokeReport
  }
  exit 1
}

Push-Location $rootDir
try {
  Write-Host "# Replyline beta start"

  $nodeCommand = Get-CommandPath "node"
  $pnpmCommand = Get-CommandPath "pnpm"
  if (-not $nodeCommand) {
    Stop-BetaStart "BLOCKED: Node.js was not found in PATH. Install Node.js LTS, then rerun pnpm beta:start."
  }
  if (-not $pnpmCommand) {
    Stop-BetaStart "BLOCKED: pnpm was not found in PATH. Enable Corepack or install pnpm@9.15.9, then rerun beta:start."
  }

  $doctorReport = $null
  $gateBlocked = $false

  if ($SkipDoctor) {
    Write-Heading "Readiness summary"
    Write-Host "Verdict: doctor_skipped" -ForegroundColor Yellow
    Write-Host "The lightweight doctor was skipped by request."
  } else {
    Write-Heading "Lightweight doctor"
    $doctorRun = Invoke-CapturedCommand -Command $pnpmCommand -Arguments @("beta:doctor", "--", "--json")
    $jsonStart = $doctorRun.Stdout.IndexOf("{", [System.StringComparison]::Ordinal)
    if ($jsonStart -lt 0) {
      if (-not [string]::IsNullOrWhiteSpace($doctorRun.Stderr)) {
        Write-Host $doctorRun.Stderr.Trim() -ForegroundColor Yellow
      }
      Stop-BetaStart "BLOCKED: beta:doctor did not return a readable readiness report." -OfferReport
    }

    try {
      $doctorReport = $doctorRun.Stdout.Substring($jsonStart) | ConvertFrom-Json
    } catch {
      Stop-BetaStart "BLOCKED: beta:doctor returned invalid JSON. Run pnpm beta:doctor directly for details." -OfferReport
    }

    $summary = $doctorReport.summary
    Write-Heading "Readiness summary"
    Write-Host "Verdict: $($doctorReport.verdict)"
    Write-Host "Pass: $($summary.pass)  Warn: $($summary.warn)  Fail: $($summary.fail)"
    Write-DoctorIssues -Checks @($doctorReport.checks) -Status "FAIL"
    Write-DoctorIssues -Checks @($doctorReport.checks) -Status "WARN"

    if ($doctorReport.verdict -eq "blocked") {
      $gateBlocked = $true
      Write-Host ""
      Write-Host "Launch is blocked by the doctor result." -ForegroundColor Red
    } elseif ($doctorReport.verdict -eq "ready_with_warnings" -and $Strict) {
      $gateBlocked = $true
      Write-Host ""
      Write-Host "Strict mode treats readiness warnings as blocking." -ForegroundColor Red
    } elseif ($doctorReport.verdict -notin @("ready", "ready_with_warnings")) {
      $gateBlocked = $true
      Write-Host ""
      Write-Host "Launch is blocked because the doctor verdict is unknown." -ForegroundColor Red
    }
  }

  if ($gateBlocked -and -not $Force) {
    Invoke-SmokeReport
    exit 1
  }
  if ($gateBlocked -and $Force) {
    Write-Host "Force enabled: continuing despite the doctor gate." -ForegroundColor Yellow
  }

  if ($NoLaunch) {
    Write-Heading "Launch"
    Write-Host "Launch skipped (-NoLaunch)."
    exit 0
  }

  Write-Heading "Launch preflight"
  $cargoCommand = Get-CommandPath "cargo"
  if (-not $cargoCommand) {
    Stop-BetaStart "BLOCKED: cargo was not found in PATH. Install Rust via rustup, then rerun pnpm beta:start." -OfferReport
  }

  $tauriCheck = Invoke-CapturedCommand -Command $pnpmCommand -Arguments @("exec", "tauri", "--version")
  if ($tauriCheck.ExitCode -ne 0) {
    Stop-BetaStart "BLOCKED: the local Tauri CLI is unavailable. Run pnpm install --frozen-lockfile, then rerun pnpm beta:start." -OfferReport
  }

  Write-Host "Tauri CLI: $($tauriCheck.Stdout.Trim())"
  Write-Host "Command: pnpm tauri dev"
  Write-Heading "Application"
  & $pnpmCommand "tauri" "dev"
  $launchExitCode = $LASTEXITCODE
  if ($launchExitCode -ne 0) {
    Write-Host "Application launch failed with exit code $launchExitCode." -ForegroundColor Red
    Write-Host "Review the Tauri/dev-server output above. Common causes include a dev server startup error, Tauri CLI failure, missing WebView2, or an incomplete Rust/MSVC setup."
    Invoke-SmokeReport
    exit $launchExitCode
  }

  Write-Host "Replyline exited normally." -ForegroundColor Green
  exit 0
} finally {
  Pop-Location
}
