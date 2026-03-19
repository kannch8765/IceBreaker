# Routing and Directory Structure Audit: Ice-Breaker!

## 1. Directory Structure Audit

The project uses Next.js App Router with all source code under `src/`. However, it suffers from a "query-parameter dispatch" pattern that undermines the benefits of file-based routing.

### Key Findings:
- **`src/app/page.tsx` (God Page)**: This single file acts as a router-within-a-route. It dispatches to `HallLanding`, `LobbyClient`, or `StepManager` based on `room` and `mode` query parameters.
- **Redundancy**: 
    - `/` (Root) dispatches to `HallLanding`.
    - `/hall` also dispatches to `HallLanding`.
    - `/hall/[roomId]` dispatches to `LobbyClient`.
    - `/hall/lobby?room=...` also dispatches to `LobbyClient`.
- **Naming Conflicts**: `/hall/lobby` is a static path that shadows the dynamic segment `/hall/[roomId]`.
- **Lack of Layout Separation**: The `RootLayout` in `src/app/layout.tsx` attempts to serve both the Dark/Hall theme and the Light/Mobile theme, leading to complex conditional logic or CSS overrides.

## 2. Route Mapping Table

| URL Path | File | Component | Logic / Condition | Conflict/Issue |
| :--- | :--- | :--- | :--- | :--- |
| `/` | `src/app/page.tsx` | `HallLanding` | Default (no params) | Redundant with `/hall` |
| `/?room=X` | `src/app/page.tsx` | `StepManager` | Mobile Onboarding | Should be its own route |
| `/?room=X&mode=hall`| `src/app/page.tsx` | `LobbyClient` | Host Lobby | Multiple entry points |
| `/hall` | `src/app/hall/page.tsx` | `HallLanding` | Always | Redundant with `/` |
| `/hall/lobby` | `src/app/hall/lobby/page.tsx` | `LobbyClient` | Checks `?room=X` | Shadowing dynamic route |
| `/hall/[roomId]` | `src/app/hall/[roomId]/page.tsx`| `LobbyClient` | Dynamic segment | Best practice, but duplicated |

## 3. Key Problems & Risks

- **Scalability**: Adding new "modes" or "steps" increasingly clutters the root `page.tsx`.
- **SEO/Metadata**: Since multiple logical pages share one physical file (`/`), setting unique metadata (titles, descriptions) for the Mobile Onboarding vs. the Hall view becomes difficult and requires client-side hacking.
- **Bundle Size**: Users visiting the mobile onboarding flow may be loading code/assets intended for the Hall view because they are coupled in the same route.
- **Maintenance**: Developers must hunt through query parameter logic to find where a specific view is rendered, rather than following the folder structure.
- **Theme Leaks**: The dual-theme requirement (Lilac for Mobile, Green/Black for Hall) is hard to manage cleanly when both views share the same top-level layout without logical grouping.

## 4. Problem Diagnosis

- **Problem**: The current structure treats Next.js as a single-page app (SPA) with a manual router inside `page.tsx`.
- **Why it matters**: It breaks the "mental model" of Next.js, making the project harder for new developers to navigate and preventing the use of advanced features like Parallel Routes or Intercepting Routes.
- **Fix**: Decentralize the dispatch logic into dedicated, semantic routes using Route Groups `(hall)` and `(mobile)`.
