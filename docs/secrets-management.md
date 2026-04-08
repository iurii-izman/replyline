# Secrets Management

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│  PowerShell SecretStore (vault: DevVault)                 │
│  AES-256 encrypted, DPAPI-protected, local-only          │
│                                                          │
│  ANTHROPIC_API_KEY        OPENROUTER_API_KEY              │
│  DEEPGRAM_API_KEY         PROMPTFOO_API_KEY               │
│  GITHUB_CLASSIC_API_KEY   SENTRY_AUTH_TOKEN               │
│  GITHUB_FINE_GRAINED_..   WAKATIME_API_KEY                │
│  GITHUB_PERSONAL_ACCESS.. LANGFUSE_PUBLIC_KEY             │
│  LINEAR_API_KEY           LANGFUSE_SECRET_KEY             │
└──────────────┬───────────────────────────────────────────┘
               │  Get-Secret (on demand)
               ▼
┌──────────────────────────────────┐
│  .env.keys (per project)         │
│  Declares which keys needed      │
│  Committed to repo (no values!)  │
└──────────────┬───────────────────┘
               │  Load-ProjectSecrets
               ▼
┌──────────────────────────────────┐
│  Process env ($env:...)          │
│  Session-only, not persisted     │
│  Visible to current terminal     │
└──────────────────────────────────┘
```

## Quick Start

```powershell
# 1. Open terminal in project root
cd C:\Dev\replyline

# 2. Load secrets into session
. ~/.dev-secrets/Load-ProjectSecrets.ps1
Load-ProjectSecrets

# 3. Verify
$env:OPENROUTER_API_KEY  # should show value

# 4. When done, unload (optional)
Unload-ProjectSecrets
```

## Adding a New Secret

```powershell
# 1. Store in vault
Import-Module Microsoft.PowerShell.SecretManagement
Set-Secret -Name "NEW_SERVICE_KEY" -Secret "sk-..." -Vault DevVault

# 2. Add to project's .env.keys (if the project needs it)
# Just add the name on a new line

# 3. Reload
Load-ProjectSecrets
```

## Listing All Stored Secrets

```powershell
Import-Module Microsoft.PowerShell.SecretManagement
Get-SecretInfo -Vault DevVault | Format-Table Name, Type
```

## For New Projects

Create a `.env.keys` file in the project root listing required secret names:

```
# my-other-project/.env.keys
ANTHROPIC_API_KEY
SENTRY_AUTH_TOKEN
```

Then `.env.keys` should be committed (it has no values), while `.env` / `.env.*` stay gitignored.

## CI Secrets

CI secrets are managed separately via GitHub Actions:

```powershell
# Set a secret (requires repo admin access)
$env:GH_TOKEN = Get-Secret -Name GITHUB_CLASSIC_API_KEY -Vault DevVault -AsPlainText
$value = Get-Secret -Name OPENROUTER_API_KEY -Vault DevVault -AsPlainText
$value | gh secret set OPENROUTER_API_KEY --repo owner/repo
```

## Security Properties

| Property | User Env Vars (old) | SecretStore (new) |
|---|---|---|
| Encrypted at rest | No (plaintext registry) | Yes (AES-256 + DPAPI) |
| Visible to all processes | Yes | No |
| Requires explicit loading | No | Yes |
| Scoped per project | No | Yes (via .env.keys) |
| Survives reboot | Yes | Yes (vault persists) |
| Audit trail | None | PowerShell logging |

## AI Tool Considerations

AI coding assistants (Cursor, Windsurf, Claude Code) can execute shell commands and
read environment variables. The SecretStore approach does not prevent a tool with shell
access from calling `Get-Secret`. The security improvement is:

1. Keys are not broadcast to every process via `$env:*`
2. Keys are encrypted at rest (not plaintext in registry)
3. Explicit loading creates an audit-friendly pattern
4. Per-project scoping means each project only loads what it needs
