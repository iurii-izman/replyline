---
name: Beta handoff release
about: Track stable-beta handoff readiness for one release candidate
title: "[beta-handoff] "
labels: ["release", "beta-handoff", "scope:stable-beta"]
assignees: []
---

## Scope confirmation

- [ ] Core path only: `capture -> stt -> llm -> card`
- [ ] No reframing as meeting assistant / transcript tool / speaking coach
- [ ] No out-of-scope feature expansion in this handoff

## Evidence checklist

- [ ] `pnpm beta:preflight` completed
- [ ] `pnpm evidence:bundle` artifact path attached
- [ ] `pnpm probe:runtime` result attached or linked
- [ ] Claim labels are explicit (`target` / `measured` / `pending verification`)

## Privacy checklist

- [ ] No secrets in logs/screenshots/attachments
- [ ] No accidental sharing of raw sensitive runtime artifacts
- [ ] Privacy wording aligns with `docs/privacy-and-trust.md`
- [ ] No raw/full transcript, full report, or raw Candidate Pack values attached
- [ ] Shared interview artifacts use redacted markdown when external sharing is needed

## Validation profile

- [ ] `pnpm verify:fast`
- [ ] `pnpm verify:full` (release candidate baseline)
- [ ] `pnpm release:freeze:check`

## Result

- [ ] GO
- [ ] NO-GO

## Notes / links

- PR:
- Evidence bundle:
- Additional context:
