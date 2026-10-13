Title:
- IceBreaker: AI-Driven Serverless Matchmaking Engine

Main Sections:

1. Architecture Overview
- Asynchronous "Dual-Core" design decoupled via Firestore
- Serverless event-loop orchestrator feeding a stateless AI calculation node

2. Core Technologies
- Python, FastAPI, Firebase Admin SDK
- LLM: Gemini 2.5 Flash / Vertex AI (Multi-modal)
- Data Layer: Real-time Firestore NoSQL

3. Data Flow
- Client updates state (`waiting_for_ai`) in Firestore
- Python Poll Worker detects state change and fetches image/context
- FastAPI Engine processes AI multi-modal inference & personality extraction
- Worker calculates vector affinities and commits match data back to Firestore

4. Key Modules / Services
- `firestore_worker.py`: Polling orchestrator handling strict concurrency, I/O, and match math
- `main.py` (FastAPI): Pure AI compute layer for profiling, multi-lingual prompting, and tag similarity scoring

5. Notable Design Decisions
- "Nexus Matrix": 5-axis numerical vector representing subconscious traits for lightweight affinity computation (0-100 score)
- Simultaneous trilingual UI response generation (EN/JP/CN) in a single LLM pass
- Multi-modal visual profiling extracting deep conversational hooks from selfies
