# Participant Lifecycle Fix Implementation

## 1. Files Modified
- `src/hooks/useParticipant.ts`

## 2. Key Code Changes
The `createParticipant` function in `useParticipant.ts` was refactored to support an idempotent 'upsert' pattern:
- **Existence Check:** Added `if (participantId)` at the beginning of the function to detect returning/refreshing users.
- **Update Logic:** If an ID exists, the function now attempts `updateDoc` on the existing reference, explicitly passing only the safe mutable fields (`username`, `pronoun`, `mood`, `language`, and resetting `status` to `generating_questions`).
- **Data Preservation:** Because `updateDoc` is used instead of a blunt override, backend-generated fields like `aiTopics`, `questions`, `avatarUrl`, and timestamp fields (`createdAt`, `expiresAt`) remain firmly intact.
- **Graceful Fallback:** If the `updateDoc` fails (e.g., the document was purged due to the 2-hour expiration or forced host cleanup), a `catch` block catches the error and seamlessly routes the user back to the standard creation flow to generate a new ID.
- **Capacity Check:** The `< 50` room capacity check and `getDocs` query are now bypassed entirely for returning users, ensuring that legitimate users are not locked out of the room when simply trying to update their profile.

## 3. Confirmation of Idempotent Behavior
The updated frontend hook fulfills all sanity test criteria:
- **Scenario:** Enter `/room` → Complete MoodStep (click Continue) → Go forward → Go back to MoodStep → click Continue again.
- **Result:** The first click generates a new Firestore document and saves the `participantId` to `localStorage`/React Context. The second click (after going backward) detects the existing `participantId` and runs the `updateDoc` path. 
- **Outcome:** **NO new Firestore document is created.** The same `participantId` is definitively reused, completely resolving the "ghost user" duplication bug and stopping unwarranted growth of the Room database collection.

## 4. Build Result
- `npm run build` executed successfully.
- **0 TypeScript errors.** 
- **0 linting errors.**
- Static page generation successfully completed without issues.
