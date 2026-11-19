"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, BriefcaseBusiness, ChevronRight, FileCheck2, Fingerprint, LayoutDashboard, LockKeyhole, PlugZap, Plus, RefreshCw, Search, ShieldCheck, UserRound, Wallet, WifiOff, Wrench } from "lucide-react";
import { api, type Session } from "@/lib/client";
import { isPaymentVerified, isWorkCompleted, type Job, type Worker } from "@/lib/types";
import { flushQueue, readQueue } from "@/lib/offline";
import { Auth } from "./auth";
import { Connections, PassportPreview, Profile } from "./account";
import { JobEditor } from "./job-editor";
import { JobDetail } from "./job-detail";
import { LanguageToggle, useI18n } from "./providers";
import { Brand, errorMessage, Loading, Notice, PassportMotif, StatusBadge } from "./ui";

type View = "workbench" | "passport" | "connections" | "profile";
const navigation = [{ id: "workbench", icon: LayoutDashboard }, { id: "passport", icon: Fingerprint }, { id: "connections", icon: PlugZap }, { id: "profile", icon: UserRound }] as const;

export function Workbench() {
  const { t, language } = useI18n();
  const [session, setSession] = useState<Session | null>(null);
  const [booting, setBooting] = useState(true);
  const [bootError, setBootError] = useState("");
  const [view, setView] = useState<View>("workbench");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [jobsLoaded, setJobsLoaded] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [customerUrls, setCustomerUrls] = useState<Record<string, string>>({});
  const [editor, setEditor] = useState(false);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [online, setOnline] = useState(true);
  const [queued, setQueued] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const syncLock = useRef(false);
  const activeWorker = useRef<string | null>(null);
  const detailRef = useRef<HTMLDivElement>(null);

  async function loadSession() {
    const result = await api<Session>("/api/session");
    activeWorker.current = result.worker?.id || null;
    setSession(result);
  }
  async function boot() {
    setBooting(true); setBootError("");
    try { await loadSession(); } catch (error) { setBootError(errorMessage(error)); } finally { setBooting(false); }
  }
  useEffect(() => { void boot(); }, []);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update(); window.addEventListener("online", update); window.addEventListener("offline", update);
    return () => { window.removeEventListener("online", update); window.removeEventListener("offline", update); };
  }, []);
  const workerId = session?.worker?.id;
  async function loadJobs(id = workerId) {
    if (!id) return;
    setJobsLoading(true);
    try {
      const result = await api<{ jobs: Job[] }>("/api/jobs");
      if (activeWorker.current === id) { setJobs(result.jobs); setJobsLoaded(true); setError(""); }
    } catch (error) { if (activeWorker.current === id) setError(errorMessage(error)); }
    finally { if (activeWorker.current === id) setJobsLoading(false); }
  }
  async function syncJobs(id = workerId) {
    if (!id || syncLock.current || !navigator.onLine || activeWorker.current !== id) return;
    syncLock.current = true; setSyncing(true);
    try {
      await flushQueue(id);
      if (activeWorker.current === id) { setQueued((await readQueue(id)).length); await loadJobs(id); }
    } catch { if (activeWorker.current === id) { setError(t("syncError")); setQueued((await readQueue(id).catch(() => [])).length); } }
    finally { syncLock.current = false; setSyncing(false); }
  }
  useEffect(() => {
    if (!workerId) return;
    setJobs([]); setJobsLoaded(false); setSelected(null); setCustomerUrls({}); setError(""); setQueued(0);
    void loadJobs(workerId);
    readQueue(workerId).then(queue => { if (activeWorker.current === workerId) setQueued(queue.length); }).catch(() => setError(t("draftError")));
  }, [workerId]);
  useEffect(() => { if (workerId && online) void syncJobs(workerId); }, [workerId, online]);
  function updateJob(job: Job, url?: string) {
    setJobs(previous => previous.some(item => item.id === job.id) ? previous.map(item => item.id === job.id ? job : item) : [job, ...previous]);
    if (url) setCustomerUrls(previous => ({ ...previous, [job.id]: url }));
  }
  function chooseJob(id: string) {
    setSelected(id);
    if (window.innerWidth < 1150) requestAnimationFrame(() => detailRef.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "start" }));
  }
  async function logout() {
    if (syncLock.current) throw new Error(t("pending"));
    await api("/api/auth/logout", "POST", {});
    activeWorker.current = null; setSession(previous => previous ? { ...previous, worker: null, wallet: null } : null);
    setJobs([]); setCustomerUrls({}); setSelected(null); setView("workbench"); setQueued(0); setEditor(false);
  }

  if (booting) return <div className="public-shell"><header className="public-header"><Brand /><LanguageToggle /></header><Loading /></div>;
  if (bootError || !session) return <div className="public-shell"><header className="public-header"><Brand /><LanguageToggle /></header><main className="boot-error"><Notice>{bootError || t("unavailable")}</Notice><button className="button primary" onClick={boot}><RefreshCw size={16} />{t("retry")}</button></main></div>;
  if (!session.worker) return <Auth network={session.network} onAuthenticated={async worker => { activeWorker.current = worker.id; setSession(previous => ({ network: previous?.network || "unknown", wallet: null, worker })); await loadSession(); }} />;

  const worker = session.worker;
  const authenticatedSession = { ...session, worker };
  const selectedJob = jobs.find(job => job.id === selected);
  const visibleJobs = jobs.filter(job => (filter === "all" || (filter === "open" ? !isWorkCompleted(job) : isWorkCompleted(job))) && `${job.title} ${job.description} ${job.category}`.toLocaleLowerCase(language).includes(search.toLocaleLowerCase(language)));
  const counts = [jobs.length, jobs.filter(job => ["QUOTED", "ACCEPTED"].includes(job.state)).length, jobs.filter(job => isPaymentVerified(job.payment)).length, jobs.filter(job => !!job.receiptId).length];
  const countLabels = ["jobs", "active", "paid", "receipts"] as const;
  const countIcons = [BriefcaseBusiness, Wrench, ShieldCheck, FileCheck2];
  const onWorker = (updated: Worker) => setSession(previous => previous ? { ...previous, worker: updated } : previous);
  const changeView = (next: View) => { setView(next); setError(""); };
  return <div className="app-shell"><aside className="sidebar"><Brand href="/app" /><div className="sidebar-caption">Workspace</div><nav className="sidebar-nav" aria-label={t("workbench")}>{navigation.slice(0, 3).map(({ id, icon: Icon }) => <button className="nav-button" key={id} aria-current={view === id ? "page" : undefined} onClick={() => changeView(id)}><Icon size={18} /><span>{t(id)}</span></button>)}</nav><div className="sidebar-bottom"><div className="sidebar-note"><LockKeyhole size={13} /><span>{t("private")}</span></div><button className="user-button" aria-label={t("profile")} onClick={() => changeView("profile")}><span className="avatar">{worker.name.slice(0, 1).toUpperCase()}</span><div className="user-info"><div className="user-name">{worker.name}</div><div className="user-trade">{worker.occupation}</div></div><ChevronRight size={14} className="user-info" /></button></div></aside>
  <div className="app-content"><header className="topbar"><div className="mobile-brand"><Brand href="/app" /></div><span className="topbar-title">{t(view)}</span><div className="topbar-right"><span className={`network-label ${session.network.toLowerCase() === "regtest" ? "test" : ""}`}><span className="status-dot" />{session.network.toUpperCase()}{session.network.toLowerCase() === "regtest" && ` / ${t("noMoney")}`}</span><button className="wallet-label" onClick={() => changeView("connections")}><Wallet size={14} />{t("wallet")}: {t(session.wallet?.connected ? "connected" : "notConnected")}</button><LanguageToggle /></div></header>
  {!online && <div className="offline-bar" role="status"><WifiOff size={16} /><span><strong>{t("offline")}. </strong>{t("offlineHint")}</span></div>}
  <main className="workspace">{view === "workbench" && <><div className="page-heading"><div><h1>{t("hello")}, {worker.name.split(" ")[0]}<span className="brand-dot">.</span></h1><p>{t("overview")}</p></div><div className="heading-actions"><button className="icon-button" aria-label={t("refresh")} title={t("refresh")} disabled={jobsLoading} onClick={() => loadJobs()}><RefreshCw size={16} className={jobsLoading ? "spin" : ""} /></button><button className="button primary" onClick={() => setEditor(true)}><Plus size={17} />{t("newJob")}</button></div></div><section className="stats" aria-label={t("overview")}>{countLabels.map((label, index) => { const Icon = countIcons[index]; return <div className="stat" key={label}><span className="stat-label"><Icon size={14} />{t(label)}</span><div className="stat-number">{jobsLoaded ? counts[index].toLocaleString(language) : "—"}</div></div>; })}</section>
  {error && <div className="account-message"><Notice>{error}</Notice><button className="text-button" onClick={() => loadJobs()}><RefreshCw size={13} />{t("retry")}</button></div>}{queued > 0 && <div className="queue-bar" role="status"><span>{queued} {t("queuedCount")} / {t("waitingSync")}</span><button className="text-button" disabled={!online || syncing} onClick={() => syncJobs()}><RefreshCw size={14} className={syncing ? "spin" : ""} />{t("sync")}</button></div>}
  <div className={`work-grid ${jobsLoaded && !jobs.length ? "empty-grid" : ""}`}><section aria-label={t("jobs")}><div className="section-heading"><h2>{t("jobs")}<span className="count-chip">{jobsLoaded ? jobs.length : "—"}</span></h2><span className="eyebrow muted">SAT</span></div><div className="job-toolbar"><div className="filter-tabs" role="group" aria-label={t("jobs")}>{(["all", "open", "finished"] as const).map(value => <button key={value} aria-pressed={filter === value} onClick={() => setFilter(value)}>{t(value)}</button>)}</div><label className="search-field"><Search size={14} /><input aria-label={t("search")} placeholder={t("search")} value={search} onChange={event => setSearch(event.target.value)} /></label></div>{jobsLoading && !jobsLoaded ? <Loading /> : jobsLoaded && !jobs.length ? <div className="empty-state"><div className="empty-icon"><BriefcaseBusiness size={25} /></div><h3>{t("noJobs")}</h3><p>{t("noJobsCopy")}</p><button className="button primary" onClick={() => setEditor(true)}><Plus size={16} />{t("createFirst")}</button></div> : !visibleJobs.length ? <div className="empty-state"><Search size={25} /><p>{t("noMatches")}</p></div> : <div className="job-list">{visibleJobs.map(job => <button key={job.id} className="job-row" aria-pressed={selected === job.id} onClick={() => chooseJob(job.id)}><span className="job-category-icon"><Wrench size={18} /></span><div><div className="job-title">{job.title}</div><div className="job-meta">{["repair", "electrical", "plumbing", "tailoring", "other"].includes(job.category) ? t(job.category as "repair") : job.category} · {new Date(job.createdAt).toLocaleDateString(language)}</div><div className="job-row-states"><StatusBadge type="service" state={job.state} /><StatusBadge type="payment" state={job.payment?.state || "NOT_REQUESTED"} /></div></div><div className="job-amount">{job.amountSats.toLocaleString(language)}<br /><small>SAT</small></div></button>)}</div>}</section>
  <div ref={detailRef}>{selectedJob ? <JobDetail key={selectedJob.id} job={selectedJob} worker={worker} walletConnected={!!session.wallet?.connected} customerUrl={customerUrls[selectedJob.id]} onUpdated={updateJob} onClose={() => setSelected(null)} /> : jobsLoaded && !jobs.length ? <aside className="empty-aside"><PassportMotif /><h3>{t("passportCopy")}</h3><p>{t("passportEmptyCopy")}</p><div className="empty-aside-foot"><ShieldCheck size={14} />{t("private")}</div></aside> : <div className="detail-placeholder"><Fingerprint size={45} strokeWidth={1} /><p>{t("selectJob")}</p></div>}</div></div></>}
  {view === "profile" && <Profile session={authenticatedSession} onSession={loadSession} onWorker={onWorker} onLogout={logout} />}{view === "connections" && <Connections session={authenticatedSession} onSession={loadSession} onWorker={onWorker} />}{view === "passport" && <PassportPreview worker={worker} />}
  <footer className="workspace-foot"><span><LockKeyhole size={11} />{t("private")}</span><span>JefPass / {t("tagline")}</span></footer></main></div>
  <nav className="mobile-nav" aria-label={t("workbench")}>{navigation.map(({ id, icon: Icon }) => <button key={id} aria-current={view === id ? "page" : undefined} onClick={() => changeView(id)}><Icon size={20} /><span>{t(id)}</span></button>)}</nav>
  {editor && <JobEditor workerId={worker.id} onClose={() => setEditor(false)} onCreated={(job, url) => { updateJob(job, url); setSelected(job.id); setEditor(false); }} onQueued={() => { setEditor(false); readQueue(worker.id).then(queue => setQueued(queue.length)).catch(() => setError(t("draftError"))); if (navigator.onLine) void syncJobs(); }} />}</div>;
}