# Debugging Audit: inputMode and imageUrl Issues

**Date:** 2026-03-20
**Scope:** Onboarding flow (`MoodStep` -> `useParticipant`)

---

## Issue 1: imageUrl not in Firestore

### Data flow trace (step-by-step)
1.  **Capture & Upload**: `MoodStep.tsx` ([L140](file:///d:/Github_Repos/IceBreaker/src/components/mobile/MoodStep.tsx#L140)) successfully uploads the blob to Firebase Storage.
2.  **URL Retrieval**: `MoodStep.tsx` ([L143](file:///d:/Github_Repos/IceBreaker/src/components/mobile/MoodStep.tsx#L143)) receives the valid download URL from `getDownloadURL`.
3.  **State Update**: `MoodStep.tsx` ([L146](file:///d:/Github_Repos/IceBreaker/src/components/mobile/MoodStep.tsx#L146)) calls `updateFormData({ inputMode: 'camera', imageUrl: url, mood: "" })`. This schedules a React state change in the `OnboardingContext`.
4.  **Immediate Call**: `MoodStep.tsx` ([L149](file:///d:/Github_Repos/IceBreaker/src/components/mobile/MoodStep.tsx#L149)) calls `createParticipant()` immediately after the state update.
5.  **Stale Consumption**: `createParticipant` (defined in `useParticipant.ts`) reads `formData` from the current closure, which **still contains the old state** before the scheduled update began.

### Exact break point
**File:** `src/components/mobile/MoodStep.tsx`
**Line:** [L146-L149](file:///d:/Github_Repos/IceBreaker/src/components/mobile/MoodStep.tsx#L146-L149)
```typescript
updateFormData({ inputMode: 'camera', imageUrl: url, mood: "" });
const id = await createParticipant(); // BREAK: executes with stale formData
```

### Root cause (technical)
**Async State Batching / Stale Closure.** `updateFormData` updates a React Context. React state updates are asynchronous and batched. Calling `createParticipant` in the same tick as `updateFormData` means `createParticipant` will use the version of `formData` provided during the **current render cycle**, where `imageUrl` is still undefined.

---

## Issue 2: inputMode stuck as "mood"

### Data flow trace
1.  **Initialization**: `OnboardingContext.tsx` sets the default `inputMode` to `'mood'`.
2.  **Selection**: The user selects "Photo" and captures an image.
3.  **Failed Transition**: `MoodStep.tsx` ([L146](file:///d:/Github_Repos/IceBreaker/src/components/mobile/MoodStep.tsx#L146)) attempts to switch `inputMode` to `'camera'`.
4.  **Race Condition**: Just like Issue 1, `createParticipant()` is invoked before the rendering cycle has propagated the new `'camera'` mode to the hook's local `formData` variable.

### Where it gets overridden
It doesn't strictly get "overridden" by new code; rather, it is **locked to its previous value** by the function closure. `createParticipant` is a memoized callback that depends on `formData`. Although it is in the dependency array, it won't be "re-created" with the new `formData` until the **next** render, but it is executed **now**.

### Root cause
**Conceptual Misalignment of State and Execution.** The implementation assumes that updating a global context state synchronously updates all local variables in hooks using that context. In reality, the hook `useParticipant` only receives the updated `formData` on the *subsequent* render.

---

## Evidence

### Case A: Stale Spreading in `useParticipant.ts`
```typescript
// src/hooks/useParticipant.ts L43-L52
const payload = {
  username: formData.username,
  pronoun: formData.pronoun,
  inputMode: formData.inputMode, // Always 'mood' if called immediately
  mood: formData.inputMode === 'mood' ? formData.mood : '',
  imageUrl: formData.inputMode === 'camera' ? (formData.imageUrl || null) : null, // null if 'mood'
  language: language,
  status: 'generating_questions',
};
```
Because `formData.inputMode` is still `'mood'` in the stale closure, the conditional logic for `imageUrl` evaluates to `null`.

### Case B: Sequenced Call in `MoodStep.tsx`
```typescript
// src/components/mobile/MoodStep.tsx L146-149
updateFormData({ inputMode: 'camera', imageUrl: url, mood: "" });
const id = await createParticipant();
```
The proximity of these two calls is the direct cause of the data synchronization failure.

---

## Verdict

### Issue 1: imageUrl not in Firestore
- **Verdict**: **Async bug**. Specifically a race condition between a state update trigger and a dependent function execution.

### Issue 2: inputMode stuck as "mood"
- **Verdict**: **Logic bug**. Results from an architectural mismatch where state is used as a messaging bus for immediate sequential operations instead of passing parameters directly.
