import time
from collections import defaultdict, deque
from typing import Annotated

from fastapi import Depends, HTTPException, status

from .auth import current_owner
from .config import get_settings

# In-memory and per process: enough for a single uvicorn worker, and it fails
# open on restart, which is the right trade-off for a personal workspace.
_hits: dict[str, deque[float]] = defaultdict(deque)


def reset_rate_limits() -> None:
    _hits.clear()


async def limit_writes(owner: Annotated[str, Depends(current_owner)]) -> None:
    limit = get_settings().write_rate_limit_per_minute
    now = time.monotonic()
    window = _hits[owner]
    while window and now - window[0] > 60:
        window.popleft()
    if len(window) >= limit:
        retry_after = max(1, int(60 - (now - window[0])) + 1)
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="rate_limited",
            headers={"Retry-After": str(retry_after)},
        )
    window.append(now)
