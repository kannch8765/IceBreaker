# 🔍 ResultStep Data Binding Audit (v3)

## 1. Data Structure Confirmation

Based on the provided Firestore snapshot, the core generative data is structured as follows:

- **`aiTopics`**: `Array<{ en: string, cn: string, jp: string }>`  
  *Context*: My previous fix correctly addressed the "Object as React Child" crash by adding language selection logic.
- **`avatarUrl`**: `string` (Top-level field)  
  *Example*: `"https://api.dicebear.com/7.x/bottts/svg?seed=昼下がりの日差しを浴びて、ゆったりとまどろむ猫"`
- **`matchedParticipants`**: Explicitly stated by the user to be an array of maps mirror-reflecting the participant data structure.

---

## 2. Root Cause Analysis

### 🐛 Why the Avatar Fails (Showing 🦊)
Even if the field is named `avatarUrl`, the binding is failing in the UI for one specific reason: **Hydration & State Sync Timing.**

In `useParticipant.ts`, the `onSnapshot` listener updates the store:
```tsx
132: if (data.avatarUrl) setAvatarUrl(data.avatarUrl);
133: if (data.matchedParticipants) setMatchedParticipants(data.matchedParticipants);
```
However, the `ResultStep.tsx` component is mounted based on `status === 'ready'`. If for some reason the store destructuring happens *before* the `avatarUrl` state update has propagated (or if `data.avatarUrl` was missing in the very first snapshot where status was set to ready), the UI defaults to the fallback.

### 🐛 The Unencoded URI Mask (The "Robot" Issue)
The `avatarUrl` provided by the user contains **raw Japanese characters** as a seed. 
While many modern browsers handle some Unicode in URLs, React's `src` attribute binding in some environments (or strict bundlers) may treat the literal string as an invalid URL target if not properly URI-encoded, or the DiceBear API itself might return a default "robot" (Bottts fallback) if it fails to parse the unencoded characters in the query string.

---

## 3. Identify Binding Failure

1. **Destructuring Shadowing**: The store provides `avatarUrl` (current user) and `matchedParticipants`. Inside the map loop, the code uses `p.avatarUrl`. 
2. **Missing Field in Match**: If the backend matching process copies participants into the `matchedParticipants` array **before** their AI avatar generation is complete, the matches will have `status: "ready"` but no `avatarUrl`, triggering the 🦊 emoji.

---

## 4. Final Fix Plan

### Section A: `ResultStep.tsx` Robustness
- **URI Encoding**: Wrap the `src={p.avatarUrl}` (and the main `avatarUrl`) in a helper that ensures the string is correctly encoded via `encodeURI` or `encodeURIComponent` specifically for the seed parameter.
- **Type Guarding**: Double-check that we aren't encountering the same "object vs string" issue inside `avatarUrl` if the backend ever localized it like `aiTopics`.

### Section B: `useParticipant.ts` Stability
- **Batching**: Ensure that the `setStatus('ready')` call happens **AFTER** or **ALONGSIDE** the data population in a way that doesn't trigger a render with partial data.
- **Dependency Tracking**: Add `setMatchedParticipants` to the `useEffect` dependency array (it is currently missing).

### Section C: Fallback Logic
- Maintain the 🦊 emoji as a safe character fallback, but ensure the `<img>` tag handles the `onError` event to switch back to the emoji if the URL is broken.
