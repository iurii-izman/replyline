param(
  [string]$ProjectName = "replyline",
  [string]$ComposeFile = "",
  [string]$BaseComposeFile = "",
  [string]$OverrideComposeFile = "",
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
  "up",
  "-d",
  "--remove-orphans"
)

Write-Host "[replyline-docker] Compose mode: $($composeContext.Mode)"
Write-Host "[replyline-docker] Compose files:"
$composeContext.Files | ForEach-Object { Write-Host "  - $_" }
Write-Host "[replyline-docker] Project name: $ProjectName"
Write-Host "[replyline-docker] Command: docker $($composeArgs -join ' ')"

if (-not $DryRun) {
  & docker @composeArgs
  if ($LASTEXITCODE -ne 0) {
    throw "Docker compose restore failed."
  }
}

$healthScript = Join-Path $PSScriptRoot "docker-replyline-health.ps1"
$healthArgs = @(
  "-ProjectName", $ProjectName,
  "-ManagedLabel", "com.replyline.managed=true"
)
if ($composeContext.Mode -eq "single" -and $composeContext.Files.Count -gt 0) {
  $healthArgs += @("-ComposeFile", $composeContext.Files[0])
} elseif ($composeContext.Mode -eq "merged" -and $composeContext.Files.Count -gt 1) {
  $healthArgs += @(
    "-BaseComposeFile", $composeContext.Files[0],
    "-OverrideComposeFile", $composeContext.Files[1]
  )
}

if ($DryRun) {
  Write-Host "[replyline-docker] Dry-run mode; health check command:"
  Write-Host "  pwsh -File `"$healthScript`" $($healthArgs -join ' ')"
  exit 0
}

& pwsh -File $healthScript @healthArgs
exit $LASTEXITCODE
