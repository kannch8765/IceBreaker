"use client";

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import HallLanding from '@/components/hall/HallLanding';
import LobbyClient from '@/components/hall/LobbyClient';

/**
 * HallRouter handles the host flow:
 * - /hall -> HallLanding (No room)
 * - /hall?room=X -> LobbyClient (Active room)
 */
function HallRouter() {
  const searchParams = useSearchParams();
  const roomId = searchParams.get('room');

  if (roomId) {
    return <LobbyClient />;
  }

  return <HallLanding />;
}

export default function HallPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black flex items-center justify-center text-white">Loading...</div>}>
      <HallRouter />
    </Suspense>
  );
}
