"use client";

import React, { Suspense } from 'react';
import { OnboardingProvider } from '@/context/OnboardingContext';
import { StepManager } from '@/components/mobile/StepManager';

/**
 * Participant Page:
 * - /room?room=X -> Onboarding Flow
 * 
 * Note: OnboardingProvider handles extracting roomId from useSearchParams internally.
 */
function ParticipantRouter() {
  return (
    <OnboardingProvider>
      <main className="flex min-h-screen flex-col items-center justify-center font-sans">
        <StepManager />
      </main>
    </OnboardingProvider>
  );
}

export default function RoomPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <ParticipantRouter />
    </Suspense>
  );
}
