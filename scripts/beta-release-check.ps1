param()

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptDir

$results = New-Object System.Collections.Generic.List[object]

function Add-Result {
  param(
    [string]$Name,
    [string]$Status,
    [string]$Evidence,
    [string]$NextAction = "",
    [string]$Kind = "auto"
  )

  $results.Add([pscustomobject]@{
      name       = $Name
      status     = $Status
      evidence   = $Evidence
      nextAction = $NextAction
      kind       = $Kind
    })
}

function Test-PathStatus {
  param(
    [string]$Name,
    [string]$Path,
    [string]$Kind = "doc",
    [switch]$Required,
    [string]$MissingAction = ""
  )

  if (Test-Path -LiteralPath $Path) {
    Add-Result -Name $Name -Status "PASS" -Evidence "Found: $Path" -Kind $Kind
    return $true
  }

  $status = if ($Required) { "FAIL" } else { "WARN" }
  $action = if ($MissingAction) { $MissingAction } elseif ($Required) { "Add the missing file and rerun beta:release-check." } else { "Create the file only if this beta track needs it." }
  Add-Result -Name $Name -Status $status -Evidence "Missing: $Path" -NextAction $action -Kind $Kind
  return $false
}

function Invoke-CommandCheck {
  param(
    [string]$Name,
    [string]$Command,
    [string[]]$CommandArgs = @(),
    [string]$NextAction = ""
  )

  Write-Host ""
  Write-Host "==> $Name"

  if ($IsWindows) {
    $commandFile = if ($Command -eq "pnpm") { "pnpm.cmd" } else { $Command }
    $commandText = $commandFile
    if ($CommandArgs.Count -gt 0) {
      $commandText = "$commandFile $($CommandArgs -join ' ')"
    }
    & cmd.exe /c $commandText
  } else {
    & $Command @CommandArgs
  }
  $exitCode = $LASTEXITCODE
  if ($exitCode -eq 0) {
    Add-Result -Name $Name -Status "PASS" -Evidence "Exit code 0 via $Command." -Kind "command"
    return $true
  }

  Add-Result -Name $Name -Status "FAIL" -Evidence "Exit code $exitCode via $Command." -NextAction $NextAction -Kind "command"
  return $false
}

function Add-ManualChecklist {
  $manualItems = @(
    @{ name = "first-run setup UX audit"; action = "Verify first-launch guidance, settings flow, and readiness hints in docs/release-checklist.md." },
    @{ name = "keyboard-only accessibility"; action = "Verify the entire release flow can be driven with keyboard only." },
    @{ name = "clean Windows profile install"; action = "Verify on a separate clean Windows profile before release claims." },
    @{ name = "Deepgram setup path"; action = "Verify key entry, error handling, and recovery steps." },
    @{ name = "OpenRouter setup path"; action = "Verify provider base URL, key, and model selection." },
    @{ name = "custom OpenAI-compatible path"; action = "Verify custom endpoint and model configuration." },
    @{ name = "Candidate Pack preparation"; action = "Verify prepare/save/clear and preview flow in Interview Mode." },
    @{ name = "Interview report export"; action = "Verify full and redacted export paths before sharing." },
    @{ name = "uninstall/clear local data note"; action = "Verify the uninstall and local data guidance in docs/release-checklist.md." }
  )

  foreach ($item in $manualItems) {
    Add-Result -Name $item.name -Status "WARN" -Evidence "Manual verification required." -NextAction $item.action -Kind "manual"
  }
}

Write-Host "# Replyline v0.2.0-beta.2 release readiness check"
Write-Host ""

$checks = @(
  @{
    name       = "beta:doctor"
    command    = "pnpm"
    args       = @("beta:doctor")
    nextAction = "Fix any WARN/FAIL rows from beta:doctor first."
  },
  @{
    name       = "beta:smoke-report"
    command    = "pnpm"
    args       = @("beta:smoke-report")
    nextAction = "Open artifacts/beta-smoke-report/smoke-report.md and attach the sanitized report."
  },
  @{
    name       = "smoke"
    command    = "pnpm"
    args       = @("smoke")
    nextAction = "Fix the failing smoke lane before release handoff."
  },
  @{
    name       = "verify:fast"
    command    = "pnpm"
    args       = @("verify:fast")
    nextAction = "Fix the failing verify:fast lane before release handoff."
  },
  @{
    name       = "test:interview-quality"
    command    = "pnpm"
    args       = @("test:interview-quality")
    nextAction = "Fix the interview-quality regression before release handoff."
  },
  @{
    name       = "report:interview-quality"
    command    = "pnpm"
    args       = @("report:interview-quality")
    nextAction = "Regenerate the interview-quality report after fixing the failure."
  },
  @{
    name       = "test:doc-links"
    command    = "pnpm"
    args       = @("test:doc-links")
    nextAction = "Fix the broken markdown link before release handoff."
  },
  @{
    name       = "release:freeze:check:strict"
    command    = "pnpm"
    args       = @("release:freeze:check:strict")
    nextAction = "Bring the changed files back inside freeze guardrails before release handoff."
  }
)

foreach ($check in $checks) {
  Invoke-CommandCheck -Name $check.name -Command $check.command -CommandArgs $check.args -NextAction $check.nextAction | Out-Null
}

Write-Host ""
Write-Host "==> Required release docs and assets"
Test-PathStatus -Name "CHANGELOG.md" -Path (Join-Path $repoRoot "CHANGELOG.md") -Required | Out-Null
Test-PathStatus -Name "release notes draft" -Path (Join-Path $repoRoot "docs/releases/v0.2.0-beta.2.md") -Required | Out-Null
Test-PathStatus -Name "release checklist" -Path (Join-Path $repoRoot "docs/release-checklist.md") -Required | Out-Null
Test-PathStatus -Name "beta readiness doc" -Path (Join-Path $repoRoot "docs/beta-readiness.md") -Required | Out-Null
Test-PathStatus -Name "beta smoke report doc" -Path (Join-Path $repoRoot "docs/beta-smoke-report.md") -Required | Out-Null
Test-PathStatus -Name "beta doctor doc" -Path (Join-Path $repoRoot "docs/beta-doctor.md") -Required | Out-Null
Test-PathStatus -Name "release screenshots checklist" -Path (Join-Path $repoRoot "docs/releases/v0.2.0-beta.2/screenshots/README.md") -Required | Out-Null

Write-Host ""
Write-Host "==> Optional docs/asset presence"
$issueFormsDir = Join-Path $repoRoot ".github/ISSUE_TEMPLATE"
if (Test-Path -LiteralPath $issueFormsDir) {
  $requiredIssueForms = @(
    (Join-Path $issueFormsDir "bug_report.md"),
    (Join-Path $issueFormsDir "beta_handoff_release.md"),
    (Join-Path $issueFormsDir "config.yml")
  )
  foreach ($path in $requiredIssueForms) {
    Test-PathStatus -Name ("issue form: " + (Split-Path $path -Leaf)) -Path $path -Required | Out-Null
  }
} else {
  Add-Result -Name "issue forms" -Status "WARN" -Evidence "No .github/ISSUE_TEMPLATE directory found." -NextAction "Add issue forms if beta issue routing needs them." -Kind "doc"
}

$launchKitCandidates = @(
  (Join-Path $repoRoot "docs/launch-kit.md"),
  (Join-Path $repoRoot "docs/launch-kit/README.md"),
  (Join-Path $repoRoot "docs/launch-kit/index.md")
)
$launchKitFound = $false
foreach ($candidate in $launchKitCandidates) {
  if (Test-Path -LiteralPath $candidate) {
    $launchKitFound = $true
    Add-Result -Name "launch kit docs" -Status "PASS" -Evidence "Found: $candidate" -Kind "doc"
    break
  }
}
if (-not $launchKitFound) {
  Add-Result -Name "launch kit docs" -Status "WARN" -Evidence "No launch kit docs added in this repo snapshot." -NextAction "Keep this as N/A until launch kit docs are introduced." -Kind "doc"
}

Add-ManualChecklist

$passCount = ($results | Where-Object { $_.status -eq "PASS" }).Count
$warnCount = ($results | Where-Object { $_.status -eq "WARN" }).Count
$failCount = ($results | Where-Object { $_.status -eq "FAIL" }).Count
$overall = if ($failCount -gt 0) { "FAIL" } elseif ($warnCount -gt 0) { "WARN" } else { "PASS" }

Write-Host ""
Write-Host "Summary"
Write-Host "Status: $overall"
Write-Host "Pass: $passCount  Warn: $warnCount  Fail: $failCount"
Write-Host ""
Write-Host "| Check | Status | Evidence | Next action |"
Write-Host "| --- | --- | --- | --- |"
foreach ($row in $results) {
  $evidence = $row.evidence -replace '\|', '/'
  $nextAction = $row.nextAction -replace '\|', '/'
  Write-Host "| $($row.name) | $($row.status) | $evidence | $nextAction |"
}

if ($failCount -gt 0) {
  exit 1
}

exit 0
