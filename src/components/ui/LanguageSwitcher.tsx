"use client";

import React, { useState } from 'react';
import { Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation, Language } from '@/context/LanguageContext';
import { SUPPORTED_LANGUAGES } from '@/lib/translations';

export function LanguageSwitcher() {
  const { language, setLanguage } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const selectLanguage = (lang: Language) => {
    setLanguage(lang);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-white/50 dark:bg-gray-800/50 backdrop-blur-md rounded-full shadow-sm hover:bg-white/80 dark:hover:bg-gray-800/80 transition-colors border border-white/40 dark:border-gray-700/50"
      >
        <Globe size={18} className="text-gray-600 dark:text-gray-300" />
        <span className="text-sm font-semibold text-gray-700 dark:text-gray-200 uppercase">{language}</span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="absolute top-full mt-2 right-0 w-24 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden z-[100]"
          >
            <div className="flex flex-col">
              {SUPPORTED_LANGUAGES.map((lang) => (
                <button 
                  key={lang}
                  onClick={() => selectLanguage(lang)} 
                  className={`px-4 py-2 text-sm text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                    language === lang 
                      ? 'text-purple-600 dark:text-[#00FF41] font-bold' 
                      : 'text-gray-700 dark:text-gray-200'
                  }`}
                >
                  {lang.toUpperCase()}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
