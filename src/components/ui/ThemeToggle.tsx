"use client";

import React from 'react';
import { useTheme } from '@/hooks/useTheme';
import { Moon, Sun } from 'lucide-react';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button 
      onClick={toggleTheme}
      className="p-2 bg-white/50 dark:bg-gray-800/50 backdrop-blur-md rounded-full shadow-sm hover:bg-white/80 dark:hover:bg-gray-800/80 transition-colors border border-white/40 dark:border-gray-700/50 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-accent"
      aria-label="Toggle theme"
    >
      {theme === 'light' ? (
        <Moon size={18} className="text-indigo-600" />
      ) : (
        <Sun size={18} className="text-yellow-400" />
      )}
    </button>
  );
}
