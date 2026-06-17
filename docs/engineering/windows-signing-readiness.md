# Windows Signing Readiness

> **Date:** 2026-06-17
> **Status:** Workflow ready, secrets absent. **No signed artifact exists.**
> **Verdict:** `BLOCKED` — certificate acquisition required before first signed build.
>
> This is the single source of truth for Windows signing posture. Supersedes
> `signed-installer-readiness.md` (kept as historical reference).

## Readiness Verdict

| Component | Status | Blocked by |
|---|---|---|
| CI workflow (`release-on-tag.yml`) | ✅ Ready | — |
| Manual packaging workflow | ✅ Ready | — |
| Signing configuration generation | ✅ Ready | — |
| Authenticode verification step | ✅ Ready | — |
| Signed artifact attachment logic | ✅ Ready | — |
| Certificate cleanup step | ✅ Ready | — |
| SHA256 checksum generation | ✅ Ready | — |
| **Code signing certificate** | ❌ Missing | Purchase + CA validation |
| **GitHub Secrets** (`WINDOWS_CERTIFICATE`, `WINDOWS_CERTIFICATE_PASSWORD`) | ❌ Missing | Certificate acquisition |
| **Local signing config** (`tauri.conf.json`) | ❌ Not configured | Certificate acquisition |
| **Cross-machine install smoke** | ❌ Not tested | Signed build |
| **SmartScreen reputation** | ❌ Not started | Signed build + install volume |

**Overall readiness: 7/12 gates green. BLOCKED on certificate acquisition.**

---

## 1. Certificate Requirements

### Certificate type

| Parameter | Recommended | Minimum |
|---|---|---|
| Type | **EV Code Signing** (Extended Validation) | Standard Code Signing (OV) |
| Key Usage | `id-kp-codeSigning` (`1.3.6.1.5.5.7.3.3`) | Same |
| Private key | Exportable, inside PFX (PKCS#12) | Same |
| CA | DigiCert, Sectigo, GlobalSign | Any trusted Windows root CA |
| Validity | ≥1 year | ≥1 year |
| Delivery | Hardware token or downloadable PFX | PFX file |

**EV vs Standard trade-off:**

| Factor | EV | Standard |
|---|---|---|
| SmartScreen reputation speed | Fast (instant in many cases) | Slow (requires install volume) |
| Cost | $300–700/year | $80–300/year |
| Validation | Extended (business docs, phone verification) | Organization only |
| Windows Defender integration | Immediate | Gradual |
| Recommendation | ✅ **Preferred** for public binary release | ⚠️ Acceptable with reputation-building plan |

### Certificate acquisition process

1. Choose CA: DigiCert (recommended), Sectigo (budget), or GlobalSign.
2. Submit organization validation documents (EV: business registration, phone verification).
3. Receive certificate (hardware token or PFX download).
4. Install on local Windows machine for testing.
5. Export PFX with private key for CI.

**Alternative: Azure Key Vault + Azure SignTool**

If the certificate is stored in Azure Key Vault HSM, use `AzureSignTool` instead of
`signtool.exe`. The workflow would need modification:
- Replace `Import-PfxCertificate` with `AzureSignTool sign`
- Add `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET` secrets
- Remove certificate import/cleanup steps

This option eliminates local PFX storage but adds Azure dependency. Evaluate if
the organization already uses Azure Key Vault.

---

## 2. Key Storage & GitHub Secrets

### Required secrets

| Secret | Type | Value | Where |
|---|---|---|---|
| `WINDOWS_CERTIFICATE` | Base64-encoded PFX (PKCS#12) | Entire PFX file, base64-encoded | GitHub → Settings → Secrets → Actions |
| `WINDOWS_CERTIFICATE_PASSWORD` | Plaintext password | PFX decryption password | GitHub → Settings → Secrets → Actions |

### Secret preparation (local)

```powershell
# 1. Export PFX from Windows Certificate Store
$cert = Get-ChildItem -Path Cert:\CurrentUser\My |
  Where-Object { $_.EnhancedKeyUsageList -match "Code Signing" } |
  Select-Object -First 1
$password = Read-Host -AsSecureString "PFX password"
Export-PfxCertificate -Cert $cert -FilePath "replyline-signing.pfx" -Password $password

# 2. Encode to Base64 for GitHub Secret
[Convert]::ToBase64String([IO.File]::ReadAllBytes("replyline-signing.pfx")) |
  Set-Content "cert-base64.txt"
```

### Secret security rules

- **Never** commit PFX files, base64-encoded certificates, or passwords.
- **Never** log certificate thumbprints beyond CI step summary.
- **Never** expose `WINDOWS_CERTIFICATE` or `WINDOWS_CERTIFICATE_PASSWORD` in
  workflow logs, step summaries, or release notes.
- Use GitHub environment secrets (not repository secrets) for additional
  protection — restrict to `release-on-tag` workflow only.
- Rotate PFX password if a CI runner compromise is suspected.
- Certificate cleanup (`Remove-Item`) runs even on workflow failure
  (`if: always()`).

### Optional: environment-level secrets

Instead of repository-level secrets, create a `release` environment:
1. GitHub → Settings → Environments → `release`
2. Add `WINDOWS_CERTIFICATE` and `WINDOWS_CERTIFICATE_PASSWORD` as environment secrets
3. Restrict to `main` branch only
4. Update `release-on-tag.yml`:
   ```yaml
   environment: release
   ```

This prevents the secrets from being accessible in PR workflows or other branches.

---

## 3. Timestamp Server

| Parameter | Value |
|---|---|
| URL | `http://timestamp.digicert.com` |
| Algorithm | `sha256` |
| Fallback URL | `http://timestamp.sectigo.com` |
| Config location | Generated dynamically in `tauri.signing.conf.json` during CI |

Timestamp server ensures the signature remains valid after the certificate expires.
Without timestamping, signed binaries become invalid when the certificate expires.

**Tauri signing config (auto-generated in CI):**

```json
{
  "bundle": {
    "windows": {
      "certificateThumbprint": "<thumbprint>",
      "digestAlgorithm": "sha256",
      "timestampUrl": "http://timestamp.digicert.com"
    }
  }
}
```

For local testing, add to `tauri.conf.json`:
```json
"bundle": {
  "windows": {
    "signCommand": "signtool sign /fd sha256 /tr http://timestamp.digicert.com /td sha256 /a /f certificate.pfx /p %CERT_PASSWORD% %1"
  }
}
```

---

## 4. Artifact Naming & Checksums

### Artifact naming convention

| Posture | ZIP name | Attached to release? |
|---|---|---|
| Signed | `Replyline-vX.Y.Z-windows-signed.zip` | ✅ Yes — attached to GitHub Release |
| Unsigned | `Replyline-vX.Y.Z-windows-internal-unsigned.zip` | ❌ No — workflow artifact only |

### Checksum generation

SHA256 checksums are generated for every artifact regardless of signing status:

```
<hash>  Replyline-vX.Y.Z-windows-signed.zip
```

Checksum file: `Replyline-vX.Y.Z-windows-signed.zip.sha256`

Generated via:
```powershell
$hash = (Get-FileHash -LiteralPath $zipPath -Algorithm SHA256).Hash.ToLowerInvariant()
"$hash  $(Split-Path -Leaf $zipPath)" | Set-Content -LiteralPath $checksumPath
```

### Release artifact manifest

Each GitHub Release with a signed artifact includes:

| Artifact | Description | Public? |
|---|---|---|
| `Replyline-vX.Y.Z-windows-signed.zip` | Signed installer bundle (.msi + .exe) | ✅ |
| `Replyline-vX.Y.Z-windows-signed.zip.sha256` | SHA256 checksum | ✅ |
| Source code (`.zip`, `.tar.gz`) | Auto-generated by GitHub | ✅ |
| Release notes | From `docs/release-notes/vX.Y.Z.md` or auto-generated | ✅ |

---

## 5. Verification Steps (per release)

### Automated (CI)

1. `pnpm verify:full` — all deterministic gates must be green.
2. Certificate import — PFX decoded, imported to `CurrentUser\My`, private key verified.
3. `pnpm tauri build --config tauri.signing.conf.json` — signed build.
4. `Get-AuthenticodeSignature` — every `.msi`/`.exe` must have `Status: Valid`.
5. SHA256 checksum generated.
6. Signed `.zip` + `.sha256` attached to GitHub Release.
7. Certificate removed from CI store (`if: always()`).

### Manual (per release)

1. Download `Replyline-vX.Y.Z-windows-signed.zip` from GitHub Release.
2. Verify SHA256 checksum against `.sha256` file.
3. Verify Authenticode signature:
   ```powershell
   Get-AuthenticodeSignature .\Replyline-vX.Y.Z-windows-signed\*.msi
   Get-AuthenticodeSignature .\Replyline-vX.Y.Z-windows-signed\replyline.exe
   ```
4. Install on clean Windows 10.
5. First launch → tray lifecycle (open, hide, quit).
6. Synthetic capture (`Ctrl+Alt+Space`) → card generated.
7. Repeat on clean Windows 11.
8. Record SmartScreen behaviour (warning expected on first few installs).

---

## 6. SmartScreen Expectations

### First release (new certificate)

- **SmartScreen warning**: «Windows protected your PC» — expected behaviour.
- **User action required**: Click «More info» → «Run anyway».
- **Duration**: Typically 1–4 weeks of install volume before reputation builds.
- **Mitigation**: Provide clear instructions in release notes and README.

### EV Certificate advantage

- EV certificates often bypass SmartScreen immediately or within days.
- Worth the additional cost for public-facing releases.
- If budget is constrained, use Standard + reputation plan.

### Reputation building plan

| Week | Action | Expected effect |
|---|---|---|
| 1 | First signed release. SmartScreen warning visible. | Warning on all installs |
| 2–3 | Accumulate installs from beta testers. | Warning rate begins to decrease |
| 4+ | Submit binary to Microsoft Defender portal. | May accelerate reputation |
| 8+ | Sufficient install volume accumulated. | Warning disappears for most users |

### Microsoft Defender submission

After first signed build:
1. Go to https://www.microsoft.com/en-us/wdsi/filesubmission
2. Submit `replyline.exe` and `.msi` as "Software developer"
3. Provide product description and download link
4. This may accelerate SmartScreen reputation building

---

## 7. Rollback Plan

### If signing fails in CI

1. **Certificate import fails**: Workflow falls back to unsigned build. Unsigned artifact
   stays as workflow artifact (not attached to release). Release is source-only.
2. **Authenticode verification fails**: Artifact marked `internal-unsigned`. Not
   attached to release. Investigate certificate validity, timestamp server reachability.
3. **Certificate compromised**: Immediately revoke via CA portal. Rotate
   `WINDOWS_CERTIFICATE` and `WINDOWS_CERTIFICATE_PASSWORD` secrets. All previously
   signed binaries remain valid until certificate revocation propagates.

### If signed binary has issues post-release

1. **Do NOT delete the release** — GitHub Release is immutable in practice.
2. Create a new patch release (`vX.Y.Z+1`) with the fix.
3. Update release notes to indicate the previous signed binary is superseded.
4. If the issue is signing-specific (wrong certificate, expired), revoke and
   re-sign with new certificate.

### Fallback to unsigned

- Unsigned builds are always produced as a fallback (workflow artifact, 90-day retention).
- Source/developer beta posture remains valid even without signed artifacts.
- README already states unsigned artifacts are not public installers.
- No public claim is made about installer availability until signing is verified.

---

## 8. Public Wording Rules

### What to say (when signed artifacts exist)

- ✅ "Windows installer available on the `Releases` page."
- ✅ "Signed with an Authenticode certificate. Verify with `Get-AuthenticodeSignature`."
- ✅ "SHA256 checksums provided for every release."
- ✅ "SmartScreen may show a warning on first install — this is normal for new applications."

### What NOT to say

- ❌ "Microsoft-approved" or "Windows-certified" — Authenticode signing ≠ Microsoft approval.
- ❌ "Virus-free guarantee" — no such claim can be made.
- ❌ "No warnings on install" — SmartScreen behavior depends on reputation, not just signing.
- ❌ "Production-ready installer" — until cross-machine smoke passes on ≥2 Windows versions.

### Current (unsigned) wording rules

- ✅ "Source/developer beta — use `pnpm beta:start`."
- ✅ "No unsigned artifact is presented as a public installer."
- ❌ Never claim "installer available" while artifacts are unsigned.

---

## 9. Workflow Architecture

### `release-on-tag.yml` — signing flow

```
Tag push (v*)
  → resolve-tag
  → release-notes (creates GitHub Release)
  → windows-artifact:
      1. verify:full (blocking gate)
      2. Prepare signing certificate (conditional)
         ├─ secrets present → import PFX, generate tauri.signing.conf.json
         └─ secrets absent  → eligible=false
      3. Build
         ├─ eligible=true  → pnpm tauri build --config signing.conf.json
         └─ eligible=false → pnpm tauri build (unsigned)
      4. Authenticode verify (all .msi/.exe)
      5. Package artifact + SHA256 checksum
      6. Upload workflow artifact (always)
      7. Attach to GitHub Release (signed only)
      8. Remove certificate (always, if imported)
```

### `windows-packaging-manual.yml` — non-publishing flow

```
Manual dispatch
  → pnpm verify
  → pnpm tauri build (unsigned only, no signing config)
  → Upload workflow artifact (14-day retention)
```

---

## 10. Pre-Flight Checklist (before first signed build)

- [ ] Certificate acquired (EV preferred, Standard acceptable).
- [ ] Certificate installed on local Windows machine.
- [ ] Local signed build verified (`Get-AuthenticodeSignature → Valid`).
- [ ] PFX exported with private key, base64-encoded.
- [ ] `WINDOWS_CERTIFICATE` secret added to GitHub (environment `release`, restricted to `main`).
- [ ] `WINDOWS_CERTIFICATE_PASSWORD` secret added to GitHub.
- [ ] Dry-run tag created (`v0.2.0-beta.4` or similar pre-release).
- [ ] CI passes: `verify:full` green, `eligible=true`, Authenticode `Valid`.
- [ ] Signed `.zip` + `.sha256` attached to GitHub Release.
- [ ] Download + Authenticode verify on separate machine.
- [ ] Clean Windows 10 install smoke.
- [ ] Clean Windows 11 install smoke.
- [ ] SmartScreen behaviour documented.
- [ ] `README.md` updated with download link.
- [ ] `docs/product/user-guide.md` updated — add installer path.
- [ ] `BETA_TESTING.md` updated — remove source-only restriction.

---

## 11. What Cannot Be Tested Without a Certificate

| Step | Requires certificate? |
|---|---|
| Authenticode signature validation | ✅ Yes |
| SmartScreen reputation behaviour | ✅ Yes |
| Timestamp server correctness | ✅ Yes |
| Signed `.msi` installation on clean Windows | ✅ Yes |
| `Get-AuthenticodeSignature → Valid` | ✅ Yes |
| Workflow `eligible=true` path | ✅ Yes |
| Certificate cleanup in CI | ✅ Yes |
| Workflow unsigned path | ❌ No (already tested in CI) |
| `pnpm verify:full` gate | ❌ No (already passing) |
| SHA256 checksum generation | ❌ No (already tested) |

---

## Related Docs

- [release.md](release.md) — release decision model, packaging truth
- [signed-installer-readiness.md](signed-installer-readiness.md) — historical reference (superseded by this doc)
- [testing.md](testing.md) — test profiles and lane boundaries
- [runtime.md](runtime.md) — runtime evidence and claim labels
- [../beta-evidence/provider-runtime-matrix.md](../beta-evidence/provider-runtime-matrix.md) — provider route evidence
- [../../.github/workflows/release-on-tag.yml](../../.github/workflows/release-on-tag.yml) — signing workflow
- [../../.github/workflows/windows-packaging-manual.yml](../../.github/workflows/windows-packaging-manual.yml) — manual packaging
