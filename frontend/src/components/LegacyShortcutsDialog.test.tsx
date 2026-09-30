import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LegacyShortcutsDialog } from "./LegacyShortcutsDialog";

describe("LegacyShortcutsDialog", () => {
  it("lists every shortcut with its description", () => {
    const html = renderToStaticMarkup(<LegacyShortcutsDialog label={(key) => key} />);
    expect(html).toContain("shortcutNewTask");
    expect(html).toContain("shortcutGo");
    expect(html).toContain("<kbd>?</kbd>");
  });
});
