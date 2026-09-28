import { describe, expect, it } from "vitest";

import { emptyWorkspace } from "../workspace";
import { nextTaskDate, toggleTask } from "./tasks";

describe("task recurrence", () => {
  it("clamps monthly recurrence to the final calendar day", () => {
    expect(nextTaskDate("2026-01-31", "monthly")).toBe("2026-02-28");
  });

  it("creates only one clean successor", () => {
    const workspace = emptyWorkspace();
    workspace.tasks.push({
      id: "task-1",
      title: "Повторить",
      date: "2026-09-28",
      status: "todo",
      priority: "medium",
      repeat: "daily",
      subtasks: [{ title: "Шаг", done: true }],
    });

    const completed = toggleTask(workspace, "task-1", "2026-09-28");
    const reopened = toggleTask(completed, "task-1", "2026-09-28");
    const completedAgain = toggleTask(reopened, "task-1", "2026-09-28");

    expect(completedAgain.tasks).toHaveLength(2);
    expect(completedAgain.tasks[1]).toMatchObject({
      sourceId: "task-1",
      date: "2026-09-29",
      status: "todo",
      completedAt: null,
      subtasks: [{ title: "Шаг", done: false }],
    });
  });
});
