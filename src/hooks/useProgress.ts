/**
 * Dino Music App - useProgress Hook
 * Separate hook for progress to prevent unnecessary re-renders
 * Components that DON'T need progress updates won't re-render
 */

import { usePlayerStore } from '../stores';

export const useProgress = () => {
  const progress = usePlayerStore((state) => state.progress);
  return progress;
};
