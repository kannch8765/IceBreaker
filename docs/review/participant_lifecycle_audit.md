# Participant Lifecycle & Navigation Audit

## 1. Participant Creation Flow

**Execution Trace:**
1. The user completes the form on `MoodStep.tsx` (Step 3).
2. The user clicks either "Continue" (after selecting a Mood) or the mock "Take Photo" button.
3. The `onClick` handler fires and unconditionally awaits `createParticipant()` from `useParticipant.ts`.
4. `createParticipant()` checks if the room has < 50 users.
5. It then blindly generates a new document reference using `doc(participantsRef)`, which produces a random Firestore ID.
6. The new participant data is written to Firestore with `status: 'generating_questions'`.
7. The new `participantId` is saved to the global context (and synced to `localStorage`), and `nextStep()` is called.

**Analysis constraints:**
- **Can it run multiple times?** Yes, it is tied to an `onClick` event without any disabled-state protection against re-runs if the user navigates away and back.
- **Is there any guard preventing duplicate creation?** No guards exist to prevent this.
- **Is `participantId` checked before creating?** No. `useParticipant.ts` completely ignores whether `participantId` already exists in the context or `localStorage`.

---

## 2. Session & Persistence Logic

**Persistence Mechanism (`OnboardingContext.tsx`):**
- **Storage:** `participantId`, `onboardingStep`, `roomId`, and `preferredLanguage` are saved to `localStorage` via simple `useEffect` hooks.
- **Restoration:** On component mount, `localStorage` is read and state is restored. (If `preferredLanguage` isn't found, the user is forced back to Step 1).

**Reuse vs New:**
- If the application reloads on `QuestionsStep` (Step 4), the existing `participantId` is successfully restored and reused.
- However, if the user navigates back to `MoodStep` (Step 3) and clicks the "Continue" button, a **new participant is always created**, immediately overwriting the persisted `participantId` locally but leaving the old one in Firestore. There is no logic aiming to "reuse" an existing `participantId` during the creation step itself.

---

## 3. Navigation Behavior

**Impacts of specific user actions:**
- **Goes Back (`prevStep`) from Step 4 to Step 3:** The user's `step` state changes back to 3. When they click "Continue" again on the Mood view, `createParticipant` fires again, generating a completely new participant. The previous participant record is orphaned in Firestore.
- **Refreshes Page on Step 3:** The page restores step 3. If they had a `participantId` saved locally, clicking "Continue" will generate a new one, overwriting the local copy and orphaning the existing Firestore record.
- **Re-enters `/room`:** If the user drops out and re-enters without clearing `localStorage`, they will be restored to their last active step. If that step relies on creating a participant (or if they navigate back to one), a duplicate is spawned.
- **Opens same room twice:** In different tabs/browsers without shared `localStorage`, distinct participants are naturally generated.

**Conclusion:** ANY flow that routes a user back through `MoodStep.tsx`'s continue button will unconditionally generate a new participant document in Firestore.

---

## 4. Firestore Write Behavior

**Write Characteristics:**
- **ID Generation:** Randomly generated on the client via `doc(collection(db, 'rooms', roomId, 'participants'))`.
- **Idempotency:** Writes are **strictly non-idempotent**. Calling the function multiple times with the exact same payload results in multiple unique documents. 
- **Overwrite vs Create:** The system *always* creates a new participant during the initial step. Overwrites only happen during `QuestionsStep` (Step 4) when `updateParticipant` is called to attach answers to the (latest) `participantId`.

---

## 5. Data Integrity Risks

- **Duplicate Participants & Ghost Users:** A single user clicking "Back/Forward" heavily will spawn multiple graphical nodes on the Hall view, confusing hosts and skewing real-time presence data.
- **Orphan Records:** Users who drop off during `MoodStep` or navigate back-and-forth leave partially-complete records taking up database capacity.
- **Room Capacity Distortion:** Because `createParticipant` checks for a 50-participant limit, a single user hitting "Back" 50 times will completely lock the room and block new legitimate users from joining.
- **Billing / Vertex AI Abuse:** Every generated participant triggers `status: 'generating_questions'`. If the backend blindly listens to this status, a user toggling back and forth can trigger repeated, expensive calls to Vertex AI.
- **Race Conditions:** Rapidly clicking the "Continue" button on `MoodStep` before the React state registers the transaction could fire multiple simultaneous writes, although loading states attempt to migrate this risk.

---

## 6. Key Architectural Weaknesses

1. **Lack of Idempotency in Creation:** The creation function assumes a one-way, linear flow that never loops back, which contradicts modern mobile component workflows.
2. **Missing State Synchronization:** The frontend state (LocalStorage + React Context) maintains only a 1:1 relationship with the **latest** generated participant. The database mistakenly maintains a 1:N relationship (one user session -> many participant records). 
3. **Missing Cleanup Lifecycle:** There is no mechanism to detect a "dead" `participantId` when `localStorage` overwrites it, meaning orphaned Firestore documents are technically handled "correctly" as active users until they reach their 2-hour hard expiration.
