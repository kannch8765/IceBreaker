# 🐛 Host Sync Fix Plan

## 1. Root Cause Breakdown

The synchronization bug occurs because the "Start Session" action strictly manipulates isolated, local state on the Host's browser:
`setSessionState('matched')`
This instantly updates the Hall's UI, moving it to the `ResultPage`. However, this local transition entirely bypasses Firestore. Consequently, the `rooms/{roomId}` document maintains its default `status: 'waiting'`. 

Because mobile clients depend exclusively on the `useRoomState` global listener to ungate the `SessionWaitingPage`, they never receive a `'matched'` signal from the backend, leaving them permanently stranded while the Host silently advances.

---

## 2. Source of Truth Strategy

- **Single Source of Truth:** The Firestore `rooms/{roomId}` document is the absolute authority for session progression.
- **Derived State:** ALL clients (both the Hall Host and the Mobile Participants) must derive their immediate UI from their real-time `onSnapshot` listeners. Local `useState` toggles used to simulate progression (e.g., `sessionState`) must be eliminated entirely.

---

## 3. Write Flow Plan (Start Session)

- **Where:** Inside the `handleStart` function within `LobbyClient.tsx` (preferably executing the centralized `startRoomSession(roomId)` library function).
- **Exact Data Written:** An `updateDoc` call mapping `{ status: 'matched' }` to the room's document reference.
- **When Triggered:** Fired exclusively when the Host clicks the "Start Session" button.
- **Idempotency:** 
  1. The UI button must be disabled immediately while the async request resolves (`isStarting = true`).
  2. The function must verify `if (status === 'matched') return;` at the top to prevent duplicate writes if the button is double-clicked or repeatedly triggered.

---

## 4. Read Flow Plan (UI Sync)

- **Replace Local State:** Remove the `const [sessionState, setSessionState] = useState(...)` hook from `LobbyClient.tsx`.
- **How Hall Reads Status:** `LobbyClient.tsx` already implements `const { status } = useRoomState(roomId)`. This hook establishes the `onSnapshot` listener tracking the room's global state.
- **UI Rendering Derivation:** Replace all UI conditional wrappers (e.g., `if (sessionState === 'matched')`) with `if (status === 'matched')`. 
  - Because `useRoomState` updates synchronously against the local Firestore cache, the UI instantly reacts as soon as the Host successfully executes the `updateDoc` write, guaranteeing all connected clients flip screens simultaneously.

---

## 5. Edge Case Handling

- **Host Refresh After Clicking Start:** Because the UI state is derived directly from Firestore (`status`), refreshing the page dynamically fetches `status: 'matched'` on load. The Host avoids ever seeing the "Start Session" button again and safely drops straight into the `ResultPage`.
- **Multiple Hosts Clicking Start:** Firestore handles concurrent `updateDoc` calls safely. Idempotency checks locally block most collisions. If both fire simultaneously, the second write is an identical identical overwrite (`{ status: 'matched' }`) resulting in a harmless no-op.
- **Firestore Delay / Slow Network:** The button must surface a loading spinner or disable itself during the network request. While this introduces a split-second delay compared to optimistic local updates, it guarantees consistency. The Host must not see the Result UI until the write actually propagates to the network, preventing false assumptions that mobile users have advanced.
- **Already Matched Room (Late Arrivals):** Any user (Host resolving connection drops, or mobile users arriving late) natively parses `status === 'matched'` from the read stream, instantly routing them to the result screen upon load.

---

## 6. Minimal Change Strategy

- **To Remove:**
  - The local `[sessionState, setSessionState]` state hook.
  - The optimistic `setSessionState('matched')` logic inside `handleStart`.
- **To Keep:**
  - The existing `useRoomState(roomId)` hook integration, which is currently used cleanly to detect a `'closed'` room logic.
  - The `startRoomSession(roomId)` handler mapping.
- **To Replace:**
  - `sessionState === 'matched'` conditionals replaced with `status === 'matched'`.
  - Ensure `startRoomSession` library function purely executes the Firestore `updateDoc(roomRef, { status: 'matched' })` command. This centralizes the write authority.
