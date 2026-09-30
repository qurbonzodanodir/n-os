import { describe, expect, it } from "vitest";
import type { Workspace } from "../types";
import {
  alignPrevious,
  compareMetrics,
  forecastExpense,
  goalRow,
  lastFinishedWeekStart,
  metricTone,
  periodMetrics,
  previousRange,
  projectProgress,
  weeklyReport,
  weeklyReportText,
} from "./analytics";

const workspace = {
  schema: 3,
  settings: { name: "", language: "en", theme: "light", timezone: "UTC", currency: "USD", weekStart: 1, reducedTransparency: false },
  tasks: [
    { id: "t1", title: "a", status: "completed", completedAt: "2026-09-10", createdAt: "2026-09-01", priority: "high", projectId: "p1" },
    { id: "t2", title: "b", status: "completed", completedAt: "2026-08-20", createdAt: "2026-08-01", projectId: "p1" },
    { id: "t3", title: "c", status: "todo", date: "2026-09-05", createdAt: "2026-09-02", projectId: "p1" },
    { id: "t4", title: "d", status: "cancelled", projectId: "p1" },
  ],
  events: [],
  notes: [{ id: "n1", title: "n", body: "", createdAt: "2026-09-03" }],
  habits: [{ id: "h1", title: "h", completions: ["2026-09-01", "2026-09-02"], startDate: "2026-09-01" }],
  projects: [{ id: "p1", title: "P", goalId: "g1" }],
  goals: [{ id: "g1", title: "G", milestones: [{ title: "m", done: true }] }],
  accounts: [{ id: "a1", title: "cash", opening: 0, currency: "USD" }],
  transactions: [
    { id: "x1", kind: "expense", amount: 3000, date: "2026-09-02", category: "food", accountId: "a1" },
    { id: "x2", kind: "expense", amount: 1000, date: "2026-09-08", category: "taxi", accountId: "a1" },
    { id: "x3", kind: "income", amount: 9000, date: "2026-09-03", accountId: "a1" },
    { id: "x4", kind: "expense", amount: 500, date: "2026-08-15", accountId: "a1" },
  ],
  budgets: [{ id: "b1", title: "Food", category: "food", amount: 10000, monthKey: "2026-09", currency: "USD" }],
  reviews: [],
  islam: {},
} as unknown as Workspace;

describe("analytics", () => {
  it("computes previous ranges across month, quarter and year boundaries", () => {
    expect(previousRange({ start: "2026-01-01", end: "2026-01-31" }, "month")).toEqual({ start: "2025-12-01", end: "2025-12-31" });
    expect(previousRange({ start: "2026-04-01", end: "2026-06-30" }, "quarter")).toEqual({ start: "2026-01-01", end: "2026-03-31" });
    expect(previousRange({ start: "2026-01-01", end: "2026-12-31" }, "year")).toEqual({ start: "2025-01-01", end: "2025-12-31" });
    expect(previousRange({ start: "2026-03-02", end: "2026-03-08" }, "week")).toEqual({ start: "2026-02-23", end: "2026-03-01" });
  });

  it("collects period metrics without counting future days", () => {
    const metrics = periodMetrics(workspace, { start: "2026-09-01", end: "2026-09-30" }, "2026-09-10", "USD");
    expect(metrics).toMatchObject({ completed: 1, created: 2, overdue: 1, notes: 1, income: 9000, expense: 4000, priorities: { high: 1 } });
    expect(metrics.consistency).toBe(20);
  });

  it("compares periods and avoids dividing by zero", () => {
    const now = periodMetrics(workspace, { start: "2026-09-01", end: "2026-09-30" }, "2026-09-10", "USD");
    const before = periodMetrics(workspace, { start: "2026-08-01", end: "2026-08-31" }, "2026-09-10", "USD");
    const delta = compareMetrics(now, before);
    expect(delta.completed).toEqual({ current: 1, previous: 1, change: 0, percent: 0 });
    expect(delta.expense.percent).toBe(700);
    expect(delta.income.percent).toBeNull();
  });

  it("forecasts spending by run rate and flags budget overruns", () => {
    const forecast = forecastExpense(workspace, "2026-09", "2026-09-10", "USD");
    expect(forecast).toMatchObject({
      spent: 4000,
      daysElapsed: 10,
      daysInMonth: 30,
      projected: 12000,
      budget: 10000,
      overBudget: 2000,
      reliable: true,
    });
    expect(forecastExpense(workspace, "2026-08", "2026-09-10", "USD")).toMatchObject({ projected: 500, overBudget: 0 });
    expect(forecastExpense(workspace, "2026-10", "2026-09-10", "USD").projected).toBe(0);
  });

  it("reports project and goal progress, ignoring cancelled tasks", () => {
    expect(projectProgress(workspace, workspace.projects[0], "2026-09-10")).toMatchObject({ done: 2, total: 3, percent: 67, overdue: 1 });
    expect(goalRow(workspace, workspace.goals[0], "2026-09-10")).toMatchObject({ done: 3, total: 4, percent: 75 });
  });

  it("finds the last finished week for any week start", () => {
    expect(lastFinishedWeekStart("2026-09-30", 1)).toBe("2026-09-21");
    expect(lastFinishedWeekStart("2026-09-28", 1)).toBe("2026-09-21");
    expect(lastFinishedWeekStart("2026-09-30", 0)).toBe("2026-09-20");
  });

  it("builds a weekly report with a plain-text form", () => {
    const report = weeklyReport(workspace, "2026-09-07", "2026-09-14");
    expect(report).toMatchObject({ end: "2026-09-13", categories: [{ name: "taxi", amount: 1000 }] });
    const text = weeklyReportText(
      report,
      (key) => key,
      (n) => String(n / 100),
    );
    expect(text).toContain("weeklyReport · 2026-09-07 — 2026-09-13");
    expect(text).toContain("topExpenses: taxi 10");
  });

  it("judges whether a change is an improvement", () => {
    expect(metricTone("expense", 5)).toBe("bad");
    expect(metricTone("completed", 5)).toBe("good");
    expect(metricTone("notes", 5)).toBe("neutral");
    expect(metricTone("overdue", 0)).toBe("neutral");
  });

  it("aligns a running period with the same days of the previous one", () => {
    const previous = { start: "2026-08-01", end: "2026-08-31" };
    expect(alignPrevious({ start: "2026-09-01", end: "2026-09-30" }, previous, "2026-09-10")).toEqual({
      start: "2026-08-01",
      end: "2026-08-10",
    });
    expect(alignPrevious({ start: "2026-09-01", end: "2026-09-30" }, previous, "2026-10-02")).toEqual(previous);
    expect(alignPrevious({ start: "2026-03-01", end: "2026-03-31" }, { start: "2026-02-01", end: "2026-02-28" }, "2026-03-30").end).toBe(
      "2026-02-28",
    );
  });
});
