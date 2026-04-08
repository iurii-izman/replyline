# AI Tooling Policy Matrix

This document defines a unified governance model for AI IDE/CLI tools used with Replyline.

## Canonical Policy Sources

- Repository workflow and verification: `CONTRIBUTING.md`
- Repository-wide AI instructions: `AGENTS.md`
- Wording and trust constraints: `docs/copy-rules.md`
- Prompt/consistency automated gates:
  - `scripts/check-prompt-contract.mjs`
  - `scripts/check-consistency.mjs`

## Rule Precedence

Apply policy in this order:

1. Repo policy (`AGENTS.md`, `CONTRIBUTING.md`, docs, scripts)
2. Tool adapter files in repo (for example Copilot/Claude adapters)
3. System/global rules on the machine (Windsurf/Cline/other global profiles)
4. Personal preferences

If rules conflict, higher precedence wins.

## Tool Mapping

| Tool | Role | Adapter / Config entry point | Required checks |
| --- | --- | --- | --- |
| Windsurf | Primary AI IDE | `AGENTS.md`, `.windsurf/rules/*.md` | `pnpm smoke`; dependency gates when applicable |
| Cursor/Codex | AI IDE/agent | `AGENTS.md` + repo docs | `pnpm smoke`; dependency gates when applicable |
| GitHub Copilot | Assistant/completions/chat | `.github/copilot-instructions.md` | `pnpm smoke` before merge |
| Claude tooling | Agent/chat surface | `CLAUDE.md` + repo docs | `pnpm smoke` before merge |
| Zed + AI/Agent Panel | Core alternative IDE | Repo policy files via adapter guidance | `pnpm smoke` before merge |
| Cline | Agent in editor | Repo policy files + local safe permissions | `pnpm smoke`; no unverified claims |
| Continue.dev | Model router/chat | Repo policy files + extension config | `pnpm smoke`; dependency gates when applicable |
| aider | CLI code agent | Repo policy files + CLI defaults | `pnpm smoke`; explicit command evidence |
| Gemini CLI / Code Assist | CLI/editor assistant | Repo policy files + provider config | `pnpm smoke`; dependency gates when applicable |
| OpenHands | Agentic automation | Sandbox policy only (Wave 3) | No direct merge without core gates |
| Void Editor | Experimental IDE | Sandbox policy only (Wave 3) | No direct merge without core gates |
| Google Antigravity | Agent-first environment | Sandbox policy only (Wave 3) | No direct merge without core gates |

## Wave 2 Integration Checklists (Core Tools)

Use this checklist for each of: Zed, Copilot, Cline, Continue.dev, aider, Gemini CLI/Code Assist.

- Install from official source and verify version.
- Connect only required accounts/tokens (least privilege).
- Configure tool to reference repo policy (`AGENTS.md`, `CONTRIBUTING.md`, `docs/copy-rules.md`).
- Disable overlapping auto-run behaviors that can conflict with other tools.
- Validate that generated edits follow architecture boundaries (`model.ts` / `platform.ts` / `controller.ts`).
- Run required gates after representative edits:
  - `pnpm smoke`
  - `pnpm audit:npm` when JS dependencies changed
  - `pnpm rust:deps` when Rust dependencies changed
- Record any known limitations or required manual checks in PR description.

## Wave 3 Sandbox Policy (OpenHands / Void / Antigravity)

These tools are experimental in this project and must run under sandbox constraints.

- Use isolated branches for all changes from experimental tools.
- Do not allow direct commit to long-lived branches without manual review.
- No production secret access from these tools.
- Keep network/tool permissions minimal and explicit.
- Require human sign-off plus full gates (`pnpm smoke` and dependency checks) before any merge candidate.
- Treat outputs as draft assistance, not as authoritative decisions.

## Zed Scope Decision

- Approved baseline: `Zed Editor` with AI features and Agent Panel.
- Additional Zed products are out of scope unless a concrete project need appears and is added to this matrix first.

