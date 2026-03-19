# Design Review: Simplified Routing Model

This document evaluates the proposal to collapse the host-side hierarchy into a direct resource-based model.

## 1. Evaluation

The proposed simplified model (**`/hall/[roomId]`**) is a significant improvement over the previous hierarchical structure (**`/hall/lobby/[roomId]`**).

- **Resource-Oriented**: In Next.js App Router, the folder structure should reflect the data hierarchy. The "Hall" *is* the host's view of the "Room" resource. Adding `/lobby` as an intermediate segment adds unnecessary nesting without providing a distinct resource boundary.
- **Scalability**: By using `/hall/[roomId]` as the base, you can still use [Parallel Routes](https://nextjs.org/docs/app/building-your-application/routing/parallel-routes) or [Intercepting Routes](https://nextjs.org/docs/app/building-your-application/routing/intercepting-routes) later if you need to overlay "Results" or "Settings" without breaking the URL contract.
- **Cognitive Load**: It simplifies the developer's "mental map" of the project.

## 2. User Flow Validation

All existing flows map cleanly to the new model:

| Flow Type | Entry (Legacy) | Target (Simplified) | Status |
| :--- | :--- | :--- | :--- |
| **Participant** | `/?room=X` | `/room/[roomId]` | **OK** |
| **Host (Static)**| `/hall` | `/hall` | **OK** |
| **Host (Active)**| `/?room=X&mode=hall` | `/hall/[roomId]` | **OK** |

**Ambiguity Check**: Removing the "lobby" segment resolves potential segment collisions (e.g., if a roomId was "lobby"). There are no flows broken by this change; rather, the transitions become more intuitive.

## 3. State Decision

**Verdict**: Managing state (waiting, matching, result) via **Firestore** instead of the URL is the **correct approach** for this application.

- **Real-time Sync**: In a multi-user ice-breaker, the Host and Participants MUST stay in sync. Firestore listeners provide this natively. 
- **URL-based Routing Pitfall**: If state were in the URL (e.g., `/hall/[roomId]/matching`), a user could manually navigate to `/matching` before the host is ready, or remain on `/matching` after the host has moved to `/results`, creating a "state de-sync" that requires complex client-side reconciliation.
- **Exception**: URL state is only required if you need a persistent, shareable link to a *static archive* of a past session (e.g., "See our match results here: `/results/[pastRoomId]`"). For the live experience, Firestore is superior.

## 4. Risks & Missing Concepts

- **What we LOSE**: We lose the ability to use file-based `layout.tsx` for specific session phases (e.g., a special "Lobby Layout"). However, given the real-time nature, phase-specific UI is better handled via Framer Motion transitions within the same page.
- **What we GAIN**: 
    - Cleaner folder structure.
    - Simplified prop passing.
    - No confusion over which "page" handles which phase.
- **Missing Concepts**: None identified as CRITICAL. A "Lobby" is just a `status === 'waiting'` within the Hall view.

## 5. Final Verdict

**Verdict: YES**

The simplified routing model should be adopted immediately. It aligns with Next.js best practices by treating the Hall and Participant views as top-level application contexts, and the RoomID as the unique identifier for the shared state. It reduces "folder bloat" and makes the navigation logic in the root dispatcher significantly cleaner.
