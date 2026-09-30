import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LegacyInstallPrompt, LegacyToast } from "./LegacyUtilityPanels";

describe("Legacy utility panels", () => {
  it("keeps PWA install and dismiss actions", () => {
    const html = renderToStaticMarkup(<LegacyInstallPrompt message="Install it" canInstall label={(key) => key} icon={() => "<svg></svg>"} />);
    expect(html).toContain('data-action="install-app"');
    expect(html).toContain('data-action="dismiss-install"');
    expect(html).toContain("Install it");
  });

  it("renders recoverable toast actions", () => {
    const html = renderToStaticMarkup(<LegacyToast message="Deleted" withUndo label={(key) => key} />);
    expect(html).toContain("Deleted");
    expect(html).toContain('data-action="undo"');
  });
});
