# Proposed Routing Refactor: Ice-Breaker!

This plan outlines the steps to decentralize the routing logic from the root `page.tsx` and create a semantic, scalable directory structure using Next.js Route Groups.

## 1. Target Structure

```text
src/app/
├── (hall)/                 # Route Group: Event Hall (Dark Theme)
│   ├── layout.tsx          # Green/Black theme, global Hall state
│   ├── hall/
│   │   └── page.tsx        # Host Landing (moved from root)
│   └── lobby/
│       └── [roomId]/
│           └── page.tsx    # Live Graph / Room view (dynamic roomId)
├── (mobile)/               # Route Group: Participant Mobile (Light Theme)
│   ├── layout.tsx          # Lilac theme, participant state
│   └── room/
│       └── [roomId]/
│           └── page.tsx    # Onboarding Flow (moved from root query param)
├── api/                    # Route Handlers (if needed later)
├── globals.css
├── layout.tsx              # Minimal Shared Layout (e.g. meta tags, context)
└── page.tsx                # Simple Landing or Redirect logic
```

## 2. Refactoring Steps

### Step 1: Decentralize Root Dispatcher
- Move `HallLanding` logic from root `page.tsx` to `src/app/(hall)/hall/page.tsx`.
- Move `StepManager` logic from root query param (`?room=X`) to `src/app/(mobile)/room/[roomId]/page.tsx`.
- Move `LobbyClient` logic from root query param (`?room=X&mode=hall`) to `src/app/(hall)/lobby/[roomId]/page.tsx`.

### Step 2: Extract Theme Layouts
- **`(hall)/layout.tsx`**: Add a `<div className="dark">` wrapper or a theme provider to ensure Hall routes always use the Green/Black theme.
- **`(mobile)/layout.tsx`**: Add the Lilac theme background styles directly to this layout.

### Step 3: Cleanup Redundancy
- Delete `src/app/hall/page.tsx` (now in `(hall)/hall/page.tsx`).
- Delete `src/app/hall/lobby/page.tsx` (replaced by dynamic `[roomId]`).
- Delete `src/app/hall/[roomId]` (consolidated into `(hall)/lobby/[roomId]`).

### Step 4: Fix Internal Navigation
- Update all `window.location.href` to use semantic paths:
    - `/` -> `/hall`
    - `/?room=X` -> `/room/X`
    - `/?room=X&mode=hall` -> `/hall/lobby/X`

## 3. Benefits

- **Semantic URLs**: `/hall`, `/room/123`, `/hall/lobby/123` are self-describing.
- **Theme Isolation**: No more "leaking" Hall styles into the Mobile view.
- **Optimized Loading**: Participants visiting the mobile view won't load the D3.js heavy logic for the Lobby unless needed.
- **Maintenance**: Adding a new step to onboarding just requires a component update in `(mobile)`, with no risk of breaking the Hall.

## 4. Migration Risks
- **External Links**: Existing QR codes or shared links pointing to `?room=X` will need a redirect in the root `page.tsx` to maintain backward compatibility.
- **Search Params to Params**: Shifting from `useSearchParams()` to `params.roomId` requires updating the `LobbyClient` and `StepManager` props.
