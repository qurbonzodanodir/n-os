import { describe, expect, it } from "vitest";
import type { Workspace } from "../types";
import { deleteTasks, updateTasks } from "./bulk";

const workspace = {
  tasks: [
    { id: "a", title: "A", status: "todo", priority: "low", projectId: "p1" },
    { id: "b", title: "B", status: "completed", completedAt: "2026-09-01" },
    { id: "c", title: "C", status: "todo" },
  ],
  events: [
    { id: "e1", title: "E", date: "2026-10-01", time: "09:00", endTime: "10:00", taskId: "a" },
    { id: "e2", title: "F", date: "2026-10-01", time: "09:00", endTime: "10:00", taskId: "c" },
  ],
} as unknown as Workspace;

describe("bulk task operations", () => {
  it("applies changes only to selected tasks and never mutates the input", () => {
    const next = updateTasks(workspace, ["a", "b"], { priority: "urgent", date: "2026-10-05" }, "2026-09-30");
    expect(next.tasks[0]).toMatchObject({ priority: "urgent", date: "2026-10-05", updatedAt: "2026-09-30" });
    expect(next.tasks[1]).toMatchObject({ priority: "urgent", date: "2026-10-05" });
    expect(next.tasks[2]).toBe(workspace.tasks[2]);
    expect(workspace.tasks[0].priority).toBe("low");
  });

  it("keeps the original completion date and clears it when reopened", () => {
    const done = updateTasks(workspace, ["a", "b"], { status: "completed" }, "2026-09-30");
    expect(done.tasks[0].completedAt).toBe("2026-09-30");
    expect(done.tasks[1].completedAt).toBe("2026-09-01");
    const reopened = updateTasks(done, ["b"], { status: "todo" }, "2026-09-30");
    expect(reopened.tasks[1].completedAt).toBeNull();
  });

  it("moves tasks to a project or detaches them with an empty id", () => {
    expect(updateTasks(workspace, ["c"], { projectId: "p2" }, "2026-09-30").tasks[2].projectId).toBe("p2");
    expect("projectId" in updateTasks(workspace, ["a"], { projectId: "" }, "2026-09-30").tasks[0]).toBe(false);
  });

  it("deletes tasks and unlinks events that referenced them", () => {
    const next = deleteTasks(workspace, ["a", "b"]);
    expect(next.tasks.map((task) => task.id)).toEqual(["c"]);
    expect(next.events[0].taskId).toBe("");
    expect(next.events[1].taskId).toBe("c");
  });
});
