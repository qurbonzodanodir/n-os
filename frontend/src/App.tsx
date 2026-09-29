import { useEffect, useMemo, useRef, useState } from "react";

import { workspaceApi } from "./api";
import { CalendarView } from "./components/CalendarView";
import { FinanceView } from "./components/FinanceView";
import { HabitsView } from "./components/HabitsView";
import { LinksView } from "./components/LinksView";
import { IslamView } from "./components/IslamView";
import { NotesView } from "./components/NotesView";
import { ReviewView } from "./components/ReviewView";
import { SettingsView } from "./components/SettingsView";
import { ShellTools } from "./components/ShellTools";
import { TasksView } from "./components/TasksView";
import { eventOccurs } from "./domain/calendar";
import { habitIsDue } from "./domain/habits";
import { translate, type TranslationKey } from "./i18n";
import { toggleTask } from "./domain/tasks";
import type { Workspace } from "./types";
import { emptyWorkspace, todayIn } from "./workspace";

const navigation = ["today", "tasks", "calendar", "habits", "islam", "notes", "goals", "projects", "finance", "review", "settings"] as const satisfies readonly TranslationKey[];

export default function App() {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [active, setActive] = useState("today");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [syncError, setSyncError] = useState("");
  const [taskProject, setTaskProject] = useState("");
  const revisionRef = useRef(0);
  const savingRef = useRef(false);

  useEffect(() => {
    workspaceApi
      .read()
      .then((result) => {
        setWorkspace(result.workspace ?? emptyWorkspace());
        revisionRef.current = result.revision;
      })
      .catch(() => setError("Не удалось подключиться к FastAPI"));
  }, []);

  useEffect(() => {
    if (!workspace) return;
    const dark = workspace.settings.theme === "dark" || (workspace.settings.theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    document.documentElement.dataset.reduced = String(workspace.settings.reducedTransparency);
    document.documentElement.lang = workspace.settings.language;
  }, [workspace]);

  async function persist(next: Workspace): Promise<boolean> {
    if (savingRef.current) return false;
    savingRef.current = true;
    setSaving(true);
    setSyncError("");
    try {
      const result = await workspaceApi.save(next, revisionRef.current);
      setWorkspace(next);
      revisionRef.current = result.revision;
      return true;
    } catch (reason) {
      setSyncError((reason as { status?: number }).status === 409
        ? "Данные изменились на другом устройстве. Обновите страницу."
        : "Не удалось сохранить изменения.");
      return false;
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  function complete(taskId: string) {
    if (!workspace) return;
    void persist(toggleTask(workspace, taskId, todayIn(workspace.settings.timezone)));
  }

  function checkHabit(habitId: string) {
    if (!workspace) return;
    const today = todayIn(workspace.settings.timezone);
    const next = structuredClone(workspace);
    const habit = next.habits.find((item) => item.id === habitId);
    if (!habit || !habitIsDue(habit, today)) return;
    habit.completions = habit.completions.includes(today)
      ? habit.completions.filter((date) => date !== today)
      : [...habit.completions, today];
    void persist(next);
  }

  const summary = useMemo(() => {
    if (!workspace) return null;
    const today = todayIn(workspace.settings.timezone);
    const tasks = workspace.tasks.filter((task) => task.date === today);
    const completed = tasks.filter((task) => task.status === "completed").length;
    const events = workspace.events.filter((event) => eventOccurs(event, today));
    const habits = workspace.habits.filter((habit) => habitIsDue(habit, today));
    return { today, tasks, completed, events, habits };
  }, [workspace]);

  if (error) {
    return <main className="center-state"><h1>n-os</h1><p>{error}</p></main>;
  }
  if (!workspace || !summary) {
    return <main className="center-state"><div className="spinner" /><p>Загрузка…</p></main>;
  }
  const t = (key: TranslationKey) => translate(workspace.settings.language, key);

  return (
    <div className="shell">
      <aside className="sidebar glass">
        <a className="brand" href="#today"><span>n</span> n-os</a>
        <p className="caption">{t("workspace").toUpperCase()}</p>
        <nav>
          {navigation.map((key) => (
            <button className={active === key ? "active" : ""} key={key} onClick={() => setActive(key)}>
              {t(key)}
              {key === "tasks" && <small>{workspace.tasks.filter((task) => task.status !== "completed").length}</small>}
            </button>
          ))}
        </nav>
        <div className="profile"><span>{(workspace.settings.name || "n").slice(0, 2).toUpperCase()}</span><strong>{workspace.settings.name || "n-os"}</strong></div>
      </aside>

      <main className="content">
        <header className="topbar"><span>n-os / {t(active as TranslationKey)}</span><div className="top-actions"><ShellTools workspace={workspace} today={summary.today} onNavigate={setActive} /><div className="sync-state">{saving ? t("saving") : syncError || t("saved")}<button onClick={() => persist({ ...structuredClone(workspace), settings: { ...workspace.settings, language: workspace.settings.language === "ru" ? "en" : "ru" } })}>{workspace.settings.language === "ru" ? "EN" : "RU"}</button></div></div></header>
        {syncError && <div className="error-banner" role="alert">{syncError}</div>}
        {active === "today" ? (
          <>
            <section className="hero"><div><p className="eyebrow">{t("greeting").toUpperCase()}</p><h1>{t("heading")}</h1><p>{t("todaySub")}</p></div><time>{summary.today}</time></section>
            <section className="grid">
              <article className="card momentum"><div><p>{t("momentum").toUpperCase()}</p><h2>{summary.completed}/{summary.tasks.length} {t("tasks").toLowerCase()}</h2></div><strong>{summary.tasks.length ? Math.round(summary.completed / summary.tasks.length * 100) : 0}%</strong></article>
              <article className="card"><h2>{t("focus")}</h2>{summary.tasks.length ? summary.tasks.map((task) => <div className="row" key={task.id}><button className={task.status === "completed" ? "check done" : "check"} onClick={() => complete(task.id)} aria-label={`${t("done")}: ${task.title}`}>✓</button><div><strong>{task.title}</strong><small>{task.time || "—"}</small></div></div>) : <p className="muted">{t("empty")}</p>}</article>
              <article className="card"><h2>{t("schedule")}</h2>{summary.events.length ? summary.events.map((event) => <div className="row" key={event.id}><time>{event.time}</time><div><strong>{event.title}</strong><small>{event.endTime}</small></div></div>) : <p className="muted">{t("empty")}</p>}</article>
              <article className="card"><h2>{t("habits")}</h2>{summary.habits.length ? summary.habits.map((habit) => <div className="row" key={habit.id}><button className={habit.completions.includes(summary.today) ? "check done" : "check"} onClick={() => checkHabit(habit.id)}>✓</button><div><strong>{habit.title}</strong><small>{habit.goal || t("target")}</small></div></div>) : <p className="muted">{t("empty")}</p>}</article>
            </section>
          </>
        ) : active === "tasks" ? (
          <TasksView workspace={workspace} today={summary.today} saving={saving} onChange={persist} onToggle={complete} initialProjectId={taskProject} />
        ) : active === "calendar" ? (
          <CalendarView workspace={workspace} today={summary.today} saving={saving} onChange={persist} />
        ) : active === "habits" ? (
          <HabitsView workspace={workspace} today={summary.today} saving={saving} onChange={persist} />
        ) : active === "islam" ? (
          <IslamView workspace={workspace} today={summary.today} onChange={persist} />
        ) : active === "notes" ? (
          <NotesView workspace={workspace} today={summary.today} saving={saving} onChange={persist} />
        ) : active === "projects" || active === "goals" ? (
          <LinksView kind={active} workspace={workspace} today={summary.today} saving={saving} onChange={persist} onOpenTasks={(projectId) => { setTaskProject(projectId); setActive("tasks"); }} />
        ) : active === "finance" ? (
          <FinanceView workspace={workspace} today={summary.today} saving={saving} onChange={persist} />
        ) : active === "review" ? (
          <ReviewView workspace={workspace} today={summary.today} saving={saving} onChange={persist} />
        ) : active === "settings" ? (
          <SettingsView workspace={workspace} saving={saving} onChange={persist} />
        ) : (
          <section className="hero"><div><h1>{active}</h1></div></section>
        )}
      </main>
    </div>
  );
}
