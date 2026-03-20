# Audit Review: ResultStep aiTopics Display

## 1. Context
- **Component**: `ResultStep.tsx`
- **Issue**: `aiTopics` associated with `matchedParticipant` are sometimes not displayed, especially for non-English users.
- **Observed Behavior**: The UI shows "No topics generated" or nothing where the topics should be.

## 2. Technical Analysis

### 2.1. Expected Data Structure
The frontend expects `matchedParticipant.aiTopics` to be a flat `string[]` (Array of strings).
Sample Data provided:
```json
{
  "affinityScore": 82,
  "aiTopics": ["Topic 1", "Topic 2", "Topic 3"],
  "avatarUrl": "...",
  "participantId": "..."
}
```

### 2.2. Root Causes Identified
1.  **Listener Lifecycle Discontinuity (Primary)**:
    - The Firestore listener is managed inside the `useParticipant` hook.
    - Components like `ProcessingStep` and `SessionWaitingPage` call `useParticipant`, which starts the listener.
    - However, `ResultStep.tsx` **does not** call `useParticipant`.
    - When the UI transitions to `ResultStep`, the previous component unmounts, triggering the `unsubscribe()` cleanup in `useParticipant`.
    - If `matchedParticipant.aiTopics` arrived slightly after the `ready` status or was missed during the transition, the listener is dead and the data never arrives in the store.
2.  **Stale Dependency Array in `useParticipant.ts`**:
    - The `useEffect` that sets up the `onSnapshot` listener is missing `setMatchedParticipant` in its dependency array.
    - This can lead to the listener being bound to a stale (or fallback) setter, preventing the store from updating correctly when the Firestore document changes.

## 3. Findings
- The UI logic fails when the listener is killed during the transition to the result page.
- Even if the data exists in Firestore, the frontend stops listening before it can process the final state of the `matchedParticipant` object.

## 4. Recommendations
- Update `ResultStep.tsx` to call `useParticipant()` to maintain the Firestore listener.
- Fix the `useEffect` dependency array in `useParticipant.ts` to include all relevant store setters.
- Add the requested `console.log` for debugging.
