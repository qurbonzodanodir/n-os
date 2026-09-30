import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LegacySearchDialog } from "./LegacySearchDialog";

describe("LegacySearchDialog", () => {
  it("renders searchable records with delegated detail actions", () => {
    const html = renderToStaticMarkup(
      <LegacySearchDialog
        rows={[{ id: "task-1", type: "task", title: "Ship n-os", searchable: "ship n-os", iconName: "tasks" }]}
        commands={[{ key: "add-task", title: "Create task", searchable: "create task", iconName: "tasks", action: "add", value: "task" }]}
        label={(key) => key}
        icon={() => "<svg></svg>"}
      />,
    );
    expect(html).toContain('id="global-search"');
    expect(html).toContain('data-action="detail"');
    expect(html).toContain('data-type="task"');
    expect(html).toContain("Ship n-os");
    expect(html).toContain('data-action="add"');
    expect(html).toContain("Create task");
  });
});
