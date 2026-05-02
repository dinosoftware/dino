/**
 * Dino Music App - useProgress Hook
 * Separate hook for progress to prevent unnecessary re-renders
 * Uses primitive selectors to minimize re-render frequency
 */

import { usePlayerStore } from '../stores';

export const useProgress = () => {
  const position = usePlayerStore((state) => state.progress.position);
  const duration = usePlayerStore((state) => state.progress.duration);
  const buffered = usePlayerStore((state) => state.progress.buffered);
  return { position, duration, buffered };
};
