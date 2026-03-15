"use client";
import React, { createContext, useContext, useState, useEffect } from 'react';

import { TRANSLATIONS, TranslationKey } from '@/lib/translations';

export type Language = 'en' | 'jp' | 'cn';
export type Theme = 'light' | 'dark';

type FormData = {
  username: string;
  pronoun: string;
  mood: string;
  answers: string[];
};

type OnboardingContextType = {
  step: number;
  setStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  formData: FormData;
  updateFormData: (data: Partial<FormData>) => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  t: (key: TranslationKey) => string;
};

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<FormData>({
    username: '',
    pronoun: '',
    mood: '',
    answers: ['', ''],
  });
  const [language, setLanguage] = useState<Language>('en');
  const [theme, setTheme] = useState<Theme>('light');

  // Sync theme with HTML document class
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const nextStep = () => setStep((s) => s + 1);
  const prevStep = () => setStep((s) => Math.max(1, s - 1));
  const updateFormData = (data: Partial<FormData>) => {
    setFormData((prev) => ({ ...prev, ...data }));
  };

  const t = (key: TranslationKey) => {
    return TRANSLATIONS[language][key];
  };

  return (
    <OnboardingContext.Provider value={{ 
      step, setStep, nextStep, prevStep, 
      formData, updateFormData,
      language, setLanguage,
      theme, setTheme,
      t
    }}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboardingStore() {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboardingStore must be used within an OnboardingProvider');
  }
  return context;
}
