import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LegacyHabitsPanel } from "./LegacyHabitsPanel";

describe("LegacyHabitsPanel", () => {
  it("keeps detail and daily check-in actions available", () => {
    const html = renderToStaticMarkup(
      <LegacyHabitsPanel
        habits={[
          {
            id: "habit-1",
            title: "Read",
            goal: "20 min",
            currentStreak: 3,
            completedCount: 8,
            days: [
              { date: "2026-09-30", label: "Wed", due: true, completed: true },
              { date: "2026-10-01", label: "Thu", due: false, completed: false },
            ],
          },
        ]}
        label={(key) => key}
      />,
    );
    expect(html).toContain('data-action="detail"');
    expect(html).toContain('data-type="habit"');
    expect(html).toContain('data-action="habit-check"');
    expect(html).toContain('data-value="2026-09-30"');
    expect(html).toContain("disabled");
    expect(html).toContain("streak: 3 days");
  });
});
