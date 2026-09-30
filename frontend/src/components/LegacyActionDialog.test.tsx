import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LegacyActionDialog } from "./LegacyActionDialog";

describe("LegacyActionDialog", () => {
  it("renders confirmation actions and notes", () => {
    const html = renderToStaticMarkup(
      <LegacyActionDialog
        message="Import?"
        note="Migration"
        actions={[
          { key: "cancel", label: "Cancel", action: "close" },
          { key: "import", label: "Import", action: "confirm-import", primary: true },
        ]}
      />,
    );
    expect(html).toContain("Import?");
    expect(html).toContain("Migration");
    expect(html).toContain('data-action="confirm-import"');
    expect(html).toContain('class="btn primary"');
  });
});
