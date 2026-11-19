"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Check, CloudOff, LoaderCircle, Plus, Sparkles } from "lucide-react";
import { api, type JobInput } from "@/lib/client";
import type { Job } from "@/lib/types";
import { clearDraft, emptyDraft, queueJob, readDraft, saveDraft, type Draft } from "@/lib/offline";
import { useI18n } from "./providers";
import { errorMessage, Modal, Notice } from "./ui";

export function JobEditor({ workerId, onClose, onCreated, onQueued }: {
  workerId: string;
  onClose(): void;
  onCreated(job: Job, url: string): void;
  onQueued(): void;
}) {
  const { t, language } = useI18n();
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [ready, setReady] = useState(false);
  const [saved, setSaved] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiMode, setAiMode] = useState("");
  const [error, setError] = useState("");
  const clientId = useRef(crypto.randomUUID());
  useEffect(() => {
    let current = true;
    readDraft(workerId).then(value => { if (current && value) setDraft({ ...emptyDraft, ...value }); }).catch(() => { if (current) setStorageError(true); }).finally(() => { if (current) setReady(true); });
    return () => { current = false; };
  }, [workerId]);
  useEffect(() => {
    if (!ready) return;
    let current = true;
    setSaved(false);
    saveDraft(workerId, draft).then(() => { if (current) setSaved(true); }).catch(() => { if (current) setStorageError(true); });
    return () => { current = false; };
  }, [draft, ready, workerId]);
  function update(field: keyof Draft, value: string) { setDraft(previous => ({ ...previous, [field]: value })); }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amountSats = Number(draft.amount);
    if (!Number.isSafeInteger(amountSats) || amountSats <= 0 || amountSats > Math.floor(Number.MAX_SAFE_INTEGER / 1000)) { setError(`${t("amount")}: 1 – ${Math.floor(Number.MAX_SAFE_INTEGER / 1000)} ${t("sats")}`); return; }
    if (!draft.title.trim() || !draft.description.trim()) return;
    setBusy(true); setError("");
    const input: JobInput = { title: draft.title.trim(), description: draft.description.trim(), category: draft.category, amountSats, currency: "SAT", clientId: clientId.current, ...(draft.displayAmount.trim() ? { displayAmount: draft.displayAmount.trim() } : {}), ...(draft.dueDate ? { dueDate: draft.dueDate } : {}) };
    async function enqueue() {
      await queueJob(workerId, input);
      await clearDraft(workerId);
      onQueued();
    }
    try {
      if (!navigator.onLine) { await enqueue(); return; }
      let result: { job: Job; customerUrl: string };
      try { result = await api("/api/jobs", "POST", input); }
      catch (error) { if (error instanceof TypeError) { await enqueue(); return; } throw error; }
      await clearDraft(workerId).catch(() => {});
      onCreated(result.job, result.customerUrl);
    } catch (error) { setError(errorMessage(error)); } finally { setBusy(false); }
  }
  async function draftWithAI() {
    setAiBusy(true); setError("");
    try {
      const result = await api<{ draft: { title: string; description: string; category: string }; mode: string }>("/api/ai/draft", "POST", { text: draft.description, language });
      setDraft(previous => ({ ...previous, ...result.draft }));
      setAiMode(result.mode);
    } catch { setError(t("aiUnavailable")); } finally { setAiBusy(false); }
  }
  return <Modal title={t("newJob")} onClose={() => { if (!busy && !aiBusy) onClose(); }}><p className="form-intro">{t("createHint")}</p><form onSubmit={submit} className="form-stack"><fieldset disabled={!ready || busy || aiBusy} className="editor-fields"><label>{t("title")}<input autoFocus value={draft.title} onChange={event => update("title", event.target.value)} maxLength={160} required /></label><label>{t("description")}<textarea value={draft.description} onChange={event => update("description", event.target.value)} maxLength={4000} required rows={4} /></label><div className="ai-row"><button className="text-button" type="button" onClick={draftWithAI} disabled={!draft.description.trim() || !navigator.onLine}>{aiBusy ? <LoaderCircle size={14} className="spin" /> : <Sparkles size={14} />}{t("ai")}</button>{aiMode && <span className="ai-mode">{aiMode}</span>}</div>{aiMode && <Notice tone="info">{t("aiHint")}</Notice>}<div className="form-grid"><label>{t("category")}<select value={draft.category} onChange={event => update("category", event.target.value)}>{[...new Set(["repair", "electrical", "plumbing", "tailoring", "other", draft.category])].map(value => <option key={value} value={value}>{["repair", "electrical", "plumbing", "tailoring", "other"].includes(value) ? t(value as "repair") : value}</option>)}</select></label><label>{t("amount")} (SAT)<input type="number" inputMode="numeric" min="1" max={Math.floor(Number.MAX_SAFE_INTEGER / 1000)} step="1" required value={draft.amount} onChange={event => update("amount", event.target.value)} /></label></div><div className="form-grid"><label>{t("dueDate")}<input type="date" value={draft.dueDate} onChange={event => update("dueDate", event.target.value)} /></label><label>{t("displayAmount")}<input value={draft.displayAmount} onChange={event => update("displayAmount", event.target.value)} maxLength={80} /></label></div><small className="muted">{t("referenceHint")}</small></fieldset>{storageError && <Notice>{t("draftError")}</Notice>}{error && <Notice>{error}</Notice>}<div className="form-footer"><span className="draft-status">{saved ? <Check size={13} /> : <CloudOff size={13} />}{t(saved ? "savedLocally" : "saving")}</span><div className="editor-bottom"><button type="button" className="button secondary" disabled={busy || aiBusy} onClick={onClose}>{t("cancel")}</button><button className="button primary" disabled={busy || aiBusy || !ready}>{busy ? <LoaderCircle size={16} className="spin" /> : <Plus size={16} />}{t("createJob")}</button></div></div></form></Modal>;
}