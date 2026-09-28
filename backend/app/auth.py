from typing import Annotated

from fastapi import Header, HTTPException, status

from .config import get_settings


async def current_owner(
    authenticated_owner: Annotated[str | None, Header(alias="OAI-Authenticated-User-Id")] = None,
    development_owner: Annotated[str | None, Header(alias="X-User-Id")] = None,
) -> str:
    settings = get_settings()
    owner = authenticated_owner or (development_owner if settings.is_development else None)
    if not owner:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="unauthorized")
    return owner
