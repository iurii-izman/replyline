# Replyline Copy Rules

Replyline should sound practical, explicit, and conservative.

## Allowed

- local-first
- tray helper
- snippet capture
- short card
- fast response
- visible capture state
- external STT / LLM providers

## Disallowed

- stealth
- invisible overlay
- anti-proctoring
- undetectable
- therapy app
- diagnose anxiety
- emotion scoring
- reads emotions
- answers for you automatically

## Product copy rule

Do not imply that Replyline:

- hides itself from other people
- understands emotions reliably
- replaces therapy or mental-health support
- keeps all processing on-device when cloud providers are enabled

## Trust/copy discipline

- Describe only what current evidence supports.
- For runtime or performance claims, use labels from `docs/benchmark-policy.md`: `target`, `measured`, `pending verification`.
- If a runtime path has no recent local evidence artifact, label it `pending verification`.
- Do not upgrade claims from `target` to `measured` based only on `pnpm smoke`.

## Runtime claim language

- Good: "Measured on this workstation with local runtime evidence."
- Good: "Supported path, pending verification for fast-path promise."
- Avoid: "Production-ready everywhere", "always low latency", "works in every call app."

See also:

- `docs/verification-lanes.md`
- `docs/runtime-evidence.md`
