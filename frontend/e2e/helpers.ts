import { expect, type APIRequestContext } from "@playwright/test";

const zone = "Asia/Dushanbe";
export const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: zone }).format(new Date());
export const addDays = (date: string, days: number) =>
  new Date(Date.parse(`${date}T12:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);

const headers = { "X-User-Id": "local-owner" };

type Row = Record<string, unknown>;

/** A valid English workspace; pass only the collections a test cares about. */
export function workspace(parts: Partial<Record<string, Row[]>> = {}, settings: Row = {}) {
  return {
    schema: 3,
    settings: {
      name: "",
      language: "en",
      theme: "light",
      timezone: zone,
      currency: "USD",
      weekStart: 1,
      reducedTransparency: false,
      ...settings,
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
      settings: { city: "Dushanbe", country: "Tajikistan", method: 3, school: 1, reminderMinutes: 15, notifications: false },
      prayerLogs: {},
      surahProgress: {},
      azkar: {},
      arabicLessons: {},
    },
    ...parts,
  };
}

export async function seed(request: APIRequestContext, value: ReturnType<typeof workspace>) {
  const current = await (await request.get("/api/v1/workspace", { headers })).json();
  const response = await request.put("/api/v1/workspace", { headers, data: { workspace: value, revision: current.revision } });
  expect(response.ok(), `${response.status()} ${await response.text()}`).toBeTruthy();
}

export async function stored(request: APIRequestContext) {
  return (await (await request.get("/api/v1/workspace", { headers })).json()).workspace;
}

export const task = (id: string, title: string, extra: Row = {}) => ({
  id,
  title,
  status: "todo",
  priority: "medium",
  date: today(),
  createdAt: today(),
  ...extra,
});
