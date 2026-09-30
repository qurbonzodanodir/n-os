import type { Event, Task } from "../types";

interface AgendaDay {
  date: string;
  label: string;
  events: Event[];
  tasks: Task[];
}

interface MonthDay {
  date: string;
  day: number;
  selected: boolean;
  today: boolean;
  outside: boolean;
  eventTitles: string[];
  taskCount: number;
}

interface Props {
  mode: string;
  monthLabel: string;
  weekdayLabels: string[];
  monthDays: MonthDay[];
  weekDays: AgendaDay[];
  agendaDays: AgendaDay[];
  selectedAgenda: AgendaDay;
  label: (key: string) => string;
  formatDate: (value?: string) => string;
}

export function LegacyCalendarPanel(props: Props) {
  const { mode, monthDays, weekdayLabels, weekDays, agendaDays, selectedAgenda, label: t } = props;
  const controls = <CalendarControls {...props} />;
  if (mode === "month") return <div className="split"><article className="card glass">{controls}<div className="cal-grid">
    {weekdayLabels.map((label, index) => <div className="weekday" key={`${label}-${index}`}>{label}</div>)}
    {monthDays.map((day) => <button type="button" data-action="date" data-value={day.date} className={`cal-day ${day.selected ? "selected" : ""} ${day.today ? "today" : ""} ${day.outside ? "out" : ""}`} key={day.date}><strong>{day.day}</strong>{day.eventTitles.map((title, index) => <small key={`${title}-${index}`}>{title}</small>)}{day.taskCount > 0 && <small>{t("tasks")}: {day.taskCount}</small>}</button>)}
  </div></article><aside className="card glass"><Agenda day={selectedAgenda} label={t} /></aside></div>;
  if (mode === "week") return <article className="card glass">{controls}<div className="week-columns">{weekDays.map((day) => <section className="week-column" key={day.date}><h3>{day.label}</h3>
    {day.events.map((event) => <button type="button" className="event-block" data-action="detail" data-type="event" data-id={event.id} key={event.id}><small>{event.time}</small><strong>{event.title}</strong></button>)}
    {day.tasks.map((task) => <button type="button" className="event-block" data-action="detail" data-type="task" data-id={task.id} key={task.id}><small>{t("task")}</small><strong>{task.title}</strong></button>)}
    <button type="button" className="btn icon-btn" data-action="add-date" data-value={day.date} aria-label={t("add")}>+</button>
  </section>)}</div></article>;
  return <article className="card glass">{controls}{agendaDays.map((day) => <Agenda day={day} label={t} key={day.date} />)}</article>;
}

function CalendarControls({ mode, monthLabel, label: t }: Props) {
  return <><div className="toolbar"><div className="segments">{["month", "week", "day", "agenda"].map((value) => <button type="button" className={mode === value ? "active" : ""} data-action="calendar-mode" data-value={value} key={value}><span>{t(value)}</span></button>)}</div><span className="spacer" /><button type="button" className="btn" data-action="calendar-today"><span>{t("today")}</span></button></div>
    <div className="cal-header"><h2>{monthLabel}</h2><div className="actions"><button type="button" className="btn icon-btn" data-action="calendar-prev" aria-label={t("back")}>←</button><button type="button" className="btn icon-btn" data-action="calendar-next" aria-label={t("next")}>→</button></div></div></>;
}

function Agenda({ day, label: t }: { day: AgendaDay; label: (key: string) => string }) {
  return <><div className="agenda-head"><h3>{day.label}</h3><button type="button" className="btn icon-btn" data-action="add-date" data-value={day.date} aria-label={t("add")}>+</button></div><div className="rows">
    {day.events.map((event) => <div className="row" key={event.id}><time className="event-time">{event.time}</time><i className="event-line" /><button type="button" className="row-body" data-action="detail" data-type="event" data-id={event.id}><strong>{event.title}</strong><small>{event.time}–{event.endTime}{event.location ? ` · ${event.location}` : ""}{event.repeat && event.repeat !== "none" ? ` · ${t(event.repeat)}` : ""}</small></button></div>)}
    {day.tasks.map((task) => <div className={`row ${task.status === "completed" ? "done" : ""}`} key={task.id}><button type="button" className={`check ${task.status === "completed" ? "done" : ""}`} data-action="task-check" data-id={task.id} data-value={day.date} aria-label={`${t("done")} ${task.title}`}>{task.status === "completed" ? "✓" : ""}</button><button type="button" className="row-body" data-action="detail" data-type="task" data-id={task.id}><strong>{task.title}</strong><small>{task.time || ""} · {t(task.status)}</small></button><span className={`tag ${task.priority || "medium"}`}>{t(task.priority || "medium")}</span></div>)}
    {!day.events.length && !day.tasks.length && <p className="meta" style={{ padding: "18px 0" }}>{t("empty")}</p>}
  </div></>;
}

export type { AgendaDay, MonthDay };
