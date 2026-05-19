param(
  [string]$SettingsPath,
  [string]$RuntimeDir
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
if ([string]::IsNullOrWhiteSpace($SettingsPath)) {
  $settingsPath = Join-Path $env:APPDATA "com.replyline.app\settings.json"
} else {
  $settingsPath = $SettingsPath
}
if ([string]::IsNullOrWhiteSpace($RuntimeDir)) {
  $runtimeDir = Join-Path $root "reports\runtime"
} else {
  $runtimeDir = $RuntimeDir
}

function Get-JsonPropertyOrNull {
  param(
    [object]$InputObject,
    [string]$PropertyName
  )

  if ($null -eq $InputObject) {
    return $null
  }

  $prop = $InputObject.PSObject.Properties[$PropertyName]
  if ($null -eq $prop) {
    return $null
  }

  return $prop.Value
}

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

$expectedSettingsFields = @(
  "schemaVersion",
  "hotkey",
  "llmBaseUrl",
  "llmModel",
  "selectedModelPreset",
  "captureMaxSeconds",
  "activeAnswerProfile",
  "windowOpacity",
  "hideToTrayOnClose",
  "keepOnTopDuringCapture",
  "interviewCompactMode",
  "interviewReportRetentionDays"
)

$settingsFieldNames = @()
if ($settingsData) {
  $settingsFieldNames = @($settingsData.PSObject.Properties.Name)
}
$knownFieldsPresent = @($expectedSettingsFields | Where-Object { $settingsFieldNames -contains $_ })
$missingExpectedFields = @($expectedSettingsFields | Where-Object { $settingsFieldNames -notcontains $_ })
$extraFields = @($settingsFieldNames | Where-Object { $expectedSettingsFields -notcontains $_ })

$schemaWarning = $null
if ($settingsExists -and $settingsError) {
  $schemaWarning = "Settings JSON parse failed; schema field diagnostics are unavailable."
} elseif ($settingsExists -and -not $settingsData) {
  $schemaWarning = "Settings file exists but could not be loaded as an object."
}

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
      schemaVersion = Get-JsonPropertyOrNull -InputObject $settingsData -PropertyName "schemaVersion"
      hotkey = Get-JsonPropertyOrNull -InputObject $settingsData -PropertyName "hotkey"
      llmBaseUrl = Get-JsonPropertyOrNull -InputObject $settingsData -PropertyName "llmBaseUrl"
      llmModel = Get-JsonPropertyOrNull -InputObject $settingsData -PropertyName "llmModel"
      selectedModelPreset = Get-JsonPropertyOrNull -InputObject $settingsData -PropertyName "selectedModelPreset"
      captureMaxSeconds = Get-JsonPropertyOrNull -InputObject $settingsData -PropertyName "captureMaxSeconds"
      activeAnswerProfile = Get-JsonPropertyOrNull -InputObject $settingsData -PropertyName "activeAnswerProfile"
      windowOpacity = Get-JsonPropertyOrNull -InputObject $settingsData -PropertyName "windowOpacity"
      hideToTrayOnClose = Get-JsonPropertyOrNull -InputObject $settingsData -PropertyName "hideToTrayOnClose"
      keepOnTopDuringCapture = Get-JsonPropertyOrNull -InputObject $settingsData -PropertyName "keepOnTopDuringCapture"
      interviewCompactMode = Get-JsonPropertyOrNull -InputObject $settingsData -PropertyName "interviewCompactMode"
      interviewReportRetentionDays = Get-JsonPropertyOrNull -InputObject $settingsData -PropertyName "interviewReportRetentionDays"
    }
    schema = [ordered]@{
      schemaVersion = Get-JsonPropertyOrNull -InputObject $settingsData -PropertyName "schemaVersion"
      knownFieldsPresent = $knownFieldsPresent
      missingExpectedFields = $missingExpectedFields
      extraFields = $extraFields
      schemaWarning = $schemaWarning
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
