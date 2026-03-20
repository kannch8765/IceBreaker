# 🗺️ Start Session Frontend Plan

## 1. 🧠 DESIGN PRINCIPLE
Since the backend structure is currently undefined, this frontend implementation relies exclusively on local mock state. It is designed to be fully **forward-compatible** with the future backend evolution, specifically the expected `room.status` timeline (`waiting` → `active` → `matching` → `matched` → `closed`). 
We are prioritizing **optimistic UI transitions**: local interactions advance the interface immediately, preventing any UI blocking, while future backend integrations will seamlessly take over via snapshot listeners.

---

## 2. 🔘 START SESSION BUTTON (Lobby / Room Page)

### Expected Behavior:
- Host clicks "Start Session".
- UI transitions immediately (no backend dependency yet).
- Moves all users into the "matching phase".

### Component Implementation Example

```tsx
// src/components/hall/RoomPage.tsx
import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { useTranslation } from '@/context/LanguageContext';
import { LobbyView } from './LobbyView';
import { MatchingWaitingPage } from './MatchingWaitingPage';
import { ResultPage } from './ResultPage';

export type SessionState = 'waiting' | 'starting' | 'matching' | 'matched' | 'closed';

export function RoomPage() {
  const { t } = useTranslation();
  const [sessionState, setSessionState] = useState<SessionState>('waiting');

  const handleStartSession = () => {
    // Optimistic immediate transition
    setSessionState('starting');

    // Simulate backend processing transition (future: remove timeout)
    setTimeout(() => {
      setSessionState('matching');
    }, 800);
  };

  // Render Sub-view via localized Switch
  if (sessionState === 'waiting') {
    return (
      <LobbyView>
        <Button
          onClick={handleStartSession}
          disabled={sessionState !== 'waiting'}
          className="w-full mt-6"
        >
          {t('startSession')}
        </Button>
      </LobbyView>
    );
  }

  if (sessionState === 'starting' || sessionState === 'matching') {
    return <MatchingWaitingPage />;
  }

  if (sessionState === 'matched') {
    return <ResultPage />;
  }

  return <EndScreen />; // Fallback for 'closed'
}
```

---

## 3. 🎆 MATCHING WAITING PAGE (CORE DESIGN)

**UX Concept:**
- Minimalist, distraction-free
- Emotional anticipation with bounce/pulse animations
- Flawless in both light and dark modes
- Language-aware via centralized i18n

### Component Implementation

```tsx
// src/components/hall/MatchingWaitingPage.tsx
import React from 'react';
import { useTranslation } from '@/context/LanguageContext';
import { motion } from 'framer-motion';

export const MatchingWaitingPage = () => {
  const { t } = useTranslation();

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      className="flex flex-col items-center justify-center h-full min-h-screen text-center px-6 transition-colors duration-500 bg-white text-gray-900 dark:bg-black dark:text-gray-100"
    >
      <div className="relative w-32 h-32 flex items-center justify-center mb-8">
        {/* Glowing aura effect for both themes */}
        <motion.div
          animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="absolute inset-0 bg-purple-300 dark:bg-green-500/30 rounded-full blur-xl filter"
        />
        <div className="text-6xl animate-bounce drop-shadow-[0_0_20px_rgba(255,255,255,0.6)] dark:drop-shadow-[0_0_20px_rgba(0,255,100,0.6)] z-10">
          🎆
        </div>
      </div>

      <h1 className="text-2xl font-bold mb-3 tracking-tight">
        {t('matchingNow')}
      </h1>

      <p className="text-sm font-medium text-gray-500 dark:text-gray-400 max-w-[250px]">
        {t('matchingSubtitle')}
      </p>
    </motion.div>
  );
};
```

---

## 4. 🌍 i18n (MANDATORY)

Keys that MUST be added to the unified localization context.

```ts
// src/context/translations.ts (or equivalent dictionary file)

export const TRANSLATIONS = {
  en: {
    // ...existing translations
    startSession: "Start Session",
    matchingNow: "Now matching you...",
    matchingSubtitle: "Your mysterious match is about to appear ✨",
  },
  jp: {
    // ...existing translations
    startSession: "セッション開始",
    matchingNow: "マッチング中...",
    matchingSubtitle: "あなたの運命の相手がまもなく現れます ✨",
  },
  cn: {
    // ...existing translations
    startSession: "开始匹配",
    matchingNow: "正在为你匹配...",
    matchingSubtitle: "你的神秘对象即将出现 ✨",
  }
};
```

---

## 5. 🌗 THEME SUPPORT (LIGHT / DARK)

Theme toggles are actively respected via pure Tailwind primitives:
- **Light Mode:** Crisp whites (`bg-white`), dark grey typography (`text-gray-900`), soft purple glowing aura (`bg-purple-300`).
- **Dark Mode:** Deep blacks (`bg-black`), crisp white typography (`text-gray-100`), matrix green glowing aura (`bg-green-500/30`).
- **Animations:** A combination of `animate-bounce` on the icon and framer-motion `scale/opacity` pulses on the auras prevent visual staleness.

---

## 6. 🔌 FUTURE BACKEND INTEGRATION (IMPORTANT)

When the backend architecture stabilizes and Firestore synchronization is required, the mock `setTimeout` transitions will be completely replaced by real-time `onSnapshot` listeners.

### The Integration Contract Hook

```tsx
// Future integration snippet (in a custom hook e.g., useRoomSession.ts)
import { useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export function useRoomSession(roomId: string) {
  const [sessionState, setSessionState] = useState<SessionState>('waiting');

  useEffect(() => {
    if (!roomId) return;
    
    const roomRef = doc(db, 'rooms', roomId);
    const unsubscribe = onSnapshot(roomRef, (docSnap) => {
      if (docSnap.exists()) {
        const rawStatus = docSnap.data().status;
        
        // Expected Mapping Translation
        const statusMap: Record<string, SessionState> = {
          'waiting': 'waiting',
          'active': 'starting',
          'matching': 'matching',
          'matched': 'matched',
          'closed': 'closed'
        };
        
        setSessionState(statusMap[rawStatus] || 'waiting');
      }
    });

    return () => unsubscribe();
  }, [roomId]);

  return { sessionState, setSessionState };
}
```

**Note:** The Start Session button click will then just locally call `updateDoc(roomRef, { status: 'active' })`, and the listener takes over.

---

## 7. ⚠️ DESIGN CONSTRAINTS

1. **Non-Blocking UI:** The frontend must NEVER block on an empty/null backend response for UI stage transitions. If the backend is slow, the transition to `MatchingWaitingPage` allows users to understand the app is doing work.
2. **Optimistic Rendering:** The UI guarantees immediate feedback using `setSessionState('starting')` directly in the `onClick` handler.
3. **Undefined Graceful Fails:** The components assume no hard reliance on Firebase document fields existing; if `docSnap.data()` is missing keys, the UI simply defaults back to `'waiting'`.
