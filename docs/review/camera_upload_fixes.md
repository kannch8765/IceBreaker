# Review: Camera Upload Bugfixes

## Goal
Resolve production stability bugs in the Camera Upload feature, specifically addressing the upload stuck state, camera orientation defaults, and stream management.

## Summary of Fixes

### 1. Upload Stuck in Loading State
**Root Cause:** The `handleUsePhoto` function lacked deep error tracking, strict validation, and an explicit try/catch/finally lifecycle ensuring UI resets if an error triggered silently.

**Fix Details:**
- Added robust validation to confirm `capturedBlob` and `roomId` are present *before* entering the upload phase.
- Inserted extensive `console.log` trace points (`[Camera] Start`, `uploadBytes completed`, `getDownloadURL retrieved`).
- Structured the upload inside a bullet-proof `try/catch/finally` block that guarantees `setIsUploading(false)` executes regardless of success, network interruption, or promise rejections.

### 2. Camera Default Orientation
**Root Cause:** `getUserMedia` requested `facingMode: 'user'` natively, breaking the UX on mobile where users expect the rear camera for capturing the environment.
**Fix Details:**
- Defined a `facingMode` state variable (`'environment' | 'user'`).
- Changed the `useState` default to `'environment'`.
- Updated `startCamera(mode)` to accept dynamic variables, gracefully defaulting to the backend state variable.

### 3. Add Camera Switch Button & CSS Mirrors
**Root Cause:** Users needed to switch lenses, but switching means we must mirror the preview iff the `user` lens is active.
**Fix Details:**
- Added `<SwitchCamera size={20} />` overlay button using UI constraints (translucent backdrop).
- Ensured `.stopCamera()` is executed properly before requesting a new `MediaStream`.
- Conditionally applied Tailwind mirror classes `transform scale-x-[-1]` on both `<video>` and `<img/>` items so *only* the selfie view is horizontally flipped.

### 4. Event Bounding Cleanup
**Root Cause:** A subtle React event-binding bug occurs if `onClick={startCamera}` is assigned directly while `startCamera(mode)` accepts an argument. React passes the entire `MouseEvent` as the `mode` parameter.
**Fix Details:**
- Cleaned the retake trigger to `onClick={() => startCamera()}`.

## Checklist Verification
- [x] Upload state unfreezes on error explicitly via `finally`.
- [x] Default is now "environment".
- [x] Switch button cleanly destroys/restarts the `MediaStream`.
- [x] Firestore writes and TypeScript rules are respected natively.
