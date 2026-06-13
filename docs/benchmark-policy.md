# Replyline Benchmark Policy

Short reference for runtime claim labels. The canonical guide now lives in
[docs/engineering/runtime.md](engineering/runtime.md).

| Label                  | Meaning                                                      |
| ---------------------- | ------------------------------------------------------------ |
| `target`               | Intended design goal, not yet measured on a real machine     |
| `measured`             | Captured on a real workstation with a saved runtime artifact |
| `pending verification` | The path exists, but the proof is incomplete or noisy        |

## Rules

- Do not call latency `measured` without a saved artifact under `reports/runtime`.
- Do not treat `pnpm smoke`, `pnpm verify:*`, or mocked UI/E2E lanes as runtime proof.
- Do not turn one successful workstation run into a broad product claim.
- If current-build evidence is missing or stale, downgrade the claim to `pending verification`.
- Scope every `measured` claim to the machine and scenario family that produced the artifact.

## See also

- [engineering/runtime.md](engineering/runtime.md) - canonical claim-label, runtime-proof, and evidence-boundary guide.
- [engineering/testing.md](engineering/testing.md) - verify lanes and what they do or do not prove.
- [copy-rules.md](copy-rules.md) - wording guardrails for public/runtime claims.
