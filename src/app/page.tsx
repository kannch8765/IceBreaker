"use client";
import React from 'react';
import { OnboardingProvider } from '@/context/OnboardingContext';
import { StepManager } from '@/components/mobile/StepManager';

export default function Home() {
  return (
    <OnboardingProvider>
      <main className="flex min-h-screen flex-col items-center justify-center font-sans">
        <StepManager />
      </main>
    </OnboardingProvider>
  );
}
