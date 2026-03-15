# Implementation Plan: Mobile Onboarding UI (Phase 1)

## 1. Goal
Build a high-fidelity, interactive mobile onboarding flow with the **"Lilac Fusion" aesthetic** and custom **Framer Motion transitions**. This phase uses **mock data** to ensure a **"Frontend First" approach** before connecting to Google Cloud.

## 2. Aesthetic & Motion Specs
- **Theme:** Light Mode / Lilac Fusion (Apple-inspired).
- **Components:** `rounded-3xl` cards with soft shadows.
- **Transitions:**
  - **Exit:** `x: -100, opacity: 0` (Fly out left).
  - **Enter:** `y: -50, type: "spring", bounce: 0.4` (Drop and bounce).

## 3. Step-by-Step Tasks

### Step 1: Project Initialization
- Install dependencies: `framer-motion`, `lucide-react`, and `clsx` for Tailwind merging.
- Setup a basic **Layout component** that handles the Lilac gradient background.

### Step 2: State Management (Mock)
Create a `useOnboardingStore` hook (or simple React state) to track:
- `step` (current screen index).
- `formData` (username, pronoun, mood, answers).

### Step 3: View 1 - Identity
- a placeholer icon
- Input field for **Username**.
- Select/Input for **Pronouns**.
- **"Next" button** with hover scaling.

### Step 4: View 2 - Mood & Vibe

- **Initial Choice Screen:**  
  Display two large selectable icons positioned left and right:
  - **Camera icon**
  - **Mood icon**

- **Hover Interaction:**  
  When hovering over the icons, show temporary helper text:
  - Camera → **"Take a Photo"**
  - Mood → **"What's your mood today?"**

- **Selection Animation:**  
  When one option is clicked:
  - The selected icon **shakes slightly**, then **expands**.
  - The interface transitions into the corresponding page.

- **Mood Page:**  
  - Display **6 mood emoji options**.
  - Each emoji is wrapped in a **small rounded card design** (`rounded-xl` or similar).
  - When hovering over an emoji, show the **text label describing the mood**.

- **Photo Page:**  
  - Trigger the **device camera**.
  - Show a simple camera capture interface for taking a photo.

### Step 5: View 3 - Random Questions
- Display **two randomized prompt cards** (e.g., "What's your secret talent?").
- Input fields for each.

### Step 6: View 4 - Waiting / Processing
- A **"Brand New Hello World" loading animation** using a pulsing lilac circle.
- Simulate a **2-second delay** to mimic AI processing.

### Step 7: View 5 - The Result Card (Mock)
A **"Name Card" component** displaying:
- A **placeholder animal icon** (for the future Nano-Banana integration).
- **User info**.
- **2 mock ice-breaking topics**.