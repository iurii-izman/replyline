# Replyline Docs

Короткая навигация по документации Replyline для текущей внутренней stable beta.

## Read first

- [verification-lanes.md](verification-lanes.md)
- [runtime-bringup.md](runtime-bringup.md)
- [runtime-evidence.md](runtime-evidence.md)
- [smoke-checks.md](smoke-checks.md)
- [release-readiness.md](release-readiness.md)
- [rust-dependency-security.md](rust-dependency-security.md)

## Runtime and release

- [runtime-decisions.md](runtime-decisions.md)
- [live-runtime-matrix.md](live-runtime-matrix.md)
- [benchmark-policy.md](benchmark-policy.md)
- [rust-dependency-security.md](rust-dependency-security.md)

## Product and trust

- [copy-rules.md](copy-rules.md)
- [privacy-and-trust.md](privacy-and-trust.md)
- [known-limitations.md](known-limitations.md)
- [third-party-providers.md](third-party-providers.md)
- [prompt-contract-lane.md](prompt-contract-lane.md)

## Archived strategy docs

- [archive/strategic/README.md](archive/strategic/README.md)

## Internal reference

- [naming-decision-brief.md](naming-decision-brief.md)
- [memory-layer.md](memory-layer.md) (future layer, не core MVP story)
- [i18n-beta-prep.md](i18n-beta-prep.md) (future multilingual prep, не часть текущей stable-beta UX)
- [internal-alpha-checklist.md](internal-alpha-checklist.md)
- [tester-brief.md](tester-brief.md)
- [test-feedback-template.md](test-feedback-template.md)
- [internal-alpha-handoff-note-template.md](internal-alpha-handoff-note-template.md)

## Troubleshooting

| Problem                                | Likely cause                                                                                       | Fix                                                                                                                                                 |
| -------------------------------------- | -------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| **No audio captured**                  | WASAPI loopback sees no system output, or wrong audio device is default.                           | Play any sound in Windows before holding the hotkey. Verify the correct playback device is set as default in Windows Sound settings.                |
| **STT returns empty / fails**          | Deepgram API key is missing, expired, or the network is down.                                      | Open Settings, re-enter a valid Deepgram key, click Save. Check that the machine has internet access.                                               |
| **LLM unreachable / timeout**          | Gateway URL or model name is wrong, or the provider is down.                                       | Verify the gateway URL (`/v1` suffix) and model name in Settings. Try opening the URL in a browser to confirm the host responds.                    |
| **Hotkey conflict**                    | Another program already registered the same global shortcut.                                       | Change the hotkey in Settings to an unused combination (e.g. `Ctrl+Alt+Space` → `Ctrl+Shift+.`).                                                    |
| **Settings file corrupt / app resets** | A crash during save left invalid JSON. The app auto-quarantines the file and starts with defaults. | Re-enter your settings and save again. The corrupt file is preserved as `settings.json.corrupt.<timestamp>` in the config directory for inspection. |

## Fast gates

- `pnpm smoke` -> build + Rust tests + mock/UI lane + deterministic product-policy gates
- `pnpm runtime:preflight` -> machine-local readiness snapshot
- `pnpm rust:deps` -> authoritative Rust supply-chain gate for this repo
