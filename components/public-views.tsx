"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { finalizeEvent, generateSecretKey } from "nostr-tools";
import { bytesToHex, hexToBytes } from "nostr-tools/utils";
import { ArrowUpRight, Check, CheckCheck, FileCheck2, Fingerprint, LoaderCircle, RefreshCw, ShieldCheck, ShieldQuestion, TriangleAlert } from "lucide-react";
import { absoluteUrl, api, verifyReceiptEvent, verifyReceiptInBrowser, type Receipt, type ReceiptVerificationRecord, type Session } from "@/lib/client";
import { CUSTOMER_PROOF_KIND, isPaymentVerified, type Job, type Worker } from "@/lib/types";
import { useI18n } from "./providers";
import { DataRecord, errorMessage, JobStates, Loading, Notice, PublicShell, QRPanel, StatusBadge } from "./ui";

function usePublicResource<T>(path: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let current = true;
    setLoading(true); setError("");
    api<T>(path).then(value => { if (current) setData(value); }).catch(error => { if (current) setError(errorMessage(error)); }).finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [path, revision]);
  return { data, error, loading, refresh: () => setRevision(previous => previous + 1) };
}

function Refresh({ onClick, busy }: { onClick(): void; busy: boolean }) {
  const { t } = useI18n();
  return <div className="public-refresh"><button className="button secondary compact" onClick={onClick} disabled={busy}><RefreshCw size={14} className={busy ? "spin" : ""} />{t("refresh")}</button></div>;
}

interface CustomerRecord {
  job: Job;
  worker: Worker;
  challenge: { jobId: string; scopeHash: string; action: string; nonce: string };
}

export function CustomerConfirmation() {
  const { token } = useParams<{ token: string }>();
  const { t, language } = useI18n();
  const path = `/api/customer/${encodeURIComponent(token)}`;
  const { data, error, loading, refresh } = usePublicResource<CustomerRecord>(path);
  const [busy, setBusy] = useState("");
  const [actionError, setActionError] = useState("");
  const [message, setMessage] = useState("");
  async function act(action: "accept" | "acknowledge" | "dispute") {
    if (!data || busy) return;
    setBusy(action); setActionError(""); setMessage("");
    try {
      const fresh = await api<CustomerRecord>(path);
      if (fresh.job.id !== data.job.id || fresh.challenge.jobId !== fresh.job.id || fresh.challenge.scopeHash !== data.challenge.scopeHash || fresh.job.state !== data.job.state) {
        refresh();
        throw new Error(language === "fr" ? "Le travail a changé. Relisez-le avant de confirmer." : "The job has changed. Review it again before confirming.");
      }
      if (action !== "dispute" && fresh.challenge.action !== action) throw new Error(language === "fr" ? "Cette action n'est pas disponible pour ce travail." : "This action is not available for this job.");
      const storageKey = `jefpass:customer:${fresh.job.id}`;
      let stored = sessionStorage.getItem(storageKey);
      if (!stored && fresh.job.acceptedAt) throw new Error(language === "fr" ? "La clé de confirmation manque dans cette session. Revenez au navigateur utilisé pour accepter." : "The confirmation key is missing from this session. Return to the browser used to accept this job.");
      if (!stored) { stored = bytesToHex(generateSecretKey()); sessionStorage.setItem(storageKey, stored); }
      const secret = hexToBytes(stored);
      const event = finalizeEvent({ kind: CUSTOMER_PROOF_KIND, content: JSON.stringify({ ...fresh.challenge, action }), tags: [], created_at: Math.floor(Date.now() / 1000) }, secret);
      await api(path, "POST", { action, event });
      setMessage(t("customerDone")); refresh();
    } catch (error) { setActionError(errorMessage(error)); } finally { setBusy(""); }
  }
  const job = data?.job;
  return <PublicShell network={job?.payment?.network}>
    <span className="eyebrow muted">{t("customerLink")}</span><h1>{t("customerTitle")}</h1><p className="muted">{t("customerSubtitle")}</p>
    {error && <Notice>{error}</Notice>}{!data && loading && <Loading />}
    {data && <>
      <section className="public-document">
        <div className="document-heading"><div><span className="eyebrow muted">{t("worker")} / {data.worker.name}</span><h2>{data.job.title}</h2><p>{data.worker.occupation}</p></div><FileCheck2 size={28} strokeWidth={1.5} /></div>
        <p className="detail-description">{data.job.description}</p>
        <div className="detail-facts"><div><span className="muted">{t("amount")}</span><strong>{data.job.amountSats.toLocaleString(language)} SAT</strong>{data.job.displayAmount && <span className="muted">{data.job.displayAmount}</span>}</div>{data.job.dueDate && <div><span className="muted">{t("dueDate")}</span><p>{data.job.dueDate}</p></div>}</div>
        <JobStates job={data.job} />
        {actionError && <Notice>{actionError}</Notice>}{message && <Notice tone="success">{message}</Notice>}
        <p className="section-copy">{t("consent")}</p>
        <div className="button-row">
          {data.job.state === "QUOTED" && data.challenge.action === "accept" && <button className="button primary" disabled={!!busy || loading} onClick={() => act("accept")}>{busy === "accept" ? <LoaderCircle size={17} className="spin" /> : <Check size={17} />}{t("accept")}</button>}
          {data.job.state === "COMPLETED" && data.challenge.action === "acknowledge" && <button className="button primary" disabled={!!busy || loading} onClick={() => act("acknowledge")}><CheckCheck size={17} />{t("acknowledge")}</button>}
          {["QUOTED", "ACCEPTED", "COMPLETED", "ACKNOWLEDGED", "DISPUTED"].includes(data.job.state) && <button className="button danger" disabled={!!busy || loading} onClick={() => act("dispute")}><TriangleAlert size={16} />{t("dispute")}</button>}
        </div>
        {data.job.payment?.invoice && <section className="detail-section invoice-section"><h3>{t("invoiceTitle")}</h3><p>{t("invoiceHint")}</p><QRPanel value={data.job.payment.invoice} label={`${data.job.amountSats.toLocaleString(language)} SAT · ${data.job.payment.network}`} invoice /></section>}
        {data.job.receiptId && <Link className="button secondary" href={`/verify/${encodeURIComponent(data.job.receiptId)}`}><ShieldCheck size={16} />{t("viewReceipt")}</Link>}
      </section>
      <div className="public-note"><Fingerprint size={21} /><p>{t("customerPrivacy")}</p></div>
    </>}
    <Refresh onClick={refresh} busy={loading || !!busy} />
  </PublicShell>;
}

export function ReceiptVerification() {
  const { id } = useParams<{ id: string }>();
  const { t, language } = useI18n();
  const { data, error, loading, refresh } = usePublicResource<{ receipt: Receipt; verification: ReceiptVerificationRecord }>(`/api/receipts/${encodeURIComponent(id)}`);
  const [browser, setBrowser] = useState<{ signatureValid: boolean; commitmentValid: boolean; trustedIssuer: boolean | null; workerSignature: boolean | null } | null>(null);
  const [browserError, setBrowserError] = useState("");
  useEffect(() => {
    let current = true;
    setBrowser(null); setBrowserError("");
    if (!data) return;
    const record = data;
    async function verify() {
      try {
        const checks = await verifyReceiptInBrowser(record.receipt);
        const session = await api<Session>("/api/session").catch(() => null);
        const trustedIssuer = session?.receiptPublicKey ? record.receipt.issuer.type === "server" && record.receipt.issuer.algorithm === "Ed25519" && record.receipt.issuer.publicKey === session.receiptPublicKey : null;
        const event = record.verification.workerSignature?.event;
        const workerSignature = event ? checks.commitmentValid && verifyReceiptEvent(event, record.receipt) : null;
        if (current) setBrowser({ ...checks, trustedIssuer, workerSignature });
      } catch (error) { if (current) setBrowserError(errorMessage(error)); }
    }
    void verify();
    return () => { current = false; };
  }, [data]);
  return <PublicShell network={data?.receipt.payment?.network ?? undefined}>
    <span className="eyebrow muted">{t("publicRecord")}</span><h1>{t("verificationTitle")}</h1><p className="muted break-all">JefPass / {id}</p>
    {error && <Notice>{error}</Notice>}{!data && loading && <Loading />}
    {data && <><section className="public-document">
      <div className="document-heading"><div><span className="eyebrow muted">{t("receipt")}</span><h2>{t("recordedFacts")}</h2><p className="mono break-all">{data.receipt.id || id}</p></div><ShieldCheck size={29} strokeWidth={1.5} /></div>
      <dl className="data-record">
        <div><dt>{t("amount")}</dt><dd>{typeof data.receipt.amountSats === "number" ? data.receipt.amountSats.toLocaleString(language) : "?"} SAT</dd></div>
        <div><dt>{t("service")}</dt><dd><StatusBadge state={String(data.receipt.serviceState)} type="service" /></dd></div>
        <div><dt>{t("payment")}</dt><dd><StatusBadge state={data.receipt.payment.state} type="payment" /></dd></div>
      </dl>
      <section className="verification-section"><h2>{t("browserVerification")}</h2>
        {!browser && !browserError && <Loading />}
        {browserError && <Notice>{t("browserVerificationUnavailable")}: {browserError}</Notice>}
        {browser && <div role="status"><dl className="data-record">
          <div><dt>{t("receiptIntegrity")}</dt><dd>{t(browser.commitmentValid ? "verified" : "unverified")}</dd></div>
          <div><dt>{t("issuerSignature")}</dt><dd>{t(browser.signatureValid ? "verified" : "unverified")}</dd></div>
          <div><dt>{t("issuerTrust")}</dt><dd>{t(browser.trustedIssuer === null ? "unavailable" : browser.trustedIssuer ? "verified" : "unverified")}</dd></div>
          <div><dt>{t("nostrBinding")}</dt><dd>{t(browser.workerSignature === null ? "noAttachment" : browser.workerSignature ? "verified" : "unverified")}</dd></div>
        </dl></div>}
        <p className="section-copy">{t("issuerTrustHint")}</p><p className="section-copy">{t("nostrTrustHint")}</p>
      </section>
      <details><summary>{t("serverVerification")}</summary><DataRecord value={data.verification} /></details>
      <details><summary>{t("rawRecord")}</summary><pre>{JSON.stringify(data.receipt, null, 2)}</pre></details>
      <div className="receipt-qr"><QRPanel value={absoluteUrl(`/verify/${encodeURIComponent(id)}`)} label={t("viewReceipt")} /></div>
    </section><div className="public-note"><ShieldQuestion size={23} /><div><h3>{t("claims")}</h3><p>{t("claimsCopy")}</p></div></div></>}
    <Refresh onClick={refresh} busy={loading} />
  </PublicShell>;
}

export function PublicPassport() {
  const { id } = useParams<{ id: string }>();
  const { t, language } = useI18n();
  const { data, error, loading, refresh } = usePublicResource<{ worker: Worker; jobs: Job[]; receipts: Receipt[] }>(`/api/passport/${encodeURIComponent(id)}`);
  const shared = data?.jobs.filter(job => job.shared) || [];
  const sharedReceiptIds = new Set(shared.map(job => job.receiptId).filter(Boolean));
  const receipts = data?.receipts.filter(receipt => sharedReceiptIds.has(receipt.id)) || [];
  return <PublicShell><span className="eyebrow muted">{t("publicPassport")}</span>{error && <Notice>{error}</Notice>}{!data && loading && <Loading />}{data && <><header className="public-profile"><span className="avatar">{data.worker.name.slice(0, 1).toUpperCase()}</span><div><h1>{data.worker.name}</h1><p>{data.worker.occupation}</p></div></header>{data.worker.bio && <p className="public-bio">{data.worker.bio}</p>}{data.worker.pubkey && <p className="mono break-all muted">{data.worker.pubkey}</p>}<div className="stats">{([{ label: "jobs", count: shared.length }, { label: "paid", count: shared.filter(job => isPaymentVerified(job.payment)).length }, { label: "receipts", count: receipts.length }] as const).map(item => <div className="stat" key={item.label}><div className="stat-label">{t(item.label)}</div><div className="stat-number">{item.count.toLocaleString(language)}</div></div>)}</div>
    <section className="public-records"><div className="section-heading"><h2>{t("jobs")}</h2><ShieldCheck size={18} color="var(--emerald)" /></div><p className="section-copy">{t("noShared")}</p>
      {!shared.length ? <div className="empty-state"><div className="empty-icon"><FileCheck2 size={25} /></div><h3>{t("passportEmpty")}</h3></div> : shared.map(job => <article key={job.id} className="public-job">
        <div><h3>{["repair", "electrical", "plumbing", "tailoring", "other"].includes(job.category) ? t(job.category as "repair") : job.category} / {job.id.slice(0, 8)}</h3>
          <div className="job-meta">{new Date(job.createdAt).toLocaleDateString(language)} · {job.amountSats.toLocaleString(language)} SAT</div>
          <div className="job-row-states"><StatusBadge state={job.state} type="service" /><StatusBadge state={job.payment?.state || "NOT_REQUESTED"} type="payment" />{isPaymentVerified(job.payment) && <span className="verified"><ShieldCheck size={13} />{t("verified")}</span>}</div>
        </div>{job.receiptId && receipts.some(receipt => receipt.id === job.receiptId) && <Link className="button secondary compact" href={`/verify/${encodeURIComponent(job.receiptId)}`} aria-label={`${t("viewReceipt")} / ${job.id.slice(0, 8)}`}>{t("viewReceipt")}<ArrowUpRight size={14} /></Link>}
      </article>)}
    </section><div className="public-note"><ShieldQuestion size={20} /><p>{t("receiptHint")}</p></div></>}<Refresh onClick={refresh} busy={loading} /></PublicShell>;
}