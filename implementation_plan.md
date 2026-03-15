# Implementation Plan: Mobile UI Refinement & Language (Phase 1.5)

## 1. Goal
Refine the onboarding UI to include global controls (Language/Theme) and finalize the "Name Card" layout with match avatars and multi-language support.

## 2. New Components & Global UI
- **NavBar:** Top-right overlay containing:
  - **Theme Toggle:** Switch between Lilac Fusion and Black/Green fusion.
  - **Language Selector:** Dropdown for EN / JP / CN.
- **The Match Row:** A horizontal list of matched user avatars at the bottom of the final Name Card.

## 3. Step-by-Step Tasks

### Step 1: Global State for UI
- Add **language** and **theme** to your state management (`useOnboardingStore`).
- Create a simple dictionary for UI strings.

Example structure:
```ts
const dictionary = {
  next: { en: "Next", jp: "次へ", cn: "下一步" },
  back: { en: "Back", jp: "戻る", cn: "返回" }
}
```

### Step 2: Refined Result Card (View 5)
- **Match Section:** Add a line of text (e.g., *"People you should meet:"*) followed by **2–3 small circular icons** (`rounded-full`).
- **Icon Layout:** Reorganize the card to ensure the **Nano-Banana icon**, **user info**, and **ice-breakers** are spaced elegantly.

### Step 3: Motion Integration for Language Switch
- When a user changes language, apply a **quick fade-out → fade-in animation** to the text so the change feels smooth rather than abrupt.

### Step 4: Dark/Light Mode Styling
- Update Tailwind classes to use the **`dark:` variant**.
- **Dark Mode Palette:** `#000000` background with `#00FF41` (Matrix/DataCamp green) accents.