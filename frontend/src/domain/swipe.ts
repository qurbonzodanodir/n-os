import { addDays } from "./analytics";

export type SwipeIntent = "complete" | "postpone" | null;

export const SWIPE_THRESHOLD = 72;

/** A swipe counts only when it is mostly horizontal, so vertical scrolling never completes a task. */
export function swipeIntent(dx: number, dy: number, threshold = SWIPE_THRESHOLD): SwipeIntent {
  if (Math.abs(dx) < threshold || Math.abs(dx) < Math.abs(dy) * 1.5) return null;
  return dx > 0 ? "complete" : "postpone";
}

/** Postponing moves a task one day later, but never leaves it in the past. */
export function postponeDate(date: string | undefined, today: string): string {
  return addDays(date && date > today ? date : today, 1);
}
