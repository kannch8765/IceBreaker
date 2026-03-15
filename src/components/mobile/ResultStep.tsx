"use client";
import React from 'react';
import { useOnboardingStore } from '@/context/OnboardingContext';
import { motion } from 'framer-motion';
import { CheckCircle, Share2, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export function ResultStep() {
  const { formData } = useOnboardingStore();

  const MOCK_TOPICS = [
    `Ask ${formData.username || "them"} about their secret talent!`,
    `Discuss what makes them feel ${formData.mood || "chill"} today.`
  ];

  return (
    <motion.div
      initial={{ y: 100, opacity: 0, scale: 0.9 }}
      animate={{ y: 0, opacity: 1, scale: 1, transition: { type: "spring", bounce: 0.5, duration: 0.8 } }}
      className="flex flex-col items-center justify-center w-full max-w-sm m-4 relative z-10"
    >
      {/* Top Banner overlay */}
      <div className="absolute -top-10 flex flex-col items-center animate-bounce z-20">
        <div className="bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-300 px-4 py-1 rounded-full text-xs font-bold shadow-sm flex items-center gap-1 mb-2">
          <CheckCircle size={14} /> Ready to mingle
        </div>
      </div>

      <div className="w-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-2xl rounded-[2.5rem] shadow-[0_20px_50px_rgba(150,130,220,0.2)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden border border-white/40 dark:border-gray-700/50">
        
        {/* Card Header (Avatar + Name) */}
        <div className="p-8 pb-6 flex flex-col items-center bg-gradient-to-b from-purple-100/50 to-transparent dark:from-purple-900/20">
          <div className="w-32 h-32 rounded-full bg-gradient-to-tr from-purple-400 to-indigo-400 shadow-xl flex items-center justify-center mb-6 border-4 border-white dark:border-gray-800 text-6xl shadow-purple-200 dark:shadow-none">
            {/* Placeholder Animal Icon */}
            🦊
          </div>
          
          <h2 className="text-3xl font-extrabold text-gray-800 dark:text-gray-100 tracking-tight">
            {formData.username || "Anonymous"}
          </h2>
          <p className="text-sm font-medium text-purple-600 dark:text-purple-400 mt-1 uppercase tracking-widest">
            {formData.pronoun || "Any Pronouns"}
          </p>
        </div>

        {/* Info & Topics */}
        <div className="px-8 pb-8">
          <div className="flex justify-center gap-2 mb-8">
            <span className="px-3 py-1 bg-gray-100 dark:bg-gray-900 rounded-full text-xs font-semibold text-gray-600 dark:text-gray-300">
              Vibe: {formData.mood || "Mysterious"}
            </span>
          </div>

          <div className="w-full space-y-3 mb-8">
            <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
              <MessageCircle size={14} /> AI Ice Breakers
            </h3>
            {MOCK_TOPICS.map((topic, i) => (
              <div key={i} className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/30 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
                <p className="text-sm text-indigo-900 dark:text-indigo-200 font-medium leading-relaxed">
                  {topic}
                </p>
              </div>
            ))}
          </div>

          <Button className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-gray-900 to-gray-800 dark:from-white dark:to-gray-200 dark:text-gray-900 text-white shadow-xl">
            <Share2 size={18} /> Add to Wallet
          </Button>
        </div>
        
      </div>
    </motion.div>
  );
}
