# Replyline Privacy, Trust, and Data Flow

Canonical public-beta privacy, storage, and provider data-flow guide.

## What Replyline captures

- Replyline captures short system-audio snippets through WASAPI loopback.
- Capture starts only while the configured hotkey is held and stops on release.
- Replyline does not capture microphone input by default and does not run background continuous recording.
- The product processes a short fragment, not a full-call recording workflow.

## Where data goes

During the normal runtime path:

1. Raw audio is held in RAM during capture.
2. The captured snippet is encoded in memory and sent to Deepgram for speech-to-text.
3. Transcript text and bounded context are held in RAM.
4. Transcript/context are sent to the configured OpenAI-compatible LLM endpoint for card generation.
5. The resulting card is shown in the local UI.

Default runtime does not write raw audio or transcripts to disk automatically.

## What is stored locally

| Data | Location | Notes |
| --- | --- | --- |
| App settings | `%APPDATA%\com.replyline.app\settings.json` | Local plaintext JSON preferences. |
| API keys | Windows Credential Manager | OS-managed secret storage. |
| App log | `%APPDATA%\com.replyline.app\logs\app.log` | Sanitized operational log with size rotation. |
| Interview reports | `%LOCALAPPDATA%\com.replyline.app\reports\interview-reports.json` | Local-only report store with user-controlled retention. |
| Candidate Pack files | `%APPDATA%\com.replyline.app\candidate-pack.v1.json`, `%APPDATA%\com.replyline.app\candidate-pack-latest.json` | Local preparation artifacts for Interview Mode. |
| Debug traces | Local trace directory controlled by Settings | Optional diagnostics artifacts; sensitivity depends on trace mode. |

## What is not stored by default

- Raw audio after routine processing.
- Conversation transcript history as a background product database.
- Full prompt or full provider response bodies in normal logs.
- WorkConversation cards as a persistent history surface.

Conversation context is RAM-only, bounded, and cleared on restart or after TTL expiry.

## Reports, exports, and diagnostics

- Interview reports are local-only artifacts and can include transcript content.
- Report export happens only on explicit user action.
- `Export full markdown` is sensitive because it can include transcript content.
- `Export redacted markdown` excludes raw/full transcript and is the safer sharing path.
- Bilingual interview export is also explicit only:
  - `full` can include finalized transcript-derived content.
  - `redacted` includes metadata only and excludes raw transcript text, translated text, full prompts, and raw Candidate Pack values.
- `debugTraceMode=redacted` keeps diagnostics sanitized for routine triage.
- `debugTraceMode=full_local` can retain transcript, prompt, response, and captured WAV content locally and should be treated as high-sensitivity diagnostics.

## Candidate Pack boundary

- Raw resume, job description, and company text stay local until the user explicitly runs `prepare_candidate_pack`.
- During preparation, relevant content can be sent to the configured LLM provider.
- Saved compact Candidate Pack context stays local.
- Candidate Pack context is used by default for Interview Mode only, not WorkConversation.

## External STT and LLM providers

Replyline relies on external providers in the shipped beta runtime:

- Deepgram receives the released audio snippet for speech-to-text.
- The configured OpenAI-compatible LLM provider receives transcript text and bounded context for generation.

Replyline controls when capture starts and stops, local storage surfaces, and local export/diagnostic behavior. Replyline does not control provider-side retention, logging, latency, quotas, or availability. Users must review provider terms independently.

## Local vs cloud URL policy

- Remote/provider-hosted LLM routes are expected to use `https://`.
- `http://` is accepted only for local or local-network routes such as loopback, private-network, or `.local` setups.
- A local LLM URL does not make the entire product local-only when Deepgram STT is enabled; shipped beta still sends audio to Deepgram.

## User responsibility

The user is responsible for:

- complying with local recording and data-transfer laws;
- following employer and call-platform policies;
- choosing trusted provider endpoints and reviewing provider retention/logging terms;
- reviewing any export before sharing it externally;
- avoiding confidential real-world content in public beta testing unless they have the right to process it.

Replyline does not provide legal advice and does not guarantee that any capture scenario is lawful in a specific jurisdiction.

## Product-boundary note

Non-shipped tracks such as memory, local STT, multilingual expansion, and broader provider expansion are documented only as limitations/future boundaries. See [limitations.md](limitations.md).
