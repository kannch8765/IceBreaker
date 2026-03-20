# Walkthrough: CSS Variable Refactor (Steps 1-3)

## Overview
This refactor migrates the application's styling system from hardcoded Tailwind color utilities to a centralized, semantic CSS variable-based system. This allows for easier theme management and better alignment with the "Lilac" and "Matrix" design specs.

## 1. Files Modified
- [`src/app/globals.css`](file:///d:/Github_Repos/IceBreaker/src/app/globals.css)
- [`tailwind.config.ts`](file:///d:/Github_Repos/IceBreaker/tailwind.config.ts)
- [`src/components/ui/Button.tsx`](file:///d:/Github_Repos/IceBreaker/src/components/ui/Button.tsx)
- [`src/components/ui/LanguageSwitcher.tsx`](file:///d:/Github_Repos/IceBreaker/src/components/ui/LanguageSwitcher.tsx)
- [`src/components/ui/ThemeToggle.tsx`](file:///d:/Github_Repos/IceBreaker/src/components/ui/ThemeToggle.tsx)

---

## 2. Changes Made

### STEP 1: Global Variable Definition
Added semantic tokens to `globals.css`.
- **Light Theme**: `--accent-primary` (Purple-600), `--accent-secondary` (Indigo-500), `--border` (Gray-200).
- **Dark Theme**: `--accent-primary` (Matrix-Green), `--accent-secondary` (Green-400), `--border` (Gray-800).

### STEP 2: Tailwind Extension
Mapped the new variables in `tailwind.config.ts` so they can be used via `bg-accent`, `text-accent`, `border-border`, etc.

### STEP 3: UI Component Refactor
- **Button**: Now uses a single gradient `from-accent to-accent-secondary`. The dark mode override is handled automatically by the CSS variables, except for `dark:text-black` which remains explicit to ensure contrast on the green background.
- **LanguageSwitcher**: The active language item now uses `text-accent` instead of hardcoded purple/green.
- **ThemeToggle**: The focus ring now uses `focus:ring-accent`.

---

## 3. Uncertainties & Skipped Lines
- **Opacity Utilities**: Components using `/opacity` (e.g., `bg-white/50`) were left unchanged in this step to avoid breaking the layout before the RGB variable strategy is fully implemented.
- **Surface Colors**: `surface-primary` and `surface-secondary` were not fully applied to UI component backgrounds yet, as the focus was on `accent` and `border` tokens per the specific step instructions.

---

## 4. Visual Consistency Confirmation
- The "Lilac" theme maintains its primary purple/indigo aesthetic.
- The "Matrix" theme maintains its black/green aesthetic.
- Transitions between themes continue to work seamlessly via the existing `ThemeContext`.
