"""SMS inbox: a phone forwarder posts messages with a device token; the owner reviews them.

The ingest route is the only one that does not use the trusted identity header,
so the authentication edge must let `/api/v1/sms/ingest` through without a login.
"""
from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from .auth import current_owner
from .config import get_settings
from .database import get_session
from .ratelimit import check_rate, limit_writes
from .repositories import InboxFullError, SmsRepository
from .schemas import (
    SmsIngest,
    SmsIngested,
    SmsRead,
    SmsStatus,
    SmsStatusWrite,
    SmsTokenCreated,
    SmsTokenState,
)

router = APIRouter()
Session = Annotated[AsyncSession, Depends(get_session)]
Owner = Annotated[str, Depends(current_owner)]


async def device_owner(
    session: Session,
    authorization: Annotated[str | None, Header()] = None,
) -> str:
    scheme, _, token = (authorization or "").partition(" ")
    token = token.strip()
    if scheme.lower() != "bearer" or not token or len(token) > 128:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="unauthorized")
    owner = await SmsRepository(session).token_owner(token)
    if owner is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="unauthorized")
    check_rate(f"sms:{owner}", get_settings().sms_rate_limit_per_minute)
    return owner


DeviceOwner = Annotated[str, Depends(device_owner)]


@router.post("/ingest", response_model=SmsIngested, status_code=status.HTTP_201_CREATED)
async def ingest(
    body: SmsIngest, session: Session, owner: DeviceOwner, response: Response
) -> SmsIngested:
    try:
        message_id, duplicate = await SmsRepository(session).ingest(
            owner, body, get_settings().sms_inbox_limit
        )
    except InboxFullError as error:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="inbox_full") from error
    if duplicate:
        response.status_code = status.HTTP_200_OK
    return SmsIngested(id=message_id, duplicate=duplicate)


@router.get("", response_model=list[SmsRead])
async def list_messages(
    session: Session,
    owner: Owner,
    message_status: Annotated[SmsStatus | None, Query(alias="status")] = "new",
    limit: Annotated[int, Query(ge=1, le=500)] = 100,
) -> list[SmsRead]:
    rows = await SmsRepository(session).list(owner, message_status, limit)
    return [SmsRead.model_validate(row) for row in rows]


@router.get("/token", response_model=SmsTokenState)
async def token_state(session: Session, owner: Owner) -> SmsTokenState:
    row = await SmsRepository(session).token(owner)
    return SmsTokenState(exists=row is not None, created_at=row.created_at if row else None)


@router.post(
    "/token",
    response_model=SmsTokenCreated,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(limit_writes)],
)
async def rotate_token(session: Session, owner: Owner) -> SmsTokenCreated:
    """Create or replace the device token. The plaintext is returned only once."""
    return SmsTokenCreated(token=await SmsRepository(session).rotate_token(owner))


@router.delete(
    "/token", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(limit_writes)]
)
async def revoke_token(session: Session, owner: Owner) -> Response:
    await SmsRepository(session).revoke_token(owner)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.patch(
    "/{message_id}", response_model=SmsRead, dependencies=[Depends(limit_writes)]
)
async def set_status(
    message_id: str, body: SmsStatusWrite, session: Session, owner: Owner
) -> SmsRead:
    row = await SmsRepository(session).set_status(owner, message_id, body.status)
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="message_not_found")
    return SmsRead.model_validate(row)
