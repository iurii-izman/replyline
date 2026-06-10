# Replyline Troubleshooting Guide

## 1. No audio captured (silent WAV)

**Symptoms:** Pipeline completes but STT returns empty transcript.

**Causes:**

- No system audio is playing during capture (Replyline captures system output, not microphone).
- The active audio device is not the default Windows playback device.
- Another application has exclusive WASAPI access to the device.

**Fix:**

- Ensure a call or media is actively playing through the default Windows output device.
- Check Windows Sound Settings > Output > make sure the correct device is default.
- Close audio-exclusive applications (some DAWs or game engines lock the device).

## 2. Deepgram API key rejected (401 / 403)

**Symptoms:** Pipeline fails at STT step with "Unauthorized" or "Forbidden".

**Causes:**

- The Deepgram API key is expired, invalid, or not yet activated.
- The key is stored incorrectly in Windows Credential Manager.

**Fix:**

- Verify the key at [console.deepgram.com](https://console.deepgram.com).
- In Replyline settings, delete and re-enter the Deepgram key.
- Use the health check button in settings to verify connectivity.

## 3. LLM endpoint unreachable (connection refused / timeout)

**Symptoms:** Pipeline fails at analysis step with connection error.

**Causes:**

- The `llmBaseUrl` is incorrect or the server is not running.
- Firewall blocking outbound connections.
- For local LLM: the server process is not started.

**Fix:**

- Check the `llmBaseUrl` in settings (should end with `/v1` for OpenAI-compatible APIs).
- For Ollama: ensure `ollama serve` is running.
- For LM Studio: verify the local server is active and the port matches settings.
- Use the health check button to diagnose.

## 4. Hotkey does not trigger capture

**Symptoms:** Pressing the configured hotkey does nothing.

**Causes:**

- Another application has registered the same global hotkey.
- The Replyline window is not running (check system tray).
- The hotkey string is malformed in settings.

**Fix:**

- Change the hotkey in settings to an unused combination (e.g. `Ctrl+Alt+Space`).
- Restart Replyline after changing the hotkey.
- Check Task Manager for conflicting apps that register global shortcuts.

## 5. Settings file corrupted (app starts with defaults)

**Symptoms:** All settings reset to defaults after a crash or unexpected shutdown.

**Causes:**

- A crash or power loss during a settings write operation left a partial JSON file.
- Manual editing of `settings.json` introduced invalid JSON.

**What happened:**

- Replyline detected the corrupt file, renamed it to `settings.json.corrupt.<timestamp>`, and loaded defaults.

**Fix:**

- Re-enter your settings in the Replyline settings panel.
- If needed, examine the `.corrupt` file in `%APPDATA%\com.replyline.app\` to recover values.

## 6. LLM returns garbled or empty card

**Symptoms:** The result card shows `[partial]` prefixes or all fields are empty.

**Causes:**

- The LLM model is too small or constrained for the prompt.
- The transcript was unintelligible or the model returned an invalid card.
- API rate limits or token limits truncated the response.

**Fix:**

- Try a more capable model (e.g. `gpt-4o-mini` or larger).
- A complete short question is supported; make sure the system audio is audible and clear.
- Temperature is internally fixed at 0.25 (deterministic). Not exposed as a user setting in the current stable beta.
- If using a custom system prompt, try clearing it to use the built-in prompt.

## 7. STT returns no transcript

**Symptoms:** Capture completes but transcript is empty.

**Current STT path:** Replyline stable beta uses Deepgram batch HTTP STT (no user-facing streaming STT toggle in Settings).

**Causes:**

- Audio snippet contains silence or no meaningful system-audio signal.
- Deepgram request failed due to network/provider issue.
- Deepgram key is missing/invalid.

**Fix:**

- There is no minimum recording duration. Capture the complete question with clear system audio.
- Re-check Deepgram key and run the settings health check.
- Retry after network recovery; if needed, collect local diagnostics via `pnpm evidence:bundle`.

## 8. High latency (> 10 seconds from release to card)

**Symptoms:** The card appears with noticeable delay after releasing the hotkey.

**Causes:**

- STT transcription is slow (large audio file, server congestion).
- LLM analysis is slow (model size, cold start, or rate limiting).
- Network latency to cloud providers.

**Fix:**

- Reduce `captureMaxSeconds` in settings (shorter captures = faster processing).
- Use a faster/smaller LLM model.
- For lowest latency on the LLM side, use a local LLM provider (Ollama with GPU). Local STT (e.g. Whisper.cpp) is not available in the current stable beta.

## 9. "Cannot find module" or build errors after update

**Symptoms:** `pnpm build` or `pnpm smoke` fails with import errors.

**Causes:**

- Dependencies were updated but not installed.
- Node modules or Cargo cache is stale.

**Fix:**

```bash
pnpm install
cargo check --manifest-path src-tauri/Cargo.toml
pnpm build
```

If the problem persists, clean and rebuild:

```bash
rm -rf node_modules
pnpm install
cargo clean --manifest-path src-tauri/Cargo.toml
pnpm smoke
```

## 10. How to triage with diagnostic events

If runtime fails unpredictably, run `pnpm evidence:bundle` and inspect:

- `diagnostics/runtime-events.json` for `stage/outcome/code`
- `logs/app.log` for nearby context

Prioritize the latest `outcome=fail` event and match by timestamp.
