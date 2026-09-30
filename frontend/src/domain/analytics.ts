import type { Goal, Project, Workspace } from "../types";
import { goalProgress } from "./goals";

export type Period = "week" | "month" | "quarter" | "year";
export interface Range { start: string; end: string }

const OPEN = ["completed", "cancelled"];
const DAY = 86400000;

const parse = (date: string) => new Date(`${date}T12:00:00Z`).getTime();
const format = (time: number) => new Date(time).toISOString().slice(0, 10);
export const addDays = (date: string, days: number) => format(parse(date) + days * DAY);
export const monthEnd = (month: string) => format(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0, 12));
export const shiftMonth = (month: string, delta: number) => {
  const d = new Date(`${month}-01T12:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + delta);
  return format(d.getTime()).slice(0, 7);
};
export const daysBetween = (start: string, end: string) => Math.round((parse(end) - parse(start)) / DAY) + 1;

/** The range of the same kind immediately before `range`. */
export function previousRange(range: Range, period: Period): Range {
  if (period === "week") return { start: addDays(range.start, -7), end: addDays(range.end, -7) };
  const months = period === "month" ? 1 : period === "quarter" ? 3 : 12;
  const start = `${shiftMonth(range.start.slice(0, 7), -months)}-01`;
  return { start, end: monthEnd(shiftMonth(range.end.slice(0, 7), -months)) };
}

/**
 * A running period is compared with the same number of days of the previous one,
 * otherwise "this month so far" would always look worse than a finished month.
 */
export function alignPrevious(range: Range, previous: Range, today: string): Range {
  if (today >= range.end || today < range.start) return previous;
  const elapsed = daysBetween(range.start, today);
  const end = addDays(previous.start, elapsed - 1);
  return { start: previous.start, end: end < previous.end ? end : previous.end };
}

export interface PeriodMetrics {
  completed: number;
  created: number;
  overdue: number;
  consistency: number;
  notes: number;
  income: number;
  expense: number;
  priorities: Record<string, number>;
}

const within = (value: string | null | undefined, range: Range) => !!value && value >= range.start && value <= range.end;

/** Everything is bounded by `today`, so a running period is never diluted by days that have not happened. */
export function periodMetrics(workspace: Workspace, range: Range, today: string, currency: string): PeriodMetrics {
  const tasks = workspace.tasks;
  const completedTasks = tasks.filter((task) => task.status === "completed" && within(task.completedAt, range));
  const priorities: Record<string, number> = {};
  for (const task of completedTasks) priorities[task.priority || "medium"] = (priorities[task.priority || "medium"] || 0) + 1;

  let due = 0;
  let checked = 0;
  const last = range.end < today ? range.end : today;
  for (const habit of workspace.habits) {
    for (let date = range.start; date <= last; date = addDays(date, 1)) {
      const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
      const scheduled = date >= (habit.startDate || "0000") && (!habit.endDate || date <= habit.endDate) && (!habit.weekdays?.length || habit.weekdays.includes(weekday));
      if (!scheduled) continue;
      due++;
      if (habit.completions.includes(date)) checked++;
    }
  }

  const money = workspace.transactions.filter((item) => within(item.date, range) && workspace.accounts.find((account) => account.id === item.accountId)?.currency === currency);
  return {
    completed: completedTasks.length,
    created: tasks.filter((task) => within(task.createdAt, range)).length,
    overdue: tasks.filter((task) => task.date && within(task.date, range) && task.date < today && !OPEN.includes(task.status)).length,
    consistency: due ? Math.round(checked / due * 100) : 0,
    notes: workspace.notes.filter((note) => within(note.createdAt, range)).length,
    income: money.filter((item) => item.kind === "income").reduce((sum, item) => sum + item.amount, 0),
    expense: money.filter((item) => item.kind === "expense").reduce((sum, item) => sum + item.amount, 0),
    priorities,
  };
}

export interface Delta { current: number; previous: number; change: number; percent: number | null }
export type MetricKey = "completed" | "created" | "overdue" | "consistency" | "notes" | "income" | "expense";
export const metricKeys: MetricKey[] = ["completed", "created", "overdue", "consistency", "notes", "income", "expense"];

export function compareMetrics(current: PeriodMetrics, previous: PeriodMetrics): Record<MetricKey, Delta> {
  const result = {} as Record<MetricKey, Delta>;
  for (const key of metricKeys) {
    const change = current[key] - previous[key];
    result[key] = { current: current[key], previous: previous[key], change, percent: previous[key] ? Math.round(change / previous[key] * 100) : null };
  }
  return result;
}

export interface ExpenseForecast {
  spent: number;
  daysElapsed: number;
  daysInMonth: number;
  dailyAverage: number;
  projected: number;
  budget: number;
  overBudget: number;
  reliable: boolean;
}

/** Linear run-rate forecast. A closed month is reported as-is; a month that has not started has no forecast. */
export function forecastExpense(workspace: Workspace, month: string, today: string, currency: string): ExpenseForecast {
  const start = `${month}-01`;
  const end = monthEnd(month);
  const daysInMonth = daysBetween(start, end);
  const daysElapsed = today > end ? daysInMonth : today < start ? 0 : daysBetween(start, today);
  const spent = periodMetrics(workspace, { start, end }, today, currency).expense;
  const budget = workspace.budgets.filter((item) => item.monthKey === month && item.currency === currency).reduce((sum, item) => sum + item.amount, 0);
  const projected = daysElapsed >= daysInMonth ? spent : daysElapsed ? Math.round(spent / daysElapsed * daysInMonth) : 0;
  return {
    spent, daysElapsed, daysInMonth, budget, projected,
    dailyAverage: daysElapsed ? Math.round(spent / daysElapsed) : 0,
    overBudget: budget && projected > budget ? projected - budget : 0,
    reliable: daysElapsed >= 7,
  };
}

export interface ProgressRow { id: string; title: string; percent: number; done: number; total: number; overdue: number }

const linked = (workspace: Workspace, predicate: (task: Workspace["tasks"][number]) => boolean, today: string) => {
  const tasks = workspace.tasks.filter((task) => predicate(task) && task.status !== "cancelled");
  return { done: tasks.filter((task) => task.status === "completed").length, total: tasks.length, overdue: tasks.filter((task) => task.status !== "completed" && task.date && task.date < today).length };
};

export function projectProgress(workspace: Workspace, project: Project, today: string): ProgressRow {
  const { done, total, overdue } = linked(workspace, (task) => task.projectId === project.id, today);
  return { id: project.id, title: project.title, percent: total ? Math.round(done / total * 100) : 0, done, total, overdue };
}

export function goalRow(workspace: Workspace, goal: Goal, today: string): ProgressRow {
  const projectIds = new Set(workspace.projects.filter((project) => project.goalId === goal.id).map((project) => project.id));
  const { done, total, overdue } = linked(workspace, (task) => task.goalId === goal.id || (!!task.projectId && projectIds.has(task.projectId)), today);
  const steps = goal.milestones || [];
  return { id: goal.id, title: goal.title, percent: goalProgress(workspace, goal), done: done + steps.filter((step) => step.done).length, total: total + steps.length, overdue };
}

export interface WeeklyReport {
  week: string;
  start: string;
  end: string;
  currency: string;
  generatedAt: string;
  metrics: PeriodMetrics;
  previous: PeriodMetrics;
  categories: Array<{ name: string; amount: number }>;
}

export function weeklyReport(workspace: Workspace, start: string, today: string): WeeklyReport {
  const range = { start, end: addDays(start, 6) };
  const currency = workspace.settings.currency;
  const categories = new Map<string, number>();
  for (const item of workspace.transactions) {
    if (item.kind !== "expense" || !within(item.date, range) || workspace.accounts.find((account) => account.id === item.accountId)?.currency !== currency) continue;
    const name = item.category || "—";
    categories.set(name, (categories.get(name) || 0) + item.amount);
  }
  return {
    week: start, start: range.start, end: range.end, currency, generatedAt: today,
    metrics: periodMetrics(workspace, range, today, currency),
    previous: periodMetrics(workspace, previousRange(range, "week"), today, currency),
    categories: [...categories.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([name, amount]) => ({ name, amount })),
  };
}

/** Start of the most recent fully finished week, given the workspace's first weekday (0 = Sunday). */
export function lastFinishedWeekStart(today: string, weekStart: number): string {
  const offset = (new Date(`${today}T12:00:00Z`).getUTCDay() - Number(weekStart) + 7) % 7;
  return addDays(today, -offset - 7);
}

export function weeklyReportText(report: WeeklyReport, label: (key: string) => string, money: (minor: number) => string): string {
  const { metrics: m, previous: p } = report;
  const arrow = (a: number, b: number) => (a === b ? "=" : a > b ? "▲" : "▼");
  const lines = [
    `${label("weeklyReport")} · ${report.start} — ${report.end}`,
    "",
    `${label("completed")}: ${m.completed} ${arrow(m.completed, p.completed)} (${p.completed})`,
    `${label("overdue")}: ${m.overdue}`,
    `${label("consistency")}: ${m.consistency}% ${arrow(m.consistency, p.consistency)} (${p.consistency}%)`,
    `${label("notes")}: ${m.notes}`,
    `${label("income")}: ${money(m.income)}`,
    `${label("expense")}: ${money(m.expense)} ${arrow(m.expense, p.expense)} (${money(p.expense)})`,
  ];
  if (report.categories.length) lines.push("", `${label("topExpenses")}: ${report.categories.map((item) => `${item.name} ${money(item.amount)}`).join(", ")}`);
  return lines.join("\n");
}

/** Whether a change in a metric is an improvement. Volume metrics such as notes are neutral. */
export function metricTone(key: MetricKey, change: number): "good" | "bad" | "neutral" {
  if (!change) return "neutral";
  if (key === "completed" || key === "consistency" || key === "income") return change > 0 ? "good" : "bad";
  if (key === "overdue" || key === "expense") return change > 0 ? "bad" : "good";
  return "neutral";
}
