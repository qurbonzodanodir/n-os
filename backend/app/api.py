from datetime import date
from typing import Annotated

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from .auth import current_owner
from .database import get_session
from .ratelimit import limit_writes
from .repositories import RevisionConflictError, WorkspaceRepository
from .schemas import WorkspaceHistoryItem, WorkspaceRead, WorkspaceSaved, WorkspaceWrite

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


@router.put("/workspace", response_model=WorkspaceSaved, dependencies=[Depends(limit_writes)])
async def write_workspace(
    body: WorkspaceWrite, session: Session, owner: Owner
) -> WorkspaceSaved:
    try:
        revision = await WorkspaceRepository(session).save(owner, body.workspace, body.revision)
    except RevisionConflictError as error:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="conflict") from error
    return WorkspaceSaved(revision=revision)


@router.get("/workspace/history", response_model=list[WorkspaceHistoryItem])
async def workspace_history(session: Session, owner: Owner) -> list[WorkspaceHistoryItem]:
    rows = await WorkspaceRepository(session).history(owner)
    return [
        WorkspaceHistoryItem(revision=row.revision, created_at=row.created_at) for row in rows
    ]


@router.get("/workspace/history/{revision}", response_model=WorkspaceRead)
async def read_workspace_revision(
    revision: int, session: Session, owner: Owner
) -> WorkspaceRead:
    repository = WorkspaceRepository(session)
    snapshot = await repository.revision(owner, revision)
    current = await repository.get(owner)
    if snapshot is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="revision_not_found")
    return WorkspaceRead(workspace=snapshot.payload, revision=current.revision if current else 0)


PRAYER_METHODS = {
    1: "University of Islamic Sciences, Karachi",
    2: "ISNA",
    3: "Muslim World League",
    4: "Umm Al-Qura",
    5: "Egyptian General Authority",
}


@router.get("/prayer-times")
async def prayer_times(
    requested_date: Annotated[date, Query(alias="date")],
    _owner: Owner,
    city: Annotated[str, Query(min_length=1, max_length=80)] = "Dushanbe",
    country: Annotated[str, Query(min_length=1, max_length=80)] = "Tajikistan",
    method: Annotated[int, Query(ge=0, le=24)] = 3,
    school: Annotated[int, Query(ge=0, le=1)] = 1,
) -> dict:
    endpoint = f"https://api.aladhan.com/v1/timingsByCity/{requested_date:%d-%m-%Y}"
    params = {"city": city, "country": country, "method": method, "school": school}
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
        "method": PRAYER_METHODS.get(method, f"Method {method}"),
        "school": "Hanafi" if school == 1 else "Shafi'i",
    }
