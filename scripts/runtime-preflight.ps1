param()

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$settingsPath = Join-Path $env:APPDATA "com.replyline.app\settings.json"
$runtimeDir = Join-Path $root "reports\runtime"

function Test-CredentialServicePresence {
  param(
    [string]$ServiceName
  )

  try {
    $cmdkeyOutput = & cmdkey /list 2>$null
    if ($LASTEXITCODE -ne 0 -or -not $cmdkeyOutput) {
      return [pscustomobject]@{
        detectable = $false
        present = $null
        method = "cmdkey"
        note = "Credential listing unavailable on this workstation/session."
      }
    }

    $joined = ($cmdkeyOutput -join "`n")
    $present = $joined -match [regex]::Escape($ServiceName)
    return [pscustomobject]@{
      detectable = $true
      present = [bool]$present
      method = "cmdkey"
      note = "Service-level signal only; does not confirm specific key slots."
    }
  } catch {
    return [pscustomobject]@{
      detectable = $false
      present = $null
      method = "cmdkey"
      note = "Credential listing failed: $($_.Exception.Message)"
    }
  }
}

$settingsExists = Test-Path $settingsPath
$settingsData = $null
$settingsError = $null
if ($settingsExists) {
  try {
    $settingsData = Get-Content -Raw -Path $settingsPath | ConvertFrom-Json
  } catch {
    $settingsError = $_.Exception.Message
  }
}

$runtimeArtifacts = @()
if (Test-Path $runtimeDir) {
  $runtimeArtifacts = Get-ChildItem -Path $runtimeDir -File |
    Sort-Object LastWriteTimeUtc -Descending |
    Select-Object -First 10
}

$credSignal = Test-CredentialServicePresence -ServiceName "com.replyline.app.credentials"
$deepgramEnvPresent = -not [string]::IsNullOrWhiteSpace($env:DEEPGRAM_API_KEY)
$llmEnvPresent = (-not [string]::IsNullOrWhiteSpace($env:OPENROUTER_API_KEY)) -or (-not [string]::IsNullOrWhiteSpace($env:LLM_API_KEY))

$report = [ordered]@{
  generatedAtLocal = (Get-Date).ToString("s")
  lane = "runtime-preflight"
  workspaceRoot = $root
  readiness = [ordered]@{
    settingsFile = [ordered]@{
      path = $settingsPath
      exists = $settingsExists
      parseOk = if ($settingsExists) { [bool]($settingsData -ne $null -and $settingsError -eq $null) } else { $null }
      parseError = $settingsError
    }
    configuredFields = [ordered]@{
      llmBaseUrl = if ($settingsData) { $settingsData.llmBaseUrl } else { $null }
      llmModel = if ($settingsData) { $settingsData.llmModel } else { $null }
      captureMaxSeconds = if ($settingsData) { $settingsData.captureMaxSeconds } else { $null }
      primaryLanguage = if ($settingsData) { $settingsData.primaryLanguage } else { $null }
    }
    credentials = [ordered]@{
      deepgram = [ordered]@{
        envPresent = $deepgramEnvPresent
      }
      llm = [ordered]@{
        envPresent = $llmEnvPresent
      }
      credentialManagerService = $credSignal
    }
    runtimeReports = [ordered]@{
      directory = $runtimeDir
      exists = (Test-Path $runtimeDir)
      latestArtifactCount = $runtimeArtifacts.Count
      latestArtifacts = @(
        $runtimeArtifacts | ForEach-Object {
          [ordered]@{
            file = $_.Name
            lastWriteTimeUtc = $_.LastWriteTimeUtc.ToString("s")
            bytes = $_.Length
          }
        }
      )
    }
  }
  honesty = [ordered]@{
    proves = @(
      "Local configuration and artifact presence signals on this workstation.",
      "Whether key runtime files/settings are discoverable."
    )
    doesNotProve = @(
      "Provider keys are valid, non-expired, or authorized for target models.",
      "Runtime capture/transcription/card path succeeds end-to-end.",
      "Cross-machine readiness."
    )
  }
}

$report | ConvertTo-Json -Depth 8
