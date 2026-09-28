import type { Workspace } from "./types";

export function emptyWorkspace(): Workspace {
  return {
    schema: 3,
    settings: {
      name: "",
      language: "ru",
      theme: "system",
      timezone: "Asia/Dushanbe",
      currency: "TJS",
      weekStart: 1,
      reducedTransparency: false,
    },
    tasks: [],
    events: [],
    habits: [],
    notes: [],
    projects: [],
    goals: [],
    accounts: [],
    transactions: [],
    budgets: [],
    reviews: [],
    islam: {
      settings: {
        city: "Dushanbe",
        country: "Tajikistan",
        method: 3,
        school: 1,
        reminderMinutes: 15,
        notifications: false,
      },
      prayerLogs: {},
      surahProgress: {},
      azkar: {},
      arabicLessons: {},
    },
  };
}

export function todayIn(timezone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
