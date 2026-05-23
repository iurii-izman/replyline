# Replyline Verification Lanes

Replyline uses four separate verification lanes. Green in one lane does not imply green in another lane.

| Lane              | Main command                                                                                                       | What it proves                                                                                                                                   | What it does not prove                                                |
| ----------------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------- |
| Compile + unit    | `pnpm smoke`                                                                                                       | Vite build, Rust compile, Rust clippy/fmt/test, unit tests, consistency gate, prompt contract, copy gate                                         | Real Tauri runtime, loopback capture, provider latency                |
| Mock / UI         | `pnpm test:ui`                                                                                                     | UI state machine on a mocked platform bridge: bootstrap, settings flow, hotkey fallback, result card surface, copy flow, diagnostic states       | Real Windows audio, real STT, real LLM, packaged Tauri shell behavior |
| Prompt / contract | `pnpm test:prompt-contract`, `pnpm test:say-now-scenarios`                                                         | Output shape stays `gist / say_now / next_move`; deterministic trust/copy policy checks stay enforced; thin scenario heuristics on example cards | Real usefulness in live calls, provider quality in real runtime       |
| Runtime proof     | `pnpm probe:runtime`, `pnpm probe:bench`, `pnpm probe:durations`, `pnpm probe:live-source`, `pnpm evidence:bundle`, `pnpm report:live-evidence-pack` | Real local provider path, real Windows capture path, runtime artifacts from this workstation + structured manual attestation scaffold             | Same behavior on every workstation or call app                        |

## Current truth

- `pnpm smoke` is the fast default gate.
- `pnpm smoke` now includes `pnpm test:ui`, `pnpm test:consistency`, `pnpm test:prompt-contract`, and `pnpm copy:check`.
- `pnpm test:ui` is the current truth for frontend state-machine verification; it is mock-based, not runtime proof.
- `pnpm test:prompt-contract` is deterministic and provider-free.
- `pnpm probe:runtime` is the minimum real-provider proof.
- `pnpm probe:bench` compares runtime variants.
- `pnpm evidence:bundle` collects local JSON/Markdown artifacts for a specific run.
- `pnpm report:live-evidence-pack` creates strict machine-readable manual attestation scaffold in `reports/manual/`.

## Lifecycle matrix (required vs optional)

- `required`: `pnpm smoke` (includes `pnpm test:prompt-contract` and `pnpm copy:check`), `pnpm verify`, `pnpm test:security-lanes`, `pnpm rust:deps`, `pnpm audit:npm`
- `required`: `pnpm release:freeze:check` (change visibility against stable-beta guardrails)
- `optional`: `pnpm test:ui:coverage`, `pnpm test:fixtures`, `pnpm test:say-now-scenarios`, `pnpm test:optional:*`
- `optional`: `pnpm probe:soak`, `pnpm check:slo`
- `experimental`: `pnpm test:optional:perf:k6`, `pnpm test:optional:sec:zap`, `pnpm test:experimental`

## Label discipline across lanes

Use benchmark labels consistently in docs, release notes, and product copy:

- `target`: intended design goal; no local runtime artifact yet
- `measured`: backed by local runtime artifact(s) under `reports/runtime` or a bundle folder
- `pending verification`: path exists but evidence is incomplete, noisy, or stale

Lane rule:

- `pnpm smoke` results cannot upgrade any runtime claim to `measured`.
- `pnpm test:ui` results cannot upgrade any runtime claim to `measured`.
- Only runtime lane artifacts can upgrade runtime claims to `measured`.

## See also

- [benchmark-policy.md](benchmark-policy.md) — лейблы `target / measured / pending verification`.
- [runtime-evidence.md](runtime-evidence.md) — где живут артефакты, минимальное качество.
- [`prompt-contract-lane.md`](prompt-contract-lane.md)
- [`smoke-checks.md`](smoke-checks.md)
- [`rust-dependency-security.md`](rust-dependency-security.md)

## Readiness before claims

Do not claim a runtime path is ready until there is at least one real local evidence artifact under `reports/` showing:

- captured audio duration
- transcript
- provider path used
- release-to-card latency

- [runtime-bringup.md](runtime-bringup.md) — как поднять runtime path первый раз.
- [copy-rules.md](copy-rules.md) — формулировки и баны.
