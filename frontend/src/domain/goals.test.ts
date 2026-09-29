import { describe, expect, it } from "vitest";
import { emptyWorkspace } from "../workspace";
import { goalProgress } from "./goals";

describe("goal progress", () => {
  it("combines linked tasks and milestones", () => {
    const workspace = emptyWorkspace();
    const goal = { id: "g", title: "Цель", milestones: [{ title: "Шаг", done: true }] };
    workspace.goals.push(goal);
    workspace.tasks.push({ id: "t", title: "Задача", status: "todo", goalId: "g" });
    expect(goalProgress(workspace, goal)).toBe(50);
  });

  it("includes tasks belonging to a linked project", () => {
    const workspace = emptyWorkspace();
    const goal = { id: "g", title: "Цель", milestones: [] };
    workspace.goals.push(goal);
    workspace.projects.push({ id: "p", title: "Проект", goalId: "g" });
    workspace.tasks.push({ id: "t1", title: "Готово", status: "completed", projectId: "p" });
    workspace.tasks.push({ id: "t2", title: "В процессе", status: "todo", projectId: "p" });
    expect(goalProgress(workspace, goal)).toBe(50);
  });
});
