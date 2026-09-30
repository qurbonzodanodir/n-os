import { goalProgress } from "../domain/goals";
import type { Goal, Project, Task, Workspace } from "../types";

interface Props {
  type: "goal" | "project";
  records: Array<Goal | Project>;
  projects: Project[];
  tasks: Task[];
  workspace: Workspace;
  label: (key: string) => string;
  formatDate: (value?: string) => string;
}

export function LegacyLinksPanel({ type, records, projects, tasks, workspace, label: t, formatDate }: Props) {
  return (
    <div className="cards">
      {records.map((record) => {
        const projectIds = new Set(
          type === "goal" ? projects.filter((project) => project.goalId === record.id).map((project) => project.id) : [],
        );
        const linked = tasks.filter((task) =>
          type === "goal"
            ? task.goalId === record.id || Boolean(task.projectId && projectIds.has(task.projectId))
            : task.projectId === record.id,
        );
        const rate =
          type === "goal"
            ? goalProgress(workspace, record as Goal)
            : linked.length
              ? Math.round((linked.filter((task) => task.status === "completed").length / linked.length) * 100)
              : 0;
        const milestones = type === "goal" ? (record as Goal).milestones || [] : [];
        return (
          <article className="card glass project-card" key={record.id}>
            <button type="button" className="row-body" data-action="detail" data-type={type} data-id={record.id}>
              <span className="tag">{t(type)}</span>
              <h3 style={{ marginTop: 15 }}>{record.title}</h3>
              <p>{record.description || ""}</p>
              <small>{formatDate(record.date)}</small>
            </button>
            <div className="bar">
              <i style={{ width: `${rate}%` }} />
            </div>
            <div className="actions">
              <small>
                {linked.filter((task) => task.status === "completed").length}/{linked.length} {t("tasks").toLowerCase()}
              </small>
              <span className="spacer" />
              <strong>{rate}%</strong>
            </div>
            {milestones.map((milestone, index) => (
              <div className="milestone" key={`${record.id}-${index}`}>
                <button
                  type="button"
                  className={`check ${milestone.done ? "done" : ""}`}
                  data-action="milestone"
                  data-id={record.id}
                  data-value={index}
                >
                  {milestone.done ? "✓" : ""}
                </button>
                {milestone.title}
              </div>
            ))}
            {type === "project" && (
              <button type="button" className="text-btn" data-action="project-tasks" data-value={record.id}>
                <span>{t("tasks")}</span> →
              </button>
            )}
          </article>
        );
      })}
      {!records.length && (
        <div className="empty">
          <strong>{t("empty")}</strong>
          <p>{t("emptyHint")}</p>
          <button type="button" className="btn" data-action="add" data-value={type}>
            <span>{t("add")}</span>
          </button>
        </div>
      )}
    </div>
  );
}
