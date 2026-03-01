/**
 * Dino Music App - usePlayer Hook
 * Hook for player controls
 * OPTIMIZED with selective subscriptions to prevent re-renders
 */

import { useCallback } from 'react';
import { playerRouter } from '../services/player/PlayerRouter';
import { usePlayerStore } from '../stores';

export const usePlayer = () => {
  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const playbackState = usePlayerStore((state) => state.playbackState);
  const progress = usePlayerStore((state) => state.progress);
  const repeatMode = usePlayerStore((state) => state.repeatMode);
  const shuffleEnabled = usePlayerStore((state) => state.shuffleEnabled);
  const volume = usePlayerStore((state) => state.volume);

  const play = useCallback(async () => {
    await playerRouter.play();
  }, []);

  const pause = useCallback(async () => {
    await playerRouter.pause();
  }, []);

  const togglePlayPause = useCallback(async () => {
    await playerRouter.togglePlayPause();
  }, []);

  const skipToNext = useCallback(async () => {
    await playerRouter.skipToNext();
  }, []);

  const skipToPrevious = useCallback(async () => {
    await playerRouter.skipToPrevious();
  }, []);

  const seekTo = useCallback(async (positionSeconds: number) => {
    await playerRouter.seekTo(positionSeconds);
  }, []);

  const setVolume = useCallback(async (vol: number) => {
    await playerRouter.setVolume(vol);
  }, []);

  const toggleShuffle = useCallback(() => {
    usePlayerStore.getState().toggleShuffle();
  }, []);

  const cycleRepeatMode = useCallback(() => {
    usePlayerStore.getState().cycleRepeatMode();
  }, []);

  return {
    currentTrack,
    playbackState,
    progress,
    repeatMode,
    shuffleEnabled,
    volume,
    isPlaying: playbackState === 'playing',
    
    play,
    pause,
    togglePlayPause,
    skipToNext,
    skipToPrevious,
    seekTo,
    setVolume,
    toggleShuffle,
    cycleRepeatMode,
  };
};
