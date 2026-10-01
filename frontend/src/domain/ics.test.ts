import { describe, expect, it } from "vitest";
import type { Workspace } from "../types";
import { workspaceToIcs } from "./ics";

const workspace = {
  settings: { name: "Me", timezone: "Asia/Dushanbe" },
  events: [
    {
      id: "e1",
      title: "Sync; weekly, team",
      date: "2026-10-05",
      time: "09:00",
      endTime: "09:30",
      repeat: "weekly",
      repeatUntil: "2026-12-28",
      reminder: 15,
      location: "Room 1",
    },
  ],
  tasks: [
    { id: "t1", title: "Pay rent", status: "todo", date: "2026-10-10" },
    { id: "t2", title: "Done", status: "completed", date: "2026-10-01" },
    { id: "t3", title: "No date", status: "todo" },
  ],
} as unknown as Workspace;

describe("workspaceToIcs", () => {
  const ics = workspaceToIcs(workspace, new Date("2026-10-01T08:00:00Z"));

  it("exports events with timezone, recurrence and reminder", () => {
    expect(ics).toContain("DTSTART;TZID=Asia/Dushanbe:20261005T090000");
    expect(ics).toContain("DTEND;TZID=Asia/Dushanbe:20261005T093000");
    expect(ics).toContain("RRULE:FREQ=WEEKLY;UNTIL=20261228T235959Z");
    expect(ics).toContain("SUMMARY:Sync\\; weekly\\, team");
    expect(ics).toContain("TRIGGER:-PT15M");
    expect(ics).toContain("DTSTAMP:20261001T080000Z");
  });

  it("exports only open dated tasks", () => {
    expect(ics).toContain("DUE;VALUE=DATE:20261010");
    expect(ics).not.toContain("Done");
    expect(ics).not.toContain("No date");
  });

  it("uses CRLF line endings and folds long lines", () => {
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
    const long = workspaceToIcs({ ...workspace, events: [{ ...workspace.events[0], description: "x".repeat(200) }] } as Workspace);
    expect(long.split("\r\n").every((line) => line.length <= 75)).toBe(true);
  });
});
