import React from 'react';
import { useTranslation } from '@/context/LanguageContext';
import { motion } from 'framer-motion';

export const ResultPage = () => {
  const { t } = useTranslation();

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      className="flex flex-col items-center justify-center h-full min-h-screen text-center px-6 transition-colors duration-500 bg-white text-gray-900 dark:bg-black dark:text-gray-100"
    >
      <motion.div 
        initial={{ scale: 0.8, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        className="relative flex flex-col items-center justify-center p-12"
      >
        {/* Subtle Background Glow */}
        <div className="absolute inset-0 bg-yellow-200 dark:bg-indigo-500/20 rounded-full blur-3xl filter opacity-40 mix-blend-multiply dark:mix-blend-screen -z-10" />

        <div className="text-8xl mb-8 drop-shadow-lg">
          👀
        </div>

        <h1 className="text-4xl md:text-5xl font-extrabold mb-4 tracking-tight">
          {t('resultTitle')}
        </h1>

        <p className="text-xl md:text-2xl font-medium text-gray-500 dark:text-gray-400">
          {t('resultSubtitle')}
        </p>
      </motion.div>
    </motion.div>
  );
};
