"use client";

import { useEffect, useState, useCallback } from 'react';
import { doc, onSnapshot, setDoc, serverTimestamp, collection, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useOnboardingStore } from '../context/OnboardingContext';

export function useParticipant() {
  const { 
    roomId, 
    participantId, 
    setParticipantId, 
    setAiTopics, 
    setAvatarUrl,
    formData 
  } = useOnboardingStore();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [isTakingLong, setIsTakingLong] = useState(false);

  const createParticipant = useCallback(async () => {
    if (!roomId) {
      setError("No room ID found in URL");
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const participantsRef = collection(db, 'rooms', roomId, 'participants');
      const { getDocs, query, limit } = await import('firebase/firestore');
      const snapshot = await getDocs(query(participantsRef, limit(51)));
      if (snapshot.size >= 50) {
        throw new Error("This room is at full capacity (max 50).");
      }

      const newParticipantRef = doc(participantsRef);
      const newId = newParticipantRef.id;

      const now = Timestamp.now();
      const expiresAt = Timestamp.fromMillis(now.toMillis() + 2 * 60 * 60 * 1000); // 2 hours

      await setDoc(newParticipantRef, {
        username: formData.username,
        pronoun: formData.pronoun,
        mood: formData.mood,
        answers: formData.answers,
        status: 'waiting_for_ai',
        createdAt: serverTimestamp(),
        expiresAt: expiresAt,
      });

      setParticipantId(newId);
      setLoading(false);
      return newId;
    } catch (err: any) {
      console.error("Error creating participant:", err);
      setError(err.message || "Failed to join room");
      setLoading(false);
      return null;
    }
  }, [roomId, formData, setParticipantId]);

  useEffect(() => {
    if (!roomId || !participantId) return;

    const participantRef = doc(db, 'rooms', roomId, 'participants', participantId);
    
    // Soft hint timer (does not set error, just a UI flag)
    const hintTimeoutId = setTimeout(() => {
      setIsTakingLong(true);
    }, 45000);

    const unsubscribe = onSnapshot(participantRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setStatus(data.status);
        
        if (data.status === 'ready') {
          clearTimeout(hintTimeoutId);
          setIsTakingLong(false);
          if (data.aiTopics) setAiTopics(data.aiTopics);
          if (data.avatarUrl) setAvatarUrl(data.avatarUrl);
        }
        
        if (data.status === 'error') {
          clearTimeout(hintTimeoutId);
          setIsTakingLong(false);
          setError(data.errorMessage || "An error occurred during AI generation");
        }
      } else {
        // If doc is missing but we have an ID, could be a cleanup or edge case
        setError("Participant record not found.");
      }
    }, (err) => {
      console.error("Error listening to participant:", err);
      // Don't set a hard error here, as Firestore onSnapshot often auto-reconnects
      // Only set if we really lose it
      if (err.code === 'permission-denied') {
        setError("Access denied. Please try joining again.");
      }
    });

    return () => {
      unsubscribe();
      clearTimeout(hintTimeoutId);
    };
  }, [roomId, participantId, setAiTopics, setAvatarUrl]);

  return { createParticipant, loading, error, status, isTakingLong };
}
