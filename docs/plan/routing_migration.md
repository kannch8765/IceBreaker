# Engineering Plan: Semantic Routing Migration

This document provides the implementable steps to transition from query-parameter-based dispatching to semantic file-based routing while preserving all existing user flows and UX behavior.

## 1. User Flow Preservation

We will maintain existing entry points via a client-side redirector in the root `page.tsx`.

### A. Participant Flow (Mobile)
- **Current Entry**: `/?room=X`
- **New Entry**: `/room/X`
- **Mapping**: The root `page.tsx` will detect `room` search param (and lack of `hall` mode) and redirect to `/room/X`.
- **UX Guarantee**: The `OnboardingProvider` will be wrapped around the individual route to maintain state. Theme (Lilac) remains isolated via the mobile layout.

### B. Host Flow (Desktop)
- **Current Entry**: `/?room=X&mode=hall` or `/hall/lobby?room=X`
- **New Entry**: `/hall/lobby/X`
- **Mapping**: Root `page.tsx` or `/hall/page.tsx` will detect these params and redirect to `/hall/lobby/X`.
- **UX Guarantee**: `LobbyClient` renders identically but takes `roomId` from the dynamic route segment.

## 2. Redirect / Backward Compatibility Strategy

We will use a **Client-Side Redirect Component** in `src/app/page.tsx`. 
**Why**: Since the project uses `output: 'export'`, `middleware.ts` is not compatible with standard static hosting. A client-side redirect ensures compatibility across all deployment targets (Firebase Hosting, Vercel, S3).

### Root Redirect Implementation (`src/app/page.tsx`)
```tsx
"use client";
import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import HallLanding from '@/components/hall/HallLanding';

export default function RootRedirector() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roomId = searchParams.get('room');
  const mode = searchParams.get('mode');

  useEffect(() => {
    if (roomId) {
      if (mode === 'hall') {
        router.replace(`/hall/lobby/${roomId}`);
      } else {
        router.replace(`/room/${roomId}`);
      }
    }
  }, [roomId, mode, router]);

  // If no roomId, just render the Hall Landing as the default entry point
  if (!roomId) {
    return <HallLanding />;
  }

  // Temporary loading state during redirect
  return <div className="min-h-screen bg-black" />;
}
```

## 3. Component Migration Details

### `OnboardingProvider` (`src/context/OnboardingContext.tsx`)
- **Old**: Extracts `roomId` strictly from `useSearchParams()`.
- **New**: Accepts an optional `roomId` prop. If provided, it overrides search params.
- **Change**: 
  ```tsx
  export function OnboardingProvider({ children, initialRoomId }: { children: React.ReactNode, initialRoomId?: string }) {
    const [roomId, setRoomId] = useState<string | null>(initialRoomId || null);
    // ... update useEffect to sync with initialRoomId
  }
  ```

### `StepManager` (`src/components/mobile/StepManager.tsx`)
- **Changes**: NONE. It continues to consume state from `useOnboardingStore()`.

### `LobbyClient` (`src/components/hall/LobbyClient.tsx`)
- **Changes**: Update `joinUrl` generation.
- **Old**: `const joinUrl = ${origin}/?room=${roomId};`
- **New**: `const joinUrl = ${origin}/room/${roomId};`
  *Note: We can keep the old URL if we want to rely on the redirect, but updating it to the new one is cleaner.*

### `HallLanding` (`src/components/hall/HallLanding.tsx`)
- **Change**: Update `handleQuickSetup`.
- **Old**: `router.push('/?room=${roomId}&mode=hall');`
- **New**: `router.push('/hall/lobby/${roomId}');`

## 4. Navigation Contract

| Action | Old Method | New Method |
| :--- | :--- | :--- |
| Enter Mobile Flow | `window.location.href = '/?room=X'` | `router.push('/room/X')` |
| Start Hall Lobby | `router.push('/?room=X&mode=hall')` | `router.push('/hall/lobby/X')` |
| Quit/Close Room | `router.push('/hall')` | `router.push('/hall')` (No change) |

## 5. Edge Cases

- **Missing `roomId`**:
    - On `/room/*` or `/hall/lobby/*`: Redirect to `/hall` via a simple check in the page component.
- **Invalid `roomId`**:
    - The `useRoomParticipants` hook already handles non-existent rooms in Firestore. No UI changes needed.
- **Direct Access**:
    - Direct access works out of the box with App Router dynamic segments.

## 6. Minimal Migration Plan

1. **Step 1: Create New Layouts & Folders**
   - Create `src/app/(mobile)/room/[roomId]` and `src/app/(hall)/hall/lobby/[roomId]`.
   - Setup `(mobile)/layout.tsx` (Lilac theme) and `(hall)/layout.tsx` (Dark theme).
2. **Step 2: Update `OnboardingProvider`**
   - Modify to accept `initialRoomId`.
3. **Step 3: Implement Redirector**
   - Swap root `page.tsx` content with the `RootRedirector` logic.
4. **Step 4: Cleanup**
   - Delete legacy files: `src/app/hall/lobby/page.tsx`, `src/app/hall/[roomId]/page.tsx`, etc.

## 7. Final Routing Tree

```text
src/app/
├── (hall)/
│   ├── layout.tsx
│   ├── hall/
│   │   └── page.tsx
│   └── lobby/
│       └── [roomId]/
│           └── page.tsx
├── (mobile)/
│   ├── layout.tsx
│   └── room/
│       └── [roomId]/
│           └── page.tsx
├── globals.css
├── layout.tsx
└── page.tsx
```
