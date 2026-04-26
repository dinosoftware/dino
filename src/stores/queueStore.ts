/**
 * Dino Music App - Queue Store
 * Queue management with server sync support using Zustand
 */

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import TrackPlayer from 'react-native-track-player';
import { Track } from '../api/opensubsonic/types';
import { STORAGE_KEYS } from '../config/constants';
import { usePlayerStore } from './playerStore';
import { useNavigationStore } from './navigationStore';
import { savePlayQueue } from '../api/opensubsonic/playqueue';

export type ServerSyncStatus = 'synced' | 'syncing' | 'error' | 'offline';

// Callback for queue sync (set by QueueSyncManager to avoid circular imports)
let queueSyncCallback: ((debounced?: boolean) => void) | null = null;

export const setQueueSyncCallback = (callback: (debounced?: boolean) => void) => {
  queueSyncCallback = callback;
};

const triggerSync = (debounced: boolean = true) => {
  if (queueSyncCallback) {
    queueSyncCallback(debounced);
  }
};

// Callback to clear restored position (set by TrackPlayerService to avoid circular imports)
let clearRestoredPositionCallback: (() => void) | null = null;

export const setClearRestoredPositionCallback = (callback: () => void) => {
  clearRestoredPositionCallback = callback;
};

const clearRestoredPosition = () => {
  if (clearRestoredPositionCallback) {
    clearRestoredPositionCallback();
  }
};

// Callback to sync queue with TrackPlayer (set by TrackPlayerService)
let syncQueueCallback: (() => Promise<void>) | null = null;
let clearPreloadedTracksCallback: (() => void) | null = null;

export const setSyncQueueCallback = (callback: () => Promise<void>) => {
  syncQueueCallback = callback;
};

export const setClearPreloadedTracksCallback = (callback: () => void) => {
  clearPreloadedTracksCallback = callback;
};

const clearPreloadedTracks = () => {
  if (clearPreloadedTracksCallback) {
    clearPreloadedTracksCallback();
  }
};

const syncQueue = () => {
  if (syncQueueCallback) {
    syncQueueCallback().catch((error) => {
      console.error('[QueueStore] Failed to sync queue with TrackPlayer:', error);
    });
  }
};

interface QueueStore {
  // Queue State
  queue: Track[];
  currentIndex: number;
  originalQueue: Track[]; // For shuffle
  history: Track[];
  
  // Server Sync
  serverSyncStatus: ServerSyncStatus;
  lastServerSync: number;
  
  // Actions
  setQueue: (queue: Track[], currentIndex?: number) => void;
  setQueueFromServer: (queue: Track[], currentIndex?: number) => void; // Internal use only - doesn't clear restoredPosition
  addToQueue: (tracks: Track | Track[], position?: 'next' | 'end') => void;
  removeFromQueue: (index: number) => void;
  reorderQueue: (fromIndex: number, toIndex: number) => void;
  clearQueue: (clearServerQueue?: boolean) => Promise<void>;
  shuffleQueue: () => void;
  unshuffleQueue: () => void;
  skipToTrack: (index: number) => void;
  skipToNext: () => boolean;
  skipToPrevious: () => boolean;
  
  // Server Sync Actions
  setServerSyncStatus: (status: ServerSyncStatus) => void;
  markServerSynced: () => void;
  
  // Persistence
  saveToStorage: () => void;
  loadFromStorage: () => Promise<void>;
}

export const useQueueStore = create<QueueStore>((set, get) => ({
  // Initial State
  queue: [],
  currentIndex: -1,
  originalQueue: [],
  history: [],
  serverSyncStatus: 'synced',
  lastServerSync: 0,

  // Queue Actions
  setQueue: (queue, currentIndex = 0) => {
    const { shuffleEnabled } = usePlayerStore.getState();
    
    if (shuffleEnabled) {
      // Shuffle is enabled - shuffle the new queue
      const currentTrack = queue[currentIndex];
      const before = queue.slice(0, currentIndex);
      const after = queue.slice(currentIndex + 1);
      const toShuffle = [...before, ...after];
      
      // Fisher-Yates shuffle
      for (let i = toShuffle.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [toShuffle[i], toShuffle[j]] = [toShuffle[j], toShuffle[i]];
      }
      
      const shuffledQueue = currentTrack ? [currentTrack, ...toShuffle] : toShuffle;
      
      set({
        queue: shuffledQueue,
        currentIndex: currentTrack ? 0 : -1,
        originalQueue: queue,
      });
    } else {
      set({
        queue,
        currentIndex,
        originalQueue: queue,
      });
    }
    
    // CRITICAL: Clear restored position when user starts a new queue
    // This prevents server position from being applied to new queues
    clearRestoredPosition();
    
    get().saveToStorage();
    triggerSync(true);
  },

  // Internal method for loading from server - doesn't clear restoredPosition
  setQueueFromServer: (queue, currentIndex = 0) => {
    const { shuffleEnabled } = usePlayerStore.getState();
    
    if (shuffleEnabled) {
      // Shuffle is enabled - shuffle the queue from server too
      const currentTrack = queue[currentIndex];
      const before = queue.slice(0, currentIndex);
      const after = queue.slice(currentIndex + 1);
      const toShuffle = [...before, ...after];
      
      for (let i = toShuffle.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [toShuffle[i], toShuffle[j]] = [toShuffle[j], toShuffle[i]];
      }
      
      const shuffledQueue = currentTrack ? [currentTrack, ...toShuffle] : toShuffle;
      
      set({
        queue: shuffledQueue,
        currentIndex: currentTrack ? 0 : -1,
        originalQueue: queue,
      });
    } else {
      set({
        queue,
        currentIndex,
        originalQueue: queue,
      });
    }
    
    // DON'T clear restoredPosition - server is restoring playback state
    
    get().saveToStorage();
    // Don't trigger sync when loading FROM server
  },

  addToQueue: (tracks, position = 'end') => {
    const tracksArray = Array.isArray(tracks) ? tracks : [tracks];
    const state = get();
    
    // If queue is empty, create new queue and start playing
    if (state.queue.length === 0) {
      const { usePlayerStore } = require('./playerStore');
      const { trackPlayerService } = require('../services/player/TrackPlayerService');
      
      set({
        queue: tracksArray,
        currentIndex: 0,
        originalQueue: tracksArray,
      });
      
      usePlayerStore.getState().setCurrentTrack(tracksArray[0]);
      trackPlayerService.playTrack(0).catch((err: Error) => {
        console.error('[QueueStore] Failed to play track:', err);
      });
      
      get().saveToStorage();
      triggerSync(true);
      return;
    }
    
    set((state) => {
      let newQueue: Track[];
      
      if (position === 'next') {
        // Add after current track
        const before = state.queue.slice(0, state.currentIndex + 1);
        const after = state.queue.slice(state.currentIndex + 1);
        newQueue = [...before, ...tracksArray, ...after];
      } else {
        // Add to end
        newQueue = [...state.queue, ...tracksArray];
      }
      
      return { queue: newQueue };
    });
    
    get().saveToStorage();
    
    // If adding to 'next', the immediate next track changed - update preloaded track
    if (position === 'next') {
      clearPreloadedTracks();
    }
    
    triggerSync(true);
  },

  removeFromQueue: (index) => {
    const oldCurrentIndex = get().currentIndex;
    const removingCurrentTrack = index === oldCurrentIndex;
    
    set((state) => {
      const newQueue = state.queue.filter((_, i) => i !== index);
      let newIndex = state.currentIndex;
      
      // Adjust current index if needed
      if (index < state.currentIndex) {
        // Removed track was before current, shift index down
        newIndex = state.currentIndex - 1;
      } else if (index === state.currentIndex) {
        // Removing current track
        // Keep same index - this will point to the track that was "next"
        // But clamp to valid range
        newIndex = Math.min(state.currentIndex, newQueue.length - 1);
      }
      // If index > currentIndex, no change needed
      
      return {
        queue: newQueue,
        currentIndex: newIndex,
      };
    });
    
    get().saveToStorage();
    
    if (removingCurrentTrack && get().queue.length > 0) {
      // Removing current track - skip to next
      console.log('[QueueStore] Removed current track, skipping to next');
      TrackPlayer.skipToNext().catch(err => {
        console.error('[QueueStore] Failed to skip to next after removing current:', err);
      });
    } else if (index === oldCurrentIndex + 1) {
      // Removed the immediate next track - preloaded track is now stale
      clearPreloadedTracks();
    }
    
    triggerSync(true);
  },

  reorderQueue: (fromIndex, toIndex) => {
    const oldCurrentIndex = get().currentIndex;
    
    set((state) => {
      const newQueue = [...state.queue];
      const [movedTrack] = newQueue.splice(fromIndex, 1);
      newQueue.splice(toIndex, 0, movedTrack);
      
      // Adjust current index
      let newIndex = state.currentIndex;
      if (fromIndex === state.currentIndex) {
        newIndex = toIndex;
      } else if (fromIndex < state.currentIndex && toIndex >= state.currentIndex) {
        newIndex = state.currentIndex - 1;
      } else if (fromIndex > state.currentIndex && toIndex <= state.currentIndex) {
        newIndex = state.currentIndex + 1;
      }
      
      return {
        queue: newQueue,
        currentIndex: newIndex,
      };
    });
    
    get().saveToStorage();
    
    // Clear preloaded tracks if the move could change what plays next.
    // Use oldCurrentIndex because preloaded track was based on that position.
    const oldNextPosition = oldCurrentIndex + 1;
    const moveTouchedNextSlot =
      fromIndex === oldCurrentIndex ||   // current track itself was moved
      fromIndex === oldNextPosition ||   // the preloaded next track was moved away
      toIndex === oldNextPosition;       // something new was moved into next position
    
    if (moveTouchedNextSlot) {
      console.log('[QueueStore] Reorder changed next track, clearing preloaded tracks');
      clearPreloadedTracks();
    }
    
    triggerSync(true);
  },

  clearQueue: async (clearServerQueue = true) => {
    // Stop playback and reset TrackPlayer
    await TrackPlayer.reset();
    
    // Clear queue state
    set({
      queue: [],
      currentIndex: -1,
      originalQueue: [],
      history: [],
    });
    get().saveToStorage();
    
    // Clear player state
    usePlayerStore.getState().setCurrentTrack(null);
    usePlayerStore.getState().setPlaybackState('stopped');
    
    // Close full player if open
    useNavigationStore.getState().closeFullPlayer();
    
    // Clear server queue only if requested (e.g., from Clear Queue button)
    if (clearServerQueue) {
      try {
        await savePlayQueue([], undefined, undefined);
        console.log('[QueueStore] Server queue cleared');
      } catch (error) {
        console.error('[QueueStore] Failed to clear server queue:', error);
      }
      triggerSync(true);
    }
  },

  shuffleQueue: () => {
    set((state) => {
      // Save original order
      const originalQueue = [...state.queue];
      const currentTrack = state.queue[state.currentIndex];
      
      // Shuffle remaining tracks (excluding current)
      const before = state.queue.slice(0, state.currentIndex);
      const after = state.queue.slice(state.currentIndex + 1);
      const toShuffle = [...before, ...after];
      
      // Fisher-Yates shuffle
      for (let i = toShuffle.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [toShuffle[i], toShuffle[j]] = [toShuffle[j], toShuffle[i]];
      }
      
      // Rebuild queue with current track first
      const shuffledQueue = currentTrack
        ? [currentTrack, ...toShuffle]
        : toShuffle;
      
      return {
        queue: shuffledQueue,
        currentIndex: currentTrack ? 0 : -1,
        originalQueue,
      };
    });
    
    get().saveToStorage();
  },

  unshuffleQueue: () => {
    set((state) => {
      if (state.originalQueue.length === 0) return state;
      
      const currentTrack = state.queue[state.currentIndex];
      const originalIndex = currentTrack
        ? state.originalQueue.findIndex((t) => t.id === currentTrack.id)
        : -1;
      
      return {
        queue: state.originalQueue,
        currentIndex: originalIndex,
        originalQueue: [],
      };
    });
    
    get().saveToStorage();
  },

  skipToTrack: (index) => {
    // Clear restored position - any track change invalidates server seek position
    clearRestoredPosition();
    
    set((state) => {
      // Add current track to history
      if (state.currentIndex >= 0 && state.currentIndex < state.queue.length) {
        const currentTrack = state.queue[state.currentIndex];
        return {
          currentIndex: index,
          history: [...state.history, currentTrack],
        };
      }
      return { currentIndex: index };
    });
    
    get().saveToStorage();
    triggerSync(true);
  },

  skipToNext: () => {
    const state = get();
    if (state.currentIndex < state.queue.length - 1) {
      get().skipToTrack(state.currentIndex + 1);
      return true;
    }
    return false;
  },

  skipToPrevious: () => {
    const state = get();
    if (state.currentIndex > 0) {
      get().skipToTrack(state.currentIndex - 1);
      return true;
    }
    return false;
  },

  // Server Sync Actions
  setServerSyncStatus: (status) => {
    set({ serverSyncStatus: status });
  },

  markServerSynced: () => {
    set({
      serverSyncStatus: 'synced',
      lastServerSync: Date.now(),
    });
  },

  // Persistence
  saveToStorage: () => {
    const state = get();
    AsyncStorage.setItem(STORAGE_KEYS.QUEUE, JSON.stringify(state.queue));
    AsyncStorage.setItem(STORAGE_KEYS.CURRENT_TRACK_INDEX, state.currentIndex.toString());
  },

  loadFromStorage: async () => {
    try {
      const queueJson = await AsyncStorage.getItem(STORAGE_KEYS.QUEUE);
      const queue = queueJson ? JSON.parse(queueJson) : [];
      
      const currentIndexStr = await AsyncStorage.getItem(STORAGE_KEYS.CURRENT_TRACK_INDEX);
      const currentIndex = currentIndexStr ? parseInt(currentIndexStr, 10) : -1;

      set({ queue, currentIndex, originalQueue: queue });
    } catch (error) {
      console.error('Failed to load queue from storage:', error);
    }
  },
}));
