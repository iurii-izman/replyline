# Runtime Scenario Matrix (Deterministic)

This matrix defines deterministic, mock-driven cross-layer scenarios for Replyline runtime behavior without real Deepgram/OpenRouter calls.

## Scope

- Frontend runtime orchestration with mock platform (`src/app/App.ui.test.tsx`)
- Interview quality fixture gates (`scripts/test-interview-quality.mjs`)
- Fixture integrity and contracts (`scripts/run-fixture-gate.mjs`, `pnpm test:fixtures`)
- Privacy sanitization safeguards (`src-tauri/src/app_log.rs` tests)

Out of scope:
- Real network providers
- Real microphone/audio capture
- Desktop automation lanes outside deterministic tests

## Scenario Matrix

| Scenario | Goal | Deterministic Coverage |
| --- | --- | --- |
| 1. First-run setup | Missing Deepgram key, missing LLM route, runtime readiness hints, save settings flow | `Setup wizard (first-run guidance)` tests in `src/app/App.ui.test.tsx` (`shows settings on first launch when not ready`, `explains missing Deepgram key`, `explains missing LLM route`, `returns to main after successful save when all fields are ready`) |
| 2. WorkConversation happy path | Capture flow, card ready, copy `sayNow`, retry, clear | `Runtime scenario matrix (deterministic) -> Scenario 2: WorkConversation happy path supports capture, copy, retry, and clear` in `src/app/App.ui.test.tsx` |
| 3. Interview happy path | Interview card render, answer-first, carousel behavior, copy `answer.main`, clarifier hidden unless needed | `Interview card rendering` tests in `src/app/App.ui.test.tsx` (`interview answer renders first`, `carousel switches cards and answer is default`, `copy copies answer.main`, `clarifier hidden when not needed`, `clarifier needed=true renders text`) |
| 4. Candidate Pack present | Candidate Pack loaded, no fabricated metrics/anchors when evidence is missing | `Runtime scenario matrix (deterministic) -> Scenario 4: Candidate Pack signals avoid fabricated metrics and missing anchors` + Candidate Pack studio tests in `src/app/App.ui.test.tsx` |
| 5. Repair fallback | First invalid/failed pass, deterministic recovery on subsequent pass | `Runtime scenario matrix (deterministic) -> Scenario 5: invalid first pass can recover on next deterministic pass` in `src/app/App.ui.test.tsx` |
| 6. Session report | Start session, finish session, report export actions explicit, clear reports | `Runtime scenario matrix (deterministic) -> Scenario 6: session lifecycle supports report export and clear` in `src/app/App.ui.test.tsx` |
| 7. Privacy | No raw transcript/resume/JD/prompt leakage in log sanitization path; explicit export behavior | `src-tauri/src/app_log.rs` tests (`sanitize_blocks_raw_transcript_like_payload`, `sanitize_blocks_resume_and_jd_payload`, `sanitize_redacts_prompt_and_api_key_markers`) + UI export action tests in `src/app/App.ui.test.tsx` |

## Execution

Primary deterministic lane:

```bash
pnpm test:ui
```

Supporting deterministic lanes:

```bash
pnpm test:fixtures
pnpm test:interview-quality
```

Release confidence lane keeps this matrix under the default public verification profile:

```bash
pnpm verify
```
