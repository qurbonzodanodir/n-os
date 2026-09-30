import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LegacyTodayPanel } from "./LegacyTodayPanel";

const props = {
  date: "2026-09-30",
  currentDate: "2026-09-30",
  isToday: true,
  isFuture: false,
  greeting: "Hello",
  weekday: "Wednesday",
  fullDate: "30 September 2026",
  momentumDate: "Wednesday, 30 September",
  showDemo: false,
  overdueCount: 2,
  commandItems: [{ type: "task" as const, id: "task-1", title: "Ship", subtitle: "priority: high" }],
  tasks: [{ id: "task-1", title: "Ship", status: "todo" as const, date: "2026-09-30", priority: "high" as const }],
  completedTasks: 0,
  habits: [{ id: "habit-1", title: "Read", completions: [], streak: 2, checked: false }],
  checkedHabits: 0,
  events: [{ id: "event-1", title: "Meet", date: "2026-09-30", time: "10:00", endTime: "11:00" }],
  notes: [{ id: "note-1", title: "Idea", body: "Text" }],
  goals: [{ id: "goal-1", title: "Launch", progress: 50 }],
  weekDays: [{ date: "2026-09-30", weekday: "Wed", day: 30 }],
  rate: 10,
  label: (key: string) => key,
  formatDate: (value?: string) => value || "—",
  icon: () => "<svg></svg>",
};

describe("LegacyTodayPanel", () => {
  it("keeps dashboard navigation and quick actions available", () => {
    const html = renderToStaticMarkup(<LegacyTodayPanel {...props} />);
    expect(html).toContain('data-action="dashboard-prev"');
    expect(html).toContain('data-action="dashboard-date"');
    expect(html).toContain('data-action="task-filter-view"');
    expect(html).toContain('data-action="task-check"');
    expect(html).toContain('data-action="habit-check"');
    expect(html).toContain('data-type="goal"');
  });
});
