'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { Language, LANGUAGES, LanguageOption, translations } from '../lib/i18n/translations';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  currentOption: LanguageOption;
  t: (path: string, params?: Record<string, string | number>, fallback?: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const STORAGE_KEY = 'railway_ai_lang';

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en');
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as Language | null;
      if (saved && (saved === 'en' || saved === 'ta' || saved === 'hi')) {
        setLanguageState(saved);
        document.documentElement.lang = saved;
      }
    } catch {
      // LocalStorage access may fail in some environments
    } finally {
      setIsHydrated(true);
    }
  }, []);

  const setLanguage = (newLang: Language) => {
    setLanguageState(newLang);
    try {
      localStorage.setItem(STORAGE_KEY, newLang);
      document.documentElement.lang = newLang;
    } catch {
      // Ignore localStorage write error
    }
  };

  const currentOption = useMemo(() => {
    return LANGUAGES.find((opt) => opt.code === language) || LANGUAGES[0];
  }, [language]);

  const t = (path: string, params?: Record<string, string | number>, fallback?: string): string => {
    const keys = path.split('.');

    const getValue = (dict: any): string | undefined => {
      let current = dict;
      for (const k of keys) {
        if (!current || typeof current !== 'object') return undefined;
        current = current[k];
      }
      return typeof current === 'string' ? current : undefined;
    };

    // Try selected language first
    let val = getValue(translations[language]);

    // Fall back to English if missing
    if (val === undefined && language !== 'en') {
      val = getValue(translations.en);
    }

    // Default to fallback or key path
    if (val === undefined) {
      val = fallback !== undefined ? fallback : path;
    }

    // Interpolate params like {count}
    if (params && typeof val === 'string') {
      for (const [pKey, pVal] of Object.entries(params)) {
        val = val.replace(new RegExp(`\\{${pKey}\\}`, 'g'), String(pVal));
      }
    }

    return val;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, currentOption, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
