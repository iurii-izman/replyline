---
trigger: glob
globs: docs/**/*.md
---

# Documentation Guardrails

- Treat `docs/copy-rules.md` as mandatory for wording and trust-safe claims.
- Avoid absolute marketing claims unless verified by repo evidence.
- Keep terminology consistent with existing docs.
- If changing policy or contract wording, run:
  - `pnpm test:consistency`
  - `pnpm test:prompt-contract`
- If docs mention runtime behavior, verify against current scripts and commands in `package.json`.
