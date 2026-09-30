import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LegacyDetailPanel } from "./LegacyDetailPanel";

const label = (key: string) => key;
const icon = (key: string) => `<svg data-icon="${key}"></svg>`;

describe("LegacyDetailPanel", () => {
  it("renders structured entity details and relations", () => {
    const html = renderToStaticMarkup(<LegacyDetailPanel type="task" id="t1" label={label} icon={icon} model={{ kind: "generic", stats: [{ label: "Status", value: "Todo" }], description: "Ship it", checklistTitle: "Subtasks", checklist: [{ title: "Test", done: true }], relatedTitle: "Linked", related: [{ type: "project", id: "p1", title: "Launch", iconName: "projects" }] }} />);
    expect(html).toContain("Ship it");
    expect(html).toContain('data-action="detail"');
    expect(html).toContain('data-value="task:t1"');
  });

  it("renders interactive habit history", () => {
    const html = renderToStaticMarkup(<LegacyDetailPanel type="habit" id="h1" label={label} icon={icon} model={{ kind: "habit", period: "month", periodLabel: "September", stats: [{ label: "Rate", value: "50%" }], cells: [{ date: "2026-09-01", checked: true, due: true, future: false, title: "Done" }], weekdays: [{ label: "Mon", percent: 50 }] }} />);
    expect(html).toContain('data-action="habit-detail-check"');
    expect(html).toContain('data-action="detail-period"');
    expect(html).toContain("50%");
  });
});
