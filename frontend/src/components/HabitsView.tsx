import { FormEvent, useState } from "react";
import { shiftDate } from "../domain/calendar";
import { habitIsDue, habitStreak } from "../domain/habits";
import { translate } from "../i18n";
import type { Habit, Workspace } from "../types";

interface Props { workspace: Workspace; today: string; saving: boolean; onChange: (workspace: Workspace) => Promise<boolean> }
const weekdays = [1, 2, 3, 4, 5, 6, 0] as const;

export function HabitsView({ workspace, today, saving, onChange }: Props) {
  const t = (key: Parameters<typeof translate>[1]) => translate(workspace.settings.language, key);
  const [editing, setEditing] = useState<Habit | null>(null);
  const dates = Array.from({ length: 7 }, (_, index) => shiftDate(today, index - 6));
  const create = (): Habit => ({ id: "", title: "", goal: "", startDate: today, weekdays: [...weekdays], completions: [] });
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
    if (!window.confirm(`${t("delete")}: ${t("habit")}?`)) return; const next = structuredClone(workspace); next.habits = next.habits.filter((habit) => habit.id !== id); if (await onChange(next)) setEditing(null);
  }
  return <><section className="page-heading"><div><p className="eyebrow">{t("consistency").toUpperCase()}</p><h1>{t("habits")}</h1></div><button className="primary" onClick={() => setEditing(create())}>+ {t("add")}</button></section>
    <div className="habit-grid">{workspace.habits.map((habit) => { const stats = habitStreak(habit, today); return <article className="card habit-card" key={habit.id}><button className="habit-title" onClick={() => setEditing(structuredClone(habit))}><strong>{habit.title}</strong><small>{habit.goal || t("target")}</small></button><div className="habit-days">{dates.map((date) => <div key={date}><small>{new Intl.DateTimeFormat(workspace.settings.language, { weekday: "short", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`))}</small><button disabled={!habitIsDue(habit, date)} className={habit.completions.includes(date) ? "check done" : "check"} onClick={() => toggle(habit.id, date)}>✓</button></div>)}</div><footer><span>{t("streak")}: <strong>{stats.current}</strong></span><span>{t("history")}: <strong>{stats.best}</strong></span></footer></article>; })}{!workspace.habits.length && <article className="card empty-state">{t("empty")}</article>}</div>
    {editing && <HabitEditor habit={editing} workspace={workspace} saving={saving} onClose={() => setEditing(null)} onSave={save} onDelete={editing.id ? remove : undefined} />}</>;
}

function HabitEditor({ habit, workspace, saving, onClose, onSave, onDelete }: { habit: Habit; workspace: Workspace; saving: boolean; onClose: () => void; onSave: (habit: Habit) => void; onDelete?: (id: string) => void }) {
  const t = (key: Parameters<typeof translate>[1]) => translate(workspace.settings.language, key);
  const [value, setValue] = useState(habit); const [error, setError] = useState("");
  const update = <K extends keyof Habit>(key: K, next: Habit[K]) => setValue((current) => ({ ...current, [key]: next }));
  const submit = (event: FormEvent) => { event.preventDefault(); if (!value.weekdays?.length) return setError("Выберите хотя бы один день."); if (value.endDate && value.startDate && value.endDate < value.startDate) return setError("Проверьте даты."); onSave({ ...value, title: value.title.trim() }); };
  return <div className="modal-backdrop"><section className="modal" role="dialog" aria-modal="true"><header><h2>{habit.id ? `${t("edit")} · ${t("habit")}` : `${t("add")} · ${t("habit")}`}</h2><button onClick={onClose}>×</button></header><form onSubmit={submit}><label className="full">{t("title")}<input required autoFocus value={value.title} onChange={(e) => update("title", e.target.value)} /></label><label className="full">{t("target")}<input value={value.goal || ""} onChange={(e) => update("goal", e.target.value)} /></label><label>{t("startDate")}<input required type="date" value={value.startDate || ""} onChange={(e) => update("startDate", e.target.value)} /></label><label>{t("endDate")}<input type="date" value={value.endDate || ""} onChange={(e) => update("endDate", e.target.value)} /></label><fieldset className="weekday-picker full"><legend>{t("weekdays")}</legend>{weekdays.map((day) => <label key={day}><input type="checkbox" checked={value.weekdays?.includes(day)} onChange={(e) => update("weekdays", e.target.checked ? [...(value.weekdays || []), day] : value.weekdays?.filter((item) => item !== day))} />{new Intl.DateTimeFormat(workspace.settings.language, { weekday: "short" }).format(new Date(Date.UTC(2026, 8, 20 + day)))}</label>)}</fieldset><label>{t("project")}<select value={value.projectId || ""} onChange={(e) => update("projectId", e.target.value)}><option value="">{t("none")}</option>{workspace.projects.map((project) => <option key={project.id} value={project.id}>{project.title}</option>)}</select></label><label>{t("goal")}<select value={value.goalId || ""} onChange={(e) => update("goalId", e.target.value)}><option value="">{t("none")}</option>{workspace.goals.map((goal) => <option key={goal.id} value={goal.id}>{goal.title}</option>)}</select></label>{error && <p className="form-error full">{error}</p>}<footer>{onDelete && <button className="danger" type="button" onClick={() => onDelete(habit.id)}>{t("delete")}</button>}<span /><button type="button" onClick={onClose}>{t("cancel")}</button><button className="primary" disabled={saving}>{t("save")}</button></footer></form></section></div>;
}
