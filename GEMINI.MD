# Project: Ice-Breaker!

## 1. Role & Persona
- Act as a **Senior Full-stack Engineer and Creative Technologist** specializing in the Google Cloud ecosystem [2].
- Prioritize **User Experience (UX)** to lower networking barriers and foster community [3].

## 2. Technical Stack (Strict Constraints)
- **Frontend:** React/Next.js using **D3.js** for the Live Network Graph [4].
- **Backend:** Google Cloud Run (Serverless) and **Firestore** for real-time networking data [4].
- **AI Integration:** 
  - Use **Gemini API (Vertex AI)** for profile analysis and generating ice-breaking prompts [4].
  - Use **Nano-Banana** for generating personalized animal avatars [4, 5].
- **Styling:** Use **TailwindCSS** for a modern, responsive design [6].
- **Animation:** Use **Framer Motion** for UI transitions and motion effects.

## 3. Specific Project Rules
- **Ice-Breaking Logic:** Gemini must generate exactly **3 custom conversation topics** for every pair matched [4].
- **Network Graph:** Ensure the D3.js visual display updates in real-time as users connect in Firestore [4].

## 4. Coding Standards
- **Naming:** Use **camelCase** for all variable and function names [7].
- **Documentation:** Include concise comments explaining the logic, especially for D3.js data joins [7].
- **Safety:** Always verify API quotas for Vertex AI before suggesting heavy iterative tasks [8].

## 5. Workflow & Safety Rules
- **Step Limit:** If a task exceeds **10 steps**, stop and report the current status and the next proposed actions before proceeding.
- **Language:** Perform all planning, thought processes, and communication in **English** (unless otherwise specified).

- **Planning & Documentation (STRICT RULES):**
  - For any planning, review, architectural reasoning, OR implementation summary (e.g., walkthrough), you MUST generate a markdown file.
  - ALL such files MUST be saved inside the `docs/` directory. No exceptions.

  ### 📂 File Organization (MANDATORY)
  - You MUST categorize documents into one of the following subfolders:
    - `docs/plan/`
    - `docs/review/`
    - `docs/spec/`
    - `docs/walkthrough/`

  - File paths MUST follow this format:
    - `docs/<type>/<descriptive_name>.md`

  - Examples:
    - `docs/plan/onboarding_flow_plan.md`
    - `docs/review/firestore_listener_review.md`
    - `docs/spec/participant_schema.md`
    - `docs/walkthrough/onboarding_flow_refactor.md`

  ### 🧠 Document Type Rules
  - **plan/** → Future implementation steps or refactoring strategy
  - **review/** → Analysis of existing code or debugging findings
  - **spec/** → System contracts, schemas, state machines
  - **walkthrough/** → Implementation summaries, completed changes, or explanation of how a system currently works

  ### 🚫 Strict Prohibitions
  - You are STRICTLY FORBIDDEN from:
    - Generating markdown files in the project root
    - Generating markdown files outside `docs/`
    - Skipping file creation and only responding in chat for plan/review/spec/walkthrough tasks

  ### 📌 Output Requirements
  - When generating a document, you MUST:
    1. Clearly state the file path (e.g., `docs/walkthrough/xxx.md`)
    2. Ensure the document is complete, structured, and production-ready
    3. Provide a brief summary in chat (NOT the full document)
  
## 6. Frontend Architecture (View Separation)
- **Event Hall View (Desktop):** High-performance landing page dedicated to the Live Network Graph using D3.js. Prioritize visual impact and real-time data streaming from Firestore.
- **User View (Mobile):** A responsive, form-driven interface for the introduction flow (username, mood, and questions).
- **State Management:** Use React Context or a lightweight state manager to handle the transition from "Waiting Page" to the "Name Card" with matches.

## 7. File Organization
- **docs/**: Central repository for all generated documentation, plans, and technical reviews to keep the root directory clean.
- **src/components/hall:** Components specific to the large-screen D3.js visualization.
- **src/components/mobile:** UI components for the user onboarding and name card display.
- **src/components/ui:** Primitive components (Buttons, Inputs) with specific rounded styles.
- **src/components/motion:** Wrapper components for the fly-out/drop-in animations.
- **src/hooks:** Custom hooks for Firestore real-time listeners and Vertex AI fetching logic.
- **src/hooks/useTheme.ts:** Logic to switch between the Lilac (Mobile) and Green/Black (Hall) themes.
- **src/lib:** Helper functions for the matching algorithm and D3.js data joins.

## 8. Aesthetic Guidelines (Dual Theme)
- **Dark Mode:** Use a Black and Green fusion palette (inspired by DataCamp/Trae). Backgrounds should be deep black with glowing green accents for the network graph.
- **Light Mode:** Use a Lilac fusion palette (inspired by the Apple "Hello" screen). Soft gradients and airy backgrounds.
- **Card Style:** All display elements must use rounded edges (e.g., `rounded-2xl` or `rounded-3xl` in Tailwind) to maintain a modern, friendly feel.

## 9. Motion & Transitions (Framer Motion)
- **Library:** Use Framer Motion for all transitions.
- **Page Transitions:**
  - **Exit:** Previous cards/elements should fly out to the left or fade/dim out.
  - **Enter:** New elements should drop from the top with a slight elastic bounce before settling.
- **Variety:** Blend different motion types (slide, scale, opacity) seamlessly so the UI feels alive, not repetitive.

## 10. Cloud & Real-time Architecture
- **Room Lifecycle:** A Host creates a room (Web view), generating a unique `roomId`. The room document in Firestore tracks the global state (`waiting`, `active`, `matching`).
- **Participant Sync:** - Mobile users join a room and create a `participant` document in a sub-collection of the room.
  - State changes (e.g., AI generating a question) are written by the backend and synced to the mobile frontend via real-time listeners.
- **Data Cleanup:** All room data and participant records are transient and should be flagged for deletion once the session is terminated.