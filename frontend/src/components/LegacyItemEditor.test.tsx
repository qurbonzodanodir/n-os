import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LegacyItemEditor } from "./LegacyItemEditor";

describe("LegacyItemEditor", () => {
  it("renders fields, checks, relations and editor actions", () => {
    const html = renderToStaticMarkup(
      <LegacyItemEditor
        fields={[
          { name: "title", value: "Ship", type: "text", label: "Title", required: true },
          { name: "status", value: "todo", type: "select", label: "Status", options: [{ value: "todo", label: "Todo" }] },
        ]}
        checks={[{ key: "weekdays", label: "Weekdays", full: true, items: [{ name: "weekday", value: 1, label: "Mon", checked: true }] }]}
        related={[{ key: "tasks", label: "Tasks", action: "project-tasks", value: "p1" }]}
        canDelete
        canPreview
        label={(key) => key}
      />,
    );
    expect(html).toContain('id="item-form"');
    expect(html).toContain('name="title"');
    expect(html).toContain('name="weekday"');
    expect(html).toContain('data-action="project-tasks"');
    expect(html).toContain('class="btn danger"');
    expect(html).not.toContain('data-action="delete"');
    expect(html).toContain("preview");
    expect(html).not.toContain('data-action="note-preview"');
  });
});
