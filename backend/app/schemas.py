import json
from datetime import datetime
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
    "debts",
    "reviews",
)


def validate_workspace(value: dict[str, Any]) -> dict[str, Any]:
    if len(json.dumps(value, ensure_ascii=False, separators=(",", ":"))) > 1_500_000:
        raise ValueError("workspace is too large")
    if value.get("schema") != 3 or not isinstance(value.get("settings"), dict):
        raise ValueError("unsupported workspace schema")
    if value["settings"].get("language") not in {"ru", "en"}:
        raise ValueError("unsupported language")

    records: dict[str, list[dict[str, Any]]] = {}
    for name in COLLECTIONS:
        rows = value.get(name)
        if name == "debts" and rows is None:
            rows = []
            value[name] = rows
        if not isinstance(rows, list) or len(rows) > 3_000:
            raise ValueError(f"invalid collection: {name}")
        ids: set[str] = set()
        for row in rows:
            row_id = row.get("id") if isinstance(row, dict) else None
            if not isinstance(row_id, str) or not row_id or row_id in ids:
                raise ValueError(f"invalid record in: {name}")
            if name not in {"transactions", "reviews"} and (
                not isinstance(row.get("title"), str) or not row["title"].strip()
            ):
                raise ValueError(f"missing title in: {name}")
            ids.add(row_id)
        records[name] = rows

    valid_statuses = {"todo", "progress", "completed", "cancelled"}
    if any(task.get("status") not in valid_statuses for task in records["tasks"]):
        raise ValueError("invalid task status")
    if any(not isinstance(habit.get("completions"), list) for habit in records["habits"]):
        raise ValueError("invalid habit completions")

    accounts = {account["id"]: account for account in records["accounts"]}
    for account in accounts.values():
        if not isinstance(account.get("opening"), int):
            raise ValueError("invalid account amount")
    for transaction in records["transactions"]:
        if (
            not isinstance(transaction.get("amount"), int)
            or transaction["amount"] <= 0
            or transaction.get("kind") not in {"income", "expense", "transfer"}
            or transaction.get("accountId") not in accounts
        ):
            raise ValueError("invalid transaction")
        if transaction["kind"] == "transfer":
            source = accounts[transaction["accountId"]]
            destination = accounts.get(transaction.get("toAccountId"))
            invalid_destination = not destination or destination["id"] == source["id"]
            different_currency = destination and (
                destination.get("currency") != source.get("currency")
            )
            if invalid_destination or different_currency:
                raise ValueError("invalid transfer")
    invalid_budget = any(
        not isinstance(budget.get("amount"), int) or budget["amount"] <= 0
        for budget in records["budgets"]
    )
    if invalid_budget:
        raise ValueError("invalid budget")

    for debt in records["debts"]:
        payments = debt.get("payments")
        invalid_debt = (
            not isinstance(debt.get("amount"), int)
            or debt["amount"] <= 0
            or debt.get("direction") not in {"owed_to_me", "i_owe"}
            or not isinstance(debt.get("currency"), str)
            or not debt["currency"]
            or not isinstance(payments, list)
        )
        if invalid_debt:
            raise ValueError("invalid debt")
        total_paid = 0
        for payment in payments:
            if (
                not isinstance(payment, dict)
                or not isinstance(payment.get("id"), str)
                or not isinstance(payment.get("amount"), int)
                or payment["amount"] <= 0
                or not isinstance(payment.get("date"), str)
            ):
                raise ValueError("invalid debt payment")
            total_paid += payment["amount"]
        if total_paid > debt["amount"]:
            raise ValueError("debt is overpaid")

    project_ids = {project["id"] for project in records["projects"]}
    goal_ids = {goal["id"] for goal in records["goals"]}
    for project in records["projects"]:
        if project.get("goalId") and project["goalId"] not in goal_ids:
            raise ValueError("invalid goal link")
    for name in ("tasks", "events", "habits", "notes"):
        for row in records[name]:
            if row.get("projectId") and row["projectId"] not in project_ids:
                raise ValueError("invalid project link")
            if row.get("goalId") and row["goalId"] not in goal_ids:
                raise ValueError("invalid goal link")
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


class WorkspaceHistoryItem(BaseModel):
    revision: int
    created_at: datetime
