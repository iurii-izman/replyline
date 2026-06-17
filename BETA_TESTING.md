# Replyline Beta Testing

Спасибо за помощь с текущей публичной бета-сборкой из исходников. Нужен
Windows 10/11 и примерно 15 минут. Технический опыт полезен, но не обязателен.

## Before You Start

Replyline отправляет короткий audio snippet в Deepgram для speech-to-text, а
полученный текст и контекст в настроенный OpenAI-compatible LLM provider.

Не используйте реальные конфиденциальные разговоры. Для теста возьмите
синтетическую фразу без персональных данных, credentials или информации
работодателя.

## Setup

```powershell
git clone https://github.com/iurii-izman/replyline.git
cd replyline
git checkout v0.2.0-beta.3
pnpm install --frozen-lockfile
pnpm beta:doctor
pnpm beta:start
```

В Settings настройте:

- Deepgram API key;
- LLM base URL;
- model name;
- LLM API key, если endpoint его требует.

Keys хранятся локально через Windows Credential Manager. Не публикуйте их в
issues, screenshots или logs.

## 15-Minute Smoke Test

1. Запустите приложение и сохраните Settings.
2. Удерживайте `Ctrl+Alt+Space` во время синтетической рабочей реплики.
3. Отпустите hotkey и дождитесь карточки `gist / say_now / next_move`.
4. Проверьте, можно ли произнести `say_now` без переписывания.
5. Повторите один раз через Retry.
6. Проверьте tray open/restore/quit и повторный запуск приложения.

Пример безопасной реплики:

> Срок перенесли на завтра, но входные данные ещё не согласованы. Как спокойно
> обозначить риск и предложить следующий шаг?

## Report The Result

Оставьте результат в
[beta smoke report form](https://github.com/iurii-izman/replyline/issues/new?template=beta_smoke_report.yml) или
создайте отдельный
[bug report](https://github.com/iurii-izman/replyline/issues/new?template=bug_report.yml)
для воспроизводимого дефекта.

Укажите:

- Windows version;
- release tag or commit;
- pass/fail для setup, capture, card, retry, tray и second launch;
- примерное ожидание карточки;
- usefulness score от 1 до 5;
- минимальные reproduction steps для ошибки.

Если есть runtime-артефакт, сначала выполните `pnpm beta:smoke-report` и приложите
только `smoke-report.md` / `smoke-report.json` в sanitized виде.

## ContextPack Smoke Path

После базового smoke test проверьте ContextPack flow:

1. Откройте ContextPack panel из главного UI.
2. Создайте новый pack: название + фоновый контекст (synthetic).
3. Активируйте pack — проверьте, что badge виден в MainSurface.
4. Сделайте capture с активным ContextPack — проверьте, что карточка учитывает контекст.
5. Деактивируйте pack — badge исчезает.
6. Снова capture — контекст не должен влиять на карточку.
7. Отредактируйте pack, сохраните, активируйте — контекст обновляется.
8. Удалите pack — он исчезает из списка.

Пример synthetic context для тестового pack:

> Project status meeting. My role: tech lead. Current sprint: week 3 of 4.
> Key risk: dependency upgrade blocked by security review.

Не используйте реальные имена, названия компаний, проектов или конфиденциальную
информацию в тестовых ContextPack.

## Privacy Rules

Не прикладывайте:

- API keys, bearer tokens и account identifiers;
- raw transcripts, prompts или provider response bodies;
- resume, job description или ContextPack values;
- screenshots с персональными данными;
- абсолютные local paths с именем пользователя.

Используйте только synthetic content. Security-sensitive findings отправляйте
по инструкции из [SECURITY.md](.github/SECURITY.md), а не в public issue.

Подробные границы продукта описаны в
[docs/product/limitations.md](docs/product/limitations.md). Если что-то не
завелось, начните с
[docs/product/user-guide.md#9-troubleshooting-quick-table](docs/product/user-guide.md#9-troubleshooting-quick-table)
