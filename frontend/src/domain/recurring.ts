import type { Transaction, Workspace } from "../types";
import { addDays, monthEnd, shiftMonth } from "./analytics";

export interface RecurringTemplate {
  id: string;
  title: string;
  kind: "income" | "expense";
  amount: number;
  accountId: string;
  category?: string;
  repeat: "weekly" | "monthly";
  /** First occurrence; monthly templates keep this day of month, clamped to short months. */
  start: string;
  endDate?: string;
  /** Last occurrence already turned into a transaction. */
  lastGenerated?: string;
}

const MAX_CATCH_UP = 60;

function occurrence(template: RecurringTemplate, index: number): string {
  if (template.repeat === "weekly") return addDays(template.start, index * 7);
  const month = shiftMonth(template.start.slice(0, 7), index);
  const day = Math.min(Number(template.start.slice(8)), Number(monthEnd(month).slice(8)));
  return `${month}-${String(day).padStart(2, "0")}`;
}

/** Occurrence dates after `lastGenerated` that have already arrived (oldest first, bounded). */
export function dueDates(template: RecurringTemplate, today: string): string[] {
  const limit = template.endDate && template.endDate < today ? template.endDate : today;
  const dates: string[] = [];
  for (let index = 0; dates.length < MAX_CATCH_UP; index++) {
    const date = occurrence(template, index);
    if (date > limit) break;
    if (!template.lastGenerated || date > template.lastGenerated) dates.push(date);
  }
  return dates;
}

export const recurringTransactionId = (templateId: string, date: string) => `rec-${templateId}-${date}`;

/** Creates the missing transactions for every template. Safe to run repeatedly and from several devices. */
export function materializeRecurring(workspace: Workspace, templates: RecurringTemplate[], today: string) {
  const known = new Set(workspace.transactions.map((transaction) => transaction.id));
  const created: Transaction[] = [];
  const updated = templates.map((template) => {
    if (!workspace.accounts.some((account) => account.id === template.accountId)) return template;
    const dates = dueDates(template, today);
    for (const date of dates) {
      const id = recurringTransactionId(template.id, date);
      if (known.has(id)) continue;
      known.add(id);
      created.push({
        id,
        kind: template.kind,
        amount: template.amount,
        date,
        category: template.category,
        title: template.title,
        accountId: template.accountId,
        createdAt: today,
        updatedAt: today,
      });
    }
    return dates.length ? { ...template, lastGenerated: dates[dates.length - 1] } : template;
  });
  return { transactions: [...workspace.transactions, ...created], templates: updated, created: created.length };
}
