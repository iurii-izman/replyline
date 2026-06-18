# Replyline User Guide

Compact guide for the current Windows public beta.

## 1. What Replyline does

Replyline is a Windows tray app — universal live assistant for work conversations.

- You hold a global hotkey to capture a short system-audio snippet.
- Replyline sends the released snippet to Deepgram for speech-to-text.
- Replyline sends transcript text and bounded context to your configured OpenAI-compatible LLM endpoint.
- The app returns one compact card in the local UI.

Two user flows ship today:

- `WorkConversation` gives one card with `gist`, `say_now`, and `next_move`. An active ContextPack can provide user-controlled background context for the conversation.
- `Interview Mode` is a context usage example that gives interview-focused cards during an active session and can save a local report.

Current shipped scope is intentionally narrow:

- no hidden or stealth workflow
- no transcript/history workspace
- no signed public installer yet
- no shipped bilingual/live-translation flow
- no shipped memory or local STT

See [limitations.md](limitations.md) for the full current beta boundary.

## 2. First 10 minutes

This is the fastest path from zero to a working capture with ContextPack.

### Prerequisites (one-time)

- Windows 10 or 11.
- [Node.js](https://nodejs.org/) 22 LTS and [pnpm](https://pnpm.io/installation) 10.
- [Rust toolchain](https://www.rust-lang.org/tools/install) (stable, latest).
- [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/) for Windows.

### Quick start

```powershell
git clone https://github.com/iurii-izman/replyline.git
cd replyline
git checkout v0.2.0-beta.3
pnpm install --frozen-lockfile
pnpm beta:doctor
pnpm beta:start
```

`pnpm beta:doctor` checks that local tooling is ready. `pnpm beta:start` launches
the desktop app. Neither installs prerequisites automatically — install them first.

> **Screenshot placeholder**: `first-launch-idle.png` — Replyline tray icon and
> idle MainSurface showing the ContextPack hint and hotkey instruction.

### Setup walkthrough

The app guides you through three essential steps when you first open it:

1. **Speech** — enter your Deepgram API key. The key is stored in Windows
   Credential Manager, never in plaintext settings.
2. **LLM route** — choose a model preset or set a custom OpenAI-compatible
   endpoint. Fill the base URL (e.g. `https://api.openai.com/v1`) and model name
   (e.g. `gpt-4o-mini`).
3. **Hotkey** — assign a capture shortcut. Default safe choice: `Ctrl+Alt+Space`.

After filling the required fields, open **Settings → Overview** and click
**Run check** to verify that Speech and LLM are reachable.

> **Screenshot placeholder**: `settings-providers.png` — Settings panel with
> provider fields filled (keys redacted).

### Create your first ContextPack

1. Once all three setup steps show ✓, click **Create conversation context**.
2. Give it a short name (e.g. "Q3 planning").
3. Write your background context in the brief editor — your role, the project,
   relevant constraints.
4. Click **Save** and then **Set Active**.

> **Screenshot placeholder**: `context-pack-create.png` — ContextPack panel
> showing the brief editor with a filled name and context text.
>
> **Screenshot placeholder**: `context-pack-active.png` — MainSurface with
> active ContextPack badge visible.

### First capture

1. Make sure system audio is playing through your default Windows output device.
2. Hold `Ctrl+Alt+Space` while a safe synthetic phrase plays.
3. Release the hotkey.
4. During processing you will see an elapsed timer, stage indicator, and
   progress feedback.
5. Wait for the card: headline answer, supporting detail, gist, and next move.

Use synthetic, non-confidential audio for testing. Example safe phrase:

> "We moved the deadline to tomorrow but the input data isn't agreed yet.
> How do I flag the risk calmly and suggest a next step?"

> **Screenshot placeholder**: `first-card.png` — MainSurface showing a
> completed card with answer headline, detail, gist, and next move visible.

### What next

- [ContextPack section](#7-contextpack) — more on managing conversation context.
- [Troubleshooting](#9-troubleshooting-quick-table) — if something doesn't work.
- [BETA_TESTING.md](../../BETA_TESTING.md) — 15-minute smoke test for testers.

## 3. Detailed setup

1. Use Windows 10 or 11.
2. Start Replyline from the supported source setup path in [README.md](../../README.md).
3. Open `Settings`.
4. Set a capture hotkey. Default safe choice: `Ctrl+Alt+Space`.
5. Enter a Deepgram API key.
6. Choose a model preset or set a custom OpenAI-compatible endpoint.
7. Fill `LLM base URL` and `LLM model`.
8. Add `LLM API key` if your endpoint requires one.
9. Save settings and run the built-in health checks if needed.
10. Test with synthetic, non-confidential audio first.

Notes:

- Replyline captures system output, not microphone input, in the normal shipped path.
- API keys stay in Windows Credential Manager, not in `settings.json`.
- Remote LLM endpoints should use `https://`; `http://` is for local or local-network routes only.
- Keep confidential real conversations out of routine beta testing when possible.

## 4. Settings reference

Only active user-facing settings are listed here.

| Setting | What it controls | Notes |
| --- | --- | --- |
| `hotkey` | Hold-to-capture shortcut | Reserved close/refresh shortcuts are rejected. |
| `captureMaxSeconds` | Maximum capture length | Range: `5..180`; shorter clips usually return faster. |
| `selectedModelPreset` | Preset for the LLM route | Includes OpenRouter presets and `Custom OpenAI-compatible`. |
| `llmBaseUrl` | OpenAI-compatible endpoint URL | Usually ends with `/v1`. |
| `llmModel` | Model name sent to the LLM endpoint | Required for analysis. |
| `llmApiKey` | Optional LLM credential | Stored in Windows Credential Manager. |
| `deepgramApiKey` | Deepgram credential for STT | Stored in Windows Credential Manager. |
| `interviewReportRetentionDays` | Auto-purge window for saved interview reports | `0` keeps reports until manual clear. |
| `debugTraceMode` | Local diagnostics sensitivity | `off`, `redacted`, or `full_local`. |
| `debugTraceRetentionDays` | Auto-cleanup window for local traces | `0` means manual cleanup only. |

Diagnostics notes:

- `debugTraceMode=redacted` is the safer default for routine triage.
- `debugTraceMode=full_local` can store sensitive local artifacts such as transcript, prompts, responses, and WAV files.
- There is no user-facing Advanced Mode in the shipped beta.
- Local vs Cloud URL policy: use `https://` for remote/provider-hosted routes; reserve `http://` for local or local-network endpoints only.

## 5. WorkConversation flow

1. Make sure system audio is playing through the default Windows output device.
2. Hold the configured hotkey while the other person is speaking.
3. Release the hotkey when the useful fragment ends.
4. Wait for one compact card.
5. Read `gist` for the short summary, `say_now` for the immediate response, and `next_move` for the follow-up step.
6. Use `Retry` if you want a second pass on the latest captured fragment.

WorkConversation is optimized for short, high-pressure moments. It is not a meeting transcript tool and does not keep a long conversation history in the shipped beta.

## 6. Interview Mode (context usage example)

Interview Mode is a specialised use of WorkConversation with interview-oriented context.

1. Open `Interview Mode` and start an interview session.
2. Capture each question with the same hold-and-release hotkey flow.
3. Review the interview card for the current question.
4. Move between cards with keyboard or UI navigation.
5. End the session when the interview practice block is complete.
6. Review the local interview report if you want a recap after the session.

Important boundaries:

- Interview Mode is a visible local assistance surface.
- Use it only where interview assistance is allowed in your context.
- Scores and feedback are heuristics, not formal assessments.
- Interview Mode is an example of context usage, not a separate product centre.

## 7. ContextPack

ContextPack is the only shipped conversation context system. It is optional,
local, and user-controlled.

Typical flow:

1. Open the ContextPack panel.
2. Create or edit a pack with the background context you want Replyline to use.
3. Set exactly one pack active when you want it included in prompts.
4. Clear the active pack when the conversation no longer needs it.

Boundaries:

- Saved ContextPack files stay local.
- Active ContextPack content can be sent to your configured LLM provider as part of card generation.
- ContextPack is used by WorkConversation and Interview Mode when active.
- Do not add fabricated metrics, achievements, or claims to a pack.

## 8. Reports and exports

Interview reports are local-only artifacts saved on your machine.

- Ending an interview session saves the report locally.
- `Export full markdown` is sensitive because it can include transcript content.
- `Export redacted markdown` excludes raw/full transcript and is the safer sharing path.
- `Clear reports` removes saved interview reports and resets local interview-report state.

ContextPack files, interview reports, and debug traces can contain sensitive content. Read the storage and provider details in [privacy.md](privacy.md) before sharing anything externally.

## 9. Troubleshooting quick table

| Problem | Likely cause | What to check |
| --- | --- | --- |
| No card after capture | Hotkey conflict or app not running | Change hotkey, restart Replyline, check tray presence. |
| Empty transcript | No meaningful system audio or Deepgram issue | Confirm audio is playing on the default output device and re-check the Deepgram key. |
| Deepgram `401/403` | Invalid or expired STT key | Re-enter the key and run the health check. |
| LLM timeout or connection error | Wrong `llmBaseUrl`, server down, firewall | Verify the URL, endpoint health, and model name. |
| Vague or partial card | Weak transcript or model too small | Re-capture a clearer snippet or use a more capable model. |
| Settings reset to defaults | Corrupt `settings.json` after crash/edit | Re-enter settings; inspect the `.corrupt` backup if needed. |
| Slow response after release | Large clip, slow provider, or network latency | Lower `captureMaxSeconds` or use a faster model. |
| Retry unavailable | No previous capture to reuse | Capture one snippet first. |

If the problem still reproduces, use [BETA_TESTING.md](../../BETA_TESTING.md) for the tester flow and the issue-reporting path.

## 10. Accessibility / keyboard notes

Replyline supports a practical keyboard-first flow in the current beta.

- `Ctrl+Alt+Space`: start and stop capture
- `Tab` / `Shift+Tab`: move through controls
- `Enter` / `Space`: activate focused buttons and tabs
- `Escape`: dismiss notices and clear the current error state
- `R`: retry the latest analysis when available
- `ArrowLeft` / `ArrowRight`: move between interview cards
- `1`-`6`: jump to an interview card when that slot exists
- `Ctrl+C`: copy the current card when the main card is focused

Current accessibility note:

- this is a practical keyboard audit, not a WCAG certification claim

## 11. Where to read more

- [privacy.md](privacy.md) - capture, storage, provider, and export boundaries
- [provider-setup.md](provider-setup.md) - OpenRouter, Groq, and custom provider configuration
- [limitations.md](limitations.md) - current beta scope and non-shipped tracks
- [BETA_TESTING.md](../../BETA_TESTING.md) - short smoke-test path for testers
