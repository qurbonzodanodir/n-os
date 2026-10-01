import type { TaskPriority, TaskStatus, Workspace } from "../types";

export interface BulkChanges {
  status?: TaskStatus;
  priority?: TaskPriority;
  date?: string;
  /** Empty string detaches the tasks from their project. */
  projectId?: string;
}

/** Returns a copy of the workspace with the changes applied to the selected tasks. */
export function updateTasks(workspace: Workspace, ids: string[], changes: BulkChanges, today: string): Workspace {
  const selected = new Set(ids);
  return {
    ...workspace,
    tasks: workspace.tasks.map((task) => {
      if (!selected.has(task.id)) return task;
      const next = { ...task, updatedAt: today };
      if (changes.status) {
        next.status = changes.status;
        next.completedAt = changes.status === "completed" ? task.completedAt || today : null;
      }
      if (changes.priority) next.priority = changes.priority;
      if (changes.date) next.date = changes.date;
      if (changes.projectId !== undefined) {
        if (changes.projectId) next.projectId = changes.projectId;
        else delete next.projectId;
      }
      return next;
    }),
  };
}

/** Removes the tasks and unlinks events that pointed at them, like deleting a single task does. */
export function deleteTasks(workspace: Workspace, ids: string[]): Workspace {
  const removed = new Set(ids);
  return {
    ...workspace,
    tasks: workspace.tasks.filter((task) => !removed.has(task.id)),
    events: workspace.events.map((event) => (event.taskId && removed.has(event.taskId) ? { ...event, taskId: "" } : event)),
  };
}
