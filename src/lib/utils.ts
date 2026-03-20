import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ── Soul vector ───────────────────────────────────────────────────────────────
// Weight matrix: 10 questions × 5 dimensions (V0…V4)
// Each column sums to 2.0, so dividing by 2.0 normalises to [0, 1].
const SOUL_MATRIX: number[][] = [
  [0.8, 0.2, 0.0, 0.0, 0.0], // Q1
  [0.8, 0.0, 0.0, 0.0, 0.2], // Q2
  [0.0, 0.8, 0.0, 0.0, 0.2], // Q3
  [0.0, 0.8, 0.0, 0.2, 0.0], // Q4
  [0.0, 0.0, 0.8, 0.2, 0.0], // Q5
  [0.2, 0.0, 0.8, 0.0, 0.0], // Q6
  [0.0, 0.2, 0.0, 0.8, 0.0], // Q7
  [0.0, 0.0, 0.2, 0.8, 0.0], // Q8
  [0.2, 0.0, 0.0, 0.0, 0.8], // Q9
  [0.0, 0.0, 0.2, 0.0, 0.8], // Q10
];

/**
 * Converts 10 swipe choices (0 = left, 1 = right) into a 5-dim trait vector.
 * Returns [temporal, order, energy, ethos, density], each in [0, 1].
 */
export function calculateSoulVector(choices: number[]): number[] {
  return Array.from({ length: 5 }, (_, dim) => {
    let sum = 0;
    for (let q = 0; q < 10; q++) sum += (choices[q] ?? 0) * SOUL_MATRIX[q][dim];
    return parseFloat((sum / 2.0).toFixed(2));
  });
}
