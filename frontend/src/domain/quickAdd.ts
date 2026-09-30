import type { TaskPriority } from "../types";
import { addDays } from "./analytics";

export interface ParsedTask {
  title: string;
  date?: string;
  time?: string;
  priority?: TaskPriority;
  projectId?: string;
  tags: string[];
}

interface Context {
  today: string;
  projects: Array<{ id: string; title: string }>;
}

const edge = (pattern: string) => new RegExp(`(?<![\\p{L}\\p{N}])(?:${pattern})(?![\\p{L}\\p{N}])`, "iu");

const priorities: Array<[TaskPriority, string]> = [
  ["urgent", "urgent|срочно|срочный|срочная"],
  ["high", "high|высокий|высокая|важно"],
  ["medium", "medium|средний|средняя"],
  ["low", "low|низкий|низкая"],
];

// JS weekday numbers (0 = Sunday) with English and Russian names and short forms.
const weekdays: Array<[number, string]> = [
  [1, "monday|mon|понедельник|пн"],
  [2, "tuesday|tue|tues|вторник|вт"],
  [3, "wednesday|wed|среда|среду|ср"],
  [4, "thursday|thu|thur|thurs|четверг|чт"],
  [5, "friday|fri|пятница|пятницу|пт"],
  [6, "saturday|sat|суббота|субботу|сб"],
  [0, "sunday|sun|воскресенье|вс"],
];

const pad = (value: number) => String(value).padStart(2, "0");
const validTime = (hours: number, minutes: number) => hours < 24 && minutes < 60;

/** Turns "call Ali tomorrow 18:00 #work !high" into structured fields; everything unrecognised stays in the title. */
export function parseQuickTask(input: string, context: Context): ParsedTask {
  let text = ` ${input} `;
  const result: ParsedTask = { title: "", tags: [] };
  const take = (pattern: RegExp) => {
    const match = text.match(pattern);
    if (match) text = text.replace(match[0], " ");
    return match;
  };

  for (const [priority, names] of priorities) {
    const match = take(edge(`!(?:${names})`));
    if (match && !result.priority) result.priority = priority;
  }

  for (const match of [...text.matchAll(/(?<![\p{L}\p{N}])#([\p{L}\p{N}_-]+)/gu)]) {
    const name = match[1].toLowerCase();
    const project =
      context.projects.find((item) => item.title.toLowerCase().replace(/\s+/g, "-") === name) ??
      context.projects.find((item) => item.title.toLowerCase().startsWith(name));
    if (project && !result.projectId) result.projectId = project.id;
    else result.tags.push(match[1]);
    text = text.replace(match[0], " ");
  }

  const time = take(/(?<![\p{L}\p{N}:.])(?:в\s+|at\s+)?(\d{1,2}):(\d{2})(?![\p{L}\p{N}])/iu);
  if (time && validTime(Number(time[1]), Number(time[2]))) result.time = `${pad(Number(time[1]))}:${time[2]}`;
  else if (time) text = `${text} ${time[0]} `;
  if (!result.time) {
    const meridiem = take(/(?<![\p{L}\p{N}])(?:at\s+)?(\d{1,2})\s?(am|pm)(?![\p{L}\p{N}])/iu);
    if (meridiem && Number(meridiem[1]) >= 1 && Number(meridiem[1]) <= 12) {
      result.time = `${pad((Number(meridiem[1]) % 12) + (meridiem[2].toLowerCase() === "pm" ? 12 : 0))}:00`;
    }
  }

  const iso = take(/(?<![\p{L}\p{N}-])(\d{4})-(\d{2})-(\d{2})(?![\p{L}\p{N}-])/u);
  const dotted = iso ? null : take(/(?<![\p{L}\p{N}.])(\d{1,2})\.(\d{1,2})(?:\.(\d{4}))?(?![\p{L}\p{N}.])/u);
  const relative = take(edge("(?:in|через)\\s+(\\d{1,3})\\s*(days?|d|дн(?:ей|я|ь)?|weeks?|w|нед(?:ели|ель|елю)?)"));
  const dayAfter = take(edge("day after tomorrow|послезавтра"));
  const tomorrow = dayAfter ? null : take(edge("tomorrow|завтра"));
  const todayWord = take(edge("today|сегодня"));

  if (iso) result.date = iso[0].trim();
  else if (dotted) {
    const year = dotted[3] ? Number(dotted[3]) : Number(context.today.slice(0, 4));
    let candidate = `${year}-${pad(Number(dotted[2]))}-${pad(Number(dotted[1]))}`;
    if (!dotted[3] && candidate < context.today) candidate = `${year + 1}-${candidate.slice(5)}`;
    if (!Number.isNaN(Date.parse(candidate)) && new Date(`${candidate}T12:00:00Z`).toISOString().slice(0, 10) === candidate)
      result.date = candidate;
    else text = `${text} ${dotted[0]} `;
  } else if (relative) {
    const amount = Number(relative[1]);
    result.date = addDays(context.today, /^(w|нед|week)/i.test(relative[2]) ? amount * 7 : amount);
  } else if (dayAfter) result.date = addDays(context.today, 2);
  else if (tomorrow) result.date = addDays(context.today, 1);
  else if (todayWord) result.date = context.today;
  else {
    for (const [weekday, names] of weekdays) {
      const match = take(edge(`(?:on\\s+|next\\s+|в\\s+|во\\s+)?(?:${names})`));
      if (!match) continue;
      const current = new Date(`${context.today}T12:00:00Z`).getUTCDay();
      result.date = addDays(context.today, ((weekday - current + 6) % 7) + 1);
      break;
    }
  }

  result.title = text.replace(/\s+/g, " ").trim();
  return result;
}
