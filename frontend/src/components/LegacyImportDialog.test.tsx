import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LegacyImportDialog } from "./LegacyImportDialog";

describe("LegacyImportDialog", () => {
  it("offers an account choice and a CSV file picker", () => {
    const html = renderToStaticMarkup(
      <LegacyImportDialog
        accounts={[{ id: "cash", title: "Cash", currency: "TJS" }]}
        plan={() => ({ fresh: 0, duplicates: 0 })}
        onConfirm={() => {}}
        label={(key) => key}
        formatMoney={(value) => String(value)}
      />,
    );
    expect(html).toContain('id="import-account"');
    expect(html).toContain('type="file"');
    expect(html).toContain("Cash · TJS");
    expect(html).toContain("importHint");
  });
});
