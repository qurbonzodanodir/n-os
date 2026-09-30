import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LegacyFinancePanel } from "./LegacyFinancePanel";

describe("LegacyFinancePanel", () => {
  it("keeps finance filters and record actions available", () => {
    const html = renderToStaticMarkup(<LegacyFinancePanel range="month" month="2026-09" currency="TJS" balance="100 TJS" income="120 TJS" expense="20 TJS" rangeLabel="September" series={[{ label: "Sep", incomeHeight: 130, expenseHeight: 30 }]} categories={[{ name: "Food", width: 50, value: "10 TJS" }]} accounts={[{ id: "account-1", title: "Cash", currency: "TJS", balance: "100 TJS" }]} transactions={[{ id: "transaction-1", title: "Lunch", subtitle: "today", kind: "expense", amount: "−10 TJS" }]} budgets={[{ id: "budget-1", title: "Food", category: "Food", spent: "10 TJS", amount: "20 TJS", remaining: "10 TJS", percent: 50 }]} label={(key) => key} icon={() => "<svg></svg>"} />);
    expect(html).toContain('data-action="finance-range"');
    expect(html).toContain('id="finance-month"');
    expect(html).toContain('data-value="account"');
    expect(html).toContain('data-type="transaction"');
    expect(html).toContain('data-type="budget"');
    expect(html).toContain("Food");
  });
});
