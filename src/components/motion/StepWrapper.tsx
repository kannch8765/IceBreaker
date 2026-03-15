"use client";
import React from 'react';
import { motion } from 'framer-motion';

export function StepWrapper({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: 0, opacity: 1, transition: { type: "spring", bounce: 0.4 } }}
      exit={{ x: -100, opacity: 0, transition: { duration: 0.2 } }}
      className="flex flex-col items-center justify-center w-full max-w-sm p-8 bg-white/60 dark:bg-gray-800/60 backdrop-blur-2xl rounded-[2rem] shadow-[0_8px_32px_rgba(150,130,220,0.15)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)] m-4"
    >
      {children}
    </motion.div>
  );
}
