import { describe, expect, it } from "vitest";
import { habitIsDue, habitStreak } from "./habits";

const habit = { id: "h", title: "Чтение", startDate: "2026-09-21", weekdays: [1, 3, 5], completions: ["2026-09-21", "2026-09-23", "2026-09-25", "2026-09-28"] };

describe("habits", () => {
  it("respects selected weekdays", () => {
    expect(habitIsDue(habit, "2026-09-28")).toBe(true);
    expect(habitIsDue(habit, "2026-09-29")).toBe(false);
  });
  it("derives current and best streaks", () => {
    expect(habitStreak(habit, "2026-09-28")).toEqual({ current: 4, best: 4 });
  });
});
