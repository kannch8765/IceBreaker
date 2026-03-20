# Seed Participants Feature Walkthrough

Implemented a "Seed 20 Participants" development tool to rapidly populate a room with mock users, triggering the full real-time AI and matching pipeline.

## Changes Made

### 1. `src/hooks/useParticipant.ts`
- **Context Resilience**: Modified the hook to use `useContext(OnboardingContext)` directly. If the `OnboardingProvider` is missing (as in the Hall view), the hook now fails gracefully with empty fallbacks instead of throwing an error.
- **Explicit Parameters**: Added support for an `explicitRoomId` parameter, allowing the Hall view to pass its own room state without needing the global onboarding store.
- **Hook Modification**: Added an optional `options` parameter to `createParticipant`.
- **`skipStore` Logic**: 
  - If `skipStore: true`, the hook bypasses checking for an existing `participantId` and avoids updating the global `OnboardingContext`.
  - This allows a loop of `createParticipant` calls to create multiple distinct documents without hijacking the host's session.
- **Enhanced Payload**: Added support for `language` override and an `isSeed: true` metadata flag.

### 2. `src/components/hall/LobbyClient.tsx`
- **Seeder Integration**: Added the `seedParticipants` function and a UI button.
- **Safety Guards**:
  - **Dev Environment**: The button only renders when `process.env.NODE_ENV === 'development'`.
  - **Capacity Check**: The function checks `participants.length + 20 <= 50` before execution to prevent exceeding Firestore/Room limits.
  - **Failsafe**: Re-renders with a "Room Full" state if the limit is reached.
- **UX**: Added an `isSeeding` state to disable the button and show a loading spinner during the batch write.

### 3. `src/dev/generateMockParticipant.ts`
- **Mock Utility**: Created a helper to generate random usernames, pronouns, and moods.
- **Multilingual Support**: Guaranteed return of `"en"` or `"jp"` to test the i18n AI pipeline.

## Verification & Testing

### How it works
1. Start the application in development mode (`npm run dev`).
2. Create a room as a host.
3. In the Lobby (where the QR code is), a new amber-bordered button **"Seed 20 Participants"** will appear.
4. Click the button.
5. Watch the "Connected" counter increment by 20 instantly.
6. Verify in Firestore:
   - Each new document has `isSeed: true`.
   - Each new document has `status: "generating_questions"`.
   - Language is randomly assigned to `"en"` or `"jp"`.

### Clash Mitigation Tested
- **Uniqueness**: Each mock username is suffixed with a random string (e.g., `Sora_x7a2b9`) to prevent UI key issues or backend identity collisions.
- **Session Isolation**: Verified that clicking "Seed" does NOT change the current browser's `participantId` or `onboardingStep`.

---

> [!NOTE]
> This is a **development-only** feature. It will not be visible in production.
