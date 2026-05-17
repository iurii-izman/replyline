# Beta Readiness Handoff

Single handoff doc for preparing an internal stable-beta build.

## 1) Product scope

Replyline stable beta is a narrow runtime path:

- `capture -> stt -> llm -> card`
- one card schema: `gist / say_now / next_move`
- Windows-first desktop tray workflow

Out of scope for current beta:

- no meeting assistant
- no transcript tool
- no speaking coach
- no transcript/history UI
- no Advanced Mode user surface

## 2) Supported runtime path

Supported provider/runtime path for stable beta:

- OS: Windows 10/11
- audio capture: WASAPI loopback while hotkey is held
- STT: Deepgram integration (configured by user)
- LLM: OpenAI-compatible endpoint (configured by user)
- app stack: Tauri (Rust backend) + Solid.js frontend

## 3) Setup checklist

1. Install prerequisites: Node.js + `pnpm`, Rust toolchain, Windows build prerequisites for Tauri.
2. Install dependencies: `pnpm install --frozen-lockfile`.
3. Configure providers in Settings:
   - Deepgram API key
   - LLM base URL
   - LLM model
   - optional LLM API key
4. Verify a valid playback device is set as default in Windows Sound settings.
5. Run baseline gates:
   - `pnpm smoke`
   - `pnpm verify`

## 4) Preflight checklist (before beta build/handoff)

1. Run `pnpm beta:preflight` (composite preflight lane).
2. Ensure runtime evidence bundle exists from the run (`pnpm evidence:bundle` is part of preflight).
3. Run release guardrail check: `pnpm release:freeze:check`.
4. Confirm scope/trust wording remains aligned with:
   - `docs/copy-rules.md`
   - `docs/known-limitations.md`
5. Confirm no deprecated alpha command is used as primary instruction in handoff docs.

## 5) Privacy checklist (baseline)

1. Secrets are stored via OS keyring path; do not place provider keys in docs, examples, or committed artifacts.
2. Do not export/share raw `settings.json` if it contains sensitive runtime values.
3. Treat `reports/` as sensitive review material:
   - runtime/evidence artifacts may contain transcript/card content
   - redact before external sharing
4. Verify trust language stays honest:
   - do not claim "nothing is ever stored anywhere"
   - do not claim full local-only processing when cloud providers are enabled
5. Use `docs/privacy-and-trust.md` as privacy source of truth for stable beta.

## 6) Validation commands

Required validation lane for this handoff:

1. `pnpm test:doc-links`
2. `pnpm test:consistency`
3. `pnpm smoke`
4. `pnpm verify:fast`
5. `pnpm verify:full` (release candidate profile)

Additional release-safety lanes (run when applicable):

- `pnpm release:freeze:check`
- `pnpm rust:deps` (when Rust dependencies changed)
- `pnpm audit:npm` (when `package.json` or `pnpm-lock.yaml` changed)

## 7) Known limitations

Use `docs/known-limitations.md` as canonical list. Minimum truths to keep in every beta handoff:

- cross-machine and cross-call-app behavior is still `pending verification`
- no guarantee of stable low latency across all providers/conditions
- no transcript/history/team workflows in current stable-beta product scope
- no meeting assistant, no transcript tool, no speaking coach

## 8) Command naming standard (beta-first)

- Primary handoff/preflight commands:
  - `pnpm beta:preflight`
  - `pnpm beta:handoff`
- Legacy aliases:
  - `pnpm alpha:preflight`
  - `pnpm alpha:handoff`

Legacy `alpha:*` aliases are deprecated compatibility aliases and must not be used as the primary path in new documentation.
