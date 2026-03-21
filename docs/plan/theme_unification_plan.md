# Implementation Plan: Theme Management Unification & D3 Graph Linking

The current theme implementation has two competing sources of truth (`ThemeContext` and `OnboardingContext`) and the D3 graph uses hardcoded color values that are not linked to the project's semantic CSS variable system. This plan aims to unify theme management and ensure visual consistency across all views.

## User Review Required

> [!IMPORTANT]
> - I will be removing the `theme` and `setTheme` properties from the `OnboardingContext` and replacing them with a global dependency on `ThemeContext`. This affects all mobile onboarding steps.
> - I will refactor the D3 graph (`NexusMapCanvas.tsx`) to read its colors from CSS variables (`--background`, `--accent-primary`, etc.) instead of receiving a `theme` prop with hardcoded JS colors.
> - **Question for User**: Should the `ThemeToggle` be completely removed from the Hall Lobby sidebar, keeping the Hall primarily in its "Black and Green" focus for the graph (Rule 8)?

## Proposed Changes

### 1. Theme Management Unification
- **[MODIFY] [ThemeContext.tsx](file:///d:/Github_Repos/IceBreaker/src/context/ThemeContext.tsx)**: Ensure it remains the single master of the `.dark` class and `localStorage` persistence.
- **[MODIFY] [OnboardingContext.tsx](file:///d:/Github_Repos/IceBreaker/src/context/OnboardingContext.tsx)**: 
    - [DELETE] `theme` state and `setTheme` function.
    - [DELETE] `useEffect` that syncs theme to `document.documentElement`.
- **[MODIFY] [StepManager.tsx](file:///d:/Github_Repos/IceBreaker/src/components/mobile/StepManager.tsx)** and other mobile steps: Update any consumers of `theme` to use `useTheme()` instead.

---

### 2. D3 Graph (NexusMapCanvas) "Linking"
- **[MODIFY] [NexusMapCanvas.tsx](file:///d:/Github_Repos/IceBreaker/src/components/hall/NexusMapCanvas.tsx)**:
    - [DELETE] `theme` prop.
    - [NEW] Implement dynamic color reading in the render loop to fetch `--background`, `--accent-primary`, and `--accent-secondary` values from the DOM.
    - This ensures the graph "links" to the official theme switcher and `globals.css` automatically.

---

### 3. Lobby Clean-up
- **[MODIFY] [LobbyClient.tsx](file:///d:/Github_Repos/IceBreaker/src/components/hall/LobbyClient.tsx)**:
    - Remove the `ThemeToggle` from the sidebar if confirmed.
    - Remove the manual `theme` prop passing to `NexusMapCanvas`.

## Verification Plan

### Automated Tests
- Run `npm run lint` to ensure no broken references remain.

### Manual Verification
1. **Theme Consistency**: Toggle the theme in the Mobile view and verify it correctly updates and persists.
2. **D3 Graph Sync**: Toggle the theme in the Hall Landing and verify that the D3 graph in the Lobby updates its colors immediately using the CSS variables.
3. **No Collision**: Verify that the theme doesn't "flicker" when moving between mobile steps.
