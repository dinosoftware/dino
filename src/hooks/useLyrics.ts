/**
 * Dino Music App - useLyrics Hook
 * Hook for lyrics functionality
 */

import { useCallback, useEffect } from 'react';
import { lyricsManager } from '../services/player/LyricsManager';
import { usePlayerStore } from '../stores';
import { LyricLine } from '../api/opensubsonic/types';

export const useLyrics = () => {
  const { currentTrack, currentLyrics, playbackState } = usePlayerStore();

  // Fetch lyrics when track changes
  useEffect(() => {
    if (currentTrack) {
      lyricsManager.fetchLyrics(currentTrack.id);
    }
  }, [currentTrack?.id]);

  // Start/stop sync based on playback state
  useEffect(() => {
    if (playbackState === 'playing' && currentLyrics?.type === 'synced') {
      lyricsManager.startSync();
    } else {
      lyricsManager.stopSync();
    }

    return () => {
      lyricsManager.stopSync();
    };
  }, [playbackState, currentLyrics?.type]);

  const seekToLine = useCallback((line: LyricLine) => {
    lyricsManager.seekToLine(line);
  }, []);

  const toggleScrollLock = useCallback(() => {
    usePlayerStore.getState().toggleLyricsScrollLock();
  }, []);

  return {
    lyrics: currentLyrics,
    hasLyrics: currentLyrics !== null,
    isSynced: currentLyrics?.type === 'synced',
    seekToLine,
    toggleScrollLock,
  };
};
