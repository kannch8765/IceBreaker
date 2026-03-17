# Ice-Breaker!

A real-time networking platform designed to lower social barriers at community events using AI-powered insights and live data visualization.

## Overview
Ice-Breaker! facilitates meaningful connections by pairing event participants based on their profiles and generating personalized conversation starters. It features a dual-view system:
- **Event Hall View (Desktop):** A high-performance dashboard that displays a live network graph of all connected participants using D3.js.
- **User View (Mobile):** A sleek onboarding interface where participants share their interests, mood, and identity to join the local network.

The project leverages a serverless architecture with real-time data synchronization to ensure a seamless "scan-and-join" experience for large crowds.

## Tech Stack
- **Frontend:** React / Next.js (App Router)
- **Real-time Database:** Firebase Firestore
- **Live Visualization:** D3.js
- **Animations:** Framer Motion
- **Styling:** Tailwind CSS
- **AI Integration:** Vertex AI (Gemini) & Nano-Banana (Personalized Avatars)

## Project Structure
```text
IceBreaker/
├── src/
│   ├── app/            # Next.js App Router (Routes: /, /hall)
│   ├── components/     # UI Components grouped by view
│   │   ├── hall/       # D3.js visualization & Hall lobby components
│   │   ├── mobile/     # Onboarding form steps & mobile UI
│   │   ├── ui/         # Reusable primitive components (Buttons, etc.)
│   │   └── motion/     # Framer Motion animation wrappers
│   ├── context/        # React Context for State (Onboarding, Language, Theme)
│   ├── hooks/          # Firestore listeners & room logic hooks
│   └── lib/            # Firebase init & room lifecycle utilities
├── docs/               # Technical specs and deployment guides
├── firestore.rules     # Security rules for participant & room data
├── firebase.json       # Hosting and Firestore configuration
└── tailwind.config.ts  # Design system tokens (Lilac & Green/Black themes)
```

## Setup Instructions

### Prerequisites
- Node.js (v20+)
- Firebase CLI (`npm install -g firebase-tools`)
- A Firebase Project with Firestore enabled.

### Installation
1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```

### Environment Variables
Create a `.env.local` file in the root directory and add your Firebase credentials:
```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### Firebase Setup
1. **Firestore Rules:** Deploy the rules using `firebase deploy --only firestore:rules`.
2. **TTL Policy:** (Critical) Enable TTL in the Firebase Console for the `expiresAt` field in Both `rooms` and `participants` collections to automate cleanup.

## Running the Project
- **Local Development:**
  ```bash
  npm run dev
  ```
- **Build & Preview:**
  ```bash
  npm run build
  npm run start
  ```

## Firestore Data Model

### `rooms` (Collection)
Tracks the global state of networking sessions.
- `status`: ("waiting" | "active" | "closed")
- `createdAt`: Timestamp
- `expiresAt`: TTL Timestamp (2 hours after creation)
- `settings`: Configuration object for the room.

### `rooms/{roomId}/participants` (Sub-collection)
Individual participant profiles within a specific room.
- `username`: String
- `mood`: String
- `status`: ("waiting_for_ai" | "ready" | "error") - Frontend waits for backend update.
- `aiTopics`: Array of 3 strings (Generated conversation prompts).
- `avatarUrl`: String (URL to personalized animal avatar).
- `expiresAt`: TTL Timestamp.

### `global_stats` (Collection)
- `system`: Document tracking `activeRooms` to enforce system capacity (max 20).

## AI Orchestration Logic
While the frontend handles onboarding, it follows a reactive pattern:
1. **Trigger:** Mobile user submits data -> `status` set to `waiting_for_ai`.
2. **Process:** An external background worker (Cloud Run) listens to Firestore, calls Gemini/Vertex AI, and updates the document.
3. **Response:** Frontend listens via `onSnapshot` and transitions to `ready` when `aiTopics` are populated.

## Key Design Decisions
- **Real-time Sync:** Uses Firestore listeners instead of REST polling to minimize latency for the live hall graph.
- **Dual-Theme System:** Implements "Lilac Fusion" for mobile clients and "Green/Black Fusion" for the hall display via a unified `ThemeContext`.
- **Transient Data:** All sessions are treated as ephemeral, enforced by Firestore TTL and custom cleanup hooks.