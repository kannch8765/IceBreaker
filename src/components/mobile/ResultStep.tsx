"use client";
import React from 'react';
import { useOnboardingStore } from '@/context/OnboardingContext';
import { motion } from 'framer-motion';
import { CheckCircle, Share2, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export function ResultStep() {
  const { formData, t, language, aiTopics, avatarUrl, matchedParticipant } = useOnboardingStore();

  // Helper to safely encode URLs that might contain raw Japanese characters in the seed
  const getSafeAvatarUrl = (url: string | null) => {
    if (!url) return null;
    if (!url.includes('seed=')) return url;
    try {
      const urlObj = new URL(url);
      const seed = urlObj.searchParams.get('seed');
      if (seed) {
        urlObj.searchParams.set('seed', seed); // URLSearchParams automatically encodes values
        return urlObj.toString();
      }
      return url;
    } catch (e) {
      console.error("Failed to parse avatar URL:", e);
      return url;
    }
  };

  const safeAvatarUrl = getSafeAvatarUrl(avatarUrl);

  return (
    <motion.div
      initial={{ y: 100, opacity: 0, scale: 0.9 }}
      animate={{ y: 0, opacity: 1, scale: 1, transition: { type: "spring", bounce: 0.5, duration: 0.8 } }}
      className="flex flex-col items-center justify-center w-full max-w-sm m-4 relative z-10"
    >
      <motion.div key={`res-${language}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full flex justify-center z-20">
        {/* Top Banner overlay */}
        <div className="absolute -top-10 flex flex-col items-center animate-bounce">
          <div className="bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-300 px-4 py-1 rounded-full text-xs font-bold shadow-sm flex items-center gap-1 mb-2">
            <CheckCircle size={14} /> {t('readyToMingle')}
          </div>
        </div>
      </motion.div>

      <div className="w-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-2xl rounded-[2.5rem] shadow-[0_20px_50px_rgba(150,130,220,0.2)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden border border-white/40 dark:border-gray-700/50">

        {/* Card Header (Avatar + Name) */}
        <div className="p-8 pb-6 flex flex-col items-center bg-gradient-to-b from-purple-100/50 to-transparent dark:from-purple-900/20">
          <div className="w-32 h-32 rounded-full bg-gradient-to-tr from-purple-400 to-indigo-400 shadow-xl flex items-center justify-center mb-6 border-4 border-white dark:border-gray-800 text-6xl shadow-purple-200 dark:shadow-none overflow-hidden">
            {safeAvatarUrl ? (
              <img
                src={safeAvatarUrl}
                alt="Avatar"
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  const next = e.currentTarget.nextElementSibling as HTMLElement;
                  if (next) next.style.display = 'flex';
                }}
              />
            ) : null}
            {!safeAvatarUrl || <span style={{ display: 'none' }} className="w-full h-full flex items-center justify-center">🦊</span>}
            {!safeAvatarUrl && "🦊"}
          </div>

          <h2 className="text-3xl font-extrabold text-gray-800 dark:text-gray-100 tracking-tight">
            {formData.username || t('anonymous')}
          </h2>
          <p className="text-sm font-medium text-purple-600 dark:text-purple-400 mt-1 uppercase tracking-widest">
            {formData.pronoun || t('anyPronouns')}
          </p>
        </div>

        {/* Info & Matches Section */}
        <div className="px-8 pb-6">
          <div className="flex justify-center gap-2 mb-6">
            <span className="px-3 py-1 bg-gray-100 dark:bg-gray-900 rounded-full text-xs font-semibold text-gray-600 dark:text-gray-300">
              {t('vibe')}: {formData.mood || t('mysterious')}
            </span>
          </div>

          {/* New Match Section (Moved and Upgraded) */}
          <div className="border-t border-b border-indigo-50 dark:border-gray-700/50 py-6 mb-6">
            <motion.p key={`meet-${language}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-4 text-center uppercase tracking-widest">
              {t('peopleMeet')}
            </motion.p>
            <div className="flex justify-center items-center -space-x-4">
              {matchedParticipant ? (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="w-14 h-14 rounded-full border-4 border-white dark:border-gray-800 flex justify-center items-center text-2xl z-[30] shadow-md overflow-hidden bg-white dark:bg-gray-900"
                >
                  {getSafeAvatarUrl(matchedParticipant?.participant?.avatarUrl || matchedParticipant?.avatarUrl) ? (
                    <div className="relative w-full h-full">
                      <img
                        src={getSafeAvatarUrl(matchedParticipant?.participant?.avatarUrl || matchedParticipant?.avatarUrl)!}
                        alt={matchedParticipant?.participant?.username || matchedParticipant?.username || 'User'}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          const next = e.currentTarget.nextElementSibling as HTMLElement;
                          if (next) next.style.display = 'flex';
                        }}
                      />
                      <div style={{ display: 'none' }} className="w-full h-full items-center justify-center bg-gray-100 dark:bg-gray-800">🦊</div>
                    </div>
                  ) : (
                    "🦊"
                  )}
                </motion.div>
              ) : (
                <>
                  <div className="w-14 h-14 rounded-full bg-blue-100 border-4 border-white dark:border-gray-800 flex justify-center items-center text-2xl z-30 shadow-md">🐶</div>
                  <div className="w-14 h-14 rounded-full bg-pink-100 border-4 border-white dark:border-gray-800 flex justify-center items-center text-2xl z-20 shadow-md">🐱</div>
                  <div className="w-14 h-14 rounded-full bg-green-100 border-4 border-white dark:border-gray-800 flex justify-center items-center text-2xl z-10 shadow-md">🐰</div>
                </>
              )}
            </div>
          </div>

          <div className="w-full space-y-3 mb-2">
            <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
              <MessageCircle size={14} /> {t('aiIceBreakers')}
            </h3>
            {aiTopics.length > 0 ? aiTopics.map((topic, i) => (
              <div key={i} className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/30 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
                <p className="text-sm text-indigo-900 dark:text-indigo-200 font-medium leading-relaxed">
                  {typeof topic === 'string' ? topic : ((topic as any)[language] || (topic as any).en || '')}
                </p>
              </div>
            )) : (
              <p className="text-xs text-gray-400 italic">{t('noTopicsGenerated')}</p>
            )}
          </div>
        </div>

      </div>
    </motion.div>
  );
}
