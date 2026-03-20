import React, { useEffect, useRef } from 'react';
import { useTranslation } from '@/context/LanguageContext';
import { useParticipantStatus } from '@/hooks/useParticipant';
import { useOnboardingStore } from '@/context/OnboardingContext';
import { StepWrapper } from '@/components/motion/StepWrapper';
import { motion } from 'framer-motion';

export const SessionWaitingPage = () => {
  const { t } = useTranslation();
  const { uiState } = useParticipantStatus();
  const { nextStep } = useOnboardingStore();
  const hasTransitioned = useRef(false);

  // Listen for host releasing the UI gate
  useEffect(() => {
    if (!hasTransitioned.current && uiState === 'profile_ready') {
      hasTransitioned.current = true;
      nextStep();
    }
  }, [uiState, nextStep]);

  // Prevent flicker if instantly skipping this step
  if (uiState === 'profile_ready') {
    return null;
  }

  return (
    <StepWrapper>
      <div className="flex flex-col items-center justify-center p-8 text-center min-h-[300px]">
        {/* Subtle Ambient Glow */}
        <div className="relative w-32 h-32 mb-8 flex items-center justify-center">
          <motion.div
            animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="absolute inset-0 bg-yellow-400 dark:bg-purple-500 rounded-full blur-2xl filter mix-blend-multiply dark:mix-blend-screen"
          />
          <span className="text-6xl relative z-10 drop-shadow-md">✨</span>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 10 }} 
          animate={{ opacity: 1, y: 0 }} 
          className="flex flex-col items-center"
        >
          <h2 className="text-2xl font-extrabold text-gray-800 dark:text-gray-100 mb-3 tracking-tight">
            {t('waitingSessionTitle' as any)}
          </h2>
          
          <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">
            {t('waitingSessionSubtitle' as any)}
          </p>
        </motion.div>
      </div>
    </StepWrapper>
  );
};
