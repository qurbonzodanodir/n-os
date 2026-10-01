import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LegacyFinancePanel } from "./LegacyFinancePanel";

describe("LegacyFinancePanel", () => {
  it("keeps finance filters and record actions available", () => {
    const html = renderToStaticMarkup(
      <LegacyFinancePanel
        range="month"
        month="2026-09"
        currency="TJS"
        balance="100 TJS"
        income="120 TJS"
        expense="20 TJS"
        rangeLabel="September"
        series={[{ label: "Sep", incomeHeight: 130, expenseHeight: 30 }]}
        categories={[{ name: "Food", width: 50, value: "10 TJS" }]}
        accounts={[{ id: "account-1", title: "Cash", currency: "TJS", balance: "100 TJS" }]}
        transactions={[{ id: "transaction-1", title: "Lunch", subtitle: "today", kind: "expense", amount: "−10 TJS" }]}
        budgets={[{ id: "budget-1", title: "Food", category: "Food", spent: "10 TJS", amount: "20 TJS", remaining: "10 TJS", percent: 50 }]}
        comparison={[{ key: "expense", current: "20 TJS", previous: "10 TJS", percent: "+100%", tone: "bad", trend: "up" }]}
        previousLabel="August"
        recurring={[{ id: "r1", title: "Rent", kind: "expense", amount: "−500 TJS", meta: "monthly" }]}
        today="2026-09-30"
        onAddRecurring={() => {}}
        onDeleteRecurring={() => {}}
        forecast={{
          month: "September",
          spent: "20 TJS",
          projected: "60 TJS",
          dailyAverage: "2 TJS",
          budget: "50 TJS",
          overBudget: "10 TJS",
          reliable: true,
          closed: false,
          progress: 33,
        }}
        label={(key) => key}
        icon={() => "<svg></svg>"}
      />,
    );
    expect(html).toContain('data-action="finance-range"');
    expect(html).toContain('id="finance-month"');
    expect(html).toContain('data-value="account"');
    expect(html).toContain('data-type="transaction"');
    expect(html).toContain('data-type="budget"');
    expect(html).toContain("Food");
    expect(html).toContain("+100%");
    expect(html).toContain("Rent");
    expect(html).toContain('name="repeat"');
    expect(html).toContain("expenseForecast");
    expect(html).toContain("overBudget: 10 TJS");
  });
});
