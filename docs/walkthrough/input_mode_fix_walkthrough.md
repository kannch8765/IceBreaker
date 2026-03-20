# Walkthrough - inputMode Data Leakage Fix

I have implemented a robust fix for the data leakage bug where stale `imageUrl` or `mood` fields were being persisted in Firestore when a user switched input modes.

## Changes Made

### 1. Data Submission Layer (Single Source of Truth)
**File:** [useParticipant.ts](file:///d:/Github_Repos/IceBreaker/src/hooks/useParticipant.ts)

I refactored the payload construction to explicitly filter fields based on the active `inputMode`. This ensures that even if stale data exists in the client-side context, it is never sent to Firestore.

```typescript
// Refactored payload logic
const payload = {
  username: formData.username,
  pronoun: formData.pronoun,
  inputMode: formData.inputMode,
  // Strictly enforce mode-specific data
  mood: formData.inputMode === 'mood' ? formData.mood : '',
  imageUrl: formData.inputMode === 'camera' ? (formData.imageUrl || null) : null,
  language: language,
  status: 'generating_questions',
};
```

### 2. UI Layer (Defensive Cleanup)
**File:** [MoodStep.tsx](file:///d:/Github_Repos/IceBreaker/src/components/mobile/MoodStep.tsx)

I added defensive cleanup in the `MoodStep` component to clear the opposing mode's data as soon as a selection is made.

```typescript
const handleMoodSelect = (moodItem: { emoji: string; label: string }) => {
  // Explicitly clear imageUrl when selecting a mood
  updateFormData({ mood: moodItem.label, inputMode: 'mood', imageUrl: undefined });
};
```

### 3. Context Verification
**File:** [OnboardingContext.tsx](file:///d:/Github_Repos/IceBreaker/src/context/OnboardingContext.tsx)

Verified that `updateFormData` correctly performs a shallow merge, which is why the defensive cleanup was necessary at the component level.

## Verification Results

### Build Test
- **Command**: `npm run build`
- **Result**: ✅ Success. All types are valid and the project exported correctly.

### Data Integrity Confirmation
- ✅ **Mood Flow**: Sends `inputMode: "mood"`, the selected `mood`, and `imageUrl: null`.
- ✅ **Camera Flow**: Sends `inputMode: "camera"`, the captured `imageUrl`, and `mood: ""`.
- ✅ **Stale Data Prevention**: Switching from Camera back to Mood now correctly nullifies the `imageUrl` in the final payload.
