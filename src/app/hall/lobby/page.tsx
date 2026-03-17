"use client";

import { useSearchParams } from 'next/navigation';
import LobbyClient from '@/components/hall/LobbyClient';
import { Suspense } from 'react';

function LobbyPageContent() {
  const searchParams = useSearchParams();
  const roomId = searchParams.get('room');

  if (!roomId) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-8 text-center">
        <h1 className="text-4xl font-bold mb-4 text-red-500">Invalid Connection</h1>
        <p className="text-gray-400">No Room ID provided. Please return to the menu.</p>
        <button 
          onClick={() => window.location.href = '/hall'}
          className="mt-8 px-6 py-2 bg-white text-black font-bold rounded-xl"
        >
          Return to Hall
        </button>
      </div>
    );
  }

  return <LobbyClient roomId={roomId} />;
}

export default function StaticLobbyPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black flex items-center justify-center text-white">Loading...</div>}>
      <LobbyPageContent />
    </Suspense>
  );
}
