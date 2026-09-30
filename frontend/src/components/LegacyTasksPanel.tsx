import type { Project, Task } from "../types";

interface Props {
  tasks: Task[];
  projects: Project[];
  mode: string;
  filter: string;
  projectFilter: string;
  today: string;
  label: (key: string) => string;
  formatDate: (value?: string) => string;
}

const statuses = ["todo", "progress", "completed", "cancelled"];

export function LegacyTasksPanel({ tasks, projects, mode, filter, projectFilter, today, label: t, formatDate }: Props) {
  return <>
    <div className="toolbar">
      <div className="segments">
        {["list", "board"].map((value) => <button type="button" key={value} className={mode === value ? "active" : ""} data-action="task-mode" data-value={value}><span>{t(value)}</span></button>)}
      </div>
      <select className="filter" id="task-filter" aria-label={t("tasks")} defaultValue={filter}>
        {["all", "today", "upcoming", "overdue", "completed"].map((value) => <option value={value} key={value}>{t(value)}</option>)}
      </select>
      <span className="spacer" />
      <select className="filter" id="project-filter" aria-label={t("project")} defaultValue={projectFilter}>
        <option value="">{t("projects")}: {t("all")}</option>
        {projects.map((project) => <option value={project.id} key={project.id}>{project.title}</option>)}
      </select>
    </div>
    {mode === "list" ? <article className="card glass"><div className="rows">
      {tasks.map((task) => <TaskRow task={task} today={today} label={t} formatDate={formatDate} key={task.id} />)}
      {!tasks.length && <EmptyState label={t} />}
    </div></article> : <div className="board">
      {statuses.map((status) => {
        const statusTasks = tasks.filter((task) => task.status === status);
        return <section className="board-col" key={status}><header><strong>{t(status)}</strong><span>{statusTasks.length}</span></header>
          {statusTasks.map((task) => <article className="task-card glass" key={task.id}>
            <button type="button" className="row-body" data-action="detail" data-type="task" data-id={task.id}>
              <span className={`tag ${task.priority || "medium"}`}>{t(task.priority || "medium")}</span><strong>{task.title}</strong><small>{formatDate(task.date)}</small>
            </button>
            <div className="row"><small>{(task.subtasks || []).filter((item) => item.done).length}/{(task.subtasks || []).length}</small><TaskCheck task={task} completionDate={today} label={t} /></div>
          </article>)}
        </section>;
      })}
    </div>}
  </>;
}

function TaskRow({ task, today, label: t, formatDate }: { task: Task; today: string; label: (key: string) => string; formatDate: (value?: string) => string }) {
  const overdue = Boolean(task.date && task.date < today && !["completed", "cancelled"].includes(task.status));
  const completedSubtasks = (task.subtasks || []).filter((item) => item.done).length;
  return <div className={`row ${task.status === "completed" ? "done" : ""}`}>
    <TaskCheck task={task} completionDate={today} label={t} />
    <button type="button" className="row-body" data-action="detail" data-type="task" data-id={task.id}>
      <strong>{task.title}</strong><small className={overdue ? "overdue" : ""}>{task.date ? formatDate(task.date) : ""} {task.time || ""} · {t(task.status)}{task.subtasks?.length ? ` · ${completedSubtasks}/${task.subtasks.length}` : ""}</small>
    </button>
    <span className={`tag ${task.priority || "medium"}`}>{t(task.priority || "medium")}</span>
  </div>;
}

function TaskCheck({ task, completionDate, label: t }: { task: Task; completionDate: string; label: (key: string) => string }) {
  const completed = task.status === "completed";
  return <button type="button" className={`check ${completed ? "done" : ""}`} data-action="task-check" data-id={task.id} data-value={completionDate} aria-label={`${t("done")} ${task.title}`}>{completed ? "✓" : ""}</button>;
}

function EmptyState({ label: t }: { label: (key: string) => string }) {
  return <div className="empty"><strong>{t("empty")}</strong><p>{t("emptyHint")}</p><button type="button" className="btn" data-action="add" data-value="task"><span>{t("add")}</span></button></div>;
}
