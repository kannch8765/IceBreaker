# Implementation Plan: ResultStep Avatar Binding & Encoding Fix

This plan addresses the issue where avatars in `ResultStep.tsx` show placeholder emojis despite valid data in Firestore. It focuses on robust data syncing and safe URI encoding for Japanese characters.

## Proposed Changes

### 🔧 [hooks] [useParticipant.ts](file:///d:/Github_Repos/IceBreaker/src/hooks/useParticipant.ts)
- Add `setMatchedParticipants` and `setQuestions` to the `useEffect` dependency array (lines 115-157).
- Ensure all setters are stable dependencies from the store to prevent unnecessary listener resets.

### 🎨 [components] [ResultStep.tsx](file:///d:/Github_Repos/IceBreaker/src/components/mobile/ResultStep.tsx)
- Implement a `getSafeAvatarUrl` helper function that uses `encodeURIComponent` correctly for the seed parameter to handle Unicode characters (like Japanese).
- Add an `onError` handler to the `img` tags to fallback to the 🦊 emoji if the image fails to load at runtime.
- Ensure `p.avatarUrl` is correctly accessed inside the `matchedParticipants.map` loop.

---

## Verification Plan

### Automated Tests
- Run `npm run build` to ensure no TypeScript regressions or minification issues with the URI encoding.

### Manual Verification
1. **Mock Data Test**:
   - Temporarily inject a `matchedParticipants` object with a Japanese-seeded DiceBear URL directly into `ResultStep.tsx` to verify the `getSafeAvatarUrl` logic.
2. **End-to-End Test**:
   - Complete the onboarding flow and verify that the final Result Page displays a robot avatar instead of a fox.
3. **Broken URL Test**:
   - Change an `avatarUrl` to a non-existent domain and verify that the `onError` handler correctly triggers the 🦊 fallback.
