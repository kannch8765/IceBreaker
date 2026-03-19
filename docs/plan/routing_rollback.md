# Implementation Plan: Routing Rollback to Query Parameters

Revert from dynamic path segments (`/hall/[roomId]`) to a stable query-parameter model (`/hall?room=X`) optimized for static export.

## Proposed Changes

### 1. `src/context/OnboardingContext.tsx`
- **Revert**: Restore `useSearchParams` as the primary source of truth for `roomId`.
- **Goal**: Ensure the context automatically picks up the room from the URL.

### 2. `src/app/page.tsx` [MODIFY]
- **Simplify**: Remove `RootRedirector`. 
- **Change**: Render `HallLanding` directly. This becomes the primary entry point for hosts.

### 3. `src/app/hall/page.tsx` [MODIFY]
- **Refactor**: Transform into a "Host Router".
- **Logic**: Use `useSearchParams` to decide between `HallLanding` (no room) and `LobbyClient` (with room).
- **Goal**: Implement `/hall?room=X` as the host lobby.

### 4. `src/app/room/page.tsx` [NEW]
- **Implement**: A simple page that wraps `OnboardingProvider` and `StepManager` in a `Suspense` boundary.
- **Logic**: No `params` needed; components will use `useSearchParams` internally.

### 5. `src/components/hall/HallLanding.tsx` [MODIFY]
- **Update**: `handleQuickSetup` should call `router.push('/hall?room=' + roomId)`.

### 6. `src/components/hall/LobbyClient.tsx` [MODIFY]
- **Update**: `joinUrl` should be generated as `${origin}/room?room=${roomId}`.

## Verification Plan

### Automated Tests
- Run `npm run build` to ensure static export finishes without `missing param` errors.

### Manual Verification
1. **Host Flow**:
   - Access `/`.
   - Click "Quick Setup".
   - Verify URL changes to `/hall?room=XXXX`.
   - Verify `LobbyClient` loads and connects to Firestore.
2. **Participant Flow**:
   - Copy the "Join URL" from the Lobby.
   - Access it in a new tab.
   - Verify URL matches `/room?room=XXXX`.
   - Verify onboarding starts correctly.
3. **Direct URL Entry**:
   - Manually enter `/hall?room=EXISTING_ID` and `/room?room=EXISTING_ID`.
   - Verify they both load correctly without redirection flickering.
