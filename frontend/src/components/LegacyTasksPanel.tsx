import { useState, type DragEvent, type FormEvent } from "react";
import type { Project, Task, TaskPriority, TaskStatus } from "../types";

interface QuickTaskChanges {
  title: string;
  date: string;
  status: TaskStatus;
  priority: TaskPriority;
}
interface SavedTaskView {
  id: string;
  name: string;
  filter: string;
  projectFilter: string;
  priorityFilter: string;
  sort: string;
  mode: string;
}
interface Props {
  tasks: Task[];
  projects: Project[];
  mode: string;
  filter: string;
  projectFilter: string;
  priorityFilter: string;
  sort: string;
  savedViews: SavedTaskView[];
  activeSavedView: string;
  today: string;
  label: (key: string) => string;
  formatDate: (value?: string) => string;
  onMove: (taskId: string, status: TaskStatus, beforeId?: string) => void | Promise<void>;
  onQuickSave: (taskId: string, changes: QuickTaskChanges) => void | Promise<void>;
  onSaveView: (name: string) => void | Promise<void>;
  onDeleteView: (id: string) => void | Promise<void>;
}

const statuses: TaskStatus[] = ["todo", "progress", "completed", "cancelled"];
const priorities: TaskPriority[] = ["low", "medium", "high", "urgent"];

export function LegacyTasksPanel({
  tasks,
  projects,
  mode,
  filter,
  projectFilter,
  priorityFilter,
  sort,
  savedViews,
  activeSavedView,
  today,
  label: t,
  formatDate,
  onMove,
  onQuickSave,
  onSaveView,
  onDeleteView,
}: Props) {
  const [dragging, setDragging] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [savingView, setSavingView] = useState(false);
  const move = (status: TaskStatus, beforeId?: string) => {
    if (!dragging || dragging === beforeId) return;
    void onMove(dragging, status, beforeId);
    setDragging(null);
  };
  return (
    <>
      <div className="toolbar">
        <div className="segments">
          {["list", "board"].map((value) => (
            <button type="button" key={value} className={mode === value ? "active" : ""} data-action="task-mode" data-value={value}>
              <span>{t(value)}</span>
            </button>
          ))}
        </div>
        <select className="filter" id="task-filter" aria-label={t("tasks")} defaultValue={filter}>
          {["all", "today", "upcoming", "overdue", "completed"].map((value) => (
            <option value={value} key={value}>
              {t(value)}
            </option>
          ))}
        </select>
        <select className="filter" id="task-priority-filter" aria-label={t("priority")} defaultValue={priorityFilter}>
          <option value="all">
            {t("priority")}: {t("all")}
          </option>
          {priorities.map((value) => (
            <option value={value} key={value}>
              {t(value)}
            </option>
          ))}
        </select>
        <select className="filter" id="task-sort" aria-label={t("sortBy")} defaultValue={sort}>
          {["manual", "date", "priority", "title"].map((value) => (
            <option value={value} key={value}>
              {t("sortBy")}: {t(value)}
            </option>
          ))}
        </select>
        <span className="spacer" />
        <select className="filter" id="project-filter" aria-label={t("project")} defaultValue={projectFilter}>
          <option value="">
            {t("projects")}: {t("all")}
          </option>
          {projects.map((project) => (
            <option value={project.id} key={project.id}>
              {project.title}
            </option>
          ))}
        </select>
        <select className="filter" id="task-saved-view" aria-label={t("savedViews")} defaultValue={activeSavedView}>
          <option value="">{t("savedViews")}</option>
          {savedViews.map((item) => (
            <option value={item.id} key={item.id}>
              {item.name}
            </option>
          ))}
        </select>
        <button type="button" className="btn" onClick={() => setSavingView((value) => !value)}>
          {t("saveView")}
        </button>
        {activeSavedView && (
          <button type="button" className="btn danger" onClick={() => void onDeleteView(activeSavedView)} aria-label={t("deleteView")}>
            ×
          </button>
        )}
      </div>
      {savingView && (
        <form
          className="save-view-bar"
          onSubmit={(event) => {
            event.preventDefault();
            const name = String(new FormData(event.currentTarget).get("name") || "").trim();
            if (name) {
              void onSaveView(name);
              setSavingView(false);
            }
          }}
        >
          <input name="name" placeholder={t("viewName")} maxLength={60} required autoFocus />
          <button type="button" className="btn" onClick={() => setSavingView(false)}>
            {t("cancel")}
          </button>
          <button type="submit" className="btn primary">
            {t("save")}
          </button>
        </form>
      )}
      {mode === "list" ? (
        <article className="card glass">
          <div
            className="rows task-drop-list"
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => dragging && move(tasks.find((task) => task.id === dragging)?.status || "todo")}
          >
            {tasks.map((task) =>
              editing === task.id ? (
                <QuickEditor task={task} label={t} onCancel={() => setEditing(null)} onSave={onQuickSave} key={task.id} />
              ) : (
                <TaskRow
                  task={task}
                  today={today}
                  label={t}
                  formatDate={formatDate}
                  onEdit={() => setEditing(task.id)}
                  onDragStart={setDragging}
                  onDrop={() => move(task.status, task.id)}
                  key={task.id}
                />
              ),
            )}
            {!tasks.length && <EmptyState label={t} />}
          </div>
        </article>
      ) : (
        <div className="board">
          {statuses.map((status) => {
            const statusTasks = tasks.filter((task) => task.status === status);
            return (
              <section
                className={`board-col ${dragging ? "drag-active" : ""}`}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => move(status)}
                key={status}
              >
                <header>
                  <strong>{t(status)}</strong>
                  <span>{statusTasks.length}</span>
                </header>
                {statusTasks.map((task) =>
                  editing === task.id ? (
                    <QuickEditor task={task} compact label={t} onCancel={() => setEditing(null)} onSave={onQuickSave} key={task.id} />
                  ) : (
                    <article
                      className={`task-card glass ${dragging === task.id ? "dragging" : ""}`}
                      draggable
                      onDragStart={(event) => beginDrag(event, task.id, setDragging)}
                      onDragEnd={() => setDragging(null)}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={(event) => {
                        event.stopPropagation();
                        move(status, task.id);
                      }}
                      key={task.id}
                    >
                      <button type="button" className="row-body" data-action="detail" data-type="task" data-id={task.id}>
                        <span className={`tag ${task.priority || "medium"}`}>{t(task.priority || "medium")}</span>
                        <strong>{task.title}</strong>
                        <small>{formatDate(task.date)}</small>
                      </button>
                      <div className="row">
                        <button
                          type="button"
                          className="quick-edit"
                          onClick={() => setEditing(task.id)}
                          aria-label={`${t("quickEdit")} ${task.title}`}
                        >
                          ✎
                        </button>
                        <small>
                          {(task.subtasks || []).filter((item) => item.done).length}/{(task.subtasks || []).length}
                        </small>
                        <TaskCheck task={task} completionDate={today} label={t} />
                      </div>
                    </article>
                  ),
                )}
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}

function beginDrag(event: DragEvent, taskId: string, setDragging: (id: string) => void) {
  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData("text/plain", taskId);
  setDragging(taskId);
}

function TaskRow({
  task,
  today,
  label: t,
  formatDate,
  onEdit,
  onDragStart,
  onDrop,
}: {
  task: Task;
  today: string;
  label: (key: string) => string;
  formatDate: (value?: string) => string;
  onEdit: () => void;
  onDragStart: (id: string) => void;
  onDrop: () => void;
}) {
  const overdue = Boolean(task.date && task.date < today && !["completed", "cancelled"].includes(task.status));
  const completedSubtasks = (task.subtasks || []).filter((item) => item.done).length;
  return (
    <div
      className={`row task-draggable ${task.status === "completed" ? "done" : ""}`}
      draggable
      onDragStart={(event) => beginDrag(event, task.id, onDragStart)}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.stopPropagation();
        onDrop();
      }}
    >
      <span className="drag-handle" aria-hidden="true">
        ⋮⋮
      </span>
      <TaskCheck task={task} completionDate={today} label={t} />
      <button type="button" className="row-body" data-action="detail" data-type="task" data-id={task.id}>
        <strong>{task.title}</strong>
        <small className={overdue ? "overdue" : ""}>
          {task.date ? formatDate(task.date) : ""} {task.time || ""} · {t(task.status)}
          {task.subtasks?.length ? ` · ${completedSubtasks}/${task.subtasks.length}` : ""}
        </small>
      </button>
      <button type="button" className="quick-edit" onClick={onEdit} aria-label={`${t("quickEdit")} ${task.title}`}>
        ✎
      </button>
      <span className={`tag ${task.priority || "medium"}`}>{t(task.priority || "medium")}</span>
    </div>
  );
}

function QuickEditor({
  task,
  compact = false,
  label: t,
  onCancel,
  onSave,
}: {
  task: Task;
  compact?: boolean;
  label: (key: string) => string;
  onCancel: () => void;
  onSave: Props["onQuickSave"];
}) {
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    void onSave(task.id, {
      title: String(values.get("title") || "").trim(),
      date: String(values.get("date") || ""),
      status: String(values.get("status")) as TaskStatus,
      priority: String(values.get("priority")) as TaskPriority,
    });
  };
  return (
    <form className={`quick-task-editor ${compact ? "compact glass" : ""}`} onSubmit={submit}>
      <input name="title" defaultValue={task.title} aria-label={t("title")} required maxLength={250} autoFocus />
      <input name="date" type="date" defaultValue={task.date || ""} aria-label={t("date")} />
      <select name="status" defaultValue={task.status} aria-label={t("status")}>
        {statuses.map((value) => (
          <option value={value} key={value}>
            {t(value)}
          </option>
        ))}
      </select>
      <select name="priority" defaultValue={task.priority || "medium"} aria-label={t("priority")}>
        {priorities.map((value) => (
          <option value={value} key={value}>
            {t(value)}
          </option>
        ))}
      </select>
      <div className="quick-task-actions">
        <button type="button" className="btn" onClick={onCancel}>
          {t("cancel")}
        </button>
        <button type="submit" className="btn primary">
          {t("save")}
        </button>
      </div>
    </form>
  );
}

function TaskCheck({ task, completionDate, label: t }: { task: Task; completionDate: string; label: (key: string) => string }) {
  const completed = task.status === "completed";
  return (
    <button
      type="button"
      className={`check ${completed ? "done" : ""}`}
      data-action="task-check"
      data-id={task.id}
      data-value={completionDate}
      aria-label={`${t("done")} ${task.title}`}
    >
      {completed ? "✓" : ""}
    </button>
  );
}

function EmptyState({ label: t }: { label: (key: string) => string }) {
  return (
    <div className="empty">
      <strong>{t("empty")}</strong>
      <p>{t("emptyHint")}</p>
      <button type="button" className="btn" data-action="add" data-value="task">
        <span>{t("add")}</span>
      </button>
    </div>
  );
}

export type { QuickTaskChanges, SavedTaskView };
