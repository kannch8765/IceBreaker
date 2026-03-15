"use client";
import React from 'react';
import { useOnboardingStore } from '@/context/OnboardingContext';
import { StepWrapper } from '@/components/motion/StepWrapper';
import { User } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export function IdentityStep() {
  const { formData, updateFormData, nextStep } = useOnboardingStore();

  const isFormValid = formData.username.trim().length > 0 && formData.pronoun.trim().length > 0;

  return (
    <StepWrapper>
      <div className="w-24 h-24 rounded-full bg-purple-100 dark:bg-gray-700 flex items-center justify-center mb-6 shadow-inner">
        <User size={48} className="text-purple-400 dark:text-gray-400" />
      </div>
      
      <h2 className="text-2xl font-bold mb-2 text-center text-gray-800 dark:text-gray-100">
        Who are you?
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 text-center">
        Let's get your name card ready.
      </p>

      <div className="w-full space-y-4 mb-8">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 pl-2">
            Username
          </label>
          <input
            type="text"
            value={formData.username}
            onChange={(e) => updateFormData({ username: e.target.value })}
            placeholder="e.g. Alex"
            className="w-full px-4 py-3 rounded-2xl bg-white dark:bg-gray-900 border border-purple-100 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-400 outline-none transition-all shadow-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 pl-2">
            Pronouns
          </label>
          <select
            value={formData.pronoun}
            onChange={(e) => updateFormData({ pronoun: e.target.value })}
            className="w-full px-4 py-3 rounded-2xl bg-white dark:bg-gray-900 border border-purple-100 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-400 outline-none transition-all shadow-sm appearance-none"
          >
            <option value="" disabled>Select pronouns</option>
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
        Next
      </Button>
    </StepWrapper>
  );
}
