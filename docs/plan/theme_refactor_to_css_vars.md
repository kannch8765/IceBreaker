# Implementation Plan: Theme Refactor to CSS Variables

## Goal
Migrate the current theme styling from scattered Tailwind color utilities (e.g., `bg-purple-300`, `dark:bg-green-900`) to a centralized CSS variable-based system. This will unify the "Lilac Fusion" (Light) and "Black & Green Fusion" (Dark/Hall) themes under a single semantic design system.

## 1. Current State Summary
The codebase currently uses a mix of Tailwind global colors and explicit `dark:` modifiers. 

### Key Hardcoded Patterns:
- **Lilac Theme (Light)**: Relies on `purple-600`, `purple-500`, `indigo-500`, and `white`.
- **Matrix Theme (Dark)**: Relies on `black`, `gray-900`, and `#00FF41` (matrix-green).
- **Inconsistencies**: Some components use opacity variants (e.g., `bg-white/60`, `dark:bg-black/60`) which are difficult to manage globally.

## 2. Target Design System (Semantic Variables)

The following variables will be defined in `src/app/globals.css`:

| Variable | UI Role | Light (Lilac) Value | Dark (Matrix) Value |
| :--- | :--- | :--- | :--- |
| `--accent-primary` | Hero buttons, Titles | `紫 (purple-600)` | `緑 (#00FF41)` |
| `--accent-secondary` | Secondary buttons/icons | `藍 (indigo-500)` | `薄緑 (green-400)` |
| `--surface-primary` | Main page background | `淡紫 (#f3e8ff)` | `黒 (#000000)` |
| `--surface-secondary` | Cards, popovers, inputs | `白/60 (alpha)` | `灰/900 or 黒/50` |
| `--text-primary` | Headers, emphasize | `灰-900` | `白` |
| `--text-secondary` | Paragraphs, labels | `灰-700` | `灰-300` |
| `--text-inverse` | Text on accent colors | `白` | `黒` |
| `--border-subtle` | Dividers, subtle outlines | `灰-200` | `灰-800` |
| `--border-accent` | Hover/Active states | `紫/20` | `緑/20` |

## 3. File-Level Migration Plan

### Global Level
- **[MODIFY] [globals.css](file:///d:/Github_Repos/IceBreaker/src/app/globals.css)**: 
    - Populate `:root` and `.dark` blocks with the new semantic variables.
- **[MODIFY] [tailwind.config.ts](file:///d:/Github_Repos/IceBreaker/tailwind.config.ts)**:
    - Map `colors` to use `var(--variable-name)`.
    - Example: `accent: { primary: 'var(--accent-primary)', secondary: 'var(--accent-secondary)' }`.

### Component Level (High Priority)
- **[MODIFY] [Button.tsx](file:///d:/Github_Repos/IceBreaker/src/components/ui/Button.tsx)**: Replace `from-purple-500 to-indigo-500` with semantic gradient variables.
- **[MODIFY] [HallLanding.tsx](file:///d:/Github_Repos/IceBreaker/src/components/hall/HallLanding.tsx)**: Replace multi-color gradients and hardcoded `purple/green` shadow colors.
- **[MODIFY] [StepManager.tsx](file:///d:/Github_Repos/IceBreaker/src/components/mobile/StepManager.tsx)**: Replace hardcoded blob background colors.
- **[MODIFY] [LobbyClient.tsx](file:///d:/Github_Repos/IceBreaker/src/components/hall/LobbyClient.tsx)**: Replace connection box borders and scanline effects.

## 4. Step-by-Step Migration Strategy

### Step 1: Definition (The Infrastructure)
- Add CSS variables to `src/app/globals.css`.
- Update `tailwind.config.ts` to include these variables in the `extend.colors` section.
- **Verification**: Ensure no existing styles break (variables are added but not yet used).

### Step 2: Semantic Mapping (The Transition)
- Replace global background/foreground usage in `src/app/layout.tsx`.
- Refactor the base `Button` component to use semantic tokens.
- **Verification**: Switch theme and check if the primary button colors transition correctly.

### Step 3: Progressive Component Refactor
- Tackle `src/components/hall` then `src/components/mobile`.
- Remove manual `dark:` classes where the CSS variable already handles the switch.
- **Verification**: Compare "before" and "after" screenshots for each component.

### Step 4: Cleanup
- Search for remaining `purple-`, `indigo-`, and `green-` classes.
- Replace remaining instances or justify their existence as "one-off" styles.

## 5. Risks ⚠️
- **Opacity Handling**: Some Tailwind classes use `opacity` (e.g., `bg-white/50`). When using CSS variables, Tailwind requires the variable to be in `rgb` or `hsl` format WITHOUT the `var()` wrapper to support the `/opacity` syntax, or the variable itself must include the opacity. 
    - *Mitigation*: Define variables as `r, g, b` values (e.g., `--accent-rgb: 0, 255, 65`) and use `bg-[rgba(var(--accent-rgb), 0.5)]`.
- **Shadows & Gradients**: Hardcoded hex values in `shadow-[]` or `from-[]` might not resolve correctly with variables.
    - *Mitigation*: Define standardized shadow and gradient utility classes in `globals.css`.

## 6. Validation Checklist
- [ ] Theme toggle (Sun/Moon) works on all pages.
- [ ] Hall View (Desktop) maintains "Matrix Green" aesthetic.
- [ ] Mobile View (User) maintains "Lilac" aesthetic.
- [ ] Hover states on buttons remain visually distinct.
- [ ] Accessibility: Check contrast ratios for primary and secondary text in both themes.
