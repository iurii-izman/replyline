# Replyline Support and QA Snapshot

Use the support snapshot when you need to report a setup/runtime issue without
sharing private conversation data.

## Copy a snapshot

1. Open **Settings**.
2. Open **Advanced**.
3. In **Diagnostics and operations**, click **Copy diagnostic snapshot**.
4. Paste the copied markdown into a support or QA thread.

## Included fields

- App version and build commit, when available.
- Current UI phase: `idle`, `capturing`, `transcribing`, `analyzing`, `ready`, `error`, or `unknown`.
- Provider readiness metadata: Deepgram key present, LLM route configured, LLM key present, runtime path ready, selected model preset, and route kind.
- Active ContextPack title only.
- Last error category only.
- OS, CPU architecture, OS family, and desktop runtime.

## Privacy boundary

The snapshot is designed to be public-safe by default. It must not include:

- raw transcript text;
- raw ContextPack content;
- prompt bodies;
- provider request or response bodies;
- API keys, bearer tokens, or credential values;
- local filesystem paths.

If support needs deeper evidence, use the explicit diagnostics flows described in
[privacy.md](privacy.md) and review every artifact before sharing it.
