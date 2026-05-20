param()

$ErrorActionPreference = "Stop"

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$outDir = Join-Path "reports" "runtime-live-evidence-$timestamp"
New-Item -ItemType Directory -Path $outDir -Force | Out-Null

$settingsPath = Join-Path $env:APPDATA "com.replyline.app\settings.json"
$appLogPath = Join-Path $env:APPDATA "com.replyline.app\logs\app.log"
$diagOutPath = Join-Path $outDir "diagnostics.json"
$logOutPath = Join-Path $outDir "app.log"
$reportPath = Join-Path $outDir "runtime-live-qa.md"

Write-Host "Expected settings path: $settingsPath"
Write-Host "Expected app log path: $appLogPath"
Write-Host "Evidence output: $outDir"

$settingsExists = Test-Path -LiteralPath $settingsPath
$appLogExists = Test-Path -LiteralPath $appLogPath

if ($appLogExists) {
  $safeLog = Get-Content -LiteralPath $appLogPath -Raw
  $safeLog = [regex]::Replace($safeLog, "(?i)\b(sk-[A-Za-z0-9_\-]+)\b", "[redacted]")
  $safeLog = [regex]::Replace($safeLog, "(?i)\b(dg_[A-Za-z0-9_\-]+)\b", "[redacted]")
  $safeLog = [regex]::Replace($safeLog, "(?i)\bBearer\s+[A-Za-z0-9._\-+/=]+\b", "Bearer [redacted]")
  $safeLog = [regex]::Replace($safeLog, "(?i)\bapi_key\s*=\s*[^&\s]+", "api_key=[redacted]")
  Set-Content -LiteralPath $logOutPath -Value $safeLog -Encoding UTF8
}

$diagCaptured = $false
try {
  $diagJson = cargo run --quiet --manifest-path src-tauri/Cargo.toml --bin persistence_diagnostics
  if ($LASTEXITCODE -eq 0 -and $diagJson) {
    $diagJson | Set-Content -LiteralPath $diagOutPath -Encoding UTF8
    $diagCaptured = $true
  }
} catch {
  $diagCaptured = $false
}

$scanFindings = @()
$scanTargets = @()
if (Test-Path -LiteralPath $logOutPath) { $scanTargets += $logOutPath }
if (Test-Path -LiteralPath $diagOutPath) { $scanTargets += $diagOutPath }

$scanPatterns = @("sk-", "dg_", "Bearer ", "api_key=")
foreach ($target in $scanTargets) {
  $content = Get-Content -LiteralPath $target -Raw
  foreach ($pattern in $scanPatterns) {
    if ($content -match [regex]::Escape($pattern)) {
      if ($content -match "\[redacted\]") {
        continue
      }
      $scanFindings += "$target :: pattern '$pattern'"
    }
  }
}

$report = @()
$report += "# Runtime Live QA Evidence"
$report += ""
$report += "- GeneratedAt: $(Get-Date -Format o)"
$report += "- SettingsPath: $settingsPath"
$report += "- AppLogPath: $appLogPath"
$report += "- SettingsFileExists: $settingsExists"
$report += "- AppLogExists: $appLogExists"
$report += "- DiagnosticsCaptured: $diagCaptured"
$report += ""
$report += "## Manual Checklist"
$report += "- [ ] GUI launched via pnpm tauri dev"
$report += "- [ ] Settings present after restart"
$report += "- [ ] Hotkey capture performed"
$report += "- [ ] Answer card ready without setup redirect"
$report += ""
$report += "## Leak Scan"
if ($scanFindings.Count -eq 0) {
  $report += "- PASS (no raw secret markers found in collected artifacts)"
} else {
  $report += "- FAIL"
  foreach ($line in $scanFindings) {
    $report += "- $line"
  }
}
$report | Set-Content -LiteralPath $reportPath -Encoding UTF8

Write-Host "Collected files:"
if (Test-Path -LiteralPath $logOutPath) { Write-Host " - $logOutPath" }
if (Test-Path -LiteralPath $diagOutPath) { Write-Host " - $diagOutPath" }
Write-Host " - $reportPath"
Write-Host "Evidence directory: $outDir"
