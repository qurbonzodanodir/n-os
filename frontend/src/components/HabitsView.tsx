import { FormEvent, useState } from "react";
import { shiftDate } from "../domain/calendar";
import { habitIsDue, habitStreak } from "../domain/habits";
import type { Habit, Workspace } from "../types";

interface Props { workspace: Workspace; today: string; saving: boolean; onChange: (workspace: Workspace) => Promise<boolean> }
const weekdays = [[1, "Пн"], [2, "Вт"], [3, "Ср"], [4, "Чт"], [5, "Пт"], [6, "Сб"], [0, "Вс"]] as const;

export function HabitsView({ workspace, today, saving, onChange }: Props) {
  const [editing, setEditing] = useState<Habit | null>(null);
  const dates = Array.from({ length: 7 }, (_, index) => shiftDate(today, index - 6));
  const create = (): Habit => ({ id: "", title: "", goal: "", startDate: today, weekdays: weekdays.map(([day]) => day), completions: [] });
  async function toggle(id: string, date: string) {
    if (date > today) return;
    const next = structuredClone(workspace); const habit = next.habits.find((item) => item.id === id);
    if (!habit || !habitIsDue(habit, date)) return;
    habit.completions = habit.completions.includes(date) ? habit.completions.filter((item) => item !== date) : [...habit.completions, date];
    await onChange(next);
  }
  async function save(habit: Habit) {
    const next = structuredClone(workspace); const index = next.habits.findIndex((item) => item.id === habit.id);
    const value = { ...habit, id: habit.id || crypto.randomUUID(), createdAt: habit.createdAt || today, updatedAt: today };
    if (index < 0) next.habits.push(value); else next.habits[index] = value;
    if (await onChange(next)) setEditing(null);
  }
  async function remove(id: string) {
    if (!window.confirm("Удалить привычку?")) return; const next = structuredClone(workspace); next.habits = next.habits.filter((habit) => habit.id !== id); if (await onChange(next)) setEditing(null);
  }
  return <><section className="page-heading"><div><p className="eyebrow">ПОСТОЯНСТВО</p><h1>Привычки</h1></div><button className="primary" onClick={() => setEditing(create())}>+ Добавить</button></section>
    <div className="habit-grid">{workspace.habits.map((habit) => { const stats = habitStreak(habit, today); return <article className="card habit-card" key={habit.id}><button className="habit-title" onClick={() => setEditing(structuredClone(habit))}><strong>{habit.title}</strong><small>{habit.goal || "Без цели"}</small></button><div className="habit-days">{dates.map((date) => <div key={date}><small>{new Intl.DateTimeFormat("ru", { weekday: "short", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`))}</small><button disabled={!habitIsDue(habit, date)} className={habit.completions.includes(date) ? "check done" : "check"} onClick={() => toggle(habit.id, date)}>✓</button></div>)}</div><footer><span>Серия: <strong>{stats.current}</strong></span><span>Лучшая: <strong>{stats.best}</strong></span></footer></article>; })}{!workspace.habits.length && <article className="card empty-state">Добавьте первую привычку.</article>}</div>
    {editing && <HabitEditor habit={editing} workspace={workspace} saving={saving} onClose={() => setEditing(null)} onSave={save} onDelete={editing.id ? remove : undefined} />}</>;
}

function HabitEditor({ habit, workspace, saving, onClose, onSave, onDelete }: { habit: Habit; workspace: Workspace; saving: boolean; onClose: () => void; onSave: (habit: Habit) => void; onDelete?: (id: string) => void }) {
  const [value, setValue] = useState(habit); const [error, setError] = useState("");
  const update = <K extends keyof Habit>(key: K, next: Habit[K]) => setValue((current) => ({ ...current, [key]: next }));
  const submit = (event: FormEvent) => { event.preventDefault(); if (!value.weekdays?.length) return setError("Выберите хотя бы один день."); if (value.endDate && value.startDate && value.endDate < value.startDate) return setError("Проверьте даты."); onSave({ ...value, title: value.title.trim() }); };
  return <div className="modal-backdrop"><section className="modal" role="dialog" aria-modal="true"><header><h2>{habit.id ? "Редактировать привычку" : "Новая привычка"}</h2><button onClick={onClose}>×</button></header><form onSubmit={submit}><label className="full">Название<input required autoFocus value={value.title} onChange={(e) => update("title", e.target.value)} /></label><label className="full">Цель<input value={value.goal || ""} onChange={(e) => update("goal", e.target.value)} /></label><label>Начало<input required type="date" value={value.startDate || ""} onChange={(e) => update("startDate", e.target.value)} /></label><label>Окончание<input type="date" value={value.endDate || ""} onChange={(e) => update("endDate", e.target.value)} /></label><fieldset className="weekday-picker full"><legend>Дни недели</legend>{weekdays.map(([day, label]) => <label key={day}><input type="checkbox" checked={value.weekdays?.includes(day)} onChange={(e) => update("weekdays", e.target.checked ? [...(value.weekdays || []), day] : value.weekdays?.filter((item) => item !== day))} />{label}</label>)}</fieldset><label>Проект<select value={value.projectId || ""} onChange={(e) => update("projectId", e.target.value)}><option value="">Нет</option>{workspace.projects.map((project) => <option key={project.id} value={project.id}>{project.title}</option>)}</select></label><label>Цель<select value={value.goalId || ""} onChange={(e) => update("goalId", e.target.value)}><option value="">Нет</option>{workspace.goals.map((goal) => <option key={goal.id} value={goal.id}>{goal.title}</option>)}</select></label>{error && <p className="form-error full">{error}</p>}<footer>{onDelete && <button className="danger" type="button" onClick={() => onDelete(habit.id)}>Удалить</button>}<span /><button type="button" onClick={onClose}>Отмена</button><button className="primary" disabled={saving}>Сохранить</button></footer></form></section></div>;
}
