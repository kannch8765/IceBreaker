"use client";

import HallLanding from '@/components/hall/HallLanding';

/**
 * Root Page is now the Host Landing Page.
 * Navigation:
 * - / -> HallLanding
 * - /hall?room=X -> LobbyClient (via src/app/hall/page.tsx)
 */
export default function Home() {
  return <HallLanding />;
}
