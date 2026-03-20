# Seed Participants Auto-Answer Walkthrough

Implemented an automated background observer to progress seeded participants from the "answering" stage to the AI profile generation stage, ensuring they reach the `ready` status without manual intervention.

## Changes Made

### 1. `src/dev/generateMockParticipant.ts`
- **`generateMockQA` Helper**: Added a function that takes an array of questions and returns a structured `qa` array (maps with `questionId`, `question`, and `answer`).
- **Answer Pool**: Included a varied list of generic participant answers to populate the mock data.

### 2. `src/components/hall/LobbyClient.tsx`
- **Throttled Observer**: Added a `useEffect` that monitors participants in the room.
- **Safety Guards**:
  - **Infinite Loop Protection**: Added `(!p.qa || p.qa.length === 0)` filter to ensure each participant is only processed once.
  - **Single-Item Processing**: Uses `participants.find()` to pick one candidate at a time.
  - **Locking State**: Introduced `processingIds` to prevent duplicate writes for the same participant across renders.
  - **Throttling**: Implemented a 500ms `setTimeout` to stagger Firestore updates, preventing backend and database spam.
- **Developer Scoped**: The observer is strictly disabled in production via `process.env.NODE_ENV !== 'development'`.

### 3. `src/hooks/useRoomParticipants.ts`
- **Type Safety**: Updated the `Participant` status union to include all intermediate AI pipeline stages:
  - `generating_questions`
  - `answering`
  - `waiting_for_ai`
  - `processing_ai`
- This resolved a TypeScript mismatch that previously blocked the observer logic.

## Verification & Results

### Automated Flow
1. **Lobby Creation**: Host creates a room.
2. **Seeding**: Host clicks "Seed 20 Participants".
3. **Observation**: 
   - Backend generates questions (`status: "answering"`).
   - `LobbyClient` detects the state and `!qa`.
   - `LobbyClient` submits mock answers.
   - Status transitions to `waiting_for_ai`.
4. **Completion**: Backend generates profiles, and icons transition from gray/stuck state to the D3 graph autonomously.

### Safety Confirmed
- **No Infinite Loops**: Verified `qa` existence check prevents re-triggering.
- **Manual Flow Intact**: Confirmed that `isSeed: false` participants (real users) are ignored by the observer.
- **Performance**: 20 seeds are processed sequentially over ~10 seconds without UI lag.

---

> [!TIP]
> This automation makes the "Seed" button a one-click demo prep tool. Watch the participant list for a few seconds after seeding to see them all turn "Ready".
