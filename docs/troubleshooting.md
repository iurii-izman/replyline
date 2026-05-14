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
- The transcript was too short or unintelligible for meaningful analysis.
- API rate limits or token limits truncated the response.

**Fix:**

- Try a more capable model (e.g. `gpt-4o-mini` or larger).
- Ensure capture duration is at least 5-10 seconds of audible speech.
- Check `llmTemperature` — values near 0 are more deterministic, values near 2 may produce erratic output.
- If using a custom system prompt, try clearing it to use the built-in prompt.

## 7. Streaming STT produces no transcript

**Symptoms:** With `useStreamingStt` enabled, capture completes but transcript is empty.

**Causes:**

- WebSocket connection to Deepgram failed silently.
- The Deepgram plan does not support streaming API access.
- Network firewall blocks WebSocket connections (`wss://`).

**Fix:**

- Disable `useStreamingStt` in settings to fall back to batch HTTP mode.
- Verify your Deepgram plan supports the streaming API at [console.deepgram.com](https://console.deepgram.com).
- Check firewall/proxy settings for WebSocket (`wss://api.deepgram.com`).

## 8. High latency (> 10 seconds from release to card)

**Symptoms:** The card appears with noticeable delay after releasing the hotkey.

**Causes:**

- STT transcription is slow (large audio file, server congestion).
- LLM analysis is slow (model size, cold start, or rate limiting).
- Network latency to cloud providers.

**Fix:**

- Reduce `captureMaxSeconds` in settings (shorter captures = faster processing).
- Enable `useStreamingStt` for parallel transcription during capture.
- Use a faster/smaller LLM model.
- For lowest latency, use local providers (Whisper.cpp + Ollama with GPU).

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

## 10. Memory spaces not saving or loading

**Symptoms:** Created memory spaces disappear after restart, or "Save to memory" fails.

**Causes:**

- File permissions on `%APPDATA%\com.replyline.app\memory\` directory.
- Disk full or write-protected.
- Antivirus blocking JSON file writes.

**Fix:**

- Check that the directory `%APPDATA%\com.replyline.app\memory\` exists and is writable.
- Verify available disk space.
- Add an antivirus exclusion for the Replyline app data directory.
- Check the app log at `%LOCALAPPDATA%\com.replyline.app\app.log` for error details.

## 11. How to triage with diagnostic events

If runtime fails unpredictably, collect a diagnostic bundle and inspect:

- `diagnostics/runtime-events.json` for `stage/outcome/code`
- `logs/app.log` for nearby context

Prioritize the latest `outcome=fail` event and match by timestamp.
