.PHONY: help smoke self-heal setup-check status logs

help: ## Показать доступные команды
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

smoke: ## Запустить ежедневный smoke-тест
	powershell -ExecutionPolicy Bypass -File "$(USERPROFILE)\ai-stack\run-daily-ai-smoke.ps1"

smoke-fix: ## Smoke-тест с автоисправлением
	powershell -ExecutionPolicy Bypass -File "$(USERPROFILE)\ai-stack\run-daily-ai-smoke.ps1" -Fix

self-heal: ## Проверка и починка стека
	powershell -ExecutionPolicy Bypass -File "$(USERPROFILE)\ai-stack\stack-self-heal.ps1" -Fix

status: ## Статус Docker-сервисов
	docker compose -f "$(USERPROFILE)\ai-stack\docker-compose.yml" ps

logs: ## Логи Docker-сервисов (Ctrl+C для выхода)
	docker compose -f "$(USERPROFILE)\ai-stack\docker-compose.yml" logs -f --tail=50

profile-cloud: ## Переключить n8n на облачный профиль
	powershell -ExecutionPolicy Bypass -File "$(USERPROFILE)\ai-stack\switch-review-profile.ps1" -Mode cloud

profile-local: ## Переключить n8n на локальный профиль
	powershell -ExecutionPolicy Bypass -File "$(USERPROFILE)\ai-stack\switch-review-profile.ps1" -Mode local

docker-up: ## Поднять Docker-стек (Langfuse + Qdrant)
	docker compose -f "$(USERPROFILE)\ai-stack\docker-compose.yml" up -d

docker-down: ## Остановить Docker-стек
	docker compose -f "$(USERPROFILE)\ai-stack\docker-compose.yml" down

setup-check: ## Проверить prerequisites
	@echo "=== Проверка окружения ==="
	@which docker > /dev/null 2>&1 && echo "[OK] Docker" || echo "[MISS] Docker"
	@which ollama > /dev/null 2>&1 && echo "[OK] Ollama" || echo "[MISS] Ollama"
	@which litellm > /dev/null 2>&1 && echo "[OK] LiteLLM" || echo "[MISS] LiteLLM"
	@which n8n > /dev/null 2>&1 && echo "[OK] n8n" || echo "[MISS] n8n"
	@which make > /dev/null 2>&1 && echo "[OK] Make" || echo "[MISS] Make"

lint-docs: ## Проверить markdown документацию
	npx markdownlint-cli2 "**/*.md"

test-contracts: ## Запустить контрактные тесты
	cd tests && python -m pytest -v
