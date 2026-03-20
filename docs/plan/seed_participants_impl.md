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
// Update function signature and logic around line 28
28:   const createParticipant = useCallback(async (overrideData?: any, options?: { skipStore?: boolean }) => {
...
// Block existing ID check if skipStore is true
42:       if (participantId && !options?.skipStore) {
...
// Block store update if skipStore is true
90:       if (!options?.skipStore) {
91:         setParticipantId(newId);
92:       }
```

### [Hall Components]
#### [MODIFY] [LobbyClient.tsx](file:///d:/Github_Repos/IceBreaker/src/components/hall/LobbyClient.tsx)
```tsx
// 1. Add import near line 16
import { useParticipant } from '@/hooks/useParticipant';

// 2. Inside the LobbyClient component (near line 28)
const { createParticipant } = useParticipant();
const [isSeeding, setIsSeeding] = useState(false);

// 3. Add Seeding Logic (near other handlers)
const seedParticipants = async () => {
      username: `Seed User ${i}`,
      pronoun: i % 2 === 0 ? 'He/Him' : 'She/Her',
      inputMode: 'mood',
      mood: 'Happy & Curious'
    };
    promises.push(createParticipant(mockUser, { skipStore: true }));
  }
  
  await Promise.all(promises);
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

## 3. Pitfalls & Considerations
- **Overwrite Issue**: Fixed by adding `skipStore` to bypass the `if (participantId)` check.
- **Store Contamination**: Fixed by bypassing `setParticipantId` when `skipStore` is enabled.
- **Capacity**: The room limit is 50. Seeding 20 is safe unless the room already has 31+ users.
- **Firestore Burst**: 20 parallel writes is well within Firestore's free-tier limits and backend processing capabilities for a hackathon demo.
- **Mock Data**: Ensure `inputMode` matches the expected schema (`mood` or `camera`) to trigger the correct AI pipeline.

## 4. Self-test Checklist
1. [ ] Start the app in **Dev Mode**.
2. [ ] Navigate to `/hall` and use "Quick Setup" to create a room.
3. [ ] Click **"Seed 20 Users (Dev)"**.
4. [ ] Observe the "Connected" count jumping by 20.
5. [ ] Open **Firestore console** and verify 20 new documents in `rooms/{roomId}/participants`.
6. [ ] Confirm each document has `status: "generating_questions"`.
