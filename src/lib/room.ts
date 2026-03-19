import { db } from "./firebase";
import { 
  doc, 
  runTransaction, 
  Timestamp, 
  updateDoc, 
  collection, 
  query, 
  where, 
  getDocs, 
  getDoc 
} from "firebase/firestore";

export function generateRoomId(): string {
  // Avoid unambiguous characters: 0, O, I, 1
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; 
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Creates a new room with a self-healing counter check.
 * If the activeRooms counter is near the threshold, it recalibrates by 
 * querying the actual number of non-expired, non-closed rooms.
 */
export async function createRoom(): Promise<string> {
  // Rate limiting: 1 room per 2 minutes per device
  if (typeof window !== 'undefined') {
    const lastCreated = localStorage.getItem('lastRoomCreated');
    const now = Date.now();
    if (lastCreated && now - parseInt(lastCreated) < 2 * 60 * 1000) {
      throw new Error("Please wait a bit before creating another room.");
    }
  }

  const roomId = generateRoomId();
  const roomRef = doc(db, "rooms", roomId);
  const statsRef = doc(db, "global_stats", "system");

  try {
    // 1. Initial check (Outside transaction for performance)
    const statsSnap = await getDoc(statsRef);
    const currentActive = statsSnap.exists() ? statsSnap.data().activeRooms || 0 : 0;

    // 2. Self-Healing Recalibration (Trigger if near limit)
    // We use 18 as a trigger threshold to catch ghost rooms before we hit the hard cap of 20.
    if (currentActive >= 18) {
      const q = query(collection(db, "rooms"), where("status", "!=", "closed"));
      const snapshot = await getDocs(q);
      const nowTs = Timestamp.now().toMillis();
      
      let actualCount = 0;
      snapshot.forEach((snap) => {
        const data = snap.data();
        if (data.expiresAt && data.expiresAt.toMillis() > nowTs) {
          actualCount++;
        }
      });

      // Update the counter to reflect the true number of active sessions
      await updateDoc(statsRef, { activeRooms: actualCount });
    }

    // 3. Atomic Session Creation
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
    
    if (typeof window !== 'undefined') {
      localStorage.setItem('lastRoomCreated', Date.now().toString());
    }
    
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
