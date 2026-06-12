param()

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$nodeScript = Join-Path $scriptDir "beta-smoke-report.mjs"

& node $nodeScript
exit $LASTEXITCODE
