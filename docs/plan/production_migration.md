# Production-Safe Routing Migration Plan

This plan details the zero-downtime transition to semantic routing, ensuring exactly identical user flows and UX behavior.

## 1. Zero-Downtime Migration Strategy (5 Steps)

| Step | Action | Impact | Validation |
| :--- | :--- | :--- | :--- |
| **1** | Create new routes (`/room/[roomId]`, `/hall/lobby/[roomId]`) | No impact on existing users. | Access `/room/TEST` directly. |
| **2** | Update Components (`OnboardingProvider`, `StepManager`) | Components now support both Props and SearchParams. | Existing `/` still works. |
| **3** | Implement Server Redirect in `/` | Legacy URLs point to new semantic routes. | `/?room=X` redirects to `/room/X`. |
| **4** | Switch Internal Navigation | `HallLanding` and `LobbyClient` use new URL patterns. | "Quick Setup" goes to `/hall/lobby/X`. |
| **5** | Clean up Legacy Routes | Remove redundant files and dead query-param logic. | SEO and bundle size optimized. |

## 2. Server-Side Redirect Implementation

Replace the current `"use client"` root `src/app/page.tsx` with this Server Component.

```tsx
// src/app/page.tsx
import { redirect } from 'next/navigation';
import HallLanding from '@/components/hall/HallLanding';

export default async function RootPage({ 
  searchParams 
}: { 
  searchParams: Promise<{ room?: string, mode?: string }> 
}) {
  const params = await searchParams;
  const roomId = params.room;
  const mode = params.mode;

  if (roomId) {
    if (mode === 'hall') {
      redirect(`/hall/lobby/${roomId}`);
    } else {
      redirect(`/room/${roomId}`);
    }
  }

  return <HallLanding />;
}
```

## 3. New Page Implementations

### Participant Room Page
```tsx
// src/app/room/[roomId]/page.tsx
import { OnboardingProvider } from '@/context/OnboardingContext';
import { StepManager } from '@/components/mobile/StepManager';

export default async function ParticipantRoomPage({ 
  params 
}: { 
  params: Promise<{ roomId: string }> 
}) {
  const { roomId } = await params;
  return (
    <OnboardingProvider initialRoomId={roomId}>
      <main className="flex min-h-screen flex-col items-center justify-center font-sans">
        <StepManager roomId={roomId} />
      </main>
    </OnboardingProvider>
  );
}
```

### Hall Lobby Page
```tsx
// src/app/hall/lobby/[roomId]/page.tsx
import LobbyClient from '@/components/hall/LobbyClient';

export default async function HallLobbyPage({ 
  params 
}: { 
  params: Promise<{ roomId: string }> 
}) {
  const { roomId } = await params;
  return <LobbyClient roomId={roomId} />;
}
```

## 4. Component Refactoring

### `OnboardingProvider`
- **Change**: Add `initialRoomId` prop. Use it as the primary source for `roomId` state.
- **Support Both**: If `initialRoomId` is missing, fallback to search params (for Stage 2 compatibility).

### `StepManager`
- **Change**: Add `roomId` prop as an explicit dependency for any room-based logic.

## 5. Navigation Refactor

Replace ALL `window.location` and string-based redirection with `useRouter()`.

| File | Before | After |
| :--- | :--- | :--- |
| `HallLanding.tsx` | `router.push('/?room=X&mode=hall')` | `router.push('/hall/lobby/X')` |
| `LobbyClient.tsx` | `joinUrl = origin + '/?room=' + roomId` | `joinUrl = origin + '/room/' + roomId` |
| `hall/lobby/page.tsx` | `window.location.href = '/hall'` | `router.push('/hall')` |

## 6. Validation Checklist

- [ ] **Participant Flow**: Scanning QR or clicking legacy `/?room=X` redirects instantly to `/room/X` with full state.
- [ ] **Host Flow**: "Quick Setup" lands on `/hall/lobby/X` and D3 graph initializes correctly.
- [ ] **Direct Access**: Entering `/room/ABC` directly starts the onboarding flow for room ABC.
- [ ] **No Flicker**: Server-side `redirect()` ensures no "landing page flicker" before moving to the correct route.
- [ ] **Theme Isolation**: Check that `/room/*` has lilac background and `/hall/*` is deep black.
