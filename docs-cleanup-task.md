# Task: Documentation Cleanup — Replyline (Internal Alpha)

> **Temporary task file.** Delete after successful execution.
> **Date created:** 2026-04-09 (revised with discovery + iteration protocol).
> **Estimated effort:** 2–3 hours of agent time, possibly multiple iterations. No destructive operations beyond markdown editing and one new script. No git commits.
> **Designed for autopilot execution** by a long-context coding agent (Windsurf Cascade with Kimi K2.5 recommended). Self-controlled via §3.5 iteration protocol.

---

## 0. Context

You are working in a Tauri 2 desktop application repository at `C:\Dev\replyline`. It is a Windows-first, hotkey-gated AI assistant for work calls, currently in internal alpha. Tech stack: Rust backend, Solid.js frontend, pnpm + cargo workspace.

The project recently consolidated direction tracking into a new canonical document `docs/development-directions.md` (449 lines, 30 directions, scoring methodology). It absorbed and replaced `docs/improvement-plan.md` and `docs/interviewforge-lessons.md` (both deleted from disk).

A documentation audit identified four issues to fix:

1. **`docs/README.md` is severely out of date.** It does not reference at least 10 active files including the new canonical document, `dev-handoff-guide.md`, `ai-tooling-policy-matrix.md`, `extension-points.md`, `runtime-decisions.md`, `live-runtime-matrix.md`, and `naming-decision-brief.md`. New developers cannot navigate the docs without grep.
2. **The "evidence discipline" cluster reads as silos.** `verification-lanes.md`, `benchmark-policy.md`, `runtime-evidence.md`, `runtime-bringup.md` and `copy-rules.md` form a coherent system but lack sibling cross-references.
3. **No glossary.** Project-specific vocabulary (evidence bundle, lane, prompt-contract, target/measured/pending, RAM-only, hotkey-gated, etc.) is tribal knowledge.
4. **No automated check for broken intra-doc links.** Stale links accumulate silently.

Your task is to address all four issues without changing the body content of any individual document, without creating subdirectories, and without overengineering.

---

## 0.5. Discovery & state check (run BEFORE any edits)

The repo has many uncommitted modifications from prior work sessions. Do **not** treat these as your changes — they are pre-existing context. Your edits must be additive on top of them.

Before starting Step 1 in §3, perform all six discovery actions and print a one-page **Discovery report** to chat.

1. **`git status`** — capture the full list of currently modified/untracked files. Save this snapshot mentally (or to a temp variable). After completing your work in §3, your additional diff against this baseline must show ONLY the files listed in §6 acceptance criteria as modified/created. Anything else means you accidentally touched something — investigate and revert just that file.

2. **`pnpm smoke` baseline.** Run it once before touching anything. Two outcomes:
   - **Exit 0 (green):** Good. Your final `pnpm smoke` after Step 5 must also exit 0. Any regression is your fault.
   - **Exit non-zero (already broken):** The codebase is broken on this branch. Capture the failure mode in your Discovery report. **Do NOT attempt to fix it as part of this task** — out of scope. But your changes must not make the failure WORSE (e.g., introduce a second failure or change the failure mode).

3. **Glob current state:**
   - `Glob: docs/**/*.md` — list every markdown file under docs/.
   - `Glob: *.md` — list every markdown file at root.
   Compare against the inventory in §2. Specifically verify that `docs/improvement-plan.md` and `docs/interviewforge-lessons.md` do **NOT** exist (they were deleted in a prior session). If they exist, stop and report — something is wrong with the repo state.

4. **Refresh policy context.** Read these files even if you think you remember them:
   - `AGENTS.md` (root) — repo policy precedence
   - `CONTRIBUTING.md` (root) — gates and workflow
   - `docs/copy-rules.md` — banned terms (you must NOT introduce any of them in new content)
   - `docs/development-directions.md` §1 and §11 only — confirms canonical role and consolidation history
   - `docs/README.md` (current) — confirms it is stale and needs replacement
   - `package.json` `scripts` block — find where to insert `test:doc-links` alphabetically among `test:*` entries
   - `tsconfig.json` (just to know strict mode is on; you will not edit it)

5. **Read existing scripts for style** before writing the new one:
   - `scripts/check-consistency.mjs`
   - `scripts/check-prompt-contract.mjs`
   - `scripts/prompt-contract-core.mjs`
   - `scripts/check-ipc-handler-contract.mjs`
   Match shebang convention, import style (`node:fs` vs `fs`), exit-code conventions, console output format. The new `scripts/check-doc-links.mjs` should feel like it belongs in this folder.

6. **Sanity-check the program builds.** Look in `package.json` for a TypeScript check command (e.g. `pnpm typecheck` or similar). If one exists separately from `pnpm smoke`, run it. If the only TS check is bundled into `pnpm smoke`, you already covered it in step 2 — skip.

After all six checks, print a **Discovery report** in this exact format:

```
## Discovery report

git status (file count): <N modified, M untracked>
Pre-existing failures (if any): <one line per failure, or "none">
pnpm smoke baseline: <exit code> (<duration>)

Inventory check:
- docs/*.md found: <count> files
- root *.md found: <count> files
- improvement-plan.md exists: <yes/no — if yes, ABORT>
- interviewforge-lessons.md exists: <yes/no — if yes, ABORT>
- Files in inventory §2 not on disk: <list or "none">
- Files on disk not in inventory §2: <list or "none">

Policy context refreshed: <yes/no>
Existing scripts read: <list>
Ready to proceed to Step 1: <yes/no>
```

**Only after printing the Discovery report, proceed to Step 1.** If anything in the report says ABORT, stop and wait for human input.

---

## 1. Hard constraints (DO NOT VIOLATE)

- **No subdirectories.** Keep all files at their current paths in `docs/` (flat structure).
- **No moves or renames.** Do not move or rename any existing file.
- **No content rewrites.** Do not edit body content of existing documentation files except to add the small "См. также" footer described in Step 2.
- **No new philosophy/values document.** Project philosophy is already covered by `AGENTS.md` and `docs/development-directions.md` §1, §7.
- **No YAML front-matter.** Do not add front-matter or metadata blocks.
- **No enterprise patterns.** No formal versioning, no doc-level changelogs, no review templates, no TOC plugins, no decorative emojis.
- **Match existing language.** New `docs/README.md` and `docs/glossary.md` must be in Russian (matches current `docs/README.md` and `docs/development-directions.md`). English code identifiers and file names stay English.
- **No scope creep.** Do not "improve" or refactor unrelated files. Do not add tests beyond the link-checker script.
- **No `--no-verify`** on any git operation. Do not skip hooks.
- **Do not commit.** Do not push. Do not open a PR. Leave changes staged or unstaged for the human to review.
- **Do not run destructive git commands** (`reset --hard`, `clean -fd`, `checkout .`, `rm -rf`).
- **Do not revert or stage pre-existing uncommitted modifications.** The repo has many unstaged changes from prior sessions — they are NOT yours. Leave them exactly as they are. Your final `git status` diff against the §0.5 baseline must show only the §6 acceptance files added on top.

---

## 2. Inventory (verify before starting)

Before doing anything else, run `Glob: docs/**/*.md` and `Glob: *.md` (root). Compare against the inventory below. If files have been added or removed since this task was written, update your understanding accordingly — but **do not delete or rename** anything you find unexpectedly. Investigate first; flag in your final summary.

**Root markdown files:**
`README.md`, `AGENTS.md`, `CLAUDE.md`, `CONTRIBUTING.md`, `CHANGELOG.md`

**`docs/` (flat, ~35 files):**

- Direction & strategy: `development-directions.md` (KANON), `strategic-analysis.md`, `runtime-decisions.md`, `naming-decision-brief.md`
- Evidence discipline: `verification-lanes.md`, `benchmark-policy.md`, `runtime-evidence.md`, `runtime-bringup.md`, `prompt-contract-lane.md`, `live-runtime-matrix.md`
- Trust & honesty: `copy-rules.md`, `known-limitations.md`, `privacy-and-trust.md`, `privacy-policy.md`, `third-party-providers.md`
- Operations: `smoke-checks.md`, `internal-alpha-checklist.md`, `internal-alpha-log.md`, `internal-alpha-handoff-note-template.md`, `release-readiness.md`, `tester-brief.md`, `test-feedback-template.md`, `dev-handoff-guide.md`
- Technical reference: `architecture.md`, `extension-points.md`, `settings-reference.md`, `error-catalog.md`, `troubleshooting.md`, `memory-layer.md`, `secrets-management.md`, `rust-dependency-security.md`, `i18n-beta-prep.md`
- AI governance: `ai-tooling-policy-matrix.md`
- Archive: `archive/ultimate-ai-stack-2026-2027.md` (1381 lines, external research, **keep as-is**)
- Subdirectory: `ai-stack/README.md` (3 lines, points at `n8n_workflow_llm_review_webhook.json`, **keep as-is**)

---

## 3. Order of operations

Execute the steps below **in order**. After each step, run a quick self-check before moving on.

---

### Step 1 — Build the link checker (smallest, unblocks verification of later steps)

**Why first:** Steps 2–4 add cross-references and a new file. The link checker lets you verify each step incrementally instead of debugging at the end.

**Action:** Create `scripts/check-doc-links.mjs`.

Before writing it, **read `scripts/check-consistency.mjs` and `scripts/check-prompt-contract.mjs`** to match shebang convention, code style, and how scripts produce structured output. The new script should feel like it belongs.

**Behavior of the script:**

1. Walk all markdown files matching `docs/**/*.md` plus root files `README.md`, `AGENTS.md`, `CLAUDE.md`, `CONTRIBUTING.md`, `CHANGELOG.md`.
2. Parse markdown links of the form `[text](path)`. Use a simple regex (`/\[([^\]]+)\]\(([^)]+)\)/g`) — full markdown parsing is overkill. Skip code fences (anything between triple backticks).
3. For each link target:
   - Skip `http://`, `https://`, `mailto:`, links starting with `#` (anchors only).
   - Skip image extensions (`.png`, `.jpg`, `.jpeg`, `.gif`, `.svg`, `.webp`).
   - Strip any `#anchor` suffix from internal links before file existence check.
   - Strip any `?query` suffix as well.
   - Resolve relative to the source file's directory.
   - Verify the resolved file exists on disk.
4. Print one line per broken link in format `BROKEN: <relative-source-path>:<line-number> -> <link-target>`.
5. At the end, print `OK: N markdown files, M links checked` if all good, or `FAILED: K broken links` if not.
6. Exit code 0 if all links resolve, exit code 1 otherwise.

Use only Node.js stdlib (`node:fs`, `node:fs/promises`, `node:path`, `node:url`). No new dependencies. No glob library — walk directories manually with `fs.readdir({ recursive: true })` or a small recursive function.

**Wire into `package.json`:** Add a script entry under `"scripts"`:

```json
"test:doc-links": "node scripts/check-doc-links.mjs"
```

Place it alphabetically among existing `test:*` scripts. **Do not** add it to `pnpm smoke`, `pnpm alpha:preflight`, or any composite gate. Leave it as a standalone command — the human will wire it into CI later if desired.

**Self-check:**

- Run `pnpm test:doc-links`. Capture output.
- Expect some broken links because `docs/README.md` is currently stale and some files reference deleted `improvement-plan.md` / `interviewforge-lessons.md`. **Do not fix them yet.** They will be resolved naturally by Step 3 (new README) and Step 2 (cross-refs only add new links to files that already exist).
- If the script crashes or produces nonsense output, fix it before proceeding.
- Note the broken-link count. After Steps 2–4, the count should drop to 0.

---

### Step 2 — Add a "См. также" footer to the evidence-discipline cluster

**Why:** Five documents form a coherent system but read as silos. Adding a small footer to each makes the cluster discoverable from any entry point.

**Files to modify (exactly these five, no others):**

- `docs/verification-lanes.md`
- `docs/benchmark-policy.md`
- `docs/runtime-evidence.md`
- `docs/runtime-bringup.md`
- `docs/copy-rules.md`

**For each file:** Append a new section at the very end of the file, after a blank line and a `---` separator if the file does not already end with one. Use this template, **omitting the link to the file itself**:

```markdown

---

## См. также

- [verification-lanes.md](verification-lanes.md) — 4 lane модель (compile / mock / prompt / runtime).
- [benchmark-policy.md](benchmark-policy.md) — лейблы `target / measured / pending verification`.
- [runtime-evidence.md](runtime-evidence.md) — где живут артефакты, минимальное качество.
- [runtime-bringup.md](runtime-bringup.md) — как поднять runtime path первый раз.
- [copy-rules.md](copy-rules.md) — формулировки и баны.
```

**Critical rules:**

- In each file, **remove the bullet that points at itself** before saving. Each file should have exactly four bullets, not five.
- If the file already has a `## См. также` or `## See also` section at the end, **merge** into it without duplicating any existing entries. Use whichever language ("См. также" or "See also") is already in the file.
- Do not change any other content in the file. Do not reorder existing sections. Do not retitle the document.
- Use header level `##` to match top-level section style in the file.

**Self-check after modifying all five files:**

- Run `pnpm test:doc-links`. The five new sets of cross-links must all resolve. If any fail, you typed a path wrong — fix it before proceeding.

---

### Step 3 — Rewrite `docs/README.md` as a tier-based navigation index

**Why:** Current `docs/README.md` does not reference 10+ active files. New developers cannot find them without grep.

**Action:** Replace the **entire** content of `docs/README.md` with the structure below. Keep it concise — one line per file in tables, ~150 chars max per line. Use Russian, matching current style.

**Required content** (use exactly this structure; you may add a file row if you discover one in the inventory check that does not appear below — do **not** drop any file):

```markdown
# Replyline — карта документации

> Навигация по документации проекта (internal alpha, Windows-first).
> Канонический документ направлений: [development-directions.md](development-directions.md).
> При расхождении между файлами — приоритет policy precedence из [`AGENTS.md`](../AGENTS.md).
> Обновлено: 2026-04-09.

## Read first (15 минут на ориентацию)

| Документ | Зачем |
| --- | --- |
| [`AGENTS.md`](../AGENTS.md) | Policy precedence + AI tooling governance (root). |
| [`CONTRIBUTING.md`](../CONTRIBUTING.md) | Workflow, gates, PR guidelines. |
| [development-directions.md](development-directions.md) | КАНОН: 30 направлений, текущий score, приоритеты. |
| [dev-handoff-guide.md](dev-handoff-guide.md) | Минимум действий чтобы поднять dev-окружение. |

## Direction & Strategy

| Документ | Роль |
| --- | --- |
| [development-directions.md](development-directions.md) | КАНОН: 30 направлений × максимум/текущее, методология scoring. |
| [strategic-analysis.md](strategic-analysis.md) | Стратегическая Библия: позиционирование, ICP, конкуренты. |
| [runtime-decisions.md](runtime-decisions.md) | Что в MVP path, что не в, capture duration policy. |
| [naming-decision-brief.md](naming-decision-brief.md) | Решение по имени Replyline + триггеры пересмотра. |

## Evidence Discipline (как доказываем)

| Документ | Слой |
| --- | --- |
| [verification-lanes.md](verification-lanes.md) | WHAT: 4 lane модель (compile / mock / prompt / runtime). |
| [benchmark-policy.md](benchmark-policy.md) | LABELS: `target / measured / pending verification`. |
| [runtime-evidence.md](runtime-evidence.md) | ARTIFACTS: где живут файлы, минимальное качество. |
| [runtime-bringup.md](runtime-bringup.md) | HOW: как поднять real-runtime path первый раз. |
| [prompt-contract-lane.md](prompt-contract-lane.md) | Prompt/contract checks без provider calls. |
| [live-runtime-matrix.md](live-runtime-matrix.md) | Live-source testing per call-app (Teams/Zoom/Meet). |

## Trust & Boundaries (что говорим, что нет)

| Документ | Аудитория |
| --- | --- |
| [copy-rules.md](copy-rules.md) | Запрещённые термины, claim discipline, copy guards. |
| [known-limitations.md](known-limitations.md) | Честные границы текущей alpha. |
| [privacy-and-trust.md](privacy-and-trust.md) | Что происходит с данными в runtime. |
| [privacy-policy.md](privacy-policy.md) | Полная privacy policy (legal-ready). |
| [third-party-providers.md](third-party-providers.md) | Что Replyline контролирует vs. провайдеры. |

## Operations (день-в-день)

| Документ | Когда читать |
| --- | --- |
| [internal-alpha-checklist.md](internal-alpha-checklist.md) | Go/no-go перед прогоном или handoff. |
| [internal-alpha-log.md](internal-alpha-log.md) | Журнал тестовых дней (baseline Day 1 = 2026-04-06). |
| [internal-alpha-handoff-note-template.md](internal-alpha-handoff-note-template.md) | Шаблон handoff note для machine-local прогона. |
| [release-readiness.md](release-readiness.md) | Lean handoff gate перед alpha builds. |
| [smoke-checks.md](smoke-checks.md) | Manual critical-path spot-checks. |
| [tester-brief.md](tester-brief.md) | Что нужно знать тестеру до первого прогона. |
| [test-feedback-template.md](test-feedback-template.md) | Шаблон фидбека от тестера. |
| [dev-handoff-guide.md](dev-handoff-guide.md) | Минимум действий для нового разработчика. |

## Technical Reference

| Документ | Зачем |
| --- | --- |
| [architecture.md](architecture.md) | High-level data flow + модули. |
| [extension-points.md](extension-points.md) | Как добавить provider/UI surface/i18n. |
| [settings-reference.md](settings-reference.md) | Schema v2: поля, валидация, дефолты. |
| [error-catalog.md](error-catalog.md) | `CommandError` kinds → user-safe routing. |
| [troubleshooting.md](troubleshooting.md) | Частые проблемы и фиксы. |
| [memory-layer.md](memory-layer.md) | Дизайн memory layer (отдельный track, не MVP). |
| [secrets-management.md](secrets-management.md) | PowerShell SecretStore + `.env.keys`. |
| [rust-dependency-security.md](rust-dependency-security.md) | `cargo-deny`, `cargo-audit`, supply-chain политика. |
| [i18n-beta-prep.md](i18n-beta-prep.md) | Multilingual prep (alpha = RU-first). |
| [glossary.md](glossary.md) | Словарь проектных терминов. |

## AI Tooling Governance

| Документ | Роль |
| --- | --- |
| [ai-tooling-policy-matrix.md](ai-tooling-policy-matrix.md) | Precedence + matrix для Claude/Cursor/Windsurf/etc. |
| [`AGENTS.md`](../AGENTS.md) | Repo-wide instructions (root). |
| [`CLAUDE.md`](../CLAUDE.md) | Claude-специфичный adapter. |

## Archive

- [archive/ultimate-ai-stack-2026-2027.md](archive/ultimate-ai-stack-2026-2027.md) — внешний research об AI-экосистеме (не про Replyline, исторический контекст).

## Fast gates (часто используемые команды)

| Команда | Что делает |
| --- | --- |
| `pnpm smoke` | Build + Rust tests + mock/UI lane + product-policy gates. |
| `pnpm runtime:preflight` | Machine-local readiness snapshot. |
| `pnpm probe:runtime` | Real-runtime path proof. |
| `pnpm evidence:bundle` | Evidence bundle для alpha handoff. |
| `pnpm rust:deps` | Supply-chain security gate. |
| `pnpm test:doc-links` | Проверка внутренних ссылок в docs. |

## Policy precedence

1. Repository policy (`AGENTS.md`, `CONTRIBUTING.md`, [copy-rules.md](copy-rules.md))
2. AI tool adapters (`CLAUDE.md`, `.windsurf/rules/`, etc — см. [ai-tooling-policy-matrix.md](ai-tooling-policy-matrix.md))
3. Machine-global config
4. Personal preferences

При расхождении побеждает уровень с меньшим номером. Подробнее — в [`AGENTS.md`](../AGENTS.md).
```

**Important:**

- After replacement, **diff against the inventory check from §2** to confirm every `docs/*.md` file appears at least once in the new README. If a file is missing, add it to the most appropriate section. Do not silently drop files.
- The relative path `../AGENTS.md` is correct because `docs/README.md` lives one level below the root.
- Do not add status badges, decorative emojis, or commentary beyond what is shown above.

**Self-check:**

- Run `pnpm test:doc-links`. All links from `docs/README.md` must resolve. If `glossary.md` is reported as broken — that is expected, it does not exist yet. Note it and move to Step 4.

---

### Step 4 — Create `docs/glossary.md`

**Why:** Project-specific vocabulary is currently tribal. A short glossary in one place reduces onboarding friction.

**Action:** Create `docs/glossary.md` with the content below. Use Russian explanations matching the project's documentation tone. Each entry is 1–3 sentences, no more. Alphabetical ordering by term. You may add additional terms you encounter while reading other docs (especially while working through Steps 1–3) — but at minimum include everything below.

**Required content:**

```markdown
# Glossary — Replyline

> Словарь проектных терминов. Используется когда нужно быстро понять vocabulary без чтения full doc.
> Если термин здесь отсутствует — это сигнал для добавления, а не для игнорирования.

## A

- **alpha:preflight** — composite pnpm script гейтящий internal alpha handoff (`pnpm alpha:preflight`). Запускает smoke + runtime preflight + supply-chain checks.
- **AGENTS.md** — root-уровневый файл с repo-wide policy precedence для AI-инструментов. Имеет приоритет выше любых tool-specific adapters.

## C

- **capture** — короткое hotkey-gated окно записи системного аудио через WASAPI loopback. Hold-to-capture, без background recording.
- **CommandError** — typed Rust enum для IPC ошибок (`Settings/Credential/Capture/Pipeline/Memory/Internal`) с frontend routing на settings anchors.
- **context layer** — RAM ring buffer краткосрочной памяти между захватами. 3 entries, 1500 chars, 20-мин TTL, FIFO eviction. Подробнее в [architecture.md](architecture.md).
- **copy-rules** — дисциплина формулировок: банлист терминов (`stealth`, `therapy`, `emotion`), claim labeling, runtime claim language. См. [copy-rules.md](copy-rules.md).

## D

- **Deepgram** — текущий STT провайдер. Поддерживается batch и streaming, default = batch.
- **development-directions.md** — канонический документ направлений развития: 30 dimension с scoring max/current. Заменяет старые improvement-plan и interviewforge-lessons.

## E

- **evidence bundle** — local artifact bundle (`pnpm evidence:bundle`) с runtime proof, durations, log snippets. Используется для alpha handoff.
- **evidence discipline** — дисциплина: claim не поднимается до `measured` без runtime artifact в `reports/runtime/`.

## F

- **fixture gate** — optional CI gate с реальным API key через GitHub secrets. Запускает prompt-contract против реального LLM endpoint.

## G

- **gist / say_now / next_move** — три обязательных поля output card. `gist` = краткое summary, `say_now` = что сказать прямо сейчас, `next_move` = следующий шаг.

## H

- **handoff note** — machine-local README для передачи alpha-прогона между machines или people. Шаблон — [internal-alpha-handoff-note-template.md](internal-alpha-handoff-note-template.md).
- **hotkey-gated** — capture только во время удержания глобального hotkey. Никакого автоматического background monitoring.

## L

- **lane** — изолированная категория верификации. Replyline различает 4 lane: compile, mock/UI, prompt/contract, runtime proof. См. [verification-lanes.md](verification-lanes.md).
- **live-runtime matrix** — таблица проверок на реальных call-приложениях (Teams/Zoom/Meet/Telemost). Operator-mutable. См. [live-runtime-matrix.md](live-runtime-matrix.md).

## M

- **measured** — claim level: подтверждён runtime artifact, не теорией. Высший уровень доверия в [benchmark-policy.md](benchmark-policy.md).
- **memory layer** — отдельный future track для долгосрочной памяти (spaces, facts, commitments, terms). Backend готов, не подключён к LLM context injection. Не часть MVP. См. [memory-layer.md](memory-layer.md).
- **mock lane** — UI-тесты с stubbed providers, без сети. Быстрый, deterministic, не доказывает runtime поведение.

## P

- **pending verification** — claim level: пока без artifact, ждёт runtime proof. Допустимо для альфы, но должно явно метиться.
- **prompt-contract** — deterministic check JSON shape LLM ответа против fixtures. Не вызывает реальный API. См. [prompt-contract-lane.md](prompt-contract-lane.md).
- **PROMPT_VERSION** — версия system prompt, фиксируется в LLM payload и runtime artifacts. Текущее значение: `v2`.

## R

- **RAM-only** — никакого долгосрочного хранения transcript/audio. Всё живёт в памяти процесса до закрытия окна или нового capture.
- **release lane** — runtime artifact в `reports/runtime/`, источник `measured` claims. Single source of truth для performance numbers.
- **Replyline** — название продукта. Обоснование выбора и триггеры пересмотра — в [naming-decision-brief.md](naming-decision-brief.md).
- **runtime probe** — отдельный binary с per-stage timing (capture → STT → LLM → render). Запускается через `pnpm probe:runtime`.

## S

- **schema migration v1→v2** — settings JSON migration framework. При load старого формата автоматически апгрейдит до v2.
- **smoke** — composite local gate: `pnpm smoke`. Build + Rust tests + mock/UI lane + product-policy gates. Не доказывает runtime.

## T

- **target** — claim level: проектное значение, ещё не измерено. Требует пометки `target` в любом user-facing тексте.
- **3-level JSON parsing** — fallback цепочка парсинга LLM ответа: direct → brace extraction → field regex. Защищает от LLM-форматных дефектов.

## V

- **verification lane** — см. **lane**.

## W

- **WASAPI loopback** — Windows audio API для захвата system audio output (то что слышит пользователь). Только Windows, mac/Linux out of scope.
```

**Self-check:**

- Run `pnpm test:doc-links`. The reference to `glossary.md` from `docs/README.md` must now resolve. Total broken-link count should be 0.

---

### Step 5 — Final verification

After completing Steps 1–4:

1. **Run `pnpm test:doc-links`** — must exit 0. If not, fix or report.
2. **Run `pnpm smoke`** — must succeed. This verifies you did not accidentally break copy-rules, prompt-contract, IPC contract, consistency, or any other existing gate.
3. **Run `git status`** — review modified/created files. Expected change set:
   - **Modified:** `docs/README.md`, `docs/verification-lanes.md`, `docs/benchmark-policy.md`, `docs/runtime-evidence.md`, `docs/runtime-bringup.md`, `docs/copy-rules.md`, `package.json`
   - **Created:** `scripts/check-doc-links.mjs`, `docs/glossary.md`
   - **Unmodified:** every other file in the repo
4. **Print a final summary** in chat with:
   - Number of files modified, number created
   - `pnpm test:doc-links` exit status
   - `pnpm smoke` exit status
   - Any deviations from this plan with reasons
   - Any new docs files you discovered during inventory check that were not in §2 (and how you handled them)

**Do not commit. Do not push. Do not open a PR.** Leave the working tree dirty for human review.

If all 5 steps and all 8 acceptance criteria in §6 are ✅, print the **Final summary block** below. Otherwise, print the **Resumption block** from §3.5 instead.

```
## Final summary

Status: ALL STEPS COMPLETE ✅
Files modified: <count> (<list>)
Files created: <count> (<list>)
pnpm test:doc-links: <exit code>
pnpm smoke: <exit code> (compare to §0.5 baseline)
git status delta from §0.5 baseline: <list — must match §6 acceptance set>
Deviations from plan: <list or "none">
New docs files discovered during inventory: <list or "none">
```

---

## 3.5. Iteration & self-control protocol

This task is designed to fit one autopilot iteration but may require more if context budget runs low, tools fail, or unexpected complexity surfaces. **Do not declare success early. Do not panic-commit.** Loop until done.

### Self-control rules

1. **Track step status mentally throughout execution.** Each of Steps 1–5 has one of three states: ✅ Complete (verified by self-check) / ⏳ Partial (started, not verified) / ⏸ Not started.

2. **At every checkpoint** (after each Step's self-check), reassess: "Can I complete the remaining steps in this iteration with the context I have left?" If no — stop cleanly at the next safe boundary, do NOT start a new step you cannot finish.

3. **Never leave a half-edited file.** If you cannot complete an edit, revert that single edit. Files should be either fully untouched or fully completed for the current step.

4. **If a tool call fails** (link checker crashes, smoke fails unexpectedly, file not found): diagnose root cause first. Do not retry blindly. Do not bypass with `--no-verify`. If stuck after 2 diagnostic attempts, stop and report.

### Resumption block (print this if NOT done)

If any step is ⏳ or ⏸ at the end of your iteration, print this exact format instead of the Final summary:

```
## Resumption block

Iteration: <N>
Status:
- Step 1 (link checker): ✅ / ⏳ / ⏸ — <one-line note>
- Step 2 (See also footers): ✅ / ⏳ / ⏸ — <one-line note>
- Step 3 (README rewrite): ✅ / ⏳ / ⏸ — <one-line note>
- Step 4 (glossary): ✅ / ⏳ / ⏸ — <one-line note>
- Step 5 (verification): ✅ / ⏳ / ⏸ — <one-line note>

Files touched this iteration: <list>
Files NOT yet touched but planned: <list>

Blockers (if any):
- <blocker 1: what / why / what's needed to unblock>

Next single concrete action:
<one sentence — the very next thing to do>

Resume command for next iteration (paste this back to me in the next turn):
"Continue docs-cleanup-task.md from Step <N>. Skip already-completed steps (<list>). Start with: <next action>. Re-run §0.5 discovery in lightweight mode (skip pnpm smoke baseline if you remember it)."
```

### Loop continuation

The human will paste the resume command back in a follow-up turn. On resumption:

1. Re-glob `docs/**/*.md` and check `git status` — verify the previous iteration's work is still there.
2. Skip any step marked ✅ in the previous resumption block.
3. Pick up at the "Next single concrete action".
4. At the end of THIS iteration, print either Final summary (if done) or another Resumption block.

Loop until all 5 steps and all 8 acceptance criteria are ✅. **Hard limit: 5 iterations.** If still not done after 5 iterations, stop and escalate to the human with a full status report instead of another Resumption block.

---

## 4. Out of scope (do not do)

- ❌ Do not create `docs/PHILOSOPHY.md`. Philosophy is already in `AGENTS.md` and `docs/development-directions.md` §1, §7.
- ❌ Do not move files into subdirectories. Flat `docs/` structure stays.
- ❌ Do not rename any files.
- ❌ Do not edit `docs/development-directions.md`, `docs/strategic-analysis.md`, or any document not listed in Steps 2–4.
- ❌ Do not delete `docs/ai-stack/README.md` — it has 3 lines pointing at a JSON workflow file and is functional.
- ❌ Do not delete `docs/archive/ultimate-ai-stack-2026-2027.md` — intentional historical context.
- ❌ Do not add YAML front-matter to any document.
- ❌ Do not bind `pnpm test:doc-links` to `pnpm smoke` or to CI yet — leave it standalone for the human to wire up later.
- ❌ Do not commit, push, or open a PR.
- ❌ Do not run destructive git commands.
- ❌ Do not add new dependencies (npm or cargo) for the link checker. Stdlib only.

---

## 5. Recovery if something fails

- If `pnpm test:doc-links` reports broken links you cannot resolve, **stop** and report them with file:line. Do not silently delete or rewrite the offending content.
- If `pnpm smoke` fails after your changes, run `git diff` against your modifications and identify what broke. Fix the root cause (probably a copy-rules violation or an IPC-contract mismatch). Do not bypass with `--no-verify` or by disabling the gate.
- If you cannot complete a step, leave the work in a half-state but document exactly what is done and what is not in your final summary. Do not roll back successful steps.
- If you discover the inventory in §2 is wrong (files missing or extra), update the `docs/README.md` tables to match reality. Do not delete unexpected files — flag them.

---

## 6. Acceptance criteria

- [ ] `scripts/check-doc-links.mjs` exists, no new dependencies, matches code style of `scripts/check-consistency.mjs`.
- [ ] `package.json` has `"test:doc-links": "node scripts/check-doc-links.mjs"` under `scripts`.
- [ ] `pnpm test:doc-links` exits 0.
- [ ] `docs/README.md` references every file present in `docs/*.md` (verify by glob + grep).
- [ ] Five evidence-discipline files have a "См. также" footer with cross-links to the other four (excluding self).
- [ ] `docs/glossary.md` exists with at least 25 terms, alphabetically grouped.
- [ ] `pnpm smoke` exits 0.
- [ ] Git working tree is dirty but not committed.
- [ ] Final summary printed with deviations explicitly listed.

---

---

## 7. User actions — non-autopilot (only the human can do these)

After the agent reports `Final summary: ALL STEPS COMPLETE ✅`, the human reviewer must do the following manually. **The agent must NOT attempt these — they require human judgement, credentials, or external systems.**

### Required (before merging the cleanup)

1. **Read the new `docs/README.md` end-to-end** (~5 min). Subjective UX call: does the navigation make sense to someone who has never seen the project? Reorder or rename sections by hand if needed. The agent generates a structurally complete index but cannot judge whether section ordering matches actual reading order for a fresh dev.

2. **Spot-check `docs/glossary.md`.** Read 5 random entries. Verify the explanations match the actual code/docs (the agent generates from secondary context — terms like `3-level JSON parsing`, `schema migration v1→v2`, `PROMPT_VERSION` may be slightly off). Fix in-place. Add any project-specific term the agent missed.

3. **Diff against §0.5 baseline.** Run `git diff --stat` and confirm only the §6 acceptance set is changed. If you see changes outside that set, ask the agent why before staging.

4. **Decide whether to keep the "См. также" footer in `docs/copy-rules.md`.** The agent added one because copy-rules participates in the evidence cluster. If it feels out of place there, delete just that section manually — copy-rules is more "trust" than "evidence" and your call wins.

5. **Stage and commit the cleanup.** Suggested message:

   ```
   docs: rebuild navigation, add glossary, add doc-link checker

   - Rewrite docs/README.md as tier-based index covering all docs/*.md
   - Add See also footers to evidence-discipline cluster (5 files)
   - Add docs/glossary.md with project vocabulary
   - Add scripts/check-doc-links.mjs and pnpm test:doc-links
   ```

   Do **not** include `Co-Authored-By` for the AI agent unless your team policy explicitly requires it.

6. **Delete `docs-cleanup-task.md`** from the repo root after the commit lands. It is a one-shot task file.

### Decisions the human must make (cannot be delegated)

7. **Wire `pnpm test:doc-links` into CI?** The agent left it standalone deliberately. Options:
   - **Keep standalone:** developers run it manually before PRs. Lowest friction.
   - **Add to `pnpm smoke`:** every PR gates on it. Higher confidence, slower smoke.
   - **Add as separate CI job:** parallel to smoke in `.github/workflows/ci.yml`. Best of both.
   Pick one and do it (or document the decision in `docs/development-directions.md` §5.21).

8. **Add `docs/glossary.md` to AI tooling adapters?** If you want Claude/Cursor/Windsurf to pick up project vocabulary automatically, append a reference to `glossary.md` in `CLAUDE.md` and `.windsurf/rules/`. The agent does NOT touch these adapter files in this task — that is your call.

9. **Update `docs/development-directions.md` §5.27 (Documentation Quality)?** The cleanup likely lifts the current 86/92 score by 1–2 points (better navigation, glossary, link checker). Decide whether to bump the score and add a journal entry. Subjective scoring change — must be human.

### Things the agent physically cannot do

10. **Live-call validation** — completely unrelated to this task, but the #1 unblocker for the project per `docs/development-directions.md` §5.23 (Real-World Usefulness Validation, current 25/90). Founder must run ≥3 live-call sessions on Zoom/Teams/Meet. The cleanup makes the docs easier to navigate but does not substitute for real evidence.

11. **Code signing / installer / release artifacts** — `docs/development-directions.md` §5.26 explicitly freezes this until #5.23 lifts above 55. Not part of cleanup, just a reminder that doc improvements do not unblock distribution.

12. **Subjective tone calibration of glossary terms** — the agent writes neutral definitions. If your project voice prefers a specific tone (e.g. more terse, more playful, less formal), edit the glossary by hand. Style is human territory.

13. **External link verification** — the link checker only validates intra-repo links. If any doc references external URLs, those are out of scope. Use a separate tool or manual check.

---

_End of task spec. After successful execution, this file (`docs-cleanup-task.md`) can be deleted by the human reviewer (per §7 item 6)._
