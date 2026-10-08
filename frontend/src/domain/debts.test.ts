import { describe, expect, it } from "vitest";
import type { Debt } from "../types";
import { debtPaid, debtProgress, debtRemaining, debtSummaries } from "./debts";

const debt = (overrides: Partial<Debt> = {}): Debt => ({
  id: "d1",
  title: "Aziz",
  direction: "owed_to_me",
  amount: 10_000,
  currency: "TJS",
  payments: [],
  ...overrides,
});

describe("debt calculations", () => {
  it("tracks partial repayments and progress", () => {
    const row = debt({ payments: [{ id: "p1", amount: 2_500, date: "2026-10-01" }] });
    expect(debtPaid(row)).toBe(2_500);
    expect(debtRemaining(row)).toBe(7_500);
    expect(debtProgress(row)).toBe(25);
  });

  it("keeps currencies separate in summaries", () => {
    const rows = [debt(), debt({ id: "d2", direction: "i_owe", amount: 4_000 }), debt({ id: "d3", currency: "USD", amount: 1_000 })];
    expect(debtSummaries(rows)).toEqual([
      { currency: "TJS", receivable: 10_000, payable: 4_000, net: 6_000 },
      { currency: "USD", receivable: 1_000, payable: 0, net: 1_000 },
    ]);
  });
});
