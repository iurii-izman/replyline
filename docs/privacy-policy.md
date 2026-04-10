# Replyline Privacy Policy (Alpha)

This document describes what Replyline captures, where data goes, what is stored, and what the user controls. It applies to the current internal alpha build.

## What Replyline captures

Replyline captures system audio via WASAPI loopback. This means it records the audio output of your computer (what you hear through speakers or headphones), not your microphone input.

Capture begins only when you hold the configured hotkey and stops when you release it. There is no background or continuous recording. The maximum capture duration is configurable (default: 30 seconds).

## Where data goes

During a capture-analyze cycle, data passes through these stages:

1. **RAM**: Raw PCM audio is held in memory during capture. After the hotkey is released, it is WAV-encoded in memory.
2. **External STT provider**: The WAV audio is sent to your configured speech-to-text provider (default: Deepgram) over HTTPS for transcription.
3. **RAM**: The transcript text is held in the conversation context (RAM only).
4. **External LLM provider**: The transcript and prior context are sent to your configured LLM endpoint over HTTPS for analysis.
5. **RAM -> UI**: The resulting card (gist, say_now, next_move) is displayed in the overlay window.

No step in this pipeline writes audio or transcripts to disk by default.

## What is stored locally

| Data                                              | Location                                    | Format                     | Retention                                 |
| ------------------------------------------------- | ------------------------------------------- | -------------------------- | ----------------------------------------- |
| Settings (hotkey, provider URLs, model, language) | `%APPDATA%\com.replyline.app\settings.json` | Plaintext JSON             | Until user changes or deletes             |
| API keys (Deepgram, LLM)                          | Windows Credential Manager                  | OS-managed encrypted store | Until user revokes                        |
| App event log                                     | `%LOCALAPPDATA%\com.replyline.app\app.log`  | Line-delimited text        | 5 MB rotation (oldest lines dropped)      |
| Debug WAV files                                   | `%LOCALAPPDATA%\com.replyline.app\debug\`   | WAV                        | Written only on STT failure; user manages |
| Memory store (spaces, facts, commitments, terms)  | `%APPDATA%\com.replyline.app\memory\`       | JSON                       | User manages                              |

## What is NOT stored

- Raw audio after processing. PCM and WAV data are discarded from memory after the STT call completes.
- Transcripts after the session. The conversation context is RAM-only and is cleared on app restart or after the TTL expires.
- Full conversation recordings. Replyline captures short fragments (up to the configured max seconds), not entire calls.
- Result cards after the session. Cards exist in the UI state only and are lost on app restart.

## External providers

Replyline sends data to two external services that the user configures:

1. **Speech-to-text provider** (default: Deepgram). Receives WAV audio for transcription.
2. **LLM provider** (user-configured endpoint). Receives transcript text and context for analysis.

Replyline does not control and is not responsible for how these providers store, log, or retain data sent to them. Users should review the privacy policies and data retention terms of their chosen providers independently.

## User control

Users can:

- **Configure providers**: Choose which STT and LLM endpoints receive their data via the settings surface.
- **Clear context**: Reset the in-memory conversation context at any time (tray menu or UI action).
- **Delete settings**: Remove `settings.json` to reset all preferences.
- **Revoke API keys**: Delete stored keys through the settings surface or directly in Windows Credential Manager.
- **Delete debug WAVs**: Remove any files in the debug directory manually.
- **Manage memory store**: Edit or delete memory space JSON files directly.

## Data retention

| Data type                  | Retention policy                                                               |
| -------------------------- | ------------------------------------------------------------------------------ |
| Conversation context (RAM) | 20-minute TTL from last use, max 3 entries. Cleared on app restart.            |
| App event log              | 5 MB rotation. Oldest entries are dropped when the log exceeds the size limit. |
| Settings                   | Persisted until user changes or deletes the file.                              |
| API keys                   | Persisted in Credential Manager until user revokes them.                       |
| Memory store               | Persisted until user deletes space files.                                      |
| Debug WAVs                 | Written only on STT failure. User responsible for cleanup.                     |

## Legal responsibility

Replyline is a tool. The user is responsible for:

- Complying with recording and wiretapping laws in their jurisdiction.
- Adhering to the policies of their employer regarding call recording and monitoring.
- Following the terms of service of the communication platform being used (Teams, Zoom, Meet, etc.).
- Reviewing and accepting the terms of their chosen external STT and LLM providers.

Replyline does not provide legal advice and makes no guarantees about the legality of capturing system audio in any specific context. Users must make their own informed legal assessment before use.
