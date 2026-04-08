# Extension Points

Guide for developers adding new providers, features, or integrations.

## Provider Layer (`src-tauri/src/providers/`)

### Adding a New STT Provider

1. Create `src-tauri/src/new_stt.rs` with a `transcribe_*` function
2. Add routing logic in `stt_provider.rs` based on a settings field
3. Add the provider option to `AppSettings` in `types.rs`
4. Expose it in `SettingsSurface.tsx` as a dropdown

### Adding a New LLM Provider

1. If it uses OpenAI-compatible API: just change `llm_base_url` and `llm_model`
2. If it uses a different protocol:
   - Create `src-tauri/src/new_llm.rs`
   - Add routing in `llm_provider.rs`
   - Add provider type to settings

### Current Provider Flow

```
Audio capture (WASAPI loopback)
  ↓ PCM samples
stt_provider::transcribe()
  → deepgram::transcribe_wav()       [REST, batch]
  → deepgram::transcribe_pcm_streaming()  [WebSocket]
  ↓ transcript text
llm_provider::analyze()
  → llm::analyze_transcript()        [OpenAI-compatible chat API]
  ↓ AnalysisCardDto {gist, say_now, next_move}
Frontend card display
```

## Frontend Architecture (`src/app/`)

### Adding a New UI Surface

1. Create `src/app/NewSurface.tsx` — Solid.js component
2. Add panel type to `Panel` union in `model.ts`
3. Add navigation in `controller.ts`
4. Add routing in `App.tsx`

### Adding a New IPC Command

1. Add `#[tauri::command]` function in `commands.rs`
2. Register in `lib.rs` `.invoke_handler()`
3. Add TypeScript call in `platform.ts`
4. Update expected count in `scripts/check-ipc-handler-contract.mjs`

## i18n

### Adding a New Language

1. **Frontend**: Add `ui_xx` object in `locale.ts` following `ui_en` structure
2. **Backend**: Add `pub mod xx` in `ui_strings.rs` following `en` module structure
3. **Prompts**: Add `SYSTEM_PROMPT_XX` in `llm.rs`
4. Update `alphaLanguageLabel()` in `model.ts`

### Locale Resolution

```
settings.primaryLanguage → getUi(lang) → ui_xx strings
settings.primaryLanguage → system_prompt_for_language() → LLM prompt
```

## Quality Gates

Any extension must pass:
- `pnpm smoke` — all existing checks
- `scripts/check-ipc-handler-contract.mjs` — IPC count matches
- `scripts/check-consistency.mjs` — file/export consistency
- `cargo clippy` — no new warnings
- `cargo fmt --check` — formatted

## Memory Layer

### Adding a New Memory Fact Category

1. Add variant to `MemoryFact.category` in both Rust `types.rs` and TS `model.ts`
2. Update memory persistence in `memory.rs`
3. Add UI for the new category in `SettingsSurface.tsx` memory section
