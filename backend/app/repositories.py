import hashlib
import secrets
from datetime import UTC, datetime, timedelta
from uuid import uuid4

from sqlalchemy import delete, func, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from .models import SmsIngestToken, SmsMessage, WorkspaceDocument, WorkspaceRevision
from .schemas import SmsIngest


class RevisionConflictError(Exception):
    pass


class WorkspaceRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get(self, owner_id: str) -> WorkspaceDocument | None:
        return await self.session.scalar(
            select(WorkspaceDocument).where(WorkspaceDocument.owner_id == owner_id)
        )

    async def save(self, owner_id: str, payload: dict, revision: int) -> int:
        next_revision = revision + 1
        if revision == 0:
            self.session.add(
                WorkspaceDocument(owner_id=owner_id, payload=payload, revision=next_revision)
            )
            self.session.add(
                WorkspaceRevision(owner_id=owner_id, payload=payload, revision=next_revision)
            )
            try:
                await self.session.commit()
            except IntegrityError as error:
                await self.session.rollback()
                raise RevisionConflictError from error
            return next_revision

        result = await self.session.execute(
            update(WorkspaceDocument)
            .where(
                WorkspaceDocument.owner_id == owner_id,
                WorkspaceDocument.revision == revision,
            )
            .values(payload=payload, revision=next_revision)
        )
        if result.rowcount != 1:
            await self.session.rollback()
            raise RevisionConflictError
        self.session.add(
            WorkspaceRevision(owner_id=owner_id, payload=payload, revision=next_revision)
        )
        await self.session.execute(
            delete(WorkspaceRevision).where(
                WorkspaceRevision.owner_id == owner_id,
                WorkspaceRevision.revision <= next_revision - 50,
            )
        )
        await self.session.commit()
        return next_revision

    async def history(self, owner_id: str) -> list[WorkspaceRevision]:
        rows = await self.session.scalars(
            select(WorkspaceRevision)
            .where(WorkspaceRevision.owner_id == owner_id)
            .order_by(WorkspaceRevision.revision.desc())
            .limit(20)
        )
        return list(rows)

    async def revision(self, owner_id: str, revision: int) -> WorkspaceRevision | None:
        return await self.session.scalar(
            select(WorkspaceRevision).where(
                WorkspaceRevision.owner_id == owner_id,
                WorkspaceRevision.revision == revision,
            )
        )


class InboxFullError(Exception):
    pass


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


class SmsRepository:
    # Reviewed messages older than this are pruned so a long-lived inbox stays small.
    retention = timedelta(days=90)

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def token_owner(self, token: str) -> str | None:
        return await self.session.scalar(
            select(SmsIngestToken.owner_id).where(SmsIngestToken.token_hash == hash_token(token))
        )

    async def token(self, owner_id: str) -> SmsIngestToken | None:
        return await self.session.get(SmsIngestToken, owner_id)

    async def rotate_token(self, owner_id: str) -> str:
        token = secrets.token_urlsafe(32)
        await self.session.execute(
            delete(SmsIngestToken).where(SmsIngestToken.owner_id == owner_id)
        )
        self.session.add(SmsIngestToken(owner_id=owner_id, token_hash=hash_token(token)))
        await self.session.commit()
        return token

    async def revoke_token(self, owner_id: str) -> None:
        await self.session.execute(
            delete(SmsIngestToken).where(SmsIngestToken.owner_id == owner_id)
        )
        await self.session.commit()

    async def ingest(
        self, owner_id: str, message: SmsIngest, limit: int, now: datetime | None = None
    ) -> tuple[str, bool]:
        now = now or datetime.now(UTC)
        received_at = message.received_at
        if received_at is not None and received_at.tzinfo is None:
            received_at = received_at.replace(tzinfo=UTC)
        if received_at is not None and received_at > now + timedelta(days=1):
            received_at = None
        # Without a phone timestamp, retries are recognised within the same minute.
        stamp = (
            received_at.astimezone(UTC).replace(microsecond=0)
            if received_at
            else now.replace(second=0, microsecond=0)
        )
        fingerprint = hashlib.sha256(
            "\x1f".join(
                (message.source, message.sender, message.body, stamp.isoformat())
            ).encode()
        ).hexdigest()

        existing = await self._by_fingerprint(owner_id, fingerprint)
        if existing:
            return existing, True

        await self.session.execute(
            delete(SmsMessage).where(
                SmsMessage.owner_id == owner_id,
                SmsMessage.status != "new",
                SmsMessage.created_at < now - self.retention,
            )
        )
        count = await self.session.scalar(
            select(func.count()).select_from(SmsMessage).where(SmsMessage.owner_id == owner_id)
        )
        if (count or 0) >= limit:
            await self.session.rollback()
            raise InboxFullError

        message_id = str(uuid4())
        self.session.add(
            SmsMessage(
                id=message_id,
                owner_id=owner_id,
                source=message.source,
                sender=message.sender,
                body=message.body,
                received_at=received_at or now,
                fingerprint=fingerprint,
                status="new",
            )
        )
        try:
            await self.session.commit()
        except IntegrityError:
            await self.session.rollback()
            existing = await self._by_fingerprint(owner_id, fingerprint)
            if existing is None:
                raise
            return existing, True
        return message_id, False

    async def _by_fingerprint(self, owner_id: str, fingerprint: str) -> str | None:
        return await self.session.scalar(
            select(SmsMessage.id).where(
                SmsMessage.owner_id == owner_id, SmsMessage.fingerprint == fingerprint
            )
        )

    async def list(self, owner_id: str, status: str | None, limit: int) -> list[SmsMessage]:
        query = select(SmsMessage).where(SmsMessage.owner_id == owner_id)
        if status:
            query = query.where(SmsMessage.status == status)
        rows = await self.session.scalars(
            query.order_by(SmsMessage.received_at.desc(), SmsMessage.id).limit(limit)
        )
        return list(rows)

    async def set_status(self, owner_id: str, message_id: str, status: str) -> SmsMessage | None:
        row = await self.session.scalar(
            select(SmsMessage).where(
                SmsMessage.owner_id == owner_id, SmsMessage.id == message_id
            )
        )
        if row is None:
            return None
        row.status = status
        await self.session.commit()
        return row
