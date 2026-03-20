# Hall Context Fix Plan

## 🎯 Goal
Fix the `useOnboardingStore must be used within an OnboardingProvider` error that occurs when the "Hall" (LobbyClient) view is accessed. This happens because `useParticipant` is now called in `LobbyClient`, but the Hall route doesn't have the context provider.

## Proposed Changes

### [Onboarding Context] Context
#### [MODIFY] [OnboardingContext.tsx](file:///d:/Github_Repos/IceBreaker/src/context/OnboardingContext.tsx)
- Export `OnboardingContext` so it can be accessed directly via `useContext` without the safety check in `useOnboardingStore`.

### [Frontend Hooks] Hooks
#### [MODIFY] [useParticipant.ts](file:///d:/Github_Repos/IceBreaker/src/hooks/useParticipant.ts)
- Update `useParticipant` to accept an optional `explicitRoomId?: string`.
- Use `useContext(OnboardingContext)` directly to avoid throwing an error if the provider is missing.
- Implement fallbacks for all store values (roomId, participantId, etc.) when the context is undefined.
- Ensure `createParticipant` uses the `explicitRoomId` if available.

### [Hall Components] Components
#### [MODIFY] [LobbyClient.tsx](file:///d:/Github_Repos/IceBreaker/src/components/hall/LobbyClient.tsx)
- Update hook call to: `const { createParticipant } = useParticipant(roomId);`.

## Impact Analysis

### 📱 Mobile Flow (Safe)
Components like `MoodStep`, `QuestionsStep`, and `ProcessingStep` are all rendered under the `/room` route, which is wrapped in an `OnboardingProvider` by `src/app/room/page.tsx`. Making the context optional in `useParticipant` will not affect them; they will continue to receive the full store as before.

### 🖥️ Hall Flow (Corrected)
The `/hall` route (LobbyClient) currently crashes because it lacks the provider. The proposed change allows the hook to fall back to an explicit `roomId` passed as a prop, bypassing the need for the provider in the Host/Lobby view.

## Verification Plan
...
