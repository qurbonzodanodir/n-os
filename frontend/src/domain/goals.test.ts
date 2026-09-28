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
});
