"use client";
import React, { useEffect } from 'react';
import { useOnboardingStore } from '@/context/OnboardingContext';
import { StepWrapper } from '@/components/motion/StepWrapper';
import { motion } from 'framer-motion';

import { useParticipant } from '@/hooks/useParticipant';

export function ProcessingStep() {
  const { nextStep, t, language, status } = useOnboardingStore();
  const { error, isTakingLong } = useParticipant();

  useEffect(() => {
    if (status === 'ready') {
      nextStep();
    }
  }, [status, nextStep]);

  return (
    <StepWrapper>
      <div className="flex flex-col items-center justify-center p-8 text-center min-h-[300px]">
        {/* Pulsing Lilac Circle Animation */}
        <div className="relative w-32 h-32 mb-8 flex items-center justify-center">
          <motion.div
            animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="absolute inset-0 bg-purple-400 rounded-full"
          />
          <motion.div
            animate={{ scale: [1, 1.2, 1], opacity: [0.8, 0.2, 0.8] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
            className="absolute inset-2 bg-indigo-400 rounded-full"
          />
          <div className="absolute inset-4 bg-gradient-to-tr from-purple-500 to-indigo-500 rounded-full shadow-lg z-10 flex items-center justify-center">
             <span className="text-white text-3xl">✨</span>
          </div>
        </div>

        <motion.div key={`text-${language}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center">
          <motion.h2
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2"
          >
            {error ? "Oops!" : t('analyzingProfile')}
          </motion.h2>
          
          <div className="text-gray-500 dark:text-gray-400 text-sm space-y-2">
            {error ? (
              <p className="text-red-500 font-medium">{error}</p>
            ) : (
              <>
                <p>{t('generatingIceBreakers')}</p>
                {isTakingLong && (
                  <motion.p 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-indigo-500 dark:text-indigo-400 italic"
                  >
                    Still working... Vertex AI is taking a moment to craft your perfect topics.
                  </motion.p>
                )}
              </>
            )}
          </div>
        </motion.div>
      </div>
    </StepWrapper>
  );
}
