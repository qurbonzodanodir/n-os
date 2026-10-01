import { describe, expect, it } from "vitest";
import type { Workspace } from "../types";
import { dueDates, materializeRecurring, type RecurringTemplate } from "./recurring";

const rent: RecurringTemplate = {
  id: "r1",
  title: "Rent",
  kind: "expense",
  amount: 50_000,
  accountId: "cash",
  category: "Home",
  repeat: "monthly",
  start: "2026-01-31",
};
const workspace = { accounts: [{ id: "cash", title: "Cash", opening: 0, currency: "USD" }], transactions: [] } as unknown as Workspace;

describe("recurring transactions", () => {
  it("clamps month-end starts to shorter months and keeps the original day afterwards", () => {
    expect(dueDates(rent, "2026-04-30")).toEqual(["2026-01-31", "2026-02-28", "2026-03-31", "2026-04-30"]);
  });

  it("generates weekly occurrences and honours the end date", () => {
    const weekly: RecurringTemplate = { ...rent, repeat: "weekly", start: "2026-09-01", endDate: "2026-09-20" };
    expect(dueDates(weekly, "2026-12-31")).toEqual(["2026-09-01", "2026-09-08", "2026-09-15"]);
  });

  it("only returns occurrences after the last generated one and nothing from the future", () => {
    expect(dueDates({ ...rent, lastGenerated: "2026-02-28" }, "2026-03-30")).toEqual([]);
    expect(dueDates({ ...rent, lastGenerated: "2026-02-28" }, "2026-04-01")).toEqual(["2026-03-31"]);
    expect(dueDates({ ...rent, start: "2026-12-01" }, "2026-09-30")).toEqual([]);
  });

  it("materialises missing transactions once and remembers progress", () => {
    const first = materializeRecurring(workspace, [rent], "2026-03-31");
    expect(first.created).toBe(3);
    expect(first.templates[0].lastGenerated).toBe("2026-03-31");
    expect(first.transactions[0]).toMatchObject({
      id: "rec-r1-2026-01-31",
      kind: "expense",
      amount: 50_000,
      accountId: "cash",
      title: "Rent",
    });

    const again = materializeRecurring({ ...workspace, transactions: first.transactions }, first.templates, "2026-03-31");
    expect(again.created).toBe(0);
  });

  it("does not duplicate when another device already created the same transactions", () => {
    const first = materializeRecurring(workspace, [rent], "2026-02-28");
    const stale = materializeRecurring({ ...workspace, transactions: first.transactions }, [rent], "2026-02-28");
    expect(stale.created).toBe(0);
    expect(stale.transactions).toHaveLength(2);
  });

  it("skips templates whose account was deleted", () => {
    const result = materializeRecurring({ ...workspace, accounts: [] }, [rent], "2026-03-31");
    expect(result.created).toBe(0);
    expect(result.templates[0]).toBe(rent);
  });
});
