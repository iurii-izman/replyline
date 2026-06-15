# ADR 0001: Context Pack Simplification

- **Status:** Accepted
- **Date:** 2026-06-15
- **Deciders:** iurii-izman

## Context / Problem

Replyline currently positions itself around two user flows:
`WorkConversation` and `Interview Mode`. Interview Mode carries
a dedicated UX entity — `Candidate Pack` — that provides
structured prep context (resume facts, job description, role
keywords, etc.) specifically for interview practice.

This dual-flow positioning creates several tensions:

1. **Product identity split.** The product reads as "interview
   helper that also does conversations" rather than one coherent
   product.
2. **Candidate Pack is a narrow entity.** Its elaborate typed
   schema (CandidateFact, strength levels, metrics, job description
   decomposition) is tied to interview-only prep and doesn't
   generalise to other conversation contexts.
3. **No universal context primitive.** WorkConversation has no
   first-class context entity, yet the value of a live assistant
   grows dramatically when it knows *who you are and what you're
   talking about*.

The codebase already contains the Candidate Pack DTOs, commands,
and UI surface (`CandidatePackStudio.tsx`). It has no `ContextPack`
concept anywhere in runtime or docs.

## Decision

### Product direction

Replyline becomes a **universal live assistant for work conversations**.
The central entity is an active `ContextPack`. The central scenario is
`WorkConversation` with active context.

### Core rules

1. **One active ContextPack per conversation.** Only one pack is
   active at a time. Switching packs replaces the context.
2. **No profile system.** No user profiles, persona slots, role
   presets, or identity taxonomy. One pack = one context.
3. **ContextPack is the default for WorkConversation.** When a
   pack is active, it is attached to every analysis request
   automatically (unless the user explicitly detaches it).
4. **Candidate Pack will be replaced by ContextPack.** The
   Candidate Pack DTOs, commands, UI, and IPC category remain
   in place until a working ContextPack replacement is shipped.
   After replacement is verified, old code is removed — not
   hidden, not gated permanently.
5. **Interview Mode becomes a context usage example.** It is no
   longer the product centre. Interview session = WorkConversation
   + an interview-oriented ContextPack + the existing interview
   card schema.
6. **Bilingual frozen.** The experimental bilingual interview
   track is frozen at its current state. No new features, no
   expansion. It will be re-evaluated after ContextPack ships.

### Data model draft

```
ContextPack {
  id: string;
  title: string;
  content: string;        // free-form markdown; replaces typed CandidateFact[]
  isActive: boolean;
  createdAt: ISO string;
  updatedAt: ISO string;
}
```

Design rationale:

- **Single `content` field** instead of structured facts/job descriptions.
  The LLM can interpret free-form context equally well, and a flat
  content model avoids premature typing that would constrain future
  use cases (meetings, negotiations, presentations, etc.).
- **`isActive` boolean** enforces the one-active-pack rule at the
  data layer.
- **No candidate-specific fields.** Role title, company, metrics,
  fact strengths — all become part of free-form `content` when
  relevant to the context.

### UX principle

- **Main screen = response card + active context bar on top.**
  The context bar shows the active pack title and a quick toggle.
- **Primary visual weight: "What to say now".** The `say_now`
  field remains the visually dominant element in the response card.
  Everything else (gist, next_move, context title) is supporting
  information.

## Consequences

### What happens to Candidate Pack

- **Immediate:** No runtime changes. Candidate Pack code, UI,
  commands, and IPC category stay untouched.
- **Future:** Candidate Pack is replaced by ContextPack. The
  replacement ships first, then old code is removed. Removal is
  permanent, not feature-flagged indefinitely.
- **User migration:** When ContextPack ships, existing Candidate
  Pack files can be imported as ContextPack content (one-time,
  lossy conversion — flat content, no fact typing preserved).

### What happens to Interview Mode

- **Immediate:** No runtime changes. Interview Mode, interview
  cards, reports, and session lifecycle stay as-is.
- **Future:** Interview Mode becomes a thin layer over
  WorkConversation + ContextPack. The interview card schema
  (InterviewCardSchemaV1) is preserved. The interview report
  functionality stays. The difference: interview context comes
  from a ContextPack, not a separate Candidate Pack.

### What we freeze

- **Bilingual experimental track.** Code stays, feature flag stays
  disabled, no expansion. Re-evaluated after ContextPack ships.
- **Candidate Pack expansion.** No new Candidate Pack features,
  fields, or commands. Bug fixes only.
- **Profile/persona system.** Explicitly not planned. ContextPack
  is the only context primitive.

### What we don't overclaim

- ContextPack is a **planned direction**, not shipped runtime.
  No ContextPack DTO, command, or UI exists today.
- No timeline commitment. Replacement happens after working
  implementation, not before.
- No advanced taxonomy (folders, tags, sharing, templates) is
  committed at this stage.

## References

- [Product user guide](../product/user-guide.md)
- [Product limitations](../product/limitations.md)
- [Architecture](../engineering/architecture.md)
- [README](../../README.md)
