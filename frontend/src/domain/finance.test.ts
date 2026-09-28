import { describe, expect, it } from "vitest";
import { emptyWorkspace } from "../workspace";
import { accountBalance, financeTotals, toMinor } from "./finance";

describe("finance", () => {
  it("parses money without floating point rounding", () => { expect(toMinor("12.30")).toBe(1230); expect(toMinor("12,3")).toBe(1230); });
  it("keeps transfers out of income and expense", () => { const workspace = emptyWorkspace(); const first = { id: "a", title: "A", opening: 10000, currency: "TJS" }; const second = { id: "b", title: "B", opening: 0, currency: "TJS" }; workspace.accounts.push(first, second); workspace.transactions.push({ id: "t", kind: "transfer", amount: 2500, date: "2026-09-28", accountId: "a", toAccountId: "b" }); expect(accountBalance(workspace, first)).toBe(7500); expect(accountBalance(workspace, second)).toBe(2500); expect(financeTotals(workspace, "2026-09", "TJS")).toEqual({ income: 0, expense: 0 }); });
});
