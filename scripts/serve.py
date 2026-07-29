#!/usr/bin/env python3
"""Локальный сервер для разработки.

То же самое, что `python -m http.server`, но с одним отличием: каждый ответ
уходит с `Cache-Control: no-store`. Без этого браузер кэширует и модули, и
levels/*.json — правишь карту или код, перезагружаешь страницу, видишь старое и
ищешь ошибку не там. На это уже дважды попадались.

Запуск из корня проекта:

    python scripts/serve.py          # http://localhost:8000
    python scripts/serve.py 3000     # другой порт

Зависимостей нет, только стандартная библиотека.
"""

import sys
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# Консоль Windows по умолчанию в cp1252 и падает на кириллице в print().
# Переключаем поток на UTF-8, а нерисуемые символы просим заменять, а не ронять.
for stream in (sys.stdout, sys.stderr):
    try:
        stream.reconfigure(encoding="utf-8", errors="replace")
    except (AttributeError, ValueError):
        pass


class NoCacheHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, max-age=0")
        super().end_headers()


def main() -> int:
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    handler = partial(NoCacheHandler, directory=str(ROOT))

    with ThreadingHTTPServer(("", port), handler) as server:
        print(f"Ключи знаний: http://localhost:{port}")
        print(f"Отдаю из {ROOT}")
        print("Ctrl+C — остановить")
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            print("\nОстановлено")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
