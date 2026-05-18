# Interview Mode

Replyline supports two product paths:

- WorkConversation Mode
- Interview Mode

## Scope and allowed use

Interview Mode is designed for interview preparation and allowed assistance.

- No stealth cheating features.
- No hidden audio-capture behavior.
- No claims of guaranteed correctness for every question.

## Card architecture

- WorkConversation path uses `CardSchemaV3`.
- Interview path uses `InterviewCardSchemaV1`.
- Default generation path is single-pass.
- Conditional second pass is allowed only when the first pass fails the quality gate.

Reference: `docs/adr/0001-interview-card-engine.md`.

## Prompt profiles

Interview output style is controlled by predefined profiles (for example `interview_default`, `interview_star`, `interview_technical`).

Beta constraint:

- There is no raw prompt editor in beta UI.
- Prompt/profile behavior is validated through `pnpm test:prompt-contract` and `pnpm test:interview-quality`.

## Validation flow

For Interview Mode changes run:

1. `pnpm typecheck`
2. `pnpm lint`
3. `pnpm test:ui`
4. `pnpm test:ipc-contract`
5. `pnpm test:prompt-contract`
6. `pnpm test:interview-quality`
7. `pnpm report:interview-quality`
8. `cargo check --manifest-path src-tauri/Cargo.toml`
9. `cargo clippy --manifest-path src-tauri/Cargo.toml -- -D warnings`
10. `cargo test --manifest-path src-tauri/Cargo.toml`
11. `pnpm smoke`
