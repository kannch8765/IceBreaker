# Implementation Plan - Firestore Data Alignment

Fixing critical mismatches between the Mobile Frontend and Python Backend Worker that prevent answers from being correctly processed.

## Proposed Changes

### [Mobile Frontend]
Align the data structure and field naming with the backend specifications.

#### [MODIFY] [useParticipant.ts](file:///d:/Github_Repos/IceBreaker/src/hooks/useParticipant.ts)
- Update `createParticipant`:
    - Rename `traitVector` field to `ocean_vector` in the Firestore payload.
    - Scale the vector values from `[0, 1]` to `[0, 100]` (multiply by 100) to match the backend's affinity scoring logic.
    - Add `swipeAnswers` to the payload for auditability.
- Update `updateParticipant`:
    - Ensure it also handles `ocean_vector` and `swipeAnswers` if passed.

#### [MODIFY] [QuestionsStep.tsx](file:///d:/Github_Repos/IceBreaker/src/components/mobile/QuestionsStep.tsx)
- Add `console.log` statements to `handleSubmit` to track:
    - Payload construction.
    - Success/failure of the `updateParticipant` call.
- This will help the user confirm if the "not recording" issue is a silent failure or a network/permission error.

#### [NEW] [participant_schema.md](file:///d:/Github_Repos/IceBreaker/docs/spec/participant_schema.md)
- Document the official Participant schema to prevent future naming mismatches between teammates.

---

## Verification Plan

### Automated Tests
*None available in the current project. Building and running a manual walkthrough is the primary verification method.*

### Manual Verification
1. **Clear Local Storage**: Open browser dev tools and clear `localStorage` to start a fresh session.
2. **Run Dev**: Ensure `npm run dev` is active.
3. **Mobile Onboarding**:
    - Complete Identity (Name/Pronoun).
    - Complete Soul Test (Swipe 10 times).
    - Complete Mood/Photo.
4. **Inspect Firestore**:
    - Open Google Cloud/Firebase Console.
    - Locate the participant document under `rooms/{roomId}/participants/{id}`.
    - **Verify**: The field is named `ocean_vector` (NOT `traitVector`).
    - **Verify**: The values in `ocean_vector` are integers between 0 and 100.
    - **Verify**: The field `swipeAnswers` exists with 10 values.
5. **Answer Recording**:
    - Input answers to the 3 questions.
    - Click "Generate Card".
    - **Verify Console**: Check the browser console for "Answer submission successful" log.
    - **Verify Firestore**: Reload the participant document and confirm the `qa` field is populated.
