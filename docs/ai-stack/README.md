# AI Stack Bridge Snapshot

Этот каталог — минимальный контрактный мост между Replyline и внешним AI stack.

- `n8n_workflow_llm_review_webhook.json` — snapshot webhook workflow для импорта/сверки.
- Рабочий источник и развитие AI stack: `C:\Dev\ai-vibe-engineering` (отдельный проект).
- После правок workflow в n8n обновляйте snapshot здесь, чтобы `pnpm code-review:webhook` оставался воспроизводимым.
