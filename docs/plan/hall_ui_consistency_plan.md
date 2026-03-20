# Implementation Plan: Hall UI Consistency & Shared Navigation

The current Hall views (`HallLanding`, `LobbyClient`, `ResultPage`) manage their global controls (Theme and Language) inconsistently. This plan introduces a shared `HallNavBar` component to ensure these controls are always visible, correctly positioned at the top-right, and never blocked by content panels.

## User Review Required

> [!NOTE]
> I will create a new shared component `HallNavBar` specifically for the Event Hall views. This will unify the placement of the `ThemeToggle` and `LanguageSwitcher` in the top-right corner (`z-50`) across all hall stages.

## Proposed Changes

## Proposed Changes

### 1. Lobby View Refactor
- **[MODIFY] [LobbyClient.tsx](file:///d:/Github_Repos/IceBreaker/src/components/hall/LobbyClient.tsx)**:
    - Restore `ThemeToggle` import and usage.
    - Remove `LanguageSwitcher` from the sidebar.
    - Add a floating `div` with `absolute top-4 right-4 z-50 flex items-center gap-3` containing both `LanguageSwitcher` and `ThemeToggle` as a direct child of the root container.
    - This ensures they stay locked to the top-right of the screen and avoid being blocked by the D3 graph or sidebar.

### 2. Result Page Refactor
- **[MODIFY] [ResultPage.tsx](file:///d:/Github_Repos/IceBreaker/src/components/hall/ResultPage.tsx)**:
    - Add the same `absolute top-4 right-4 z-50` control block to ensure theme/language switching is possible even on the final transition screen.

## Verification Plan

### Automated Tests
- Run `npm run lint` to ensure no unused imports or broken references remain.

### Manual Verification
1. **Consistency Check**: Navigate from the Hall Landing to the Lobby (Waiting Page) and verify the theme/language controls stay in the exact same top-right position.
2. **Visibility Check**: Verify that the controls are visible and clickable even when the "Soul Resonance Map" (D3 graph) is active.
3. **Synchronization**: Toggle the theme and confirm the **D3 Graph** (Network) and **Participant List** update immediately via the CSS variable linking.
