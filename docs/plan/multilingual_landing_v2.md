# Concrete Implementation Plan: Multilingual Landing Upgrade

This plan provides the exact code and content changes required to resolve the CJK layout and typography issues.

## 1. FULL JSX CODE (HallLanding.tsx - Hero Section)

Replace the existing `h1` and `p` tags (lines 61-66) with this structure:

```tsx
<h1 
  className={`font-black mb-4 tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-purple-600 dark:from-white via-indigo-500 dark:via-green-400 to-purple-400 dark:to-[#00FF41] 
  ${language === 'en' ? 'text-6xl md:text-8xl' : 'text-7xl md:text-9xl'}`}
>
  {t('appTitle')}
</h1>

<p 
  className={`font-bold mb-8 text-gray-800 dark:text-gray-100 
  ${language === 'en' ? 'text-2xl md:text-3xl' : 'text-3xl md:text-4xl tracking-widest'}`}
>
  {t('tagline')}
</p>

```

---

## 2. TRANSLATION JSON (translations.ts)

Update the translation objects in `src/lib/translations.ts` with these exact values:

### EN
```json
{
  "appTitle": "Nexus Connect",
  "tagline": "Break the ice. Connect instantly.",
}
```

### JP
```json
{
  "appTitle": "Nexus",
  "tagline": "打ち解けて、つながる。",
}
```

### ZH
```json
{
  "appTitle": "Nexus",
  "tagline": "重新定义破冰。",
}
```

---

## 3. STEP-BY-STEP PLAN

### Step 1: Content Update
- **Target**: `src/lib/translations.ts`
- **Action**: Locate the `en`, `jp`, and `cn` objects.
- **Change**: Replace the `appTitle`, `tagline` strings with the localized content provided above.
- **Reason**: This separates the technical "Nexus" brand from the localized action verbs, preventing awkward line breaks in CJK.

### Step 2: Hero Section Refactor
- **Target**: `src/components/hall/HallLanding.tsx`
- **Action**: Replace the single `h1` + `p` pair with the new three-tier hierarchy (`h1` -> `p[tagline]` -> `p[description]`).
- **Styles**: 
  - Add conditional Tailwind classes for `text-size` based on the `language` variable.
  - Apply `tracking-widest` to CJK taglines to improve premium aesthetic.
  - Reduce `mb-12` to `mb-8` for the tagline to tighten group spacing.

### Step 3: Cleanup
- **Remove**: The old `helloNexus` logic if they were redundant or overlapping.
- **Verify**: Run `npm run build` to ensure no regression in static production exports.

---

## Edge Case Handling
- **Language Switch**: Animations remain handled by `motion.div`. No change to logic required.
- **Small Screens**: Mobile font sizes are scaled down appropriately via `text-5xl` / `text-2xl` defaults.
