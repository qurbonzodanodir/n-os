import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LegacyReviewPanel } from "./LegacyReviewPanel";

describe("LegacyReviewPanel", () => {
  it("renders period controls, chart and reflection form", () => {
    const html = renderToStaticMarkup(<LegacyReviewPanel period="month" start="2026-09-01" end="2026-09-30" rangeLabel="September" completed={8} consistency={75} notes={3} buckets={[{ label: "1–7", count: 2 }, { label: "8–14", count: 6 }]} reflection={{ wins: "Done" }} label={(key) => key} />);
    expect(html).toContain('data-action="review-period"');
    expect(html).toContain('data-action="save-reflection"');
    expect(html).toContain('data-week="2026-09-01"');
    expect(html).toContain("75%");
  });
});
