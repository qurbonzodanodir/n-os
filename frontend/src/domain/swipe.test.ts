import { describe, expect, it } from "vitest";
import { postponeDate, swipeIntent } from "./swipe";

describe("swipe gestures", () => {
  it("recognises long horizontal swipes", () => {
    expect(swipeIntent(100, 10)).toBe("complete");
    expect(swipeIntent(-100, -20)).toBe("postpone");
  });

  it("ignores short swipes and mostly vertical movement", () => {
    expect(swipeIntent(40, 0)).toBeNull();
    expect(swipeIntent(90, 80)).toBeNull();
    expect(swipeIntent(0, 200)).toBeNull();
  });

  it("postpones to tomorrow for overdue or undated tasks and by a day for future ones", () => {
    expect(postponeDate("2026-09-01", "2026-09-30")).toBe("2026-10-01");
    expect(postponeDate(undefined, "2026-09-30")).toBe("2026-10-01");
    expect(postponeDate("2026-09-30", "2026-09-30")).toBe("2026-10-01");
    expect(postponeDate("2026-10-05", "2026-09-30")).toBe("2026-10-06");
  });
});
