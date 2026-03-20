# 🔍 ResultStep Avatar Binding Audit

## 1. Identify Data Source Mismatch

**Mismatch Analysis:**
The UI is currently failing to render the matched participant avatar (and concurrently, the current user's avatar) because it is looking at the **wrong or empty field**. 

By tracing the lifecycle of the user profile creation inside `src/hooks/useParticipant.ts`:
```tsx
const payload = {
  username: mergedData.username,
  // ...
  imageUrl: mergedData.inputMode === 'camera' ? (mergedData.imageUrl || null) : null,
}
```
The frontend explicitly uploads and saves the picture to Firestore under the key name **`imageUrl`**, NOT `avatarUrl`. Therefore, the `avatarUrl` field simply does not exist on the participant document. 

---

## 2. Verify `matchedParticipants` Structure

- **Is it an array?** Yes, the data flow perfectly passes `matchedParticipants` as an array to `ResultStep`.
- **Does each object contain `avatarUrl`?** **NO.** 
- **Is the key name correct?** The UI expects `p.avatarUrl`, but the true Firestore key containing the image URL is **`p.imageUrl`** (because the backend mirrors the original participant document data).

---

## 3. Identify Binding Failure

**Why `p.avatarUrl` is falsy:**
The binding failure is entirely due to a **wrong field name**. The read logic and the write logic in the project are severely mismatched. 
- *Write:* `createParticipant` saves the image as `imageUrl`.
- *Read (Match):* `ResultStep` maps over `matchedParticipants` looking for `p.avatarUrl`. (It evaluates to `undefined`, triggering the fallback `"🦊"`).
- *Read (Self):* The snapshot listener in `useParticipant.ts` looks for `data.avatarUrl`, which also fails, causing the main Host avatar to break as well.

This is not a timing issue or an asynchronous loading bug. The data is present, but the frontend is knocking on the wrong door.

---

## 4. Fix Plan (Implementation Strategy)

The most structurally sound fix is to align the frontend read logic with the established write logic (`imageUrl`).

**Correct Data Source / Field Path:**
- Replace all instances of `avatarUrl` with `imageUrl`.

**Where to change:**
1. **`ResultStep.tsx`:** 
   - Change `p.avatarUrl` to `p.imageUrl` inside the `matchedParticipants.map` logic.
   - For the current user's avatar, change the destructured `{ avatarUrl }` to `{ imageUrl }` (after renaming it in the store).
2. **`useParticipant.ts`:**
   - On line 132, change the snapshot listener from `if (data.avatarUrl) setAvatarUrl(data.avatarUrl)` to `if (data.imageUrl) setImageUrl(data.imageUrl)`.
3. **`OnboardingContext.tsx`:**
   - Rename the local state variable and setters from `avatarUrl` to `imageUrl` to keep the architecture perfectly clean and consistent with Firestore.

---

## 5. Optional Robustness

**Handling Missing Data:**
To make the UI robust, you should guard against cases where users completely skip the camera upload (e.g., inputMode is 'mood'):
- **Fallback logic:** The current ternary `p.imageUrl ? <img /> : "🦊"` is completely correct and safe to keep.
- **Null Safety:** To prevent React warnings if an empty string sneaks through, explicitly cast the check: `if (p.imageUrl && p.imageUrl.trim() !== '')`. 
- **Loading State:** The avatars exist strictly after the "Processing" step has completed, so the data is reliably present at mount. No inner loading spinner is required for the avatars as long as standard image caching operates normally.
