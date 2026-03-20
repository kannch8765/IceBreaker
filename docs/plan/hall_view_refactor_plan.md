# Implementation Plan: Hall View Refactor & Feature Merge

This plan outlines how to merge the teammate's D3 graph features while preserving the original participant list (namelist) and ensuring full compatibility with the Lilac/Dark theme system.

## Proposed Changes

### [Component] [NexusMapCanvas](file:///d:/Github_Repos/IceBreaker/src/components/hall/NexusMapCanvas.tsx)
- **[MODIFY]** Add `theme: 'light' | 'dark'` prop to the component.
- **[MODIFY]** Update the `tick` function's render loop to use theme-aware colors:
  - Background: `#0A0E14` (dark) vs `#F5F3FF` (lilac/light).
  - Nebula Wisps: Use soft purple/lilac gradients for light mode.
  - Connection Lines: Increase opacity/contrast for light mode.
- **[MODIFY]** Update `ProfileCard` to use theme-aware background (`rgba(255,255,255,0.9)` for light mode) and text colors.

### [Component] [LobbyClient](file:///d:/Github_Repos/IceBreaker/src/components/hall/LobbyClient.tsx)
- **[MODIFY]** Adopt the teammate's sidebar + right-panel layout.
- **[MODIFY]** Add `viewMode` state (`'graph' | 'list'`).
- **[MODIFY]** In the right panel, use `AnimatePresence` to switch between `NexusMapCanvas` and the recovered Participant Grid.
- **[MODIFY]** Add a "View Switcher" toggle in the sidebar (or as floating tabs) with a slide animation:
  - Slide Left: Show Namelist.
  - Slide Right: Show Network Graph.
- **[MODIFY]** Ensure `ThemeToggle` is integrated and affects both the layout and the D3 canvas.

### [Logic] [Git Conflict Resolution]
- **[EXECUTION]** Resolve the conflict in `LobbyClient.tsx` by accepting the teammate's version as the base.
- **[EXECUTION]** Apply the refactoring steps above to merge the two "worlds".

## Verification Plan

### Automated Tests
- N/A (UI-centric layout changes).

### Manual Verification
1. **View Switching**: Click the view switcher and verify that the namelist slides in/out smoothly.
2. **Theme Switching**: Toggle between Light and Dark modes.
   - Verify the D3 canvas background and nebula wisps change color.
   - Verify the sidebar and participant cards update their styling.
3. **Real-time Updates**: Join from a mobile device (or use the "NEW NODE" demo button) and verify the new node appears in both Graph and Namelist views.
4. **Mobile Check**: Briefly navigate through the mobile onboarding to ensure the auto-merged `SwipeStep.tsx` and `MobileView.tsx` don't crash.

> [!IMPORTANT]
> The D3 graph's light mode needs careful color selection to maintain the "premium" feel. I will use a lilac-tinted off-white background with subtle purple glows.
