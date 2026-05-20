param(
  [string]$ProjectName = "replyline",
  [string]$ManagedLabel = "com.replyline.managed=true",
  [string]$ComposeFile = "",
  [string]$BaseComposeFile = "",
  [string]$OverrideComposeFile = "",
  [switch]$AutoRecover,
  [switch]$DryRun,
  [switch]$Json,
  [switch]$AllowUnsafeCompose
)

$ErrorActionPreference = "Stop"

function Write-Info {
  param([string]$Message)
  Write-Host "[replyline-docker] $Message"
}

function Invoke-CheckedCommand {
  param(
    [string]$FilePath,
    [string[]]$Arguments
  )

  $output = & $FilePath @Arguments 2>&1
  $exitCode = $LASTEXITCODE
  return [pscustomobject]@{
    ExitCode = $exitCode
    Output = ($output -join "`n").Trim()
  }
}

function Get-ComposeConfigJson {
  param([string[]]$ComposeFiles)

  if (-not $ComposeFiles -or $ComposeFiles.Count -eq 0) {
    return $null
  }

  $composeFileArgs = @()
  foreach ($file in $ComposeFiles) {
    $composeFileArgs += @("-f", $file)
  }

  $cfg = Invoke-CheckedCommand -FilePath "docker" -Arguments (@("compose") + $composeFileArgs + @("config", "--format", "json"))
  if ($cfg.ExitCode -ne 0 -or [string]::IsNullOrWhiteSpace($cfg.Output)) {
    throw "Unable to build compose config: $($cfg.Output)"
  }

  return $cfg.Output | ConvertFrom-Json -Depth 60
}

function Get-ComposeSafetyReport {
  param(
    [object]$ComposeConfig,
    [string]$Project
  )

  if ($null -eq $ComposeConfig) {
    return [pscustomobject]@{
      checked = $false
      safe = $true
      reason = "no compose file"
      unsafeServices = @()
    }
  }

  $unsafe = @()
  if ($ComposeConfig.services) {
    $serviceNames = $ComposeConfig.services.PSObject.Properties.Name
    foreach ($svc in $serviceNames) {
      $svcObj = $ComposeConfig.services.$svc
      if ($svcObj.PSObject.Properties.Name -contains "container_name") {
        $containerName = [string]$svcObj.container_name
        if (-not ($containerName -like "$Project-*")) {
          $unsafe += "$svc -> container_name=$containerName"
        }
      }
    }
  }

  return [pscustomobject]@{
    checked = $true
    safe = ($unsafe.Count -eq 0)
    reason = if ($unsafe.Count -eq 0) { "ok" } else { "fixed container_name detected" }
    unsafeServices = $unsafe
  }
}

function Get-ComposePublishedPorts {
  param([object]$ComposeConfig)

  $result = @()
  if ($null -eq $ComposeConfig -or -not $ComposeConfig.services) {
    return $result
  }

  foreach ($serviceName in $ComposeConfig.services.PSObject.Properties.Name) {
    $service = $ComposeConfig.services.$serviceName
    if (-not ($service.PSObject.Properties.Name -contains "ports") -or -not $service.ports) {
      continue
    }

    foreach ($portEntry in $service.ports) {
      if ($portEntry -is [string]) {
        $match = [regex]::Match($portEntry, '^(?:(?<hostip>[^:]+):)?(?<published>\d+):(?<target>\d+)(?:/(?<proto>tcp|udp))?$')
        if ($match.Success) {
          $result += [pscustomobject]@{
            service = $serviceName
            hostIp = if ($match.Groups["hostip"].Success) { $match.Groups["hostip"].Value } else { "0.0.0.0" }
            published = [int]$match.Groups["published"].Value
            target = [int]$match.Groups["target"].Value
            protocol = if ($match.Groups["proto"].Success) { $match.Groups["proto"].Value } else { "tcp" }
          }
        }
        continue
      }

      if ($portEntry -and ($portEntry.PSObject.Properties.Name -contains "published") -and $portEntry.published) {
        $result += [pscustomobject]@{
          service = $serviceName
          hostIp = if ($portEntry.PSObject.Properties.Name -contains "host_ip" -and $portEntry.host_ip) { [string]$portEntry.host_ip } else { "0.0.0.0" }
          published = [int]$portEntry.published
          target = if ($portEntry.PSObject.Properties.Name -contains "target" -and $portEntry.target) { [int]$portEntry.target } else { $null }
          protocol = if ($portEntry.PSObject.Properties.Name -contains "protocol" -and $portEntry.protocol) { [string]$portEntry.protocol } else { "tcp" }
        }
      }
    }
  }

  return $result
}

function Get-ListeningTcpPorts {
  try {
    $ports = Get-NetTCPConnection -State Listen -ErrorAction Stop | Select-Object -ExpandProperty LocalPort -Unique
    return @($ports)
  } catch {
    $lines = & netstat -ano -p tcp
    $ports = @()
    foreach ($line in $lines) {
      if ($line -match '^\s*TCP\s+\S+:(\d+)\s+\S+\s+LISTENING\s+\d+') {
        $ports += [int]$Matches[1]
      }
    }
    return @($ports | Sort-Object -Unique)
  }
}

function Get-RunningContainerPortInventory {
  param(
    [string]$Project,
    [string]$ManagedLabelFilter
  )

  $ids = & docker ps --format "{{.ID}}"
  if ($LASTEXITCODE -ne 0 -or -not $ids) {
    return @()
  }

  $inventory = @()
  foreach ($id in $ids) {
    if ([string]::IsNullOrWhiteSpace($id)) { continue }
    $inspect = Invoke-CheckedCommand -FilePath "docker" -Arguments @("inspect", "--format", "{{json .}}", $id.Trim())
    if ($inspect.ExitCode -ne 0 -or [string]::IsNullOrWhiteSpace($inspect.Output)) {
      continue
    }

    $obj = $inspect.Output | ConvertFrom-Json -Depth 60
    $labels = $obj.Config.Labels
    $isManaged = $false
    if ($labels) {
      $managedRaw = ""
      if ($labels.PSObject.Properties.Name -contains "com.replyline.managed") {
        $managedRaw = [string]$labels."com.replyline.managed"
      }
      $composeProject = ""
      if ($labels.PSObject.Properties.Name -contains "com.docker.compose.project") {
        $composeProject = [string]$labels."com.docker.compose.project"
      }
      if ($managedRaw -eq "true" -or $composeProject -eq $Project) {
        $isManaged = $true
      }
    }

    if ($obj.NetworkSettings -and $obj.NetworkSettings.Ports) {
      foreach ($prop in $obj.NetworkSettings.Ports.PSObject.Properties) {
        $containerPort = $prop.Name
        $bindings = $prop.Value
        if ($null -eq $bindings) { continue }
        foreach ($binding in $bindings) {
          if (-not $binding.HostPort) { continue }
          $inventory += [pscustomobject]@{
            containerId = $id.Trim()
            containerName = ([string]$obj.Name).TrimStart("/")
            hostIp = [string]$binding.HostIp
            hostPort = [int]$binding.HostPort
            containerPort = $containerPort
            isManaged = $isManaged
          }
        }
      }
    }
  }

  return $inventory
}

function Get-PortConflictReport {
  param(
    [object[]]$DesiredPorts,
    [object[]]$RunningPortInventory,
    [int[]]$ListeningPorts
  )

  $replylineRunningPorts = @($RunningPortInventory | Where-Object { $_.isManaged } | Select-Object -ExpandProperty hostPort -Unique)
  $foreignPortBindings = @($RunningPortInventory | Where-Object { -not $_.isManaged })
  $foreignPorts = @($foreignPortBindings | Select-Object -ExpandProperty hostPort -Unique)

  $listeningSet = [System.Collections.Generic.HashSet[int]]::new()
  foreach ($p in $ListeningPorts) {
    $null = $listeningSet.Add([int]$p)
  }

  $replylineSet = [System.Collections.Generic.HashSet[int]]::new()
  foreach ($p in $replylineRunningPorts) {
    $null = $replylineSet.Add([int]$p)
  }

  $foreignMap = @{}
  foreach ($f in $foreignPortBindings) {
    if (-not $foreignMap.ContainsKey($f.hostPort)) {
      $foreignMap[$f.hostPort] = @()
    }
    $foreignMap[$f.hostPort] += $f.containerName
  }

  $desiredUnique = @($DesiredPorts | Select-Object -Property service, hostIp, published, target, protocol)
  $usedSet = [System.Collections.Generic.HashSet[int]]::new()
  foreach ($p in $ListeningPorts) { $null = $usedSet.Add([int]$p) }
  foreach ($p in $replylineRunningPorts) { $null = $usedSet.Add([int]$p) }
  foreach ($p in $foreignPorts) { $null = $usedSet.Add([int]$p) }

  $plannedSet = [System.Collections.Generic.HashSet[int]]::new()
  foreach ($d in $desiredUnique) { $null = $plannedSet.Add([int]$d.published) }

  $suggestedTaken = [System.Collections.Generic.HashSet[int]]::new()
  $conflicts = @()
  foreach ($d in $desiredUnique) {
    $port = [int]$d.published
    $blockedByForeign = $foreignMap.ContainsKey($port)
    $blockedByHost = $listeningSet.Contains($port) -and (-not $replylineSet.Contains($port)) -and (-not $blockedByForeign)

    if (-not $blockedByForeign -and -not $blockedByHost) {
      continue
    }

    $suggest = $port + 1000
    if ($suggest -lt 1024) { $suggest = 1024 }
    while ($usedSet.Contains($suggest) -or $plannedSet.Contains($suggest) -or $suggestedTaken.Contains($suggest)) {
      $suggest += 1
      if ($suggest -gt 65535) {
        $suggest = 20000
      }
    }
    $null = $suggestedTaken.Add($suggest)

    $conflicts += [pscustomobject]@{
      service = $d.service
      hostIp = $d.hostIp
      published = $port
      target = $d.target
      protocol = $d.protocol
      reason = if ($blockedByForeign) { "occupied by non-replyline container(s): $((@($foreignMap[$port] | Sort-Object -Unique) -join ', '))" } else { "occupied by host process" }
      suggestedPublished = $suggest
      suggestedMapping = "${suggest}:$($d.target)"
    }
  }

  return [pscustomobject]@{
    checked = ($DesiredPorts.Count -gt 0)
    desiredPorts = $desiredUnique
    conflicts = $conflicts
    hasConflicts = ($conflicts.Count -gt 0)
    foreignBindings = $foreignPortBindings
  }
}

function Get-ManagedContainers {
  param(
    [string]$Project,
    [string]$ManagedLabelFilter
  )

  $containerLines = New-Object System.Collections.Generic.List[string]

  $managed = & docker ps -a --filter "label=$ManagedLabelFilter" --format "{{.ID}}"
  if ($LASTEXITCODE -eq 0 -and $managed) {
    foreach ($line in $managed) {
      if (-not [string]::IsNullOrWhiteSpace($line)) {
        $containerLines.Add($line.Trim())
      }
    }
  }

  $projectScoped = & docker ps -a --filter "label=com.docker.compose.project=$Project" --format "{{.ID}}"
  if ($LASTEXITCODE -eq 0 -and $projectScoped) {
    foreach ($line in $projectScoped) {
      if (-not [string]::IsNullOrWhiteSpace($line)) {
        $containerLines.Add($line.Trim())
      }
    }
  }

  return $containerLines | Sort-Object -Unique
}

function Get-ServiceRole {
  param([string]$ServiceName)
  switch -Regex ($ServiceName) {
    "^langfuse-web$" { return "observability-app" }
    "^langfuse-worker$" { return "worker" }
    "^langfuse-db$" { return "db" }
    "^langfuse-redis$" { return "cache" }
    "^langfuse-clickhouse$" { return "olap-db" }
    "^langfuse-minio$" { return "object-storage" }
    "^langfuse-minio-init$" { return "init" }
    "^qdrant$" { return "vector-db" }
    default { return "unknown" }
  }
}

function Get-VersionFinding {
  param([string]$ImageRef)
  if ([string]::IsNullOrWhiteSpace($ImageRef)) {
    return "unknown"
  }
  if ($ImageRef -match ":(latest|dev)$") {
    return "floating-tag"
  }
  if ($ImageRef -notmatch ":") {
    return "implicit-latest"
  }
  return "pinned-or-major"
}

function Get-ContainerState {
  param([string]$ContainerId)

  $inspect = Invoke-CheckedCommand -FilePath "docker" -Arguments @(
    "inspect",
    "--format",
    "{{json .State}}",
    $ContainerId
  )
  if ($inspect.ExitCode -ne 0) {
    throw "docker inspect failed for ${ContainerId}: $($inspect.Output)"
  }

  $nameInspect = Invoke-CheckedCommand -FilePath "docker" -Arguments @(
    "inspect",
    "--format",
    "{{.Name}}",
    $ContainerId
  )
  if ($nameInspect.ExitCode -ne 0) {
    throw "docker inspect (name) failed for ${ContainerId}: $($nameInspect.Output)"
  }
  $name = $nameInspect.Output.Trim().TrimStart("/")

  $serviceInspect = Invoke-CheckedCommand -FilePath "docker" -Arguments @(
    "inspect",
    "--format",
    "{{ index .Config.Labels ""com.docker.compose.service"" }}",
    $ContainerId
  )
  $service = if ($serviceInspect.ExitCode -eq 0) { $serviceInspect.Output.Trim() } else { "" }

  $imageInspect = Invoke-CheckedCommand -FilePath "docker" -Arguments @(
    "inspect",
    "--format",
    "{{.Config.Image}}",
    $ContainerId
  )
  $imageRef = if ($imageInspect.ExitCode -eq 0) { $imageInspect.Output.Trim() } else { "" }

  $restartInspect = Invoke-CheckedCommand -FilePath "docker" -Arguments @(
    "inspect",
    "--format",
    "{{.HostConfig.RestartPolicy.Name}}",
    $ContainerId
  )
  $restartPolicy = if ($restartInspect.ExitCode -eq 0) { $restartInspect.Output.Trim() } else { "" }

  $state = $inspect.Output | ConvertFrom-Json
  $healthStatus = $null
  if ($state.PSObject.Properties.Name -contains "Health" -and $state.Health) {
    $healthStatus = $state.Health.Status
  }
  $exitCode = $null
  if ($state.PSObject.Properties.Name -contains "ExitCode") {
    $exitCode = $state.ExitCode
  }

  $expectedStopped = (
    $state.Status -eq "exited" -and
    $exitCode -eq 0 -and
    ($restartPolicy -eq "no" -or $service -match "init")
  )

  $role = Get-ServiceRole -ServiceName $service
  $versionFinding = Get-VersionFinding -ImageRef $imageRef

  return [pscustomobject]@{
    id = $ContainerId
    name = $name
    service = $service
    role = $role
    image = $imageRef
    status = $state.Status
    health = $healthStatus
    exitCode = $exitCode
    restartPolicy = $restartPolicy
    expectedStopped = $expectedStopped
    expectedState = if ($expectedStopped) { "exited(0)" } else { "running" }
    versionFinding = $versionFinding
    portFindings = @()
    labelFindings = @()
    needsRecovery = (
      ((-not $expectedStopped) -and ($state.Status -ne "running")) -or
      ($healthStatus -eq "unhealthy")
    )
  }
}

function Invoke-Recovery {
  param(
    [object[]]$Containers,
    [string]$Project,
    [string[]]$ComposeFiles,
    [switch]$PreviewOnly
  )

  $recoverable = $Containers | Where-Object { $_.needsRecovery }
  if (-not $recoverable -or $recoverable.Count -eq 0) {
    return @()
  }

  $actions = @()
  if ($ComposeFiles -and $ComposeFiles.Count -gt 0) {
    $composeFileArgs = @()
    foreach ($file in $ComposeFiles) {
      $composeFileArgs += @("-f", $file)
    }

    $services = $recoverable |
      Where-Object { -not [string]::IsNullOrWhiteSpace($_.service) -and $_.service -ne "<no value>" } |
      Select-Object -ExpandProperty service -Unique

    if ($services -and $services.Count -gt 0) {
      $args = @("compose", "-p", $Project) + $composeFileArgs + @("up", "-d") + $services
      $actions += "docker $($args -join ' ')"
      if (-not $PreviewOnly) {
        $result = Invoke-CheckedCommand -FilePath "docker" -Arguments $args
        if ($result.ExitCode -ne 0) {
          throw "Compose recovery failed: $($result.Output)"
        }
      }
    } else {
      $args = @("compose", "-p", $Project) + $composeFileArgs + @("up", "-d")
      $actions += "docker $($args -join ' ')"
      if (-not $PreviewOnly) {
        $result = Invoke-CheckedCommand -FilePath "docker" -Arguments $args
        if ($result.ExitCode -ne 0) {
          throw "Compose recovery failed: $($result.Output)"
        }
      }
    }
  } else {
    foreach ($container in $recoverable) {
      $args = @("start", $container.id)
      $actions += "docker $($args -join ' ')"
      if (-not $PreviewOnly) {
        $result = Invoke-CheckedCommand -FilePath "docker" -Arguments $args
        if ($result.ExitCode -ne 0) {
          throw "Container start failed for $($container.name): $($result.Output)"
        }
      }
    }
  }

  return $actions
}

$common = Join-Path $PSScriptRoot "docker-replyline-compose-common.ps1"
. $common

$dockerInfo = Invoke-CheckedCommand -FilePath "docker" -Arguments @("info", "--format", "{{json .ServerVersion}}")
if ($dockerInfo.ExitCode -ne 0) {
  throw "Docker is not available: $($dockerInfo.Output)"
}

$composeContext = Resolve-ReplylineComposeContext -ComposeFile $ComposeFile -BaseComposeFile $BaseComposeFile -OverrideComposeFile $OverrideComposeFile
$composeConfig = Get-ComposeConfigJson -ComposeFiles $composeContext.Files
$composeSafety = Get-ComposeSafetyReport -ComposeConfig $composeConfig -Project $ProjectName
$desiredPorts = Get-ComposePublishedPorts -ComposeConfig $composeConfig
$runningPortInventory = Get-RunningContainerPortInventory -Project $ProjectName -ManagedLabelFilter $ManagedLabel
$listeningPorts = Get-ListeningTcpPorts
$portConflicts = Get-PortConflictReport -DesiredPorts $desiredPorts -RunningPortInventory $runningPortInventory -ListeningPorts $listeningPorts

$containerIds = Get-ManagedContainers -Project $ProjectName -ManagedLabelFilter $ManagedLabel

if (($null -eq $containerIds -or $containerIds.Count -eq 0) -and $AutoRecover) {
  if ($composeContext.Files.Count -gt 0) {
    if ($portConflicts.hasConflicts) {
      throw "Port preflight failed: conflicting published ports detected. Run docker:replyline:check for a remap suggestion report."
    }
    if (-not $composeSafety.safe -and -not $AllowUnsafeCompose) {
      throw "Compose file is unsafe for scoped auto-recover: $($composeSafety.unsafeServices -join '; '). Use a replyline-scoped compose file or pass -AllowUnsafeCompose explicitly."
    }
    $composeFileArgs = Get-ReplylineComposeFileArgs -ComposeFiles $composeContext.Files
    $upArgs = @("compose", "-p", $ProjectName) + $composeFileArgs + @("up", "-d")
    if ($DryRun) {
      Write-Info "Dry-run bootstrap: docker $($upArgs -join ' ')"
    } else {
      Write-Info "No managed containers found. Bootstrapping project from compose file."
      $upResult = Invoke-CheckedCommand -FilePath "docker" -Arguments $upArgs
      if ($upResult.ExitCode -ne 0) {
        throw "Bootstrap failed: $($upResult.Output)"
      }
    }
    $containerIds = Get-ManagedContainers -Project $ProjectName -ManagedLabelFilter $ManagedLabel
  }
}

$containers = @()
if ($containerIds) {
  foreach ($id in $containerIds) {
    $containers += Get-ContainerState -ContainerId $id
  }
}

$actions = @()
if ($AutoRecover -and $containers.Count -gt 0) {
  if ($portConflicts.hasConflicts) {
    throw "Port preflight failed: conflicting published ports detected. Run docker:replyline:check for a remap suggestion report."
  }
  if ($composeContext.Files.Count -gt 0 -and -not $composeSafety.safe -and -not $AllowUnsafeCompose) {
    throw "Compose file is unsafe for scoped recovery: $($composeSafety.unsafeServices -join '; '). Use a replyline-scoped compose file or pass -AllowUnsafeCompose explicitly."
  }
  $actions = Invoke-Recovery -Containers $containers -Project $ProjectName -ComposeFiles $composeContext.Files -PreviewOnly:$DryRun
  if (-not $DryRun -and @($actions).Count -gt 0) {
    Start-Sleep -Seconds 1
    $containers = @()
    $containerIds = Get-ManagedContainers -Project $ProjectName -ManagedLabelFilter $ManagedLabel
    foreach ($id in $containerIds) {
      $containers += Get-ContainerState -ContainerId $id
    }
  }
}

$unhealthyCount = ($containers | Where-Object { $_.health -eq "unhealthy" } | Measure-Object).Count
$stoppedCount = ($containers | Where-Object { $_.status -ne "running" -and -not $_.expectedStopped } | Measure-Object).Count
$expectedStoppedCount = ($containers | Where-Object { $_.expectedStopped } | Measure-Object).Count
$healthyCount = ($containers | Where-Object { $_.status -eq "running" -and ($_.health -eq $null -or $_.health -eq "healthy") } | Measure-Object).Count

$report = [pscustomobject]@{
  generatedAt = (Get-Date).ToString("s")
  projectName = $ProjectName
  managedLabel = $ManagedLabel
  composeMode = $composeContext.Mode
  composeFiles = $composeContext.Files
  composeSafety = $composeSafety
  portPreflight = $portConflicts
  autoRecover = [bool]$AutoRecover
  dryRun = [bool]$DryRun
  totals = [pscustomobject]@{
    discovered = $containers.Count
    runningHealthy = $healthyCount
    stopped = $stoppedCount
    expectedStopped = $expectedStoppedCount
    unhealthy = $unhealthyCount
  }
  recoveryActions = $actions
  recommendedLabels = @(
    "com.replyline.managed=true",
    "com.replyline.project=$ProjectName",
    "com.replyline.stack=ai-bridge"
  )
  warnings = [pscustomobject]@{
    missingComposeOverride = ($composeContext.Mode -eq "none")
    unsafeComposeContainerNames = (-not $composeSafety.safe)
    floatingImageTags = @($containers | Where-Object { $_.versionFinding -in @("floating-tag", "implicit-latest") } | Select-Object -ExpandProperty name)
    exitedExpected = @($containers | Where-Object { $_.expectedStopped } | Select-Object -ExpandProperty name)
  }
  containers = $containers
}

if ($Json) {
  $report | ConvertTo-Json -Depth 8
  exit 0
}

Write-Info "Project=$ProjectName Label=$ManagedLabel"
if ($composeContext.Files.Count -gt 0) {
  Write-Info "Compose mode: $($composeContext.Mode)"
  Write-Info "Compose files:"
  $composeContext.Files | ForEach-Object { Write-Host "  - $_" }
  if ($composeSafety.safe) {
    Write-Info "Compose safety: OK"
  } else {
    Write-Info "Compose safety: UNSAFE ($($composeSafety.reason))"
    if ($composeSafety.unsafeServices.Count -gt 0) {
      $composeSafety.unsafeServices | ForEach-Object { Write-Host "  - $_" }
    }
  }
} else {
  Write-Info "Compose file: not found (set -ComposeFile/-BaseComposeFile/-OverrideComposeFile or env vars)"
}

if ($portConflicts.checked) {
  Write-Info "Port preflight: checked $($portConflicts.desiredPorts.Count) published ports"
  if ($portConflicts.hasConflicts) {
    Write-Info "Port preflight: CONFLICTS detected"
    foreach ($conflict in $portConflicts.conflicts) {
      Write-Host "  - service=$($conflict.service) hostPort=$($conflict.published) target=$($conflict.target) reason=$($conflict.reason)"
      Write-Host "    safe remap suggestion: $($conflict.suggestedMapping)"
    }
  } else {
    Write-Info "Port preflight: OK"
  }
}

if ($containers.Count -eq 0) {
  Write-Info "No managed containers found."
} else {
  $containers |
    Select-Object name, service, role, status, health, exitCode, expectedStopped, versionFinding, needsRecovery |
    Format-Table -AutoSize
}

if (@($actions).Count -gt 0) {
  Write-Info "Recovery actions:"
  $actions | ForEach-Object { Write-Host "  - $_" }
}

if ($portConflicts.hasConflicts -or $stoppedCount -gt 0 -or $unhealthyCount -gt 0) {
  Write-Info "Health check completed with issues."
  exit 2
}

Write-Info "Health check passed."
exit 0
