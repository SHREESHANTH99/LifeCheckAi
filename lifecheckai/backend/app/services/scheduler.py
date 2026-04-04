from __future__ import annotations

import asyncio

from lifecheckai.backend.app.config import SCHEDULER_CITIES, SCHEDULER_INTERVAL_SECONDS
from lifecheckai.backend.app.routes.safety import get_city_safety_snapshot


async def scheduler() -> None:
    while True:
        for city in SCHEDULER_CITIES:
            try:
                await asyncio.to_thread(get_city_safety_snapshot, city, True)
            except Exception as exc:
                print(f"[SCHEDULER ERROR] {city}: {exc}")

        await asyncio.sleep(SCHEDULER_INTERVAL_SECONDS)
