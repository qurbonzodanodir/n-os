import { shiftDate } from "./calendar";
import type { Habit } from "../types";

export function habitIsDue(habit: Habit, date: string): boolean {
  const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
  return date >= (habit.startDate || "0000-00-00")
    && (!habit.endDate || date <= habit.endDate)
    && (!habit.weekdays?.length || habit.weekdays.includes(weekday));
}

export function habitStreak(habit: Habit, date: string): { current: number; best: number } {
  const completed = new Set(habit.completions);
  const first = habit.startDate || [...completed].sort()[0] || date;
  let run = 0; let best = 0;
  for (let current = first; current <= date; current = shiftDate(current, 1)) {
    if (!habitIsDue(habit, current)) continue;
    if (completed.has(current)) { run += 1; best = Math.max(best, run); }
    else if (current !== date) run = 0;
  }
  return { current: run, best };
}
