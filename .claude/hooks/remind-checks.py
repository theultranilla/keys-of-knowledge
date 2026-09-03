#!/usr/bin/env python
"""PostToolUse-хук: после правки карты или генератора задач напоминает прогнать
проверки из CLAUDE.md. Node в проекте нет, поэтому не запускаем аудит сами —
только подсказываем открыть браузер-стенды. Тихо выходим, если файл другой."""
import sys
import json


def main():
    try:
        data = json.load(sys.stdin)
    except Exception:
        return
    path = str(data.get("tool_input", {}).get("file_path", "")).replace("\\", "/")

    if "/levels/" in path and path.endswith(".json"):
        print("⚠ Правил карту. Прогони аудит: http://localhost:8000/scripts/audit-levels.html")
    elif "/src/tasks/" in path and path.endswith(".js"):
        print("⚠ Правил генераторы. Прогони: http://localhost:8000/scripts/verify-tasks.html")


if __name__ == "__main__":
    main()
