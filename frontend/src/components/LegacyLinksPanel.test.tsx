import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { emptyWorkspace } from "../workspace";
import { LegacyLinksPanel } from "./LegacyLinksPanel";

describe("LegacyLinksPanel", () => {
  it("renders linked project progress and delegated navigation", () => {
    const workspace = emptyWorkspace();
    workspace.projects.push({ id: "p", title: "Project" });
    workspace.tasks.push({ id: "t", title: "Task", status: "completed", projectId: "p" });
    const html = renderToStaticMarkup(<LegacyLinksPanel type="project" records={workspace.projects} projects={workspace.projects} tasks={workspace.tasks} workspace={workspace} label={(key) => key} formatDate={() => "today"} />);
    expect(html).toContain("100%");
    expect(html).toContain('data-action="detail"');
    expect(html).toContain('data-action="project-tasks"');
  });
});
