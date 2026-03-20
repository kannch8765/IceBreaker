# Implementation Plan - inputMode Data Leakage Fix

This plan addresses the bug where stale `imageUrl` or `mood` data is persisted in the Firestore payload when a user switches between "camera" and "mood" input modes.

## Proposed Changes

### 🛡️ Data Submission Layer
#### [MODIFY] [useParticipant.ts](file:///d:/Github_Repos/IceBreaker/src/hooks/useParticipant.ts)
- Refactor the payload construction in `createParticipant` to explicitly filter fields based on `formData.inputMode`.
- If `inputMode` is `'mood'`, set `imageUrl: null` and ensure `mood` is sent.
- If `inputMode` is `'camera'`, set `mood: ""` and ensure `imageUrl` is sent.

### 🧹 UI Component Layer
#### [MODIFY] [MoodStep.tsx](file:///d:/Github_Repos/IceBreaker/src/components/mobile/MoodStep.tsx)
- In `handleMoodSelect`, add `imageUrl: undefined` to the `updateFormData` call to clear any previously captured photo.
- In `handleUsePhoto`, ensure `mood: ""` is explicitly passed (it already is, but we will verify consistency).

### 🔍 Context Layer
#### [VERIFY] [OnboardingContext.tsx](file:///d:/Github_Repos/IceBreaker/src/context/OnboardingContext.tsx)
- Confirm `updateFormData` implementation: `setFormData((prev) => ({ ...prev, ...data }))`.
- No changes needed here, only verification of the merge behavior.

## Verification Plan

### Automated Tests
- N/A (Manual validation required for Firestore data shape)

### Manual Verification
1.  Capture a photo in "Camera" mode.
2.  Go back and switch to "Mood" mode.
3.  Select a vibe and continue.
4.  Inspect the created/updated `participant` document in Firestore.
    - **Success Criteria**: `inputMode` is `"mood"`, `mood` is set, and `imageUrl` is `null` or missing. Stale photo URL must NOT be present.
5.  Repeat in reverse (Mood then Camera).
    - **Success Criteria**: `inputMode` is `"camera"`, `imageUrl` is set, and `mood` is empty string.
