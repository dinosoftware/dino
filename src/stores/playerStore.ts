/**
 * Dino Music App - Player Store
 * Playback state and lyrics management with Zustand
 */

import { create } from 'zustand';
import { Track, LyricLine } from '../api/opensubsonic/types';

export type PlaybackState = 'playing' | 'paused' | 'stopped' | 'buffering';
export type RepeatMode = 'off' | 'track' | 'queue';

interface Progress {
  position: number; // in seconds
  duration: number; // in seconds
  buffered: number; // in seconds (for cache indicator)
}

interface LyricsState {
  type: 'synced' | 'unsynced' | 'none';
  lines: LyricLine[] | null;
  plainText: string | null;
  currentLineIndex: number;
  isScrollLocked: boolean; // Auto-scroll vs manual scroll
}

interface LyricsLoadingState {
  isLoading: boolean;
  trackId: string | null;
}

interface StreamingInfo {
  quality: string; // e.g., "320", "0" (original)
  format: string; // e.g., "mp3", "flac", "original"
  displayText: string; // e.g., "MAX" or "320 kbps MP3" (detailed)
  displayTextSimple: string; // e.g., "MAX", "HIGH", "LOW", "DOWNLOADED"
  networkType: 'wifi' | 'mobile' | 'unknown';
}

interface PlayerStore {
  // Playback State
  currentTrack: Track | null;
  playbackState: PlaybackState;
  progress: Progress;
  repeatMode: RepeatMode;
  shuffleEnabled: boolean;
  volume: number; // 0-1
  restoredPosition: number | null; // Position to restore after loading from server
  
  // Streaming Info
  streamingInfo: StreamingInfo | null;
  
  // Lyrics State
  currentLyrics: LyricsState | null;
  lyricsLoading: LyricsLoadingState;
  
  // Actions
  setCurrentTrack: (track: Track | null) => void;
  setPlaybackState: (state: PlaybackState) => void;
  setProgress: (position: number, duration: number) => void;
  setBufferedProgress: (buffered: number) => void;
  toggleShuffle: () => void;
  setRepeatMode: (mode: RepeatMode) => void;
  cycleRepeatMode: () => void;
  setVolume: (volume: number) => void;
  
  // Streaming Actions
  setStreamingInfo: (info: StreamingInfo | null) => void;
  
  // Lyrics Actions
  setCurrentLyrics: (lyrics: LyricsState | null) => void;
  setCurrentLineIndex: (index: number) => void;
  toggleLyricsScrollLock: () => void;
  setLyricsScrollLock: (locked: boolean) => void;
  setLyricsLoading: (isLoading: boolean, trackId?: string) => void;
}

export const usePlayerStore = create<PlayerStore>((set, get) => ({
  // Initial State
  currentTrack: null,
  playbackState: 'stopped',
  progress: {
    position: 0,
    duration: 0,
    buffered: 0,
  },
  repeatMode: 'off',
  shuffleEnabled: false,
  volume: 1.0,
  restoredPosition: null,
  streamingInfo: null,
  currentLyrics: null,
  lyricsLoading: {
    isLoading: false,
    trackId: null,
  },

  // Playback Actions
  setCurrentTrack: (track) => {
    set({ 
      currentTrack: track,
      currentLyrics: null, // Reset lyrics when track changes
      progress: { position: 0, duration: track?.duration || 0, buffered: 0 },
    });
  },

  setPlaybackState: (state) => {
    set({ playbackState: state });
  },

  setProgress: (position, duration) => {
    set((state) => ({
      progress: {
        ...state.progress,
        position,
        duration,
      },
    }));
  },

  setBufferedProgress: (buffered) => {
    set((state) => ({
      progress: {
        ...state.progress,
        buffered,
      },
    }));
  },

  toggleShuffle: () => {
    const wasShuffled = usePlayerStore.getState().shuffleEnabled;
    set((state) => ({ shuffleEnabled: !state.shuffleEnabled }));
    
    // Actually shuffle or unshuffle the queue
    const { shuffleQueue, unshuffleQueue } = require('./queueStore').useQueueStore.getState();
    if (!wasShuffled) {
      // Turning shuffle ON - shuffle the queue
      shuffleQueue();
    } else {
      // Turning shuffle OFF - restore original order
      unshuffleQueue();
    }
  },

  setRepeatMode: (mode) => {
    set({ repeatMode: mode });
  },

  cycleRepeatMode: () => {
    set((state) => {
      const modes: RepeatMode[] = ['off', 'queue', 'track'];
      const currentIndex = modes.indexOf(state.repeatMode);
      const nextIndex = (currentIndex + 1) % modes.length;
      return { repeatMode: modes[nextIndex] };
    });
  },

  setVolume: (volume) => {
    set({ volume: Math.max(0, Math.min(1, volume)) });
  },

  // Streaming Actions
  setStreamingInfo: (info) => {
    set({ streamingInfo: info });
  },

  // Lyrics Actions
  setCurrentLyrics: (lyrics) => {
    set({ currentLyrics: lyrics });
  },

  setCurrentLineIndex: (index) => {
    set((state) => {
      if (!state.currentLyrics) return state;
      return {
        currentLyrics: {
          ...state.currentLyrics,
          currentLineIndex: index,
        },
      };
    });
  },

  toggleLyricsScrollLock: () => {
    set((state) => {
      if (!state.currentLyrics) return state;
      return {
        currentLyrics: {
          ...state.currentLyrics,
          isScrollLocked: !state.currentLyrics.isScrollLocked,
        },
      };
    });
  },

  setLyricsScrollLock: (locked) => {
    set((state) => {
      if (!state.currentLyrics) return state;
      return {
        currentLyrics: {
          ...state.currentLyrics,
          isScrollLocked: locked,
        },
      };
    });
  },

  setLyricsLoading: (isLoading, trackId) => {
    set({
      lyricsLoading: {
        isLoading,
        trackId: trackId || null,
      },
    });
  },
}));
