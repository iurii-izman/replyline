# Security Policy

## Supported Stage

Replyline is currently a public source/developer beta. Security reports are welcome and prioritized.

## Reporting a Vulnerability

Please do **not** open public GitHub issues for potential vulnerabilities.

Use one of these channels:

- GitHub Security Advisories (preferred): repository **Security** tab -> **Report a vulnerability**
- Direct contact via repository owner profile: <https://github.com/iurii-izman>

Include:

- affected component/path
- reproduction steps
- expected vs actual behavior
- impact assessment (data exposure, privilege, integrity)
- logs/artifacts with secrets removed

Do not include:

- API keys, bearer tokens, or credential values
- raw/full transcripts or full interview reports
- raw ContextPack values (resume/JD/company notes)
- provider response bodies containing sensitive data

If possible, attach redacted/sanitized artifacts and minimal reproduction steps.

## Response Expectations

- Initial acknowledgment target: within 72 hours
- Triage and severity classification after reproduction
- Fix and disclosure timing depends on impact and reproducibility

## Scope Notes

- Stable-beta scope: `capture -> stt -> llm -> card`
- High-signal classes include credential leakage, redaction bypass, unsafe logging, and insecure transport/config acceptance.
