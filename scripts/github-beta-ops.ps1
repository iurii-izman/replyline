param(
  [switch]$ApplyLabels,
  [switch]$ApplyMilestones,
  [string]$Repo = "iurii-izman/replyline"
)

$ErrorActionPreference = "Stop"

$labels = @(
  @{ Name = "area:setup"; Color = "1d76db"; Description = "Install, prerequisites, settings, first-run blockers" },
  @{ Name = "area:runtime"; Color = "5319e7"; Description = "Runtime behavior, capture flow, retries, tray state" },
  @{ Name = "area:stt"; Color = "0052cc"; Description = "Deepgram or STT-stage issues" },
  @{ Name = "area:llm"; Color = "0e8a16"; Description = "Provider route, model, or LLM request issues" },
  @{ Name = "area:interview"; Color = "fbca04"; Description = "Interview Mode issues and feedback" },
  @{ Name = "area:candidate-pack"; Color = "c2e0c6"; Description = "Candidate Pack import or UX issues" },
  @{ Name = "area:report"; Color = "bfdadc"; Description = "Report generation or export issues" },
  @{ Name = "area:privacy-trust"; Color = "b60205"; Description = "Privacy, trust, redaction, or wording issues" },
  @{ Name = "area:docs"; Color = "0075ca"; Description = "Docs clarity, setup guidance, support text" },
  @{ Name = "area:release"; Color = "d4c5f9"; Description = "Beta launch, packaging, signing, release flow" },
  @{ Name = "type:bug"; Color = "d73a4a"; Description = "Confirmed or suspected defect" },
  @{ Name = "type:feedback"; Color = "a2eeef"; Description = "User feedback or scoped improvement" },
  @{ Name = "type:question"; Color = "f9d0c4"; Description = "Setup or usage question" },
  @{ Name = "type:compatibility"; Color = "7057ff"; Description = "Provider compatibility result" },
  @{ Name = "priority:p0"; Color = "b60205"; Description = "Release-blocking beta risk" },
  @{ Name = "priority:p1"; Color = "d93f0b"; Description = "Significant issue in current beta cycle" },
  @{ Name = "priority:p2"; Color = "fbca04"; Description = "Non-blocking beta follow-up" },
  @{ Name = "status:needs-info"; Color = "ededed"; Description = "Waiting for reporter follow-up" },
  @{ Name = "status:confirmed"; Color = "0e8a16"; Description = "Reproduced or validated" },
  @{ Name = "status:blocked"; Color = "000000"; Description = "Blocked by prerequisite or dependency" },
  @{ Name = "status:stale-candidate"; Color = "cfd3d7"; Description = "Candidate for human stale review only" },
  @{ Name = "beta"; Color = "0366d6"; Description = "Beta program tracking umbrella" }
)

$milestones = @(
  @{ Title = "v0.2.0-beta.2"; Description = "Targeted fixes and polish for beta.2 release wave." },
  @{ Title = "beta-feedback"; Description = "Cross-cutting beta feedback intake and triage bucket." },
  @{ Title = "provider-compatibility"; Description = "Compatibility coverage across supported provider routes." }
)

function Test-GhReady {
  $null = & gh --version 2>$null
  if ($LASTEXITCODE -ne 0) {
    return $false
  }

  & gh auth status 1>$null 2>$null
  return $LASTEXITCODE -eq 0
}

function Ensure-Label {
  param([hashtable]$Label)

  & gh label create $Label.Name --repo $Repo --color $Label.Color --description $Label.Description 1>$null 2>$null
  if ($LASTEXITCODE -eq 0) {
    Write-Host "[github-beta-ops] created label $($Label.Name)"
    return
  }

  & gh label edit $Label.Name --repo $Repo --color $Label.Color --description $Label.Description 1>$null
  if ($LASTEXITCODE -ne 0) {
    throw "Failed to create or edit label $($Label.Name)"
  }
  Write-Host "[github-beta-ops] updated label $($Label.Name)"
}

function Ensure-Milestone {
  param([hashtable]$Milestone, [array]$ExistingMilestones)

  $existing = $ExistingMilestones | Where-Object { $_.title -eq $Milestone.Title } | Select-Object -First 1
  if ($null -ne $existing) {
    Write-Host "[github-beta-ops] milestone exists $($Milestone.Title)"
    return
  }

  & gh api "repos/$Repo/milestones" --method POST -f title="$($Milestone.Title)" -f description="$($Milestone.Description)" -f state="open" 1>$null
  if ($LASTEXITCODE -ne 0) {
    throw "Failed to create milestone $($Milestone.Title)"
  }
  Write-Host "[github-beta-ops] created milestone $($Milestone.Title)"
}

if (-not $ApplyLabels -and -not $ApplyMilestones) {
  Write-Host "Usage: pwsh -File scripts/github-beta-ops.ps1 -ApplyLabels -ApplyMilestones"
  exit 0
}

if (-not (Test-GhReady)) {
  Write-Warning "gh CLI is unavailable or unauthenticated. No labels or milestones were changed."
  Write-Host "Manual follow-up:"
  Write-Host "- Review docs/github-beta-operations-kit.md"
  Write-Host "- Create labels: $($labels.Name -join ', ')"
  Write-Host "- Create milestones: $($milestones.Title -join ', ')"
  exit 0
}

if ($ApplyLabels) {
  foreach ($label in $labels) {
    Ensure-Label -Label $label
  }
}

if ($ApplyMilestones) {
  $existingMilestones = & gh api "repos/$Repo/milestones?state=all&per_page=100" | ConvertFrom-Json
  foreach ($milestone in $milestones) {
    Ensure-Milestone -Milestone $milestone -ExistingMilestones $existingMilestones
  }
}
