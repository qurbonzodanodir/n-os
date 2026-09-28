from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator

COLLECTIONS = (
    "tasks",
    "events",
    "habits",
    "notes",
    "projects",
    "goals",
    "accounts",
    "transactions",
    "budgets",
    "reviews",
)


def validate_workspace(value: dict[str, Any]) -> dict[str, Any]:
    if value.get("schema") != 3 or not isinstance(value.get("settings"), dict):
        raise ValueError("unsupported workspace schema")
    if value["settings"].get("language") not in {"ru", "en"}:
        raise ValueError("unsupported language")

    for name in COLLECTIONS:
        rows = value.get(name)
        if not isinstance(rows, list) or len(rows) > 3_000:
            raise ValueError(f"invalid collection: {name}")
        ids: set[str] = set()
        for row in rows:
            row_id = row.get("id") if isinstance(row, dict) else None
            if not isinstance(row_id, str) or not row_id or row_id in ids:
                raise ValueError(f"invalid record in: {name}")
            ids.add(row_id)
    return value


class WorkspaceWrite(BaseModel):
    model_config = ConfigDict(extra="forbid")

    workspace: dict[str, Any]
    revision: int = Field(ge=0)

    @field_validator("workspace")
    @classmethod
    def workspace_is_valid(cls, value: dict[str, Any]) -> dict[str, Any]:
        return validate_workspace(value)


class WorkspaceRead(BaseModel):
    workspace: dict[str, Any] | None
    revision: int


class WorkspaceSaved(BaseModel):
    revision: int
