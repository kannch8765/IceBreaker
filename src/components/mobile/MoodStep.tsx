"use client";
import React, { useState } from 'react';
import { useOnboardingStore } from '@/context/OnboardingContext';
import { StepWrapper } from '@/components/motion/StepWrapper';
import { Camera, Smile, ArrowLeft, CameraIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { useTranslation } from '@/context/LanguageContext';

const MOODS = [
  { emoji: '🔥', label: 'Energetic' },
  { emoji: '😌', label: 'Chill' },
  { emoji: '🤔', label: 'Curious' },
  { emoji: '✨', label: 'Inspired' },
  { emoji: '😎', label: 'Confident' },
  { emoji: '😴', label: 'Tired' }
];

export function MoodStep() {
  const { formData, updateFormData, nextStep, prevStep, language } = useOnboardingStore();
  const { t } = useTranslation();
  const [view, setView] = useState<'chooser' | 'mood' | 'photo'>('chooser');
  const [hoveredIcon, setHoveredIcon] = useState<string | null>(null);

  const handleSelectPath = (path: 'mood' | 'photo') => {
    setView(path);
  };

  const handleMoodSelect = (moodItem: { emoji: string; label: string }) => {
    updateFormData({ mood: moodItem.label });
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
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{m.label}</span>
                </motion.button>
              ))}
            </div>

            <Button onClick={nextStep} disabled={!formData.mood} className={!formData.mood ? "opacity-50" : ""}>
              <motion.span key={`cont-${language}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>{t('continue')}</motion.span>
            </Button>
          </motion.div>
        )}

        {/* PHOTO VIEW (Mock) */}
        {view === 'photo' && (
          <motion.div
            key="photo"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="w-full flex flex-col items-center"
          >
            <button onClick={() => setView('chooser')} className="self-start text-gray-500 mb-2 p-2">
              <ArrowLeft size={24} />
            </button>
            <motion.h2 key={`snap-${language}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-2xl font-bold mb-6 text-center text-gray-800 dark:text-gray-100">
              {t('snapVibe')}
            </motion.h2>

            <div className="w-full aspect-[3/4] bg-gray-200 dark:bg-gray-800 rounded-3xl flex flex-col items-center justify-center mb-8 relative overflow-hidden shadow-inner">
              <CameraIcon size={64} className="text-gray-400 mb-4" />
              <p className="text-sm text-gray-500">Camera preview mock</p>

              <div className="absolute bottom-6 w-full flex justify-center">
                <button
                  onClick={() => { updateFormData({ mood: 'Photo Taken' }); nextStep(); }}
                  className="w-16 h-16 rounded-full bg-white border-4 border-gray-300 shadow-lg"
                />
              </div>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </StepWrapper>
  );
}
