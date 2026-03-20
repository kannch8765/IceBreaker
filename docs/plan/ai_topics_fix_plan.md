## Goal
Ensure `aiTopics` are correctly displayed in `ResultStep.tsx` by addressing the confirmed listener lifecycle discontinuity and fixing the dependency array in the `useParticipant` hook.

## Proposed Changes

### [Hooks]

#### [MODIFY] [useParticipant.ts](file:///d:/Github_Repos/IceBreaker/src/hooks/useParticipant.ts)
- Add `setMatchedParticipant` to the `useEffect` dependency array (line 169) to ensure the listener uses the correct store setter.
- Verify other dependencies like `setAiTopics`, `setAvatarUrl`, etc., are correctly handled.

## [Mobile Components]

#### [MODIFY] [ResultStep.tsx](file:///d:/Github_Repos/IceBreaker/src/components/mobile/ResultStep.tsx)
- Import and call `useParticipant()` to keep the Firestore listener active while the component is mounted. This prevents state loss if the transition from previous steps happened before the `matchedParticipant` object was fully sync'd.
- Add `console.log("matchedParticipant:", matchedParticipant)` and `console.log("aiTopics:", matchedParticipant?.aiTopics)` as requested.
- Ensure the rendering logic for `aiTopics` remains robust for the confirmed `string[]` structure.

## Potential Clashes & Mitigations

### 1. Duplicate Listeners
- **Concern**: Both the previous step and the new `ResultStep` might attempt to manage listeners simultaneously during the transition.
- **Mitigation**: React's `useEffect` handles cleanup on unmount, and the `onSnapshot` listener in `useParticipant` includes a proper `unsubscribe()` call. Adding it to `ResultStep` ensures continuity rather than conflict.

### 2. State Sync Race Conditions
- **Concern**: If `status` updates before `matchedParticipant`, `ResultStep` might mount with incomplete data.
- **Mitigation**: By keeping the listener alive in `ResultStep`, the component will reactive-ly update once the `matchedParticipant` data finally arrives from Firestore.

## Verification Plan

### Manual Verification
1. **Direct Entry**: Navigate directly to the Result Page and verify that `matchedParticipant` data is fetched from Firestore because the listener is now active in `ResultStep`.
2. **Transition Test**: Complete the onboarding flow and verify that `aiTopics` appear immediately on the Result Page.
3. **Log Verification**: Check the browser console to ensure `matchedParticipant` and `aiTopics` are logged correctly and contain the expected data.
4. **Non-English Verification**: Test with a non-English language to ensure Japanese/Chinese topics render correctly (as per confirmed `string[]` structure).
