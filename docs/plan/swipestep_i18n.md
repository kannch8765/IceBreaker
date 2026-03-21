# SwipeStep i18n Integration Plan

## Goal Description
The `SwipeStep.tsx` component currently contains hardcoded plain Chinese texts for the questions array, back button, and swipe hint. The goal is to align it with the project's language switcher (`LanguageContext`) by moving these strings into `translations.ts` and utilizing the `useTranslation` hook.

## Proposed Changes
### src/lib/translations.ts
#### [MODIFY] translations.ts
- Add new translation keys for:
  - `swipeHint`: "← 滑动选择 →" (en: "← Swipe to select →", jp: "← スワイプして選択 →")
  - `prevQuestion`: "上一问" (en: "Previous", jp: "前へ")
  - `swipeQX_prompt`, `swipeQX_left`, `swipeQX_right` for all 10 questions (X ranging from 1 to 10).

### src/components/mobile/SwipeStep.tsx
#### [MODIFY] SwipeStep.tsx
- Import `useTranslation` from `LanguageContext`.
- Replace the static `QUESTIONS` array with a dynamic one mapping `t(swipeQX_prompt)` etc., or construct the array inside `SwipeStep` using `t` and `language`.
- Replace the "上一问" and "← 滑动选择 →" texts with `t('prevQuestion')` and `t('swipeHint')`.
