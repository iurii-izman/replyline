# Replyline Memory Layer (Future, Separate from Live Card)

> Scope guardrail: этот документ описывает future track.
> Он не меняет текущую MVP stable-beta story и не означает, что memory — часть текущего user-facing продукта.

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

For current internal stable-beta messaging:

- core MVP story = live card (`gist / say_now / next_move`)
- memory = future explicit user-confirmed layer, not current default path

## Implementation status

Memory layer is not implemented in the current Slim Stable Beta.

The typed model design in this document is a future-track reference.
No memory module is compiled into the shipped Rust binary.
No memory commands are exposed in the IPC contract.

When memory is implemented, it will follow the design constraints above:

- no UI for memory management
- no automatic extraction from live snippets
- no connection to live capture flow by default
- no raw audio persistence
- no raw transcript archive

This keeps the live card fast and disposable while leaving a safe, local foundation for future team/thread/contact context.

## Scope lock for current cycle

This document does not authorize moving memory into shipped scope for the current cycle.
Any memory implementation proposal must remain future-track until explicitly accepted in beta scope docs.
