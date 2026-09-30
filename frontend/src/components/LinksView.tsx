import { FormEvent, useState } from "react";
import { goalProgress } from "../domain/goals";
import { translate } from "../i18n";
import type { Goal, Project, Workspace } from "../types";

type Kind = "projects" | "goals";
interface Props {
  kind: Kind;
  workspace: Workspace;
  today: string;
  saving: boolean;
  onChange: (workspace: Workspace) => Promise<boolean>;
  onOpenTasks: (projectId: string) => void;
}

export function LinksView({ kind, workspace, today, saving, onChange, onOpenTasks }: Props) {
  const t = (key: Parameters<typeof translate>[1]) => translate(workspace.settings.language, key);
  const [editing, setEditing] = useState<Project | Goal | null>(null);
  const list = workspace[kind];
  const isGoal = kind === "goals";
  async function save(item: Project | Goal) {
    const next = structuredClone(workspace);
    const target = next[kind] as Array<Project | Goal>;
    const index = target.findIndex((value) => value.id === item.id);
    const value = { ...item, id: item.id || crypto.randomUUID(), createdAt: item.createdAt || today, updatedAt: today };
    if (index < 0) target.push(value);
    else target[index] = value;
    if (await onChange(next)) setEditing(null);
  }
  async function remove(id: string) {
    if (!window.confirm(`Удалить ${isGoal ? "цель" : "проект"}? Связанные записи останутся.`)) return;
    const next = structuredClone(workspace);
    next[kind] = next[kind].filter((item) => item.id !== id) as never;
    const key = isGoal ? "goalId" : "projectId";
    for (const collection of [next.tasks, next.events, next.habits, next.notes])
      for (const row of collection) if (row[key] === id) row[key] = "";
    if (await onChange(next)) setEditing(null);
  }
  async function toggleMilestone(goal: Goal, index: number) {
    const next = structuredClone(workspace);
    const found = next.goals.find((item) => item.id === goal.id);
    if (!found?.milestones) return;
    found.milestones[index].done = !found.milestones[index].done;
    await onChange(next);
  }
  return (
    <>
      <section className="page-heading">
        <div>
          <p className="eyebrow">{t(isGoal ? "goal" : "project").toUpperCase()}</p>
          <h1>{t(isGoal ? "goals" : "projects")}</h1>
        </div>
        <button
          className="primary"
          onClick={() =>
            setEditing({ id: "", title: "", description: "", date: today, color: "blue", ...(isGoal ? { milestones: [] } : {}) })
          }
        >
          + {t("add")}
        </button>
      </section>
      <div className="link-grid">
        {list.map((item) => {
          const tasks = workspace.tasks.filter((task) => task[isGoal ? "goalId" : "projectId"] === item.id);
          const progress = isGoal
            ? goalProgress(workspace, item as Goal)
            : tasks.length
              ? Math.round((tasks.filter((task) => task.status === "completed").length / tasks.length) * 100)
              : 0;
          return (
            <article className={`card link-card ${item.color || "blue"}`} key={item.id}>
              <button className="link-body" onClick={() => setEditing(structuredClone(item))}>
                <span>{t(isGoal ? "goal" : "project")}</span>
                <h2>{item.title}</h2>
                <p>{item.description || "—"}</p>
                <small>{item.date || "—"}</small>
              </button>
              <div className="progress">
                <i style={{ width: `${progress}%` }} />
              </div>
              <footer>
                <span>
                  {tasks.filter((task) => task.status === "completed").length}/{tasks.length} {t("tasks").toLowerCase()}
                </span>
                <strong>{progress}%</strong>
              </footer>
              {isGoal &&
                (item as Goal).milestones?.map((milestone, index) => (
                  <button className="milestone" key={`${milestone.title}-${index}`} onClick={() => toggleMilestone(item as Goal, index)}>
                    <span className={milestone.done ? "check done" : "check"}>✓</span>
                    {milestone.title}
                  </button>
                ))}
              {!isGoal && (
                <button className="text-action" onClick={() => onOpenTasks(item.id)}>
                  {t("tasks")} →
                </button>
              )}
            </article>
          );
        })}
        {!list.length && <article className="card empty-state">{t("empty")}</article>}
      </div>
      {editing && (
        <LinkEditor
          item={editing}
          isGoal={isGoal}
          language={workspace.settings.language}
          saving={saving}
          onClose={() => setEditing(null)}
          onSave={save}
          onDelete={editing.id ? remove : undefined}
        />
      )}
    </>
  );
}

function LinkEditor({
  item,
  isGoal,
  language,
  saving,
  onClose,
  onSave,
  onDelete,
}: {
  item: Project | Goal;
  isGoal: boolean;
  language: "ru" | "en";
  saving: boolean;
  onClose: () => void;
  onSave: (item: Project | Goal) => void;
  onDelete?: (id: string) => void;
}) {
  const t = (key: Parameters<typeof translate>[1]) => translate(language, key);
  const [value, setValue] = useState(item);
  const [milestones, setMilestones] = useState(
    isGoal ? ((item as Goal).milestones || []).map((step) => `${step.done ? "[x]" : "[ ]"} ${step.title}`).join("\n") : "",
  );
  const update = <K extends keyof Project>(key: K, next: Project[K]) => setValue((current) => ({ ...current, [key]: next }));
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const steps = milestones
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => ({ title: line.replace(/^\[[ xX]\]\s*/, ""), done: /^\[[xX]\]/.test(line) }));
    onSave({ ...value, title: value.title.trim(), ...(isGoal ? { milestones: steps } : {}) });
  };
  return (
    <div className="modal-backdrop">
      <section className="modal">
        <header>
          <h2>
            {item.id ? t("edit") : t("add")} · {t(isGoal ? "goal" : "project")}
          </h2>
          <button onClick={onClose}>×</button>
        </header>
        <form onSubmit={submit}>
          <label className="full">
            {t("title")}
            <input required autoFocus value={value.title} onChange={(e) => update("title", e.target.value)} />
          </label>
          <label className="full">
            {t("description")}
            <textarea value={value.description || ""} onChange={(e) => update("description", e.target.value)} />
          </label>
          <label>
            {t("date")}
            <input type="date" value={value.date || ""} onChange={(e) => update("date", e.target.value)} />
          </label>
          <label>
            {t("color")}
            <select value={value.color || "blue"} onChange={(e) => update("color", e.target.value as Project["color"])}>
              {(["blue", "violet", "rose", "green"] as const).map((color) => (
                <option key={color} value={color}>
                  {t(color)}
                </option>
              ))}
            </select>
          </label>
          {isGoal && (
            <label className="full">
              {t("milestones")}
              <textarea value={milestones} onChange={(e) => setMilestones(e.target.value)} />
            </label>
          )}
          <footer>
            {onDelete && (
              <button className="danger" type="button" onClick={() => onDelete(item.id)}>
                {t("delete")}
              </button>
            )}
            <span />
            <button type="button" onClick={onClose}>
              {t("cancel")}
            </button>
            <button className="primary" disabled={saving}>
              {t("save")}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}
