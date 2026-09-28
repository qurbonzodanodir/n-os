import type { Task, Workspace } from "../types";

function shiftDays(date: string, amount: number): string {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + amount);
  return value.toISOString().slice(0, 10);
}

export function nextTaskDate(date: string, repeat: Task["repeat"]): string | null {
  if (repeat === "daily") return shiftDays(date, 1);
  if (repeat === "weekly") return shiftDays(date, 7);
  if (repeat !== "monthly") return null;

  const value = new Date(`${date}T12:00:00Z`);
  const targetDay = value.getUTCDate();
  value.setUTCDate(1);
  value.setUTCMonth(value.getUTCMonth() + 1);
  const lastDay = new Date(
    Date.UTC(value.getUTCFullYear(), value.getUTCMonth() + 1, 0),
  ).getUTCDate();
  value.setUTCDate(Math.min(targetDay, lastDay));
  return value.toISOString().slice(0, 10);
}

export function toggleTask(workspace: Workspace, taskId: string, today: string): Workspace {
  const next = structuredClone(workspace);
  const task = next.tasks.find((candidate) => candidate.id === taskId);
  if (!task) return workspace;

  task.status = task.status === "completed" ? "todo" : "completed";
  task.completedAt = task.status === "completed" ? today : null;
  task.updatedAt = today;

  const nextDate = task.date ? nextTaskDate(task.date, task.repeat) : null;
  const alreadyCreated = next.tasks.some((candidate) => candidate.sourceId === task.id);
  if (task.status === "completed" && nextDate && !alreadyCreated) {
    next.tasks.push({
      ...structuredClone(task),
      id: crypto.randomUUID(),
      sourceId: task.id,
      date: nextDate,
      status: "todo",
      completedAt: null,
      createdAt: today,
      updatedAt: today,
      subtasks: task.subtasks?.map((subtask) => ({ ...subtask, done: false })),
    });
  }
  return next;
}
