# Replyline Improvement Plan

Master roadmap organized by iteration. Each iteration targets a score band and focuses on specific quality dimensions.

---

## Iteration 1: Foundation (DevOps + Backend Hardening)

Priority: establish reliable CI, harden the backend, close the most critical gaps across all 15 directions.

For each direction, the single highest-priority item is listed with its current status.

| # | Direction | Priority item | Status |
|---|-----------|--------------|--------|
| 1 | Backend | Retry/backoff for external APIs (Deepgram, LLM) | [done] |
| 2 | Frontend | Extract CSS design tokens to `:root` variables | [planned] |
| 3 | Security | Tighten CSP -- remove blanket `http://*` | [done] |
| 4 | Testing | GitHub Actions CI pipeline | [done] |
| 5 | Documentation | CONTRIBUTING.md + CHANGELOG.md + architecture.md | [done] |
| 6 | UX/UI | Add visual hierarchy to result card (`say_now` emphasis) | [planned] |
| 7 | Performance | Connect streaming STT path | [planned] |
| 8 | DevOps | CI workflow + Dependabot + pnpm audit | [done] |
| 9 | Product | Memory layer basic UI | [planned] |
| 10 | i18n | Extract UI strings to constants module | [planned] |
| 11 | Extensibility | Settings schema migration framework | [planned] |
| 12 | Error Handling | Log rotation (5 MB) | [done] |
| 13 | Prompt | Fallback card on LLM rejection | [planned] |
| 14 | Trust | Privacy policy document | [done] |
| 15 | Supply Chain | Dependabot for npm + Cargo + GH Actions | [done] |

---

## Iteration 2: User Experience (Frontend + i18n + Performance)

Priority: make the product feel polished for testers and reduce latency for the critical capture-to-card path.

### 1. Backend

1. Structured error types for all command handlers (replace raw String errors with typed enums).
2. Connection health check command (verify STT + LLM endpoints are reachable before first capture).
3. Configurable retry policy exposed in settings (max retries, backoff base).
4. Graceful degradation when LLM is unreachable (show last card with staleness indicator).
5. Parallel STT + context formatting (overlap network wait with context preparation).

### 2. Frontend

1. Extract CSS design tokens to `:root` custom properties (colors, spacing, radii, type scale).
2. Animated phase transitions (idle -> capturing -> transcribing -> analyzing -> ready).
3. Result card copy-to-clipboard: per-section copy buttons (gist, say_now, next_move individually).
4. Keyboard navigation for settings surface (tab order, focus ring, enter-to-save).
5. Responsive font scaling for long result text (auto-shrink when card overflows).

### 3. Security

1. Nonce-based inline style allowlist to replace `unsafe-inline` in CSP.
2. Input sanitization for settings fields (URL validation, hotkey format validation).
3. Rate-limit tray menu actions to prevent accidental rapid-fire diagnostic bundles.
4. Audit all `unwrap()` calls in Rust and replace with proper error propagation.
5. Add integrity checks for settings.json (detect corruption, fall back to defaults).

### 4. Testing

1. Integration test for full capture-stop-analyze pipeline with mocked providers.
2. Vitest coverage reporting integrated into CI (enforce minimum threshold).
3. Snapshot tests for result card rendering across all phases.
4. Rust unit tests for context TTL expiration and eviction edge cases.
5. Automated hotkey conflict detection test (verify registration succeeds).

### 5. Documentation

1. Troubleshooting guide (common errors, provider setup, audio device issues).
2. Provider configuration reference (Deepgram models, LLM endpoint patterns).
3. Memory layer usage guide (spaces, facts, commitments, terms).
4. Settings schema reference (all fields, defaults, constraints).
5. Release process documentation (build, sign, package, distribute).

### 6. UX/UI

1. Visual emphasis on `say_now` section in result card (larger font, distinct background).
2. Tray intro walkthrough for first-time users (explain hotkey, tray behavior, setup steps).
3. Error state card with actionable guidance (not just raw error text).
4. Context indicator in main surface (show "2/3 context entries" badge).
5. Settings validation feedback (inline errors on save, not just toast).

### 7. Performance

1. Streaming STT connection (Deepgram WebSocket) to reduce time-to-first-word.
2. LLM streaming response to show card sections as they arrive.
3. Lazy Vite chunk loading for settings surface (only load when opened).
4. Audio capture buffer pre-allocation to reduce GC pressure during recording.
5. Measure and log end-to-end latency per pipeline stage (capture, STT, LLM, render).

### 8. DevOps

1. Automated Windows build artifact in CI (produce .msi or .exe on tag push).
2. Version bump script (update package.json, Cargo.toml, tauri.conf.json in sync).
3. CI matrix: test on Windows Server 2022 and Windows 11 images.
4. Artifact size tracking (log bundle size per build, alert on unexpected growth).
5. Nightly scheduled CI run against latest Rust stable to catch upstream breakage.

### 9. Product

1. Memory space selector in main surface (choose active context space before capture).
2. Post-capture save-to-memory action (store card as a memory fact in the active space).
3. Memory space list view in settings surface (browse, create, archive).
4. Quick-switch memory space from tray menu.
5. Memory fact search (filter facts by category, text match, date range).

### 10. i18n

1. Extract all UI strings to a `strings.ts` constants module.
2. Extract all Rust user-facing strings to a constants module.
3. Language file loader (JSON-based translation bundles per locale).
4. Dynamic locale switching without app restart.
5. Pluralization and date formatting via Intl API.

### 11. Extensibility

1. Settings schema migration framework (version field + upgrade functions).
2. Plugin-style provider interface (allow swapping STT/LLM backends without code changes).
3. Custom prompt template support (user can edit the LLM system prompt).
4. Card format extensibility (allow additional sections beyond gist/say_now/next_move).
5. Hotkey action mapping (allow different hotkeys for different actions).

### 12. Error Handling

1. Structured error codes for all user-facing errors (map to actionable guidance).
2. Retry exhaustion notification (after max retries, show clear "provider unreachable" card).
3. Credential Manager access failure recovery (detect locked keyring, prompt user).
4. Capture device lost mid-recording recovery (detect WASAPI disconnect, clean up gracefully).
5. Settings file corruption recovery (detect invalid JSON, offer reset-to-defaults).

### 13. Prompt

1. Fallback card when LLM refuses to produce valid JSON (parse partial response, show best-effort).
2. Prompt template versioning (track which prompt version produced which card).
3. Language-aware prompt selection (switch system prompt based on primary_language setting).
4. Confidence indicator in card (LLM self-rates certainty, UI reflects it).
5. Multi-turn prompt refinement (user can ask follow-up questions about the last card).

### 14. Trust

1. Data flow diagram in docs (visual map of what goes where).
2. Provider data retention summary (document known retention policies for common STT/LLM providers).
3. Local-only mode documentation (guide for running with local STT + local LLM).
4. Audit log viewer in settings surface (show recent app events from app.log).
5. Clear-all-data action (single button to wipe settings, memory, logs, debug WAVs).

### 15. Supply Chain

1. Pin all GitHub Actions to SHA hashes (not mutable tags).
2. SBOM generation in CI (produce software bill of materials per build).
3. License compliance report for all Rust and npm dependencies.
4. Automated CVE notification (alert on new advisories for pinned dependency versions).
5. Reproducible build verification (compare artifacts from identical source).

---

## Iteration 3: Maturity (Product + Trust + Extensibility)

Priority: bring the product to a level suitable for broader internal distribution and prepare for eventual external beta.

### 1. Backend

1. Connection pooling for HTTP clients (reuse connections across STT/LLM calls).
2. Graceful shutdown sequence (flush log, close capture, release credentials handle).
3. Background context summarization (compress old entries instead of evicting).
4. Multi-provider failover (if primary STT fails, try secondary endpoint).
5. Telemetry opt-in framework (anonymous usage metrics with explicit consent).

### 2. Frontend

1. Theme system (light/dark mode with OS preference detection).
2. Result card history (scroll through past cards from the current session).
3. Accessibility audit and remediation (ARIA labels, contrast ratios, screen reader testing).
4. Custom window chrome refinements (drag region, minimize, consistent tray-to-window transition).
5. Onboarding flow redesign (guided setup wizard replacing the current settings-first approach).

### 3. Security

1. Certificate pinning for known provider endpoints.
2. Memory zeroization for sensitive data (API keys, transcripts) after use.
3. Tamper detection for settings and memory files (hash verification).
4. Periodic Credential Manager health check (detect revoked or expired keys).
5. Security self-assessment checklist integrated into release process.

### 4. Testing

1. End-to-end test with real providers (scheduled nightly, isolated credentials).
2. Chaos testing for provider failures (inject timeouts, 5xx, malformed responses).
3. Performance regression tests (alert if capture-to-card latency exceeds threshold).
4. Cross-audio-device test matrix (USB, Bluetooth, virtual audio cables).
5. Memory leak detection via long-running soak test.

### 5. Documentation

1. User manual for non-technical testers (screenshots, step-by-step guide).
2. API key setup guides for each supported provider (Deepgram, OpenAI, local LLMs).
3. Architecture decision records (ADRs) for key design choices.
4. Threat model document (identify attack surfaces, mitigations).
5. Contribution hall-of-fame or changelog attribution.

### 6. UX/UI

1. Compact tray popover mode (show card inline near tray without full window).
2. Card action bar (copy all, save to memory, dismiss, retry with different prompt).
3. Visual capture indicator (pulsing tray icon or overlay border during recording).
4. Multi-monitor support testing and fixes.
5. User-configurable card layout (reorder sections, hide sections).

### 7. Performance

1. Sub-second capture-to-first-word with streaming STT.
2. Incremental card rendering (show gist first, then say_now, then next_move as LLM streams).
3. Memory-mapped audio buffer for large captures (avoid heap allocation spikes).
4. Cold start optimization (reduce time from app launch to hotkey ready).
5. Profile and optimize Rust compilation time (feature flags, conditional compilation).

### 8. DevOps

1. Signed Windows installer (code signing certificate, SmartScreen reputation).
2. Auto-update mechanism (check for new versions, download, prompt user).
3. Staged rollout support (canary channel for early testers).
4. Crash reporting pipeline (collect minidumps, symbolicate, aggregate).
5. Infrastructure-as-code for build/release pipeline.

### 9. Product

1. Memory-aware LLM prompting (inject relevant facts from active space into analysis prompt).
2. Post-call summary generation (synthesize multiple cards from a session into one summary).
3. Memory space sharing (export/import space JSON for team knowledge transfer).
4. Commitment tracker with due dates and reminders.
5. Contact graph (link memory spaces to contacts, infer recurring conversation patterns).

### 10. i18n

1. English UI fully functional (complete translation coverage).
2. RTL layout support foundation (for future Arabic/Hebrew locales).
3. Locale-aware number and date formatting throughout the UI.
4. Translation contribution workflow (external translators can submit locale files).
5. LLM prompt localization (analysis prompt adapts to user's primary language).

### 11. Extensibility

1. User-editable prompt templates with preview and validation.
2. Provider SDK (documented interface for adding new STT/LLM backends).
3. Card renderer plugins (custom visualization of analysis results).
4. Keyboard shortcut customization UI (rebind all actions, not just capture).
5. Event hook system (trigger external actions on capture complete, card ready, etc.).

### 12. Error Handling

1. Centralized error telemetry (opt-in, aggregate error patterns for debugging).
2. User-facing error documentation (each error code links to a troubleshooting page).
3. Automatic recovery suggestions (based on error pattern, suggest specific fix).
4. Health dashboard in settings (green/yellow/red status for each subsystem).
5. Graceful degradation mode (app remains usable with reduced functionality when a subsystem fails).

### 13. Prompt

1. A/B prompt testing framework (compare card quality across prompt variants).
2. User feedback loop (thumbs up/down on cards feeds back into prompt selection).
3. Domain-specific prompt packs (engineering meetings, sales calls, 1:1s).
4. Prompt chain support (multi-step analysis: summarize, then advise, then action items).
5. Custom output schema (user defines what sections appear in the card).

### 14. Trust

1. Independent security review (external audit of data flow and storage).
2. Compliance checklist for enterprise deployment (GDPR, SOC 2 considerations).
3. Transparency report template (what data was processed, when, by which provider).
4. User consent flow for data processing (explicit opt-in on first launch).
5. Provider certification program (verify provider meets minimum privacy bar).

### 15. Supply Chain

1. Deterministic builds (binary reproducibility from source).
2. Third-party dependency vendoring option (air-gapped build support).
3. Automated license header enforcement in CI.
4. Dependency freshness policy (maximum age for pinned versions before forced update).
5. Supply chain attestation (SLSA Level 2 compliance for build artifacts).

---

## Expected Score Progression

| Milestone | Score range | Key drivers |
|-----------|------------|-------------|
| Baseline (v0.1.0) | ~61 | Initial alpha with core pipeline, basic CI, manual smoke checks |
| Post-Iteration 1 | ~70 | CI hardened, CSP tightened, docs complete, supply chain gated, log rotation |
| Post-Iteration 2 | ~77 | Streaming STT, polished UI, i18n foundation, integration tests, memory UI |
| Post-Iteration 3 | ~83 | Signed installer, security audit, full i18n, prompt framework, health dashboard |

The ~83 ceiling reflects the practical limits for a small-team alpha product. Scores above 85 typically require dedicated QA infrastructure, formal compliance programs, and multi-platform support that are out of scope for the current phase.
