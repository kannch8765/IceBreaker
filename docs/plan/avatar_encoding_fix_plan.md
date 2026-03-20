# Implementation Plan: Avatar URI Encoding Fix

This plan addresses the issue where `avatarUrl` contains unencoded Japanese characters in the `seed` parameter, causing rendering failures or broken images.

## Proposed Changes

### 🎨 [components] [ResultStep.tsx](file:///d:/Github_Repos/IceBreaker/src/components/mobile/ResultStep.tsx)
- **Helper Function**: Implement `getSafeAvatarUrl(url: string)`:
  - Uses `new URL(url)` to parse the string.
  - Iterates through `url.searchParams` and ensures values are `encodeURIComponent` safe.
  - Returns the sanitized string.
- **UI Application**:
  - Apply `getSafeAvatarUrl` to both the main user avatar and the matched participants' avatars.
- **Runtime Fallback**:
  - Add `onError={(e) => (e.currentTarget.style.display = 'none')}` logic (or similar) to ensure the 🦊 emoji is visible if the image fails to load even after encoding.

### 🔧 [hooks] [useParticipant.ts](file:///d:/Github_Repos/IceBreaker/src/hooks/useParticipant.ts)
- (Optional) Apply the same encoding logic during the sync phase to keep the store data clean. (Decision: Handle in UI for maximum flexibility with various URL formats).

---

## Verification Plan

### Automated Tests
- Run `npm run build` to verify no regressions.

### Manual Verification
1. **URI Check**:
   - Log the output of `getSafeAvatarUrl` for a Japanese seed and verify it looks like `%E6%98%BC%E4%B8%8B...` in the browser console.
2. **Visual Check**:
   - Verify the "robot" avatar (Bottts) correctly appears instead of the fox or a broken icon.
