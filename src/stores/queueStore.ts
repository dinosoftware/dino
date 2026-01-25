/**
 * Dino Music App - Queue Store
 * Queue management with server sync support using Zustand
 */

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Track } from '../api/opensubsonic/types';
import { STORAGE_KEYS } from '../config/constants';

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
  addToQueue: (tracks: Track | Track[], position?: 'next' | 'end') => void;
  removeFromQueue: (index: number) => void;
  reorderQueue: (fromIndex: number, toIndex: number) => void;
  clearQueue: () => void;
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
    set({
      queue,
      currentIndex,
      originalQueue: queue,
    });
    get().saveToStorage();
    triggerSync(true);
  },

  addToQueue: (tracks, position = 'end') => {
    const tracksArray = Array.isArray(tracks) ? tracks : [tracks];
    
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
    triggerSync(true);
  },

  removeFromQueue: (index) => {
    set((state) => {
      const newQueue = state.queue.filter((_, i) => i !== index);
      let newIndex = state.currentIndex;
      
      // Adjust current index if needed
      if (index < state.currentIndex) {
        newIndex = state.currentIndex - 1;
      } else if (index === state.currentIndex) {
        // If removing current track, don't change index (will play next track)
        newIndex = Math.min(state.currentIndex, newQueue.length - 1);
      }
      
      return {
        queue: newQueue,
        currentIndex: newIndex,
      };
    });
    
    get().saveToStorage();
    triggerSync(true);
  },

  reorderQueue: (fromIndex, toIndex) => {
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
    triggerSync(true);
  },

  clearQueue: () => {
    set({
      queue: [],
      currentIndex: -1,
      originalQueue: [],
      history: [],
    });
    get().saveToStorage();
    triggerSync(true);
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
