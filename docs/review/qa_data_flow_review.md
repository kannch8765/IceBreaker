# Code Review: QA Data Flow

## Existing Implementation Analysis

### 1. Question Source
- **Currently**: Hardcoded in `QuestionsStep.tsx` as `ALL_PROMPTS`.
- **Issue**: This contradicts the requirement that the backend (Cloud Run + Gemini) generates questions and writes them to Firestore. The frontend is currently disconnected from the actual backend-generated questions.

### 2. Answer Collection & Write Logic
- **Mechanism**: `QuestionsStep.tsx` uses a local `prompts` state (randomly selected from hardcoded list) and updates `formData.answers` (a string array) in `OnboardingContext`.
- **Write**: `useParticipant.ts` writes the entire `answers` array to Firestore under the `participants` sub-collection.
- **Problem**: Storing only `answers: ["answer1", "answer2"]` loses the context of which question was asked. If the backend changes the questions or their order, the answers become meaningless.

### 3. Data Flow Vulnerabilities
- **Index Mismatch**: The mapping between `prompts[index]` and `answers[index]` is purely positional. Any change in the number or order of questions will break this.
- **Race Condition**: If the user starts answering while the backend is still updating the room's questions, the UI might show stale questions while the backend expects answers for new ones.
- **Refresh Resilience**: While `participantId` is persisted, the actual questions shown to the user are randomized on every mount of `QuestionsStep`, meaning a refresh would change the questions but keep the (now invalid) answers in state.

## Conclusion
The current architecture is too fragile for dynamic, AI-generated questions. Transitioning to a structured `qa: [{ question, answer }]` format is essential for mapping reliability and backend context.
