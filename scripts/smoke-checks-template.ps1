param(
  [string]$OutputDir = ""
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$reportsDir = Join-Path $root "reports"
New-Item -ItemType Directory -Force -Path $reportsDir | Out-Null

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$generatedAt = (Get-Date).ToString("s")
$resolvedOutputDir = if ([string]::IsNullOrWhiteSpace($OutputDir)) { $reportsDir } else { $OutputDir }
New-Item -ItemType Directory -Force -Path $resolvedOutputDir | Out-Null
$outputPath = Join-Path $resolvedOutputDir "smoke-checks-$timestamp.md"

function Try-GetGitRevision {
  try {
    $rev = (& git -C $root rev-parse --short HEAD 2>$null)
    if ($LASTEXITCODE -eq 0 -and -not [string]::IsNullOrWhiteSpace($rev)) {
      return $rev.Trim()
    }
  } catch {}
  return "unavailable"
}

function Get-LatestEvidenceBundle {
  $candidates = Get-ChildItem -Path $reportsDir -Directory -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -like "runtime-evidence-*" } |
    Sort-Object LastWriteTimeUtc -Descending
  return $candidates | Select-Object -First 1
}

function Get-LatestRuntimeReport {
  $runtimeDir = Join-Path $reportsDir "runtime"
  if (-not (Test-Path $runtimeDir)) {
    return $null
  }
  $files = Get-ChildItem -Path $runtimeDir -File -ErrorAction SilentlyContinue |
    Where-Object { $_.Extension -in @(".json", ".md", ".txt") } |
    Sort-Object LastWriteTimeUtc -Descending
  return $files | Select-Object -First 1
}

function Get-RelativePathForMarkdown {
  param(
    [string]$BasePath,
    [string]$TargetPath
  )

  $base = [System.IO.Path]::GetFullPath($BasePath)
  if (-not $base.EndsWith([System.IO.Path]::DirectorySeparatorChar)) {
    $base = $base + [System.IO.Path]::DirectorySeparatorChar
  }
  $target = [System.IO.Path]::GetFullPath($TargetPath)
  $relative = [System.Uri]::new($base).MakeRelativeUri([System.Uri]::new($target)).ToString()
  return $relative.Replace("%20", " ")
}

$pkgPath = Join-Path $root "package.json"
$appVersion = "unknown"
if (Test-Path $pkgPath) {
  try {
    $pkg = Get-Content -Raw -Path $pkgPath | ConvertFrom-Json
    if ($pkg.version) {
      $appVersion = [string]$pkg.version
    }
  } catch {}
}

$gitRevision = Try-GetGitRevision
$latestBundle = Get-LatestEvidenceBundle
$latestRuntimeReport = Get-LatestRuntimeReport

$lines = @()
$lines += "# Replyline manual smoke artifact"
$lines += ""
$lines += "- generatedAtLocal: $generatedAt"
$lines += "- gitRevision: $gitRevision"
$lines += "- appVersion: $appVersion"
$lines += "- type: manual-smoke-checklist"
$lines += ""
$lines += "> This file is a manual smoke artifact stub. Keep it short, edit in place, and commit/share only when useful for release discussion."
$lines += ""
$lines += "## Status key"
$lines += ""
$lines += "- [ ] not run"
$lines += "- [x] pass"
$lines += "- [!] fail"
$lines += ""
$lines += "## Checklist"
$lines += ""
$lines += "- [ ] App launch (main window opens, shell starts)"
$lines += "- [ ] Tray behavior (icon + menu actions work)"
$lines += "- [ ] Hotkey capture (press/hold/release flow triggers)"
$lines += "- [ ] Result card render (`gist / say_now / next_move` shown)"
$lines += "- [ ] Settings save (persist across restart)"
$lines += "- [ ] Secrets/settings separation sanity (`settings.json` contains no secret values)"
$lines += "- [ ] Clear context (context reset via UI/tray action)"
$lines += "- [ ] Runtime probe lane (`pnpm probe:runtime` ran and produced artifact)"
$lines += "- [ ] Optional live-source check (run only if applicable)"
$lines += ""
$lines += "## Notes"
$lines += ""
$lines += "- operator:"
$lines += "- workstation:"
$lines += "- blockers:"
$lines += "- follow-ups:"
$lines += ""
$lines += "## Runtime evidence references"
$lines += ""
if ($latestBundle) {
  $relativeBundle = Get-RelativePathForMarkdown -BasePath $root -TargetPath $latestBundle.FullName
  $lines += ('- latest bundle: `{0}`' -f $relativeBundle)
} else {
  $lines += '- latest bundle: absent (`reports/runtime-evidence-*` not found)'
}

if ($latestRuntimeReport) {
  $relativeReport = Get-RelativePathForMarkdown -BasePath $root -TargetPath $latestRuntimeReport.FullName
  $lines += ('- latest runtime artifact: `{0}`' -f $relativeReport)
} else {
  $lines += '- latest runtime artifact: absent (`reports/runtime` missing or empty)'
}

$lines -join "`n" | Set-Content -Path $outputPath -Encoding utf8

Write-Host "Manual smoke artifact template created:" -ForegroundColor Green
Write-Host "  $outputPath"
