"use client";
import React from 'react';
import { useOnboardingStore, Language } from '@/context/OnboardingContext';
import { Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

export function NavBar() {
  const { language, setLanguage } = useOnboardingStore();
  const [isLangOpen, setIsLangOpen] = React.useState(false);


  const selectLanguage = (lang: Language) => {
    setLanguage(lang);
    setIsLangOpen(false);
  };

  return (
    <div className="absolute top-4 right-4 flex items-center gap-2 z-50">
      {/* Language Selector Dropdown */}
      <div className="relative">
        <button 
          onClick={() => setIsLangOpen(!isLangOpen)}
          className="flex items-center gap-2 px-3 py-2 bg-white/50 dark:bg-gray-800/50 backdrop-blur-md rounded-full shadow-sm hover:bg-white/80 dark:hover:bg-gray-800/80 transition-colors border border-white/40 dark:border-gray-700/50"
        >
          <Globe size={18} className="text-gray-600 dark:text-gray-300" />
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-200 uppercase">{language}</span>
        </button>

        <AnimatePresence>
          {isLangOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className="absolute top-full mt-2 right-0 w-24 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden"
            >
              <div className="flex flex-col">
                <button onClick={() => selectLanguage('en')} className="px-4 py-2 text-sm text-left hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200">EN</button>
                <button onClick={() => selectLanguage('jp')} className="px-4 py-2 text-sm text-left hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200">JP</button>
                <button onClick={() => selectLanguage('cn')} className="px-4 py-2 text-sm text-left hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200">CN</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Theme Toggle */}
      <ThemeToggle />
    </div>
  );
}
