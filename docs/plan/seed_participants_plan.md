# Seed Participants Feature Plan

Implement a dev-only "Seed Participants" button in the Hall view to rapidly populate a room with ~20 simulated users. This uses the real backend pipeline (AI, matching, etc.) by reusing the existing `createParticipant` logic.

## Proposed Changes

### [Frontend Hooks] Hooks

#### [MODIFY] [useParticipant.ts](file:///d:/Github_Repos/IceBreaker/src/hooks/useParticipant.ts)
- Update `createParticipant` to accept an optional `options` parameter: `{ skipStoreSync?: boolean }`.
- When `skipStoreSync` is true, it will:
  - Skip the `if (participantId)` check (preventing it from updating the user's own record).
  - Skip calling `setParticipantId` (preventing it from hijacking the user's current session).
  - This allows a loop of calls where each call creates a *new* participant ID.

### [Hall Components] Components

#### [NEW] [ParticipantSeeder.tsx](file:///d:/Github_Repos/IceBreaker/src/components/hall/ParticipantSeeder.tsx)
- Create a new component that contains a "Seed 20 Participants" button.
- Logic:
  - Loop 20 times.
  - Generate a random username, mood, and pronoun.
  - Call `createParticipant({ username, mood, pronoun, inputMode: 'mood' }, { skipStoreSync: true })`.
- Guard: Only render if `process.env.NODE_ENV === 'development'`.

#### [MODIFY] [LobbyClient.tsx](file:///d:/Github_Repos/IceBreaker/src/components/hall/LobbyClient.tsx)
- Import and render `<ParticipantSeeder />` in the host control area.
- Visuals: Use a distinct color (e.g., amber or cyber-green) to mark it as dev-only.

## Verification Plan

### Manual Verification
1. Start the app in development mode.
2. Go to `/hall` and create a room.
3. Click "Seed 20 Participants".
4. Monitor the "Connected" count; it should increment to 20.
5. In the Firestore console, confirm 20 new participant documents exist in the `participants` sub-collection of the room, each with `status: "generating_questions"`.
6. Confirm the D3 background graph responds to the new users.
7. Confirm that matching works by starting the session.
