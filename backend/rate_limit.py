from __future__ import annotations

import asyncio
import math
import time
from collections import defaultdict, deque


class TooManyRequestsError(ValueError):
    def __init__(self, retry_after_seconds: int) -> None:
        super().__init__("Rate limit exceeded")
        self.retry_after_seconds = retry_after_seconds


class InMemoryRateLimiter:
    def __init__(self) -> None:
        self._buckets: dict[str, deque[float]] = defaultdict(deque)
        self._lock = asyncio.Lock()

    async def enforce(
        self,
        scope: str,
        key: str,
        *,
        limit: int,
        window_seconds: int,
    ) -> None:
        if limit <= 0 or window_seconds <= 0:
            return

        now = time.monotonic()
        bucket_key = f"{scope}:{key}"
        cutoff = now - window_seconds

        async with self._lock:
            bucket = self._buckets[bucket_key]
            while bucket and bucket[0] <= cutoff:
                bucket.popleft()

            if len(bucket) >= limit:
                retry_after = max(1, math.ceil(window_seconds - (now - bucket[0])))
                raise TooManyRequestsError(retry_after)

            bucket.append(now)
