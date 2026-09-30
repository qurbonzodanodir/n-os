import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LegacyDialogPanel } from "./LegacyDialogPanel";

describe("LegacyDialogPanel", () => {
  it("renders a labelled close action and supplied dialog content", () => {
    const html = renderToStaticMarkup(<LegacyDialogPanel title="Edit task" bodyHtml={'<form id="item-form"><input name="title"></form>'} closeLabel="Close" icon={() => "<svg></svg>"} />);
    expect(html).toContain('id="dialog-title"');
    expect(html).toContain('data-action="close"');
    expect(html).toContain('id="item-form"');
    expect(html).toContain("Edit task");
  });
});
