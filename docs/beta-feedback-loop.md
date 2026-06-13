# Trusted Beta Feedback Loop

## Tester input

Use `docs/engineering/manual-qa.md` for every trusted beta session.

## Fast triage (per issue)

Capture these fields:

- frequency: once / sometimes / always
- severity: S0/S1/S2/S3 (`docs/engineering/release.md`)
- reproducibility: high / medium / low
- action: fix now / schedule / monitor

## Triage cadence

1. Daily: cluster repeated reports by scenario.
2. Before release: resolve S0/S1 to zero.
3. Weekly: run `pnpm beta:health-report` and review S2 trends (latency drift, retry growth, recurrent provider degradation).

## Output artifact

Maintain a single session note with:

- issue id/title
- class (audio routing, hotkey, latency, bad say_now, trust/legal, other)
- frequency/severity/reproducibility/action
- owner + target date

Weekly scaffold output:

- `artifacts/beta-health-report/YYYY-MM-DD.md`

## PMF evidence ledger (summary-only, no sensitive raw content)

Maintain `PMF Evidence Ledger` as a compact table per tester wave:

- wave id/date
- tester count
- scenarios covered (`WorkConversation`, `Interview`)
- setup friction trend (none/low/medium/high counts)
- usefulness trend (median and p25 for overall/card usefulness)
- trust concerns count (and resolved/unresolved split)
- latency tolerance vs perceived wait (summary)
- mode confusion rate
- candidate pack clarity trend
- interview report usefulness trend
- top 3 blockers
- decisions taken + owner + date

Rules:

- Store only summarized findings and redacted short excerpts.
- Never store raw transcripts, full reports, provider bodies, raw candidate data, or secrets.

## Interview Mode posture decision log

For each wave, evaluate Interview Mode posture:

- `core beta`: Interview metrics consistently meet acceptance criteria and trust risk remains controlled.
- `optional beta`: useful for a subset, but not yet stable enough for core claim.
- `gated beta`: trust/misuse/confusion risks are material; enable only for explicitly scoped testers.

Record:

- decision (`core beta` / `optional beta` / `gated beta`)
- evidence refs (ledger rows)
- risks and mitigations
- recheck date
