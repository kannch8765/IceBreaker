"use client";
import React from 'react';
import { useOnboardingStore } from '@/context/OnboardingContext';
import { IdentityStep } from './IdentityStep';
import { MoodStep } from './MoodStep';
import { QuestionsStep } from './QuestionsStep';
import { ProcessingStep } from './ProcessingStep';
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
        {step === 1 && <IdentityStep key="step1" />}
        {step === 2 && <MoodStep key="step2" />}
        {step === 3 && <QuestionsStep key="step3" />}
        {step === 4 && <ProcessingStep key="step4" />}
        {step === 5 && <ResultStep key="step5" />}
      </AnimatePresence>
    </div>
  );
}
