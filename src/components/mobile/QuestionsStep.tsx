"use client";
import React, { useState, useEffect } from 'react';
import { useOnboardingStore } from '@/context/OnboardingContext';
import { StepWrapper } from '@/components/motion/StepWrapper';
import { Button } from '@/components/ui/Button';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

const ALL_PROMPTS = [
  "What is your secret talent?",
  "What's a topic you could give a 30-minute presentation on with no prep?",
  "If you had to change your name, what would you change it to?",
  "What's the best piece of advice you've ever been given?"
];

import { useParticipant } from '@/hooks/useParticipant';

export function QuestionsStep() {
  const { formData, updateFormData, nextStep, prevStep, t, language, roomId } = useOnboardingStore();
  const { createParticipant, loading: isSubmitting, error: submitError } = useParticipant();
  const [prompts, setPrompts] = useState<string[]>([]);
  
  useEffect(() => {
    // Select two random prompts
    const shuffled = [...ALL_PROMPTS].sort(() => 0.5 - Math.random());
    setPrompts(shuffled.slice(0, 2));
  }, []);

  const handleNext = async () => {
    if (!roomId) return;
    const id = await createParticipant();
    if (id) {
      nextStep();
    }
  };

  const handleAnswerChange = (index: number, value: string) => {
    const newAnswers = [...formData.answers];
    newAnswers[index] = value;
    updateFormData({ answers: newAnswers });
  };

  const isComplete = formData.answers[0]?.trim() && formData.answers[1]?.trim();

  return (
    <StepWrapper>
      <button onClick={prevStep} className="self-start text-gray-500 mb-4 p-2">
        <ArrowLeft size={24} />
      </button>
      
      <div className="w-16 h-16 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center mb-6 shadow-inner mx-auto">
        <Sparkles size={32} className="text-indigo-400 dark:text-indigo-300" />
      </div>

      <motion.div key={`text-${language}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col w-full items-center">
        <h2 className="text-2xl font-bold mb-2 text-center text-gray-800 dark:text-gray-100">
          {t('breakIce')}
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 text-center">
          {t('helpOthersKnow')}
        </p>

        {prompts.length > 0 && (
        <div className="w-full space-y-6 mb-8">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="w-full bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-indigo-50 dark:border-gray-700"
          >
            <label className="block text-sm font-semibold text-indigo-700 dark:text-indigo-300 mb-2">
              {prompts[0]}
            </label>
            <textarea
              rows={2}
              value={formData.answers[0]}
              onChange={(e) => handleAnswerChange(0, e.target.value)}
              placeholder="Your answer..."
              className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-900 border-none focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none text-sm dark:text-gray-200"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="w-full bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-indigo-50 dark:border-gray-700"
          >
            <label className="block text-sm font-semibold text-indigo-700 dark:text-indigo-300 mb-2">
              {prompts[1]}
            </label>
            <textarea
              rows={2}
              value={formData.answers[1]}
              onChange={(e) => handleAnswerChange(1, e.target.value)}
              placeholder="Your answer..."
              className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-900 border-none focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none text-sm dark:text-gray-200"
            />
          </motion.div>
        </div>
      )}

      {submitError && (
        <p className="text-red-500 text-xs mb-4 text-center">{submitError}</p>
      )}

      <Button
        onClick={handleNext}
        disabled={!isComplete || isSubmitting || !roomId}
        className={!isComplete || isSubmitting || !roomId ? "opacity-50 cursor-not-allowed from-gray-400 to-gray-500" : ""}
      >
        {isSubmitting ? "Connecting..." : t('generateCard')}
      </Button>
      </motion.div>
    </StepWrapper>
  );
}
