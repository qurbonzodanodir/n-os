import { describe, expect, it } from "vitest";

import type { Event } from "../types";
import { eventOccurs, weekDates } from "./calendar";

const event: Event = { id: "event", title: "Встреча", date: "2026-01-31", time: "10:00", endTime: "11:00", repeat: "monthly" };

describe("calendar recurrence", () => {
  it("clamps a monthly event to the last day", () => {
    expect(eventOccurs(event, "2026-02-28")).toBe(true);
    expect(eventOccurs(event, "2026-02-27")).toBe(false);
  });

  it("returns a Monday-first week", () => {
    expect(weekDates("2026-09-30", 1)).toEqual([
      "2026-09-28",
      "2026-09-29",
      "2026-09-30",
      "2026-10-01",
      "2026-10-02",
      "2026-10-03",
      "2026-10-04",
    ]);
  });
});
