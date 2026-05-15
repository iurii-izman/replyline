# Trusted Beta Feedback Loop

## Tester input

Use `docs/test-feedback-template.md` for every trusted beta session.

## Fast triage (per issue)

Capture these fields:

- frequency: once / sometimes / always
- severity: S0/S1/S2/S3 (`docs/release-incident-classification.md`)
- reproducibility: high / medium / low
- action: fix now / schedule / monitor

## Triage cadence

1. Daily: cluster repeated reports by scenario.
2. Before release: resolve S0/S1 to zero.
3. Weekly: review S2 trends (latency drift, retry growth, recurrent provider degradation).

## Output artifact

Maintain a single session note with:

- issue id/title
- class (audio routing, hotkey, latency, bad say_now, trust/legal, other)
- frequency/severity/reproducibility/action
- owner + target date
