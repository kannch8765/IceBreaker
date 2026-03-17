"use client";
import React from 'react';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';

export function NavBar() {
  return (
    <div className="absolute top-4 right-4 flex items-center gap-2 z-50">
      <LanguageSwitcher />
      {/* Theme Toggle */}
      <ThemeToggle />
    </div>
  );
}
