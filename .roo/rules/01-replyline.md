# Replyline Project Rules

## Onboarding

- Before making any changes, first read `AGENTS.md`, `CLAUDE.md`, `CONTRIBUTING.md`, `README.md`, and relevant files in `docs/` to understand the project context, architecture, and conventions.

## Architecture Boundaries

- Keep frontend state and types in `src/app/model.ts`.
- Keep platform integration in `src/app/platform.ts`.
- Keep orchestration logic in `src/app/controller.ts`.
- Do not move controller logic into component files.
- Keep UI reactivity in Solid.js patterns, not React patterns.

## Solid.js, Not React

- Do not use React hooks, JSX patterns, or lifecycle methods.
- Use Solid.js primitives: `createSignal`, `createEffect`, `createMemo`, `createResource`.
- Use Solid.js control-flow components: `<For>`, `<Show>`, `<Switch>`/`<Match>`, `<Index>`.
- Do not import from `react` or `react-dom`.

## Styling

- Do not add CSS-in-JS libraries or runtime style generation.
- Use plain CSS files (`.css`) co-located with components or global stylesheets.
- Follow the existing project CSS conventions.

## Secrets and Environment Files

- Do not read, modify, or commit `.env`, `.env.*`, `.env.keys`, or any file containing secrets or credentials.
- These files are excluded from the agent workspace via `.rooignore`.

## Evidence and Claims Policy

- Do not make runtime, performance, security, or evidence-based claims (e.g., "this is faster", "this reduces latency", "this improves security") without locally confirmed verification.
- Any performance or correctness claim must be backed by a local run of the relevant check (e.g., `pnpm smoke`, benchmark script, or test suite).
- Do not claim that checks have passed unless they were actually executed.

## Product Description Constraints

- Do not describe the product with any of the following labels:
  - "stealth" or "stealth mode"
  - "invisible overlay"
  - "therapy app" or "therapy tool"
  - "emotion detector" or "emotion recognition"
  - "proctoring bypass" or "academic dishonesty tool"
  - "full-fledged meeting assistant" or "meeting copilot"
- Refer to the product copy rules in `docs/copy-rules.md` for approved terminology.

## Workflow: Plan, Then Diff

1. For each task, first analyze relevant files to understand the current state.
2. Propose a plan (either inline or via a dedicated planning step).
3. Produce a minimal, focused diff — do not make unrelated changes.

## Verification Gate

- Before completing a task, propose and (if applicable) run a minimal relevant verification gate (e.g., type check, lint, relevant test subset, or the project's smoke check).
- Do not assume checks passed — run them or explicitly state they were not needed.
- If only configuration or documentation files were changed, a full `pnpm smoke` is not required.
