# SwipeStep i18n Implementation Walkthrough

## Overview
Successfully integrated the `SwipeStep` component with the project's central `LanguageContext`, translating the hardcoded interaction texts and the 10 core profiling questions into English, Japanese, and Chinese.

## Changes Made
- **`src/lib/translations.ts`**:
  - Added new translation keys for `swipeHint` and `prevQuestion`.
  - Added structured translation keys (`swipeQ{1-10}_prompt`, `swipeQ{1-10}_left`, `swipeQ{1-10}_right`) for all 10 questions across the `en`, `jp`, and `cn` dictionary blocks.
- **`src/components/mobile/SwipeStep.tsx`**:
  - Removed the hardcoded `QUESTIONS` array.
  - Implemented the `useTranslation` hook from `LanguageContext` alongside the strictly typed `TranslationKey`.
  - Dynamically fetched the translated prompt directly within the JSX using `t(\`swipeQ${round + 1}_prompt\` as TranslationKey)`.
  - Replaced the static "上一问" (Previous Question) button and "← 滑动选择 →" (Swipe Hint) labels with `t('prevQuestion')` and `t('swipeHint')` respectively.

## Validation Notes
- **Type Safety**: The linter currently reports no missing or unexported types. The `TranslationKey` type guarantees that the keys used dynamically map to those defined in the `en` object.
- **Data Flow**: The component still uses `round` (0 to 9) to reliably access the corresponding question text without needing an internal array. The unrendered `left` and `right` keys are preserved in `translations.ts` for documentation and any future UI features.
