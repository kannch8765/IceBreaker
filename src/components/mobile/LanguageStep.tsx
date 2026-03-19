"use client";
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useOnboardingStore } from '@/context/OnboardingContext';
import { StepWrapper } from '@/components/motion/StepWrapper';
import { Globe } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useTranslation, Language } from '@/context/LanguageContext';

const LANGUAGES: { code: Language; labelKey: string }[] = [
  { code: 'jp', labelKey: 'languageJp' },
  { code: 'en', labelKey: 'languageEn' },
  { code: 'cn', labelKey: 'languageCn' }
];

export function LanguageStep() {
  const { nextStep } = useOnboardingStore();
  const { language, setLanguage, t } = useTranslation();
  const [hasInteracted, setHasInteracted] = useState(false);

  useEffect(() => {
    if (localStorage.getItem('preferredLanguage')) {
      setHasInteracted(true);
    }
  }, []);

  const handleSelect = (code: Language) => {
    setLanguage(code);
    setHasInteracted(true);
  };

  return (
    <StepWrapper>
      <div className="w-24 h-24 rounded-full bg-indigo-100 dark:bg-gray-700 flex items-center justify-center mb-6 shadow-inner">
        <Globe size={48} className="text-indigo-400 dark:text-gray-400" />
      </div>

      <motion.div key={`text-${language}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center w-full">
        <h2 className="text-2xl font-bold mb-2 text-center text-gray-800 dark:text-gray-100">
          {t('selectLanguage' as any)}
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 text-center px-4">
          {t('selectLanguageSub' as any)}
        </p>

        <div className="w-full space-y-3 mb-8">
          {LANGUAGES.map((lang) => (
            <motion.button
              key={lang.code}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleSelect(lang.code)}
              className={`w-full p-4 rounded-2xl flex items-center justify-between border-2 transition-all ${
                language === lang.code && hasInteracted
                  ? 'bg-indigo-50 border-indigo-400 dark:bg-indigo-900/30 dark:border-indigo-400'
                  : 'bg-white/60 border-transparent hover:border-indigo-200 shadow-sm dark:bg-gray-800/60 dark:hover:border-gray-600'
              }`}
            >
              <span className={`text-lg font-medium ${language === lang.code && hasInteracted ? 'text-indigo-700 dark:text-indigo-300' : 'text-gray-700 dark:text-gray-300'}`}>
                {t(lang.labelKey as any)}
              </span>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${language === lang.code && hasInteracted ? 'border-indigo-500' : 'border-gray-300 dark:border-gray-600'}`}>
                {language === lang.code && hasInteracted && <div className="w-2.5 h-2.5 rounded-full bg-indigo-500" />}
              </div>
            </motion.button>
          ))}
        </div>

        <Button 
          onClick={nextStep}
          disabled={!hasInteracted}
          className={!hasInteracted ? "opacity-50 cursor-not-allowed from-gray-400 to-gray-500" : ""}
        >
          {t('continue')}
        </Button>
      </motion.div>
    </StepWrapper>
  );
}
