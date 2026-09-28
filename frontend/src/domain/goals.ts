import type { Goal, Workspace } from "../types";

export function goalProgress(workspace: Workspace, goal: Goal): number {
  const tasks = workspace.tasks.filter((task) => task.goalId === goal.id && task.status !== "cancelled");
  const milestones = goal.milestones || [];
  const total = tasks.length + milestones.length;
  if (!total) return 0;
  const completed = tasks.filter((task) => task.status === "completed").length
    + milestones.filter((milestone) => milestone.done).length;
  return Math.round(completed / total * 100);
}
