import { FormEvent, useState } from "react";

import { eventOccurs, shiftDate, weekDates } from "../domain/calendar";
import { translate } from "../i18n";
import type { Event, Repeat, Workspace } from "../types";

type Mode = "month" | "week" | "day" | "agenda";

interface Props {
  workspace: Workspace;
  today: string;
  saving: boolean;
  onChange: (workspace: Workspace) => Promise<boolean>;
}

const modes: Mode[] = ["month", "week", "day", "agenda"];

function newEvent(date: string): Event {
  return { id: "", title: "", date, time: "09:00", endTime: "10:00", repeat: "none", reminder: 0 };
}

export function CalendarView({ workspace, today, saving, onChange }: Props) {
  const t = (key: Parameters<typeof translate>[1]) => translate(workspace.settings.language, key);
  const dateLabel = (date: string, options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(workspace.settings.language, { ...options, timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));
  const [selected, setSelected] = useState(today);
  const [mode, setMode] = useState<Mode>("month");
  const [editing, setEditing] = useState<Event | null>(null);
  const monthStart = `${selected.slice(0, 7)}-01`;
  const monthOffset = (new Date(`${monthStart}T12:00:00Z`).getUTCDay() - workspace.settings.weekStart + 7) % 7;
  const monthDates = Array.from({ length: 42 }, (_, index) => shiftDate(monthStart, index - monthOffset));
  const visibleDates = mode === "week" ? weekDates(selected, workspace.settings.weekStart) : mode === "day" ? [selected] : Array.from({ length: 7 }, (_, index) => shiftDate(selected, index));

  const eventsOn = (date: string) => workspace.events.filter((event) => eventOccurs(event, date)).sort((a, b) => a.time.localeCompare(b.time));
  const tasksOn = (date: string) => workspace.tasks.filter((task) => task.date === date && task.status !== "cancelled");
  const shift = (direction: number) => {
    if (mode === "month") {
      const value = new Date(`${monthStart}T12:00:00Z`);
      value.setUTCMonth(value.getUTCMonth() + direction);
      setSelected(value.toISOString().slice(0, 10));
    } else setSelected(shiftDate(selected, direction * (mode === "day" ? 1 : 7)));
  };

  async function save(event: Event) {
    if (event.endTime <= event.time || (event.repeatUntil && event.repeatUntil < event.date)) return;
    const next = structuredClone(workspace);
    const index = next.events.findIndex((candidate) => candidate.id === event.id);
    const value = { ...event, id: event.id || crypto.randomUUID(), createdAt: event.createdAt || today, updatedAt: today };
    if (index === -1) next.events.push(value); else next.events[index] = value;
    if (await onChange(next)) setEditing(null);
  }

  async function remove(id: string) {
    if (!window.confirm(`${t("delete")}: ${t("event")}?`)) return;
    const next = structuredClone(workspace);
    next.events = next.events.filter((event) => event.id !== id);
    if (await onChange(next)) setEditing(null);
  }

  const agenda = (date: string) => <section className="agenda" key={date}>
    <header><div><strong>{dateLabel(date, { weekday: "long", day: "numeric", month: "long" })}</strong><small>{date}</small></div><button onClick={() => setEditing(newEvent(date))}>+</button></header>
    {eventsOn(date).map((event) => <button className="agenda-event" key={event.id} onClick={() => setEditing(structuredClone(event))}><time>{event.time}</time><span><strong>{event.title}</strong><small>{event.endTime}{event.location ? ` · ${event.location}` : ""}</small></span></button>)}
    {tasksOn(date).map((task) => <div className="agenda-task" key={task.id}><small>{t("task")}</small><strong>{task.title}</strong></div>)}
    {!eventsOn(date).length && !tasksOn(date).length && <p className="muted">{t("empty")}</p>}
  </section>;

  return <>
    <section className="page-heading"><div><p className="eyebrow">{t("schedule").toUpperCase()}</p><h1>{t("calendar")}</h1></div><button className="primary" onClick={() => setEditing(newEvent(selected))}>+ {t("event")}</button></section>
    <div className="calendar-controls"><div className="segments">{modes.map((key) => <button key={key} className={mode === key ? "active" : ""} onClick={() => setMode(key)}>{t(key)}</button>)}</div><div className="calendar-nav"><button onClick={() => setSelected(today)}>{t("today")}</button><button onClick={() => shift(-1)}>←</button><strong>{dateLabel(selected, { month: "long", year: "numeric" })}</strong><button onClick={() => shift(1)}>→</button></div></div>
    {mode === "month" ? <div className="calendar-layout"><article className="calendar-month card"><div className="calendar-grid weekdays">{monthDates.slice(0, 7).map((date) => <span key={date}>{dateLabel(date, { weekday: "short" })}</span>)}</div><div className="calendar-grid">{monthDates.map((date) => {
      const events = eventsOn(date); const tasks = tasksOn(date);
      return <button key={date} className={`calendar-day ${date === selected ? "selected" : ""} ${date === today ? "today" : ""} ${date.slice(0, 7) !== monthStart.slice(0, 7) ? "outside" : ""}`} onClick={() => setSelected(date)}><strong>{Number(date.slice(8))}</strong>{events.slice(0, 2).map((event) => <small key={event.id}>{event.time} {event.title}</small>)}{tasks.length > 0 && <small>Задачи: {tasks.length}</small>}</button>;
    })}</div></article><aside className="card calendar-side">{agenda(selected)}</aside></div> : <article className={`card calendar-agenda ${mode === "week" ? "week-view" : ""}`}>{visibleDates.map(agenda)}</article>}
      {editing && <EventEditor event={editing} workspace={workspace} saving={saving} onClose={() => setEditing(null)} onSave={save} onDelete={editing.id ? remove : undefined} />}
  </>;
}

function EventEditor({ event, workspace, saving, onClose, onSave, onDelete }: { event: Event; workspace: Workspace; saving: boolean; onClose: () => void; onSave: (event: Event) => void; onDelete?: (id: string) => void }) {
  const t = (key: Parameters<typeof translate>[1]) => translate(workspace.settings.language, key);
  const [value, setValue] = useState(event);
  const [invalid, setInvalid] = useState("");
  const update = <K extends keyof Event>(key: K, next: Event[K]) => setValue((current) => ({ ...current, [key]: next }));
  const submit = (formEvent: FormEvent) => { formEvent.preventDefault(); if (value.endTime <= value.time) return setInvalid("Время окончания должно быть позже начала."); if (value.repeatUntil && value.repeatUntil < value.date) return setInvalid("Дата окончания повтора указана неверно."); onSave({ ...value, title: value.title.trim() }); };
  return <div className="modal-backdrop" onMouseDown={(mouseEvent) => mouseEvent.target === mouseEvent.currentTarget && onClose()}><section className="modal" role="dialog" aria-modal="true"><header><h2>{event.id ? `${t("edit")} · ${t("event")}` : `${t("add")} · ${t("event")}`}</h2><button onClick={onClose}>×</button></header><form onSubmit={submit}>
    <label className="full">{t("title")}<input required autoFocus value={value.title} onChange={(e) => update("title", e.target.value)} /></label>
    <label className="full">{t("description")}<textarea value={value.description || ""} onChange={(e) => update("description", e.target.value)} /></label>
    <label>{t("date")}<input required type="date" value={value.date} onChange={(e) => update("date", e.target.value)} /></label><label>{t("location")}<input value={value.location || ""} onChange={(e) => update("location", e.target.value)} /></label>
    <label>{t("time")}<input required type="time" value={value.time} onChange={(e) => update("time", e.target.value)} /></label><label>{t("endTime")}<input required type="time" value={value.endTime} onChange={(e) => update("endTime", e.target.value)} /></label>
    <label>{t("repeat")}<select value={value.repeat || "none"} onChange={(e) => update("repeat", e.target.value as Repeat)}>{(["none", "daily", "weekly", "monthly"] as const).map((repeat) => <option key={repeat} value={repeat}>{t(repeat)}</option>)}</select></label><label>{t("repeatUntil")}<input type="date" value={value.repeatUntil || ""} onChange={(e) => update("repeatUntil", e.target.value)} /></label>
    <label>{t("reminder")}<input min="0" type="number" value={value.reminder || 0} onChange={(e) => update("reminder", Number(e.target.value))} /></label><label>{t("task")}<select value={value.taskId || ""} onChange={(e) => update("taskId", e.target.value)}><option value="">{t("none")}</option>{workspace.tasks.map((task) => <option key={task.id} value={task.id}>{task.title}</option>)}</select></label>
    <label>{t("project")}<select value={value.projectId || ""} onChange={(e) => update("projectId", e.target.value)}><option value="">{t("none")}</option>{workspace.projects.map((project) => <option key={project.id} value={project.id}>{project.title}</option>)}</select></label><label>{t("goal")}<select value={value.goalId || ""} onChange={(e) => update("goalId", e.target.value)}><option value="">{t("none")}</option>{workspace.goals.map((goal) => <option key={goal.id} value={goal.id}>{goal.title}</option>)}</select></label>
    {invalid && <p className="form-error full">{invalid}</p>}<footer>{onDelete && <button className="danger" type="button" onClick={() => onDelete(event.id)}>{t("delete")}</button>}<span /><button type="button" onClick={onClose}>{t("cancel")}</button><button className="primary" disabled={saving}>{t("save")}</button></footer>
  </form></section></div>;
}
