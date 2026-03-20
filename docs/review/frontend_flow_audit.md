# 🧠 Frontend Execution & Data Flow Audit

## 1. 🔄 Full Entry Flow (User Journey)

The participant onboarding is managed by `StepManager.tsx`, which sequentially renders steps based on `step` in `useOnboardingStore`.

1. **Step 1:** `<LanguageStep />` - Select language, save to local store.
2. **Step 2:** `<IdentityStep />` - Input `username` and `pronouns`.
3. **Step 3:** `<MoodStep />` - Choose between Emoji mode OR Camera mode. **(Triggers Participant Creation)**
4. **Step 4:** `<QuestionsStep />` - Waits for backend to generate questions, user answers them.
5. **Step 5:** `<ProcessingStep />` - Waits for backend to generate final AI topics and avatars.
6. **Step 6:** `<ResultStep />` - Displays final matched results and AI topics.

---

## 2. ⚡ Execution Order & State Transitions (CRITICAL)

### **STEP 1-2: Local State Aggregation**
No network calls occur here. Data is purely aggregated into the zustand `formData` state.
- **State Change:** `updateFormData({ username, pronoun })`

### **STEP 3: MoodStep (First Network/Firestore Boundary)**
This is the **most complex** step.
- **Trigger:** User selects an Emoji OR captures/confirms a Photo.
- **Camera Flow:**
  - `startCamera()` -> Captures Blob.
  - `handleUsePhoto()` -> Triggers Firebase Storage Upload -> Updates form data -> Creates Participant.
  
```ts
// INSIDE MoodStep.tsx
const handleUsePhoto = async () => {
    // 1. Upload to Storage
    const storageRef = ref(storage, storagePath);
    const snapshot = await uploadBytes(storageRef, capturedBlob);
    const url = await getDownloadURL(snapshot.ref);

    // 2. Update local state
    updateFormData({ inputMode: 'camera', imageUrl: url, mood: "" });
    
    // 3. Create Participant in Firestore
    const id = await createParticipant({ inputMode: 'camera', imageUrl: url, mood: "" });
    if (id) nextStep();
}
```

### **STEP 4: QuestionsStep (Async Sync with Backend)**
- **Trigger (Mount):** The component mounts immediately after `createParticipant`.
- **State Transition:** 
  The Firestore participant doc was just created with `status: 'generating_questions'`. The snapshot listener in `useParticipant.ts` syncs this to the frontend.
- **Hook Mapping (`useParticipantStatus`):**
  - Maps `generating_questions` ➡️ `uiState: 'loading_questions'` (Shows `<Loader2 />`)
  - Once backend writes questions and sets `status: 'answering'`, the snapshot updates the `questions` array and changes `uiState: 'answering_form'`.
- **User Action Workflow:**
  User fills out the forms -> Clicks "Generate Card" -> Sends data to Firestore and advances to ProcessingStep.

```ts
// INSIDE QuestionsStep.tsx
const handleSubmit = async () => {
    // 1. Map local answers to QA array
    const qa = questions.map(q => ({
      questionId: q.id,
      question: q.text,
      answer: formData.answers[q.id] || ''
    }));

    // 2. Write to Firestore & change status to trigger backend
    await updateParticipant({ qa, status: 'waiting_for_ai' });
    nextStep();
};
```

### **STEP 5: ProcessingStep (Passive Listener)**
- **Trigger:** Component mounts. It has no user inputs.
- **State Transition:** 
  It waits for `useParticipantStatus` to yield `uiState: 'profile_ready'`. This happens when the backend changes Firestore status to `ready`.
- **Async Execution:**

```ts
// INSIDE ProcessingStep.tsx
useEffect(() => {
    // Hidden coupling: automatically advances step when backend finishes
    if (uiState === 'profile_ready') {
      nextStep();
    }
}, [uiState, nextStep]);
```

### **STEP 6: ResultStep (Final Render)**
- **Trigger:** Mounts when step == 6.
- **Action:** Purely reads from `useOnboardingStore` (`avatarUrl`, `aiTopics`, `matchedParticipants`).

---

## 3. 📂 Data Structure Flow & Read/Write Timeline

**TIMELINE OF READS/WRITES:**

1. **WRITE (Storage):** `MoodStep` uploads `JPEG` blob to `participants/${roomId}_${Date.now()}.jpg`.
2. **WRITE (Firestore):** `createParticipant` in `useParticipant.ts`.
   - **Payload:**
     ```ts
     {
        username: "Alex",
        pronoun: "they/them",
        inputMode: "camera", // or "mood"
        mood: "", // enforced empty if camera
        imageUrl: "https://firebasestorage...", // enforced null if mood
        language: "en",
        status: "generating_questions",
        createdAt: serverTimestamp(),
        expiresAt: expiresAt,
     }
     ```
3. **READ (Real-time Firestore Listener):** The `useEffect` in `useParticipant.ts` opens a continuous `onSnapshot` stream.
   - It reads: `status`, `questions`, `aiTopics`, `avatarUrl`, `matchedParticipants`.
4. **WRITE (Firestore):** `QuestionsStep` calls `updateParticipant`.
   - **Payload:**
     ```ts
     {
        qa: [{ questionId: "1", question: "If you were a...", answer: "Tree" }],
        status: "waiting_for_ai"
     }
     ```
5. **READ (Real-time):** Listener catches backend updates (AI outputs) and triggers the transition to `ResultStep`.

---

## 4. ⚠️ Side Effect Map & Risk Analysis

### **A. Hidden Coupling in Status Management**
- **Risk:** `useParticipantStatus()` abstracts raw backend `status` strings into `uiState`.
- `uiState` mappings are fragile. If the backend fails to update `status` to exactly `'answering'` or `'ready'`, or if `questions.length === 0` despite being in `'answering'`, the UI gets stuck in `'loading_questions'`.

### **B. `createParticipant` Update Fallback Race Condition**
```ts
// INSIDE useParticipant.ts (createParticipant)
if (participantId) {
    try {
        const existingRef = doc(participantsRef, participantId);
        await updateDoc(existingRef, payload);
        return participantId;
    } 
// ...
```
- **Risk:** If a user navigates backwards from `QuestionsStep` (step 4) to `MoodStep` (step 3), taking a new photo calls `createParticipant` *again*.
  - Because `participantId` exists, it triggers `updateDoc`.
  - **Issue:** It resets `status` back to `'generating_questions'`.
  - **Consequence:** This will re-trigger the backend AI question generation worker, wiping the user's previous questions and forcing them to wait again. While logically sound to get new questions for a new vibe, it drops all existing progress.

### **C. Unhandled Listener Unmount Risks**
- The `onSnapshot` listener stays active entirely from Step 3 through Step 6 because the hook `useParticipant()` is mounted globally or inherited down the tree. However, if the component mapping the step unmounts aggressively, there could be brief gaps in state reception. 

### **D. Soft Timeout in Listener**
```ts
// INSIDE useParticipant.ts
const hintTimeoutId = setTimeout(() => {
    setIsTakingLong(true); // Triggers "Taking longer than usual" text
}, 45000);
```
- A side-effect timer exists. It clears when `status` reaches `ready`, `answering`, or `error`. If the backend gets stuck for > 45s without transitioning, the UI correctly surfaces the delay label but offers no hard-abort.
