"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { TRANSLATIONS, TranslationKey } from '@/lib/translations';

export type Language = 'en' | 'jp' | 'cn';

type LanguageContextType = {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey) => string;
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>('en');

  React.useEffect(() => {
    const saved = localStorage.getItem('preferredLanguage') as Language;
    if (saved && (saved === 'en' || saved === 'jp' || saved === 'cn')) {
      setLanguage(saved);
    }
  }, []);

  const handleSetLanguage = (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem('preferredLanguage', lang);
  };

  const t = (key: TranslationKey) => {
    return TRANSLATIONS[language]?.[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage: handleSetLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
}
