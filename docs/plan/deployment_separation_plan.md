# Deployment and Dev-Tool Separation Plan

## 🎯 Goal
Strictly separate development-only "Seeding" features from production-ready "Data Persistence" fixes. This ensures the production deployment is clean and optimized while preserving the hackathon dev tools in a dedicated branch.

## 🌿 Git Branch Strategy

### 1. `feature/dev-tools` (The Seeder Branch)
- This branch will contain **everything** related to the mock participant generator and auto-answer logic.
- **Included Files**:
  - `src/dev/` (Entire directory)
  - `docs/plan/seed_*` and `docs/walkthrough/seed_*`
  - `LobbyClient.tsx`: Seeder button and auto-answer `useEffect`.
  - `useParticipant.ts`: `skipStore` and `isSeed` logic in `createParticipant`.

### 2. `main` (The Production Branch)
- This branch will contain only critical fixes needed for a stable user experience.
- **Included Fixes**:
  - `ResultStep.tsx`: The `useParticipant()` hook call to maintain the Firestore listener.
  - `useParticipant.ts`: The `setMatchedParticipant` dependency fix (ensures late-arriving data syncs).
  - `useRoomParticipants.ts`: The updated `Participant` status union (better types).
  - `OnboardingContext.tsx`: Exported context (safe and standard).

## 🚀 Build & Deployment Sequence

1.  **Safety Backup**: Create a temporary git stash/commit of all current state to ensure no work is lost.
2.  **Branch Creation**: 
    - Create `feature/dev-tools` and commit all seeder-related changes.
    - Switch back to `main`.
3.  **Production Cleanup**:
    - Manually remove the seeder-specific code blocks from `LobbyClient.tsx` and `useParticipant.ts` in the `main` branch.
    - Remove the temporary `console.log` debug statements from `ResultStep.tsx` and `useParticipant.ts`.
4.  **Verification**: 
    - Run `npm run build` to ensure the prod-only state passes Next.js build/export.
5.  **Deployment**:
    - Run `npx firebase deploy --only hosting` to update the live site.

## 📝 Impact Analysis
- **Production**: Users will have a stable `ResultStep` with guaranteed data sync, but no visible "Seed" button.
- **Development**: Developers can switch to `feature/dev-tools` at any time to test with mock users.
