# Build Failure and React Hook Fix Plan

## 🎯 Goal
Resolve the production build failure caused by extraneous files in the `docs/` directory and fix critical React Hook dependency warnings in `useParticipant.ts` to ensure system stability.

## 🛠️ Proposed Changes

### [Root Configuration]
#### [MODIFY] [tsconfig.json](file:///d:/Github_Repos/IceBreaker/tsconfig.json)
- Refine the `include` array to strictly target source code and required metadata:
  ```json
  "include": [
    "next-env.d.ts",
    "src/**/*.ts",
    "src/**/*.tsx",
    ".next/types/**/*.ts"
  ]
  ```
- Add `docs` to the `exclude` array to prevent documentation snippets from being compiled.

### [Hooks]
#### [MODIFY] [useParticipant.ts](file:///d:/Github_Repos/IceBreaker/src/hooks/useParticipant.ts)
- Address "logical expression" warnings by stabilizing dependencies:
  - Extract setters and values from `context` directly (e.g., `const { setAiTopics } = context || {}`).
  - **Why?**: The previous `context?.setAiTopics || (() => {})` pattern created new function identities on every render, causing the Firestore listener to restart constantly. This is the root cause of the "data delay / non-update" issues.
  - Remove all inline logical OR defaults from the `useEffect` dependency array.

### [Documentation Cleanup]
#### [CLEANUP] [docs/review/](file:///d:/Github_Repos/IceBreaker/docs/review/)
- Rename `LobbyClient_main.tsx` to `LobbyClient_main.tsx.example` to stop compilation errors.
- Clean up other `.tsx`, `.ts.tmp`, and `.old.tsx` files in the `docs/` folder.

## ✅ Verification Plan

### Automated Tests
1. **Critical**: Run `npm run build` to verify the build passes with no type errors.
2. Run `npm run lint` to ensure no "exhaustive-deps" warnings remain in core hooks.

### Manual Verification
1. Verify "Data Stability": Join a room as a participant and ensure data (avatar, topics) updates instantly without flickering or delay.
2. Use the "Seed" tool in the Hall view and confirm all 20 participants move to "Ready" smoothly.
