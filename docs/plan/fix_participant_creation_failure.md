# Implementation Plan: Fix Participant Creation Failure

After the merge, participant creation in Firestore is reportedly failing. This plan simplifies the creation payload and adds diagnostic logging to identify the root cause.

## Proposed Changes

### [MODIFY] [useParticipant.ts](file:///d:/Github_Repos/IceBreaker/src/hooks/useParticipant.ts)
- Add detailed `console.log` for `mergedData`, `roomId`, and `payload` before the Firestore write.
- Wrap the `getDocs` capacity check in a more specific try-catch or temporarily disable it to rule it out.
- Ensure `traitVector` is NOT sent if it's `null` or empty, to minimize differences from the previous known-good state.
- Add an explicit error log in the main `catch` block that includes the Firestore error code.

## Verification Plan

### Manual Verification
- Attempt to join a room as a participant via the mobile flow.
- Check the browser console for the new debug logs.
- Verify if the "generating_questions" status is reached and if the participant document appears in Firestore.
