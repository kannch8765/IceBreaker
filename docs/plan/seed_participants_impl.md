# Seed Participants Implementation Plan (V2)

## 1. Approach
We will modify the core `useParticipant` hook to support a "seeding" mode that bypasses the global state. This allows us to call `createParticipant` multiple times without each call overwriting the previous one or hijacking the current user's session.

- **Non-breaking**: The change to `useParticipant.ts` is additive and won't affect existing onboarding.
- **Minimal**: No new hooks or complex state, just an optional parameter.
- **Dev-only**: The button is guarded by `process.env.NODE_ENV`.

## 2. Code Changes

### [Frontend Hooks]
#### [MODIFY] [useParticipant.ts](file:///d:/Github_Repos/IceBreaker/src/hooks/useParticipant.ts)
```typescript
// 1. Update createParticipant signature (line 28)
const createParticipant = useCallback(async (overrideData?: any, options?: { skipStore?: boolean }) => {
...
// 2. Prevent bypass of existing ID check (line 42)
      if (participantId && !options?.skipStore) {
...
// 3. Support language override and prevent store contamination (lines 82/90)
const payload = {
  // ... existing payload properties
  language: mergedData.language || language, // Allow seed users to have random languages
  status: 'generating_questions',
  // ... existing payload properties
};

      if (!options?.skipStore) {
        setParticipantId(newId);
      }
```

### [Hall Components]
#### [MODIFY] [LobbyClient.tsx](file:///d:/Github_Repos/IceBreaker/src/components/hall/LobbyClient.tsx)
```tsx
// 1. Add imports
import { useParticipant } from '@/hooks/useParticipant';
import { generateMockParticipant } from '@/dev/generateMockParticipant';

// 2. Initialize hook and state inside LobbyClient
const { createParticipant } = useParticipant();
const [isSeeding, setIsSeeding] = useState(false);

// 3. Updated seeding logic using the generator
const seedParticipants = async () => {
  if (process.env.NODE_ENV !== 'development' || isSeeding) return;
  setIsSeeding(true);
  try {
    const promises = [];
    for (let i = 1; i <= 20; i++) {
      const mockUser = generateMockParticipant(i);
      promises.push(createParticipant(mockUser, { skipStore: true }));
    }
    await Promise.all(promises);
  } finally {
    setIsSeeding(false);
  }
};

// Button JSX in Host Controls area
{process.env.NODE_ENV === 'development' && (
  <button 
    onClick={seedParticipants}
    className="px-4 py-2 bg-amber-500 text-black font-bold rounded-xl hover:bg-amber-400 transition-colors"
  >
    Seed 20 Users (Dev)
  </button>
)}
```

## 3. Data Integrity & Clash Mitigation

To prevent issues with duplicate data or backend overloading, we will implement the following:

- **Uniqueness**: Mock usernames will include a short random suffix to avoid Firestore key collisions or UI "identical twin" confusion.
- **`isSeed` Flag**: All seeded participants will have an `isSeed: true` property. This allows the backend or future cleanup scripts to easily identify and prune mock data.
- **Capacity Guard**: The "Seed" button will be disabled if the total number of participants (current + 20) exceeds the room limit of 50.
- **Controlled Concurrency**: We will use `Promise.all` for speed, but add a 50ms stagger between requests if needed to avoid a massive single-millisecond burst to the Firestore listener.

## 4. Refined Code Changes

### [Frontend Hooks]
#### [MODIFY] [useParticipant.ts](file:///d:/Github_Repos/IceBreaker/src/hooks/useParticipant.ts)
```typescript
// Support isSeed flag and language override
const payload = {
  ...
  username: mergedData.username,
  language: mergedData.language || language,
  isSeed: mergedData.isSeed || false, // NEW: Mark mock data
  status: 'generating_questions',
  ...
};
```

### [Hall Components]
#### [MODIFY] [LobbyClient.tsx](file:///d:/Github_Repos/IceBreaker/src/components/hall/LobbyClient.tsx)
```tsx
const seedParticipants = async () => {
  // 1. Capacity Check
  if (participants.length + 20 > 50) {
    alert("Room is too full to seed 20 users.");
    return;
  }
  
  setIsSeeding(true);
  try {
    const promises = [];
    for (let i = 1; i <= 20; i++) {
      const mockUser = generateMockParticipant(i);
      // 2. Add uniqueness and isSeed flag
      mockUser.username = `${mockUser.username}_${Math.random().toString(36).substring(7)}`;
      (mockUser as any).isSeed = true;
      
      promises.push(createParticipant(mockUser, { skipStore: true }));
      // Optional: await new Promise(r => setTimeout(r, 50)); // stagger
    }
    await Promise.all(promises);
  } finally {
    setIsSeeding(false);
  }
};

// 3. UI Guard
<button 
  disabled={isSeeding || participants.length >= 50}
  // ... styles
>
  {participants.length >= 50 ? "Room Full" : "Seed 20 Users"}
</button>
```

## 9. Strict Technical Requirements

To ensure zero side-effects and absolute data integrity, the following implementation details are **mandatory**:

### ❶ Exact Source of `participants.length`
In `LobbyClient.tsx`, the count **must** be derived directly from the `useRoomParticipants` hook:
```tsx
const { participants, loading } = useRoomParticipants(roomId);
// Validation: Use participants.length for capacity checks
if (participants.length + 20 > 50) { ... }
```
Using any other source (like a local state or a different hook) is strictly forbidden.

### ❷ Mock Data Language Contract
The `generateMockParticipant` function **must** explicitly return a valid `language` string (`"en"` or `"jp"`) to ensure the `language` override in `createParticipant` is meaningful:
```typescript
// src/dev/generateMockParticipant.ts
const LANGUAGES = ["en", "jp"] as const;
...
return {
  ...
  language: randomPick(LANGUAGES),
};
```

### ❸ Comprehensive `skipStore` Execution
The `skipStore` logic in `useParticipant.ts` **must** cover both the write-safety (preventing updates) and session-safety (preventing store contamination):

1.  **Update Guard**:
    ```typescript
    if (participantId && !options?.skipStore) { 
      // Only update if skipStore is false
    }
    ```
2.  **Store Guard**:
    ```typescript
    if (!options?.skipStore) {
      setParticipantId(newId); // Only update global store if skipStore is false
    }
    ```

## 10. Refined Code Changes (Final)

### [Frontend Hooks]
#### [MODIFY] [useParticipant.ts](file:///d:/Github_Repos/IceBreaker/src/hooks/useParticipant.ts)
```typescript
// Line 28: Updated signature
export function useParticipant() {
  const { ..., participantId, setParticipantId, ... } = useOnboardingStore();
  
  const createParticipant = useCallback(async (overrideData?: any, options?: { skipStore?: boolean }) => {
    ...
    // 1. Skip update logic if seeding
    if (participantId && !options?.skipStore) {
      try {
        const existingRef = doc(participantsRef, participantId);
        ...
        await updateDoc(existingRef, payload);
        setLoading(false);
        return participantId;
      } catch (err) { ... }
    }
    ...
    // 2. Allow language override
    const payload = {
      ...
      language: mergedData.language || language,
      isSeed: mergedData.isSeed || false,
      ...
    };
    ...
    // 3. Skip global store sync if seeding
    if (!options?.skipStore) {
      setParticipantId(newId);
    }
    ...
  }, [roomId, participantId, formData, language, setParticipantId]);
}
```

### [Hall Components]
#### [MODIFY] [LobbyClient.tsx](file:///d:/Github_Repos/IceBreaker/src/components/hall/LobbyClient.tsx)
```tsx
export default function LobbyClient() {
  const { participants, loading } = useRoomParticipants(roomId); // Mandatory source
  const { createParticipant } = useParticipant();
  ...
  const seedParticipants = async () => {
    if (participants.length + 20 > 50) return alert("Capacity full");
    ...
    for (let i = 1; i <= 20; i++) {
       const mockUser = generateMockParticipant(i);
       promises.push(createParticipant(mockUser, { skipStore: true }));
    }
    ...
  };
}
```
