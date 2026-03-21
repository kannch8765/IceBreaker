"use client";
import React from 'react';
import { useOnboardingStore } from '@/context/OnboardingContext';
import { LanguageStep } from './LanguageStep';
import { IdentityStep } from './IdentityStep';
import { SwipeStep } from './SwipeStep';
import { MoodStep } from './MoodStep';
import { QuestionsStep } from './QuestionsStep';
import { ProcessingStep } from './ProcessingStep';
import { SessionWaitingPage } from './SessionWaitingPage';
import { ResultStep } from './ResultStep';
import { NavBar } from './NavBar';
import { AnimatePresence } from 'framer-motion';

export function StepManager() {
  const { step } = useOnboardingStore();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen w-full relative overflow-hidden dark:bg-black transition-colors duration-500">
      <NavBar />
      {/* Dynamic Background Elements */}
      <div className="absolute top-10 left-10 w-64 h-64 bg-purple-300 dark:bg-matrix-green/20 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
      <div className="absolute top-10 right-10 w-64 h-64 bg-indigo-300 dark:bg-green-400/20 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
      <div className="absolute -bottom-8 left-20 w-64 h-64 bg-pink-300 dark:bg-matrix-green/10 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>

      <AnimatePresence mode="wait">
        {step === 1 && <LanguageStep key="step1" />}
        {step === 2 && <IdentityStep key="step2" />}
        {step === 3 && <SwipeStep key="step3" />}
        {step === 4 && <MoodStep key="step4" />}
        {step === 5 && <QuestionsStep key="step5" />}
        {step === 6 && <ProcessingStep key="step6" />}
        {step === 7 && <SessionWaitingPage key="step7" />}
        {step === 8 && <ResultStep key="step8" />}
      </AnimatePresence>
    </div>
  );
}
