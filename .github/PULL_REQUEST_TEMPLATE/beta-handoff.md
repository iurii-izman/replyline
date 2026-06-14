## Beta Handoff PR Checklist

### Scope

- [ ] Keeps stable-beta scope (`capture -> stt -> llm -> card`)
- [ ] Does not introduce meeting assistant / transcript tool / speaking coach framing
- [ ] Does not add out-of-scope product features

### Evidence

- [ ] `pnpm verify:full` executed (or reason documented)
- [ ] Runtime/evidence references included when claims depend on runtime behavior

### Privacy and trust

- [ ] No sensitive keys/tokens in diff or attachments
- [ ] Docs do not claim unsupported privacy guarantees
- [ ] Wording aligned with `docs/copy-rules.md` and `docs/privacy-and-trust.md`

### Notes

- Relevant artifacts/paths:
- Advisory findings:
- Blocking findings:
- Deferred with reason:
- Follow-ups (if any):
