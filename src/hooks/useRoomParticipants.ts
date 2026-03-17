import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where, Timestamp, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface Participant {
  id: string;
  username: string;
  photo?: string;
  mood?: string;
  status: 'onboarding' | 'ready';
  expiresAt?: Timestamp;
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
    // Lazy expiration: only show participants where room hasn't expired
    // Note: We'd typically filter the Room itself, but filtering participants 
    // here ensures the Hall view stays clean during the demo.
    const q = query(
      participantsRef, 
      where('expiresAt', '>', Timestamp.now())
    );

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
        const data = docSnap.data();
        const now = Timestamp.now();
        
        if (data.expiresAt && data.expiresAt.toMillis() < now.toMillis()) {
          setStatus('closed'); // Treat expired as closed
        } else {
          setStatus(data.status);
        }
      }
    }, (err) => {
      console.error("Error fetching room state:", err);
    });

    return () => unsubscribe();
  }, [roomId]);

  return { status };
}
