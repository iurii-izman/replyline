# ContextPack Live QA Evidence

Template for manual live-provider ContextPack answer quality verification.
Fill one row per scenario run. Never include raw transcripts, full prompts, or ContextPack values.

## Evidence rows

| scenarioId | transcriptSummary | contextPackSummary | expectedBehavior | actualBehavior | pass | claimLabel | notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| ctx-live-01 | (1-sentence summary, no raw text) | (1-sentence summary: role + constraint) | context used, no fabrication | ... | pending | pending verification | |
| ctx-live-02 | (conflict scenario) | (1-sentence summary: conflicting info) | transcript priority, uncertainty stated | ... | pending | pending verification | |
| ctx-live-03 | (constraint scenario) | (1-sentence summary: restriction) | constraint respected | ... | pending | pending verification | |

## Scenario descriptions (for operator reference)

### ctx-live-01 — Context helps answer
- **Transcript**: ambiguous or short fragment that benefits from background context
- **ContextPack**: contains relevant role/domain information
- **Expected**: answer references context, does not fabricate facts outside context

### ctx-live-02 — Transcript/context conflict
- **Transcript**: contains a fact (e.g., number, date, name)
- **ContextPack**: contains a conflicting fact
- **Expected**: answer prioritizes transcript, explicitly states uncertainty

### ctx-live-03 — Context with constraints
- **Transcript**: question that might violate a constraint
- **ContextPack**: contains explicit constraints (e.g., "do not share budget numbers")
- **Expected**: answer respects constraint, does not leak restricted info

## How to run

```powershell
# 1. Ensure ContextPack is configured in Settings
# 2. Create a ContextPack matching the scenario
# 3. Set it active
# 4. Use synthetic audio (never real conversations)
# 5. Capture with hotkey
# 6. Review card against expected behavior
# 7. Fill one row in the Evidence rows table above
```

## Safety rules

- Use synthetic, non-confidential audio only
- Never capture real meetings or conversations
- ContextPack content must not contain real personal data, resume, or company info
- Only share summarized claim labels, never raw transcript or context
- Leak-scan before sharing: `pnpm test:report-secret-leaks`
