import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LegacyShellPanel } from "./LegacyShellPanel";

describe("LegacyShellPanel", () => {
  it("keeps desktop, mobile and recovery actions available", () => {
    const html = renderToStaticMarkup(
      <LegacyShellPanel
        view="tasks"
        nav={["today", "tasks", "settings"]}
        settings={{ name: "Nodir", language: "ru", theme: "dark" }}
        taskCount={4}
        online={false}
        syncLabel="offline"
        syncError="conflict"
        conflict
        contentHtml={'<div id="react-tasks-view"></div>'}
        label={(key) => key}
        icon={() => "<svg></svg>"}
      />,
    );
    expect(html).toContain('data-action="view"');
    expect(html).toContain('data-action="search"');
    expect(html).toContain('data-action="quick"');
    expect(html).toContain('data-action="more"');
    expect(html).toContain('data-action="reload"');
    expect(html).toContain('id="react-tasks-view"');
    expect(html).toContain("offline");
  });
});
