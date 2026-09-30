import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LegacyTasksPanel } from "./LegacyTasksPanel";

describe("LegacyTasksPanel", () => {
  it("keeps task filters, details and completion actions available", () => {
    const html = renderToStaticMarkup(
      <LegacyTasksPanel
        tasks={[
          { id: "task-1", title: "Ship", date: "2026-09-30", status: "todo", priority: "high", subtasks: [{ title: "Test", done: true }] },
        ]}
        projects={[{ id: "project-1", title: "n-os" }]}
        mode="list"
        filter="today"
        projectFilter="project-1"
        priorityFilter="all"
        sort="date"
        savedViews={[
          { id: "v1", name: "Focus", filter: "today", projectFilter: "", priorityFilter: "high", sort: "priority", mode: "list" },
        ]}
        activeSavedView="v1"
        today="2026-09-30"
        label={(key) => key}
        formatDate={(value) => value || "—"}
        onMove={() => {}}
        onQuickSave={() => {}}
        onSaveView={() => {}}
        onDeleteView={() => {}}
      />,
    );
    expect(html).toContain('data-action="task-mode"');
    expect(html).toContain('id="task-filter"');
    expect(html).toContain('id="project-filter"');
    expect(html).toContain('data-action="detail"');
    expect(html).toContain('data-action="task-check"');
    expect(html).toContain('data-value="2026-09-30"');
    expect(html).toContain('draggable="true"');
    expect(html).toContain("quickEdit Ship");
    expect(html).toContain('id="task-priority-filter"');
    expect(html).toContain('id="task-sort"');
    expect(html).toContain('id="task-saved-view"');
    expect(html).toContain("Focus");
    expect(html).toContain("deleteView");
  });

  it("renders every board status", () => {
    const html = renderToStaticMarkup(
      <LegacyTasksPanel
        tasks={[]}
        projects={[]}
        mode="board"
        filter="all"
        projectFilter=""
        priorityFilter="all"
        sort="date"
        savedViews={[
          { id: "v1", name: "Focus", filter: "today", projectFilter: "", priorityFilter: "high", sort: "priority", mode: "list" },
        ]}
        activeSavedView="v1"
        today="2026-09-30"
        label={(key) => key}
        formatDate={() => "—"}
        onMove={() => {}}
        onQuickSave={() => {}}
        onSaveView={() => {}}
        onDeleteView={() => {}}
      />,
    );
    for (const status of ["todo", "progress", "completed", "cancelled"]) expect(html).toContain(status);
  });
});
