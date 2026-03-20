# Implementation Plan: Integrate Revamped Network Graph (D3-style) - REFINED

## Goal
Integrate the high-performance `NexusMapCanvas` from `src/_sandbox` into the `LobbyClient` view. The graph will be placed in the current "Participant List" section with a slidable toggle.

## Data Structure & Clash Mitigations

### 1. Node Identification & Stability
- **Clash**: The current `Participant` object uses `id` for uniqueness, but `NexusMapCanvas` uses `uid` for both physics and display. Displaying the raw `id` in the profile card is poor UX.
- **Solution**: 
    - Extend `StarNodeInput` to include `name: string`.
    - Pass `participant.id` as `uid` (for stable physics) and `participant.username` as `name`.
    - Update `ProfileCard` to show `info.name` instead of `info.uid`.
- **Clash (Position Jump)**: Currently, `NexusMapCanvas` spawns new nodes with `Math.random()` traits if `traitVector` is missing, causing different positions on every page reload.
- **Solution**: 
    - Use the provided `uidToTraits(uid)` helper as the fallback in the sync loop. This ensures that for a given `participant.id`, the "vibe" and position are deterministic and stay consistent across refreshes for all viewers.

### 2. Event Handling & Z-Index
- **Clash**: The `LobbyClient` uses an `absolute inset-0` background overlay with `backdrop-blur`. This blocks mouse events to the Canvas below it, making nodes unclickable.
- **Solution**: 
    - Set `pointer-events-none` on the background overlays in `LobbyClient.tsx`.
    - Set `pointer-events-auto` specifically on the Host Controls and QR code card.

## Proposed Changes

### [Hall Components]

#### [NEW] [NexusMapCanvas.tsx](file:///d:/Github_Repos/IceBreaker/src/components/hall/NexusMapCanvas.tsx)
- Port from `src/_sandbox/NexusMapCanvas.txt`.
- **Logic Fixes**:
    - Update interface: `export interface StarNodeInput { uid: string; name: string; traitVector?: number[]; }`.
    - Use `uidToTraits(nd.uid)` on line 196 for stable trait generation.
- **Theme Support**:
    - Add `theme` prop.
    - Implement the "Target Design System (Light Mode Graph)" color mappings.

#### [MODIFY] [LobbyClient.tsx](file:///d:/Github_Repos/IceBreaker/src/components/hall/LobbyClient.tsx)
- **State**: `viewMode: 'list' | 'map'`.
- **Data Mapping**:
    ```typescript
    const nodes = participants.map(p => ({
      uid: p.id,
      name: p.username || 'Anonymous',
      traitVector: p.traitVector
    }));
    ```
- **Structure**:
    - Use `AnimatePresence` to toggle between the Grid and the `NexusMapCanvas`.
    - The Map container will use `h-[60vh] rounded-3xl overflow-hidden pointer-events-auto`.

## Verification Plan

### Manual Verification
1.  **Stable Positions**:
    - Join as a user. Note your node's color/position.
    - Refresh the Hall page.
    - Verify your node appears in the **exact same color and relative position** as before.
2.  **Display Name**:
    - Click on your node.
    - Verify the `ProfileCard` shows your **username**, not your Firestore ID.
3.  **Clickability**:
    - Ensure you can click nodes even when they are "behind" the semi-transparent glass overlays of the Lobby.
4.  **Light Mode**:
    - Toggle the app to Light Mode.
    - Verify the graph background is soft lilac and the Profile Card is readable with dark text.
