"use client";
import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ButtonProps extends HTMLMotionProps<"button"> {}

export function Button({ className, children, ...props }: ButtonProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={cn(
        "w-full py-4 rounded-2xl font-semibold text-lg text-white bg-gradient-to-r from-accent to-accent-secondary dark:text-black shadow-md hover:shadow-lg transition-shadow",
        className
      )}
      {...props}
    >
      {children}
    </motion.button>
  );
}
