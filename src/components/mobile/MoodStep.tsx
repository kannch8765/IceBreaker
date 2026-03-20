"use client";
import React, { useState, useRef, useEffect } from 'react';
import { useOnboardingStore } from '@/context/OnboardingContext';
import { StepWrapper } from '@/components/motion/StepWrapper';
import { Camera, Smile, ArrowLeft, CameraIcon, RefreshCw, CheckCircle2, SwitchCamera } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { useTranslation } from '@/context/LanguageContext';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase';

const MOODS = [
  { emoji: '🔥', label: 'Energetic', key: 'moodEnergetic' },
  { emoji: '😌', label: 'Chill', key: 'moodChill' },
  { emoji: '🤔', label: 'Curious', key: 'moodCurious' },
  { emoji: '✨', label: 'Inspired', key: 'moodInspired' },
  { emoji: '😎', label: 'Confident', key: 'moodConfident' },
  { emoji: '😴', label: 'Tired', key: 'moodTired' }
];

import { useParticipant } from '@/hooks/useParticipant';

export function MoodStep() {
  const { formData, updateFormData, nextStep, prevStep, language, roomId } = useOnboardingStore();
  const { createParticipant, loading: isCreating } = useParticipant();
  const { t } = useTranslation();
  const [view, setView] = useState<'chooser' | 'mood' | 'photo'>('chooser');
  const [hoveredIcon, setHoveredIcon] = useState<string | null>(null);

  // Camera State
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

  // Stop camera stream utility
  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  useEffect(() => {
    return () => {
      stopCamera();
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [stream, previewUrl]);

  const handleSelectPath = (path: 'mood' | 'photo') => {
    setView(path);
    if (path === 'photo') {
      startCamera();
    }
  };

  const handleMoodSelect = (moodItem: { emoji: string; label: string }) => {
    updateFormData({ mood: moodItem.label, inputMode: 'mood' });
  };

  // Camera logic
  const startCamera = async (mode: string = facingMode) => {
    setCameraError(null);
    setCapturedBlob(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    
    stopCamera();

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode }
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: any) {
      console.error("Camera error:", err);
      // Fallback message handles any translation missing keys
      const errorMsg = (t as any)('cameraError') || "Could not access camera. Please allow permissions.";
      setCameraError(errorMsg);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      if (context) {
        // Reduce resolution logically
        const MAX_WIDTH = 800;
        const scale = Math.min(MAX_WIDTH / video.videoWidth, 1);
        canvas.width = video.videoWidth * scale;
        canvas.height = video.videoHeight * scale;
        
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        canvas.toBlob((blob) => {
          if (blob) {
            setCapturedBlob(blob);
            const url = URL.createObjectURL(blob);
            setPreviewUrl(url);
            stopCamera();
          }
        }, 'image/jpeg', 0.8); // Compress JPEG to ~0.8 quality
      }
    }
  };

  const handleUsePhoto = async () => {
    console.log("STEP 0: handleUsePhoto triggered");
    if (!capturedBlob) {
      console.error("STEP 0 ERROR: Captured blob is null.");
      setCameraError("Image capture failed. Please retake.");
      return;
    }
    if (!roomId) {
      console.error("STEP 0 ERROR: No Room ID found.");
      setCameraError("Room ID missing. Cannot upload.");
      return;
    }

    setIsUploading(true);
    setCameraError(null);

    try {
      const storagePath = `participants/${roomId}_${Date.now()}.jpg`;
      const storageRef = ref(storage, storagePath);
      console.log(`STEP 1: blob + ref ready (Path: ${storagePath}, Size: ${capturedBlob.size} bytes)`);
      
      console.log("STEP 2: upload start...");
      const snapshot = await uploadBytes(storageRef, capturedBlob);
      console.log("STEP 3: upload success", snapshot);
      
      const url = await getDownloadURL(snapshot.ref);
      console.log("STEP 4: URL fetched", url);

      updateFormData({ inputMode: 'camera', imageUrl: url, mood: "" });
      
      console.log("STEP 5: createParticipant start...");
      const id = await createParticipant();
      if (id) {
        console.log("STEP 6: createParticipant success", id);
        nextStep();
      } else {
         console.warn("STEP 6 ERROR: Empty ID returned from createParticipant.");
         setCameraError("Failed to attach image to room context.");
      }
    } catch (err: any) {
      console.error("STEP ERROR: Exception caught during upload/create sequence:", err);
      setCameraError(err.message || "Failed to upload image. Please try again.");
    } finally {
      console.log("STEP 7: finally block executed. Resetting isUploading state.");
      setIsUploading(false);
    }
  };

  return (
    <StepWrapper>
      <AnimatePresence mode="wait">

        {/* CHOOSER VIEW */}
        {view === 'chooser' && (
          <motion.div
            key="chooser"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            className="w-full flex flex-col items-center"
          >
            <button onClick={prevStep} className="self-start text-gray-500 mb-4 p-2">
              <ArrowLeft size={24} />
            </button>
            <motion.h2 key={`title-${language}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-3xl font-bold mb-8 text-center text-gray-800 dark:text-gray-100">
              {t('expressYourself')}
            </motion.h2>

            <div className="flex gap-8 w-full justify-center">
              {/* Camera Option */}
              <motion.button
                onClick={() => handleSelectPath('photo')}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9, x: [0, -5, 5, -5, 5, 0] }}
                onHoverStart={() => setHoveredIcon('camera')}
                onHoverEnd={() => setHoveredIcon(null)}
                className="w-32 h-32 rounded-[2rem] bg-white dark:bg-gray-800 shadow-lg flex flex-col items-center justify-center relative border-2 border-transparent hover:border-purple-300 transition-colors"
              >
                <Camera size={48} className="text-purple-500" />
              </motion.button>

              {/* Mood Option */}
              <motion.button
                onClick={() => handleSelectPath('mood')}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9, x: [0, -5, 5, -5, 5, 0] }}
                onHoverStart={() => setHoveredIcon('mood')}
                onHoverEnd={() => setHoveredIcon(null)}
                className="w-32 h-32 rounded-[2rem] bg-white dark:bg-gray-800 shadow-lg flex flex-col items-center justify-center relative border-2 border-transparent hover:border-pink-300 transition-colors"
              >
                <Smile size={48} className="text-pink-500" />
              </motion.button>
            </div>

            <div className="h-12 mt-8 text-center">
              <AnimatePresence mode="wait">
                {hoveredIcon === 'camera' && (
                  <motion.p key={`cam-${language}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="text-gray-600 dark:text-gray-300 font-medium text-lg">
                    {t('takePhoto')}
                  </motion.p>
                )}
                {hoveredIcon === 'mood' && (
                  <motion.p key={`moodtxt-${language}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="text-gray-600 dark:text-gray-300 font-medium text-lg">
                    {t('whatMood')}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}

        {/* MOOD VIEW */}
        {view === 'mood' && (
          <motion.div
            key="mood"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="w-full flex flex-col items-center"
          >
            <button onClick={() => setView('chooser')} className="self-start text-gray-500 mb-2 p-2">
              <ArrowLeft size={24} />
            </button>
            <motion.h2 key={`vibe-${language}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-2xl font-bold mb-6 text-center text-gray-800 dark:text-gray-100">
              {t('selectVibe')}
            </motion.h2>

            <div className="grid grid-cols-2 gap-4 w-full mb-8">
              {MOODS.map((m) => (
                <motion.button
                  key={m.label}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleMoodSelect(m)}
                  className={`relative p-4 rounded-2xl flex flex-col items-center justify-center border-2 transition-all ${formData.mood === m.label
                      ? 'bg-pink-100 border-pink-400 dark:bg-pink-900/30'
                      : 'bg-white border-transparent hover:border-pink-200 shadow-sm dark:bg-gray-800'
                    }`}
                >
                  <span className="text-4xl mb-2">{m.emoji}</span>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t(m.key as any)}</span>
                </motion.button>
              ))}
            </div>

            <Button 
              onClick={async () => {
                const id = await createParticipant();
                if (id) nextStep();
              }} 
              disabled={!formData.mood || isCreating} 
              className={!formData.mood || isCreating ? "opacity-50" : ""}
            >
              <motion.span key={`cont-${language}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                {isCreating ? t('initializing') : t('continue')}
              </motion.span>
            </Button>
          </motion.div>
        )}

        {/* PHOTO VIEW (Actual Implementation) */}
        {view === 'photo' && (
          <motion.div
            key="photo"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="w-full flex flex-col items-center gap-4"
          >
            <button onClick={() => {
              stopCamera();
              setView('chooser');
            }} className="self-start text-gray-500 mb-2 p-2" disabled={isUploading || isCreating}>
              <ArrowLeft size={24} />
            </button>
            <motion.h2 key={`snap-${language}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-2xl font-bold mb-2 text-center text-gray-800 dark:text-gray-100">
              {(t as any)('snapVibe') || "Capture your vibe"}
            </motion.h2>

            <div className="w-full max-w-sm aspect-[3/4] bg-black rounded-3xl overflow-hidden relative shadow-inner">
              {cameraError ? (
                <div className="w-full h-full flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-800 p-6 text-center">
                  <CameraIcon size={48} className="text-red-400 mb-4" />
                  <p className="text-gray-700 dark:text-gray-300 font-medium mb-4">{cameraError}</p>
                  <Button onClick={() => setView('chooser')} className="bg-white text-gray-800 hover:bg-gray-100 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600 border-2">
                    Go Back
                  </Button>
                </div>
              ) : previewUrl ? (
                <img 
                  src={previewUrl} 
                  alt="Preview" 
                  className={`w-full h-full object-cover ${facingMode === 'user' ? 'transform scale-x-[-1]' : ''}`} 
                />
              ) : (
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  muted 
                  className={`w-full h-full object-cover ${facingMode === 'user' ? 'transform scale-x-[-1]' : ''}`} 
                />
              )}
              {/* Hidden canvas for taking snapshot */}
              <canvas ref={canvasRef} className="hidden" />

              {/* Camera Actions Overlay */}
              {!cameraError && (
                <div className="absolute bottom-6 w-full flex justify-center items-center gap-8 px-8">
                  {previewUrl ? (
                    <>
                      <button 
                        onClick={() => startCamera()}
                        disabled={isUploading || isCreating}
                        className="p-3 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/30 transition shadow-lg disabled:opacity-50"
                      >
                        <RefreshCw size={24} />
                      </button>
                      <button 
                        onClick={handleUsePhoto}
                        disabled={isUploading || isCreating}
                        className="p-4 bg-purple-500 rounded-full text-white shadow-xl hover:bg-purple-600 transition disabled:opacity-50 flex items-center justify-center"
                      >
                        {isUploading || isCreating ? (
                          <div className="w-8 h-8 rounded-full border-4 border-white border-t-transparent animate-spin" />
                        ) : (
                          <CheckCircle2 size={32} />
                        )}
                      </button>
                    </>
                  ) : (
                    <div className="w-full flex justify-between items-center px-4">
                      <div className="w-12 h-12" /> {/* Layout spacer */}
                      <button
                        onClick={capturePhoto}
                        className="w-16 h-16 rounded-full bg-white border-4 border-gray-300 shadow-xl focus:outline-none hover:scale-105 transition"
                      />
                      <button
                        onClick={() => {
                          const newMode = facingMode === 'user' ? 'environment' : 'user';
                          setFacingMode(newMode);
                          startCamera(newMode);
                        }}
                        className="w-12 h-12 flex justify-center items-center bg-black/40 backdrop-blur-md rounded-full text-white hover:bg-black/60 transition shadow-lg"
                      >
                         <SwitchCamera size={20} />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {(isUploading || isCreating) && (
              <p className="text-purple-600 dark:text-purple-400 font-medium animate-pulse mt-2">
                {isUploading ? "Uploading visual vibe..." : "Connecting..."}
              </p>
            )}
          </motion.div>
        )}

      </AnimatePresence>
    </StepWrapper>
  );
}
