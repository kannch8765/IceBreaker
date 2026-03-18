"use client";
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { TranslationKey } from '@/lib/translations';
import { useTranslation, Language } from '@/context/LanguageContext';

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
  roomId: string | null;
  participantId: string | null;
  setParticipantId: (id: string | null) => void;
  aiTopics: string[];
  setAiTopics: (topics: string[]) => void;
  avatarUrl: string | null;
  setAvatarUrl: (url: string | null) => void;
};

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams();
  const [roomId, setRoomId] = useState<string | null>(null);
  
  useEffect(() => {
    if (searchParams) {
      setRoomId(searchParams.get('room'));
    }
  }, [searchParams]);

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<FormData>({
    username: '',
    pronoun: '',
    mood: '',
    answers: ['', ''],
  });
  const { language, setLanguage, t } = useTranslation();
  const [theme, setTheme] = useState<Theme>('light');
  const [participantId, setParticipantId] = useState<string | null>(null);
  const [aiTopics, setAiTopics] = useState<string[]>([]);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // Persistence: Load from localStorage on mount
  useEffect(() => {
    const savedParticipantId = localStorage.getItem('participantId');
    const savedStep = localStorage.getItem('onboardingStep');
    const savedRoomId = localStorage.getItem('roomId');

    if (savedParticipantId) setParticipantId(savedParticipantId);
    if (savedStep) setStep(parseInt(savedStep, 10));
    // Only restore roomId if not provided in URL
    if (savedRoomId && !searchParams.get('room')) setRoomId(savedRoomId);
  }, [searchParams]);

  // Persistence: Save to localStorage on change
  useEffect(() => {
    if (participantId) localStorage.setItem('participantId', participantId);
    else localStorage.removeItem('participantId');
  }, [participantId]);

  useEffect(() => {
    localStorage.setItem('onboardingStep', step.toString());
  }, [step]);

  useEffect(() => {
    if (roomId) localStorage.setItem('roomId', roomId);
  }, [roomId]);

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

  return (
    <OnboardingContext.Provider value={{ 
      step, setStep, nextStep, prevStep, 
      formData, updateFormData,
      language, setLanguage,
      theme, setTheme,
      t,
      roomId,
      participantId, setParticipantId,
      aiTopics, setAiTopics,
      avatarUrl, setAvatarUrl
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
