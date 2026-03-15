"use client";
import React, { createContext, useContext, useState } from 'react';

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

  const nextStep = () => setStep((s) => s + 1);
  const prevStep = () => setStep((s) => Math.max(1, s - 1));
  const updateFormData = (data: Partial<FormData>) => {
    setFormData((prev) => ({ ...prev, ...data }));
  };

  return (
    <OnboardingContext.Provider value={{ step, setStep, nextStep, prevStep, formData, updateFormData }}>
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
