import type { Event, Task } from "../types";

interface Props {
  tasks: Task[];
  events: Event[];
  date: string;
  label: (key: string) => string;
  formatDate: (value?: string) => string;
  icon: (key: string) => string;
}

export function LegacyNotificationsDialog({ tasks, events, date, label: t, formatDate, icon }: Props) {
  return (
    <>
      <p className="form-note">{t("reminderNote")}</p>
      {tasks.map((task) => {
        const completed = task.status === "completed";
        const done = (task.subtasks || []).filter((item) => item.done).length;
        return (
          <div className={`row ${completed ? "done" : ""}`} key={task.id}>
            <button
              type="button"
              className={`check ${completed ? "done" : ""}`}
              data-action="task-check"
              data-id={task.id}
              data-value={date}
              aria-label={`${t("done")} ${task.title}`}
            >
              {completed && <Markup html={icon("check")} />}
            </button>
            <button type="button" className="row-body" data-action="detail" data-type="task" data-id={task.id}>
              <strong>{task.title}</strong>
              <small className={task.date && task.date < date ? "overdue" : ""}>
                {task.date ? formatDate(task.date) : ""} {task.time || ""} · {t(task.status)}
                {task.subtasks?.length ? ` · ${done}/${task.subtasks.length}` : ""}
              </small>
            </button>
            <span className={`tag ${task.priority || "medium"}`}>{t(task.priority || "medium")}</span>
          </div>
        );
      })}
      {events.map((event) => (
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
      {!tasks.length && !events.length && <p>{t("noReminders")}</p>}
    </>
  );
}

function Markup({ html }: { html: string }) {
  return <span className="legacy-markup" dangerouslySetInnerHTML={{ __html: html }} />;
}
