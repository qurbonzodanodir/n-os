import type { Debt } from "../types";

export function debtPaid(debt: Debt) {
  return (debt.payments || []).reduce((sum, payment) => sum + payment.amount, 0);
}

export function debtRemaining(debt: Debt) {
  return Math.max(0, debt.amount - debtPaid(debt));
}

export function debtProgress(debt: Debt) {
  return debt.amount ? Math.min(100, Math.round((debtPaid(debt) / debt.amount) * 100)) : 0;
}

export function debtSummaries(debts: Debt[]) {
  const currencies = [...new Set(debts.map((debt) => debt.currency))].sort();
  return currencies.map((currency) => {
    const rows = debts.filter((debt) => debt.currency === currency);
    const receivable = rows.filter((debt) => debt.direction === "owed_to_me").reduce((sum, debt) => sum + debtRemaining(debt), 0);
    const payable = rows.filter((debt) => debt.direction === "i_owe").reduce((sum, debt) => sum + debtRemaining(debt), 0);
    return { currency, receivable, payable, net: receivable - payable };
  });
}
