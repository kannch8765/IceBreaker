# 🔍 ResultStep Avatar Data Access Audit

## 1. The Core Discrepancy

The `ResultStep.tsx` component iterates over `matchedParticipants` using a `.map((p) => ...)` loop. While Firestore is confirmed to have the `avatarUrl` field, the UI fails to render it and falls back to the 🦊 placeholder.

### Observation:
- **Top-level `avatarUrl`**: Works (synced directly to store root in `useParticipant.ts`).
- **Match-level `p.avatarUrl`**: Returns `undefined`.

---

## 2. Possible Runtime Shapes of `p`

Since `p.avatarUrl` is undefined, the match object `p` likely follows one of these non-flat structures:

### A) The "Wrapped" Shape (Most Likely)
The backend matching engine often wraps participant data to include match-specific metadata (like score or match timestamp).
```json
{
  "uid": "participant_abc",
  "participant": {
    "username": "Alex",
    "avatarUrl": "https://api.dicebear.com/..."
  }
}
```
*Current Path*: `p.avatarUrl` ➡️ `undefined`  
*Correct Path*: `p.participant.avatarUrl`

### B) The "Keyed" Shape
The array might be a collection of objects keyed by the participant ID.
```json
{
  "participant_abc": {
    "username": "Alex",
    "avatarUrl": "https://api.dicebear.com/..."
  }
}
```
*Current Path*: `p.avatarUrl` ➡️ `undefined`  

### C) The "Firestore Wrapper" Shape
Depending on how the data was serialized by the matching worker:
```json
{
  "uid": "participant_abc",
  "data": {
    "username": "Alex",
    "avatarUrl": "https://api.dicebear.com/..."
  }
}
```
*Current Path*: `p.avatarUrl` ➡️ `undefined`  
*Correct Path*: `p.data.avatarUrl`

---

## 3. Identification of failure

The fallback 🦊 is triggered because the ternary check `{p.avatarUrl ? ... : "🦊"}` evaluates to `false` when `p.avatarUrl` is `undefined`. 

Even though the user confirmed the field name is `avatarUrl` (camelCase), the **depth** of the property is the mismatch. The UI assumes a flat object, but the data is structured with a nesting level (likely `participant` or `matchedParticipant`).

---

## 4. Fix Direction

- **Correct Path**: The access needs to be adjusted in `ResultStep.tsx` to match the actual nesting (e.g., `p.participant.avatarUrl`).
- **Store Mapping**: Alternatively, the transformation can happen in `useParticipant.ts` during the `setMatchedParticipants` call to flatten the objects before they reach the store.

---

## 5. Robustness Suggestion

- **Optional Chaining**: Use `p?.participant?.avatarUrl || p?.avatarUrl` to handle both flat and nested structures safely.
- **Defensive Rendering**: Ensure `p.username` also has a safe fallback path if it too is nested.
