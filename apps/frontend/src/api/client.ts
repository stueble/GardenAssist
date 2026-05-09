import type { Api, PlantInput, JournalEntryInput, GardenInput, AttachmentInput } from "@api/api";
import type { Garden }       from "@api/garden";
import type { Plant }        from "@api/plant";
import type { JournalEntry } from "@api/journal-entry";
import type { Attachment }   from "@api/attachment";
import type { Settings }     from "@api/settings";

const BASE = "/api";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...init?.headers },
    ...init,
  });
  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${path}`);
  }
  // 204 No Content — no body to parse
  if (res.status === 204) {
    return undefined as T;
  }
  return res.json() as Promise<T>;
}

export const apiClient: Api = {
  // ── Garden ──────────────────────────────────────────────────────────────────

  getGarden(): Promise<Garden> {
    return request("/garden");
  },

  updateGarden(data: GardenInput): Promise<Garden> {
    return request("/garden", { method: "PATCH", body: JSON.stringify(data) });
  },

  uploadGardenPlan(file: File): Promise<Garden> {
    const form = new FormData();
    form.append("file", file);
    return request("/garden/plan", { method: "POST", headers: {}, body: form });
  },

  deleteGardenPlan(): Promise<Garden> {
    return request("/garden/plan", { method: "DELETE" });
  },

  deleteAllData(): Promise<Garden> {
    return request("/garden/all", { method: "DELETE" });
  },

  installDefaults(): Promise<Garden> {
    return request("/garden/defaults", { method: "POST" });
  },

  // ── Plants ──────────────────────────────────────────────────────────────────

  createPlant(data: PlantInput): Promise<Plant> {
    return request("/plants", { method: "POST", body: JSON.stringify(data) });
  },

  updatePlant(id: string, data: PlantInput): Promise<Plant> {
    return request(`/plants/${id}`, { method: "PUT", body: JSON.stringify(data) });
  },

  deletePlant(id: string): Promise<void> {
    return request(`/plants/${id}`, { method: "DELETE" });
  },

  // ── Journal Entries ─────────────────────────────────────────────────────────

  createJournalEntry(data: JournalEntryInput): Promise<JournalEntry> {
    return request("/journal", { method: "POST", body: JSON.stringify(data) });
  },

  updateJournalEntry(id: string, data: JournalEntryInput): Promise<JournalEntry> {
    return request(`/journal/${id}`, { method: "PUT", body: JSON.stringify(data) });
  },

  deleteJournalEntry(id: string): Promise<void> {
    return request(`/journal/${id}`, { method: "DELETE" });
  },

  // ── Attachments ─────────────────────────────────────────────────────────────

  uploadAttachment(
    owner_type: "plant" | "garden" | "journal_entry",
    owner_id: string | null,
    input: AttachmentInput,
  ): Promise<Attachment> {
    const form = new FormData();
    form.append("file", input.file);
    if (input.category) form.append("category", input.category);
    const params = new URLSearchParams({ owner_type });
    if (owner_id) params.set("owner_id", owner_id);
    return request(`/attachments?${params}`, { method: "POST", headers: {}, body: form });
  },

  deleteAttachment(id: string): Promise<void> {
    return request(`/attachments/${id}`, { method: "DELETE" });
  },

  // ── Settings ─────────────────────────────────────────────────────────────────

  getSettings(): Promise<Settings> {
    return request("/settings");
  },

  updateSettings(data: Settings): Promise<Settings> {
    return request("/settings", { method: "PUT", body: JSON.stringify(data) });
  },

  // ── Export & Import ───────────────────────────────────────────────────────────

  exportJson(): Promise<Blob> {
    return fetch(`${BASE}/export/json`).then((r) => r.blob());
  },

  exportBackup(): Promise<Blob> {
    return fetch(`${BASE}/export/backup`, { method: "POST" }).then((r) => r.blob());
  },

  exportPlantsCsv(): Promise<Blob> {
    return fetch(`${BASE}/export/plants.csv`).then((r) => r.blob());
  },

  importJson(file: File): Promise<{ garden: Garden; skipped_count: number; skipped_errors: string[] }> {
    const form = new FormData();
    form.append("file", file);
    return request("/export/import/json", { method: "POST", headers: {}, body: form });
  },

  importBackup(file: File): Promise<{ garden: Garden; skipped_count: number; skipped_errors: string[] }> {
    const form = new FormData();
    form.append("file", file);
    return request("/export/import/backup", { method: "POST", headers: {}, body: form });
  },
};

// ── AI chat (outside Api interface — not part of the typed contract yet) ──────

/**
 * A chat message in the conversation history.
 *
 * role "context" is injected when the selected plant changes.
 *   - display_content: shown in the UI (no ID — human-readable)
 *   - content:         sent to the API as an "assistant" message (includes plant_id)
 *
 * This lets the model see the active plant ID without showing it to the user.
 */
export type ChatMessage =
  | { role: "user" | "assistant"; content: string }
  | { role: "context"; content: string; display_content: string };

export function chatWithAi(
  messages: ChatMessage[],
  language: "de" | "en" = "de",
  systemPrompt?: string,
): Promise<{ content: string }> {
  return request("/ai/chat", {
    method: "POST",
    body:   JSON.stringify({ messages, language, system_prompt: systemPrompt }),
  });
}
