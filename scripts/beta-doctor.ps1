param(
  [switch]$Json,
  [switch]$SimulateNonWindows
)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$nodeScript = Join-Path $scriptDir "beta-doctor.mjs"
$nodeArgs = @($nodeScript)
if ($Json) {
  $nodeArgs += "--json"
}
if ($SimulateNonWindows) {
  $nodeArgs += "--simulate-non-windows"
}
if ($args.Count -gt 0) {
  $nodeArgs += $args
}

$env:BETA_DOCTOR_PS_VERSION = $PSVersionTable.PSVersion.ToString()
$env:BETA_DOCTOR_PS_EDITION = $PSVersionTable.PSEdition
$env:BETA_DOCTOR_SCRIPT_PATH = $MyInvocation.MyCommand.Path

& node @nodeArgs
exit $LASTEXITCODE
