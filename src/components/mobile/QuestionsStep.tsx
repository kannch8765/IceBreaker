"use client";
import React from 'react';
import { useOnboardingStore } from '@/context/OnboardingContext';
import { StepWrapper } from '@/components/motion/StepWrapper';
import { Button } from '@/components/ui/Button';
import { ArrowLeft, Sparkles, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParticipant } from '@/hooks/useParticipant';
import { useTranslation } from '@/context/LanguageContext';

export function QuestionsStep() {
  const { formData, updateFormData, nextStep, prevStep, language, roomId, status, questions } = useOnboardingStore();
  const { t } = useTranslation();
  const { updateParticipant, loading: isSubmitting, error, isTakingLong } = useParticipant();
  
  const handleAnswerChange = (qId: string, value: string) => {
    updateFormData({ 
      answers: { 
        ...formData.answers, 
        [qId]: value 
      } 
    });
  };

  const isComplete = questions.length > 0 && questions.every(q => formData.answers[q.id]?.trim());

  const handleSubmit = async () => {
    if (!roomId) return;
    
    // Construct the structured QA array
    const qa = questions.map(q => ({
      questionId: q.id,
      question: q.text,
      answer: formData.answers[q.id] || ''
    }));

    await updateParticipant({
      qa,
      status: 'waiting_for_ai'
    });
    
    nextStep();
  };

  return (
    <StepWrapper>
      <div className="flex flex-col w-full min-h-[400px]">
        <button onClick={prevStep} className="self-start text-gray-500 mb-4 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
          <ArrowLeft size={24} />
        </button>
        
        <div className="w-16 h-16 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center mb-6 shadow-inner mx-auto">
          <Sparkles size={32} className="text-indigo-400 dark:text-indigo-300" />
        </div>

        <AnimatePresence mode="wait">
          {status === 'generating_questions' ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col items-center justify-center py-12 text-center"
            >
              <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mb-4" />
              <h2 className="text-2xl font-bold mb-2 text-gray-800 dark:text-gray-100">
                {t('craftingIceBreakers')}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">
                Gemini is analyzing your profile to generate personalized questions...
              </p>
              {isTakingLong && (
                <p className="mt-4 text-xs text-indigo-500 italic animate-pulse">
                  Taking a bit longer than expected...
                </p>
              )}
            </motion.div>
          ) : (
            <motion.div 
              key="questions"
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              className="flex flex-col w-full items-center"
            >
              <h2 className="text-2xl font-bold mb-2 text-center text-gray-800 dark:text-gray-100">
                {t('breakIce')}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 text-center">
                {t('helpOthersKnow')}
              </p>

              <div className="w-full space-y-6 mb-8">
                {questions.map((q, idx) => (
                  <motion.div
                    key={q.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="w-full bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-indigo-50 dark:border-gray-700"
                  >
                    <label className="block text-sm font-semibold text-indigo-700 dark:text-indigo-300 mb-2">
                      {q.text}
                    </label>
                    <textarea
                      rows={2}
                      value={formData.answers[q.id] || ''}
                      onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                      placeholder="Your answer..."
                      maxLength={100}
                      className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-900 border-none focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none text-sm dark:text-gray-200"
                    />
                    <p className="text-[10px] text-gray-400 mt-1 ml-1 text-right">
                      {(formData.answers[q.id]?.length || 0)}/100
                    </p>
                  </motion.div>
                ))}
              </div>

              {error && (
                <p className="text-red-500 text-xs mb-4 text-center">{error}</p>
              )}

              <Button
                onClick={handleSubmit}
                disabled={!isComplete || isSubmitting || !roomId}
                className={!isComplete || isSubmitting || !roomId ? "opacity-50 cursor-not-allowed" : ""}
              >
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : t('generateCard')}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </StepWrapper>
  );
}
