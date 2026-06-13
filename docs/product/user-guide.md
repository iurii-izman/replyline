# Replyline User Guide

Compact guide for the current Windows public beta.

## 1. What Replyline does

Replyline is a Windows tray app for short, difficult live conversations and interview practice.

- You hold a global hotkey to capture a short system-audio snippet.
- Replyline sends the released snippet to Deepgram for speech-to-text.
- Replyline sends transcript text and bounded context to your configured OpenAI-compatible LLM endpoint.
- The app returns one compact card in the local UI.

Two user flows ship today:

- `WorkConversation` gives one card with `gist`, `say_now`, and `next_move`.
- `Interview Mode` gives interview-focused cards during an active interview session and can save a local report.

Current shipped scope is intentionally narrow:

- no hidden or stealth workflow
- no transcript/history workspace
- no signed public installer yet
- no shipped bilingual/live-translation flow
- no shipped memory or local STT

See [limitations.md](limitations.md) for the full current beta boundary.

## 2. Setup checklist

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

## 3. Settings reference

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

## 4. WorkConversation flow

1. Make sure system audio is playing through the default Windows output device.
2. Hold the configured hotkey while the other person is speaking.
3. Release the hotkey when the useful fragment ends.
4. Wait for one compact card.
5. Read `gist` for the short summary, `say_now` for the immediate response, and `next_move` for the follow-up step.
6. Use `Retry` if you want a second pass on the latest captured fragment.

WorkConversation is optimized for short, high-pressure moments. It is not a meeting transcript tool and does not keep a long conversation history in the shipped beta.

## 5. Interview Mode flow

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

## 6. Candidate Pack inside Interview Mode

Candidate Pack is not a separate everyday product surface. It is optional prep context for Interview Mode.

Use it when you want interview answers anchored to your background and the target role.

Typical flow:

1. Paste resume text, job description, and optional company/about text.
2. Run Candidate Pack preparation explicitly.
3. Review the prepared result and save it locally.
4. Start Interview Mode; the saved compact pack can be used as interview context by default.

Boundaries:

- Raw source text stays local until you explicitly run preparation.
- Preparation can send that content to your configured LLM provider.
- Saved Candidate Pack files stay local.
- Candidate Pack context is used for Interview Mode, not for WorkConversation by default.
- Do not fabricate metrics or achievements when preparing the pack.

## 7. Reports and exports

Interview reports are local-only artifacts saved on your machine.

- Ending an interview session saves the report locally.
- `Export full markdown` is sensitive because it can include transcript content.
- `Export redacted markdown` excludes raw/full transcript and is the safer sharing path.
- `Clear reports` removes saved interview reports and resets local interview-report state.

Candidate Pack files, interview reports, and debug traces can contain sensitive content. Read the storage and provider details in [privacy.md](privacy.md) before sharing anything externally.

## 8. Troubleshooting quick table

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

## 9. Accessibility / keyboard notes

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

## 10. Where to read more

- [privacy.md](privacy.md) - capture, storage, provider, and export boundaries
- [limitations.md](limitations.md) - current beta scope and non-shipped tracks
- [BETA_TESTING.md](../../BETA_TESTING.md) - short smoke-test path for testers
