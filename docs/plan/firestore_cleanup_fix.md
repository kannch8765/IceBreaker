# Refined Fix Plan: Firestore Cleanup and Lifecycle Recovery

## Section 1: Root Cause
The system reaches a "deadlock" state (20-room limit) because the `activeRooms` counter in `global_stats/system` is never decremented when a host abandons a session (e.g., closing the tab). Without a reconciliation mechanism, these "ghost slots" permanently block new room creation.

## Section 2: Chosen Strategy
**Strategy: Counter Recalibration (Safer & Simpler)**
Instead of trying to "clean up" other users' rooms, the system will simply **re-sync** the global counter when it detects the limit has been reached.

**Why this version is safer:**
- **No Stranger Writes**: Users never attempt to modify room documents belonging to other hosts. This maintains strict data isolation.
- **No Complex Rules**: No changes to `firestore.rules` are required to allow cross-user updates.
- **Lean Transactions**: The heavy lifting (querying and counting) happens *before* the transaction, keeping the atomic update extremely fast and reliable.

## Section 3: Step-by-Step Plan

### 1. [MODIFY] [room.ts](file:///d:/Github_Repos/IceBreaker/src/lib/room.ts)
Update the `createRoom` function with a three-step flow:

**Phase A: Pre-Check**  
Read the current `activeRooms` value from `global_stats/system`.

**Phase B: Recalibrate (Only if limit reached)**  
If `activeRooms >= 20`:
- Query the `rooms` collection for documents where `status != "closed"`.
- Filter the results to count only those where `expiresAt > now`.
- Update `global_stats/system` with this new `actualCount`.

**Phase C: Atomic Creation**  
Run a simplified transaction to:
- Verify `activeRooms < 20`.
- Increment `activeRooms`.
- Create the new room document with its `expiresAt` (2 hours).

### 2. [KEEP] UI Filtering
- Continue using `expiresAt` in `useRoomParticipants.ts` and `useRoomState.ts` to hide stale data from the user interface.

### 3. [KEEP] Manual Kill Switch
- Retain the "Kill Switch" functionality as a "good citizen" feature for active hosts to free up slots immediately.

## Section 4: Cleanup Approach
- **Logical Expiration**: We rely on `expiresAt` to determine if a room is "active" at the database level.
- **Metadata Reconciliation**: The recalibration query handles the "cleanup" of the counter without needing to touch the stale room documents themselves.
- **Physical Deletion**: Not required for this prototype stage.

## Section 5: Risk Mitigation
- **Concurrency**: If two users recalibrate at the same time, the `updateDoc` on `global_stats` is idempotent (they will both set it to the same correct count).
- **Index Requirements**: Firestore might require a composite index for `status != "closed"` and `expiresAt > now`. If indices are an issue, the query can be simplified to just `status != "closed"` with client-side filtering of the ~20 results.

## Section 6: Optional Improvements
- **Tab Close Handler**: A simple `window.onbeforeunload` in `LobbyClient.tsx` to attempt a `closeRoom` call is still recommended as a first line of defense.
