import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { emptyWorkspace } from "../workspace";
import { LegacySettingsPanel } from "./LegacySettingsPanel";

describe("LegacySettingsPanel", () => {
  it("preserves delegated actions while moving settings to React", () => {
    const html = renderToStaticMarkup(
      <LegacySettingsPanel
        settings={emptyWorkspace().settings}
        label={(key) => key}
        installMessage="install"
        installAvailable
        legacyImportAvailable
        notificationsGranted={false}
      />,
    );

    expect(html).toContain('id="settings-form"');
    expect(html).toContain('data-action="save-settings"');
    expect(html).toContain('data-action="workspace-history"');
    expect(html).toContain('data-action="install-app"');
    expect(html).toContain('data-action="migrate"');
  });
});
