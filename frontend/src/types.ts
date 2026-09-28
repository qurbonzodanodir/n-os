export type Language = "ru" | "en";
export type Theme = "light" | "dark" | "system";
export type TaskStatus = "todo" | "progress" | "completed" | "cancelled";

export interface IdentifiedRecord {
  id: string;
  title: string;
  [key: string]: unknown;
}

export interface Task extends IdentifiedRecord {
  status: TaskStatus;
  date?: string;
  time?: string;
  priority?: "low" | "medium" | "high";
}

export interface Event extends IdentifiedRecord {
  date: string;
  time: string;
  endTime: string;
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
