# Walkthrough: Camera Upload Implementation

## Goal
Implement a hackathon-ready camera upload feature for the Ice-Breaker onboarding flow, exclusively on the frontend, without using any frontend AI or mutating the existing Python backend.

## Architecture & Code Changes

### 1. Context Extension (`src/context/OnboardingContext.tsx`)
We updated the `FormData` type and its initial state to include:
- `inputMode: 'mood' | 'camera'`
- `imageUrl?: string`

### 2. Firestore Document Update (`src/hooks/useParticipant.ts`)
We updated `createParticipant` to forward the new context payloads:
```typescript
await setDoc(newParticipantRef, {
  username: formData.username,
  pronoun: formData.pronoun,
  mood: formData.mood,  // Holds an empty string "" when camera is used
  inputMode: formData.inputMode, // "camera" or "mood"
  ...(formData.imageUrl ? { imageUrl: formData.imageUrl } : {}),
  language: language,
  status: 'generating_questions',
  // ...
});
```

### 3. Camera Capture UI (`src/components/mobile/MoodStep.tsx`)
We completely replaced the mock "photo" view with a fully functional HTML5 Camera API implementation:

1. **Permission & Stream**: Uses `navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })` to obtain a camera feed.
2. **Preview**: Renders a flipped `<video>` element for a mirror-like live preview.
3. **Capture & Compression**: Uses a hidden `<canvas>` to draw the video frame, scaling it down to a maximum width of 800px. It relies on `.toBlob()` to output a compressed JPEG (`0.8` quality) to save bandwidth and Firebase Storage quota.
4. **Firebase Storage**: When the user clicks "Use Photo", it uploads the raw Blob via `uploadBytes(ref(storage, ...), capturedBlob)` and retrieves the URL via `getDownloadURL`.
5. **Context Merge**: Updates the OnboardingContext with `{ inputMode: 'camera', imageUrl: url, mood: "" }`.
6. **Backend Continuity**: Safely triggers `createParticipant()`. Because it explicitly writes `mood: ""`, the Python worker (`firestore_worker.py`) picks up the job immediately without crashing.

## Edge Cases Handled
- **Permission Errors**: Automatically shows a localized error or default message if camera access is denied or unavailable.
- **Memory Leaks**: Uses `useEffect` cleanup and `URL.revokeObjectURL` to destroy dangling blob URLs and stream tracks when the component unmounts or a photo is retaken.
- **Upload Failures**: Traps Firebase upload exceptions, clears the `isUploading` state, and displays a toast-like error so the user can hit "Upload" again without losing their captured photo.

## Testing & Verification
- **Compilation**: Ran `npx tsc --noEmit` locally; zero TypeScript errors.
- **Safety**: Verified no changes were made to the Python worker or backend configurations, satisfying the strict architectural constraints.
