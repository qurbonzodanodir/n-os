import type { Event, Goal, Habit, Note, Task } from "../types";

interface CommandItem {
  type: "task" | "event" | "habit";
  id: string;
  title: string;
  subtitle: string;
}
interface HabitItem extends Habit {
  streak: number;
  checked: boolean;
}
interface GoalItem extends Goal {
  progress: number;
}
interface WeekDay {
  date: string;
  weekday: string;
  day: number;
}

interface Props {
  date: string;
  currentDate: string;
  isToday: boolean;
  isFuture: boolean;
  greeting: string;
  weekday: string;
  fullDate: string;
  momentumDate: string;
  showDemo: boolean;
  overdueCount: number;
  commandItems: CommandItem[];
  tasks: Task[];
  completedTasks: number;
  habits: HabitItem[];
  checkedHabits: number;
  events: Event[];
  notes: Note[];
  goals: GoalItem[];
  weekDays: WeekDay[];
  rate: number;
  label: (key: string) => string;
  formatDate: (value?: string) => string;
  icon: (key: string) => string;
}

export function LegacyTodayPanel(props: Props) {
  const {
    date,
    currentDate,
    isToday,
    isFuture,
    greeting,
    weekday,
    fullDate,
    momentumDate,
    showDemo,
    overdueCount,
    commandItems,
    tasks,
    completedTasks,
    habits,
    checkedHabits,
    events,
    notes,
    goals,
    weekDays,
    rate,
    label: t,
    formatDate,
    icon,
  } = props;
  return (
    <>
      <header className="hero today-hero">
        <div>
          <div className="eyebrow">{greeting}</div>
          <h1>{t("heading")}</h1>
          <p>{t("todaySub")}</p>
        </div>
        <div className="day-switcher">
          <button type="button" className="btn icon-btn" data-action="dashboard-prev" aria-label={t("back")}>
            <Markup html={icon("arrow")} />
          </button>
          <button type="button" className="date-badge" data-action="dashboard-today">
            <b>{weekday}</b>
            <br />
            {fullDate}
          </button>
          <button type="button" className="btn icon-btn" data-action="dashboard-next" aria-label={t("next")}>
            <Markup html={icon("arrow")} />
          </button>
        </div>
      </header>
      {showDemo && (
        <div className="sample-banner glass">
          <p>{t("demoNotice")}</p>
          <button type="button" className="btn" data-action="demo">
            <span>{t("demo")}</span>
          </button>
        </div>
      )}
      {isToday && overdueCount > 0 && (
        <button type="button" className="overdue-banner glass" data-action="task-filter-view" data-value="overdue">
          <Markup html={icon("tasks")} />
          <span>
            <strong>
              {overdueCount} {t("overdueTasks")}
            </strong>
            <small>{t("overdueHint")}</small>
          </span>
          <Markup html={icon("arrow")} />
        </button>
      )}
      <article className="card glass daily-command">
        <div>
          <span className="eyebrow">{t("nextActions")}</span>
          <h2>{commandItems.length ? t("whatNext") : t("dayComplete")}</h2>
        </div>
        <div className="command-list">
          {commandItems.map((item) => (
            <button
              type="button"
              className="related-item"
              data-action="detail"
              data-type={item.type}
              data-id={item.id}
              key={`${item.type}-${item.id}`}
            >
              <Markup html={icon(item.type === "event" ? "calendar" : item.type === "task" ? "tasks" : "habits")} />
              <span>
                <strong>{item.title}</strong>
                <small>{item.subtitle}</small>
              </span>
              <Markup html={icon("arrow")} />
            </button>
          ))}
          {!commandItems.length && <p className="meta">{t("dayCompleteHint")}</p>}
        </div>
      </article>
      <div className="dashboard">
        <div className="column">
          <article className="card glass momentum">
            <div>
              <h2>{t("momentum")}</h2>
              <p>{momentumDate}</p>
              <div className="metrics">
                <div>
                  <strong>
                    {completedTasks}/{tasks.length}
                  </strong>
                  <small>{t("tasks")}</small>
                </div>
                <div>
                  <strong>
                    {checkedHabits}/{habits.length}
                  </strong>
                  <small>{t("habits")}</small>
                </div>
                <div>
                  <strong>{events.length}</strong>
                  <small>{t("calendar")}</small>
                </div>
              </div>
            </div>
            <div className="ring" style={{ "--value": rate } as React.CSSProperties}>
              <span>
                {rate}
                <small>%</small>
              </span>
            </div>
          </article>
          <article className="card glass">
            <CardHead title={t("focus")} action="tasks" label={t("allItems")} iconName="tasks" icon={icon} />
            <div className="rows">
              {tasks.map((task) => (
                <TaskRow task={task} date={date} currentDate={currentDate} label={t} formatDate={formatDate} icon={icon} key={task.id} />
              ))}
              {!tasks.length && <Empty type="task" label={t} icon={icon} />}
            </div>
          </article>
          <article className="card glass">
            <CardHead title={t("schedule")} action="calendar" label={t("allItems")} iconName="calendar" icon={icon} />
            <div className="week-strip">
              {weekDays.map((day) => (
                <button
                  type="button"
                  className={`date-tile ${day.date === date ? "active" : ""}`}
                  data-action="dashboard-date"
                  data-value={day.date}
                  key={day.date}
                >
                  <small>{day.weekday}</small>
                  <strong>{day.day}</strong>
                </button>
              ))}
            </div>
            <div className="rows">
              {events.map((event) => (
                <EventRow event={event} label={t} key={event.id} />
              ))}
              {!events.length && <Empty type="event" label={t} icon={icon} />}
            </div>
          </article>
        </div>
        <div className="column">
          <article className="card glass">
            <CardHead title={t("habits")} action="habits" label={t("allItems")} iconName="habits" icon={icon} />
            <div className="rows">
              {habits.map((habit) => (
                <div className="row" key={habit.id}>
                  <span className="habit-symbol">
                    <Markup html={icon("habits")} />
                  </span>
                  <button type="button" className="row-body" data-action="detail" data-type="habit" data-id={habit.id}>
                    <strong>{habit.title}</strong>
                    <small>
                      {habit.goal || ""} · {habit.streak} {t("days")}
                    </small>
                  </button>
                  <button
                    type="button"
                    className={`check ${habit.checked ? "done" : ""}`}
                    data-action="habit-check"
                    data-id={habit.id}
                    data-value={date}
                    aria-label={`${t("checkIn")} ${habit.title}`}
                    disabled={isFuture}
                  >
                    {habit.checked && <Markup html={icon("check")} />}
                  </button>
                </div>
              ))}
              {!habits.length && <Empty type="habit" label={t} icon={icon} />}
            </div>
          </article>
          <article className="card glass">
            <CardHead title={t("quickNotes")} action="notes" label={t("allItems")} iconName="notes" icon={icon} />
            <div className="note-tiles">
              {notes.map((note) => (
                <button type="button" className="note-tile" data-action="detail" data-type="note" data-id={note.id} key={note.id}>
                  <strong>{note.title}</strong>
                  <p>{note.body}</p>
                </button>
              ))}
              {!notes.length && <Empty type="note" label={t} icon={icon} />}
            </div>
          </article>
          <article className="card glass">
            <CardHead title={t("goals")} action="goals" label={t("allItems")} iconName="goals" icon={icon} />
            <div className="rows">
              {goals.map((goal) => (
                <div className="row" key={goal.id}>
                  <button type="button" className="row-body" data-action="detail" data-type="goal" data-id={goal.id}>
                    <strong>{goal.title}</strong>
                    <div className="bar">
                      <i style={{ width: `${goal.progress}%` }} />
                    </div>
                    <small>{goal.progress}%</small>
                  </button>
                </div>
              ))}
              {!goals.length && <Empty type="goal" label={t} icon={icon} />}
            </div>
          </article>
        </div>
      </div>
    </>
  );
}

function CardHead({
  title,
  action,
  label,
  iconName,
  icon,
}: {
  title: string;
  action: string;
  label: string;
  iconName: string;
  icon: (key: string) => string;
}) {
  return (
    <div className="card-head">
      <h2 className="card-title">
        <Markup html={icon(iconName)} />
        {title}
      </h2>
      <button type="button" className="text-btn" data-action="view" data-value={action}>
        <Markup html={icon("arrow")} />
        <span>{label}</span>
      </button>
    </div>
  );
}

function TaskRow({
  task,
  date,
  currentDate,
  label: t,
  formatDate,
  icon,
}: {
  task: Task;
  date: string;
  currentDate: string;
  label: (key: string) => string;
  formatDate: (value?: string) => string;
  icon: (key: string) => string;
}) {
  const completed = task.status === "completed";
  const overdue = Boolean(task.date && task.date < currentDate && !["completed", "cancelled"].includes(task.status));
  const done = (task.subtasks || []).filter((item) => item.done).length;
  return (
    <div className={`row ${completed ? "done" : ""}`}>
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
        <small className={overdue ? "overdue" : ""}>
          {task.date ? formatDate(task.date) : ""} {task.time || ""} · {t(task.status)}
          {task.subtasks?.length ? ` · ${done}/${task.subtasks.length}` : ""}
        </small>
      </button>
      <span className={`tag ${task.priority || "medium"}`}>{t(task.priority || "medium")}</span>
    </div>
  );
}

function EventRow({ event, label: t }: { event: Event; label: (key: string) => string }) {
  return (
    <div className="row">
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
  );
}

function Empty({ type, label: t, icon }: { type: string; label: (key: string) => string; icon: (key: string) => string }) {
  const iconName =
    ({ task: "tasks", event: "calendar", habit: "habits", note: "notes", goal: "goals" } as Record<string, string>)[type] || type;
  return (
    <div className="empty">
      <Markup html={icon(iconName)} />
      <strong>{t("empty")}</strong>
      <p>{t("emptyHint")}</p>
      <button type="button" className="btn" data-action="add" data-value={type}>
        <Markup html={icon("plus")} />
        <span>{t("add")}</span>
      </button>
    </div>
  );
}

function Markup({ html }: { html: string }) {
  return <span className="legacy-markup" dangerouslySetInnerHTML={{ __html: html }} />;
}
