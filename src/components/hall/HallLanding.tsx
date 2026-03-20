"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { createRoom } from '@/lib/room';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/context/LanguageContext';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';

export default function HallLanding() {
  const router = useRouter();
  const { theme } = useTheme();
  const { t, language } = useTranslation();
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');

  const handleQuickSetup = async () => {
    setIsCreating(true);
    setError('');
    try {
      const roomId = await createRoom();
      // Navigate to the unified root with room context and hall mode
      router.push(`/hall?room=${roomId}`);
    } catch (err: any) {
      console.error(err);
      setError(err.message || t('failedCreateRoom'));
      // Cooldown: keep button disabled for 5 seconds even on error
      setTimeout(() => setIsCreating(false), 5000);
    }
  };

  return (
    <div className="relative min-h-screen w-full bg-background text-foreground overflow-hidden flex items-center transition-colors duration-500">
      <div className="absolute top-4 right-4 z-50 flex items-center gap-3">
        <LanguageSwitcher />
        <ThemeToggle />
      </div>
      {/* Background Matrix-style Scanline Effect */}
      <motion.div
        className="absolute inset-0 z-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: theme === 'light'
            ? 'linear-gradient(to bottom, transparent 50%, rgba(139, 92, 246, 0.15) 51%, transparent 51%)'
            : 'linear-gradient(to bottom, transparent 50%, rgba(0, 255, 65, 0.1) 51%, transparent 51%)',
          backgroundSize: '100% 4px',
        }}
        animate={{ y: [0, 100] }}
        transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
      />
      <div className="absolute inset-0 bg-white/40 dark:bg-black/60 pointer-events-none z-0 transition-colors duration-500"></div>

      <div className="relative z-10 container mx-auto px-8 md:px-16 lg:px-24">
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="max-w-2xl"
        >
          <h1
            className={`font-black mb-4 tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-purple-600 dark:from-white via-indigo-500 dark:via-green-400 to-purple-400 dark:to-[#00FF41] 
            ${language === 'en' ? 'text-7xl md:text-9xl' : 'text-7xl md:text-9xl'}`}
          >
            {t('appTitle')}
          </h1>

          <p
            className={`font-bold mb-8 text-gray-800 dark:text-gray-100 
            ${language === 'en' ? 'text-2xl md:text-3xl' : 'text-3xl md:text-4xl tracking-widest'}`}
          >
            {t('tagline')}
          </p>

          <div className="flex flex-col sm:flex-row gap-6">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleQuickSetup}
              disabled={isCreating}
              className="px-8 py-4 bg-purple-600 dark:bg-[#00FF41] text-white dark:text-black font-bold text-lg rounded-2xl shadow-[0_0_20px_rgba(147,51,234,0.4)] dark:shadow-[0_0_20px_rgba(0,255,65,0.4)] hover:shadow-[0_0_30px_rgba(147,51,234,0.6)] dark:hover:shadow-[0_0_30px_rgba(0,255,65,0.6)] transition-shadow flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isCreating ? t('initializing') : t('quickSetup')}
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              disabled
              className="px-8 py-4 bg-gray-200 dark:bg-gray-800 text-gray-400 dark:text-gray-500 font-bold text-lg rounded-2xl cursor-not-allowed border border-gray-300 dark:border-gray-700 transition-colors duration-500"
            >
              {t('manualSetup')}
            </motion.button>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 text-red-500 font-medium"
            >
              {error}
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
