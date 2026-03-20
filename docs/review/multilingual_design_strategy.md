# Multilingual Design Review & Strategy: Nexus Connect

This document outlines the design audit and strategic proposal for localizing the "Nexus Connect" landing page for English, Chinese, and Japanese markets.

## 1. Design Review

### Visual Hierarchy & Layout
- **The "Big Header" Problem**: The `text-8xl` font size used for the `appTitle` works for the short "Nexus Connect" in English but produces a massive, dense block of text in Chinese/Japanese. CJK characters are ideographic and naturally denser; at this size, they lack the "white space" that Latin letters provide between their strokes.
- **Tracking Inconsistency**: `tracking-tight` is applied globally. While this creates a premium "interlocking" feel for Latin characters, it causes CJK characters to overlap or feel uncomfortably cramped, breaking their natural square proportions.
- **Layout Breathing Room**: The `max-w-lg` for the description leads to "orphaned" characters in CJK when wrapping occurs mid-phrase.

### Typography & Content
- **Font-Weight Mismatch**: The `font-black` (900 weight) is often not supported by default CJK system fonts (falling back to 700 or even 400), making the translated title look "weak" compared to the English brand name.
- **Translation vs. Localization**: The current CJK titles (e.g., "Nexus 破冰连接") feel like a direct substitution. "Nexus Connect" as a brand name should ideally stay in English or be paired with a localized descriptor rather than being translated literally.

---

## 2. Multilingual Strategy Proposal

### Brand Architecture
- **Preserve the Brand**: Keep **"Nexus"** as the primary English brand mark across all languages to maintain the premium "Global Tech" aesthetic.
- **The "Connect" Strategy**: 
  - In English: Use "Nexus Connect" as a unified name.
  - In CJK: Reposition "Connect" into the functional tagline. Use "Nexus" as the hero name, followed by a localized sub-heading that captures the "connection" essence.

### Space & Flow
- **Responsive Sizing**: Decrease the font size by ~15-20% for CJK characters compared to English to maintain visual parity in "perceived" area.
- **Line Breaking**: Implement `word-break: keep-all` to ensure English brand names don't break in the middle, and use `<br />` tags tailored per language for the hero section.

---

## 3. Content System (Localized)

| Language | App Title / Brand Hook | Tagline / Description |
| :--- | :--- | :--- |
| **English** | **Nexus Connect** | Break the ice. Connect instantly. Your real-time social connection hub. |
| **Japanese** | **Nexus** <small>つながる、広がる。</small> | 一瞬で打ち解け、深くつながる。次世代のリアルタイム交流ハブ。 |
| **Chinese** | **Nexus** <small>连结你我</small> | 跨越隔阂，即刻互联。为您打造最真实的实时社交中心。 |

---

## 4. Typography & Layout Guidelines

### Font Pairing Strategy
- **Latin**: Inter, Outfit, or Montserrat (High-impact geometric sans).
- **Japanese**: Noto Sans JP or Hiragino Sans (Modern, high-legibility).
- **Chinese (SC)**: Noto Sans SC or Microsoft YaHei (Clean, professional).

### Spacing Adjustments
- **Line Height**: Increase `leading` for CJK. If English uses `leading-tight`, CJK should use `leading-relaxed`.
- **Character Spacing**: Reset `tracking` to `normal` or `wide` for CJK sections.

---

## 5. Implementation Plan (Conceptual)

1. **Step 1: Structural Separation**
   - Split the `appTitle` into two parts in `translations.ts`: `brandName` (usually "Nexus") and `localizedTitleSuffix`.
   
2. **Step 2: Typography Refinement**
   - Define language-specific CSS classes or Tailwind conditions to adjust font sizes and line heights globally.
   
3. **Step 3: Content Migration**
   - Replace the literal "Nexus Connect" translations with the "Brand + Subtitle" pattern.
   - Update the description to use the more natural, localized phrasing proposed above.

4. **Step 4: Layout Polish**
   - Adjust the `max-w` constraints to ensure optimal line lengths (approx. 15-20 characters for CJK, 45-60 for English).
