Set-StrictMode -Version Latest

function Resolve-ReplylineBaseComposeFile {
  param([string]$ExplicitPath)

  if (-not [string]::IsNullOrWhiteSpace($ExplicitPath)) {
    if (Test-Path $ExplicitPath) { return (Resolve-Path $ExplicitPath).Path }
    throw "Base compose file not found: $ExplicitPath"
  }

  $envPath = $env:REPLYLINE_AI_STACK_COMPOSE
  if (-not [string]::IsNullOrWhiteSpace($envPath) -and (Test-Path $envPath)) {
    return (Resolve-Path $envPath).Path
  }

  $candidates = @(
    "C:\Users\iurii\ai-stack\docker-compose.yml",
    "C:\Dev\ai-vibe-engineering\artifacts\docker\docker-compose.yml",
    "C:\Dev\ai-stack\docker-compose.yml"
  )

  foreach ($candidate in $candidates) {
    if (Test-Path $candidate) {
      return (Resolve-Path $candidate).Path
    }
  }

  throw "Base compose file not found. Set -BaseComposeFile or REPLYLINE_AI_STACK_COMPOSE."
}

function Resolve-ReplylineOverrideComposeFile {
  param([string]$ExplicitPath)

  if (-not [string]::IsNullOrWhiteSpace($ExplicitPath)) {
    if (Test-Path $ExplicitPath) { return (Resolve-Path $ExplicitPath).Path }
    throw "Override compose file not found: $ExplicitPath"
  }

  $repoRoot = Split-Path -Parent $PSScriptRoot
  $defaultPath = Join-Path $repoRoot "infra\replyline-ai-stack.override.yml"
  if (Test-Path $defaultPath) {
    return (Resolve-Path $defaultPath).Path
  }

  throw "Default override compose file not found: $defaultPath"
}

function Resolve-ReplylineComposeContext {
  param(
    [string]$ComposeFile,
    [string]$BaseComposeFile,
    [string]$OverrideComposeFile
  )

  if (-not [string]::IsNullOrWhiteSpace($ComposeFile)) {
    if (Test-Path $ComposeFile) {
      return [pscustomobject]@{
        Mode = "single"
        Files = @((Resolve-Path $ComposeFile).Path)
      }
    }
    throw "Compose file not found: $ComposeFile"
  }

  $explicitBase = -not [string]::IsNullOrWhiteSpace($BaseComposeFile)
  $explicitOverride = -not [string]::IsNullOrWhiteSpace($OverrideComposeFile)
  if ($explicitBase -or $explicitOverride) {
    $resolvedBase = Resolve-ReplylineBaseComposeFile -ExplicitPath $BaseComposeFile
    $resolvedOverride = Resolve-ReplylineOverrideComposeFile -ExplicitPath $OverrideComposeFile
    return [pscustomobject]@{
      Mode = "merged"
      Files = @($resolvedBase, $resolvedOverride)
    }
  }

  $envCompose = $env:REPLYLINE_DOCKER_COMPOSE_FILE
  if (-not [string]::IsNullOrWhiteSpace($envCompose) -and (Test-Path $envCompose)) {
    return [pscustomobject]@{
      Mode = "single"
      Files = @((Resolve-Path $envCompose).Path)
    }
  }

  try {
    $resolvedBase = Resolve-ReplylineBaseComposeFile -ExplicitPath ""
    $resolvedOverride = Resolve-ReplylineOverrideComposeFile -ExplicitPath ""
    return [pscustomobject]@{
      Mode = "merged"
      Files = @($resolvedBase, $resolvedOverride)
    }
  } catch {
    $repoRoot = Split-Path -Parent $PSScriptRoot
    $fallback = @(
      (Join-Path $repoRoot "infra\replyline-stack.compose.yml"),
      (Join-Path $repoRoot "docker-compose.replyline.yml"),
      (Join-Path $repoRoot "infra\docker-compose.replyline.yml")
    )
    foreach ($candidate in $fallback) {
      if (Test-Path $candidate) {
        return [pscustomobject]@{
          Mode = "single"
          Files = @((Resolve-Path $candidate).Path)
        }
      }
    }
  }

  return [pscustomobject]@{
    Mode = "none"
    Files = @()
  }
}

function Get-ReplylineComposeFileArgs {
  param([string[]]$ComposeFiles)

  $args = @()
  foreach ($file in $ComposeFiles) {
    $args += @("-f", $file)
  }
  return $args
}

function Get-ReplylineHealthArgs {
  param(
    [string]$ProjectName,
    [object]$ComposeContext
  )

  $args = @(
    "-ProjectName", $ProjectName,
    "-ManagedLabel", "com.replyline.managed=true"
  )
  if ($ComposeContext.Mode -eq "single" -and $ComposeContext.Files.Count -gt 0) {
    $args += @("-ComposeFile", $ComposeContext.Files[0])
  } elseif ($ComposeContext.Mode -eq "merged" -and $ComposeContext.Files.Count -gt 1) {
    $args += @(
      "-BaseComposeFile", $ComposeContext.Files[0],
      "-OverrideComposeFile", $ComposeContext.Files[1]
    )
  }
  return $args
}

function Wait-ReplylineDockerHealth {
  param(
    [string]$ProjectName,
    [object]$ComposeContext,
    [int]$TimeoutSeconds = 180
  )

  $healthScript = Join-Path $PSScriptRoot "docker-replyline-health.ps1"
  $healthArgs = Get-ReplylineHealthArgs -ProjectName $ProjectName -ComposeContext $ComposeContext
  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  $lastOutput = @()

  do {
    $lastOutput = @(& pwsh -NoProfile -File $healthScript @healthArgs 2>&1)
    $exitCode = $LASTEXITCODE
    if ($exitCode -eq 0) {
      $lastOutput | ForEach-Object { Write-Host $_ }
      return
    }
    Start-Sleep -Seconds 5
  } while ((Get-Date) -lt $deadline)

  $lastOutput | ForEach-Object { Write-Host $_ }
  throw "Docker stack did not reach a healthy state within $TimeoutSeconds seconds."
}
