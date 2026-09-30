import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LegacyWorkspaceHistoryDialog, LegacyWorkspaceRevisionDialog } from "./LegacyWorkspaceHistoryDialog";

describe("Legacy workspace history dialogs", () => {
  it("renders revision preview actions", () => {
    const html = renderToStaticMarkup(
      <LegacyWorkspaceHistoryDialog rows={[{ revision: 7, createdAt: "today" }]} label={(key) => key} icon={() => "<svg></svg>"} />,
    );
    expect(html).toContain('data-action="revision-preview"');
    expect(html).toContain('data-value="7"');
  });

  it("renders restore confirmation and record totals", () => {
    const html = renderToStaticMarkup(
      <LegacyWorkspaceRevisionDialog revision={7} records={10} tasks={4} notes={3} habits={2} label={(key) => key} />,
    );
    expect(html).toContain('data-action="workspace-history"');
    expect(html).toContain('data-action="restore-revision"');
    expect(html).toContain("10");
  });
});
