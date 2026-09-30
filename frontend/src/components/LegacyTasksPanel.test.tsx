import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LegacyTasksPanel } from "./LegacyTasksPanel";

describe("LegacyTasksPanel", () => {
  it("keeps task filters, details and completion actions available", () => {
    const html = renderToStaticMarkup(<LegacyTasksPanel tasks={[{ id: "task-1", title: "Ship", date: "2026-09-30", status: "todo", priority: "high", subtasks: [{ title: "Test", done: true }] }]} projects={[{ id: "project-1", title: "n-os" }]} mode="list" filter="today" projectFilter="project-1" today="2026-09-30" label={(key) => key} formatDate={(value) => value || "—"} />);
    expect(html).toContain('data-action="task-mode"');
    expect(html).toContain('id="task-filter"');
    expect(html).toContain('id="project-filter"');
    expect(html).toContain('data-action="detail"');
    expect(html).toContain('data-action="task-check"');
    expect(html).toContain('data-value="2026-09-30"');
  });

  it("renders every board status", () => {
    const html = renderToStaticMarkup(<LegacyTasksPanel tasks={[]} projects={[]} mode="board" filter="all" projectFilter="" today="2026-09-30" label={(key) => key} formatDate={() => "—"} />);
    for (const status of ["todo", "progress", "completed", "cancelled"]) expect(html).toContain(status);
  });
});
