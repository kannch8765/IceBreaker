# InputMode State Flow Audit

**Date:** 2026-03-20
**Scope:** Onboarding flow (`camera` vs `mood` selection)

---

## 1. Data Flow Diagram

1.  **Initialization**: `OnboardingContext.tsx`
    - `formData` state initialized with `inputMode: 'mood'`, `mood: ''`, `imageUrl: undefined`.
2.  **User Interaction**: `MoodStep.tsx`
    - **Option A (Mood)**: `updateFormData({ mood: '...', inputMode: 'mood' })`
    - **Option B (Camera)**: `updateFormData({ inputMode: 'camera', imageUrl: '...', mood: "" })`
3.  **Storage**: `OnboardingProvider` (React Context)
    - `updateFormData` performs a **shallow merge**: `setFormData(prev => ({ ...prev, ...data }))`.
4.  **Consumption**: `useParticipant.ts`
    - `createParticipant` reads `formData` and spreads it into the Firestore `updateDoc`/`setDoc` payload.
    - Specifically: `...(formData.imageUrl ? { imageUrl: formData.imageUrl } : {})`.

---

## 2. Verdict: ❌ Buggy

While the `inputMode` variable itself updates correctly in the state, the **associated data is not properly cleaned up** when switching between modes.

### Root Cause
The `updateFormData` function in `OnboardingContext.tsx` leverages a **merge strategy**. 
If a user:
1.  Takes a photo (`inputMode` -> `'camera'`, `imageUrl` -> `'blob...'`).
2.  Navigates back.
3.  Selects a mood (`inputMode` -> `'mood'`, `mood` -> `'Energetic'`).

The resulting `formData` object will contain **both** `mood: 'Energetic'` AND the stale `imageUrl`. 
When `useParticipant.ts` runs, it sends both fields to Firestore because it checks for the existence of the properties rather than the `inputMode` context.

---

## 3. Identified Issues
- **Stale State**: `imageUrl` persists when switching to `mood` mode.
- **Multiple Sources of Truth**: The Firestore document becomes ambiguous (has both a vibe photo and a mood label).
- **Inconsistent Payload**: The logic in `useParticipant.ts` is too trusting of the `formData` object:
  ```typescript
  // src/hooks/useParticipant.ts L48 & L76
  ...(formData.imageUrl ? { imageUrl: formData.imageUrl } : {}),
  ```

---

## 4. Proposed Fixes

### Minimal Fix (Component Level)
In `src/components/mobile/MoodStep.tsx`, explicitly nullify the opposing field when selecting a mode.

```typescript
// For Mood Selection (L63)
updateFormData({ mood: moodItem.label, inputMode: 'mood', imageUrl: undefined });

// For Photo Usage (L146)
updateFormData({ inputMode: 'camera', imageUrl: url, mood: "" }); // Already clears mood
```

### Architectural Fix (Hook Level - Recommended)
Robustify `useParticipant.ts` to enforce the `inputMode` contract when building the Firestore payload. This prevents stale context data from ever reaching the database.

```typescript
// src/hooks/useParticipant.ts
const payload = {
  username: formData.username,
  pronoun: formData.pronoun,
  inputMode: formData.inputMode,
  // Only send the data relevant to the mode
  mood: formData.inputMode === 'mood' ? formData.mood : '',
  imageUrl: formData.inputMode === 'camera' ? (formData.imageUrl || null) : null,
  language: language,
  status: 'generating_questions',
};
await updateDoc(existingRef, payload);
```

---

## 5. Verification Plan
1.  **Manual Trace**: Select "Camera", capture photo, go back to chooser.
2.  **Selection Swap**: Select "Mood", pick a vibe, and click Continue.
3.  **Database Check**: Verify the `participant` document in Firestore. 
    - **Expected**: `inputMode: "mood"`, `mood: "Energetic"`, `imageUrl` is either missing or `null`.
    - **Actual (Bug)**: `inputMode: "mood"`, `mood: "Energetic"`, AND `imageUrl: "https://..."`.
