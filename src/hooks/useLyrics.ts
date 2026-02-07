/**
 * Dino Music App - useLyrics Hook
 * Hook for lyrics functionality
 */

import { useCallback, useEffect } from 'react';
import { lyricsManager } from '../services/player/LyricsManager';
import { usePlayerStore, useQueueStore } from '../stores';
import { LyricLine } from '../api/opensubsonic/types';

export const useLyrics = () => {
  const { currentTrack, currentLyrics, playbackState } = usePlayerStore();
  const { queue, currentIndex } = useQueueStore();

  // Fetch lyrics when track changes
  useEffect(() => {
    if (currentTrack) {
      lyricsManager.fetchLyrics(currentTrack.id, false, true); // Set in store

      // Pre-cache lyrics for next 2 tracks (don't set in store)
      const nextTracks = queue.slice(currentIndex + 1, currentIndex + 3);
      nextTracks.forEach((track, index) => {
        // Delay slightly to avoid overwhelming the server
        setTimeout(() => {
          lyricsManager.fetchLyrics(track.id, false, false); // Cache only, don't set in store
          // console.log('[Lyrics] Pre-cached lyrics for next track:', track.title);
        }, (index + 1) * 500); // 500ms delay between each request
      });
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
