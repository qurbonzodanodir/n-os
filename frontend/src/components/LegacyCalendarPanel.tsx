import { useState, type DragEvent } from "react";
import type { DragItem } from "../domain/reschedule";
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
  events: Array<{ id: string; title: string }>;
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
  onReschedule: (item: DragItem, from: string, to: string) => void | Promise<void>;
}

export function LegacyCalendarPanel(props: Props) {
  const { mode, monthDays, weekdayLabels, weekDays, agendaDays, selectedAgenda, label: t, onReschedule } = props;
  const [drag, setDrag] = useState<{ item: DragItem; from: string } | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const start = (event: DragEvent, item: DragItem, from: string) => {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", item.id);
    setDrag({ item, from });
  };
  const target = (date: string) => ({
    onDragOver: (event: DragEvent) => {
      if (!drag) return;
      event.preventDefault();
      setOver(date);
    },
    onDragLeave: () => setOver((current) => (current === date ? null : current)),
    onDrop: (event: DragEvent) => {
      event.preventDefault();
      if (drag) void onReschedule(drag.item, drag.from, date);
      setDrag(null);
      setOver(null);
    },
  });
  const end = () => {
    setDrag(null);
    setOver(null);
  };
  const controls = <CalendarControls {...props} />;
  if (mode === "month")
    return (
      <div className="split">
        <article className="card glass">
          {controls}
          <div className="cal-grid">
            {weekdayLabels.map((label, index) => (
              <div className="weekday" key={`${label}-${index}`}>
                {label}
              </div>
            ))}
            {monthDays.map((day) => (
              <div
                role="button"
                tabIndex={0}
                data-action="date"
                data-value={day.date}
                className={`cal-day ${day.selected ? "selected" : ""} ${day.today ? "today" : ""} ${day.outside ? "out" : ""} ${over === day.date ? "drop-over" : ""}`}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    event.currentTarget.click();
                  }
                }}
                {...target(day.date)}
                key={day.date}
              >
                <strong>{day.day}</strong>
                {day.events.map((item) => (
                  <small
                    className="cal-chip"
                    draggable
                    onDragStart={(event) => start(event, { type: "event", id: item.id }, day.date)}
                    onDragEnd={end}
                    key={item.id}
                  >
                    {item.title}
                  </small>
                ))}
                {day.taskCount > 0 && (
                  <small>
                    {t("tasks")}: {day.taskCount}
                  </small>
                )}
              </div>
            ))}
          </div>
        </article>
        <aside className="card glass">
          <Agenda day={selectedAgenda} label={t} />
        </aside>
      </div>
    );
  if (mode === "week")
    return (
      <article className="card glass">
        {controls}
        <div className="week-columns">
          {weekDays.map((day) => (
            <section className={`week-column ${over === day.date ? "drop-over" : ""}`} {...target(day.date)} key={day.date}>
              <h3>{day.label}</h3>
              {day.events.map((event) => (
                <div
                  className="event-slot"
                  draggable
                  onDragStart={(e) => start(e, { type: "event", id: event.id }, day.date)}
                  onDragEnd={end}
                  key={event.id}
                >
                  <button type="button" className="event-block" data-action="detail" data-type="event" data-id={event.id}>
                    <small>{event.time}</small>
                    <strong>{event.title}</strong>
                  </button>
                </div>
              ))}
              {day.tasks.map((task) => (
                <div
                  className="event-slot"
                  draggable
                  onDragStart={(e) => start(e, { type: "task", id: task.id }, day.date)}
                  onDragEnd={end}
                  key={task.id}
                >
                  <button type="button" className="event-block" data-action="detail" data-type="task" data-id={task.id}>
                    <small>{t("task")}</small>
                    <strong>{task.title}</strong>
                  </button>
                </div>
              ))}
              <button type="button" className="btn icon-btn" data-action="add-date" data-value={day.date} aria-label={t("add")}>
                +
              </button>
            </section>
          ))}
        </div>
      </article>
    );
  return (
    <article className="card glass">
      {controls}
      {agendaDays.map((day) => (
        <Agenda day={day} label={t} key={day.date} />
      ))}
    </article>
  );
}

function CalendarControls({ mode, monthLabel, label: t }: Props) {
  return (
    <>
      <div className="toolbar">
        <div className="segments">
          {["month", "week", "day", "agenda"].map((value) => (
            <button type="button" className={mode === value ? "active" : ""} data-action="calendar-mode" data-value={value} key={value}>
              <span>{t(value)}</span>
            </button>
          ))}
        </div>
        <span className="spacer" />
        <button type="button" className="btn" data-action="calendar-today">
          <span>{t("today")}</span>
        </button>
      </div>
      <div className="cal-header">
        <h2>{monthLabel}</h2>
        <div className="actions">
          <button type="button" className="btn icon-btn" data-action="calendar-prev" aria-label={t("back")}>
            ←
          </button>
          <button type="button" className="btn icon-btn" data-action="calendar-next" aria-label={t("next")}>
            →
          </button>
        </div>
      </div>
    </>
  );
}

function Agenda({ day, label: t }: { day: AgendaDay; label: (key: string) => string }) {
  return (
    <>
      <div className="agenda-head">
        <h3>{day.label}</h3>
        <button type="button" className="btn icon-btn" data-action="add-date" data-value={day.date} aria-label={t("add")}>
          +
        </button>
      </div>
      <div className="rows">
        {day.events.map((event) => (
          <div className="row" key={event.id}>
            <time className="event-time">{event.time}</time>
            <i className="event-line" />
            <button type="button" className="row-body" data-action="detail" data-type="event" data-id={event.id}>
              <strong>{event.title}</strong>
              <small>
                {event.time}–{event.endTime}
                {event.location ? ` · ${event.location}` : ""}
                {event.repeat && event.repeat !== "none" ? ` · ${t(event.repeat)}` : ""}
              </small>
            </button>
          </div>
        ))}
        {day.tasks.map((task) => (
          <div className={`row ${task.status === "completed" ? "done" : ""}`} key={task.id}>
            <button
              type="button"
              className={`check ${task.status === "completed" ? "done" : ""}`}
              data-action="task-check"
              data-id={task.id}
              data-value={day.date}
              aria-label={`${t("done")} ${task.title}`}
            >
              {task.status === "completed" ? "✓" : ""}
            </button>
            <button type="button" className="row-body" data-action="detail" data-type="task" data-id={task.id}>
              <strong>{task.title}</strong>
              <small>
                {task.time || ""} · {t(task.status)}
              </small>
            </button>
            <span className={`tag ${task.priority || "medium"}`}>{t(task.priority || "medium")}</span>
          </div>
        ))}
        {!day.events.length && !day.tasks.length && (
          <p className="meta" style={{ padding: "18px 0" }}>
            {t("empty")}
          </p>
        )}
      </div>
    </>
  );
}

export type { AgendaDay, MonthDay };
