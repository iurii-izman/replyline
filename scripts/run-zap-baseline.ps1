param(
  [string]$TargetUrl = $(if ($env:ZAP_TARGET_URL) { $env:ZAP_TARGET_URL } else { 'http://127.0.0.1:4173' }),
  [string]$ReportDir = 'artifacts/zap',
  [string]$ZapDir = 'C:\Program Files\ZAP\Zed Attack Proxy'
)

$ErrorActionPreference = 'Stop'
New-Item -ItemType Directory -Force $ReportDir | Out-Null
$reportPath = (Resolve-Path $ReportDir).Path
$zapBat = Join-Path $ZapDir 'zap.bat'
if (-not (Test-Path $zapBat)) {
  throw "ZAP not found at $zapBat"
}

if (-not (Get-Command java -ErrorAction SilentlyContinue)) {
  $javaHome = 'C:\Program Files\Eclipse Adoptium\jre-17.0.19.10-hotspot\bin'
  if (Test-Path $javaHome) {
    $env:PATH = "$javaHome;$env:PATH"
  }
}

Push-Location $ZapDir
try {
  & $zapBat -cmd -quickurl $TargetUrl -quickout "$reportPath\zap-baseline-report.html"
} finally {
  Pop-Location
}
