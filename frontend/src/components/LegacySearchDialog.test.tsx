import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LegacySearchDialog } from "./LegacySearchDialog";

describe("LegacySearchDialog", () => {
  it("renders searchable records with delegated detail actions", () => {
    const html = renderToStaticMarkup(<LegacySearchDialog rows={[{ id: "task-1", type: "task", title: "Ship n-os", searchable: "ship n-os", iconName: "tasks" }]} label={(key) => key} icon={() => "<svg></svg>"} />);
    expect(html).toContain('id="global-search"');
    expect(html).toContain('data-action="detail"');
    expect(html).toContain('data-type="task"');
    expect(html).toContain("Ship n-os");
  });
});
