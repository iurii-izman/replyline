# Block 1: Backend Hardening + Memory Injection

> **Temporary task file.** Delete after execution.
> **Model:** Kimi K2.5 or Claude Sonnet 4.6
> **Mode:** Windsurf Cascade Write / Claude Code
> **Estimated effort:** 3-4 hours agent time. Rust + fixture changes only. No frontend.
> **Parallel-safe:** Does NOT touch src/app/*.tsx, src/App.css, .github/workflows/ci.yml. Safe to run alongside Block 2 and Block 3.

---

## 0. Goal

Harden the Rust backend in four areas without changing any frontend code:

1. **Pipeline timeout** (30s) — prevent infinite hangs when STT/LLM don't respond.
2. **Graceful shutdown** — flush log, stop capture, release resources on app quit.
3. **Tests** — close the two biggest test gaps: `deepgram.rs` (0 tests) and `settings.rs` (0 tests).
4. **Memory → LLM context injection** — connect memory facts to the analysis prompt behind a feature flag.

---

## 1. Hard constraints

- **Rust-only.** Do not edit any `.tsx`, `.ts`, `.css`, `.html`, `.yml` files.
- **Exception:** `package.json` may be edited ONLY to add/update a script entry. `src-tauri/Cargo.toml` may be edited to add dev-dependencies for testing.
- **0 unwrap() in shipped code.** The project has a strict no-unwrap policy. `unwrap()` is allowed ONLY in `#[cfg(test)]` blocks.
- **thiserror for errors.** Follow existing patterns in `types.rs` and `settings.rs`.
- **No unsafe** outside `audio.rs` and `fs_atomic.rs` (existing policy).
- **No new crate dependencies** for shipped code. Test-only crates (e.g., `tempfile`) are OK in `[dev-dependencies]`.
- **Match existing code style.** Read `src-tauri/src/commands.rs` and `src-tauri/src/services/capture_pipeline.rs` before writing — match naming, error handling, logging patterns.
- **Do not commit.** Leave changes for human review.
- **Do not touch:** `audio.rs`, `credentials.rs`, `fs_atomic.rs`, `tray_status.rs`, `ui_strings.rs` — they are out of scope.

---

## 2. Discovery (before any edits)

1. Run `cargo test --manifest-path src-tauri/Cargo.toml` — capture baseline test count and result.
2. Read these files:
   - `src-tauri/src/services/capture_pipeline.rs` (209 lines) — you will add timeout + memory injection here.
   - `src-tauri/src/deepgram.rs` (222 lines) — you will write tests for this.
   - `src-tauri/src/settings.rs` (344 lines) — you will write tests for this.
   - `src-tauri/src/memory.rs` (437 lines) — you will read memory facts from here.
   - `src-tauri/src/llm.rs` (467 lines) — understand how system_prompt is built (you will inject memory context into it).
   - `src-tauri/src/types.rs` — understand AppSettings fields, especially `use_memory_context` (you may need to add this field).
   - `src-tauri/src/lib.rs` (197 lines) — you will add shutdown hook here.
   - `src-tauri/src/app_log.rs` (93 lines) — understand append_event for shutdown logging.
   - `src-tauri/src/state.rs` (23 lines) — understand ReplylineState.
3. Print a brief "files read, baseline: N tests passing" confirmation before starting.

---

## 3. Tasks (in order)

### Task 1: Pipeline timeout (30 seconds)

**File:** `src-tauri/src/services/capture_pipeline.rs`

**Problem:** `capture_stop_and_analyze()` calls STT then LLM with no overall timeout. If a provider hangs, the app freezes forever.

**Solution:** Wrap the STT + LLM section of the pipeline in a `tokio::time::timeout(Duration::from_secs(30), ...)`. On timeout:
- Emit a status event `StatusEventDto` with phase `error` and detail explaining the timeout.
- Log via `app_log::append_event("pipeline_timeout", "STT+LLM exceeded 30s deadline")`.
- Return an appropriate `PipelineError` variant (you may need to add one).

**Implementation notes:**
- The timeout wraps the async block AFTER audio capture is complete (capture itself is user-controlled and should NOT be timed out).
- The 30s timeout covers: STT transcription + LLM analysis + card validation. Not capture.
- If STT succeeds but LLM times out, still store the transcript in context (so retry_last_analysis can work).
- Add a `const PIPELINE_TIMEOUT_SECS: u64 = 30;` at the top of the file.

**Test:** Add a unit test (in the same file or a test module) that verifies the timeout fires. You can mock the STT/LLM calls with `tokio::time::sleep(Duration::from_secs(60))` and assert the timeout error.

### Task 2: Graceful shutdown

**File:** `src-tauri/src/lib.rs`

**Problem:** On app quit, no cleanup happens. Logs may be truncated, capture may be orphaned.

**Solution:** In the Tauri `Builder` setup (find `tauri::Builder::default()` in `lib.rs`), register an `on_event` handler for `tauri::RunEvent::ExitRequested` or use the window close event. On shutdown:

1. Log: `app_log::append_event("shutdown", "graceful shutdown initiated")`.
2. If a capture is in progress (check `state.capture_controller`), cancel it via the existing `AtomicBool` cancellation flag.
3. Log: `app_log::append_event("shutdown", "shutdown complete")`.

**Implementation notes:**
- Keep it simple. The goal is to stop orphaned captures and log the event, not to implement a full shutdown orchestrator.
- Do NOT block the shutdown for more than 2 seconds. Use a short timeout if waiting for capture to stop.
- Read how `commands.rs` accesses `ReplylineState` via `tauri::State` — you'll need similar access in the event handler.

### Task 3: Tests for `deepgram.rs`

**File:** `src-tauri/src/deepgram.rs` (add `#[cfg(test)] mod tests { ... }` at bottom)

**Write 5 tests:**

1. **`test_batch_endpoint_construction`** — verify that `transcribe_wav` builds the correct URL with query params (`smart_format=true`, `punctuate=true`, `model=nova-2`). Mock the HTTP call or just test the URL building logic (extract it into a helper if needed).

2. **`test_empty_transcript_rejected`** — verify that if Deepgram returns `{"results":{"channels":[{"alternatives":[{"transcript":""}]}]}}`, the function returns an error (not Ok with empty string).

3. **`test_retry_on_5xx`** — verify retry logic: if first call returns 500, second returns 200 with valid transcript, the function succeeds. This may require refactoring `transcribe_wav` to accept an injectable HTTP client or a retry counter.

4. **`test_no_retry_on_4xx`** — verify that 401/403 errors are NOT retried (immediate failure).

5. **`test_streaming_message_parsing`** — verify that `DeepgramStreamingMessage` correctly deserializes from a realistic Deepgram WebSocket JSON payload (use a fixture string).

**Notes:**
- If `transcribe_wav` is too tightly coupled to `reqwest::Client` for unit testing, extract the URL-building and response-parsing logic into separate testable functions. Do NOT refactor the entire module — just enough to make it testable.
- Use `#[tokio::test]` for async tests.
- Use `serde_json::from_str` for parsing tests.

### Task 4: Tests for `settings.rs`

**File:** `src-tauri/src/settings.rs` (add tests to existing `#[cfg(test)]` module if one exists, or create one)

**Write 5 tests:**

1. **`test_v1_to_v2_migration`** — create a v1 JSON (schemaVersion: 1, no llmTemperature), run migration, verify schemaVersion is 2 and llmTemperature has default value.

2. **`test_v2_passthrough`** — create a valid v2 JSON, load it, verify all fields preserved unchanged.

3. **`test_corrupt_json_quarantine`** — write invalid JSON to a temp file, call `load()`, verify: (a) defaults returned, (b) corrupt file renamed to `*.corrupt.*`.

4. **`test_url_validation_accepts_https`** — verify that `https://api.deepgram.com/v1` passes URL validation.

5. **`test_url_validation_rejects_http_public`** — verify that `http://evil.com/v1` fails URL validation (only localhost/private IPs allowed for http).

**Notes:**
- Use `tempfile` crate (add to `[dev-dependencies]`) for temp directory tests.
- Read `fs_atomic.rs` to understand how atomic writes work — your quarantine test needs to check the right file paths.

### Task 5: Memory → LLM context injection

**Files:** `src-tauri/src/types.rs`, `src-tauri/src/services/capture_pipeline.rs`, `src-tauri/src/llm.rs`

**Goal:** When `useMemoryContext` is true AND an active memory space has facts, inject the top 3 facts into the LLM system prompt.

**Step 5a: Add feature flag to AppSettings**

In `types.rs`, add to `AppSettings`:
```rust
#[serde(default)]
pub use_memory_context: bool,
```
Default: `false`. Add to schema migration if needed.

**Step 5b: Build memory context string**

In `capture_pipeline.rs` (or a new helper in `llm.rs`), add a function:
```rust
fn build_memory_context(memory_dir: &Path, active_space_id: Option<&str>) -> Option<String>
```

Logic:
1. If `active_space_id` is None, return None.
2. Load the space from `JsonMemoryStore`.
3. Take the top 3 facts sorted by `confidence` descending, then `updated_at` descending.
4. Format as:
   ```
   [Memory context from space "{label}"]
   - {fact1.text} (confidence: {confidence})
   - {fact2.text}
   - {fact3.text}
   ```
5. Return Some(formatted_string).

**Step 5c: Inject into LLM call**

In `capture_pipeline.rs` → `capture_stop_and_analyze()`, after building `formatted_context` but before calling `llm::analyze()`:

1. Check `settings.use_memory_context`.
2. If true, call `build_memory_context(...)`.
3. If Some, prepend the memory context to `formatted_context` with a newline separator.

**Step 5d: Test**

Write 2 tests:
1. **`test_memory_context_builds_correctly`** — create a temp memory space with 5 facts at different confidences, verify top 3 by confidence are selected and formatted correctly.
2. **`test_memory_context_none_without_space`** — verify None returned when no active space.

---

## 4. Verification

After all 5 tasks:

1. `cargo test --manifest-path src-tauri/Cargo.toml` — all tests pass. Count should be baseline + ~12 new tests.
2. `cargo clippy --manifest-path src-tauri/Cargo.toml -- -D warnings` — no new warnings.
3. `cargo fmt --manifest-path src-tauri/Cargo.toml --check` — formatted.
4. `pnpm smoke` — must pass (this includes cargo test + frontend tests + all gates).
5. `git diff --stat` — verify only expected files changed.

**Expected changed files:**
- `src-tauri/src/services/capture_pipeline.rs` (timeout + memory injection)
- `src-tauri/src/lib.rs` (shutdown hook)
- `src-tauri/src/deepgram.rs` (test module added)
- `src-tauri/src/settings.rs` (test module added)
- `src-tauri/src/types.rs` (use_memory_context field)
- `src-tauri/src/llm.rs` (possibly, if memory context formatting lives here)
- `src-tauri/Cargo.toml` (possibly, if tempfile added to dev-deps)

**Do not commit.** Print a summary and leave for human review.

---

## 5. Iteration protocol

If you cannot finish all 5 tasks in one pass, print a Resumption block:

```
## Resumption block
- Task 1 (pipeline timeout): done/partial/not started
- Task 2 (graceful shutdown): done/partial/not started
- Task 3 (deepgram tests): done/partial/not started
- Task 4 (settings tests): done/partial/not started
- Task 5 (memory injection): done/partial/not started

Next action: <one sentence>
Resume: "Continue autopilot-block-1-backend.md from Task <N>."
```

---

_Delete this file after successful execution._
