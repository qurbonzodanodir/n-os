interface HabitDay {
  date: string;
  label: string;
  due: boolean;
  completed: boolean;
}

interface HabitCard {
  id: string;
  title: string;
  goal: string;
  currentStreak: number;
  completedCount: number;
  days: HabitDay[];
}

interface Props {
  habits: HabitCard[];
  label: (key: string) => string;
}

export function LegacyHabitsPanel({ habits, label: t }: Props) {
  return (
    <div className="cards">
      {habits.map((habit) => (
        <article className="card glass habit-card" key={habit.id}>
          <div className="habit-top">
            <span className="habit-symbol" aria-hidden="true">
              ✓
            </span>
            <button type="button" className="row-body" data-action="detail" data-type="habit" data-id={habit.id}>
              <strong>{habit.title}</strong>
              <small>{habit.goal}</small>
            </button>
          </div>
          <div className="habit-history">
            {habit.days.map((day) => (
              <div className="habit-date" key={day.date}>
                <small>{day.label}</small>
                <button
                  type="button"
                  className={`check ${day.completed ? "done" : ""}`}
                  data-action="habit-check"
                  data-id={habit.id}
                  data-value={day.date}
                  aria-label={`${t("checkIn")} ${day.date}`}
                  disabled={!day.due}
                >
                  {day.completed ? "✓" : "·"}
                </button>
              </div>
            ))}
          </div>
          <div className="habit-stats">
            <span>
              {t("streak")}: {habit.currentStreak} {t("days")}
            </span>
            <span>
              {habit.completedCount} {t("checked").toLowerCase()}
            </span>
          </div>
        </article>
      ))}
      {!habits.length && (
        <div className="empty">
          <strong>{t("empty")}</strong>
          <p>{t("emptyHint")}</p>
          <button type="button" className="btn" data-action="add" data-value="habit">
            <span>{t("add")}</span>
          </button>
        </div>
      )}
    </div>
  );
}

export type { HabitCard };
