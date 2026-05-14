param(
  [string]$ProjectName = "replyline",
  [string]$ComposeFile = "",
  [string]$BaseComposeFile = "",
  [string]$OverrideComposeFile = "",
  [switch]$RemoveVolumes,
  [switch]$DryRun
)

$ErrorActionPreference = "Stop"
$common = Join-Path $PSScriptRoot "docker-replyline-compose-common.ps1"
. $common
$composeContext = Resolve-ReplylineComposeContext -ComposeFile $ComposeFile -BaseComposeFile $BaseComposeFile -OverrideComposeFile $OverrideComposeFile
$composeFileArgs = Get-ReplylineComposeFileArgs -ComposeFiles $composeContext.Files
if ($composeContext.Files.Count -eq 0) {
  throw "Compose file context not found. Set -ComposeFile or base/override args."
}

$composeArgs = @(
  "compose",
  "-p", $ProjectName
) + $composeFileArgs + @(
  "down",
  "--remove-orphans"
)
if ($RemoveVolumes) {
  $composeArgs += "--volumes"
}

Write-Host "[replyline-docker] Compose mode: $($composeContext.Mode)"
Write-Host "[replyline-docker] Compose files:"
$composeContext.Files | ForEach-Object { Write-Host "  - $_" }
Write-Host "[replyline-docker] Project name: $ProjectName"
Write-Host "[replyline-docker] Command: docker $($composeArgs -join ' ')"

if ($DryRun) {
  exit 0
}

& docker @composeArgs
if ($LASTEXITCODE -ne 0) {
  throw "Docker compose down failed."
}
