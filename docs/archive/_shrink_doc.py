# -*- coding: utf-8 -*-
"""Shrink appendix tables (5->4 cols) and tighten snapshot/legend."""
import re
from pathlib import Path


def is_md_separator_row(line: str) -> bool:
    s = line.strip()
    if not (s.startswith("|") and s.endswith("|")):
        return False
    cells = [c.strip() for c in s.split("|")[1:-1]]
    if len(cells) < 2:
        return False
    for c in cells:
        if not re.fullmatch(r":?-{3,}:?", c):
            return False
    return True

path = Path(r"C:\Dev\replyline\docs\archive\ultimate-ai-stack-2026-2027.ru.md")
text = path.read_text(encoding="utf-8")
marker = "## Приложение:"
if marker not in text:
    raise SystemExit("appendix not found")
pre, post = text.split(marker, 1)
post = marker + post  # full appendix from heading

lines = post.split("\n")
out = []
i = 0
while i < len(lines):
    line = lines[i]
    if line.startswith("| Инструмент | На этом ПК (LAPTOP) | Цена использования | Краткое описание | Комментарий |"):
        out.append("| Инструмент | ПК | Цена | Примечание |")
        i += 1
        if i < len(lines) and is_md_separator_row(lines[i]):
            out.append("| :--- | :--- | :--- | :--- |")
            i += 1
        while i < len(lines) and lines[i].startswith("|") and not is_md_separator_row(lines[i]):
            row = lines[i]
            inner = row.strip()
            if not inner.startswith("|"):
                out.append(row)
                i += 1
                continue
            cells = [c.strip() for c in inner[1:-1].split("|")]
            if len(cells) >= 5:
                tool, pc, price, desc, comment = cells[0], cells[1], cells[2], cells[3], cells[4]
                c = comment.replace("Документ: ", "").replace("В документе: ", "").replace("В документе ", "")
                note = f"{desc} · {c}".strip(" ·")
                if len(note) > 130:
                    note = note[:127] + "…"
                out.append(f"| {tool} | {pc} | {price} | {note} |")
            else:
                out.append(row)
            i += 1
        continue
    out.append(line)
    i += 1

post2 = "\n".join(out)

# Tighten snapshot block: replace legend table + following paragraphs
old_legend = """#### Легенда цветов (статусы для **этой** конфигурации)

| Цвет | Смысл |
|:---|:---|
| <span style="color:#1b5e20">**■ зелёный**</span> | Уже **установлено** как приложение/компонент (по реестру или явной роли ОС), и релевантно стеку. |
| <span style="color:#e65100">**■ оранжевый**</span> | **Корпоративный** контур: договор, SSO, много мест, compliance — не «личный лаптоп по умолчанию». |
| <span style="color:#b71c1c">**■ красный**</span> | **Дорогой / премиум** тариф: для текущего железа и сценария часто **неоправдан** как default (не запрет — предупреждение о ROI). |
| <span style="color:#455a64">**■ сине-серый**</span> | **Железо не тянет** локально в осмысленном виде **или** только **облако / чужой GPU**; на этой машине не стоит планировать как основной runtime. |

*В предпросмотре Markdown HTML может не отрисоваться — смысл тот же, что в текстовых метках в колонке.*

**Итого установлено из стека (реестр):** <span style="color:#1b5e20">Cursor, Docker, Obsidian, Ollama, LM Studio, Git, GitHub CLI, Python, Node.js, Chrome, WSL</span>. Помимо таблиц документа в системе также: **Windsurf**, **Zed**, **GPT4All**, **Rustup**, **Typora**, **Logseq** и др. (см. `installed_apps_snapshot.txt`).

Статусы **зелёный / оранжевый / красный / серо-синий** для этой машины — **только** в колонке **«На этом ПК (LAPTOP)»** в таблицах категорий **1–20** ниже (отдельная сводная матрица убрана как дубликат).

### ОС и железо (общие ориентиры)

**ОС:** Windows 11 + **WSL2** — типичная база для Docker и self-host; **macOS** — сильный UX IDE (в документе **Granola** только там); **Linux** — прод-серверы, **vLLM/llama.cpp**, k8s. Локальные LLM на CUDA ориентируются на **NVIDIA**; air-gap — отдельные политики обновлений и DLP.

**Железо (не ваш ПК, а ориентиры из логики стека):** облако frontier — **16+ GB RAM** комфортнее для IDE+браузер; локальные 7B–32B — **Apple M1 Pro+** или **8–12 GB VRAM** + **32 GB** RAM; крупные веса и ComfyUI «в полный рост» — **много VRAM** / облако GPU. **Соответствие именно LAPTOP** — в блоке «Снимок системы» выше."""

new_legend = """**Легенда колонки «ПК»:** <span style="color:#1b5e20">■</span> установлено по реестру · <span style="color:#e65100">■</span> корпоративный контур · <span style="color:#b71c1c">■</span> дорогой премиум по умолчанию · <span style="color:#455a64">■</span> облако / железо не тянет.

**Из стека в реестре:** Cursor, Docker, Obsidian, Ollama, LM Studio, Git, gh, Python, Node, Chrome, WSL (+ Windsurf, Zed, GPT4All… — `installed_apps_snapshot.txt`).

**ОС/железо в общем:** WSL2+Docker; **Granola** только macOS; комфортный локальный 7B–32B — ориентир **16–32 GB RAM** и/или **NVIDIA**; тяжёлые веса/ComfyUI — много VRAM или облако. Детали **LAPTOP** — в таблице выше."""

if old_legend not in post2:
    raise SystemExit("legend block not found")
post2 = post2.replace(old_legend, new_legend)

path.write_text(pre + post2, encoding="utf-8")
print("OK", path)
