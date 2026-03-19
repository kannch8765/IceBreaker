# Translation System Audit & Refactor Plan

This document outlines the current state of translations in the Ice-Breaker project and proposes a technical plan to refactor the Mobile onboarding flow to include a dedicated Language Selection page.

## 1. Current Translation Architecture

### State Management
- **Source of Truth**: `LanguageContext.tsx` holds the `language` state ('en' | 'jp' | 'cn') using React `useState`.
- **Implementation**: A static dictionary in `src/lib/translations.ts`.
- **Consumption**: Managed via the `useTranslation()` hook, which provides the `t()` function and current `language`.
- **Persistence**: **None**. Language selection is transient and resets on page refresh.

### Data Flow
1.  User selects language via `LanguageSwitcher.tsx`.
2.  `LanguageContext` state updates.
3.  UI components re-render using localized strings from `TRANSLATIONS`.
4.  **Missing Link**: The selected language is NOT sent to Firestore and thus NOT known by the AI backend.

---

## 2. Firestore Integration
- **Current State**: The `participants` document in Firestore does **not** contain a `language` field.
- **AI Backend**: `main.py` currently uses hardcoded Chinese prompts. It does not receive any language preference from the frontend or worker.
- **Impact**: AI generates questions and topics in a fixed language (Chinese-influenced), regardless of the user's UI setting.

---

## 3. Component Analysis: LanguageSwitcher
- **Location**: `src/components/ui/LanguageSwitcher.tsx`.
- **UI Type**: A small, floating globe icon with a dropdown menu.
- **Dependencies**: `LanguageContext`, `framer-motion`, `lucide-react`.
- **Reusability**: High. It can be easily adapted into a full-page selection component for the new onboarding step.

---

## 4. UX Flow Comparison

### Current Flow
1.  **/room?room=X** (Mobile Join)
2.  **Step 1: Identity** (Name/Pronouns)
3.  **Step 2: Mood** (Vibe/Photo) -> *Participant document created here*
4.  **Step 3-5**: AI interaction and Result.
*Note: Language switcher is hidden in the `NavBar` and often ignored until after onboarding.*

### Proposed Flow
1.  **/room?room=X**
2.  **Step 0: Select Language** (Full-screen, prominent selection)
3.  **Step 1: Identity**
4.  **Step 2: Mood** -> *Participant document created including `language`*
5.  **Rest of flow**

---

## 5. Implementation Plan

### Step 1: Persistence & Context Initialization
- **Action**: Update `LanguageContext.tsx` to load/save `language` from `localStorage`.
- **Rationale**: Ensures the user doesn't lose their language choice if they refresh during onboarding.

### Step 2: New Language Selection Page
- **Action**: Create `src/components/mobile/LanguageStep.tsx`.
- **UI Design**: Reuse the logic from `LanguageSwitcher` but render large, touch-friendly cards for each language.
- **Routing**: Update `src/components/mobile/StepManager.tsx` to insert `LanguageStep` as the first step (Step 1) and increment existing steps.

### Step 3: Firestore Schema Update
- **Action**: Modify `src/hooks/useParticipant.ts`.
- **Change**: Include `language: language` in the `setDoc` call within `createParticipant`.
- **Rationale**: Explicitly stores the user's preference for backend awareness.

### Step 4: Backend AI Awareness
- **Action A (`firestore_worker.py`)**: Read `language` from the Firestore participant snapshot and add it to the JSON payload for both API calls.
- **Action B (`main.py`)**: 
  - Update `GenerateQuestionsPayload` and `ForgeProfilePayload` to include an optional `language: str` field.
  - Modify prompts to instruct Gemini: *"Generate the following JSON content in [Language]."*

### Step 5: Hall View Compatibility
- **Action**: None strictly required. The Hall will continue to use the `LanguageSwitcher` in the `NavBar`. Since both use the same context, it remains consistent.

---

## 6. Updated Data Flow
1.  **Mobile User** selects "Japanese" on the new first page.
2.  **Frontend** stores `language: 'jp'` in Context/LocalStorage.
3.  **User** completes Identity/Mood steps.
4.  **Firestore** document created with `{ ..., language: 'jp' }`.
5.  **Worker** passes `language: 'jp'` to AI Backend.
6.  **AI Backend** prompts Gemini to generate questions in Japanese.
7.  **Mobile User** sees AI questions in Japanese.

---

## 7. Risks & Edge Cases
- **Stale Language**: If a user joins a room they previously joined with a different language, we should decide if we overwrite the Firestore field. (Recommendation: Yes, overwrite on every join session).
- **Backend Fallback**: If `language` is missing in Firestore (older records), `main.py` should default to English/Chinese.
- **Sync Lag**: The UI might switch languages before the Firestore update is confirmed. (Handled by optimistic UI in React).

---

## 8. Recommendations
1.  **Source of Truth**: Use **React Context** as the runtime truth, backed by **LocalStorage** for persistence, and **Firestore** for backend synchronization.
2.  **Explicit Selection**: Force the language selection once per visit to ensure the AI knows the user's preference before generating the first set of questions.
3.  **Localized Moods**: The `MOODS` array in `MoodStep.tsx` currently has English labels. Consider moving these labels to `translations.ts` to ensure full i18n coverage.
