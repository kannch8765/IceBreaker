# Implementation Plan: Web Host & Room Lifecycle (Phase 2 - Module 1)

## 1. Goal
Establish the **"Event Hall" view (Desktop)** that creates a unique session in Firestore, generates a joinable QR code, and transitions into a real-time waiting lobby for participants.

## 2. Technical Specs
- **Room ID Logic:** 6-character alphanumeric code (e.g., `XP92LR`).
- **QR Library:** `qrcode.react`.
- **Database:** Firestore (Single Document for Room State + Sub-collection for Participants).
- **Aesthetic:** Black/Green Fusion (Deep `#000000` bg, Glowing `#00FF41` accents).

---

## 3. Step-by-Step Tasks

### Step 1: Firebase Infrastructure (`src/lib/firebase.ts`)
- Initialize the Firebase SDK using environment variables (`NEXT_PUBLIC_FIREBASE_...`).
- Export:
  - `db` (Firestore)
  - `auth` (Anonymous Authentication)
  - `storage` (for user photos)

**Data Schema Definition:**

```
rooms/{roomId}
{
  status: "waiting" | "active",
  createdAt: Timestamp,
  expiresAt: Timestamp,
  settings: {}
}

rooms/{roomId}/participants/{participantId}
{
  username,
  pronouns,
  language,
  photo,
  mood,
  questions: [],
  answers: [],
  avatarKey,
  status: "onboarding" | "ready",
  topics: [],
  matchedUsers: [],
}

global_stats/system
{
  activeRooms: number
}
```

---

### Step 2: The Hall Landing Page (`src/app/hall/page.tsx`)

**UI**
- A high-impact left-aligned title: **"Hello, Nexus"**
- Title uses an aesthetic flowing light and dark mode
- Same light/dark switcher as mobile version

**Action Buttons**
- **"Quick Setup" (Active):**
  - Instantly generates a Room ID.
  - Navigates to the lobby.
- **"Manual Setup" (Disabled Placeholder):**
  - A grayed-out button reserved for future custom prompts/timer settings.

**Animation**
- Use **Framer Motion** to create a **Matrix-style vertical scanline effect** on background load.

---

### Step 3: Room Creation Logic

Create a utility:

```
generateRoomId()
```

Requirements:
- 6 characters.
- Avoid ambiguous characters: `0`, `O`, `I`, `1`.

When **"Quick Setup"** is clicked:

1. Generate `roomId`.
2. Check **room capacity** before creation:
   - Read `global_stats/system.activeRooms`.
   - Ensure the value is **< 20**.
   - If capacity is reached, show an error message and prevent room creation.
3. Create document in Firestore:

```
rooms/{roomId}
```

Document fields:

```
{
  status: "waiting",
  createdAt: Timestamp.now(),
  expiresAt: Timestamp.now() + 2 hours,
  settings: {}
}
```

4. Increment `global_stats/system.activeRooms`.
5. Push router to:

```
/hall/[roomId]
```

---

### Step 4: The Hall Lobby View (`src/app/hall/[roomId]/page.tsx`)

#### Left Section (Connection Info)

- Large, high-contrast **QR Code** pointing to:

```
https://icebreaker.app/join?room=[roomId]
```

- Bold instruction text:

```
Join at icebreaker.app with code: [ROOM_ID]
```

#### Right Section (Real-time Tracker)

- Counter display:

```
0 People Connected
```

- **Waiting Area**
  - Participant names appear when they create their Identity document in Firestore.
  - Use a **"pop-in" scale animation** for each new name.

#### Background Visualization

Initialize a **placeholder D3.js canvas**.

For now it shows:
- Floating **green particles**
- Represent **potential connections**

#### Host Controls

Add a **Host Control Panel** containing:

- **Start Session Button**
  - Updates room document:

```
rooms/{roomId}.status = "active"
```

- **Close Room Button (Kill Switch)**
  - Immediately deletes the Firestore room document:

```
delete rooms/{roomId}
```

  - Also decrement:

```
global_stats/system.activeRooms
```

  - If sub-collections are used, all participant data will be removed together with the room.

---

### Step 5: Real-time Synchronizer Hook (`src/hooks/useRoomParticipants.ts`)

Create a custom hook that:

- Uses `onSnapshot` on:

```
rooms/{roomId}/participants
```

- Subscribes to the participant collection in real time.
- Returns a **participants array**.

Purpose:
- Allow the Lobby UI to **update instantly** when a mobile device scans the QR code and submits a username.

---

### Step 6: Room Governance & Cleanup

**Capacity Limit**
- The system should prevent creating more than **20 active rooms**.
- During room creation, read `global_stats/system.activeRooms` and verify it is **< 20**.

**Room Lifespan**
- Each room document must include:

```
expiresAt = Timestamp.now() + 2 hours
```

- This ensures every room has a predefined expiration time.

**Automatic Cleanup (Backend Task)**
- The backend team should create a **Firebase Cloud Function** that runs **every hour**.
- The function scans the `rooms` collection and deletes rooms where:

```
expiresAt < current time
```

- When deleting a room, also decrement:

```
global_stats/system.activeRooms
```

- This ensures stale sessions are removed and database storage remains controlled.

**Manual Kill Switch**
- The host interface must include a **"Close Room"** button.
- When triggered:
  - Delete the Firestore document:

```
rooms/{roomId}
```

  - Remove associated participant data.
  - Update `global_stats/system.activeRooms`.

---

## 4. State Transition Flow

| Interaction | Action | Effect |
|---|---|---|
| Click **"Quick Setup"** | Generate ID + Firestore Write | Navigates to `/hall/ABCDEF` |
| **QR Scan (Mobile)** | URL Param Detection | Mobile app auto-fills Room ID |
| Mobile **"Enter Name"** | Firestore Participant Write | Name appears on Hall Screen Lobby |
| Host Click **"Start"** | Update Room Status to `active` | Mobile screens automatically transition to **"Mood Step"** |
| Host Click **"Close Room"** | Delete Firestore Room | All participant data removed and session terminated |