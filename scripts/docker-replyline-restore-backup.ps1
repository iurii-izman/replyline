param(
  [Parameter(Mandatory = $true)]
  [string]$BackupId,
  [string]$ProjectName = "replyline",
  [string]$ComposeFile = "",
  [string]$BaseComposeFile = "",
  [string]$OverrideComposeFile = "",
  [switch]$ConfirmRestore,
  [switch]$AllowLegacyBackup,
  [switch]$DryRun
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$common = Join-Path $PSScriptRoot "docker-replyline-compose-common.ps1"
. $common

function Invoke-CheckedDocker {
  param([string[]]$Arguments)

  & docker @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "Docker command failed: docker $($Arguments -join ' ')"
  }
}

function Get-ProjectDataVolumes {
  $containerIds = @(
    & docker ps -a --filter "label=com.docker.compose.project=$ProjectName" --format "{{.ID}}"
  ) | Where-Object { -not [string]::IsNullOrWhiteSpace($_) }
  if ($LASTEXITCODE -ne 0) {
    throw "Unable to list project containers."
  }

  $result = @()
  foreach ($containerId in $containerIds) {
    $result += @(
      & docker inspect --format '{{range .Mounts}}{{if eq .Type "volume"}}{{println .Name}}{{end}}{{end}}' $containerId
    )
    if ($LASTEXITCODE -ne 0) {
      throw "Unable to inspect project container: $containerId"
    }
  }
  return @($result | Where-Object { -not [string]::IsNullOrWhiteSpace($_) } | Sort-Object -Unique)
}

if ($BackupId -notmatch '^[A-Za-z0-9][A-Za-z0-9_.-]*$') {
  throw "BackupId may contain only letters, digits, dots, underscores, and hyphens."
}

$composeContext = Resolve-ReplylineComposeContext -ComposeFile $ComposeFile -BaseComposeFile $BaseComposeFile -OverrideComposeFile $OverrideComposeFile
if ($composeContext.Files.Count -eq 0) {
  throw "Compose file context not found."
}
$composeFileArgs = Get-ReplylineComposeFileArgs -ComposeFiles $composeContext.Files

$volumes = @(Get-ProjectDataVolumes)
if ($volumes.Count -eq 0) {
  throw "No Docker volumes found for project $ProjectName."
}

$restorePlan = foreach ($volume in $volumes) {
  $backup = "$volume-backup-$BackupId"
  $null = & docker volume inspect $backup 2>$null
  if ($LASTEXITCODE -ne 0) {
    throw "Backup volume not found: $backup"
  }

  $markerCheck = & docker run --rm -v "${backup}:/backup:ro" alpine:3.22@sha256:310c62b5e7ca5b08167e4384c68db0fd2905dd9c7493756d356e893909057601 test -f /backup/.replyline-backup-complete
  $markerPresent = ($LASTEXITCODE -eq 0)
  if (-not $markerPresent -and -not $AllowLegacyBackup) {
    throw "Backup completion marker missing for $backup. Use -AllowLegacyBackup only after manual verification."
  }

  [pscustomobject]@{
    target = $volume
    backup = $backup
    markerPresent = $markerPresent
  }
}

Write-Host "[replyline-docker] Restore plan:"
$restorePlan | ForEach-Object {
  Write-Host "  - $($_.backup) -> $($_.target) marker=$($_.markerPresent)"
}

if ($DryRun) {
  Write-Host "[replyline-docker] Dry-run mode; stack and volumes were not changed."
  exit 0
}
if (-not $ConfirmRestore) {
  throw "Restore overwrites active project volumes. Re-run with -ConfirmRestore after reviewing the plan."
}

$stopArgs = @("compose", "-p", $ProjectName) + $composeFileArgs + @("stop")
$upArgs = @("compose", "-p", $ProjectName) + $composeFileArgs + @("up", "-d", "--remove-orphans")

try {
  Invoke-CheckedDocker -Arguments $stopArgs
  foreach ($entry in $restorePlan) {
    Invoke-CheckedDocker -Arguments @(
      "run", "--rm",
      "-v", "$($entry.backup):/backup:ro",
      "-v", "$($entry.target):/target",
      "alpine:3.22@sha256:310c62b5e7ca5b08167e4384c68db0fd2905dd9c7493756d356e893909057601",
      "sh", "-c",
      "find /target -mindepth 1 -maxdepth 1 -exec rm -rf -- {} + && cd /backup && find . -mindepth 1 -maxdepth 1 ! -name .replyline-backup-complete -exec cp -a -- {} /target/ \;"
    )
  }
} finally {
  Invoke-CheckedDocker -Arguments $upArgs
}

Wait-ReplylineDockerHealth -ProjectName $ProjectName -ComposeContext $composeContext
Write-Host "[replyline-docker] Restore completed from backup: $BackupId"
