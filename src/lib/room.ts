import { db } from "./firebase";
import { doc, runTransaction, Timestamp, updateDoc } from "firebase/firestore";

export function generateRoomId(): string {
  // Avoid unambiguous characters: 0, O, I, 1
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; 
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function createRoom(): Promise<string> {
  const roomId = generateRoomId();
  const roomRef = doc(db, "rooms", roomId);
  const statsRef = doc(db, "global_stats", "system");

  try {
    await runTransaction(db, async (transaction) => {
      const statsDoc = await transaction.get(statsRef);
      if (!statsDoc.exists()) {
        // Initialize if not exists
        transaction.set(statsRef, { activeRooms: 1 });
      } else {
        const activeRooms = statsDoc.data().activeRooms || 0;
        if (activeRooms >= 20) {
          throw new Error("Room capacity reached. Please try again later.");
        }
        transaction.update(statsRef, { activeRooms: activeRooms + 1 });
      }

      const now = Timestamp.now();
      const expiresAt = Timestamp.fromMillis(now.toMillis() + 2 * 60 * 60 * 1000); // 2 hours

      transaction.set(roomRef, {
        status: "waiting",
        createdAt: now,
        expiresAt: expiresAt,
        settings: {}
      });
    });
    
    return roomId;
  } catch (error) {
    console.error("Failed to create room:", error);
    throw error;
  }
}

export async function closeRoom(roomId: string): Promise<void> {
  const roomRef = doc(db, "rooms", roomId);
  const statsRef = doc(db, "global_stats", "system");

  try {
    await runTransaction(db, async (transaction) => {
      // 1. PERFORM ALL READS FIRST
      const roomDoc = await transaction.get(roomRef);
      const statsDoc = await transaction.get(statsRef);

      if (!roomDoc.exists()) {
         return; // already gone or closed
      }

      // 2. PERFORM ALL WRITES
      // Update status to "closed" instead of deleting to avoid crashing active listeners
      transaction.update(roomRef, { 
        status: "closed",
        closedAt: Timestamp.now()
      });

      if (statsDoc.exists()) {
         const activeRooms = statsDoc.data().activeRooms || 1;
         transaction.update(statsRef, { activeRooms: Math.max(0, activeRooms - 1) });
      }
    });
  } catch (error) {
    console.error("Failed to close room:", error);
    throw error;
  }
}

export async function startRoomSession(roomId: string): Promise<void> {
  const roomRef = doc(db, "rooms", roomId);
  await updateDoc(roomRef, { status: "active" });
}
