import type { Event } from "../types";

export function shiftDate(date: string, amount: number): string {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + amount);
  return value.toISOString().slice(0, 10);
}

export function eventOccurs(event: Event, date: string): boolean {
  if (date < event.date || (event.repeatUntil && date > event.repeatUntil)) return false;
  if (date === event.date) return true;
  if (!event.repeat || event.repeat === "none") return false;
  if (event.repeat === "daily") return true;
  if (event.repeat === "weekly") {
    return Math.round((new Date(date).getTime() - new Date(event.date).getTime()) / 86_400_000) % 7 === 0;
  }
  const value = new Date(`${date}T12:00:00Z`);
  const lastDay = new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth() + 1, 0)).getUTCDate();
  return value.getUTCDate() === Math.min(Number(event.date.slice(8)), lastDay);
}

export function weekDates(date: string, weekStart = 1): string[] {
  const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
  const offset = (weekday - weekStart + 7) % 7;
  return Array.from({ length: 7 }, (_, index) => shiftDate(date, index - offset));
}
