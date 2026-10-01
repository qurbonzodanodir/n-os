import { describe, expect, it } from "vitest";
import type { Workspace } from "../types";
import { rescheduleItem } from "./reschedule";

const workspace = {
  tasks: [{ id: "t", title: "T", status: "todo", date: "2026-10-05" }],
  events: [
    { id: "once", title: "Once", date: "2026-10-05", time: "09:00", endTime: "10:00" },
    { id: "weekly", title: "Weekly", date: "2026-10-05", time: "09:00", endTime: "10:00", repeat: "weekly", repeatUntil: "2026-12-28" },
  ],
} as unknown as Workspace;

describe("rescheduleItem", () => {
  it("gives a dropped task the target date", () => {
    const next = rescheduleItem(workspace, { type: "task", id: "t" }, "2026-10-05", "2026-10-09", "2026-10-01");
    expect(next.tasks[0]).toMatchObject({ date: "2026-10-09", updatedAt: "2026-10-01" });
    expect(workspace.tasks[0].date).toBe("2026-10-05");
  });

  it("moves a one-off event", () => {
    expect(rescheduleItem(workspace, { type: "event", id: "once" }, "2026-10-05", "2026-10-03", "2026-10-01").events[0].date).toBe(
      "2026-10-03",
    );
  });

  it("shifts a repeating series by the dragged distance, including its end", () => {
    // Dragging the 12 Oct occurrence to 14 Oct shifts the series by two days.
    const next = rescheduleItem(workspace, { type: "event", id: "weekly" }, "2026-10-12", "2026-10-14", "2026-10-01");
    expect(next.events[1]).toMatchObject({ date: "2026-10-07", repeatUntil: "2026-12-30" });
  });

  it("returns the same workspace when dropped on the same day", () => {
    expect(rescheduleItem(workspace, { type: "task", id: "t" }, "2026-10-05", "2026-10-05", "2026-10-01")).toBe(workspace);
  });
});
