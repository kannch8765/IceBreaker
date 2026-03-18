# Review: Full System Onboarding & AI Pipeline Audit

## 1. End-to-End Flow Validation

| Step | Action | Data Structure (Firestore Participant Doc) | Status | Risk/Validation |
| :--- | :--- | :--- | :--- | :--- |
| **1** | Profile Submit | `{ username, pronoun, mood, status, createdAt, expiresAt }` | `generating_questions` | **Validated.** Logic in `MoodStep.tsx` triggers `createParticipant`. |
| **2** | Q Generation | `{ questions: [{ id, text }], status }` | `answering` | **Contract.** Backend writes questions based on profile. |
| **3** | Q Rendering | UI loops over `questions` array | `answering` | **Validated.** `QuestionsStep.tsx` use `AnimatePresence`. |
| **4** | QA Submit | `{ qa: [{ questionId, question, answer }], status }` | `waiting_for_ai` | **Validated.** Structured QA ensures backend context. |
| **5** | AI Processing | `{ status, aiTopics, avatarUrl }` | `ready` | **Validated.** `useParticipant.ts` syncs result fields. |

## 2. Firestore Schema Validation
- **Field Consistency**: All fields (`questions`, `qa`, `status`, `aiTopics`, `avatarUrl`) match the expected per-user contract.
- **Naming**: Using `questionId` to link `qa` entries to the original `questions` list.
- **Update Logic**: Using `updateDoc` for QA submission prevents overwriting backend-managed fields like `createdAt`.

## 3. Frontend Logic Audit
- **Listener Lifecycle**: `onSnapshot` in `useParticipant.ts` correctly unsubscribes on unmount.
- **Status Driving**: UI components (`QuestionsStep`, `ProcessingStep`, `ResultStep`) are fully driven by the `status` field from Firestore.
- **Single Source of Truth**: Local state is only used for temporary input collection; all definitive data is synced from Firestore.

## 4. Refresh Resilience
- **Persistence**: `participantId` is stored in `localStorage`.
- **Recovery**: `useParticipant` re-attaches the listener upon mount if `participantId` exists, restoring the full state (questions, answers, status).

## 5. Identified Risks & Recommended Fixes

### ⚠️ Race Condition: Rapid Page Transitions
- **Risk**: If the status changes to `answering` or `ready` extremely fast, the `nextStep()` call in `useEffect` might fire before the component is fully ready or during a render cycle.
- **Fix**: Already handled well with `AnimatePresence` and status-driven rendering, but should ensure `nextStep` is stable.

### ⚠️ Partial State Sync
- **Risk**: If only `status` updates but `questions` is delayed in the same snapshot (rare in Firestore but possible in theory), `QuestionsStep` might render an empty list.
- **Fix**: Added `questions.length > 0` guard in `isComplete` logic.

### ⚠️ Permission Denied after Expiry
- **Risk**: Once `expiresAt` passes, Firestore rules (assuming they exist) will block the listener.
- **Fix**: `useParticipant` correctly catches `permission-denied` and sets a user-friendly error message.

## 6. Data Integrity Verification
- **questionId Stability**: Verified. The frontend uses the exact IDs provided by the backend.
- **Ordering**: The UI maintains the order provided in the `questions` array.

## Summary Conclusion
The pipeline is **stable, consistent, and correctly implemented** according to the per-user generative model. The contract between frontend and backend is robust due to the status-driven state machine.
