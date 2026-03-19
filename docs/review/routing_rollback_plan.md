# Architectural Review: Routing Rollback & Simplification

This document outlines the plan to rollback the project's routing to a stable, query-parameter-based model optimized for static export on Firebase Hosting.

## 1. Current Architecture

| URL Path | File Path | Component | Data Source |
| :--- | :--- | :--- | :--- |
| `/` | `src/app/page.tsx` | `RootRedirector` | `searchParams` |
| `/hall` | `src/app/hall/page.tsx` | `HallLanding` | N/A |
| `/hall/[roomId]` | `src/app/hall/[roomId]/page.tsx` | `LobbyClient` | `params.roomId` |
| `/room/[roomId]` | `src/app/room/[roomId]/page.tsx` | `StepManager` | `params.roomId` |

### Component Data Flow:
- **`OnboardingProvider`**: Currently accepts `initialRoomId` as a prop (from `params`).
- **`StepManager`**: Currently accepts `roomId` as a prop.
- **`LobbyClient`**: Currently accepts `roomId` as a prop.

## 2. User Flow Mapping

### Current (Broken for Direct Access):
1. **Host**: `/` -> Click "Quick Setup" -> `router.push("/hall/[roomId]")`.
2. **Participant**: Scan QR -> `/room/[roomId]`.
3. **Legacy Mapping**: `/?room=X` -> `RootRedirector` -> `/room/X`.

### Target (Stable):
1. **Host Landing**: `/` (Displays `HallLanding`).
2. **Host Lobby**: `/hall?room=X` (Displays `LobbyClient`).
3. **Participant**: `/room?room=X&user=Y` (Displays `StepManager`).

## 3. Problems

- **Static Resolution**: `output: 'export'` cannot resolve dynamic path segments (`[roomId]`) at runtime for random/infinite IDs.
- **Hydration Mismatch**: Next.js expects a specific file for a specific path; using a generic "placeholder" file to serve all IDs is brittle.
- **Complexity**: The root `Suspense` and `RootRedirector` logic adds overhead for a problem that query parameters solve natively.

## 4. Rollback Plan

1. **Step 1: Adapt Components**: Change `LobbyClient` and `StepManager` to extract `roomId` from `useSearchParams()` again.
2. **Step 2: Create/Update Route Files**:
   - Update `src/app/page.tsx` to render `HallLanding`.
   - Update `src/app/hall/page.tsx` to detect `?room` and render `LobbyClient`.
   - Create `src/app/room/page.tsx` to handle the participant flow.
3. **Step 3: Update Navigation**: Update `router.push` calls to use query parameters.
4. **Step 4: Cleanup**: Delete the `[roomId]` directories.

## 5. Route Mapping Table

| Current Path | Target Path | Redirect Needed? |
| :--- | :--- | :--- |
| `/` (Redirector) | `/` (HallLanding) | No (Internal cleanup) |
| `/hall/[roomId]` | `/hall?room=X` | Yes (Legacy fallback) |
| `/room/[roomId]` | `/room?room=X` | Yes (Legacy fallback) |

## 6. Component Changes

### `OnboardingProvider` & `StepManager`
- **Revert**: Remove `initialRoomId` props. 
- **Restore**: Re-implement `useSearchParams()` inside `OnboardingProvider` as the primary source of truth.

### `LobbyClient`
- **Revert**: Remove `roomId` prop.
- **Restore**: Use `useSearchParams()` to get `room`.

## 7. Navigation Changes

- `router.push("/hall/${roomId}")` -> `router.push("/hall?room=${roomId}")`
- `joinUrl = origin + "/room/" + roomId` -> `joinUrl = origin + "/room?room=" + roomId`

## 8. Cleanup Plan

### Delete:
- `src/app/hall/[roomId]/`
- `src/app/room/[roomId]/`

### Keep:
- `src/app/page.tsx` (Modified)
- `src/app/hall/page.tsx` (Modified)
- `src/context/OnboardingContext.tsx` (Reverted)

## 9. Validation Checklist

- [ ] **Host Journey**: Home -> Quick Setup -> Lobby works perfectly.
- [ ] **Participant Journey**: Direct link `/room?room=ABC` starts onboarding.
- [ ] **Real-time Sync**: Firestore listeners connect to the room from the query param.
- [ ] **Direct Access**: Refreshing any page doesn't trigger 404.
