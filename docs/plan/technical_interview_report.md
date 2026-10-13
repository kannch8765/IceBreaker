# Technical Interview Preparation Report

## Purpose
This document summarizes the codebase, architecture, and high-impact areas to study for a technical interview focused on this repository.

## Quick Summary
- Tech stack: Next.js (frontend), React 19, Firebase (Firestore/Storage), TailwindCSS, Framer Motion, D3.js; Python FastAPI service for AI/forge logic in `main.py`.
- Real-time synchronization via Firestore listeners; AI integration through Vertex AI / Gemini in `main.py`.

## Architecture Overview
- Frontend: Next.js app under `src/` with mobile onboarding flow (`src/components/mobile`) and host hall (`src/components/hall`).
- Real-time: Firestore collections `rooms/{roomId}/participants` with listeners implemented in `src/hooks`.
- Backend AI: `main.py` (FastAPI) provides endpoints `/api/analyze_vibe`, `/api/generate_questions`, `/api/forge_profile` that call Gemini/Vertex AI.
- Helpers: `src/lib` contains Firebase wiring and room creation logic.

## Key Files (read first)
- App entry & AI engine: [main.py](main.py)
- Frontend config: [package.json](package.json), [next.config.ts](next.config.ts), [tailwind.config.ts](tailwind.config.ts)
- Firebase init: [src/lib/firebase.ts](src/lib/firebase.ts)
- Room lifecycle & APIs: [src/lib/room.ts](src/lib/room.ts)
- Firestore security rules: [firestore.rules](firestore.rules)
- Realtime hooks: [src/hooks/useParticipant.ts](src/hooks/useParticipant.ts), [src/hooks/useRoomParticipants.ts](src/hooks/useRoomParticipants.ts)
- D3 / visualization: [src/components/hall/D3Background.tsx](src/components/hall/D3Background.tsx), [src/components/hall/NexusMapCanvas.tsx](src/components/hall/NexusMapCanvas.tsx)
- Mobile onboarding flow examples: [src/components/mobile/MoodStep.tsx](src/components/mobile/MoodStep.tsx), [src/components/mobile/QuestionsStep.tsx](src/components/mobile/QuestionsStep.tsx), [src/components/mobile/ResultStep.tsx](src/components/mobile/ResultStep.tsx)
- Utility & vector math: [src/lib/utils.ts](src/lib/utils.ts)

## Observations & Notes
- The AI backend uses two modes: API key (`google.generativeai`) or Vertex AI client (`vertexai.preview.generative_models`) depending on env vars — check `GEMINI_API_KEY` in env.
- Firestore rules are permissive in some places (e.g., participant updates allowed: `allow update: if true;`) — good to review for security interview questions.
- D3 visualization lives in React client components and uses imperative D3 patterns (`useEffect` with direct selection). Prepare to discuss data joins, cleanup, and performance (resize/timer teardown seen in D3Background).
- Real-time listeners are used extensively (`onSnapshot`) with sensible expiration filtering and optimistic UI state stored in context.

## High-Value Topics to Prepare (Interview Focus)
- System design: room lifecycle, scaling Firestore reads/writes, listener fan-out, session limits and counters (see `src/lib/room.ts`).
- Realtime consistency: how the app keeps participant state in sync, handling race conditions, retries, and partial failures.
- Security: Firestore rules, least-privilege, and potential attack vectors (malicious payloads, quota exhaustion).
- Frontend performance: D3 integration in React, animation performance (Framer Motion), bundle size (Next.js), and SSR/export concerns from `next.config.ts`.
- AI integration: prompt design, error handling, rate limits, and safe parsing of model outputs (JSON cleaning in `main.py`).
- Testing: unit testing hooks and components, mocking Firestore and AI endpoints, end-to-end flows for onboarding and hosting.

## Example Interview Questions
1. Explain how the room creation and capacity protection works. What are the failure modes? (see `src/lib/room.ts`)
2. How does the frontend synchronize participant state with Firestore? Describe the lifecycle from join → questions → forging profile.
3. How would you scale the real-time Hall with hundreds of concurrent rooms and thousands of participants?
4. Walk through how `generate_questions` ensures exactly 3 questions are returned and how the backend validates them.
5. Identify security weaknesses in the current `firestore.rules` and propose fixes.
6. How would you test the D3 network visualization to ensure it remains responsive on mobile devices?

## Code Reading Checklist (for pair-programming / whiteboard)
- Open [main.py](main.py): read prompt construction, `_generate_json`, and error handling.
- Trace participant lifecycle: `src/hooks/useParticipant.ts` → `rooms/{room}/participants` writes → backend Worker (or FastAPI) updates.
- Review `src/lib/room.ts` transactions and counters; consider edge cases when transactions fail.
- Inspect D3 code in `src/components/hall/NexusMapCanvas.tsx` for physics constants and trait mapping.

## Actionable Prep Tasks
1. Run the app locally (install deps, set NEXT_PUBLIC_FIREBASE_* envs, optionally set GEMINI_API_KEY). Document any missing env variables.
2. Add unit tests for `calculateSoulVector` (`src/lib/utils.ts`) and for `src/lib/room.ts` transaction behavior (mock Firestore).
3. Harden Firestore rules: restrict write/update to authenticated contexts or server keys where appropriate.
4. Create a small harness to call `main.py` endpoints with sample payloads to observe AI JSON outputs and parsing robustness.

## Next Steps
- Use this report to guide focused study sessions (system design, realtime, AI prompts, security). If helpful, I can open specific files and create a narrower walkthrough under `docs/walkthrough/`.

---
Generated from a repository scan on May 27, 2026.
