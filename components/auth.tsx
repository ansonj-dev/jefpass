"use client";

import { useState, type FormEvent } from "react";
import { ArrowRight, LockKeyhole, Wrench, LoaderCircle } from "lucide-react";
import { api } from "@/lib/client";
import type { Worker } from "@/lib/types";
import { Brand, errorMessage, Notice, PassportMotif } from "./ui";
import { LanguageToggle, useI18n } from "./providers";

export function Auth({ onAuthenticated, network }: { onAuthenticated(worker: Worker): Promise<void>; network: string }) {
  const { t } = useI18n();
  const [register, setRegister] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = new FormData(form);
    setBusy(true); setError("");
    try {
      const result = await api<{ worker: Worker }>(`/api/auth/${register ? "register" : "login"}`, "POST", {
        email: String(fields.get("email")).trim(), password: fields.get("password"),
        ...(register ? { name: String(fields.get("name")).trim(), occupation: String(fields.get("occupation")).trim() } : {}),
      });
      form.reset();
      await onAuthenticated(result.worker);
    } catch (error) { setError(errorMessage(error)); } finally { setBusy(false); }
  }
  return <div className="auth-page"><header className="auth-header"><Brand /><LanguageToggle /></header><main className="auth-main">
    <section className="auth-story"><div className="eyebrow"><span className="small-rule" />{t("tagline")}</div><h1>{t("welcome")}</h1><p className="auth-intro">{t("authCopy")}</p><div className="auth-art"><img src="https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?auto=format&fit=crop&w=1000&q=85" alt="" className="repair-photo" /><div className="photo-label"><Wrench size={17} />JefPass / Dakar</div><PassportMotif /></div><div className="auth-story-foot"><LockKeyhole size={15} />{t("security")}</div></section>
    <section className="auth-form-section"><div className="auth-form-inner"><div className="auth-tabs" role="group" aria-label={t("signIn")}><button type="button" aria-pressed={!register} onClick={() => { setRegister(false); setError(""); }}>{t("signIn")}</button><button type="button" aria-pressed={register} onClick={() => { setRegister(true); setError(""); }}>{t("register")}</button></div><h2>{t(register ? "createAccount" : "returning")}</h2><p className="muted">{t("authHint")}</p>
    <form onSubmit={submit} key={String(register)} className="form-stack">{register && <><label>{t("name")}<input name="name" autoComplete="name" maxLength={100} required /></label><label>{t("occupation")}<input name="occupation" autoComplete="organization-title" maxLength={100} required /></label></>}<label>{t("email")}<input name="email" type="email" autoComplete="email" maxLength={254} required /></label><label>{t("password")}<input name="password" type="password" autoComplete={register ? "new-password" : "current-password"} minLength={12} required /></label>{error && <Notice>{error}</Notice>}<button className="button primary full" disabled={busy}>{busy ? <LoaderCircle size={18} className="spin" /> : <ArrowRight size={18} />}{t(register ? "register" : "signIn")}</button></form><div className="auth-network"><span className="status-dot" />{network.toUpperCase()}{network.toLowerCase() === "regtest" && ` / ${t("noMoney")}`}</div></div></section>
  </main><footer className="auth-footer"><span>JefPass</span><span>{t("private")}</span></footer></div>;
}