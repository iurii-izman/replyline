# Developer Handoff Guide

Complete step-by-step guide for a developer taking over the Replyline codebase.

---

## 0. Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | 20+ (24 LTS recommended) | https://nodejs.org |
| pnpm | 9.x | `npm install -g pnpm@9` |
| Rust | stable | https://rustup.rs |
| Git | 2.40+ | https://git-scm.com |
| VS Code / Cursor | latest | IDE with Rust + TypeScript support |
| PowerShell | 5.1+ (7+ recommended) | Built into Windows |

### Recommended VS Code Extensions
- `rust-analyzer` — Rust language server
- `tauri-vscode` — Tauri integration
- `solid-js` — Solid.js syntax highlighting
- `eslint` — TS linting

---

## 1. Clone & Setup

```powershell
git clone git@github.com:iurii-izman/replyline.git
cd replyline
pnpm install
```

### Secrets Setup

All API keys are stored in PowerShell SecretStore (AES-256 encrypted).

```powershell
# First time: install SecretStore modules
Install-Module Microsoft.PowerShell.SecretManagement -Scope CurrentUser -Force
Install-Module Microsoft.PowerShell.SecretStore -Scope CurrentUser -Force

# Register vault (one-time)
Import-Module Microsoft.PowerShell.SecretManagement
Import-Module Microsoft.PowerShell.SecretStore
Register-SecretVault -Name DevVault -ModuleName Microsoft.PowerShell.SecretStore -DefaultVault

# Configure passwordless access (for automation)
# When prompted for password during first use, enter anything — then:
Set-SecretStoreConfiguration -Authentication None -Interaction None -Confirm:$false

# Store your keys
Set-Secret -Name DEEPGRAM_API_KEY -Secret "your-deepgram-key" -Vault DevVault
Set-Secret -Name OPENROUTER_API_KEY -Secret "sk-or-v1-..." -Vault DevVault
Set-Secret -Name GITHUB_CLASSIC_API_KEY -Secret "ghp_..." -Vault DevVault
```

### Load Secrets for Each Terminal Session

```powershell
. ~/.dev-secrets/Load-ProjectSecrets.ps1
Load-ProjectSecrets
# → Secrets loaded: 3, skipped: 0
```

The file `~/.dev-secrets/Load-ProjectSecrets.ps1` reads `.env.keys` in the project root
and loads matching secrets from the vault into process-level env vars.

---

## 2. Run Dev Server

```powershell
pnpm tauri dev
```

This:
1. Starts Vite dev server on `http://localhost:1420`
2. Compiles the Rust backend (~3-5 min first time, ~15s incremental)
3. Opens the Replyline desktop window

### Configure the App (in the UI)

1. Click the gear icon to open Settings
2. **Deepgram API key** — paste your key
3. **Gateway address** — `https://openrouter.ai/api/v1`
4. **Model** — e.g. `anthropic/claude-sonnet-4`
5. **Response API key** — your OpenRouter key
6. Click **"Сохранить на этой машине"** (Save on this machine)
7. Hold `Ctrl+Alt+Space` during a conversation to capture audio

---

## 3. Quality Gates

Run before every commit:

```powershell
# Full smoke suite (runs all gates below)
pnpm smoke

# Individual gates:
pnpm build                    # Vite frontend build
pnpm test:ui:coverage         # 33 Vitest tests + coverage
pnpm test:fixtures            # Fixture corpus validation
pnpm test:prompt-contract     # Prompt contract (24 fixtures)
pnpm test:say-now-scenarios   # Say-now scenarios (19 scenarios)
pnpm test:ipc-contract        # IPC handler count (23 commands)
pnpm test:consistency         # Cross-file consistency
pnpm copy:check               # Copy discipline

# Rust-specific:
cargo check --manifest-path src-tauri/Cargo.toml
cargo clippy --manifest-path src-tauri/Cargo.toml -- -D warnings
cargo fmt --manifest-path src-tauri/Cargo.toml --check
cargo test --manifest-path src-tauri/Cargo.toml
```

---

## 4. Architecture Overview

```
src/                          # Frontend (Solid.js + TypeScript)
├── app/
│   ├── model.ts              # Types, DTOs, error parsing
│   ├── controller.ts         # Orchestration, state management
│   ├── controller_memory.ts  # Memory space operations
│   ├── controller_runtime.ts # Runtime status operations
│   ├── controller_status.ts  # Pipeline status mapping
│   ├── locale.ts             # UI strings (ru + en)
│   ├── platform.ts           # Tauri IPC abstraction
│   ├── MainSurface.tsx       # Card display
│   ├── SettingsSurface.tsx    # Settings panel
│   └── ChromeSurface.tsx      # App shell, error bar
├── App.tsx                   # Root component
└── App.css                   # Global styles

src-tauri/                    # Backend (Rust + Tauri)
├── src/
│   ├── lib.rs                # Tauri app setup, command registration
│   ├── commands.rs           # All 23 IPC commands
│   ├── types.rs              # Shared types, CommandError
│   ├── audio.rs              # WASAPI audio capture
│   ├── deepgram.rs           # Deepgram STT API
│   ├── llm.rs                # LLM chat completion + prompt
│   ├── context.rs            # Conversation context
│   ├── memory.rs             # Memory spaces persistence
│   ├── settings.rs           # Settings file I/O
│   ├── state.rs              # AppState management
│   ├── ui_strings.rs         # Backend UI strings (ru + en)
│   ├── providers/            # Provider abstractions
│   │   ├── llm_provider.rs
│   │   └── stt_provider.rs
│   └── services/             # Service layer
│       ├── capture_pipeline.rs
│       ├── http_client.rs
│       ├── memory_service.rs
│       └── provider_health.rs
├── Cargo.toml
└── tauri.conf.json

docs/                         # Documentation
├── architecture.md           # Architecture overview
├── error-catalog.md          # All error types and routing
├── extension-points.md       # How to add providers, surfaces, languages
├── secrets-management.md     # SecretStore setup and usage
├── dev-handoff-guide.md      # THIS FILE
└── ...                       # Various policy/process docs

scripts/                      # Quality gate scripts
fixtures/                     # Test fixtures for LLM validation
landing/                      # Static landing page
```

### Key Architecture Rules

- **State/types** live in `model.ts` — don't scatter types across components
- **Platform calls** go through `platform.ts` — never import `@tauri-apps/api` directly in components
- **Orchestration** stays in `controller.ts` — components are pure render
- **Solid.js patterns** only — no React hooks/useState/useEffect

---

## 5. Priority Tasks for DEV

### P0 — Must Do First

#### 5.1 Verify End-to-End Flow
Follow `docs/internal-alpha-checklist.md`:
1. Run `pnpm smoke` — must pass
2. Run `pnpm tauri dev` — app must open
3. Configure STT + LLM in settings
4. Hold hotkey during a conversation
5. Verify: card appears with gist / say_now / next_move
6. Test 3 scenarios from the checklist

#### 5.2 Wire Up i18n Runtime Switch
English strings exist but aren't connected to the UI yet.

**Frontend** (`src/app/`):
- Components currently import `ui` directly from `locale.ts`
- Replace with `getUi(settings().primaryLanguage)` from the controller
- `locale.ts` already exports `getUi()`, `ui_ru`, `ui_en`

**Backend** (`src-tauri/src/`):
- `ui_strings.rs` has `en` and `ru` modules
- `tray_status.rs` and `lib.rs` hardcode `ui_strings::ru::*`
- Add `match settings.primary_language { "en" => en::*, _ => ru::* }`

#### 5.3 Major Dependency Updates
Node.js 24 deprecation deadline: **June 2, 2026** (GitHub Actions).

**TypeScript 5.6 → 6.0:**
```powershell
pnpm add -D typescript@6
# Fix any type errors — TS6 may have stricter checks
pnpm build
```

**Vite 6.4 → 8.0:**
```powershell
pnpm add -D vite@8
# Check vite.config.ts for deprecated options
# See https://vite.dev/blog/announcing-vite8
pnpm build
```

### P1 — Should Do Soon

#### 5.4 Add `rustfmt.toml`
Prevent CI format failures from inconsistent local settings:
```toml
# src-tauri/rustfmt.toml
edition = "2021"
max_width = 100
```

#### 5.5 E2E Testing
Consider adding Playwright or WebdriverIO for:
- Settings save/load round-trip
- Hotkey registration/deregistration
- Error state recovery

#### 5.6 Build Installer
```powershell
pnpm tauri build
```
This creates `.msi` and `.exe` in `src-tauri/target/release/bundle/`.
For distribution: set up code signing (see Tauri docs).

#### 5.7 Strengthen Fixture Gate
Currently `continue-on-error: true` in CI. To make it a hard gate:
1. Relax guardrails in `llm.rs` (line ~360: vague-word check)
2. Or increase retry count in `fixture_gate.rs`
3. Or pin a more deterministic model (e.g. `temperature: 0`)

### P2 — Nice to Have

#### 5.8 Provider Trait Abstraction
Currently `providers/` are thin wrappers. To add alternative providers (Whisper, local LLM):
- Define `trait SttProvider` and `trait LlmProvider` in Rust
- Implement for each provider
- Select via settings

See `docs/extension-points.md` for full guide.

#### 5.9 Performance Monitoring
- Add latency tracking per pipeline stage
- Surface in runtime readiness JSON
- Scripts: `scripts/runtime-bench.ps1`, `scripts/runtime-duration-bench.ps1`

#### 5.10 Localization Polish
- Connect `getUi()` to all components (P0 task)
- Add language selector in SettingsSurface
- Consider adding more languages (DE, ES, etc.)

---

## 6. CI/CD

### GitHub Actions
Workflow: `.github/workflows/ci.yml`
- Triggers on: push to main, PRs, manual dispatch
- Runner: `windows-latest`
- Steps: build, clippy, fmt, tests, fixture checks, supply chain audit
- Secrets: `OPENROUTER_API_KEY`, `DEEPGRAM_API_KEY`

### Dependabot
Configured in `.github/dependabot.yml`.
- Monitors: npm, cargo, github-actions
- Auto-creates PRs for updates
- Closed: TypeScript 6, Vite 8 (major — need manual handling)

### Managing CI Secrets
```powershell
. ~/.dev-secrets/Load-ProjectSecrets.ps1
Load-ProjectSecrets
$env:GH_TOKEN = $env:GITHUB_CLASSIC_API_KEY

# List secrets
gh secret list --repo iurii-izman/replyline

# Add/update a secret
$value = Get-Secret -Name SOME_KEY -Vault DevVault -AsPlainText
$value | gh secret set SOME_KEY --repo iurii-izman/replyline
```

---

## 7. Key Files Reference

| File | Purpose |
|------|---------|
| `AGENTS.md` | Agent/AI instructions for this repo |
| `CLAUDE.md` | Claude-specific adapter |
| `CONTRIBUTING.md` | Contribution workflow |
| `docs/copy-rules.md` | Product wording constraints |
| `docs/error-catalog.md` | All error types + user messages |
| `docs/extension-points.md` | How to add features |
| `docs/secrets-management.md` | Key storage guide |
| `docs/architecture.md` | System architecture |
| `scripts/check-ipc-handler-contract.mjs` | IPC command count check |
| `scripts/check-consistency.mjs` | Cross-file consistency |
| `scripts/check-prompt-contract.mjs` | Prompt fixture validation |
| `.env.keys` | Project secret manifest |

---

## 8. Common Issues

### "Запись не была активна"
The hotkey didn't register. Check:
- Is another app using `Ctrl+Alt+Space`?
- Try a different combo in Settings

### Empty transcript
Replyline captures **system audio** (WASAPI loopback), not the microphone.
- Make sure the conversation audio plays through speakers/headphones
- Check Windows Sound Settings → Output device

### "Нет ответа шлюза"
LLM gateway unreachable. Check:
- Base URL is correct (e.g. `https://openrouter.ai/api/v1`)
- Model name is valid (e.g. `anthropic/claude-sonnet-4`)
- API key is set and has credits

### Rust compile errors after pulling
```powershell
cargo clean --manifest-path src-tauri/Cargo.toml
pnpm tauri dev
```

### Secrets not loading
```powershell
Import-Module Microsoft.PowerShell.SecretManagement
Get-SecretInfo -Vault DevVault   # Should list your keys
```
If empty, the vault wasn't configured. See Section 1.
