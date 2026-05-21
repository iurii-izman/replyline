# Sonar Residual Readiness (2026-05-21)

## Scope

Lightweight repository-level Sonar readiness audit without Sonar token and without SonarCloud UI actions.

## Current config state

- `sonar-project.properties`: present.
- `sonar.projectKey`: `iurii-izman_replyline`.
- `sonar.organization`: `iurii-izman`.
- `sonar.sources`: `src,src-tauri/src,scripts`.
- `sonar.tests`: `src,tests` with `sonar.test.inclusions` for `*.test.*` and `tests/**`.

## Exclusions review

- `sonar.exclusions` includes generated/non-source artifacts only:
  - `node_modules/**`, `dist/**`, `coverage/**`, `reports/**`, `src-tauri/target/**`, `*.log`
- `sonar.coverage.exclusions` excludes tests, `tests/**`, `scripts/**`, and `src/app/locale.ts`.
- `sonar.cpd.exclusions` excludes non-product duplication hotspots (`reports/**`, `tests/fixtures/**`, locale/test mirrors).

Justification:

- `reports/**`, `coverage/**`, `*.log` are generated artifacts and should not be analyzed as source.
- `scripts/**` excluded from coverage avoids release/dev utility scripts skewing product coverage.
- No broad exclusions of `src/**` or `src-tauri/src/**` were added.

## Residual risks

- Local audit cannot confirm remote quality gate settings in SonarCloud project UI.
- Local audit cannot confirm organization-level Quality Profile overrides.

## Outcome

Repository is Sonar-ready for non-interactive CI analysis without requiring local tokens or manual UI steps.
