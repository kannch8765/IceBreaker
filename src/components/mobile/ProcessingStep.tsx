"use client";
import React, { useEffect } from 'react';
import { useOnboardingStore } from '@/context/OnboardingContext';
import { StepWrapper } from '@/components/motion/StepWrapper';
import { motion } from 'framer-motion';

export function ProcessingStep() {
  const { nextStep } = useOnboardingStore();

  useEffect(() => {
    // Simulate a 2-second delay for AI processing
    const timer = setTimeout(() => {
      nextStep();
    }, 2000);
    return () => clearTimeout(timer);
  }, [nextStep]);

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

        <motion.h2
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2"
        >
          Analyzing Profile...
        </motion.h2>
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          Generating personalized ice breakers.
        </p>
      </div>
    </StepWrapper>
  );
}
