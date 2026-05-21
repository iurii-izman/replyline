param(
  [string]$Target = $env:REPLYLINE_ZAP_TARGET,
  [string]$ReportDir = "reports/security"
)

if ([string]::IsNullOrWhiteSpace($Target)) {
  Write-Output "[optional-lane] SKIP zap-baseline: set REPLYLINE_ZAP_TARGET to run active scan."
  exit 0
}

if (-not ($Target.StartsWith("http://") -or $Target.StartsWith("https://"))) {
  Write-Error "REPLYLINE_ZAP_TARGET must start with http:// or https://"
  exit 2
}

New-Item -ItemType Directory -Path $ReportDir -Force | Out-Null
$reportPath = Join-Path $ReportDir "zap-baseline-report.txt"

Write-Output "[optional-lane] running zap-baseline against $Target"
& zap-baseline -t $Target -r $reportPath
exit $LASTEXITCODE
