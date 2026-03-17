"use client";

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { OnboardingProvider } from '@/context/OnboardingContext';
import { StepManager } from '@/components/mobile/StepManager';
import HallLanding from '@/components/hall/HallLanding';
import LobbyClient from '@/components/hall/LobbyClient';

function RootDispatcher() {
  const searchParams = useSearchParams();
  const roomId = searchParams.get('room');
  const mode = searchParams.get('mode');

  // Logic: 
  // 1. If mode=hall and room exists -> Show the Hall Lobby (Host view)
  // 2. If room exists (and no hall mode) -> Show the Mobile Onboarding Flow
  // 3. Otherwise -> Show the Hall Landing (Host entry point)

  if (roomId && mode === 'hall') {
    return <LobbyClient roomId={roomId} />;
  }

  if (roomId) {
    return (
      <OnboardingProvider>
        <main className="flex min-h-screen flex-col items-center justify-center font-sans">
          <StepManager />
        </main>
      </OnboardingProvider>
    );
  }

  return <HallLanding />;
}

export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black flex items-center justify-center text-white">Loading...</div>}>
      <RootDispatcher />
    </Suspense>
  );
}
