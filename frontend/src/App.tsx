import { useEffect, useMemo, useState } from "react";

import { workspaceApi } from "./api";
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
  const [active, setActive] = useState("today");
  const [error, setError] = useState("");

  useEffect(() => {
    workspaceApi
      .read()
      .then((result) => setWorkspace(result.workspace ?? emptyWorkspace()))
      .catch(() => setError("Не удалось подключиться к FastAPI"));
  }, []);

  const summary = useMemo(() => {
    if (!workspace) return null;
    const today = todayIn(workspace.settings.timezone);
    const tasks = workspace.tasks.filter((task) => task.date === today);
    const completed = tasks.filter((task) => task.status === "completed").length;
    const events = workspace.events.filter((event) => event.date === today);
    return { today, tasks, completed, events };
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
        <header className="topbar"><span>n-os / {navigation.find(([key]) => key === active)?.[1]}</span><button>RU</button></header>
        {active === "today" ? (
          <>
            <section className="hero"><div><p className="eyebrow">ДОБРО ПОЖАЛОВАТЬ</p><h1>Сегодня в фокусе</h1><p>Все важные дела в одном месте.</p></div><time>{summary.today}</time></section>
            <section className="grid">
              <article className="card momentum"><div><p>ПРОГРЕСС ДНЯ</p><h2>{summary.completed}/{summary.tasks.length} задач</h2></div><strong>{summary.tasks.length ? Math.round(summary.completed / summary.tasks.length * 100) : 0}%</strong></article>
              <article className="card"><h2>Задачи на сегодня</h2>{summary.tasks.length ? summary.tasks.map((task) => <div className="row" key={task.id}><span className={task.status === "completed" ? "check done" : "check"}>✓</span><div><strong>{task.title}</strong><small>{task.time || "Без времени"}</small></div></div>) : <p className="muted">На сегодня задач нет</p>}</article>
              <article className="card"><h2>Расписание</h2>{summary.events.length ? summary.events.map((event) => <div className="row" key={event.id}><time>{event.time}</time><div><strong>{event.title}</strong><small>{event.endTime}</small></div></div>) : <p className="muted">Событий нет</p>}</article>
            </section>
          </>
        ) : (
          <section className="hero"><div><p className="eyebrow">МИГРАЦИЯ ИНТЕРФЕЙСА</p><h1>{navigation.find(([key]) => key === active)?.[1]}</h1><p>Этот модуль будет перенесён следующим без изменения данных.</p></div></section>
        )}
      </main>
    </div>
  );
}
