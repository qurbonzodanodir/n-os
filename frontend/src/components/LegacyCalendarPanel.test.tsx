import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LegacyCalendarPanel } from "./LegacyCalendarPanel";

const agenda = { date: "2026-09-30", label: "Wed, Sep 30", events: [{ id: "event-1", title: "Meet", date: "2026-09-30", time: "10:00", endTime: "11:00" }], tasks: [{ id: "task-1", title: "Ship", date: "2026-09-30", status: "todo" as const }] };
const base = { mode: "month", monthLabel: "September 2026", weekdayLabels: ["Mon"], monthDays: [{ date: "2026-09-30", day: 30, selected: true, today: true, outside: false, eventTitles: ["Meet"], taskCount: 1 }], weekDays: [agenda], agendaDays: [agenda], selectedAgenda: agenda, label: (key: string) => key, formatDate: (value?: string) => value || "—" };

describe("LegacyCalendarPanel", () => {
  it("keeps calendar navigation, selection and agenda actions available", () => {
    const html = renderToStaticMarkup(<LegacyCalendarPanel {...base} />);
    expect(html).toContain('data-action="calendar-mode"');
    expect(html).toContain('data-action="calendar-prev"');
    expect(html).toContain('data-action="date"');
    expect(html).toContain('data-action="add-date"');
    expect(html).toContain('data-action="task-check"');
  });

  it("renders week detail links", () => {
    const html = renderToStaticMarkup(<LegacyCalendarPanel {...base} mode="week" />);
    expect(html).toContain('data-type="event"');
    expect(html).toContain('data-type="task"');
  });
});
