# Architectural Audit: Ice-Breaker!

This document provides a deep-dive analysis of the Ice-Breaker project's architecture, data flows, and technical implementation.

## 1. Project Structure
The project follows a hybrid architecture, combining a Next.js frontend with Python-based backend services in a single repository.

### Top-Level Directories
- `src/`: Core frontend codebase (Next.js App Router).
  - `app/`: Routing and page components (`hall` for hosts, `room` for participants).
  - `components/`: UI components categorized by function (`hall`, `mobile`, `ui`, `motion`).
  - `context/`: Global state management (e.g., `OnboardingContext`).
  - `hooks/`: Custom hooks for Firestore real-time listeners and participant logic.
  - `lib/`: Utility functions, Firebase initialization, and shared logic.
- `docs/`: Centralized documentation (categorized into `plan`, `review`, `spec`, `walkthrough`).
- `node_modules/`: Frontend dependencies.
- `public/`: Static assets.

### Key Root Files
- `main.py`: FastAPI server handling Gemini AI requests.
- `firestore_worker.py`: Background worker that bridges Firestore state to the AI backend.
- `firebase.json` & `firestore.rules`: Firebase configuration and security rules.
- `package.json`: Frontend dependency manifest.

---

## 2. System Architecture
Ice-Breaker is built on a **State-Synchronized Serverless Architecture**.

### Core Components
- **Frontend (Next.js)**: A React-based SPA (Static Export) that interacts directly with Firestore.
- **Backend AI Engine (FastAPI)**: A stateless Python microservice that encapsulates Gemini/Vertex AI logic.
- **State Coordinator (Python Worker)**: A polling service that monitors Firestore for status changes and triggers AI processing.
- **Infrastructure (Firebase)**: Provides Hosting (Frontend), Firestore (Database & Real-time Sync), and potentially Cloud Run (Backend).

### Interaction Patterns
- **Real-Time Updates**: Firestore `onSnapshot` is the primary mechanism for UI updates (e.g., participants appearing in the Hall).
- **Decoupled Processing**: The frontend never calls the AI backend directly. Instead, it updates its status in Firestore, and the Worker reacts to this change.

---

## 3. Data Flow (CRITICAL)
Execution paths are managed through a centralized state machine in Firestore.

### Participant Lifecycle & AI Pipeline
1.  **Join Room**: User enters `roomId` -> `useParticipant` creates a doc in `rooms/{roomId}/participants/` with `status: 'generating_questions'`.
2.  **Question Generation**:
    - `firestore_worker.py` detects `generating_questions`.
    - Worker calls `main.py` `/api/generate_questions`.
    - Gemini generates 3 personalized questions.
    - Worker updates participant doc with `questions` and `status: 'answering'`.
3.  **User Interaction**: Participant answers questions -> Frontend updates doc with `qa` array and `status: 'waiting_for_ai'`.
4.  **Profile Forging**:
    - Worker detects `waiting_for_ai`.
    - Worker calls `main.py` `/api/forge_profile`.
    - Gemini generates ice-breaking topics and an "animal spirit".
    - Worker updates doc with `aiTopics`, `avatarUrl`, and `status: 'ready'`.
5.  **Hall Visualization**: `LobbyClient` listens to the `participants` collection. When status becomes `ready`, the participant is rendered in the D3 code-join graph.

---

## 4. Key Modules & Responsibilities

| Module | Responsibility |
| :--- | :--- |
| `main.py` | Interfaces with Gemini/Vertex AI. Provides JSON-structured prompt engineering. |
| `firestore_worker.py` | Orchestrates the background pipeline. Handles error state transitions. |
| `src/hooks/useParticipant.ts` | manages the participant's local state and Firestore synchronization. |
| `src/components/hall/LobbyClient.tsx` | Entry point for the real-time D3 visualization. |
| `src/context/OnboardingContext.tsx` | Centralizes participant data (username, mood, questions) across onboarding steps. |

---

## 5. Backend Logic Review
The backend is split into two Python processes:
- **API Node (`main.py`)**: A standard FastAPI app. It is "pure AI logic" and does not talk to Firestore directly. This makes it easy to test and swap models.
- **Observer Node (`firestore_worker.py`)**: A robust polling loop. It uses a "locking" mechanism by immediately updating status to `processing_questions` to prevent race conditions during polling.

---

## 6. Frontend Logic Review
- **Routing**: Uses a simplified query-parameter approach (`/hall?room=...` and `/room?room=...`) to ensure compatibility with static hosting and avoid complex dynamic path issues.
- **Views**:
  - **Event Hall**: High-performance D3 visualization.
  - **User View**: A linear onboarding flow (Step 1: Info -> Step 2: AI Questions -> Step 3: Name Card).
- **Theme**: A centralized `useTheme` hook manages the "Lilac" (Mobile) vs "Black/Green" (Hall) aesthetic.

---

## 7. Potential Issues / Risks
- **Worker Polling Latency**: The 2-second polling interval in `firestore_worker.py` introduces a slight perceptible delay.
- **Scalability of Polling**: As the number of active rooms grows, the worker's `rooms.stream()` will become a bottleneck.
- **Error Handling**: Currently, AI failures write `status: 'error'`. The frontend needs robust "Retry" logic for participants if the worker fails.
- **Firestore Size**: Participant records are transient but can accumulate. Proper cleanup logic is documented in `docs/review/firestore_cleanup_audit.md`.

---

## 8. Suggestions for Improvement
- **Transition to Cloud Functions**: Replace `firestore_worker.py` with Node.js or Python Cloud Functions using `onDocumentUpdated` triggers. This eliminates polling and improves latency to sub-second.
- **API Aggregation**: The frontend could potentially invoke a "Submit Answers" endpoint instead of writing to Firestore and waiting. However, the current state-driven approach is very resilient to network drops.
- **D3 Optimization**: Ensure the D3 graph uses an alpha-decay strategy that stabilizes once all participants are loaded to prevent high CPU usage on the Hall machine.
- **Unified Schema**: Formalize the `Participant` interface across TypeScript and Python to reduce "magic string" bugs in field names (e.g., `aiTopics` vs `topics`).
