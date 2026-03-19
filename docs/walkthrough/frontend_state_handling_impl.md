# Frontend State Handling Implementation

## 1. Centralized Hook (`useParticipantStatus`)
Successfully created the UI abstraction layer within `src/hooks/useParticipant.ts`.
- Developed the `UIState` string union: `"loading_questions" | "answering_form" | "loading_profile" | "profile_ready" | "error"`.
- Implemented robust condition mapping. Crucially, the UI seamlessly merges `generating_questions` and `processing_questions` into the single `loading_questions` state, entirely solving the race condition "blank screen" bug.
- Implemented `retryAi()` utilizing `updateDoc` to revert a stuck Firestore user back to the correct triggering state (`generating_questions` or `waiting_for_ai`).

## 2. Refactored `QuestionsStep.tsx`
- Replaced the direct `status === 'generating_questions'` check with the safe `uiState` abstraction.
- Integrated the new `uiState === 'error'` branch that beautifully renders the error text alongside a "Retry Connection" button bound to `retryAi()`.
- Stripped out fragile conditions for the form view, now simply relying on `uiState === 'answering_form'` to guarantee questions are actively in memory.

## 3. Refactored `ProcessingStep.tsx`
- Adjusted the `useEffect` trigger from implicit raw backend variables (`status === 'ready'`) to the explicit frontend mapping (`uiState === 'profile_ready'`).
- Mapped the wait animation and dynamic loading text strictly to the abstracted UI payload.
- Injected an error display div utilizing `retryAi()` if Vertex APIs succumb to quota limits or dropouts.

## 4. Build and Verification
The `npm run build` command was successfully executed immediately after changes:
- 0 TypeScript errors. No type mismatches on the string unions.
- 0 Linting anomalies detected. 
- Static page rendering confirmed component stability.
