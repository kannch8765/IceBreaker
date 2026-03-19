# Refined Translation System Refactor Plan

This document provides concrete UI/UX specifications and an implementation strategy to integrate a dedicated Language Selection step into the Ice-Breaker mobile onboarding flow.

## 1. Mobile UI Pattern Analysis

### Visual Identity (Lilac Theme)
- **Background**: Soft gradients with animated blobs (Purple/Indigo/Pink).
- **Containers**: `StepWrapper` provides a `backdrop-blur-2xl` frosted glass effect with `rounded-[2rem]` (32px) corners.
- **Typography**: Bold headers (`text-2xl` or `text-3xl`) with neutral subheaders (`text-sm text-gray-500`).
- **Inputs/Buttons**: 16px padding, `rounded-2xl` (16px) corners, subtle shadows.
- **Motion**: 
  - Entrance: Spring motion (`bounce: 0.4`) dropping from top.
  - Interaction: `whileHover` (1.05 scale) and `whileTap` (0.95 scale).
  - Transition: `AnimatePresence` with `mode="wait"`.

---

## 2. LanguageStep UI Design

### Conceptual Choice: Option A (Card-based Selection)
**Justification**: Card-based selection is superior for mobile onboarding as it provides a large tap target area, immediate visibility of all options, and follows the "one-task-per-screen" high-intent pattern. A dropdown (Option B) adds unnecessary taps and hides choices.

### UI Specification
- **Layout**:
  - **Top**: Minimal Header: "Select Language" (or localized equivalent).
  - **Center**: Vertical stack of 3 interactive cards.
  - **Bottom**: Primary "Continue" button (initially disabled until selection).
- **Language Card Component**:
  - **Background**: White/60 (Light) or Gray-800/60 (Dark) with glassmorphism.
  - **Border**: 2px border (Transparent default, Purple-400/Green-400 when selected).
  - **Content**: Horizontal layout with a localized flag/icon and the language name in its native script (e.g., "English", "日本語", "简体中文").
- **Copy Strategy**:
  - Main Title: `t('selectLanguage')` (Defaulting to "Choose your language" if key missing).
  - Subtext: "Select your preferred language for the AI experience."

---

## 3. Interaction & Motion Design
- **Entrance**: The `LanguageStep` will drop in using the standard `StepWrapper` spring animation.
- **Selection Feedback**:
  - Tapping a card triggers a slight "click" scale animation (`whileTap={{ scale: 0.98 }}`).
  - The card border glows and the background opacity increases upon selection.
- **Transition**: Upon clicking "Continue", the step slides out to the left (`x: -100`) as the `IdentityStep` drops in.

---

## 4. State & Data Flow (Step-by-Step)

### A. Initialization (Frontend)
1. **LanguageContext.tsx**: 
   - Add a `useEffect` to sync `language` state with `localStorage.getItem('preferredLanguage')`.
   - Update `setLanguage` to also `localStorage.setItem('preferredLanguage', lang)`.

### B. Selection (User Action)
2. User selects a language card in `LanguageStep`.
3. `setLanguage(lang)` is called -> UI updates immediately.
4. User taps "Continue" (`nextStep()` called).

### C. Persistence (Firestore)
5. User completes `IdentityStep` and proceeds to `MoodStep`.
6. In `MoodStep`, the `createParticipant` function (from `useParticipant.ts`) is triggered.
7. **Modified Payload**: The `setDoc` call now includes the `language` field derived from the current Context.

---

## 5. Firestore Schema Update

### Field Specification
- **Field Name**: `language`
- **Type**: `string` (Enum-like)
- **Values**: `'en' | 'jp' | 'cn'`
- **Default**: `'en'` (if initialization fails).

### TypeScript Interface
```typescript
export interface Participant {
  id: string;
  username: string;
  pronoun: string;
  mood: string;
  language: 'en' | 'jp' | 'cn'; // Added field
  status: string;
  createdAt: FieldValue;
  // ... rest of fields
}
```

---

## 6. Step Flow Integration

### StepManager.tsx Re-indexing
- **Step 1**: `LanguageStep` (NEW)
- **Step 2**: `IdentityStep` (Previous Step 1)
- **Step 3**: `MoodStep` (Previous Step 2)
- **Step 4**: `QuestionsStep` (Previous Step 3)
- **Step 5**: `ProcessingStep` (Previous Step 4)
- **Step 6**: `ResultStep` (Previous Step 5)

**Action**: All existing logic in `StepManager` and individual steps referencing `nextStep/prevStep` will remain functional as they use relative increments, but `OnboardingContext` initial `step` state should be reviewed if we want users to start at Step 1.

---

## 7. Edge Cases & Risks
- **Refresh during selection**: Handled by StepManager's `onboardingStep` storage in LocalStorage. If the user refreshes on Step 1, they stay on Step 1.
- **Stale LocalStorage**: If the user has an old `preferredLanguage` but the app updates its schema, we should ensure the fallback to `'en'` is robust.
- **Firestore Write Delay**: The UI transitions to the next step immediately after `createParticipant` is called. We should ensure `nextStep` is only called after `await setDoc(...)` resolves.
- **Language Switcher in NavBar**: We should consider hiding the `LanguageSwitcher` in the `NavBar` specifically during Step 1 (LanguageStep) to avoid redundant UI elements.

---

## 8. Final Recommendations
1. **Unified Switcher Logic**: Keep the `LanguageSwitcher` in the Hall and Mobile NavBar for post-onboarding changes, but make the Step 1 selection the "Mandatory Initialization".
2. **Haptic Feedback**: If possible (targeting mobile browsers), add `navigator.vibrate(10)` on card selection for a premium feel.
3. **Ghost Loading**: Use a skeleton state if the language dictionary takes more than 100ms to load (unlikely given the small size of `translations.ts`).
