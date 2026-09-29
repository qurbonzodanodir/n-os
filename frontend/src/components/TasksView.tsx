import { FormEvent, useMemo, useState } from "react";

import { translate } from "../i18n";
import type { Repeat, Task, TaskPriority, TaskStatus, Workspace } from "../types";

type Filter = "all" | "today" | "upcoming" | "overdue" | "completed";
type Mode = "list" | "board";

interface Props {
  workspace: Workspace;
  today: string;
  saving: boolean;
  onChange: (workspace: Workspace) => Promise<boolean>;
  onToggle: (taskId: string) => void;
  initialProjectId?: string;
}

const statuses: TaskStatus[] = ["todo", "progress", "completed", "cancelled"];
const priorities: TaskPriority[] = ["low", "medium", "high", "urgent"];

function draft(today: string): Task {
  return {
    id: "",
    title: "",
    description: "",
    date: today,
    time: "09:00",
    status: "todo",
    priority: "medium",
    repeat: "none",
    projectId: "",
    goalId: "",
    tags: "",
    subtasks: [],
  };
}

export function TasksView({ workspace, today, saving, onChange, onToggle, initialProjectId = "" }: Props) {
  const t = (key: Parameters<typeof translate>[1]) => translate(workspace.settings.language, key);
  const statusLabel = (status: TaskStatus) => t(status === "progress" ? "progress" : status);
  const priorityLabel = (priority: TaskPriority) => t(priority);
  const [filter, setFilter] = useState<Filter>("all");
  const [mode, setMode] = useState<Mode>("list");
  const [projectId, setProjectId] = useState(initialProjectId);
  const [editing, setEditing] = useState<Task | null>(null);

  const tasks = useMemo(
    () => workspace.tasks
      .filter((task) => !projectId || task.projectId === projectId)
      .filter((task) => {
        if (filter === "today") return task.date === today;
        if (filter === "upcoming") return Boolean(task.date && task.date > today && !["completed", "cancelled"].includes(task.status));
        if (filter === "overdue") return Boolean(task.date && task.date < today && !["completed", "cancelled"].includes(task.status));
        if (filter === "completed") return task.status === "completed";
        return true;
      })
      .sort((left, right) => (left.date || "9999").localeCompare(right.date || "9999")),
    [filter, projectId, today, workspace.tasks],
  );

  async function save(task: Task) {
    const next = structuredClone(workspace);
    const existing = next.tasks.findIndex((candidate) => candidate.id === task.id);
    const value = {
      ...task,
      id: task.id || crypto.randomUUID(),
      createdAt: task.createdAt || today,
      updatedAt: today,
      completedAt: task.status === "completed" ? task.completedAt || today : null,
    };
    if (existing === -1) next.tasks.push(value);
    else next.tasks[existing] = value;
    if (await onChange(next)) setEditing(null);
  }

  async function remove(taskId: string) {
    if (!window.confirm(`${t("delete")}: ${t("task")}?`)) return;
    const next = structuredClone(workspace);
    next.tasks = next.tasks.filter((task) => task.id !== taskId);
    next.events = next.events.map((event) => event.taskId === taskId ? { ...event, taskId: "" } : event);
    if (await onChange(next)) setEditing(null);
  }

  return (
    <>
      <section className="page-heading">
        <div><p className="eyebrow">{t("workspace").toUpperCase()}</p><h1>{t("tasks")}</h1></div>
        <button className="primary" onClick={() => setEditing(draft(today))}>+ {t("add")}</button>
      </section>
      <div className="toolbar">
        <div className="segments">
          <button className={mode === "list" ? "active" : ""} onClick={() => setMode("list")}>{t("list")}</button>
          <button className={mode === "board" ? "active" : ""} onClick={() => setMode("board")}>{t("board")}</button>
        </div>
        <select value={filter} onChange={(event) => setFilter(event.target.value as Filter)}>
          <option value="all">{t("all")}</option><option value="today">{t("today")}</option>
          <option value="upcoming">{t("upcoming")}</option><option value="overdue">{t("overdue")}</option>
          <option value="completed">{t("completed")}</option>
        </select>
        <select value={projectId} onChange={(event) => setProjectId(event.target.value)}>
          <option value="">{t("all")} · {t("projects")}</option>
          {workspace.projects.map((project) => <option key={project.id} value={project.id}>{project.title}</option>)}
        </select>
      </div>

      {mode === "list" ? (
        <article className="card task-list">
          {tasks.length ? tasks.map((task) => (
            <TaskRow key={task.id} task={task} today={today} onEdit={() => setEditing(structuredClone(task))} onToggle={onToggle} statusLabel={statusLabel} priorityLabel={priorityLabel} />
          )) : <p className="empty-state">{t("empty")}</p>}
        </article>
      ) : (
        <div className="task-board">
          {statuses.map((status) => (
            <section className="board-column" key={status}>
              <header><strong>{statusLabel(status)}</strong><span>{tasks.filter((task) => task.status === status).length}</span></header>
              {tasks.filter((task) => task.status === status).map((task) => (
                <button className="board-task" key={task.id} onClick={() => setEditing(structuredClone(task))}>
                  <span className={`priority ${task.priority || "medium"}`}>{priorityLabel(task.priority || "medium")}</span>
                  <strong>{task.title}</strong><small>{task.date || "Без срока"}</small>
                </button>
              ))}
            </section>
          ))}
        </div>
      )}

      {editing && <TaskEditor task={editing} workspace={workspace} saving={saving} onClose={() => setEditing(null)} onSave={save} onDelete={editing.id ? remove : undefined} />}
    </>
  );
}

function TaskRow({ task, today, onEdit, onToggle, statusLabel, priorityLabel }: { task: Task; today: string; onEdit: () => void; onToggle: (id: string) => void; statusLabel: (status: TaskStatus) => string; priorityLabel: (priority: TaskPriority) => string }) {
  const overdue = Boolean(task.date && task.date < today && !["completed", "cancelled"].includes(task.status));
  return <div className={`task-row ${task.status === "completed" ? "completed" : ""}`}>
    <button className={task.status === "completed" ? "check done" : "check"} onClick={() => onToggle(task.id)} aria-label={`Выполнить: ${task.title}`}>✓</button>
    <button className="task-body" onClick={onEdit}><strong>{task.title}</strong><small className={overdue ? "overdue" : ""}>{task.date || "—"} {task.time || ""} · {statusLabel(task.status)}</small></button>
    <span className={`priority ${task.priority || "medium"}`}>{priorityLabel(task.priority || "medium")}</span>
  </div>;
}

function TaskEditor({ task, workspace, saving, onClose, onSave, onDelete }: {
  task: Task;
  workspace: Workspace;
  saving: boolean;
  onClose: () => void;
  onSave: (task: Task) => void;
  onDelete?: (id: string) => void;
}) {
  const t = (key: Parameters<typeof translate>[1]) => translate(workspace.settings.language, key);
  const [value, setValue] = useState(task);
  const [subtasks, setSubtasks] = useState((task.subtasks || []).map((item) => `${item.done ? "[x]" : "[ ]"} ${item.title}`).join("\n"));
  const update = <K extends keyof Task>(key: K, next: Task[K]) => setValue((current) => ({ ...current, [key]: next }));
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const parsed = subtasks.split("\n").map((line) => line.trim()).filter(Boolean).map((line) => ({ title: line.replace(/^\[[ xX]\]\s*/, ""), done: /^\[[xX]\]/.test(line) }));
    onSave({ ...value, title: value.title.trim(), subtasks: parsed });
  };

  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <section className="modal" role="dialog" aria-modal="true" aria-labelledby="task-editor-title">
      <header><h2 id="task-editor-title">{task.id ? `${t("edit")} · ${t("task")}` : `${t("add")} · ${t("task")}`}</h2><button onClick={onClose}>×</button></header>
      <form onSubmit={submit}>
        <label className="full">{t("title")}<input required autoFocus value={value.title} onChange={(event) => update("title", event.target.value)} /></label>
        <label className="full">{t("description")}<textarea value={value.description || ""} onChange={(event) => update("description", event.target.value)} /></label>
        <label>{t("date")}<input required type="date" value={value.date || ""} onChange={(event) => update("date", event.target.value)} /></label>
        <label>{t("time")}<input type="time" value={value.time || ""} onChange={(event) => update("time", event.target.value)} /></label>
        <label>{t("status")}<select value={value.status} onChange={(event) => update("status", event.target.value as TaskStatus)}>{statuses.map((status) => <option value={status} key={status}>{t(status === "progress" ? "progress" : status)}</option>)}</select></label>
        <label>{t("priority")}<select value={value.priority || "medium"} onChange={(event) => update("priority", event.target.value as TaskPriority)}>{priorities.map((priority) => <option value={priority} key={priority}>{t(priority)}</option>)}</select></label>
        <label>{t("repeat")}<select value={value.repeat || "none"} onChange={(event) => update("repeat", event.target.value as Repeat)}>{(["none", "daily", "weekly", "monthly"] as const).map((repeat) => <option value={repeat} key={repeat}>{t(repeat)}</option>)}</select></label>
        <label>{t("project")}<select value={value.projectId || ""} onChange={(event) => update("projectId", event.target.value)}><option value="">{t("none")}</option>{workspace.projects.map((project) => <option key={project.id} value={project.id}>{project.title}</option>)}</select></label>
        <label>{t("goal")}<select value={value.goalId || ""} onChange={(event) => update("goalId", event.target.value)}><option value="">{t("none")}</option>{workspace.goals.map((goal) => <option key={goal.id} value={goal.id}>{goal.title}</option>)}</select></label>
        <label>{t("tags")}<input value={value.tags || ""} onChange={(event) => update("tags", event.target.value)} /></label>
        <label className="full">{t("subtasks")}<textarea value={subtasks} onChange={(event) => setSubtasks(event.target.value)} /></label>
        <footer>{onDelete && <button className="danger" type="button" onClick={() => onDelete(task.id)}>{t("delete")}</button>}<span /><button type="button" onClick={onClose}>{t("cancel")}</button><button className="primary" disabled={saving}>{t("save")}</button></footer>
      </form>
    </section>
  </div>;
}
