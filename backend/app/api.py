from datetime import date
from typing import Annotated

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from .auth import current_owner
from .database import get_session
from .repositories import RevisionConflictError, WorkspaceRepository
from .schemas import WorkspaceRead, WorkspaceSaved, WorkspaceWrite

router = APIRouter()
Session = Annotated[AsyncSession, Depends(get_session)]
Owner = Annotated[str, Depends(current_owner)]


@router.get("/health")
async def health() -> dict[str, bool]:
    return {"ok": True}


@router.get("/ready")
async def ready(session: Session) -> dict[str, bool]:
    await session.execute(text("SELECT 1"))
    return {"ok": True}


@router.get("/workspace", response_model=WorkspaceRead)
async def read_workspace(session: Session, owner: Owner) -> WorkspaceRead:
    row = await WorkspaceRepository(session).get(owner)
    return WorkspaceRead(
        workspace=row.payload if row else None,
        revision=row.revision if row else 0,
    )


@router.put("/workspace", response_model=WorkspaceSaved)
async def write_workspace(
    body: WorkspaceWrite, session: Session, owner: Owner
) -> WorkspaceSaved:
    try:
        revision = await WorkspaceRepository(session).save(owner, body.workspace, body.revision)
    except RevisionConflictError as error:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="conflict") from error
    return WorkspaceSaved(revision=revision)


@router.get("/prayer-times")
async def prayer_times(
    requested_date: Annotated[date, Query(alias="date")],
    _owner: Owner,
) -> dict:
    endpoint = f"https://api.aladhan.com/v1/timingsByCity/{requested_date:%d-%m-%Y}"
    params = {
        "city": "Dushanbe",
        "country": "Tajikistan",
        "method": 3,
        "school": 1,
    }
    try:
        async with httpx.AsyncClient(timeout=8) as client:
            response = await client.get(endpoint, params=params)
            response.raise_for_status()
        data = response.json()["data"]
        timings = {name: str(data["timings"][name])[:5] for name in (
            "Fajr", "Sunrise", "Dhuhr", "Asr", "Maghrib", "Isha"
        )}
    except (httpx.HTTPError, KeyError, TypeError, ValueError) as error:
        raise HTTPException(status_code=502, detail="prayer_times_unavailable") from error
    return {
        "date": requested_date.isoformat(),
        "timings": timings,
        "hijri": data.get("date", {}).get("hijri", {}).get("date", ""),
        "timezone": data.get("meta", {}).get("timezone", "Asia/Dushanbe"),
        "method": "Muslim World League",
        "school": "Hanafi",
    }
