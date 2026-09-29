export type Language = "ru" | "en";
export type Theme = "light" | "dark" | "system";
export type TaskStatus = "todo" | "progress" | "completed" | "cancelled";
export type TaskPriority = "low" | "medium" | "high" | "urgent";
export type Repeat = "none" | "daily" | "weekly" | "monthly";

export interface IdentifiedRecord {
  id: string;
  title: string;
  [key: string]: unknown;
}

export interface Task extends IdentifiedRecord {
  status: TaskStatus;
  date?: string;
  time?: string;
  description?: string;
  priority?: TaskPriority;
  repeat?: Repeat;
  projectId?: string;
  goalId?: string;
  tags?: string;
  completedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  sourceId?: string;
  subtasks?: Array<{ title: string; done: boolean }>;
}

export interface Event extends IdentifiedRecord {
  date: string;
  time: string;
  endTime: string;
  description?: string;
  location?: string;
  repeat?: Repeat;
  repeatUntil?: string;
  reminder?: number;
  taskId?: string;
  projectId?: string;
  goalId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Habit extends IdentifiedRecord {
  completions: string[];
  weekdays?: number[];
  goal?: string;
  startDate?: string;
  endDate?: string;
  projectId?: string;
  goalId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Note extends IdentifiedRecord {
  body: string;
  folder?: string;
  tags?: string;
  color?: "blue" | "violet" | "rose" | "green";
  pinned?: boolean;
  archived?: boolean;
  projectId?: string;
  goalId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Project extends IdentifiedRecord {
  description?: string;
  date?: string;
  goalId?: string;
  color?: "blue" | "violet" | "rose" | "green";
  createdAt?: string;
  updatedAt?: string;
}

export interface Goal extends Project {
  milestones?: Array<{ title: string; done: boolean }>;
}

export interface Account extends IdentifiedRecord { opening: number; currency: string; createdAt?: string; updatedAt?: string }
export interface Transaction { id: string; kind: "income" | "expense" | "transfer"; amount: number; date: string; category?: string; title?: string; accountId: string; toAccountId?: string; createdAt?: string; updatedAt?: string }
export interface Budget extends IdentifiedRecord { category: string; amount: number; monthKey: string; currency: string; createdAt?: string; updatedAt?: string }
export interface Review { id: string; week: string; wins?: string; improve?: string; nextFocus?: string; createdAt?: string; updatedAt?: string }
export interface IslamState { settings: { city: string; country: string; method: number; school: number; reminderMinutes: number; notifications: boolean }; prayerLogs: Record<string, string[]>; surahProgress: Record<string, boolean>; azkar: Record<string, Record<string, number>>; arabicLessons: Record<string, unknown> }

export interface WorkspaceSettings {
  name: string;
  language: Language;
  theme: Theme;
  timezone: string;
  currency: string;
  weekStart: number;
  reducedTransparency: boolean;
  remindersEnabled?: boolean;
  morningTime?: string;
  eveningTime?: string;
}

export interface Workspace {
  schema: 3;
  settings: WorkspaceSettings;
  tasks: Task[];
  events: Event[];
  habits: Habit[];
  notes: Note[];
  projects: Project[];
  goals: Goal[];
  accounts: Account[];
  transactions: Transaction[];
  budgets: Budget[];
  reviews: Review[];
  islam: IslamState;
}

export interface WorkspaceEnvelope {
  workspace: Workspace | null;
  revision: number;
}
