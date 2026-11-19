"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { messages, type Language, type MessageKey } from "@/lib/i18n";

const LanguageContext = createContext({ language: "en" as Language, setLanguage: (_value: Language) => {}, t: (key: MessageKey) => messages.en[key] });

export function Providers({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>("en");
  const [initialized, setInitialized] = useState(false);
  useEffect(() => {
    try {
      const saved = localStorage.getItem("jefpass:language");
      if (saved === "fr" || saved === "en") setLanguage(saved);
    } catch {}
    setInitialized(true);
  }, []);
  useEffect(() => {
    if (!initialized) return;
    document.documentElement.lang = language;
    try { localStorage.setItem("jefpass:language", language); } catch {}
  }, [language, initialized]);
  return <LanguageContext.Provider value={{ language, setLanguage, t: key => messages[language][key] }}>{children}</LanguageContext.Provider>;
}

export const useI18n = () => useContext(LanguageContext);

export function LanguageToggle() {
  const { language, setLanguage, t } = useI18n();
  return <div className="language-toggle" role="group" aria-label={t("language")}>
    {(["en", "fr"] as const).map(value => <button key={value} type="button" aria-pressed={language === value} onClick={() => setLanguage(value)}>{value.toUpperCase()}</button>)}
  </div>;
}