import type { SmsMessage } from "./domain/sms";
import type { Workspace, WorkspaceEnvelope } from "./types";

const developmentHeaders: Record<string, string> = import.meta.env.DEV ? { "X-User-Id": "local-owner" } : {};

async function json<T>(request: RequestInfo, init?: RequestInit): Promise<T> {
  const response = await fetch(request, init);
  if (!response.ok) {
    const error = new Error(`API request failed: ${response.status}`);
    Object.assign(error, { status: response.status });
    throw error;
  }
  return response.json() as Promise<T>;
}

export const workspaceApi = {
  read: () =>
    json<WorkspaceEnvelope>("/api/v1/workspace", {
      cache: "no-store",
      headers: developmentHeaders,
    }),

  save: (workspace: Workspace, revision: number) =>
    json<{ revision: number }>("/api/v1/workspace", {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...developmentHeaders },
      body: JSON.stringify({ workspace, revision }),
    }),
};

export interface PrayerTimes {
  date: string;
  timings: Record<string, string>;
  hijri: string;
  timezone: string;
  method: string;
  school: string;
}
export const prayerApi = {
  read: (date: string) => json<PrayerTimes>(`/api/v1/prayer-times?date=${date}`, { cache: "no-store", headers: developmentHeaders }),
};

export interface SmsTokenState {
  exists: boolean;
  created_at: string | null;
}

export const smsApi = {
  list: () => json<SmsMessage[]>("/api/v1/sms?status=new", { cache: "no-store", headers: developmentHeaders }),
  setStatus: (id: string, status: SmsMessage["status"]) =>
    json<SmsMessage>(`/api/v1/sms/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...developmentHeaders },
      body: JSON.stringify({ status }),
    }),
  tokenState: () => json<SmsTokenState>("/api/v1/sms/token", { cache: "no-store", headers: developmentHeaders }),
  createToken: () => json<{ token: string }>("/api/v1/sms/token", { method: "POST", headers: developmentHeaders }),
  revokeToken: async () => {
    const response = await fetch("/api/v1/sms/token", { method: "DELETE", headers: developmentHeaders });
    if (!response.ok) throw Object.assign(new Error(`API request failed: ${response.status}`), { status: response.status });
  },
};
