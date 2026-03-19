# Walkthrough: Semantic Routing Implementation

I have completed the refactor to a semantic routing model, optimized for Firebase Hosting's static export requirement.

## 1. Routing Contract Changes

The project now uses file-based routes that reflect the application's resource hierarchy.

| Flow | URL Path | File Path |
| :--- | :--- | :--- |
| **Participant** | `/room/[roomId]` | `src/app/room/[roomId]/page.tsx` |
| **Host Lobby** | `/hall/[roomId]` | `src/app/hall/[roomId]/page.tsx` |
| **Host Landing** | `/hall` | `src/app/hall/page.tsx` (or root) |

## 2. Technical Updates

### A. Client-Side Redirector (`src/app/page.tsx`)
Because the project uses `output: 'export'`, it lacks a server runtime to handle dynamic query-param redirects. I implemented a `"use client"` redirector that handles legacy URLs with minimal flicker:
- `/?room=X` redirects to `/room/X`
- `/?room=X&mode=hall` redirects to `/hall/X`

### B. Suspense & Static Export
All dynamic routes now include **`generateStaticParams()`** with placeholder identifiers to satisfy the Next.js static export build process. Components using `useSearchParams` (like `OnboardingProvider`) are wrapped in **`Suspense`** boundaries to prevent static build bailout.

### C. Component Data Flow
- **`OnboardingProvider`**: Now accepts an `initialRoomId` prop, ensuring the `roomId` is immediately available from the URL segment without waiting for the `useSearchParams` hook.
- **`StepManager`** & **`LobbyClient`**: Now explicitly receive `roomId` via props, making them pure and easier to test.

## 3. Navigation Refactor
Replaced all legacy `window.location.href` calls with `router.push()` from `next/navigation` for faster, client-side transitions.

## 4. Verification Results

- [x] **Build Status**: `npm run build` succeeded (Static Export generated in `out/`).
- [x] **Flow Preservation**: All legacy links remain compatible via the root redirector.
- [x] **Theme Isolation**: Validated that `/room/*` and `/hall/*` correctly maintain their theme contexts.
