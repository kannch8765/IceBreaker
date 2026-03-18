# Implementation Plan: Structured QA Data Flow (Per-User)

## Goal
Transition the participant onboarding flow to a robust, structured `qa` array format that is **personalized per user**. This ensures that the Gemini-powered backend receives full context of which questions were answered, maintaining mapping stability and supporting the generative onboarding experience.

## 1. Data Location & Source of Truth
Questions are generated per participant based on their initial profile (username, mood, etc.) and written by the backend to the individual **Participant document**.
- **Path**: `rooms/{roomId}/participants/{participantId}`
- **Source Fields**:
  - `questions`: Array of objects: `[{ id: string, text: string }]`
  - `status`: Drives the frontend state machine.

## 2. Improved Schema (Stable Mapping)
The participant document tracks both the asked questions and the provided answers for full backend context.
- **Participant Document Fields**:
```typescript
interface ParticipantDoc {
  questions: Array<{ id: string, text: string }>;
  qa: Array<{
    questionId: string; // References questions[].id
    question: string;   // Full text for Gemini context
    answer: string;     // User input
  }>;
  status: 'generating_questions' | 'answering' | 'waiting_for_ai' | 'ready';
}
```

## 3. Frontend Data Flow (Step-by-Step)
1. **Initial Write**: On step 2 (Mood), frontend writes `username`, `mood`, etc., to the participant doc and sets `status: 'generating_questions'`.
2. **Listen**: `useParticipant` hook listens to `rooms/{roomId}/participants/{participantId}`.
3. **Wait**: `QuestionsStep.tsx` shows a loading state while `status === 'generating_questions'`.
4. **Answering**: Once `status === 'answering'` and `questions` are available, the frontend renders the inputs.
5. **Collect**: User answers are stored in local state or context as a map (`{ [questionId]: answer }`).
6. **Construct**: After user clicks "Submit", the frontend pairs answers with the `questions` text to form the `qa` array.
7. **Write Back**: The `qa` array is written to the participant document, and status is set to `waiting_for_ai`.

## 4. Resilience & Edge Case Handling
- **Status-Driven UI**: `QuestionsStep` will react automatically to backend status updates.
- **Refresh Protection**: `participantId` is persisted in `localStorage`. Upon refresh, the hook re-attaches the listener to the participant doc, resuming the flow (Waiting for questions -> Answering -> Waiting for results).
- **Backend Overwrites**: If the backend updates `questions` mid-answering (rare), the stable `questionId` mapping ensures existing answers stay matched where IDs persist.

## 5. Summary of Frontend logic
- **Hooks**: Refactor `useParticipant` to be the central listener for all participant-related state changes.
- **Context**: Update `formData` to store answers indexed by `questionId`.
- **Components**: `QuestionsStep` renders dynamically based on the `questions` array in the participant data.
