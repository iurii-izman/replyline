param(
  [string]$ProjectName = "replyline",
  [string]$ComposeFile = "",
  [string]$BaseComposeFile = "",
  [string]$OverrideComposeFile = "",
  [int]$Tail = 200,
  [switch]$Follow,
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
  "logs",
  "--tail", $Tail
)
if ($Follow) {
  $composeArgs += "--follow"
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
exit $LASTEXITCODE
