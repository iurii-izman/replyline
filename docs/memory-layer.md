# Replyline Memory Layer (Future, Separate from Live Card)

Replyline should not solve long-context needs by turning one hotkey capture into endless recording. The right shape is a separate memory layer.

## Product rule

The live card stays fast, short, and disposable.
Memory is a different layer with different storage rules.

## Goals

- preserve stable context per team / thread / contact group
- keep useful facts between conversations
- save commitments and terminology
- avoid raw-audio retention by default

## Non-goals

- no raw audio archive by default
- no full transcript archive by default
- no hidden profiling
- no automatic “psychological” labels

## Minimal model

### 1. Memory space

One memory space groups recurring context.

Examples:

- `team:design`
- `team:backend`
- `thread:project-atlas`
- `contact:manager`

Suggested fields:

- `id`
- `kind` (`team`, `thread`, `contact`)
- `label`
- `status`
- `created_at`
- `updated_at`

### 2. Memory fact

Stable, distilled fact confirmed by the user.

Examples:

- “Команда дизайна предпочитает согласовывать риски заранее.”
- “Для проекта Atlas критичен срок релиза 30 апреля.”

Suggested fields:

- `id`
- `space_id`
- `text`
- `category` (`goal`, `constraint`, `term`, `preference`, `context`)
- `source_kind` (`manual`, `post_call_summary`, `saved_card`)
- `confidence`
- `confirmed_by_user`
- `created_at`
- `updated_at`

### 3. Memory commitment

Action or promise that matters later.

Suggested fields:

- `id`
- `space_id`
- `text`
- `owner`
- `due_hint`
- `status`
- `confirmed_by_user`
- `created_at`
- `updated_at`

### 4. Vocabulary / terms

Optional lightweight glossary for a team or thread.

Examples:

- internal project names
- abbreviations
- preferred wording

## How memory gets created

Only through explicit actions:

- `Сохранить как факт`
- `Сохранить как договорённость`
- post-call explicit summary confirm

No default auto-save of raw snippets.

## How memory gets used

At analysis time, Replyline may inject a tiny distilled memo into the LLM context:

- top 3-5 facts from the selected memory space
- top open commitments
- preferred terms

This must stay separate from the visible live card.

## Storage recommendation

Phase 1:

- separate structured JSON store
- one file per memory space under an app-local directory
- no raw audio
- no raw transcript by default

Only move to SQLite if the memory layer becomes a real product surface with search, filters, and editing workflows.

## UX recommendation

Do not add profiles to MVP onboarding.

When memory appears, keep it lightweight:

- optional space picker
- fast save buttons after a useful card
- small “memory attached” indicator, not a full CRM

## Current recommendation

Keep memory separate from the current live-card loop.

## Current scaffold (implemented)

Replyline now has a minimal typed memory scaffold in `src-tauri/src/memory.rs`:

- typed models:
  - `MemorySpace`
  - `MemoryFact`
  - `MemoryCommitment`
  - `MemoryTerm`
  - `MemorySpaceRecord`
- local JSON-file-backed store: `JsonMemoryStore`
- local-only storage root: `%APPDATA%/com.replyline.app/memory`
- one index file (`spaces.json`) plus one JSON file per space (`<space_id>.json`)
- validation for IDs, text limits, confidence bounds, and duplicate IDs
- unit tests for:
  - serialization roundtrip
  - validation guardrails
  - file-backed save/load behavior

Replyline backend now exposes manual memory commands (no UI coupling):

- `memory_list_spaces`
- `memory_get_space_record`
- `memory_save_space_record`

These commands only use the local JSON store and require explicit caller action.

Command-level backend tests now cover list/get/save behavior and user-safe error mapping with isolated temp storage.

## Explicitly not implemented yet

- no UI for memory management
- no automatic extraction from live snippets
- no connection to live capture flow by default
- no raw audio persistence
- no raw transcript archive

This keeps the live card fast and disposable while leaving a safe, local foundation for future team/thread/contact context.
