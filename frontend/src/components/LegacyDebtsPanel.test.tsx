import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LegacyDebtsPanel } from "./LegacyDebtsPanel";

describe("LegacyDebtsPanel", () => {
  it("shows both debt directions, balances and payment history", () => {
    const html = renderToStaticMarkup(
      <LegacyDebtsPanel
        filter="all"
        today="2026-10-08"
        summaries={[{ currency: "TJS", receivable: "100 TJS", payable: "40 TJS", net: "+60 TJS", netTone: "income" }]}
        debts={[
          {
            id: "d1",
            title: "Aziz",
            direction: "owed_to_me",
            amount: "100 TJS",
            paid: "25 TJS",
            remaining: "75 TJS",
            remainingMinor: 7500,
            currency: "TJS",
            dueLabel: "10 Oct",
            overdue: false,
            settled: false,
            progress: 25,
            payments: [{ id: "p1", amount: "25 TJS", date: "8 Oct" }],
          },
        ]}
        onPayment={() => {}}
        onDeletePayment={() => {}}
        label={(key) => key}
      />,
    );
    expect(html).toContain("Aziz");
    expect(html).toContain("owed_to_me");
    expect(html).toContain("75 TJS");
    expect(html).toContain("paymentHistory");
    expect(html).toContain('data-value="debt:d1"');
  });
});
