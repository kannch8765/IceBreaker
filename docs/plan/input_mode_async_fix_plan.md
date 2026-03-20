# Implementation Plan: Fixing Async State Race Condition in Onboarding Flow

## ✅ Chosen Approach
**Option A: Pass required data directly into `createParticipant(payload)`**

**Why:** This approach decouples the immediate action (API submission) from the asynchronous React state update (`updateFormData`). By passing the exact new data (the delta) directly as arguments to `createParticipant`, the hook does not need to wait for `formData` to sync via context, completely eliminating the race condition. It is the most robust, predictable, and maintainable approach without introducing complex `useEffect` chains (Option B) or rewriting the Context Provider (Option C).

---

## 🔄 New Data Flow

### Camera Flow
1. User captures a photo and clicks submit.
2. `MoodStep` uploads the photo and receives the `imageUrl`.
3. `MoodStep` calls `updateFormData({ inputMode: 'camera', imageUrl, mood: "" })` to update UI state so that if the user navigates back, the Context is clean.
4. `MoodStep` *synchronously* constructs an override object: `{ inputMode: 'camera', imageUrl, mood: "" }`.
5. `MoodStep` calls `createParticipant(overrideData)`.
6. `useParticipant` merges `overrideData` with the existing context `formData` (to grab stable values like `username`, `pronoun`).
7. `useParticipant` enforces consistency based on the new `inputMode` and sends the payload to Firestore.
8. Firestore document is successfully created with `inputMode: 'camera'` and the actual `imageUrl`.

### Mood Flow
1. User selects a mood and clicks continue.
2. `MoodStep` calls `updateFormData({ inputMode: 'mood', mood: selectedMood, imageUrl: undefined })`.
3. `MoodStep` calls `createParticipant({ inputMode: 'mood', mood: selectedMood, imageUrl: null })`.
4. `useParticipant` merges this override with existing `formData`.
5. `useParticipant` strictly sends `inputMode: 'mood'` and the selected mood, dropping any stale image data.
6. Firestore document is created correctly.

---

## 🧩 Responsibility Split

| File | Responsibility |
| :--- | :--- |
| **`MoodStep.tsx`** | Owns user interaction, uploading logic, and defining the state delta for the chosen mode. It is responsible for passing this delta to *both* UI state (`updateFormData`) and Submission (`createParticipant`). |
| **`OnboardingContext.tsx`** | Owns persistence of UI state (for back/forward navigation) via shallow merging. It does *not* act as the communication bus for instantaneous API payloads. |
| **`useParticipant.ts`** | Owns building the final Firestore payload. It merges persistent context data (`username`, `pronoun`) with immediate overrides provided via `createParticipant` arguments, and enforces data consistency rules before network dispatch. |

---

## 🛡 Data Consistency Strategy
- **Layer:** Enforced firmly at the **Submission Level** (`useParticipant.ts`), with defensive clearing at the **UI Level** (`MoodStep.tsx`).
- **Mechanism:** In `createParticipant(overrideData)`, we resolve `mergedData = { ...formData, ...overrideData }`. We then construct the final `payload` using a strict conditional check based on `mergedData.inputMode`. If it's `'mood'`, `imageUrl` is stripped. If `'camera'`, `mood` is stripped. This guarantees that `imageUrl` and `mood` NEVER coexist in Firestore.

---

## 🛠 Implementation Steps

1. **Update `useParticipant` Signature:**
   - Modify `createParticipant` to accept an optional argument: `createParticipant(overrideData?: Partial<FormData>)`.
2. **Refactor Payload Construction (`useParticipant.ts`):**
   - Inside `createParticipant`, create `mergedData = { ...formData, ...overrideData }`.
   - Update the payload creation logic to use `mergedData.inputMode`, `mergedData.mood`, and `mergedData.username` instead of `formData` directly.
3. **Update `MoodStep` Photo Submission:**
   - In `handleUsePhoto`, update the call to: `await createParticipant({ inputMode: 'camera', imageUrl: url, mood: "" })`.
4. **Update `MoodStep` Mood Submission:**
   - In the "Continue" button `onClick` for the Mood View, update the call to: `await createParticipant({ inputMode: 'mood', mood: formData.mood, imageUrl: undefined })`.

---

## ⚠ Risks / Edge Cases
- **Risk (Low)**: Modifying the signature of `createParticipant` implies any other component calling it without arguments relies purely on the potentially stale context. Because `MoodStep` is the only component responsible for creating the initial participant record, this risk is functionally zero.
- **Edge Case**: If the user rapidly clicks the camera submission multiple times, the button disabled states (`isUploading || isCreating`) prevent multiple disjoint uploads. The synchronous handoff into `createParticipant` avoids closure traps.
