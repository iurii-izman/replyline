# Replyline Known Limitations

This is the canonical public known-limitations document for the current Replyline beta.

## Stage and platform

- Replyline is in public source/developer beta.
- The current shipped target is Windows 10/11.
- Cross-machine behavior is still pending broader verification.
- Cross-call-app behavior across Zoom, Teams, Meet, Telemost, and similar apps is still pending broader verification.

## Packaging and installer status

- There is no signed public installer yet.
- Unsigned artifacts remain internal verification artifacts, not public installer claims.
- Source setup remains the supported public onboarding path until signed packaging is verified and published.

## Product scope boundaries

- Replyline is not a meeting assistant.
- Replyline is not a transcript tool.
- Replyline is not a speaking coach.
- There is no transcript/history/team workflow UI in the shipped beta.
- There is no stealth, hidden-overlay, click-through, or cheating flow.
- Interview Mode is a visible local assistance surface and the user remains responsible for allowed use in their context.

## Provider/runtime caveats

- Latency depends on audio conditions, network, provider health, and model choice.
- Cost depends on the external providers and plans the user selects.
- Provider availability, quotas, and retention/logging terms can change outside Replyline control.
- A local LLM endpoint does not make the shipped runtime fully local-only because the shipped STT path is still Deepgram.

## Language and UX boundary

- The shipped product posture is Russian-first.
- English appears as a mirror/supporting layer in selected places, not as a fully finished multilingual UX.
- There is no shipped bilingual interview mode, live translation lane, or streaming transcript interview surface in the current public beta.
- Multilingual expansion should not be described as shipped unless explicitly documented in a canonical product doc.

## Diagnostics and storage truth

- Default runtime does not auto-save raw capture fragments to disk.
- Some local reports, exports, and diagnostics can still contain sensitive content when the user explicitly creates them.
- Interview reports are local-only but can include transcript content.
- `debugTraceMode=full_local` is high-sensitivity local diagnostics, not a normal everyday mode.

## Explicitly non-shipped future tracks

- Advanced Mode is not shipped.
- Bilingual Interview Mode is experimental and not shipped in the current public beta.
- Memory is not shipped.
- There is no shipped memory UI, memory command surface, or automatic memory persistence layer.
- Local STT is not shipped.
- Broad provider expansion beyond the current shipped paths is not shipped unless explicitly documented.
- Any wider cross-platform or broad public-installer story remains future work until explicitly verified and documented.
