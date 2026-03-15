import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface Participant {
  id: string;
  username: string;
  photo?: string;
  mood?: string;
  status: 'onboarding' | 'ready';
  [key: string]: any;
}

export function useRoomParticipants(roomId: string) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!roomId) {
      setParticipants([]);
      setLoading(false);
      return;
    }

    const participantsRef = collection(db, 'rooms', roomId, 'participants');
    const q = query(participantsRef);

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const participantData: Participant[] = [];
        snapshot.forEach((doc) => {
          participantData.push({ id: doc.id, ...doc.data() } as Participant);
        });
        setParticipants(participantData);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error("Error fetching participants:", err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [roomId]);

  return { participants, loading, error };
}

export function useRoomState(roomId: string) {
  const [status, setStatus] = useState<string>('waiting');
  
  useEffect(() => {
    if (!roomId) return;
    
    const roomRef = doc(db, 'rooms', roomId);
    const unsubscribe = onSnapshot(roomRef, (docSnap) => {
      if (docSnap.exists()) {
        setStatus(docSnap.data().status);
      }
    }, (err) => {
      console.error("Error fetching room state:", err);
    });

    return () => unsubscribe();
  }, [roomId]);

  return { status };
}
