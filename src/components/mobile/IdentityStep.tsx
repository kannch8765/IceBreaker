import React from 'react';
import { motion } from 'framer-motion';
import { useOnboardingStore } from '@/context/OnboardingContext';
import { StepWrapper } from '@/components/motion/StepWrapper';
import { User } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export function IdentityStep() {
  const { formData, updateFormData, nextStep, t, language } = useOnboardingStore();

  const isFormValid = formData.username.trim().length > 0 
    && formData.username.length <= 15
    && formData.pronoun.trim().length > 0;

  return (
    <StepWrapper>
      <div className="w-24 h-24 rounded-full bg-purple-100 dark:bg-gray-700 flex items-center justify-center mb-6 shadow-inner">
        <User size={48} className="text-purple-400 dark:text-gray-400" />
      </div>
      
      <motion.div key={`text-${language}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center w-full">
        <h2 className="text-2xl font-bold mb-2 text-center text-gray-800 dark:text-gray-100">
          {t('whoAreYou')}
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 text-center">
          {t('getNameReady')}
        </p>

        <div className="w-full space-y-4 mb-8">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 pl-2">
              {t('username')}
            </label>
          <input
            type="text"
            value={formData.username}
            onChange={(e) => updateFormData({ username: e.target.value })}
            placeholder="e.g. Alex"
            maxLength={15}
            className="w-full px-4 py-3 rounded-2xl bg-white dark:bg-gray-900 border border-purple-100 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-400 outline-none transition-all shadow-sm"
          />
          <p className="text-xs text-gray-400 mt-1 ml-1 pl-2">Max 15 characters</p>
        </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 pl-2">
              {t('pronouns')}
            </label>
            <select
              value={formData.pronoun}
              onChange={(e) => updateFormData({ pronoun: e.target.value })}
              className="w-full px-4 py-3 rounded-2xl bg-white dark:bg-gray-900 border border-purple-100 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-400 outline-none transition-all shadow-sm appearance-none"
            >
              <option value="" disabled>Select</option>
              <option value="he/him">he/him</option>
              <option value="she/her">she/her</option>
              <option value="they/them">they/them</option>
              <option value="other">other</option>
            </select>
          </div>
        </div>

        <Button
          onClick={nextStep}
          disabled={!isFormValid}
          className={!isFormValid ? "opacity-50 cursor-not-allowed from-gray-400 to-gray-500" : ""}
        >
          {t('next')}
        </Button>
      </motion.div>
    </StepWrapper>
  );
}
