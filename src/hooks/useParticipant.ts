"use client";

import { useEffect, useState, useCallback, useContext } from 'react';
import { doc, onSnapshot, setDoc, updateDoc, serverTimestamp, collection, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useOnboardingStore, OnboardingContext } from '../context/OnboardingContext';
import { useTranslation } from '../context/LanguageContext';

export function useParticipant(explicitRoomId?: string) {
  const context = useContext(OnboardingContext);
  
  // Use context if available, otherwise fallback to explicit or empty values
  const roomId = explicitRoomId || context?.roomId || null;
  const participantId = context?.participantId || null;
  const setParticipantId = context?.setParticipantId || (() => {});
  const setAiTopics = context?.setAiTopics || (() => {});
  const setAvatarUrl = context?.setAvatarUrl || (() => {});
  const setQuestions = context?.setQuestions || (() => {});
  const setStatus = context?.setStatus || (() => {});
  const setMatchedParticipant = context?.setMatchedParticipant || (() => {});
  const formData = context?.formData || { 
    username: '', 
    pronoun: '', 
    mood: '', 
    inputMode: 'mood', 
    answers: {} 
  };
  
  const { language } = useTranslation();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isTakingLong, setIsTakingLong] = useState(false);

  const createParticipant = useCallback(async (overrideData?: any, options?: { skipStore?: boolean }) => {
    if (!roomId) {
      setError("No room ID found in URL");
      return null;
    }

    const mergedData = { ...formData, ...(overrideData || {}) };

    setLoading(true);
    setError(null);

    try {
      const participantsRef = collection(db, 'rooms', roomId, 'participants');

      if (participantId && !options?.skipStore) {
        try {
          const existingRef = doc(participantsRef, participantId);
          const payload = {
            username: mergedData.username,
            pronoun: mergedData.pronoun,
            inputMode: mergedData.inputMode,
            // Strictly enforce mode-specific data
            mood: mergedData.inputMode === 'mood' ? mergedData.mood : '',
            imageUrl: mergedData.inputMode === 'camera' ? (mergedData.imageUrl || null) : null,
            language: language,
            status: 'generating_questions',
          };
          await updateDoc(existingRef, payload);
          setLoading(false);
          return participantId;
        } catch (updateErr: any) {
          console.warn("Existing participant not found or update failed, falling back to new.", updateErr);
        }
      }

      const { getDocs, query, limit } = await import('firebase/firestore');
      const snapshot = await getDocs(query(participantsRef, limit(51)));
      if (snapshot.size >= 50) {
        throw new Error("This room is at full capacity (max 50).");
      }

      const newParticipantRef = doc(participantsRef);
      const newId = newParticipantRef.id;

      const now = Timestamp.now();
      const expiresAt = Timestamp.fromMillis(now.toMillis() + 2 * 60 * 60 * 1000); // 2 hours

      const payload = {
        username: mergedData.username,
        pronoun: mergedData.pronoun,
        inputMode: mergedData.inputMode,
        // Strictly enforce mode-specific data
        mood: mergedData.inputMode === 'mood' ? mergedData.mood : '',
        imageUrl: mergedData.inputMode === 'camera' ? (mergedData.imageUrl || null) : null,
        language: mergedData.language || language,
        isSeed: mergedData.isSeed || false,
        status: 'generating_questions', // Trigger backend personalized questions
        createdAt: serverTimestamp(),
        expiresAt: expiresAt,
      };

      await setDoc(newParticipantRef, payload);

      if (!options?.skipStore) {
        setParticipantId(newId);
      }
      setLoading(false);
      return newId;
    } catch (err: any) {
      console.error("Error creating participant:", err);
      setError(err.message || "Failed to join room");
      setLoading(false);
      return null;
    }
  }, [roomId, participantId, formData, language, setParticipantId]);

  const updateParticipant = useCallback(async (data: any) => {
    if (!roomId || !participantId) return;
    setLoading(true);
    try {
      const participantRef = doc(db, 'rooms', roomId, 'participants', participantId);
      await updateDoc(participantRef, data);
      setLoading(false);
    } catch (err: any) {
      console.error("Error updating participant:", err);
      setError(err.message || "Failed to update profile");
      setLoading(false);
    }
  }, [roomId, participantId]);

  useEffect(() => {
    if (!roomId || !participantId) return;

    const participantRef = doc(db, 'rooms', roomId, 'participants', participantId);
    
    // Soft hint timer
    const hintTimeoutId = setTimeout(() => {
      setIsTakingLong(true);
    }, 45000);

    const unsubscribe = onSnapshot(participantRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setStatus(data.status);
        
        if (data.questions) setQuestions(data.questions);
        if (data.aiTopics) setAiTopics(data.aiTopics);
        if (data.avatarUrl) setAvatarUrl(data.avatarUrl);
        if (data.matchedParticipant) {
          console.log("Firestore sync matchedParticipant:", data.matchedParticipant);
          setMatchedParticipant(data.matchedParticipant);
        }

        if (data.status === 'ready' || data.status === 'answering' || data.status === 'error') {
          clearTimeout(hintTimeoutId);
          setIsTakingLong(false);
        }
        
        if (data.status === 'error') {
          setError(data.errorMessage || "An error occurred");
        }
      } else {
        setError("Participant record not found.");
      }
    }, (err) => {
      console.error("Error listening to participant:", err);
      if (err.code === 'permission-denied') {
        setError("Access denied. Please try joining again.");
      }
    });

    return () => {
      unsubscribe();
      clearTimeout(hintTimeoutId);
    };
  }, [roomId, participantId, setAiTopics, setAvatarUrl, setQuestions, setStatus, setMatchedParticipant]);

  return { createParticipant, updateParticipant, loading, error, isTakingLong };
}

export type UIState = "loading_questions" | "answering_form" | "loading_profile" | "waiting_for_session" | "profile_ready" | "error";

import { useRoomState } from './useRoomParticipants';

export function useParticipantStatus() {
  const { status, questions, roomId, participantId } = useOnboardingStore();
  const { status: roomStatus } = useRoomState(roomId || '');
  const [isRetrying, setIsRetrying] = useState(false);

  let uiState: UIState = "loading_questions"; // default safe state

  if (status === 'error') {
    uiState = "error";
  } else if (status === 'ready') {
    if (roomStatus === 'waiting') {
      uiState = "waiting_for_session";
    } else {
      uiState = "profile_ready";
    }
  } else if (status === 'waiting_for_ai' || status === 'processing_ai') {
    uiState = "loading_profile";
  } else if (status === 'answering' && questions.length > 0) {
    uiState = "answering_form";
  } else if (status === 'generating_questions' || status === 'processing_questions' || (status === 'answering' && questions.length === 0)) {
    uiState = "loading_questions";
  }

  const retryAi = async () => {
    if (!roomId || !participantId) return;
    setIsRetrying(true);
    try {
      const participantRef = doc(db, 'rooms', roomId, 'participants', participantId);
      if (uiState === 'loading_profile' || (status === 'error' && questions.length > 0)) {
        await updateDoc(participantRef, { status: 'waiting_for_ai', errorMessage: null });
      } else {
        await updateDoc(participantRef, { status: 'generating_questions', errorMessage: null });
      }
    } catch (e) {
      console.error("Failed to retry AI:", e);
    } finally {
      setIsRetrying(false);
    }
  };

  return { uiState, retryAi, isRetrying };
}
