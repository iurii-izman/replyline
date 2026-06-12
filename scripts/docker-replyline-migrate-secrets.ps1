param(
  [string]$ComposeFile = "",
  [string]$EnvFile = "",
  [switch]$DryRun
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$common = Join-Path $PSScriptRoot "docker-replyline-compose-common.ps1"
. $common

if ([string]::IsNullOrWhiteSpace($ComposeFile)) {
  $ComposeFile = Resolve-ReplylineBaseComposeFile -ExplicitPath ""
}
$ComposeFile = (Resolve-Path $ComposeFile).Path

if ([string]::IsNullOrWhiteSpace($EnvFile)) {
  $EnvFile = Join-Path (Split-Path -Parent $ComposeFile) ".env"
}
$EnvFile = [System.IO.Path]::GetFullPath($EnvFile)

$secretKeys = [System.Collections.Generic.HashSet[string]]::new(
  [string[]]@(
    "SALT",
    "ENCRYPTION_KEY",
    "CLICKHOUSE_PASSWORD",
    "LANGFUSE_S3_EVENT_UPLOAD_ACCESS_KEY_ID",
    "LANGFUSE_S3_EVENT_UPLOAD_SECRET_ACCESS_KEY",
    "LANGFUSE_S3_MEDIA_UPLOAD_ACCESS_KEY_ID",
    "LANGFUSE_S3_MEDIA_UPLOAD_SECRET_ACCESS_KEY",
    "LANGFUSE_S3_BATCH_EXPORT_ACCESS_KEY_ID",
    "LANGFUSE_S3_BATCH_EXPORT_SECRET_ACCESS_KEY",
    "REDIS_AUTH",
    "NEXTAUTH_SECRET",
    "POSTGRES_PASSWORD",
    "MINIO_ROOT_PASSWORD",
    "LANGFUSE_INIT_PROJECT_SECRET_KEY",
    "LANGFUSE_INIT_USER_PASSWORD"
  ),
  [System.StringComparer]::Ordinal
)

function ConvertFrom-YamlScalar {
  param([string]$Value)

  $trimmed = $Value.Trim()
  if ($trimmed.Length -ge 2 -and $trimmed.StartsWith("'") -and $trimmed.EndsWith("'")) {
    return $trimmed.Substring(1, $trimmed.Length - 2).Replace("''", "'")
  }
  if ($trimmed.Length -ge 2 -and $trimmed.StartsWith('"') -and $trimmed.EndsWith('"')) {
    return $trimmed.Substring(1, $trimmed.Length - 2)
  }
  return $trimmed
}

function ConvertTo-DotEnvValue {
  param([string]$Value)

  if ($Value.Contains("`r") -or $Value.Contains("`n")) {
    throw "Multiline secret values are not supported by this migration."
  }
  return "'" + $Value.Replace("'", "\'") + "'"
}

function Write-AtomicLines {
  param(
    [string]$Path,
    [string[]]$Lines
  )

  $directory = Split-Path -Parent $Path
  if (-not (Test-Path $directory)) {
    throw "Target directory does not exist: $directory"
  }

  $tempPath = Join-Path $directory ".$([System.IO.Path]::GetFileName($Path)).replyline-$([guid]::NewGuid().ToString('N')).tmp"
  try {
    [System.IO.File]::WriteAllLines($tempPath, $Lines)
    Move-Item -LiteralPath $tempPath -Destination $Path -Force
  } finally {
    if (Test-Path $tempPath) {
      Remove-Item -LiteralPath $tempPath -Force
    }
  }
}

$existingEnv = [ordered]@{}
if (Test-Path $EnvFile) {
  foreach ($line in Get-Content $EnvFile) {
    if ($line -match '^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)$') {
      $existingEnv[$Matches[1]] = $Matches[2].Trim()
    }
  }
}

$migrated = [ordered]@{}
$updatedLines = foreach ($line in Get-Content $ComposeFile) {
  if ($line -notmatch '^(\s*)([A-Z0-9_]+)\s*:\s*(.+?)\s*$') {
    $line
    continue
  }

  $indent = $Matches[1]
  $key = $Matches[2]
  $rawValue = $Matches[3]
  if (-not $secretKeys.Contains($key) -or $rawValue.Trim().StartsWith('$')) {
    $line
    continue
  }

  $value = ConvertFrom-YamlScalar -Value $rawValue
  $dotenvValue = ConvertTo-DotEnvValue -Value $value
  if ($migrated.Contains($key) -and $migrated[$key] -ne $value) {
    throw "Refusing to migrate inconsistent duplicate values for $key."
  }
  if ($existingEnv.Contains($key) -and $existingEnv[$key] -ne $value -and $existingEnv[$key] -ne $dotenvValue) {
    throw "Refusing to overwrite a different existing value for $key in $EnvFile."
  }

  $migrated[$key] = $value
  "${indent}${key}: `${${key}:?Set ${key} in .env}"
}

if ($migrated.Count -eq 0) {
  Write-Host "[replyline-docker] No inline Docker secrets require migration."
  exit 0
}

$migratedNames = @($migrated.Keys | Sort-Object)
Write-Host "[replyline-docker] Inline secret variables requiring migration: $($migratedNames -join ', ')"
if ($DryRun) {
  Write-Host "[replyline-docker] Dry-run mode; no files changed."
  exit 0
}

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupPath = "$ComposeFile.backup-$timestamp"
if (Test-Path $backupPath) {
  $backupPath = "$ComposeFile.backup-$timestamp-$([guid]::NewGuid().ToString('N').Substring(0, 8))"
}
Copy-Item -LiteralPath $ComposeFile -Destination $backupPath

foreach ($entry in $migrated.GetEnumerator()) {
  $existingEnv[$entry.Key] = ConvertTo-DotEnvValue -Value $entry.Value
}

$envLines = @(
  "# Local Docker secrets. Do not commit or share this file."
  "# Managed by scripts/docker-replyline-migrate-secrets.ps1."
)
foreach ($entry in $existingEnv.GetEnumerator()) {
  $envLines += "$($entry.Key)=$($entry.Value)"
}

Write-AtomicLines -Path $EnvFile -Lines $envLines
Write-AtomicLines -Path $ComposeFile -Lines ([string[]]$updatedLines)

Write-Host "[replyline-docker] Migrated $($migrated.Count) inline secret variables."
Write-Host "[replyline-docker] Compose backup: $backupPath"
Write-Host "[replyline-docker] Local env file: $EnvFile"
