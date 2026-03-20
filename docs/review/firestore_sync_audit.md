# 🔍 Deep Debug Audit: Firebase Sync Bug

## 1. Most Likely Root Cause (Ranked)

1. **Firestore Security Rules (Permission Denied) - [95% Probability]**
   Firebase is performing an "optimistic update." It updates the local cache instantly but the backend network request fails (due to lack of client write permissions on the `room` document). Firebase rolls back the local cache, causing the flicker.
2. **Backend Watcher Override (Race Condition) - [4% Probability]**
   The write succeeds, but a backend Python worker (greedy matching) instantly overwrites `status` back to `'waiting'` because its internal state machine doesn't agree the room is ready.
3. **Invalid Document State - [1% Probability]**
   The `updateDoc` merges partial data, but server-side validation rules reject it for missing a mandatory timestamp or field.

---

## 2. Exact Failure Mechanism

This is a classic **Firebase Optimistic UI Rollback**. Here is the exact step-by-step sequence:

1. Host clicks "Start Session" → triggers `handleStart()`.
2. `startRoomSession(roomId)` fires `updateDoc({ status: 'matched' })`.
3. **The Trap:** Before the network request even leaves the browser, the Firebase SDK performs an **Optimistic Cache Update**. It modifies its local memory to `{ status: 'matched' }`.
4. The `onSnapshot` listener inside `useRoomState` fires immediately with this optimistic cache.
5. `LobbyClient` receives `status === 'matched'` and synchronously mounts the `<ResultPage />`.
6. The actual `updateDoc` network request hits the Firestore Server.
7. The server **REJECTS** the write (e.g., via `FirebaseError: permission-denied`).
8. The Firebase SDK receives the rejection, realizes its optimistic cache is invalid, and **ROLLS BACK** the local cache to the true server value (`{ status: 'waiting' }`).
9. `onSnapshot` fires a second time with the reverted data.
10. `LobbyClient` receives `status === 'waiting'`, unmounts the `<ResultPage />`, and renders the Lobby again. 
11. Finally, the promise rejects, and the catch block silences the transition by popping the error into the console.

---

## 3. Verification Checklist (Do this immediately)

You must check the browser's developer console on the Host machine to confirm the rollback cause.

**What to modify:**
Inside `src/components/hall/LobbyClient.tsx`:
```tsx
  const handleStart = async () => {
    if (status === 'matched') return;
    setIsStarting(true);
    try {
      await startRoomSession(roomId);
    } catch (err: any) {
      // Add explicit tracing here
      console.error("🔥 FIRESTORE WRITE FAILED:", err.code, err.message);
      setIsStarting(false);
    }
  };
```

**What to observe in the Console:**
- **Expected if Rules Issue:** `🔥 FIRESTORE WRITE FAILED: permission-denied Missing or insufficient permissions.` → Confirms Firebase rules are blocking the direct UI write.
- **Expected if Backend Override:** NO ERROR is logged. The write succeeds quietly, but the UI still flicks back. → Confirms a Python backend worker is actively deleting your write and resetting it to `'waiting'`.

---

## 4. Minimal Fix Direction (Concept)

Because Firestore acts as the Single Source of Truth, the UI *must* continue relying on the listener. The fix must address *how* we interact with the Firestore backend.

**If it is a Permission Error:**
- **What:** You cannot change `room.status` directly from the client.
- **Where:** `startRoomSession` in `src/lib/room.ts`
- **Why/How:** The frontend must signal the backend using an allowed mechanism. This usually means writing to a permitted command subcollection (e.g., `setDoc(doc(rooms/logs/commands), { type: 'start' })`), or calling an established HTTP Firebase Cloud Function endpoint that has Admin-level privileges to bypass the rules and flip the status safely.

**If it is a Backend Override:**
- **What:** The backend greedy matcher must be adjusted.
- **Why/How:** The Python backend must be made aware that the host has explicitly bypassed the waiting phase. We must either pass a `{ forceUnlock: true }` flag, or ensure the backend isn't overriding the frontend's valid state changes.
