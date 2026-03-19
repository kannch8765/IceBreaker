# Firestore Data Lifecycle and Cleanup Audit

## Section 1: Existing Cleanup Logic
- **Manual Room Closure**: The application implements a `closeRoom` function in `src/lib/room.ts`. This function performs a transaction to:
  1. Update the room's `status` to `"closed"`.
  2. Decrement the `activeRooms` counter in `global_stats/system`.
- **Kill Switch UI**: The `LobbyClient.tsx` component provides a "Kill Switch" button that explicitly triggers `closeRoom`.
- **Lazy Client-Side Filtering**: Both `useRoomParticipants.ts` and `useRoomState.ts` hooks include logic to filter out or treat documents as "closed" if their `expiresAt` timestamp has passed. This ensures the UI remains clean even if data persists in the database.

## Section 2: Subcollection Handling
- **Orphaned Subcollections**: Subcollections (specifically `rooms/{roomId}/participants`) are **NEVER** explicitly deleted. 
- **Firestore Rule Restriction**: Current `firestore.rules` do not include `allow delete` for any collection. Any attempt to delete subcollections from the frontend would fail with `PERMISSION_DENIED`.
- **Finding**: Subcollection data remains in Firestore indefinitely, leading to unbounded storage growth over time.

## Section 3: Lifecycle Analysis
- **Creation**: Rooms are created with a 2-hour `expiresAt` TTL. Participants are also created with a 2-hour `expiresAt`.
- **Deletion**: Documents are **never deleted**. The system relies entirely on status updates.
- **Trigger Gaps**:
  - **Host Leaves**: If the host closes the browser tab or loses connection without clicking "Kill Switch", `closeRoom` is never called.
  - **Counter Leak**: Because `closeRoom` isn't triggered on tab close, the `activeRooms` counter (capped at 20) will not be decremented, leading to "Room capacity reached" errors for new users even if those rooms are empty.
  - **App Reload**: Navigating away or reloading doesn't trigger any state change in Firestore.

## Section 4: Risks
- **Room Limit Exhaustion (HIGH)**: The 20-room hard cap in `global_stats/system` is prone to leaking. If 20 hosts close their tabs without using the "Kill Switch", no new rooms can be created until manual intervention occurs.
- **Storage/Cost Growth (MEDIUM)**: Every session persists forever. While tiny for a hackathon, it violates best practices for ephemeral data.
- **Privacy/Stale Data (LOW)**: Old participant data (names, moods) remains accessible to anyone with the `roomId` via the Firestore API.

## Section 5: Missing Pieces
- **Automated TTL Cleanup**: Lack of a Firestore TTL policy or a scheduled Cloud Function (Cron) to delete documents where `expiresAt < now`.
- **Reliable Cleanup Hooks**: No implementation of `window.onbeforeunload` or `Navigator.sendBeacon` to attempt room closure when a host departs.
- **Administrative Reset**: No utility or dashboard exists to reset the `activeRooms` counter if it becomes desynchronized.

## Section 6: Final Verdict
**Final Verdict: RISKY**

The current implementation is sufficient for a controlled demo with cooperative users, but the **lack of automated cleanup for the global room counter** makes the system fragile. A single day of heavy use with users "abandoning" tabs will likely break the room creation flow entirely.

> [!IMPORTANT]
> To move to a "SAFE" state, it is recommended to implement a Firestore TTL policy on the `expiresAt` field or a Cloud Function to reconcile the `activeRooms` counter periodically.
