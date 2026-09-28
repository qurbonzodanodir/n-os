import type { Workspace, WorkspaceEnvelope } from "./types";

const developmentHeaders: Record<string, string> = import.meta.env.DEV
  ? { "X-User-Id": "local-owner" }
  : {};

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
