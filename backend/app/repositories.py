from sqlalchemy import delete, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from .models import WorkspaceDocument, WorkspaceRevision


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
