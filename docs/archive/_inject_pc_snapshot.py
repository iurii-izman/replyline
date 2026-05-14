# -*- coding: utf-8 -*-
"""Inject PC snapshot and add 5th column to category tables in appendix."""
from pathlib import Path

path = Path(r"C:\Dev\replyline\docs\archive\ultimate-ai-stack-2026-2027.ru.md")
text = path.read_text(encoding="utf-8")

SNAPSHOT = r'''
### Снимок системы пользователя (LAPTOP, автоинвентаризация)

*Данные собраны **2026-04-11** на этой машине: WMI (`Win32_*`) + ветки реестра `Uninstall` (DisplayName). Полный дамп имён установленных пакетов: `C:\Users\iurii\installed_apps_snapshot.txt` (146 строк). Имя ПК в WMI: **LAPTOP**.*

#### Железо и ОС (факт)

| Параметр | Значение |
|:---|:---|
| ОС | **Windows 11 Pro**, x64, сборка **26200** |
| Устройство | **HP Laptop 15s-eq2xxx** |
| CPU | **AMD Ryzen 3 5300U** (4 физ. ядра / 8 потоков, до ~2.6 GHz) |
| RAM | **~7.3 GiB** установлено (7866552320 байт) |
| GPU | **AMD Radeon(TM) Graphics** (встроенная), без дискретной **NVIDIA** |
| Диск `C:` | **~237 GB** всего, **~38 GB** свободно |
| Прочее | Установлены **Docker Desktop**, **WSL**, **Visual Studio Build Tools 2022** |

#### Вывод по «потолку» этой системы

- **ОЗУ ≈8 GB** — по сравнению с ориентирами из самого документа (16–32 GB для комфортного локального стека) машина **ниже рекомендованного порога**: тяжёлый **Docker + WSL + IDE + браузер** уже близко к лимиту; параллельно гонять **крупные** локальные модели, **LocalAI** «полный стек» и **ComfyUI** на больших чекпоинтах — **нереалистично без боли и свопа**.
- **Нет CUDA/NVIDIA** — типичные сценарии **vLLM**, «боевой» **ComfyUI/Flux** на GPU, обучение — только **CPU/ROCm-нюансы** или **облако**; для документа это зона <span style="color:#455a64">**только облако или крайне лёгкие кванты**</span>.
- **Granola** из документа — **только macOS** → на этой системе <span style="color:#455a64">**недоступно**</span>.

#### Легенда цветов (статусы для **этой** конфигурации)

| Цвет | Смысл |
|:---|:---|
| <span style="color:#1b5e20">**■ зелёный**</span> | Уже **установлено** как приложение/компонент (по реестру или явной роли ОС), и релевантно стеку. |
| <span style="color:#e65100">**■ оранжевый**</span> | **Корпоративный** контур: договор, SSO, много мест, compliance — не «личный лаптоп по умолчанию». |
| <span style="color:#b71c1c">**■ красный**</span> | **Дорогой / премиум** тариф: для текущего железа и сценария часто **неоправдан** как default (не запрет — предупреждение о ROI). |
| <span style="color:#455a64">**■ сине-серый**</span> | **Железо не тянет** локально в осмысленном виде **или** только **облако / чужой GPU**; на этой машине не стоит планировать как основной runtime. |

*В предпросмотре Markdown HTML может не отрисоваться — тогда ориентируйтесь на буквы **З/К/Д/Ж** в матрице ниже.*

#### Установлено дополнительно (релевантно разработке, не все в таблицах стека)

**Windsurf**, **Zed**, **Antigravity**, **Void**, **Copilot CLI**, **GPT4All**, **Rustup**, **Typora**, **Logseq**, **1Password CLI**, **Telegram**, **VLC/MPV**, **Firefox** — в реестре как отдельные продукты; в матрице ниже не дублируются, если нет в документе.

#### Матрица: инструменты из приложения × эта система

Ключ: **З**=зелёный (установлено), **К**=корпоративный, **Д**=дорого/премиум по умолчанию, **Ж**=железо/только облако.

| Кат. | Инструмент | На этом ПК (LAPTOP) |
|:---:|:---|:---|
| 1 | Claude Opus 4.6 / API | <span style="color:#b71c1c">**Д**</span> премиум API; **Ж** локально не модель |
| 1 | Claude Pro | **Ж** веб/подписка; не установлено |
| 1 | Qwen 3.5-397B | **Ж** не влезет в RAM/GPU как полноценный self-host |
| 1 | DeepSeek R1 | **Ж** большие веса — только API или очень маленькие кванты |
| 1 | GPT-5.4 / ChatGPT | **Ж** облако; <span style="color:#b71c1c">**Д**</span> Pro ~$200 |
| 1 | ChatGPT Plus | **Ж** облако |
| 1 | Gemini / Vertex | **Ж** облако; <span style="color:#e65100">**К**</span> Vertex — org GCP |
| 1 | Llama 4 локально | **Ж** кластерный сценарий |
| 1 | Gemma 4 | **Ж** малые кванты через **Ollama** возможны с оговорками |
| 1 | Jasper / Copy.ai | **Ж** SaaS; **Д** SMB-стоимость |
| 2 | Perplexity | **Ж** браузер/SaaS |
| 2 | Google AI Overviews | <span style="color:#1b5e20">**З**</span> **Edge/Chrome** — доступ к Overviews |
| 2 | Semantic Scholar / Elicit | **Ж** веб |
| 3 | Notion AI | **Ж** не установлено |
| 3 | Obsidian | <span style="color:#1b5e20">**З**</span> **установлен** |
| 3 | Productboard / Linear | **Ж** не установлено |
| 4 | Cursor / Cursor Pro | <span style="color:#1b5e20">**З**</span> **Cursor** установлен; **Д** Ultra/большие кредиты |
| 4 | VS Code + Cline | **Ж** **VS Code** в реестре не найден (есть **Cursor**, **Zed**, **Windsurf**) |
| 4 | Aider / LiteLLM / LangChain | **Ж** pip-стек — не в реестре; **З** **Python** |
| 4 | GitHub Copilot / Enterprise | **Ж** расширение не зафиксировано; **К** Enterprise |
| 4 | Claude Code | **Ж** CLI/npm; не в реестре |
| 4 | Tabnine Enterprise | **К** on-prem |
| 4 | Linear AI | **Ж** SaaS |
| 4 | Git / GitHub CLI | <span style="color:#1b5e20">**З**</span> **Git**, **GitHub CLI** |
| 5 | LangGraph / CrewAI / AutoGen / LangChain / MCP | **З** **Python** для библиотек |
| 5 | Intercom Fin / Zendesk / Ada | **К** корп. поддержка |
| 6 | n8n / Zapier / Make / Activepieces / Clay | не установлено; self-host n8n в Docker — **Ж** RAM |
| 7 | ChatGPT ADA / Claude Artifacts / Julius | **Ж** облако |
| 7 | Databricks / Snowflake / BigQuery / Vertex / Bedrock | **К** + **Ж** облако enterprise |
| 7 | HubSpot AI | **К** |
| 7 | MLflow | не в реестре; **З** возможен через **pip** |
| 8 | Figma / Galileo / Framer / v0 | **Ж** веб |
| 9 | Midjourney / DALL-E | **Ж** облако; **Д** верхние тарифы MJ |
| 9 | Flux / SD / ComfyUI / LocalAI | **Ж** нет VRAM под комфортный GPU-пайплайн |
| 10 | Sora / Kling / Runway / Veo | **Ж** облако; **Д** верхние пакеты |
| 11 | ElevenLabs / Suno / Udio | **Ж** SaaS |
| 11 | Bark | **Ж** возможен CPU-эксперимент, не как прод |
| 11 | Premiere / CapCut | не установлено |
| 12 | Browser Use / Operator / Computer Use | **Ж** код+API; **Д** Operator→Pro |
| 13 | Lovable / Bolt / Replit / Supabase | **Ж** веб/SaaS |
| 13 | GitHub / Actions / Terraform | **З** **Git**; остальное сервисы |
| 14 | Docker | <span style="color:#1b5e20">**З**</span> **Docker Desktop** |
| 14 | Ollama | <span style="color:#1b5e20">**З**</span> **Ollama 0.20.4** |
| 14 | LM Studio | <span style="color:#1b5e20">**З**</span> **LM Studio 0.4.10** |
| 14 | LocalAI / llama.cpp / vLLM / Whisper | **Ж** vLLM/большие — нет; малые кванты — частично |
| 15 | OpenRouter / LiteLLM / Portkey | **Ж** сервисы/self-host на сервере |
| 15 | Harvey / CoCounsel / LexisNexis | **К** + **Д** |
| 16 | Qdrant / Pinecone / Weaviate / Chroma | не установлено; self-host в Docker — **Ж** RAM |
| 17 | Braintrust / LangSmith | **К** + **Д** платные планы |
| 17 | Langfuse / Grafana | не установлено |
| 18 | Difinity / Noma / SUPERWISE | **К** |
| 19 | Otter / Fireflies | **Ж** SaaS |
| 19 | Granola | **Ж** **только macOS** |
| 19 | Salesforce | **К** |
| 20 | Vercel / Railway / Fly / Neon / Coolify | **Ж** облако/VPS |
| 20 | Next.js | **З** через **Node.js** в проектах |

**Итого по зелёному из стека документа:** <span style="color:#1b5e20">Cursor, Docker, Obsidian, Ollama, LM Studio, Git, GitHub CLI, Python, Node.js, Chrome, WSL</span> (+ **GPT4All** как смежный локальный клиент, не в оригинальных таблицах).

---

'''

needle = "\n\n### Суть документа\n"
if SNAPSHOT.strip() in text:
    print("Snapshot already present, skip insert")
else:
    if needle not in text:
        raise SystemExit("needle not found")
    text = text.replace(needle, "\n\n" + SNAPSHOT + "### Суть документа\n", 1)

G = '<span style="color:#1b5e20">установлено</span>'
K = '<span style="color:#e65100">корп.</span>'
D = '<span style="color:#b71c1c">дорого</span>'
J = '<span style="color:#455a64">облако/не тянет</span>'
NA = "—"


def pc_cell(tool: str) -> str:
    t = tool.lower()
    if "cursor pro" in t:
        return G + " (" + D.replace("дорого", "тариф Ultra/кредиты") + " опционально)"
    if "cursor" in t:
        return G
    if "docker" in t:
        return G
    if "obsidian" in t:
        return G
    if "ollama" in t:
        return G
    if "lm studio" in t:
        return G
    if "visual studio code" in t:
        return J + " (VS Code нет в реестре; есть Cursor/Zed/Windsurf)"
    if "cline" in t or "roo code" in t:
        return NA + " " + J
    if "github copilot enterprise" in t or "enterprise" in t and "copilot" in t:
        return K + " " + J
    if "github copilot" in t:
        return NA + " " + J
    if t == "git" or (t.startswith("github") and "copilot" not in t and "actions" not in t):
        return G.replace("установлено", "Git + gh CLI")
    if "github actions" in t:
        return J
    if "terraform" in t:
        return NA + " (CLI не в реестре)"
    if "harvey" in t or "cocounsel" in t or "lexisnexis" in t:
        return K + " " + D
    if "intercom fin" in t or "zendesk ai" in t or "ada" in t and "enterprise" in t:
        return K + " " + J
    if "snowflake" in t or "bigquery" in t or "vertex ai" in t or "bedrock" in t or "hubspot ai" in t:
        return K + " " + J
    if "databricks" in t:
        return K + " " + D + " " + J
    if "salesforce" in t:
        return K + " " + J
    if "difinity" in t or "noma security" in t or "superwise" in t:
        return K + " " + J
    if "braintrust" in t or "langsmith" in t:
        return K + " " + D + " " + J
    if "pinecone" in t or "portkey" in t:
        return K + " " + J
    if "tabnine" in t:
        return K + " " + J if "enterprise" in t or "on-prem" in t else NA + " " + J
    if "granola" in t:
        return J + " (только macOS)"
    if any(x in t for x in ("qwen", "llama 4", "flux 2", "stable diffusion", "comfyui", "localai", "vllm", "bark")):
        return J
    if "whisper" in t:
        return J
    if "gemma 4" in t or "deepseek r1" in t:
        return J + " (микро-квант/CPU)"
    if "llama.cpp" in t:
        return J
    if "aider" in t:
        return NA + " " + G.replace("установлено", "Python — да")
    if "claude code" in t or "computer use" in t:
        return J + " API"
    if "operator" in t:
        return D + " " + J
    if "browser use" in t:
        return NA + " " + J
    if any(
        x in t
        for x in (
            "perplexity",
            "notion",
            "figma",
            "galileo",
            "framer",
            "v0",
            "midjourney",
            "dall-e",
            "sora",
            "kling",
            "runway",
            "veo",
            "elevenlabs",
            "suno",
            "udio",
            "lovable",
            "bolt",
            "replit",
            "supabase",
            "openrouter",
            "julius",
            "semantic scholar",
            "elicit",
            "google ai overviews",
            "activepieces",
            "zapier",
            "make",
            "clay",
            "n8n",
            "vercel",
            "railway",
            "fly.io",
            "neon",
            "coolify",
            "stackblitz",
            "chatgpt",
            "gpt-5",
            "claude opus",
            "claude pro",
            "claude artifacts",
            "advanced data analysis",
            "gemini",
            "jasper",
            "copy.ai",
            "litellm",
            "langfuse",
            "grafana",
            "weaviate",
            "chromadb",
            "qdrant",
            "pinecone",
            "otter",
            "fireflies",
        )
    ):
        if "google ai overviews" in t:
            return G.replace("установлено", "браузер Edge/Chrome")
        return J
    if "langgraph" in t or "crewai" in t or "autogen" in t or "langchain" in t or "mcp" in t:
        return G.replace("установлено", "Python — для pip")
    if "linear" in t or "productboard" in t:
        return J
    if "mlflow" in t:
        return NA + " pip"
    if "premiere" in t or "capcut" in t:
        return NA
    if "node.js" in t:
        return G.replace("установлено", "Node.js установлен")
    if "python" in t and "chatgpt" not in t:
        return G.replace("установлено", "Python установлен")
    if "next.js" in t:
        return G.replace("установлено", "Node.js установлен")
    if "perplexity pro" in t:
        return J
    return NA + " " + J


def expand_table(table: str) -> str:
    if "| Инструмент | На этом ПК (LAPTOP) |" in table:
        return table
    lines = table.split("\n")
    out = []
    for line in lines:
        if line.startswith("| Инструмент | Цена"):
            out.append(
                "| Инструмент | На этом ПК (LAPTOP) | Цена использования | Краткое описание | Комментарий |"
            )
        elif line.startswith("| :--- | :--- | :--- | :--- |"):
            out.append("| :--- | :--- | :--- | :--- | :--- |")
        elif line.startswith("|") and "Инструмент" not in line and ":---" not in line:
            raw = line.strip()
            if not raw.startswith("|"):
                out.append(line)
                continue
            inner = raw[1:-1]  # strip outer |
            cols = [c.strip() for c in inner.split("|")]
            if len(cols) == 4:
                c1, c2, c3, c4 = cols
                cell = pc_cell(c1)
                out.append(f"| {c1} | {cell} | {c2} | {c3} | {c4} |")
            else:
                out.append(line)
        else:
            out.append(line)
    return "\n".join(out)


# Expand each "### Категория N" table once
parts = text.split("### Категория ")
processed_chunks = []
marker = "| Инструмент | Цена использования | Краткое описание | Комментарий |"
for chunk in parts[1:]:
    if marker not in chunk:
        processed_chunks.append(chunk)
        continue
    idx = chunk.index(marker)
    rest = chunk[idx:]
    end = rest.find("\n\n---")
    if end == -1:
        end = len(rest)
    table = rest[:end]
    suffix = rest[end:]
    new_table = expand_table(table)
    processed_chunks.append(chunk[:idx] + new_table + suffix)

text = parts[0] + "### Категория ".join(processed_chunks)

path.write_text(text, encoding="utf-8")
print("Wrote", path)
