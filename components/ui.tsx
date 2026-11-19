"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { QRCodeSVG } from "qrcode.react";
import { ArrowLeft, ArrowUpRight, Check, CheckCheck, Copy, Fingerprint, LoaderCircle, ShieldCheck, X, AlertCircle, FileCheck2 } from "lucide-react";
import type { Job } from "@/lib/types";
import { isPaymentVerified } from "@/lib/types";
import type { MessageKey } from "@/lib/i18n";
import { LanguageToggle, useI18n } from "./providers";
import { api, safeUrl } from "@/lib/client";

export const errorMessage = (error: unknown) => error instanceof Error ? error.message : String(error);

export function Brand({ compact = false, href = "/" }: { compact?: boolean; href?: string }) {
  return <Link href={href} className="brand" aria-label="JëfPass"><span className="monogram" aria-hidden="true">j<span>p</span><i /></span>{!compact && <span>JëfPass<span className="brand-dot">.</span></span>}</Link>;
}

export function Notice({ children, tone = "error" }: { children: ReactNode; tone?: "error" | "success" | "info" }) {
  return <div className={`notice ${tone}`} role={tone === "error" ? "alert" : "status"}><AlertCircle size={17} aria-hidden="true" /><span>{children}</span></div>;
}

export function Loading() {
  const { t } = useI18n();
  return <div className="loading" role="status"><LoaderCircle className="spin" size={22} /><span>{t("loading")}...</span></div>;
}

export function StatusBadge({ state, type }: { state: string; type: "service" | "payment" }) {
  const { t } = useI18n();
  const known = ["QUOTED", "ACCEPTED", "COMPLETED", "ACKNOWLEDGED", "DISPUTED", "NOT_REQUESTED", "INVOICE_CREATED", "PENDING", "UNKNOWN", "SETTLED", "EXPIRED", "FAILED", "CANCELLED", "UNDERPAID", "OVERPAID"];
  return <span className={`badge ${type} state-${state.toLowerCase()}`}><span className="status-dot" />{known.includes(state) ? t(state as MessageKey) : state}</span>;
}

export function JobStates({ job }: { job: Job }) {
  const { t } = useI18n();
  return <div className="state-pair"><div><span className="eyebrow">{t("service")}</span><StatusBadge type="service" state={job.state} /></div><div><span className="eyebrow">{t("payment")}</span><StatusBadge type="payment" state={job.payment?.state || "NOT_REQUESTED"} />{isPaymentVerified(job.payment) && <small className="verified"><ShieldCheck size={13} />{t("verified")}</small>}</div></div>;
}

export function CopyButton({ value, label }: { value: string; label?: string }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2500);
    return () => clearTimeout(timer);
  }, [copied]);
  return <><button type="button" className="button secondary compact" onClick={async () => {
    try { await navigator.clipboard.writeText(value); setCopied(true); setError(""); } catch (error) { setError(errorMessage(error)); }
  }}>{copied ? <Check size={15} /> : <Copy size={15} />}{copied ? t("copied") : label || t("copyLink")}</button>{error && <Notice>{error}</Notice>}</>;
}

export function QRPanel({ value, label, invoice = false }: { value: string; label: string; invoice?: boolean }) {
  const { t } = useI18n();
  const url = invoice ? null : safeUrl(value);
  return <div className="qr-panel"><div className="qr-code"><QRCodeSVG value={value} size={172} level="M" marginSize={2} title={label} /></div><div className="qr-caption"><strong>{label}</strong><p className="mono break-all qr-value">{value}</p><div className="button-row"><CopyButton value={value} label={invoice ? t("copyInvoice") : t("copyLink")} />{url && <a className="icon-button" href={url} target="_blank" rel="noreferrer" title={t("openLink")} aria-label={t("openLink")}><ArrowUpRight size={18} /></a>}</div></div></div>;
}

export function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose(): void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const { t } = useI18n();
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);
  return <dialog ref={dialog} className="modal" aria-labelledby="dialog-title" onCancel={event => { event.preventDefault(); onClose(); }} onClick={event => { if (event.target === event.currentTarget) onClose(); }}><div className="modal-header"><h2 id="dialog-title">{title}</h2><button className="icon-button" type="button" onClick={onClose} title={t("close")} aria-label={t("close")}><X size={20} /></button></div>{children}</dialog>;
}

export function PassportMotif({ name }: { name?: string }) {
  const { t } = useI18n();
  return <div className="passport-motif" aria-hidden="true"><div className="paper-top"><Fingerprint size={27} /><span>JefPass<br /><small>{t("document")}</small></span><span className="paper-cross">+</span></div><div className="paper-owner">{name || t("documentSub")}</div><div className="paper-lines"><i /><i /><i /></div><div className="paper-bottom"><span className="paper-stamp"><CheckCheck size={21} /></span><div className="paper-barcode" /><FileCheck2 size={23} /></div></div>;
}

export function PublicShell({ children, network }: { children: ReactNode; network?: string }) {
  const { t } = useI18n();
  const [configured, setConfigured] = useState("");
  useEffect(() => {
    if (network) return;
    let current = true;
    api<{ network: string }>("/api/session").then(result => { if (current) setConfigured(result.network); }).catch(() => {});
    return () => { current = false; };
  }, [network]);
  const label = network || configured;
  return <div className="public-shell"><header className="public-header"><Brand /><LanguageToggle /></header><main className="public-main"><div className="network-banner"><span className="status-dot" />{label ? label.toUpperCase() : t("notConnected")}{["regtest", "signet", "testnet"].includes(label.toLowerCase()) && ` / ${t("noMoney")}`}</div>{children}</main><footer className="public-footer"><Link href="/app"><ArrowLeft size={14} />{t("back")}</Link><span>{t("tagline")}</span></footer></div>;
}

export function DataRecord({ value }: { value: unknown }) {
  if (value === null || value === undefined) return <span className="muted">—</span>;
  if (typeof value !== "object") return <span className="break-all">{typeof value === "boolean" ? String(value) : String(value)}</span>;
  if (Array.isArray(value)) return <div className="record-array">{value.length ? value.map((item, index) => <DataRecord key={index} value={item} />) : <span>[]</span>}</div>;
  return <dl className="data-record">{Object.entries(value).map(([key, item]) => <div key={key}><dt>{key.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/_/g, " ")}</dt><dd><DataRecord value={item} /></dd></div>)}</dl>;
}