/**
 * Dino Music App - usePlayer Hook
 * Hook for player controls
 * OPTIMIZED with selective subscriptions to prevent re-renders
 */

import { useCallback } from 'react';
import { trackPlayerService } from '../services/player/TrackPlayerService';
import { usePlayerStore } from '../stores';

export const usePlayer = () => {
  // Use selectors to only subscribe to specific fields
  // This prevents re-renders when other fields change
  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const playbackState = usePlayerStore((state) => state.playbackState);
  const progress = usePlayerStore((state) => state.progress);
  const repeatMode = usePlayerStore((state) => state.repeatMode);
  const shuffleEnabled = usePlayerStore((state) => state.shuffleEnabled);
  const volume = usePlayerStore((state) => state.volume);

  const play = useCallback(async () => {
    await trackPlayerService.play();
  }, []);

  const pause = useCallback(async () => {
    await trackPlayerService.pause();
  }, []);

  const togglePlayPause = useCallback(async () => {
    await trackPlayerService.togglePlayPause();
  }, []);

  const skipToNext = useCallback(async () => {
    await trackPlayerService.skipToNext();
  }, []);

  const skipToPrevious = useCallback(async () => {
    await trackPlayerService.skipToPrevious();
  }, []);

  const seekTo = useCallback(async (positionSeconds: number) => {
    await trackPlayerService.seekTo(positionSeconds);
  }, []);

  const setVolume = useCallback(async (vol: number) => {
    await trackPlayerService.setVolume(vol);
  }, []);

  const toggleShuffle = useCallback(() => {
    usePlayerStore.getState().toggleShuffle();
  }, []);

  const cycleRepeatMode = useCallback(() => {
    usePlayerStore.getState().cycleRepeatMode();
  }, []);

  return {
    // State
    currentTrack,
    playbackState,
    progress,
    repeatMode,
    shuffleEnabled,
    volume,
    isPlaying: playbackState === 'playing',
    
    // Actions
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
