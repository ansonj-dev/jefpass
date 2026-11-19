"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { ArrowUpRight, Download, Fingerprint, KeyRound, LoaderCircle, LogOut, PlugZap, Save, ShieldCheck, Unplug, Wallet } from "lucide-react";
import { absoluteUrl, api, type Session } from "@/lib/client";
import type { Worker } from "@/lib/types";
import { useI18n } from "./providers";
import { errorMessage, Notice, PassportMotif, QRPanel } from "./ui";

type AccountProps = { session: Session & { worker: Worker }; onSession(): Promise<void>; onWorker(worker: Worker): void };

export function Profile({ session, onWorker, onLogout }: AccountProps & { onLogout(): Promise<void> }) {
  const { t } = useI18n();
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const worker = session.worker;
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy("profile"); setError(""); setSaved(false);
    try {
      const input = { name: String(form.get("name")).trim(), occupation: String(form.get("occupation")).trim(), bio: String(form.get("bio")).trim(), ...(worker.pubkey ? { pubkey: worker.pubkey } : {}) };
      const result = await api<{ worker?: Worker }>("/api/profile", "POST", input);
      onWorker(result?.worker || { ...worker, ...input }); setSaved(true);
    } catch (error) { setError(errorMessage(error)); } finally { setBusy(""); }
  }
  async function download() {
    setBusy("export"); setError("");
    try {
      const data = await api<unknown>("/api/export");
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
      const anchor = document.createElement("a");
      anchor.href = url; anchor.download = `jefpass-private-${new Date().toISOString().slice(0, 10)}.json`;
      anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) { setError(errorMessage(error)); } finally { setBusy(""); }
  }
  return <><div className="page-heading"><div><h1>{t("profile")}</h1><p>{t("profileTitle")}</p></div></div><div className="account-grid"><div><section className="account-section"><form className="form-stack" onSubmit={submit}><label>{t("name")}<input name="name" defaultValue={worker.name} required maxLength={100} autoComplete="name" /></label><label>{t("occupation")}<input name="occupation" defaultValue={worker.occupation} required maxLength={100} autoComplete="organization-title" /></label><label>{t("bio")}<textarea name="bio" defaultValue={worker.bio} maxLength={1500} rows={5} /></label>{worker.pubkey && <label>{t("publicKey")}<input readOnly value={worker.pubkey} className="mono" /></label>}{saved && <Notice tone="success">{t("saved")}</Notice>}{error && <Notice>{error}</Notice>}<button className="button primary" disabled={!!busy}>{busy === "profile" ? <LoaderCircle size={16} className="spin" /> : <Save size={16} />}{t("save")}</button></form></section><section className="export-section"><h3>{t("privateExport")}</h3><p>{t("exportHint")}</p><button className="button secondary" disabled={!!busy} onClick={download}><Download size={16} />{t("download")}</button></section><button className="text-button" disabled={!!busy} onClick={async () => { setBusy("logout"); setError(""); try { await onLogout(); } catch (error) { setError(errorMessage(error)); } finally { setBusy(""); } }}><LogOut size={16} />{t("signOut")}</button></div><aside className="account-aside"><h3>{t("publicPassport")}</h3><p className="section-copy">{t("passportCopy")}</p><div className="identity-row"><span className="avatar">{worker.name.slice(0, 1).toUpperCase()}</span><div><h3>{worker.name}</h3><p>{worker.occupation}</p></div></div><QRPanel value={absoluteUrl(`/passport/${encodeURIComponent(worker.id)}`)} label={t("publicPassport")} /></aside></div></>;
}

export function Connections({ session, onSession, onWorker }: AccountProps) {
  const { t } = useI18n();
  const [uri, setUri] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [signer, setSigner] = useState(false);
  useEffect(() => { setSigner(!!window.nostr); }, []);
  async function run(action: string, handler: () => Promise<void>) {
    setBusy(action); setError(""); setMessage("");
    try { await handler(); } catch (error) { setError(errorMessage(error)); } finally { setBusy(""); }
  }
  async function connect(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await run("wallet", async () => {
      const request = api("/api/wallet", "POST", { uri });
      setUri("");
      await request; await onSession(); setMessage(t("saved"));
    });
  }
  async function connectSigner() {
    if (!window.nostr) throw new Error(t("signerUnavailable"));
    const pubkey = await window.nostr.getPublicKey();
    if (!/^[0-9a-f]{64}$/i.test(pubkey)) throw new Error(t("unverified"));
    const worker = { ...session.worker, pubkey };
    const result = await api<{ worker?: Worker }>("/api/profile", "POST", { name: worker.name, occupation: worker.occupation, bio: worker.bio, pubkey });
    onWorker(result?.worker || worker); setMessage(t("saved"));
  }
  return <><div className="page-heading"><div><h1>{t("connections")}</h1><p>{t("connectionsTitle")}</p></div></div>{error && <div className="account-message"><Notice>{error}</Notice></div>}{message && <div className="account-message"><Notice tone="success">{message}</Notice></div>}<div className="account-grid"><section className="account-section"><div className="connection-icon"><Wallet size={23} /></div><h2>{t("walletTitle")}</h2><p>{t("walletCopy")}</p><div className="connection-meta"><span>{t(session.wallet?.connected ? "connected" : "notConnected")}</span><span>{session.wallet?.network || session.network}</span>{session.wallet?.source && <span>{session.wallet.source}</span>}</div>{session.wallet?.connected ? <button className="button secondary" disabled={!!busy} onClick={() => run("wallet", async () => { await api("/api/wallet", "DELETE"); await onSession(); })}><Unplug size={16} />{t("disconnect")}</button> : <form onSubmit={connect} className="form-stack" autoComplete="off"><label>{t("walletUri")}<input name="wallet-uri" type="password" value={uri} autoComplete="off" spellCheck={false} autoCapitalize="none" required placeholder="nostr+walletconnect://..." onChange={event => setUri(event.target.value)} /><small>{t("walletHint")}</small></label><button className="button primary" disabled={!!busy || !uri.trim()}>{busy === "wallet" ? <LoaderCircle size={16} className="spin" /> : <PlugZap size={16} />}{t("connect")}</button></form>}<p className="permission-note"><ShieldCheck size={15} />make_invoice / lookup_invoice / get_info</p></section><section className="account-section"><div className="connection-icon"><Fingerprint size={23} /></div><h2>{t("signerTitle")}</h2><p>{t("signerCopy")}</p>{session.worker.pubkey && <div className="pubkey-display"><span className="eyebrow">{t("publicKey")}</span><p className="mono break-all">{session.worker.pubkey}</p></div>}{!signer && <Notice tone="info">{t("signerUnavailable")}</Notice>}<button className="button secondary" disabled={!!busy || !signer} onClick={() => run("signer", connectSigner)}><KeyRound size={16} />{t("connectSigner")}</button></section></div></>;
}

export function PassportPreview({ worker }: { worker: Worker }) {
  const { t } = useI18n();
  return <><div className="page-heading"><div><h1>{t("passport")}</h1><p>{t("passportCopy")}</p></div><Link className="button secondary" href={`/passport/${encodeURIComponent(worker.id)}`}><ArrowUpRight size={16} />{t("openPassport")}</Link></div><div className="account-grid"><div><div className="identity-row"><span className="avatar">{worker.name.slice(0, 1).toUpperCase()}</span><div><h3>{worker.name}</h3><p>{worker.occupation}</p></div></div>{worker.bio && <p className="public-bio">{worker.bio}</p>}<p className="section-copy">{t("visibilityHint")}</p><div className="passport-preview-motif"><PassportMotif name={worker.name} /></div></div><aside className="account-aside"><QRPanel value={absoluteUrl(`/passport/${encodeURIComponent(worker.id)}`)} label={t("publicPassport")} /></aside></div></>;
}