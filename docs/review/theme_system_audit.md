# Theme System Audit: Architectural Review

## 1. Architecture Overview
The theme management system is built using the **React Context API** and **Tailwind CSS**. It follows a "Single Source of Truth" pattern where the theme state is managed centrally and propagated via CSS classes and global variables.

- **Pattern**: Context API + Custom Hook + Utility-first CSS.
- **Entry Point**: `src/context/ThemeContext.tsx` provides the `ThemeProvider`.
- **Propagation**: The `dark` class is applied to the `<html>` element (`document.documentElement`), which triggers Tailwind's `dark:` variant and CSS variable overrides.
- **Persistence**: `localStorage` is used to persist user preference across sessions.

---

## 2. Key Implementation Files

| File | Responsibility |
| :--- | :--- |
| [`src/context/ThemeContext.tsx`](file:///d:/Github_Repos/IceBreaker/src/context/ThemeContext.tsx) | **Source of Truth**. Manages `theme` state, persistence to `localStorage`, and manual class manipulation of the root element. |
| [`src/hooks/useTheme.ts`](file:///d:/Github_Repos/IceBreaker/src/hooks/useTheme.ts) | **Consumer Hook**. Provides a type-safe wrapper for accessing the `ThemeContext`. |
| [`src/app/globals.css`](file:///d:/Github_Repos/IceBreaker/src/app/globals.css) | **Style Definitions**. Defines the `Lilac fusion` (Light) and `Green/Black fusion` (Dark) palettes using CSS variables. |
| [`tailwind.config.ts`](file:///d:/Github_Repos/IceBreaker/tailwind.config.ts) | **Tooling Config**. Configures Tailwind to use the `class` strategy for dark mode and maps CSS variables to utility classes. |
| [`src/components/ui/ThemeToggle.tsx`](file:///d:/Github_Repos/IceBreaker/src/components/ui/ThemeToggle.tsx) | **UI Controller**. Provides the manual toggle button used in the layout. |

---

## 3. Theme Application & Propagation
The system uses a hybrid approach to styling:
1.  **CSS Variables**: `--background` and `--foreground` are defined in `globals.css` and mapped to `bg-background` and `text-foreground` in Tailwind.
2.  **Tailwind `dark:` Modifier**: Used for specific component-level overrides (e.g., `dark:bg-matrix-green/20`).
3.  **Conditional Logic**: In components like `HallLanding.tsx`, the `theme` variable from `useTheme()` is used to conditionally apply Framer Motion gradients and effects.

### View-Specific Layouts:
- **Root Layout**: Wraps the entire application in `ThemeProvider` and applies default background styles to the `<body>`.
- **Hall View**: Uses `dark:` classes extensively to achieve the "Matrix" aesthetic.
- **User View**: Uses `rounded-2xl` and soft lilac backgrounds in the onboarding flow.

---

## 4. Potential Conflicts & Risks ⚠️

### 1. Inconsistent Initialization (FOUC)
The `ThemeContext` initializes theme in a `useEffect`. This means the server-rendered HTML will likely use the default theme ("dark" in state) or the browser's default before the `useEffect` runs, leading to a **Flash of Unstyled Content (FOUC)** on the first load if the user's preference is "light".

### 2. Manual Toggle vs. Design Rules
`GEMINI.md` mandates specific palettes for specific views:
- Hall (Desktop) = Green/Black
- User (Mobile) = Lilac
Currently, the `ThemeToggle` is available in `HallLanding.tsx`. If a user toggles to "light" mode on the Hall View, it breaks the "creative technologist" aesthetic intended for the large-screen display.

### 3. Global Syncing Issues
Because the theme is stored in `localStorage` and managed globally, a user's choice on one page affects all other pages in the same browser. If the intention is for `/hall` to be **always dark** and `/room` to be **always light** (or default to it), the current system lacks route-aware theme enforcement.

---

## 5. Recommendations

### 1. Route-Based Theme Enforcement
Implement logic in `HallPage` and `RoomPage` (or their respective layouts) to automatically set the appropriate theme on mount if it's not already aligned with the design specification.

### 2. Use `next-themes` or Blocking Script
To prevent FOUC, consider adopting `next-themes` or implementing a blocking `<script>` in `src/app/layout.tsx` that checks `localStorage` and applies the class before the React hydration completes.

### 3. Unify CSS Variable Usage
Convert more hardcoded Tailwind colors (like `bg-purple-300`) into semantic CSS variables (e.g., `--accent-primary`) that switch between lilac and green automatically. This reduces the need for scattered `dark:` classes.

### 4. Semantic Theme Logic
Rename "light" and "dark" in the codebase to "lilac" and "matrix" to better align with the project's creative vision and avoid confusion with generic light/dark modes.
