# Implementation Plan: Restore & Relocate Theme Switcher in Lobby

The user is unable to see or use the theme switcher in the Lobby ("waiting stage"). This is because it was removed from the sidebar per previous instructions and lacks a dedicated, non-occluded position in the new layout. This plan restores the switcher and ensures it remains visible above the D3 graph.

## User Review Required

> [!NOTE]
> I will move the `ThemeToggle` and `LanguageSwitcher` to a floating overlay in the top-right corner of the Lobby view. This matches the placement on the `HallLanding` page and ensures the controls are always on top of the D3 graph and Participant list.

## Proposed Changes

### 1. Lobby View Refactor
- **[MODIFY] [LobbyClient.tsx](file:///d:/Github_Repos/IceBreaker/src/components/hall/LobbyClient.tsx)**:
    - **Restore Import**: Re-add `import { ThemeToggle } from '@/components/ui/ThemeToggle';`.
    - **Add Floating Controls**: 
        - Remove `LanguageSwitcher` from the bottom of the sidebar.
        - Add a new `div` with `absolute top-6 right-6 z-50 flex items-center gap-3` containing both `LanguageSwitcher` and `ThemeToggle`.
    - This ensures they float over the `Right panel` (D3 Graph / List) and are never blocked.

### 2. D3 Graph Verification
- **[VERIFY] [NexusMapCanvas.tsx](file:///d:/Github_Repos/IceBreaker/src/components/hall/NexusMapCanvas.tsx)**: Double-check that it is correctly pulling the theme state and CSS variables (implemented in previous step).

## Verification Plan

### Automated Tests
- Run `npm run lint` to ensure no syntax errors or unused imports.

### Manual Verification
1. **Visibility Check**: Open the Lobby and verify the `ThemeToggle` and `LanguageSwitcher` are clearly visible in the top-right corner.
2. **Clickability**: Verify that the buttons are clickable and not "swallowed" by the D3 canvas mouse listeners.
3. **Theme Sync**: Toggle the theme and verify the **D3 Graph** (Network) and **Participant List** both update their colors immediately.
4. **View Persistence**: Switch between "Network" and "Participants" views and verify the controls stay fixed in the top-right.
