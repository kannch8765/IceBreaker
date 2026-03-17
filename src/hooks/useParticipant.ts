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

  const createParticipant = useCallback(async () => {
    if (!roomId) {
      setError("No room ID found in URL");
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Generate a doc reference first to get the ID
      const participantsRef = collection(db, 'rooms', roomId, 'participants');
      const newParticipantRef = doc(participantsRef);
      const newId = newParticipantRef.id;

      const now = Timestamp.now();
      const expiresAt = Timestamp.fromMillis(now.toMillis() + 2 * 60 * 60 * 1000); // 2 hours

      // 2. Use setDoc as requested
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
    
    // 30 second timeout as requested
    const timeoutId = setTimeout(() => {
      // We check the status locally without making it a dependency of the effect
      // to avoid unnecessary listener churn.
      setError(prevError => {
        // Only set timeout error if no other error exists and status isn't ready
        return prevError === null ? "AI generation timed out. Please try again or contact support." : prevError;
      });
    }, 30000);

    const unsubscribe = onSnapshot(participantRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setStatus(data.status);
        
        if (data.status === 'ready') {
          clearTimeout(timeoutId);
          if (data.aiTopics) setAiTopics(data.aiTopics);
          if (data.avatarUrl) setAvatarUrl(data.avatarUrl);
        }
        
        if (data.status === 'error') {
          clearTimeout(timeoutId);
          setError(data.errorMessage || "An error occurred during AI generation");
        }
      }
    }, (err) => {
      console.error("Error listening to participant:", err);
      setError("Lost connection to live updates");
      clearTimeout(timeoutId);
    });

    return () => {
      unsubscribe();
      clearTimeout(timeoutId);
    };
  }, [roomId, participantId, setAiTopics, setAvatarUrl]); // status removed from deps

  return { createParticipant, loading, error, status };
}
