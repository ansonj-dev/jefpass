import { del, get, set, update } from "idb-keyval";
import { api, type JobInput, type Session } from "./client";

export interface Draft {
  title: string;
  description: string;
  category: string;
  amount: string;
  displayAmount: string;
  dueDate: string;
}

export const emptyDraft: Draft = {
  title: "", description: "", category: "repair", amount: "", displayAmount: "", dueDate: "",
};

export const readDraft = (workerId: string) => get<Draft>(`jefpass:draft:${workerId}`);
export const saveDraft = (workerId: string, draft: Draft) => set(`jefpass:draft:${workerId}`, draft);
export const clearDraft = (workerId: string) => del(`jefpass:draft:${workerId}`);
const queueKey = (workerId: string) => `jefpass:queue:${workerId}`;
export const readQueue = async (workerId: string): Promise<JobInput[]> => (await get<JobInput[]>(queueKey(workerId))) || [];

export async function queueJob(workerId: string, input: JobInput) {
  if (!input.clientId) throw new Error("A client ID is required for offline creation.");
  await update<JobInput[]>(queueKey(workerId), current => [...(current || []).filter(item => item.clientId !== input.clientId), input]);
}

export async function flushQueue(workerId: string, onCreated?: () => void) {
  const queued = await readQueue(workerId);
  for (const input of queued) {
    const session = await api<Session>("/api/session");
    if (session.worker?.id !== workerId) throw new Error("Sign in to the draft owner's account to synchronize.");
    await api("/api/jobs", "POST", input);
    await update<JobInput[]>(queueKey(workerId), current => (current || []).filter(item => item.clientId !== input.clientId));
    onCreated?.();
  }
  return (await readQueue(workerId)).length;
}