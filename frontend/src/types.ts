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
}

export interface WorkspaceSettings {
  name: string;
  language: Language;
  theme: Theme;
  timezone: string;
  currency: string;
  weekStart: number;
  reducedTransparency: boolean;
}

export interface Workspace {
  schema: 3;
  settings: WorkspaceSettings;
  tasks: Task[];
  events: Event[];
  habits: Habit[];
  notes: IdentifiedRecord[];
  projects: IdentifiedRecord[];
  goals: IdentifiedRecord[];
  accounts: IdentifiedRecord[];
  transactions: Array<{ id: string; [key: string]: unknown }>;
  budgets: IdentifiedRecord[];
  reviews: Array<{ id: string; [key: string]: unknown }>;
  islam: Record<string, unknown>;
}

export interface WorkspaceEnvelope {
  workspace: Workspace | null;
  revision: number;
}
