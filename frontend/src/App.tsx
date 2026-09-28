import { useEffect, useMemo, useState } from "react";

import { workspaceApi } from "./api";
import { CalendarView } from "./components/CalendarView";
import { HabitsView } from "./components/HabitsView";
import { NotesView } from "./components/NotesView";
import { TasksView } from "./components/TasksView";
import { eventOccurs } from "./domain/calendar";
import { habitIsDue } from "./domain/habits";
import { toggleTask } from "./domain/tasks";
import type { Workspace } from "./types";
import { emptyWorkspace, todayIn } from "./workspace";

const navigation = [
  ["today", "Сегодня"],
  ["tasks", "Задачи"],
  ["calendar", "Календарь"],
  ["habits", "Привычки"],
  ["notes", "Заметки"],
  ["goals", "Цели"],
  ["projects", "Проекты"],
  ["finance", "Финансы"],
] as const;

export default function App() {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [revision, setRevision] = useState(0);
  const [active, setActive] = useState("today");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [syncError, setSyncError] = useState("");

  useEffect(() => {
    workspaceApi
      .read()
      .then((result) => {
        setWorkspace(result.workspace ?? emptyWorkspace());
        setRevision(result.revision);
      })
      .catch(() => setError("Не удалось подключиться к FastAPI"));
  }, []);

  async function persist(next: Workspace): Promise<boolean> {
    if (saving) return false;
    setSaving(true);
    setSyncError("");
    try {
      const result = await workspaceApi.save(next, revision);
      setWorkspace(next);
      setRevision(result.revision);
      return true;
    } catch (reason) {
      setSyncError((reason as { status?: number }).status === 409
        ? "Данные изменились на другом устройстве. Обновите страницу."
        : "Не удалось сохранить изменения.");
      return false;
    } finally {
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

  return (
    <div className="shell">
      <aside className="sidebar glass">
        <a className="brand" href="#today"><span>n</span> n-os</a>
        <p className="caption">РАБОЧЕЕ ПРОСТРАНСТВО</p>
        <nav>
          {navigation.map(([key, label]) => (
            <button className={active === key ? "active" : ""} key={key} onClick={() => setActive(key)}>
              {label}
              {key === "tasks" && <small>{workspace.tasks.filter((task) => task.status !== "completed").length}</small>}
            </button>
          ))}
        </nav>
        <div className="profile"><span>{(workspace.settings.name || "n").slice(0, 2).toUpperCase()}</span><strong>{workspace.settings.name || "n-os"}</strong></div>
      </aside>

      <main className="content">
        <header className="topbar"><span>n-os / {navigation.find(([key]) => key === active)?.[1]}</span><div className="sync-state">{saving ? "Сохранение…" : syncError || "Сохранено"}<button>RU</button></div></header>
        {syncError && <div className="error-banner" role="alert">{syncError}</div>}
        {active === "today" ? (
          <>
            <section className="hero"><div><p className="eyebrow">ДОБРО ПОЖАЛОВАТЬ</p><h1>Сегодня в фокусе</h1><p>Все важные дела в одном месте.</p></div><time>{summary.today}</time></section>
            <section className="grid">
              <article className="card momentum"><div><p>ПРОГРЕСС ДНЯ</p><h2>{summary.completed}/{summary.tasks.length} задач</h2></div><strong>{summary.tasks.length ? Math.round(summary.completed / summary.tasks.length * 100) : 0}%</strong></article>
              <article className="card"><h2>Задачи на сегодня</h2>{summary.tasks.length ? summary.tasks.map((task) => <div className="row" key={task.id}><button className={task.status === "completed" ? "check done" : "check"} onClick={() => complete(task.id)} aria-label={`Выполнить: ${task.title}`}>✓</button><div><strong>{task.title}</strong><small>{task.time || "Без времени"}</small></div></div>) : <p className="muted">На сегодня задач нет</p>}</article>
              <article className="card"><h2>Расписание</h2>{summary.events.length ? summary.events.map((event) => <div className="row" key={event.id}><time>{event.time}</time><div><strong>{event.title}</strong><small>{event.endTime}</small></div></div>) : <p className="muted">Событий нет</p>}</article>
              <article className="card"><h2>Привычки</h2>{summary.habits.length ? summary.habits.map((habit) => <div className="row" key={habit.id}><button className={habit.completions.includes(summary.today) ? "check done" : "check"} onClick={() => checkHabit(habit.id)}>✓</button><div><strong>{habit.title}</strong><small>{habit.goal || "Ежедневная цель"}</small></div></div>) : <p className="muted">На сегодня привычек нет</p>}</article>
            </section>
          </>
        ) : active === "tasks" ? (
          <TasksView workspace={workspace} today={summary.today} saving={saving} onChange={persist} onToggle={complete} />
        ) : active === "calendar" ? (
          <CalendarView workspace={workspace} today={summary.today} saving={saving} onChange={persist} />
        ) : active === "habits" ? (
          <HabitsView workspace={workspace} today={summary.today} saving={saving} onChange={persist} />
        ) : active === "notes" ? (
          <NotesView workspace={workspace} today={summary.today} saving={saving} onChange={persist} />
        ) : (
          <section className="hero"><div><p className="eyebrow">МИГРАЦИЯ ИНТЕРФЕЙСА</p><h1>{navigation.find(([key]) => key === active)?.[1]}</h1><p>Этот модуль будет перенесён следующим без изменения данных.</p></div></section>
        )}
      </main>
    </div>
  );
}
