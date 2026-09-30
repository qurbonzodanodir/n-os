import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LegacyNotesPanel } from "./LegacyNotesPanel";

describe("LegacyNotesPanel", () => {
  it("keeps filters, search and detail actions available", () => {
    const html = renderToStaticMarkup(
      <LegacyNotesPanel
        notes={[{ id: "n", title: "Idea", body: "Text", tags: "one,two", pinned: true }]}
        filter="active"
        query="Idea"
        label={(key) => key}
        formatDate={() => "today"}
      />,
    );
    expect(html).toContain('data-action="note-filter"');
    expect(html).toContain('id="note-query"');
    expect(html).toContain('data-action="detail"');
    expect(html).toContain("one");
  });
});
