# Local Release Readiness

## One-command strict local gate

Run:

```bash
pnpm verify:release-local
```

Этот lane не требует GUI действий, live credentials или внешних CI токенов.

## Gate composition

`verify:release-local` runs:

1. `pnpm verify:fast`
2. `pnpm scripts:lifecycle`
3. `pnpm test:doc-links`
4. `pnpm report:runtime-quality`
5. `pnpm test:product-scenarios`
6. `pnpm test:manual-closure-pack`
7. `pnpm release:freeze:check`
8. `pnpm report:release-readiness:strict`

## Why `scripts:lifecycle` is here

- Гарантирует, что каждый script из `package.json` имеет lifecycle-класс.
- Ловит конфликтную двойную классификацию script команд.
- Делает release-local lane объяснимым и воспроизводимым.

## Strict readiness report model

`report:release-readiness:strict` отделяет домены:
- static gates
- dependency/security gates
- runtime evidence artifacts
- missing runtime artifacts
- release-freeze status

Strict mode exits with `1` when blockers exist.

## CI and release-note boundary

- CI blocking quality lane: `.github/workflows/ci.yml`.
- Extended non-blocking signal: `.github/workflows/extended-quality.yml`.
- Tag release workflow (`.github/workflows/release-on-tag.yml`) публикует release notes only и не строит installers.

## Packaging lane boundary

- Packaging lane for Windows artifacts exists as `.github/workflows/windows-packaging-manual.yml` and runs only by manual `workflow_dispatch`.
- Until explicit approval, packaging lane must stay non-publishing: build + artifact upload for review only.
- Current local readiness (`verify:release-local`) validates quality and release governance, but does not prove installer availability.
