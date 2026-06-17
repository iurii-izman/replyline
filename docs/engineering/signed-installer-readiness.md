# Signed Windows Installer Readiness (Superseded)

> **⚠️ This document is superseded by [windows-signing-readiness.md](windows-signing-readiness.md).**
> Kept as historical reference. All new decisions and updates go to the new doc.

## 1. Что уже готово

### Workflow: `release-on-tag.yml`

Полностью автоматизированный signing pipeline:

| Step | Описание | Статус |
| --- | --- | --- |
| `resolve-tag` | Определяет тег (push или manual dispatch) | ✅ |
| `release-notes` | Создаёт GitHub Release с авто-сгенерированными notes | ✅ |
| `verify:full` | Release-quality verification gate перед сборкой | ✅ |
| `Prepare signing certificate` | Декодирует `WINDOWS_CERTIFICATE` (base64 PFX), импортирует в CurrentUser\My, проверяет private key | ✅ Готов, ждёт secrets |
| `Build unsigned` | Собирает unsigned если сертификат недоступен | ✅ |
| `Build signed` | Собирает с `--config tauri.signing.conf.json` (thumbprint, sha256, timestamp) | ✅ Готов, ждёт secrets |
| `Authenticode verify` | `Get-AuthenticodeSignature` для `.msi`/`.exe` | ✅ |
| `Attach to release` | Только signed artifacts attach к публичному GitHub Release | ✅ |
| `Remove certificate` | Удаляет сертификат из хранилища после сборки | ✅ |
| `Unsigned internal` | Unsigned artifacts — workflow artifacts, не публичные | ✅ |

### Workflow: `windows-packaging-manual.yml`

Manual trigger для локальной проверки сборки без signing:

| Step | Описание | Статус |
| --- | --- | --- |
| `pnpm verify` | Prebuild verification | ✅ |
| `pnpm tauri build` | Unsigned сборка | ✅ |
| `Upload artifacts` | Workflow artifacts (14 дней retention) | ✅ |

### Документация

| Документ | Статус |
| --- | --- |
| `README.md` — честное заявление: unsigned не public installer | ✅ |
| `docs/engineering/release.md` — packaging truth, Authenticode gate | ✅ |
| `tauri.conf.json` — bundle config | ✅ |

## 2. Требуемые secrets

Для включения signing в CI необходимо добавить два GitHub Secrets:

### `WINDOWS_CERTIFICATE`

- **Тип**: Base64-encoded PFX (PKCS#12) файл
- **Требования к сертификату**:
  - Code Signing (`1.3.6.1.5.5.7.3.3` — `id-kp-codeSigning`)
  - Private key внутри PFX (экспортируемый)
  - Выдан доверенным CA (DigiCert, Sectigo, GlobalSign, или аналог)
- **Подготовка**:
  ```powershell
  # Экспорт PFX из Windows Certificate Store
  $cert = Get-ChildItem -Path Cert:\CurrentUser\My |
    Where-Object { $_.EnhancedKeyUsageList -match "Code Signing" } |
    Select-Object -First 1
  $password = Read-Host -AsSecureString "PFX password"
  Export-PfxCertificate -Cert $cert -FilePath "replyline-signing.pfx" -Password $password

  # Кодирование в Base64 для GitHub Secret
  [Convert]::ToBase64String([IO.File]::ReadAllBytes("replyline-signing.pfx")) | Set-Content "cert-base64.txt"
  ```
- **Куда**: GitHub → Settings → Secrets and variables → Actions → `WINDOWS_CERTIFICATE`
- **Значение**: содержимое `cert-base64.txt` (одна строка base64)

### `WINDOWS_CERTIFICATE_PASSWORD`

- **Тип**: Пароль от PFX файла
- **Куда**: GitHub → Settings → Secrets and variables → Actions → `WINDOWS_CERTIFICATE_PASSWORD`
- **Значение**: plaintext пароль

### Timestamp server

Уже сконфигурирован в workflow:
- **URL**: `http://timestamp.digicert.com`
- **Алгоритм**: `sha256`

При необходимости можно заменить на другой timestamp server (например, Sectigo `http://timestamp.sectigo.com`).

## 3. Пошаговый план

### Этап 1: Получение сертификата

- [ ] Приобрести Code Signing сертификат у доверенного CA
  - Рекомендуемые: DigiCert, Sectigo (ранее Comodo)
  - Вариант: Azure Key Vault + Azure SignTool (если сертификат в HSM)
- [ ] Пройти валидацию (обычно требует подтверждения организации)
- [ ] Установить сертификат на локальной Windows-машине
- [ ] Экспортировать PFX с private key
- [ ] Проверить срок действия (рекомендуется 1+ год)

### Этап 2: Локальная проверка signing

- [ ] Настроить `tauri.conf.json` с signing параметрами:
  ```json
  "bundle": {
    "windows": {
      "wix": {
        "language": "en-US"
      },
      "signCommand": "signtool sign /fd sha256 /tr http://timestamp.digicert.com /td sha256 /a /f certificate.pfx /p %CERT_PASSWORD% %1"
    }
  }
  ```
- [ ] Выполнить локальную сборку:
  ```powershell
  $env:CERT_PASSWORD = "your-password"
  pnpm tauri build
  ```
- [ ] Проверить подпись:
  ```powershell
  Get-AuthenticodeSignature src-tauri/target/release/bundle/msi/*.msi
  Get-AuthenticodeSignature src-tauri/target/release/replyline.exe
  ```
- [ ] Убедиться что `Status: Valid`

### Этап 3: CI secret setup

- [ ] Добавить `WINDOWS_CERTIFICATE` в GitHub Secrets
- [ ] Добавить `WINDOWS_CERTIFICATE_PASSWORD` в GitHub Secrets
- [ ] Опционально: добавить `WINDOWS_CERTIFICATE` и `WINDOWS_CERTIFICATE_PASSWORD` в environment secrets для дополнительной защиты

### Этап 4: Dry-run тег

- [ ] Создать pre-release тег (например, `v0.2.0-beta.3`)
- [ ] Запушить тег — workflow `release-on-tag.yml` запустится автоматически
- [ ] Проверить:
  - `verify:full` прошёл
  - `Prepare signing certificate` — `eligible=true`
  - `Build signing-eligible` — собрал signed artifacts
  - `Authenticode verify` — `Status: Valid`
  - `Attach signed artifact` — `.zip` + `.sha256` прикреплены к Release
  - `Remove certificate` — сертификат удалён

### Этап 5: Download & install smoke

- [ ] Скачать `Replyline-vX.Y.Z-windows-signed.zip` из GitHub Release
- [ ] Проверить SHA256 checksum
- [ ] Проверить Authenticode подпись на `.msi`/`.exe`
- [ ] Установить на чистой Windows 10 машине
- [ ] Проверить первый запуск
- [ ] Проверить tray lifecycle (open, hide, quit)
- [ ] Проверить SmartScreen behaviour:
  - При первом запуске может показать предупреждение (новый сертификат)
  - После накопления reputation — предупреждение исчезает
- [ ] Проверить на чистой Windows 11 машине

### Этап 6: Публикация stable release

- [ ] Создать stable тег (`v0.2.0`)
- [ ] Убедиться что signed artifact прикреплён к Release
- [ ] Обновить `README.md` — quickstart с download link
- [ ] Обновить `BETA_TESTING.md` — убрать source-only язык

## 4. Известные ограничения

### SmartScreen

- **Новый сертификат**: Windows SmartScreen будет показывать предупреждение «Windows protected your PC» при первом запуске
- **Накопление reputation**: после определённого количества установок предупреждение исчезает автоматически
- **EV Code Signing**: сертификат Extended Validation (EV) получает reputation быстрее, но стоит дороже
- **Рекомендация**: использовать EV Code Signing если бюджет позволяет; иначе Standard Code Signing с планом на gradual reputation building

### Cross-machine smoke

- Установка на чистой Windows 10 и Windows 11 — обязательный шаг перед публичным installer claim
- Сейчас source beta smoke выполнен только на одной машине (Windows 11 build 26200, см. `docs/beta-evidence/`)

### Антивирус

- Некоторые антивирусы могут ложно срабатывать на новые/малоизвестные подписанные бинарники
- Рекомендуется отправить бинарник в Microsoft Defender portal для проверки после первого signed build

## 5. Что нельзя проверить без сертификата

- Authenticode signature validation
- SmartScreen reputation behaviour
- Windows Defender SmartScreen bypass
- Установку signed `.msi` на чистой машине
- Поведение при запуске с подписанным бинарником
- Корректность timestamp (требует реальной подписи)

## 6. Связанные документы

- [release.md](release.md) — release decision model и packaging truth
- [testing.md](testing.md) — тестовые профили
- [manual-qa.md](manual-qa.md) — ручной QA checklist
- [runtime.md](runtime.md) — runtime evidence и claim labels
- [BETA_TESTING.md](../../BETA_TESTING.md) — 15-minute smoke test
- [../../.github/workflows/release-on-tag.yml](../../.github/workflows/release-on-tag.yml) — signing workflow
- [../../.github/workflows/windows-packaging-manual.yml](../../.github/workflows/windows-packaging-manual.yml) — manual packaging
