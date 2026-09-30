import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LegacyPickerDialog } from "./LegacyPickerDialog";

describe("LegacyPickerDialog", () => {
  it("renders delegated picker actions", () => {
    const html = renderToStaticMarkup(
      <LegacyPickerDialog
        items={[
          { key: "task", label: "Task", action: "add", value: "task", iconName: "tasks" },
          { key: "search", label: "Search", action: "search", iconName: "search" },
        ]}
        icon={() => "<svg></svg>"}
      />,
    );
    expect(html).toContain('data-action="add"');
    expect(html).toContain('data-value="task"');
    expect(html).toContain('data-action="search"');
  });
});
