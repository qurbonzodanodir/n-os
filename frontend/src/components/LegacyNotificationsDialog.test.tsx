import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LegacyNotificationsDialog } from "./LegacyNotificationsDialog";

describe("LegacyNotificationsDialog", () => {
  it("keeps reminder detail and completion actions", () => {
    const html = renderToStaticMarkup(
      <LegacyNotificationsDialog
        date="2026-09-30"
        tasks={[{ id: "task-1", title: "Overdue", date: "2026-09-29", status: "todo" }]}
        events={[{ id: "event-1", title: "Meeting", date: "2026-09-30", time: "10:00", endTime: "11:00" }]}
        label={(key) => key}
        formatDate={(value) => value || "—"}
        icon={() => "<svg></svg>"}
      />,
    );
    expect(html).toContain('data-action="task-check"');
    expect(html).toContain('data-type="task"');
    expect(html).toContain('data-type="event"');
    expect(html).toContain('class="overdue"');
  });
});
