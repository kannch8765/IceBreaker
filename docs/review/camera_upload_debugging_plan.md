# Camera Upload Debugging Plan

## 1. Root Cause Hypotheses
If the UI is stuck in the loading state (`isUploading = true`) and never exits, it implies the asynchronous execution halted without reaching the state reset. Possible causes:
1. **Missing `finally` Block:** If the upload code lacks a `try/catch/finally` structure, any thrown error (or early silent return) will skip the line that resets `isUploading = false`.
2. **Silent Promise Rejection in Firebase:** `uploadBytes` or `getDownloadURL` might be failing due to CORS, Storage Security Rules, or missing configuration, leaving the promise hanging or throwing an uncaught exception.
3. **Invalid Context State:** Variables like `capturedBlob` or `roomId` being `null` or `undefined` might cause early returns *after* `isUploading` was set to `true`.
4. **Hanging Backend Function:** If the upload succeeds, the subsequent `createParticipant()` function might be hanging indefinitely if Firestore listener rules are broken.

## 2. Debug Steps (with logs)
To pinpoint the exact failure point, we need to instrument the `handleUsePhoto` function with granular logs:

```typescript
const handleUsePhoto = async () => {
  console.log("STEP 0: handleUsePhoto triggered");
  if (!capturedBlob || !roomId) {
    console.error("STEP 0 ERROR: Missing blob or roomId", { blob: !!capturedBlob, roomId });
    return;
  }
  
  setIsUploading(true);
  
  try {
    const storageRef = ref(storage, `participants/${roomId}_${Date.now()}.jpg`);
    console.log("STEP 1: blob created and ref initialized: ", storageRef.fullPath);
    
    console.log("STEP 2: uploading...");
    const snapshot = await uploadBytes(storageRef, capturedBlob);
    console.log("STEP 3: upload success", snapshot);
    
    const url = await getDownloadURL(snapshot.ref);
    console.log("STEP 4: URL fetched", url);
    
    // ... context updates ...
    
    console.log("STEP 5: Creating participant in Firestore...");
    const id = await createParticipant();
    console.log("STEP 6: Participant created successfully", id);
    
  } catch (err) {
    console.error("STEP ERROR: Exception caught during flow", err);
  } finally {
    console.log("STEP 7: Resetting isUploading state");
    setIsUploading(false);
  }
};
```

## 3. Fix Plan
1. **Handle Null Blob Before State Change**: Move the `if (!capturedBlob || !roomId)` check *before* calling `setIsUploading(true)` to prevent immediate hanging if the variables are null.
2. **Implement `try/catch/finally`**: Wrap the entire async flow in a try/catch. Extract `setIsUploading(false)` into a `finally` block so it ALWAYS executes, even if `uploadBytes` or `createParticipant` throw an error.
3. **Graceful Error UI**: Update the UI state `setCameraError(err.message)` within the catch block, ensuring the user isn't guessing why the upload stopped and can trigger a retry.

## 4. Correct Upload Code Pattern
Here is the robust, safe pattern to implement:

```typescript
const handleUsePhoto = async () => {
  // 1. Validate state BEFORE showing loader
  if (!capturedBlob || !roomId) {
    setCameraError("Missing image or room ID. Please try again.");
    return; 
  }

  // 2. Safely lock UI
  setIsUploading(true);
  setCameraError(null);

  try {
    // 3. Authenticate and Upload
    const storageRef = ref(storage, `participants/${roomId}_${Date.now()}.jpg`);
    const snapshot = await uploadBytes(storageRef, capturedBlob);
    const url = await getDownloadURL(snapshot.ref);

    // 4. Update internal state
    updateFormData({ inputMode: 'camera', imageUrl: url, mood: "" });
    const id = await createParticipant();
    
    if (id) {
      nextStep();
    } else {
      throw new Error("Failed to create participant record.");
    }
  } catch (err: any) {
    // 5. Explicitly handle failures
    console.error("Upload failed:", err);
    setCameraError(err.message || "Failed to upload image. Please try again.");
  } finally {
    // 6. ALWAYS reset loading state
    setIsUploading(false);
  }
};
```

## 5. Firebase Checklist
If the logs show the process hanging at `STEP 2` and throwing an error, verify the following platform specifics:

- [ ] **Storage Bucket Configuration**: Check `.env.local` to ensure `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` is present and exactly matches `[project-id].appspot.com`.
- [ ] **Storage Security Rules**: Go to Firebase Console -> Storage -> Rules. Ensure clients can write to `/participants/`. Example for a hackathon:
      ```javascript
      rules_version = '2';
      service firebase.storage {
        match /b/{bucket}/o {
          match /participants/{allPaths=**} {
            // WARNING: Insecure, only for dev/hackathon iteration
            allow read, write: if true; 
          }
        }
      }
      ```
- [ ] **CORS Configuration**: Firebase Storage buckets strictly enforce CORS. Passing base64 blob payloads directly from standard browser `fetch`/`XHR` requires the backend bucket to allow the origin. If blocked, deploy a `cors.json` to the GCP storage bucket:
      ```json
      [
        {
          "origin": ["*"],
          "method": ["GET", "PUT", "POST", "DELETE", "HEAD"],
          "maxAgeSeconds": 3600
        }
      ]
      ```
      Command: `gsutil cors set cors.json gs://YOUR-BUCKET-ID.appspot.com` 
