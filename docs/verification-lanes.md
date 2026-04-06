# Replyline Verification Lanes

Replyline uses four separate verification lanes. Green in one lane does not imply green in another lane.

| Lane | Main command | What it proves | What it does not prove |
|---|---|---|---|
| Compile + unit | `pnpm smoke` | Vite build, Rust compile, unit tests, fixture checks | Real Tauri runtime, loopback capture, provider latency |
| Mock / UI | future Playwright lane | UI state machine, settings flow, result card behavior | Real Windows audio, real STT, real LLM |
| Prompt / contract | `pnpm test:prompt-contract` | Output shape stays `gist / say_now / next_move`; deterministic trust/copy policy checks stay enforced | Real usefulness in live calls, provider quality in real runtime |
| Runtime proof | `pnpm probe:runtime`, `pnpm probe:bench`, `pnpm evidence:bundle` | Real local provider path, real Windows capture path, measured latency on this workstation | Same behavior on every workstation or call app |

## Current truth

- `pnpm smoke` is the fast default gate.
- `pnpm test:prompt-contract` is deterministic and provider-free.
- `pnpm probe:runtime` is the minimum real-provider proof.
- `pnpm probe:bench` compares runtime variants.
- `pnpm evidence:bundle` collects local JSON/Markdown artifacts for a specific run.

## Label discipline across lanes

Use benchmark labels consistently in docs, release notes, and product copy:

- `target`: intended design goal; no local runtime artifact yet
- `measured`: backed by local runtime artifact(s) under `reports/runtime` or a bundle folder
- `pending verification`: path exists but evidence is incomplete, noisy, or stale

Lane rule:

- `pnpm smoke` results cannot upgrade any runtime claim to `measured`.
- Only runtime lane artifacts can upgrade runtime claims to `measured`.

See also:

- `docs/benchmark-policy.md`
- `docs/runtime-evidence.md`
- `docs/prompt-contract-lane.md`
- `docs/smoke-checks.md`
- `docs/rust-dependency-security.md`

## Readiness before claims

Do not claim a runtime path is ready until there is at least one real local evidence artifact under `reports/` showing:

- captured audio duration
- transcript
- provider path used
- release-to-card latency
