# 📱 Mobile Waiting Session Plan

## 1. 🔍 Compatibility Analysis
**Existing System:**
- `useParticipantStatus()` abstracts raw backend participant states into a frontend `UIState`.
- `useRoomParticipants.ts` exports a robust `useRoomState(roomId)` hook that correctly listens to the room's global status (`waiting`, `matched`, `closed`).
- **Compatibility:** Perfect. The participant pipeline does not need to be rewritten. We can safely read `room.status` alongside `participant.status` without cross-contaminating backend responsibilities. 

---

## 2. 🧠 Proposed State Derivation Logic
We will fetch the `room.status` inside the existing `useParticipantStatus` hook. The room state will *only* gate UI changes when the participant has successfully completed their backend AI processing (i.e., when `participant.status === 'ready'`).

**Logic Table:**
| Participant Status | Room Status | Resulting `UIState` |
| ------------------ | ----------- | ------------------- |
| `ready`            | `waiting`   | `'waiting_for_session'` |
| `ready`            | `matched`   | `'profile_ready'` |

---

## 3. 📝 Updated UIState Definition

```ts
// In src/hooks/useParticipant.ts

export type UIState = 
  | "loading_questions" 
  | "answering_form" 
  | "loading_profile" 
  | "waiting_for_session" // <-- NEW STATE
  | "profile_ready" 
  | "error";

import { useRoomState } from '@/hooks/useRoomParticipants';

export function useParticipantStatus() {
  const { status, questions, roomId, participantId } = useOnboardingStore();
  const { status: roomStatus } = useRoomState(roomId || ''); // <-- Injecting Room State
  
  // ... existing logic
  
  if (status === 'error') {
    uiState = "error";
  } else if (status === 'ready') {
    // 🚦 New Gate Logic
    if (roomStatus === 'waiting') {
      uiState = "waiting_for_session";
    } else {
      uiState = "profile_ready";
    }
  } // ... rest remains unchanged
```

---

## 4. 🔄 Flow Integration

Instead of throwing a confusing UI mid-step, we integrate this sequentially into `StepManager.tsx`.

**Old Flow:**
1. Language → 2. Identity → 3. Mood → 4. Questions → 5. Processing (AI Wait) → 6. Result

**New Flow:**
1. Language → 2. Identity → 3. Mood → 4. Questions → 5. Processing (AI Wait) → **6. Session Wait (Host Gate)** → 7. Result

**Step Transition Mechanics:**
- `ProcessingStep.tsx` will be modified:
```tsx
useEffect(() => {
  if (uiState === 'waiting_for_session' || uiState === 'profile_ready') {
    nextStep();
  }
}, [uiState, nextStep]);
```
- `SessionWaitingPage.tsx` will automatically advance when the room changes to starting:
```tsx
useEffect(() => {
  if (uiState === 'profile_ready') {
    nextStep();
  }
}, [uiState, nextStep]);
```

---

## 5. 🌍 i18n Additions (MANDATORY)

Add these keys to your `translations.ts` dictionary:

```ts
export const TRANSLATIONS = {
  en: {
    // ...
    waitingSessionTitle: "Get ready 👀",
    waitingSessionSubtitle: "Waiting for the session to start"
  },
  jp: {
    // ...
    waitingSessionTitle: "準備はいいですか 👀",
    waitingSessionSubtitle: "セッションの開始を待っています"
  },
  cn: {
    // ...
    waitingSessionTitle: "准备好了吗 👀",
    waitingSessionSubtitle: "等待主持人开始"
  }
}
```

---

## 6. 🎨 Component: SessionWaitingPage.tsx

This component matches the theme and creates a clean, calm anticipation UI without looking like an error or a loading spinner.

```tsx
// src/components/mobile/SessionWaitingPage.tsx
import React, { useEffect } from 'react';
import { useTranslation } from '@/context/LanguageContext';
import { useParticipantStatus } from '@/hooks/useParticipant';
import { useOnboardingStore } from '@/context/OnboardingContext';
import { StepWrapper } from '@/components/motion/StepWrapper';
import { motion } from 'framer-motion';

export const SessionWaitingPage = () => {
  const { t } = useTranslation();
  const { uiState } = useParticipantStatus();
  const { nextStep } = useOnboardingStore();

  // Listen for host releasing the UI gate
  useEffect(() => {
    if (uiState === 'profile_ready') {
      nextStep();
    }
  }, [uiState, nextStep]);

  return (
    <StepWrapper>
      <div className="flex flex-col items-center justify-center p-8 text-center min-h-[300px]">
        {/* Subtle Ambient Glow */}
        <div className="relative w-32 h-32 mb-8 flex items-center justify-center">
          <motion.div
            animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="absolute inset-0 bg-yellow-400 dark:bg-purple-500 rounded-full blur-2xl filter mix-blend-multiply dark:mix-blend-screen"
          />
          <span className="text-6xl relative z-10 drop-shadow-md">✨</span>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 10 }} 
          animate={{ opacity: 1, y: 0 }} 
          className="flex flex-col items-center"
        >
          <h2 className="text-2xl font-extrabold text-gray-800 dark:text-gray-100 mb-3 tracking-tight">
            {t('waitingSessionTitle')}
          </h2>
          
          <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">
            {t('waitingSessionSubtitle')}
          </p>
        </motion.div>
      </div>
    </StepWrapper>
  );
};
```
