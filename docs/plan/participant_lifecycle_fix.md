# Participant Lifecycle Fix Plan

## 1. Fix Strategy Overview

**Goal:** Ensure `createParticipant()` is strictly idempotent by reusing the existing `participantId` if it is present in the `OnboardingContext` (and thus `localStorage`), instead of blindly generating a new Firestore document on every invocation.

**Core Mechanism:** 
The primary guard will live within the `createParticipant` function in `useParticipant.ts`. 
When invoked, the function will evaluate:
1. Does a `participantId` already exist in global state/localStorage?
2. If YES: Attempt to update the existing Firestore document (Upsert pattern).
3. If NO (or if the update falls back because the document was deleted/expired): Create a brand new Firestore document and save the new ID.

This allows the frontend components (`MoodStep`, etc.) to continue unconditionally calling `createParticipant()` on "Continue" while shifting the responsibility of deduplication to the hook.

---

## 2. Updated Participant Lifecycle

**New Flow (Step-by-Step):**
1. **User enters `/room`:** `OnboardingContext` mounts and checks `localStorage`.
2. **Context Restoration:** If a `participantId` is found, it is loaded into the React state.
3. **User proceeds to `MoodStep` (Step 3):** User selects a mood and clicks "Continue".
4. **`createParticipant()` is called:**
   - **Check:** The hook sees an existing `participantId`.
   - **Reuse Path:** Instead of creating a new `doc()`, it attempts to `updateDoc` (or `setDoc` with `{ merge: true }`) on the existing document reference with the latest form data (username, pronoun, mood, language).
   - **Fallback Path:** If the document doesn't exist in Firestore (e.g., hard-deleted or expired), it catches the error and creates a new document.
5. **Proceed:** The hook successfully returns the resolved `participantId` (either reused or new) and the user moves to Step 4 (`QuestionsStep`).

**Behavior Outcomes:**
- **Refresh:** User refreshes on Step 3 -> Context restores `participantId` -> Clicking "Continue" runs an Update (no duplicate).
- **Back/Forward:** User goes back from Step 4 to Step 3 -> Context still holds `participantId` -> Clicking "Continue" runs an Update (no duplicate).

---

## 3. Changes Required (Minimal)

**1. `src/hooks/useParticipant.ts` (Major Changes):**
- **What to change:** Refactor `createParticipant()`. Introduce a check for `participantId`. Use `setDoc(ref, data, { merge: true })` on the existing reference if `participantId` is truthy. Catch Firebase "not-found" exceptions and gracefully fall back to generating a new ID if the existing one is missing from the DB.
- **What NOT to change:** Do not touch the Firestore listeners, `updateParticipant`, error handling, or the 50-participant limit check (though limit check should ideally happen only for *new* creations).

**2. `src/context/OnboardingContext.tsx`:**
- **What to change:** None required. `localStorage` reading/writing logic is already robust.
- **What NOT to change:** Keep the current approach for syncing React state to/from `localStorage`.

**3. `src/components/mobile/MoodStep.tsx`:**
- **What to change:** None required. The "Continue" button still relies on `async () => { const id = await createParticipant(); if (id) nextStep(); }`.
- **What NOT to change:** Do not add complex conditionals here to check if the participant is already created. Keep the UI layer dumb and rely on the updated hook.

---

## 4. Idempotency Design

**How it becomes idempotent:**
- **Detection:** `participantId` from `useOnboardingStore()` explicitly flags a returning user.
- **Idempotent Write:** Translating the operation from **Write-Only** (`setDoc` without an ID) to **Upsert** (`setDoc` with `{ merge: true }` on a known ID). 
- **Capacity Safe:** If a user is updating their existing record, the 50-person limit does not needlessly penalize them or lock the room.
- **Data Preservation:** The existing document's timestamp (`createdAt`) and backend-generated questions (`aiTopics`, etc.) are preserved instead of wiped. Only the delta (e.g., a changed mood) is pushed.

---

## 5. Edge Case Handling

- **User refreshes mid-flow (e.g., on `QuestionsStep`):** `localStorage` safely restores the ID. Proceeding forward triggers updates. No duplicates.
- **User goes back to `MoodStep`:** `localStorage` retains the ID. Submitting the form writes over the existing record with any updated mood. No duplicates.
- **`localStorage` has a stale `participantId` (deleted in DB):** The `setDoc/updateDoc` attempt will either succeed and recreate the document with the stale ID, or fail gracefully. If using strict `updateDoc` which fails on non-existent docs, the `catch` block will automatically run the *Create New* logic and overwrite `localStorage` with a fresh ID.
- **Participant expired in Firestore (2-hour limit reached):** Same as above. The update fails, generating a seamless new session without user friction.
- **User opens multiple tabs:** Both tabs share the same `localStorage`. They will write to identical `participantId` documents in Firestore, ensuring 1 session per browser rather than infinite duplicates.

---

## 6. Additional Data Integrity Improvements

1. **AI Call Debouncing:** While the frontend writes `status: 'generating_questions'` on every update, ensure the `formData` actually changed before re-pushing `status: 'generating_questions'` to avoid hitting Vertex AI quotas over and over when users click "Back/Forward" repeatedly without modifying data.
2. **Explicit Leave Mechanism:** Add an option (like an 'X' button or 'Leave Room') that explicitly clears the participant document from Firestore and removes the local `participantId`. This immediately frees room capacity rather than waiting the default 2 hours.
3. **Session Resetting:** Provide an explicit "Start Over" button on the onboarding screen that purposefully clears `localStorage` and generates a fresh experience if a user hits an unrecoverable edge case.
