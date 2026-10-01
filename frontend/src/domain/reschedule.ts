import type { Workspace } from "../types";
import { shiftDate } from "./calendar";

export interface DragItem {
  type: "event" | "task";
  id: string;
}

const daysBetween = (from: string, to: string) =>
  Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / 86_400_000);

/**
 * Moves an item dropped on another day. A task simply gets the new due date.
 * Editing a repeating event edits the series, so dragging one occurrence shifts
 * the whole series (start and end of repetition) by the same number of days.
 */
export function rescheduleItem(workspace: Workspace, item: DragItem, from: string, to: string, today: string): Workspace {
  const delta = daysBetween(from, to);
  if (!delta) return workspace;
  if (item.type === "task") {
    return { ...workspace, tasks: workspace.tasks.map((task) => (task.id === item.id ? { ...task, date: to, updatedAt: today } : task)) };
  }
  return {
    ...workspace,
    events: workspace.events.map((event) => {
      if (event.id !== item.id) return event;
      const next = { ...event, date: shiftDate(event.date, delta), updatedAt: today };
      if (event.repeatUntil) next.repeatUntil = shiftDate(event.repeatUntil, delta);
      return next;
    }),
  };
}
