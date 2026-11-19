"use client";

import Link from "next/link";
import {
  ArrowRight, Check, FileCheck2, Fingerprint, Languages, LockKeyhole,
  ScrollText, ShieldCheck, UserCheck, Wallet, WifiOff, Wrench, Zap,
} from "lucide-react";
import { Brand, PassportMotif } from "./ui";
import { LanguageToggle, useI18n } from "./providers";
import type { MessageKey } from "@/lib/i18n";

const steps = [
  { icon: ScrollText, title: "lpStep1Title", body: "lpStep1Body" },
  { icon: UserCheck, title: "lpStep2Title", body: "lpStep2Body" },
  { icon: FileCheck2, title: "lpStep3Title", body: "lpStep3Body" },
  { icon: Zap, title: "lpStep4Title", body: "lpStep4Body" },
] as const;

const features = [
  { icon: ShieldCheck, title: "lpFeat1Title", body: "lpFeat1Body" },
  { icon: Fingerprint, title: "lpFeat2Title", body: "lpFeat2Body" },
  { icon: Wallet, title: "lpFeat3Title", body: "lpFeat3Body" },
  { icon: WifiOff, title: "lpFeat4Title", body: "lpFeat4Body" },
  { icon: ScrollText, title: "lpFeat5Title", body: "lpFeat5Body" },
  { icon: Languages, title: "lpFeat6Title", body: "lpFeat6Body" },
] as const;

const securityPoints = ["lpSecPoint1", "lpSecPoint2", "lpSecPoint3", "lpSecPoint4"] as const;

export function Landing() {
  const { t } = useI18n();
  const tr = (key: MessageKey) => t(key);
  return (
    <div className="lp">
      <header className="lp-header">
        <Brand />
        <nav className="lp-nav" aria-label="JëfPass">
          <a href="#how">{tr("lpNavHow")}</a>
          <a href="#features">{tr("lpNavFeatures")}</a>
          <a href="#security">{tr("lpNavSecurity")}</a>
        </nav>
        <div className="lp-header-right">
          <LanguageToggle />
          <Link className="button primary compact" href="/app">{tr("lpOpenApp")}<ArrowRight size={15} /></Link>
        </div>
      </header>

      <main>
        <section className="lp-hero">
          <div className="lp-hero-copy">
            <div className="eyebrow lp-eyebrow"><span className="small-rule" />{tr("tagline")}</div>
            <h1>{tr("welcome")}</h1>
            <p className="lp-lead">{tr("lpHeroSub")}</p>
            <div className="lp-hero-actions">
              <Link className="button primary" href="/app">{tr("lpStart")}<ArrowRight size={18} /></Link>
              <a className="button secondary" href="#how">{tr("lpNavHow")}</a>
            </div>
            <ul className="lp-trust">
              <li><Check size={15} />{tr("lpTrustNoAccount")}</li>
              <li><Check size={15} />{tr("lpTrustReceiveOnly")}</li>
              <li><Check size={15} />{tr("lpTrustBilingual")}</li>
            </ul>
          </div>
          <div className="lp-hero-art">
            <div className="lp-hero-glow" aria-hidden="true" />
            <PassportMotif />
            <div className="lp-hero-chip">
              <Wrench size={16} />
              <span>JëfPass / Dakar</span>
            </div>
          </div>
        </section>

        <section id="how" className="lp-section lp-steps">
          <div className="lp-section-head">
            <div className="eyebrow lp-eyebrow"><span className="small-rule" />{tr("lpStepsEyebrow")}</div>
            <h2>{tr("lpStepsTitle")}</h2>
            <p className="muted">{tr("lpStepsIntro")}</p>
          </div>
          <ol className="lp-step-grid">
            {steps.map(({ icon: Icon, title, body }, index) => (
              <li className="lp-step" key={title}>
                <span className="lp-step-no">{String(index + 1).padStart(2, "0")}</span>
                <span className="lp-step-icon"><Icon size={20} /></span>
                <h3>{tr(title)}</h3>
                <p className="muted">{tr(body)}</p>
              </li>
            ))}
          </ol>
        </section>

        <section id="features" className="lp-section lp-features">
          <div className="lp-section-head">
            <div className="eyebrow lp-eyebrow"><span className="small-rule" />{tr("lpFeaturesEyebrow")}</div>
            <h2>{tr("lpFeaturesTitle")}</h2>
          </div>
          <div className="lp-feature-grid">
            {features.map(({ icon: Icon, title, body }) => (
              <article className="lp-feature" key={title}>
                <span className="lp-feature-icon"><Icon size={19} /></span>
                <h3>{tr(title)}</h3>
                <p className="muted">{tr(body)}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="security" className="lp-section lp-security">
          <div className="lp-security-copy">
            <div className="eyebrow lp-eyebrow"><span className="small-rule" />{tr("lpSecurityEyebrow")}</div>
            <h2>{tr("lpSecurityTitle")}</h2>
            <p className="lp-lead">{tr("lpSecurityBody")}</p>
          </div>
          <ul className="lp-security-list">
            {securityPoints.map(point => (
              <li key={point}><ShieldCheck size={16} />{tr(point)}</li>
            ))}
          </ul>
        </section>

        <section className="lp-section">
          <div className="lp-cta">
            <div className="lp-cta-copy">
              <h2>{tr("lpCtaTitle")}</h2>
              <p>{tr("lpCtaBody")}</p>
            </div>
            <Link className="button primary" href="/app">{tr("lpStart")}<ArrowRight size={18} /></Link>
          </div>
          <div className="lp-honest">
            <LockKeyhole size={16} />
            <p><span className="eyebrow lp-honest-eyebrow">{tr("lpHonestEyebrow")}</span>{tr("lpHonest")}</p>
          </div>
        </section>
      </main>

      <footer className="lp-footer">
        <Brand />
        <span className="muted">{tr("lpFooterRights")}</span>
      </footer>
    </div>
  );
}
