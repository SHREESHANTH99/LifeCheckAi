from __future__ import annotations

import asyncio

from lifecheckai.backend.app.config import SCHEDULER_CITIES, SCHEDULER_INTERVAL_SECONDS
from lifecheckai.backend.app.routes.safety import get_city_safety_snapshot


import os
import tempfile

LOCK_FILE = os.path.join(tempfile.gettempdir(), "lifecheckai_scheduler.lock")

async def scheduler() -> None:
    try:
        fd = os.open(LOCK_FILE, os.O_CREAT | os.O_EXCL | os.O_WRONLY)
        os.close(fd)
    except OSError:
        print("[SCHEDULER] Lock exists. Another worker is running the scheduler. Skipping.")
        return
        
    try:
        print("[SCHEDULER] Lock acquired. Starting refresh loop.")
        while True:
            for city in SCHEDULER_CITIES:
                try:
                    await asyncio.to_thread(get_city_safety_snapshot, city, True)
                except Exception as exc:
                    print(f"[SCHEDULER ERROR] {city}: {exc}")

            await asyncio.sleep(SCHEDULER_INTERVAL_SECONDS)
    finally:
        try:
            os.remove(LOCK_FILE)
        except OSError:
            pass
