# State Machine & AI Pipeline Consistency Audit

## 1. Status Extraction and Ownership

| Status Value | Written By | Read By | Purpose |
| :--- | :--- | :--- | :--- |
| `generating_questions` | Frontend (`useParticipant.ts`) | Backend Worker | Triggers the first Gemini AI call. |
| `processing_questions` | Backend Worker | **No one (Unhandled)** | Locks the document to prevent duplicate backend processing. |
| `answering` | Backend Worker | Frontend (`useParticipant.ts`) | Signals that AI questions are ready for the user to answer. |
| `waiting_for_ai` | Frontend (`QuestionsStep.tsx`) | Backend Worker | Triggers the second Gemini AI call. |
| `processing_ai` | Backend Worker | **No one (Unhandled)** | Locks the document to prevent duplicate backend processing. |
| `ready` | Backend Worker | Frontend (`ProcessingStep.tsx`) | Signals that the final AI profile and avatar are ready. |
| `error` | Backend Worker | Frontend (`useParticipant.ts`) | Broadcasts a failure during AI generation. |

---

## 2. State Transition Flow

### Expected Happy Path
`generating_questions` → `processing_questions` → `answering` → `waiting_for_ai` → `processing_ai` → `ready`

### Execution Trace
1. **[Frontend]** Initial form complete → sets `generating_questions`.
2. **[Backend]** Worker polls `generating_questions` → immediately updates to `processing_questions` (Lock).
3. **[Backend]** Calls FastAPI / Vertex AI.
4. **[Backend]** Success → updates to `answering` and writes `questions` array.
5. **[Frontend]** User submits answers → sets `waiting_for_ai`.
6. **[Backend]** Worker polls `waiting_for_ai` → immediately updates to `processing_ai` (Lock).
7. **[Backend]** Calls FastAPI / Vertex AI.
8. **[Backend]** Success → updates to `ready` and writes `aiTopics` & `avatarUrl`.

---

## 3. Architectural Inconsistencies & Issues

### A. Premature UI Unlocking (Race Condition) - **HIGH RISK**
- **Symptom:** In `QuestionsStep.tsx`, the loading spinner is strictly gated by `status === 'generating_questions'`. 
- **The Bug:** As soon as the backend locks the task by setting `status` to `processing_questions`, the frontend's condition evaluates to `false`. The UI immediately drops the loading spinner and attempts to render the question form. However, because the text questions have not been generated/written yet, the user is presented with a **blank or broken screen** until the backend finishes and sets `answering`.

### B. Worker Deadlock on Crash - **MEDIUM RISK**
- **Symptom:** Temporary network failures or container crashes permanently trap users.
- **The Bug:** The backend lock is primitive (no timeout). If the Python script crashes *after* setting `processing_questions` or `processing_ai`, the document is permanently stuck. The `poll_participants` function only searches for `generating...` and `waiting...`, meaning no worker will ever reclaim the orphaned lock.

### C. Error State Paralysis - **LOW/MEDIUM RISK**
- **Symptom:** UI catches the error but doesn't offer a recovery path.
- **The Bug:** If an API quota is exceeded, the backend writes `error`. The frontend safely displays the `errorMessage`, but there is no "Retry" mechanic to reset the status back to `generating_questions`, forcing the user to hard-refresh or go back.

---

## 4. Risk Assessment & Recommendations

| Issue | Severity | Recommended Fix Strategy (Frontend scope) |
| :--- | :--- | :--- |
| **Blank Screen during Lock** | **HIGH** | Update `QuestionsStep.tsx` condition to show the loader for both `generating_questions` AND `processing_questions`. Only display the form on `answering` or if `questions.length > 0`. |
| **Deadlock handling** | **MEDIUM** | Frontend could implement a localized timeout. If stuck in `processing_*` for > 30 seconds without transitioning, the frontend safely resets the status back to the pre-lock state to force a backend retry. |
| **Processing Blindness** | **LOW** | `ProcessingStep.tsx` safely waits for `ready`, so `processing_ai` is harmlessly ignored. However, it would be beneficial to track `processing_ai` to provide UI feedback ("AI is finalizing..."). |
