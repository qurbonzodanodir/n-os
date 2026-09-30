import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LegacyReviewPanel } from "./LegacyReviewPanel";

describe("LegacyReviewPanel", () => {
  it("renders period controls, chart and reflection form", () => {
    const html = renderToStaticMarkup(<LegacyReviewPanel period="month" start="2026-09-01" end="2026-09-30" rangeLabel="September" completed={8} consistency={75} notes={3} buckets={[{ label: "1–7", count: 2 }, { label: "8–14", count: 6 }]} reflection={{ wins: "Done" }} comparison={[{ key: "completed", current: "8", previous: "5", percent: "+60%", tone: "good", trend: "up" }]} previousLabel="August" goals={[{ id: "g1", title: "Launch", percent: 40, done: 2, total: 5, overdue: 1 }]} projects={[]} report={{ text: "Weekly", range: "1–7", auto: true }} label={(key) => key} />);
    expect(html).toContain('data-action="review-period"');
    expect(html).toContain('data-action="save-reflection"');
    expect(html).toContain('data-week="2026-09-01"');
    expect(html).toContain("75%");
    expect(html).toContain("+60%");
    expect(html).toContain("Launch");
    expect(html).toContain('data-action="report-copy"');
    expect(html).toContain('data-action="report-download"');
  });
});
