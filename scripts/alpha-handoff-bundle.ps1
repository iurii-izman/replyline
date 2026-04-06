param()

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$reportsDir = Join-Path $root "reports"
New-Item -ItemType Directory -Force -Path $reportsDir | Out-Null

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$bundleDir = Join-Path $reportsDir "alpha-handoff-$timestamp"
New-Item -ItemType Directory -Force -Path $bundleDir | Out-Null

function Get-LatestDirectory {
  param(
    [string]$Path,
    [string]$Pattern
  )
  if (-not (Test-Path $Path)) { return $null }
  return Get-ChildItem -Path $Path -Directory -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -like $Pattern } |
    Sort-Object LastWriteTimeUtc -Descending |
    Select-Object -First 1
}

function Get-LatestFile {
  param(
    [string]$Path,
    [string]$Pattern
  )
  if (-not (Test-Path $Path)) { return $null }
  return Get-ChildItem -Path $Path -File -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -like $Pattern } |
    Sort-Object LastWriteTimeUtc -Descending |
    Select-Object -First 1
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

$notes = New-Object System.Collections.Generic.List[string]
$artifacts = [ordered]@{}

# Runtime evidence bundle is core for this handoff.
& pwsh -File (Join-Path $PSScriptRoot "runtime-evidence-bundle.ps1") | Out-Null
$latestRuntimeBundle = Get-LatestDirectory -Path $reportsDir -Pattern "runtime-evidence-*"
if (-not $latestRuntimeBundle) {
  throw "Core runtime evidence bundle is missing. Run pnpm probe:runtime first, then retry."
}
$runtimeDest = Join-Path $bundleDir "runtime-evidence"
Copy-Item -Path $latestRuntimeBundle.FullName -Destination $runtimeDest -Recurse -Force
$artifacts.runtimeEvidenceBundle = Get-RelativePathForMarkdown -BasePath $root -TargetPath $runtimeDest

# Manual smoke template into same bundle folder.
& pwsh -File (Join-Path $PSScriptRoot "smoke-checks-template.ps1") -OutputDir $bundleDir | Out-Null
$smokeFile = Get-LatestFile -Path $bundleDir -Pattern "smoke-checks-*.md"
if ($smokeFile) {
  $artifacts.manualSmokeTemplate = Get-RelativePathForMarkdown -BasePath $root -TargetPath $smokeFile.FullName
} else {
  $notes.Add("manual smoke template was expected but was not found")
}

# Benchmark scaffold is optional in this bundle.
try {
  & pwsh -File (Join-Path $PSScriptRoot "benchmark-evidence-scaffold.ps1") -OutputDir $bundleDir -Note "alpha-handoff bundle" | Out-Null
  $benchJson = Get-LatestFile -Path $bundleDir -Pattern "benchmark-evidence-*.json"
  $benchMd = Get-LatestFile -Path $bundleDir -Pattern "benchmark-evidence-*.md"
  if ($benchJson) {
    $artifacts.benchmarkEvidenceJson = Get-RelativePathForMarkdown -BasePath $root -TargetPath $benchJson.FullName
  }
  if ($benchMd) {
    $artifacts.benchmarkEvidenceMarkdown = Get-RelativePathForMarkdown -BasePath $root -TargetPath $benchMd.FullName
  }
  if (-not $benchJson -and -not $benchMd) {
    $notes.Add("benchmark scaffold step ran but no benchmark artifact was produced")
  }
} catch {
  $notes.Add("benchmark scaffold unavailable: $($_.Exception.Message)")
}

$manifest = [ordered]@{
  generatedAtLocal = (Get-Date).ToString("s")
  lane = "alpha-handoff"
  bundleDir = $bundleDir
  includes = $artifacts
  notes = @($notes)
  honesty = @{
    proves = @(
      "local machine handoff package exists with runtime evidence and a manual smoke artifact stub"
    )
    does_not_prove = @(
      "cross-machine or cross-platform runtime certainty",
      "production or marketing readiness"
    )
  }
}

$manifestPath = Join-Path $bundleDir "manifest.json"
$manifest | ConvertTo-Json -Depth 8 | Set-Content -Path $manifestPath -Encoding utf8

$summary = @()
$summary += "# Replyline alpha handoff bundle"
$summary += ""
$summary += "- generatedAtLocal: $($manifest.generatedAtLocal)"
$relativeBundleDir = Get-RelativePathForMarkdown -BasePath $root -TargetPath $bundleDir
$summary += ('- bundleDir: `{0}`' -f $relativeBundleDir)
$summary += ""
$summary += "## Includes"
$summary += ""
foreach ($key in $artifacts.Keys) {
  $summary += ('- {0}: `{1}`' -f $key, $artifacts[$key])
}
if ($artifacts.Keys.Count -eq 0) {
  $summary += "- none"
}
$summary += ""
$summary += "## Notes"
$summary += ""
if ($notes.Count -eq 0) {
  $summary += "- none"
} else {
  foreach ($note in $notes) {
    $summary += "- $note"
  }
}
$summary += ""
$summary += "## Honesty"
$summary += ""
$summary += "- proves: local alpha handoff packaging discipline on this workstation"
$summary += "- does not prove: cross-machine stability or product readiness"

$summaryPath = Join-Path $bundleDir "README.md"
$summary -join "`n" | Set-Content -Path $summaryPath -Encoding utf8

Write-Host "Alpha handoff bundle created:" -ForegroundColor Green
Write-Host $bundleDir
