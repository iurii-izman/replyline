param(
  [string]$ProjectName = "replyline",
  [string]$ComposeFile = "",
  [string]$BaseComposeFile = "",
  [string]$OverrideComposeFile = "",
  [string]$BackupId = "",
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

$composeContext = Resolve-ReplylineComposeContext -ComposeFile $ComposeFile -BaseComposeFile $BaseComposeFile -OverrideComposeFile $OverrideComposeFile
if ($composeContext.Files.Count -eq 0) {
  throw "Compose file context not found."
}
$composeFileArgs = Get-ReplylineComposeFileArgs -ComposeFiles $composeContext.Files

if ([string]::IsNullOrWhiteSpace($BackupId)) {
  $BackupId = Get-Date -Format "yyyyMMdd-HHmmss"
}
if ($BackupId -notmatch '^[A-Za-z0-9][A-Za-z0-9_.-]*$') {
  throw "BackupId may contain only letters, digits, dots, underscores, and hyphens."
}

$volumes = @(Get-ProjectDataVolumes)
if ($volumes.Count -eq 0) {
  throw "No Docker volumes found for project $ProjectName."
}

$backupPlan = foreach ($volume in $volumes) {
  [pscustomobject]@{
    source = $volume
    backup = "$volume-backup-$BackupId"
  }
}

Write-Host "[replyline-docker] Backup plan:"
$backupPlan | ForEach-Object { Write-Host "  - $($_.source) -> $($_.backup)" }
if ($DryRun) {
  Write-Host "[replyline-docker] Dry-run mode; stack and volumes were not changed."
  exit 0
}

foreach ($entry in $backupPlan) {
  $null = & docker volume inspect $entry.backup 2>$null
  if ($LASTEXITCODE -eq 0) {
    throw "Backup volume already exists: $($entry.backup)"
  }
}

$stopArgs = @("compose", "-p", $ProjectName) + $composeFileArgs + @("stop")
$upArgs = @("compose", "-p", $ProjectName) + $composeFileArgs + @("up", "-d", "--remove-orphans")

try {
  Invoke-CheckedDocker -Arguments $stopArgs
  foreach ($entry in $backupPlan) {
    Invoke-CheckedDocker -Arguments @(
      "volume", "create",
      "--label", "com.replyline.backup=true",
      "--label", "com.replyline.project=$ProjectName",
      "--label", "com.replyline.backup.id=$BackupId",
      "--label", "com.replyline.backup.source=$($entry.source)",
      $entry.backup
    )
    Invoke-CheckedDocker -Arguments @(
      "run", "--rm",
      "-v", "$($entry.source):/from:ro",
      "-v", "$($entry.backup):/to",
      "alpine:3.22@sha256:310c62b5e7ca5b08167e4384c68db0fd2905dd9c7493756d356e893909057601",
      "sh", "-c", "cd /from && cp -a . /to/ && touch /to/.replyline-backup-complete"
    )
  }
} finally {
  Invoke-CheckedDocker -Arguments $upArgs
}

Wait-ReplylineDockerHealth -ProjectName $ProjectName -ComposeContext $composeContext
Write-Host "[replyline-docker] Backup completed: $BackupId"
