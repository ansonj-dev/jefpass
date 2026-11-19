"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SimplePool } from "nostr-tools";
import { ArrowUpRight, Check, CheckCheck, FileCheck2, Link2, LoaderCircle, Radio, RefreshCw, ShieldCheck, Wallet, X } from "lucide-react";
import { api, customerConfirmationUrl, getJob, receiptCommitmentContent, verifyReceiptEvent, type Receipt } from "@/lib/client";
import { isPaymentVerified, type Job, type Worker } from "@/lib/types";
import { useI18n } from "./providers";
import { errorMessage, JobStates, Notice, QRPanel } from "./ui";

export function JobDetail({ job, worker, customerUrl, walletConnected, onUpdated, onClose }: {
  job: Job; worker: Worker; customerUrl?: string; walletConnected: boolean;
  onUpdated(job: Job, url?: string): void; onClose(): void;
}) {
  const { t, language } = useI18n();
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [relays, setRelays] = useState(process.env.NEXT_PUBLIC_NOSTR_RELAYS || "");
  const [hasSigner, setHasSigner] = useState(false);
  useEffect(() => { setHasSigner(!!window.nostr); }, []);
  useEffect(() => {
    let current = true;
    setReceipt(null);
    if (job.receiptId) api<{ receipt: Receipt }>(`/api/receipts/${encodeURIComponent(job.receiptId)}`).then(result => { if (current) setReceipt(result.receipt); }).catch(error => { if (current) setError(errorMessage(error)); });
    return () => { current = false; };
  }, [job.receiptId]);
  const path = `/api/jobs/${encodeURIComponent(job.id)}`;
  async function run(action: string, handler: () => Promise<void>) {
    if (busy) return;
    setBusy(action); setError(""); setMessage("");
    try { await handler(); } catch (error) { setError(errorMessage(error)); } finally { setBusy(""); }
  }
  async function refresh() { const result = await getJob(job.id); onUpdated(result.job); }
  async function mutation(action: string) {
    if (action === "share") { const result = await api<{ customerUrl: string }>(`${path}/share`, "POST", {}); onUpdated(job, result.customerUrl); return; }
    if (action === "receipt") { const result = await api<{ receipt: Receipt }>(`${path}/receipt`, "POST", {}); await refresh(); setReceipt(result.receipt); return; }
    await api(`${path}/${action}`, "POST", {});
    await refresh();
  }
  async function publish() {
    if (!window.nostr) throw new Error(t("signerUnavailable"));
    if (!receipt?.commitment) throw new Error(t("noCommitment"));
    const relayUrls = [...new Set(relays.split(",").map(value => value.trim()).filter(Boolean))];
    if (!relayUrls.length || relayUrls.length > 8 || relayUrls.some(value => { try { const url = new URL(value); return url.protocol !== "wss:" || !!url.username || !!url.password; } catch { return true; } })) throw new Error(t("relayHint"));
    const pubkey = await window.nostr.getPublicKey();
    if (pubkey !== worker.pubkey) throw new Error(t("keyMismatch"));
    const content = receiptCommitmentContent(receipt);
    const createdAt = Math.floor(Date.now() / 1000);
    const signed = await window.nostr.signEvent({ kind: 30078, content, tags: [["d", receipt.id]], created_at: createdAt });
    const event = JSON.parse(JSON.stringify(signed)) as typeof signed;
    if (event.created_at !== createdAt || !verifyReceiptEvent(event, receipt, pubkey)) throw new Error(t("unverified"));
    const pool = new SimplePool();
    let acknowledged: string[];
    try {
      const results = await Promise.allSettled(pool.publish(relayUrls, event, { maxWait: 10000 }));
      acknowledged = relayUrls.filter((_, index) => results[index].status === "fulfilled");
      if (!acknowledged.length) throw new Error(results.map(result => result.status === "rejected" ? errorMessage(result.reason) : "").filter(Boolean).join("; "));
    } finally { pool.destroy(); }
    try {
      await api(`/api/receipts/${encodeURIComponent(receipt.id)}/nostr`, "POST", { event, relays: acknowledged });
    } catch (error) {
      throw new Error(`${language === "fr" ? "Publié sur" : "Published to"} ${acknowledged.join(", ")}. ${language === "fr" ? "Enregistrement serveur impossible :" : "Server registration failed:"} ${errorMessage(error)}`);
    }
    setMessage(t("published"));
  }
  const canComplete = job.state === "ACCEPTED";
  const retryKnownPreflightFailure = job.payment?.state === "FAILED" && !job.payment.invoice && !job.payment.paymentHash;
  const canInvoice = ["COMPLETED", "ACKNOWLEDGED"].includes(job.state) && (!job.payment || retryKnownPreflightFailure);
  const canReconcile = !!job.payment?.invoice && !!job.payment.paymentHash && job.payment.state !== "SETTLED";
  const canReceipt = !!job.completedAt && ["COMPLETED", "ACKNOWLEDGED", "DISPUTED"].includes(job.state);
  const receiptId = receipt?.id || job.receiptId;
  return <section className="detail-panel" aria-label={t("jobRecord")}><div className="detail-header"><div><span className="eyebrow">{t("jobRecord")} / {job.id.slice(0, 8)}</span><h2>{job.title}</h2></div><div className="button-row"><button className="icon-button" title={t("refresh")} aria-label={t("refresh")} disabled={!!busy} onClick={() => run("refresh", refresh)}><RefreshCw size={15} className={busy === "refresh" ? "spin" : ""} /></button><button className="icon-button" title={t("close")} aria-label={t("close")} onClick={onClose}><X size={16} /></button></div></div><div className="detail-body">
    <p className="detail-description">{job.description}</p><div className="detail-facts"><div><span className="muted">{t("amount")}</span><strong>{job.amountSats.toLocaleString(language)} <small>{t("sats")}</small></strong>{job.displayAmount && <span className="muted">{job.displayAmount}</span>}</div><div><span className="muted">{t("date")}</span><p>{new Date(job.createdAt).toLocaleDateString(language)}</p>{job.dueDate && <><span className="muted">{t("dueDate")}</span><p>{job.dueDate}</p></>}</div></div><JobStates job={job} />
    {error && <Notice>{error}</Notice>}{message && <Notice tone="success">{message}</Notice>}
    <div><h3>{t("customerLink")}</h3><p className="section-copy">{t("shareCopy")}</p>{customerUrl ? <QRPanel value={customerConfirmationUrl(customerUrl)} label={t("customerLink")} /> : <button className="button secondary full" disabled={!!busy} onClick={() => run("share", () => mutation("share"))}>{busy === "share" ? <LoaderCircle size={16} className="spin" /> : <Link2 size={16} />}{t("generateLink")}</button>}</div>
    <div className="detail-section"><h3>{t("service")}</h3><div className="workflow-track">{(["QUOTED", "ACCEPTED", "COMPLETED", "ACKNOWLEDGED"] as const).map((state, index) => <span key={state} className={job.state === "DISPUTED" ? "" : ["QUOTED", "ACCEPTED", "COMPLETED", "ACKNOWLEDGED"].indexOf(job.state) >= index ? "done" : ""}><i>{index + 1}</i>{t(state)}</span>)}</div>{canComplete && <button className="button primary full" disabled={!!busy} onClick={() => run("complete", () => mutation("complete"))}><CheckCheck size={16} />{t("complete")}</button>}</div>
    <div className="detail-section"><h3>{t("payment")}</h3><p>{t("paymentNote")}</p>{job.payment?.state === "SETTLED" && !isPaymentVerified(job.payment) && <Notice tone="info">{t("notVerifiedYet")}</Notice>}{job.payment?.invoice && <QRPanel value={job.payment.invoice} label={`${t("invoiceTitle")} · ${job.amountSats.toLocaleString(language)} SAT · ${job.payment.network}`} invoice />}{job.payment?.error && <Notice>{job.payment.error}</Notice>}<div className="detail-actions">{canInvoice && <button className="button primary full" disabled={!!busy || !walletConnected} onClick={() => run("invoice", () => mutation("invoice"))}><Wallet size={16} />{t(retryKnownPreflightFailure ? "retryInvoice" : "invoice")}</button>}{canInvoice && !walletConnected && <p className="section-copy">{t("noWallet")}</p>}{canReconcile && <button className="button secondary full" disabled={!!busy || !walletConnected} onClick={() => run("reconcile", () => mutation("reconcile"))}><RefreshCw size={15} />{t("reconcile")}</button>}
      {job.payment?.state === "UNKNOWN" && !job.payment.paymentHash && <Notice tone="info">{t("unknownInvoice")}</Notice>}</div></div>
    <div className="detail-section"><h3>{t("receipt")}</h3><p>{t("receiptHint")}</p>
      {receiptId && <Link className="button secondary full" href={`/verify/${encodeURIComponent(receiptId)}`}><FileCheck2 size={16} />{t("viewReceipt")}<ArrowUpRight size={15} /></Link>}
      <button className="button secondary full" disabled={!!busy || !canReceipt} onClick={() => run("receipt", () => mutation("receipt"))}><ShieldCheck size={16} />{t(receiptId ? "issueSnapshot" : "issueReceipt")}</button>
      {!receiptId && !canReceipt && <p className="section-copy">{t("complete")}</p>}{receipt && <div className="receipt-publish"><label className="field">{t("relays")}<input type="text" placeholder="wss://relay.example.com" value={relays} onChange={event => setRelays(event.target.value)} /><small>{t("relayHint")}</small></label><p className="section-copy">{t("receiptSignHint")}</p><button className="button secondary full" disabled={!!busy || !hasSigner || !worker.pubkey || !receipt.commitment || !relays.trim()} onClick={() => run("publish", publish)}><Radio size={15} />{t("publish")}</button>{!hasSigner && <p className="section-copy">{t("signerUnavailable")}</p>}{hasSigner && !worker.pubkey && <p className="section-copy">{t("connectSigner")} / {t("connections")}</p>}</div>}</div>
    <div className="detail-section"><label className="switch-label"><input type="checkbox" role="switch" checked={job.shared} disabled={!!busy || (!job.shared && (!receiptId || !job.completedAt))} onChange={event => { const shared = event.target.checked; run("visibility", async () => { await api(`${path}/visibility`, "POST", { shared }); await refresh(); }); }} />{t("publicJob")}</label><p className="switch-hint">{t("visibilityHint")}</p></div>{busy && <span className="draft-status" role="status"><LoaderCircle size={13} className="spin" />{t("pending")}...</span>}
  </div></section>;
}