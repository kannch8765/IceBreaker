# Root Cause Analysis: Static Export Routing Error

This document analyzes the failure of runtime dynamic routes in a project configured for static export.

## 1. Root Cause

The error occurs because **`output: 'export'` turns Next.js into a purely static site generator (SSG)**. In this mode:

- **Build-Time Prerendering**: Every dynamic route MUST have its exact parameters defined at build time via `generateStaticParams`.
- **Static File Mapping**: Next.js generates physical HTML files for each parameter (e.g., `out/hall/placeholder/index.html`).
- **Runtime Failure**: When a user accesses a URL with a runtime ID (like `/hall/KCUQZ8`), the static host (Firebase) looks for a file at that exact path. Since that ID was not known at build time, the file does not exist, leading to a 404 or a routing mismatch error in Next.js hydration.

## 2. Code Findings

In `src/app/hall/[roomId]/page.tsx` and `src/app/room/[roomId]/page.tsx`:
```tsx
export function generateStaticParams() {
  return [{ roomId: 'placeholder' }];
}
```
- **Limitation**: This only generates one valid route: `/hall/placeholder`. 
- **Conflict**: Because `roomId` is generated randomly at runtime (e.g., `KCUQZ8`), it is mathematically impossible to include these IDs in `generateStaticParams` during the build process.

## 3. Architectural Constraint Check

**Dynamic runtime IDs are fundamentally incompatible with standard Next.js dynamic *segments* (`[roomId]`) in a static export environment.**

Next.js App Router expects `[roomId]` to represent a finite set of resources known at build time (like blog posts or product IDs). For "infinite" or "random" runtime IDs, the file-based segment approach breaks without a server-side runtime to handle the dynamic resolution.

## 4. Solution Options

### A. Return to Query Parameters (Recommended)
Use `/hall?room=X` and `/room?room=X`. 
- **Pros**: Perfectly compatible with static export; works out-of-the-box with direct URL entry on Firebase Hosting; no build-time requirement.
- **Cons**: Less "clean" URLs.

### B. Client-Side Hash Routing
Use `/hall#KCUQZ8`.
- **Pros**: Client-only, survives static exports.
- **Cons**: Fragment identifiers are not sent to servers (though relevant here since there's no server).

### C. SPA Fallback Rewrite (Hacky)
Configure `firebase.json` to rewrite all `/hall/**` to `/hall/placeholder/index.html`.
- **Pros**: Keeps the clean URL structure.
- **Cons**: Extremely brittle; can cause Next.js hydration "Mismatch" errors; violates how Next.js expects static segments to work.

### D. Switch to SSR
Remove `output: 'export'`.
- **Verdict**: Forbidden by user constraints (No server runtime).

## 5. Recommended Fix

We should **revert the `roomId` from a path segment back to a query parameter** for the active session views, while keeping the structural folder cleanup.

**Proposed Paths:**
- Participant: `/room?room=KCUQZ8`
- Host: `/hall?room=KCUQZ8`
- Landing: `/hall` or `/`

This provides the exact same functionality, persists across direct URL entires on static hosting, and eliminates all build-time `generateStaticParams` errors.
