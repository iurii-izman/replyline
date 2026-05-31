# Consolidation Hardening Map (Block 0)

Date: 2026-05-31
Branch: `codex/block-0-consolidation-map`
Current HEAD SHA: `824dc734ea477bcdbe1bcfcae2b22bc5042b51ae`

## Scope

This document captures the factual baseline status before consolidation/hardening work.
No runtime/product behavior changes are included in this block.

## Baseline Command Matrix

Legend:
- `Blocking`: must be green for release/handoff confidence in this repository policy.
- `Advisory`: informative signal only for this block.

| Command | Status | Classification | Notes |
|---|---|---|---|
| `pnpm typecheck` | PASS | Blocking | Exit code `0`. |
| `pnpm lint` | PASS | Blocking | Exit code `0`. |
| `pnpm test:ui` | PASS | Blocking | `17` files / `162` tests passed. |
| `pnpm test:ipc-contract` | PASS | Blocking | Contract check passed (`38` commands, `9` categories). |
| `pnpm test:prompt-contract` | PASS | Blocking | `24` fixtures validated. |
| `pnpm test:interview-quality` | PASS | Blocking | `30/30` scenarios passed. |
| `pnpm report:interview-quality` | PASS | Advisory | Report generation succeeded (`30` total, `0` fail). |
| `pnpm test:locale-keys` | PASS | Blocking | `391` keys defined/referenced, violations `0`. |
| `pnpm test:security-lanes` | PASS | Blocking | Includes npm/rust security lanes; all passed. |
| `cargo check --manifest-path src-tauri/Cargo.toml` | PASS | Blocking | Exit code `0`. |
| `cargo clippy --manifest-path src-tauri/Cargo.toml -- -D warnings` | PASS | Blocking | No warnings (warnings denied). |
| `cargo test --manifest-path src-tauri/Cargo.toml` | PASS | Blocking | Rust test suites passed. |
| `pnpm smoke` | PASS | Blocking | Full smoke pipeline passed. |
| `pnpm verify` | PASS | Blocking | `verify:fast` pipeline passed. |
| `pnpm release:freeze:check` | PASS | Blocking | Guardrail passed. |
| `pnpm release:freeze:check:strict` | PASS | Blocking | Strict guardrail passed. |

## Failures / Skips

- Failures: none.
- Skipped checks: none.

## Known Risk Areas (Consolidation Targets)

1. Settings/migration drift
- Current signal: baseline green, migration tests present.
- Residual risk: versioned settings evolution can diverge between TS/Rust defaults and migration fixtures.

2. Interview DTO drift
- Current signal: interview contract/quality checks green.
- Residual risk: schema and mapper changes can drift across backend DTO, frontend model, and prompt expectations.

3. Locale/copy drift
- Current signal: locale key contract green.
- Residual risk: semantic mismatch (RU-first intent/copy policy) may not always be fully captured by key-existence checks.

4. Privacy call-site drift
- Current signal: security lanes and privacy-focused tests green.
- Residual risk: new logging call-sites can bypass redaction conventions if not covered by targeted tests.

5. Model preset payload drift
- Current signal: consistency/model-preset contracts green (via smoke/verify).
- Residual risk: preset structure can diverge between UI selection, transport payload, and backend known IDs.

6. Prompt registry drift
- Current signal: prompt contract and quality checks green.
- Residual risk: prompt profile rules and downstream validators can desync without synchronized fixture updates.

7. Work/Interview behavior parity
- Current signal: both mode-specific paths are exercised by tests and smoke.
- Residual risk: parity regressions can appear in shared pipeline paths (capture -> STT -> LLM -> card) when one mode changes.

8. Release gate ambiguity
- Current signal: freeze checks pass in normal and strict modes.
- Residual risk: interpretation of which checks are blocking vs advisory can drift without a single documented matrix per block.

Update (Block 9, release gate honesty):
- `release:freeze:check` is explicitly documented as advisory visibility output.
- `release:freeze:check:strict` is explicitly documented and wired as blocking in `verify:full`.
- PR handoff template now requires explicit `Advisory findings`, `Blocking findings`, and `Deferred with reason`.

## Baseline Conclusion

Baseline is fully green at this snapshot.
This block is a safe control point for subsequent consolidation/hardening blocks because it introduces documentation only and no runtime changes.
