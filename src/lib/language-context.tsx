import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type Language = "bn" | "en";

const STORAGE_KEY = "cap10-support-language";

type LanguageContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (bn: string, en: string) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  // Match the server-rendered HTML on the first client render.
  const [language, setLanguage] = useState<Language>("bn");
  const [restored, setRestored] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored === "bn" || stored === "en") {
        setLanguage(stored);
      }
    } catch {
      // The language switch remains usable without local storage.
    } finally {
      setRestored(true);
    }
  }, []);

  useEffect(() => {
    if (!restored) return;
    document.documentElement.lang = language;
    try {
      window.localStorage.setItem(STORAGE_KEY, language);
    } catch {
      // The selected language remains active for this session.
    }
  }, [language, restored]);

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      setLanguage,
      t: (bn, en) => (language === "bn" ? bn : en),
    }),
    [language],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used inside LanguageProvider");
  return context;
}
