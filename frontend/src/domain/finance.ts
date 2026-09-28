import type { Account, Workspace } from "../types";

export function toMinor(value: string): number {
  const normalized = value.trim().replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) throw new Error("amount");
  const [whole, fraction = ""] = normalized.split(".");
  const result = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(result)) throw new Error("amount");
  return result;
}

export function accountBalance(workspace: Workspace, account: Account): number {
  return workspace.transactions.reduce((sum, transaction) => {
    if (transaction.accountId === account.id) return sum + (transaction.kind === "income" ? transaction.amount : -transaction.amount);
    if (transaction.kind === "transfer" && transaction.toAccountId === account.id) return sum + transaction.amount;
    return sum;
  }, account.opening);
}

export function financeTotals(workspace: Workspace, month: string, currency: string) {
  const transactions = workspace.transactions.filter((transaction) => transaction.date.startsWith(month) && workspace.accounts.find((account) => account.id === transaction.accountId)?.currency === currency);
  return {
    income: transactions.filter((transaction) => transaction.kind === "income").reduce((sum, transaction) => sum + transaction.amount, 0),
    expense: transactions.filter((transaction) => transaction.kind === "expense").reduce((sum, transaction) => sum + transaction.amount, 0),
  };
}
