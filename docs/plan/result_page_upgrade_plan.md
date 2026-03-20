# Implementation Plan: Result Page Upgrade & Social Integration

This plan details the UI enhancements for the Result Page and the integration of real-time matched participant data from Firestore.

## User Review Required

> [!IMPORTANT]
> - The "Add to Wallet" button will be removed as per the new requirements.
> - The "People you should meet" section will be promoted to a more prominent position above the AI Ice Breakers.
> - Matches will be dynamically resolved from the current participant's Firestore document.

## Proposed Changes

### 1. State Management
#### [MODIFY] [OnboardingContext.tsx](file:///d:/Github_Repos/IceBreaker/src/context/OnboardingContext.tsx)
- Add `matchedParticipants` state and setter.
- Structure for matches: `Array<{ uid: string; username?: string; avatarUrl?: string }>`

### 2. Firestore Sync
#### [MODIFY] [useParticipant.ts](file:///d:/Github_Repos/IceBreaker/src/hooks/useParticipant.ts)
- Update the `onSnapshot` listener to detect `matched_participants`.
- Implement logic to handle both object-based matches and UID-based matches.
- If only UIDs are provided, fetch the corresponding participant documents (username/avatar) from the room's participants subcollection.

### 3. UI Implementation
#### [MODIFY] [ResultStep.tsx](file:///d:/Github_Repos/IceBreaker/src/components/mobile/ResultStep.tsx)
- Reorder components: Move Social section above AI Topics.
- Remove the Wallet button section.
- Upgrade the Social section:
  - Larger avatars (increase from `w-10 h-10` to `w-14 h-14`).
  - Improved overlapping animation/spacing.
  - Dynamically map over `matchedParticipants` from context.
  - Implement fallbacks for missing `avatarUrl` (🦊 emoji) and empty matches (🐶🐱🐰 placeholders).

## Verification Plan

### Automated Tests
- Build verification: Run `npm run build` to ensure no regression in static export.

### Manual Verification
- **Empty State**: Verify that 🐶🐱🐰 placeholders appear when `matched_participants` is missing in Firestore.
- **Matched State (Partial)**: Manually add a `matched_participants: ["ID1"]` field to a participant document in Firestore and verify it loads the matching user's avatar.
- **Matched State (Full)**: Verify that when multiple matches are present, they overlap correctly and show their respective avatars/emojis.
