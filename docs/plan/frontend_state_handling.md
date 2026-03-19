# Frontend State Handling Implementation Plan

## 1. UI State Mapping Table

To prevent race conditions and blank states, the frontend should stop reading raw backend statuses directly. Instead, we map groups of raw statuses and their associated data dependencies to distinct, stable **UI States**.

| Raw Backend Status | Data Condition Requirement | Stable UI State | UI Strategy |
| :--- | :--- | :--- | :--- |
| `generating_questions` | N/A | `LOADING_QUESTIONS` | Worker is either idle or starting. Show spinner. |
| `processing_questions` | N/A | `LOADING_QUESTIONS` | Worker acquired lock. Continue showing spinner. |
| `answering` | `questions.length > 0` | `ANSWERING_FORM` | Questions safely received. Render the input form. |
| `waiting_for_ai` | N/A | `LOADING_PROFILE` | User submitted. Worker is idle or starting. Show waiting UI. |
| `processing_ai` | N/A | `LOADING_PROFILE` | Worker acquired lock. Show waiting UI. |
| `ready` | `aiTopics` available | `PROFILE_READY` | Backend finished. Proceed to Results. |
| `error` | N/A | `ERROR` | Backend failed. Show error text and Retry button. |
| *Any target status* | Data condition is unmet | *Revert to Previous* | Failsafe: if `status` changes before data syncs, block the jump. |

---

## 2. Centralized Abstraction Layer

Create a unified custom hook, e.g., `useParticipantStatus()` derived from your global store.

**Purpose:**
It ingests `status`, `questions`, and `error` from the Context, and exports a simplified, deterministic `uiState` (String Literal) perfectly aligned with component render logic.

**Logic Rules for Deriving `uiState`:**
- **Loading Spinner (Questions):** Return `'loading_questions'` if status is `generating_questions` OR `processing_questions`. Crucially, also return this if `status === 'answering'` BUT the `questions` array is missing or empty.
- **Active Form:** Return `'answering_form'` ONLY if status is `answering` AND `questions.length > 0`.
- **Loading Waiting Screen (Profile):** Return `'loading_profile'` if status is `waiting_for_ai` OR `processing_ai`.
- **Results Trigger:** Return `'profile_ready'` ONLY if status is `ready`.
- **Error Recovery:** Return `'error'` if status is `error`.

---

## 3. Minimal Changes to Components

### A. `useParticipant.ts` (or `useParticipantStatus.ts`)
- **What to change:** Combine the status reading into the new hook. Extract logic that stops the "taking long" timeout so it respects the unified `uiState`.
- **Add Retry Functionality:** Introduce an exported `retryAi()` function. This sends an `updateDoc` command to force the backend status back to the start of its cycle based on the current stage:
  - If stuck around questions, revert to `generating_questions`.
  - If stuck around profiles, revert to `waiting_for_ai`.

### B. `QuestionsStep.tsx`
- **What to change:** Remove the strict `status === 'generating_questions'` ternary logic. Instead, `switch` on `uiState`.
- If `uiState === 'loading_questions'`, show the `<Loader2 />` and loading text.
- If `uiState === 'answering_form'`, map over the questions and show the textareas.
- If `uiState === 'error'`, render the error message alongside a "Retry Generation" button calling `retryAi()`.

### C. `ProcessingStep.tsx`
- **What to change:** Stop implicitly waiting for `'ready'`. Explicitly switch on `uiState`.
- If `uiState === 'loading_profile'`, actively display the pulsing UI and "AI is creating your card" messaging.
- If `uiState === 'profile_ready'`, execute the `nextStep()` call.
- If `uiState === 'error'`, surface the error text and a "Retry Analysis" button calling `retryAi()`.

---

## 4. Edge Cases Handling

1. **`processing_*` locks (Backend Processing Race):** 
   - By treating both the `generating_questions` trigger and the `processing_questions` lock as the exact same `LOADING_QUESTIONS` UI state, the loading spinner never vanishes. The UI remains perfectly stable during API handshakes.
2. **Missing data but status transitioned:**
   - The UI state strictly requires BOTH the proper status flag AND the corresponding payload (e.g., `questions.length > 0`). If Firestore delivers the `answering` status milliseconds before the questions array is fully populated, the UI state falls back safely to `'loading_questions'`, fully resolving "blank screen" flickers.
3. **Error Recovery & Deadlock Prevention:**
   - The addition of `retryAi()` explicitly handles vertex AI failures by rolling back to a clean trigger state.
   - For backend crashes that orphan the `processing_*` lock, the frontend's 45-second `isTakingLong` timer can automatically toggle the UI into the `ERROR` state, allowing the user to hit "Retry" and un-stick the backend.
