import type { Workspace } from "../types";

const escapeText = (value: string) => value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

/** Folds lines longer than 75 characters as RFC 5545 requires. */
function fold(line: string): string {
  const parts: string[] = [];
  let rest = line;
  while (rest.length > 74) {
    parts.push(rest.slice(0, 74));
    rest = ` ${rest.slice(74)}`;
  }
  parts.push(rest);
  return parts.join("\r\n");
}

const compactDate = (date: string) => date.replace(/-/g, "");
const compactDateTime = (date: string, time: string) => `${compactDate(date)}T${time.replace(":", "")}00`;
const rule: Record<string, string> = { daily: "DAILY", weekly: "WEEKLY", monthly: "MONTHLY" };

/** Exports events (with repeat rules) and open dated tasks as an iCalendar file. */
export function workspaceToIcs(workspace: Workspace, stamp: Date = new Date()): string {
  const zone = workspace.settings.timezone;
  const dtstamp = stamp
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//n-os//EN",
    "CALSCALE:GREGORIAN",
    `X-WR-CALNAME:${escapeText(workspace.settings.name || "n-os")}`,
  ];
  for (const event of workspace.events) {
    lines.push("BEGIN:VEVENT", `UID:event-${event.id}@n-os`, `DTSTAMP:${dtstamp}`);
    lines.push(
      `DTSTART;TZID=${zone}:${compactDateTime(event.date, event.time)}`,
      `DTEND;TZID=${zone}:${compactDateTime(event.date, event.endTime)}`,
    );
    lines.push(`SUMMARY:${escapeText(event.title)}`);
    if (event.description) lines.push(`DESCRIPTION:${escapeText(event.description)}`);
    if (event.location) lines.push(`LOCATION:${escapeText(event.location)}`);
    if (event.repeat && rule[event.repeat]) {
      lines.push(`RRULE:FREQ=${rule[event.repeat]}${event.repeatUntil ? `;UNTIL=${compactDate(event.repeatUntil)}T235959Z` : ""}`);
    }
    if (event.reminder)
      lines.push(
        "BEGIN:VALARM",
        "ACTION:DISPLAY",
        `DESCRIPTION:${escapeText(event.title)}`,
        `TRIGGER:-PT${Math.floor(event.reminder)}M`,
        "END:VALARM",
      );
    lines.push("END:VEVENT");
  }
  for (const task of workspace.tasks) {
    if (!task.date || task.status === "completed" || task.status === "cancelled") continue;
    lines.push(
      "BEGIN:VTODO",
      `UID:task-${task.id}@n-os`,
      `DTSTAMP:${dtstamp}`,
      `DUE;VALUE=DATE:${compactDate(task.date)}`,
      `SUMMARY:${escapeText(task.title)}`,
    );
    if (task.description) lines.push(`DESCRIPTION:${escapeText(task.description)}`);
    lines.push("STATUS:NEEDS-ACTION", "END:VTODO");
  }
  lines.push("END:VCALENDAR");
  return `${lines.map(fold).join("\r\n")}\r\n`;
}
